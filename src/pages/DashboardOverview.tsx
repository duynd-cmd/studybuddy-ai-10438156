import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { Clock, Target, Brain, HelpCircle, TrendingUp, Sparkles, Flame, BookOpen, ArrowRight } from "lucide-react";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { LiquidProgress } from "@/components/motion/LiquidProgress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function DashboardOverview() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: pomodoroStats } = useQuery({
    queryKey: ["pomodoro-stats", user?.id],
    queryFn: async () => {
      if (!user) return { totalMinutes: 0, totalSessions: 0 };
      const { data } = await supabase
        .from("pomodoro_sessions")
        .select("duration_minutes, session_type")
        .eq("user_id", user.id)
        .not("completed_at", "is", null);
      const focus = (data || []).filter((s: any) => s.session_type === "focus");
      return {
        totalMinutes: focus.reduce((sum: number, s: any) => sum + s.duration_minutes, 0),
        totalSessions: focus.length,
      };
    },
    enabled: !!user,
  });

  const { data: taskStats } = useQuery({
    queryKey: ["task-stats", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, completed: 0 };
      const { data } = await supabase
        .from("study_tasks")
        .select("completed")
        .eq("user_id", user.id);
      const all = data || [];
      return { total: all.length, completed: all.filter((t: any) => t.completed).length };
    },
    enabled: !!user,
  });

  const { data: messageCount } = useQuery({
    queryKey: ["message-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("scriba_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user");
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: activePlan } = useQuery({
    queryKey: ["active-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("study_plans")
        .select("*, study_tasks(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: recentNotes } = useQuery({
    queryKey: ["recent-notes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notes")
        .select("id, title, subject, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user,
  });

  const accuracy = taskStats?.total
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  const focusMinutes = pomodoroStats?.totalMinutes || 0;
  const focusSessions = pomodoroStats?.totalSessions || 0;
  const streakProgress = Math.min(100, (focusSessions % 10) * 10);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground tracking-tight">
            Xin chào! <span className="inline-block animate-pulse">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {profile?.grade && `${profile.grade} · `}
            {profile?.goal || "Hãy bắt đầu hành trình học tập thông minh!"}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground glass px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>AI-Mentor 2026</span>
        </div>
      </motion.div>

      {/* BENTO GRID — strict 20px gap rhythm */}
      <StaggerReveal className="grid grid-cols-1 md:grid-cols-6 gap-5 auto-rows-[minmax(140px,auto)]">
        {/* Hero stat — Liquid progress */}
        <TiltCard className="md:col-span-3 md:row-span-2" maxTilt={5}>
          <GlassCard variant="elevated" className="h-full p-6 flex flex-col md:flex-row items-center gap-6 border-glow">
            <LiquidProgress value={accuracy} size={160} label="Tiến độ" />
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Độ chính xác tổng</p>
                <p className="text-4xl font-heading font-bold text-foreground mt-1">{accuracy}%</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {taskStats?.completed || 0} / {taskStats?.total || 0} nhiệm vụ đã hoàn thành
              </p>
              <MagneticButton
                size="sm"
                onClick={() => navigate("/dashboard/ke-hoach")}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
              >
                Xem lộ trình <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </MagneticButton>
            </div>
          </GlassCard>
        </TiltCard>

        {/* Streak */}
        <TiltCard className="md:col-span-3" maxTilt={6}>
          <GlassCard variant="interactive" className="h-full p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0 border border-accent/30">
                <Flame className="w-7 h-7 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Chuỗi tập trung</p>
                <p className="text-2xl font-heading font-bold text-foreground">{focusSessions} phiên</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${streakProgress}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-accent to-accent/60 rounded-full"
                  />
                </div>
              </div>
            </div>
          </GlassCard>
        </TiltCard>

        {/* Mini stats — focus minutes */}
        <TiltCard className="md:col-span-2" maxTilt={6}>
          <GlassCard variant="interactive" className="h-full p-5">
            <Clock className="w-5 h-5 text-accent mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{focusMinutes}</p>
            <p className="text-xs text-muted-foreground">Phút tập trung</p>
          </GlassCard>
        </TiltCard>

        {/* Mini stats — questions */}
        <TiltCard className="md:col-span-1 hidden md:block" maxTilt={6}>
          <GlassCard variant="interactive" className="h-full p-5">
            <HelpCircle className="w-5 h-5 text-accent mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{messageCount || 0}</p>
            <p className="text-xs text-muted-foreground">Câu hỏi đã hỏi</p>
          </GlassCard>
        </TiltCard>

        {/* Plan card */}
        <TiltCard className="md:col-span-3" maxTilt={5}>
          <GlassCard variant="interactive" className="h-full p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-heading flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                <BookOpen className="w-4 h-4" /> Lộ trình hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activePlan ? (
                <div className="space-y-3">
                  <p className="text-lg font-heading font-bold text-foreground">{activePlan.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {(activePlan as any).study_tasks?.filter((t: any) => t.completed).length || 0}/
                    {(activePlan as any).study_tasks?.length || 0} nhiệm vụ
                  </p>
                  <MagneticButton
                    size="sm"
                    onClick={() => navigate("/dashboard/ke-hoach")}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
                  >
                    Tiếp tục học <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </MagneticButton>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Brain className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Chưa có lộ trình nào</p>
                  <MagneticButton
                    size="sm"
                    onClick={() => navigate("/dashboard/ke-hoach")}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
                  >
                    Tạo lộ trình AI
                  </MagneticButton>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </TiltCard>

        {/* Recent notes */}
        <TiltCard className="md:col-span-3" maxTilt={5}>
          <GlassCard variant="interactive" className="h-full p-5">
            <CardHeader className="p-0 pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm font-heading flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                <Target className="w-4 h-4" /> Ghi chú gần đây
              </CardTitle>
              <button
                onClick={() => navigate("/dashboard/ghi-chu")}
                className="text-xs text-accent-foreground/70 hover:text-foreground transition-colors"
              >
                Tất cả →
              </button>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              {recentNotes && recentNotes.length > 0 ? (
                recentNotes.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => navigate("/dashboard/ghi-chu")}
                    className="w-full text-left p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors group"
                  >
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-foreground">
                      {n.title}
                    </p>
                    {n.subject && (
                      <p className="text-xs text-muted-foreground mt-0.5">{n.subject}</p>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có ghi chú nào</p>
              )}
            </CardContent>
          </GlassCard>
        </TiltCard>

        {/* Quick action — Pomodoro */}
        <TiltCard className="md:col-span-2" maxTilt={6}>
          <GlassCard variant="interactive" className="h-full p-5 flex flex-col justify-between">
            <div>
              <Clock className="w-5 h-5 text-accent mb-2" />
              <p className="text-sm font-heading font-bold text-foreground">Bắt đầu Pomodoro</p>
              <p className="text-xs text-muted-foreground mt-1">25 phút tập trung</p>
            </div>
            <MagneticButton
              size="sm"
              onClick={() => navigate("/dashboard/pomodoro")}
              className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-full"
            >
              Bắt đầu
            </MagneticButton>
          </GlassCard>
        </TiltCard>

        {/* Quick action — Scriba */}
        <TiltCard className="md:col-span-2" maxTilt={6}>
          <GlassCard variant="interactive" className="h-full p-5 flex flex-col justify-between">
            <div>
              <Brain className="w-5 h-5 text-accent mb-2" />
              <p className="text-sm font-heading font-bold text-foreground">Hỏi Scriba AI</p>
              <p className="text-xs text-muted-foreground mt-1">Trợ lý học tập</p>
            </div>
            <MagneticButton
              size="sm"
              onClick={() => navigate("/dashboard/scriba")}
              className="mt-3 bg-foreground text-primary-foreground hover:bg-foreground/90 rounded-full w-full"
            >
              Mở chat
            </MagneticButton>
          </GlassCard>
        </TiltCard>

        {/* Quick action — Plan */}
        <TiltCard className="md:col-span-2" maxTilt={6}>
          <GlassCard variant="interactive" className="h-full p-5 flex flex-col justify-between">
            <div>
              <TrendingUp className="w-5 h-5 text-accent mb-2" />
              <p className="text-sm font-heading font-bold text-foreground">Tạo kế hoạch</p>
              <p className="text-xs text-muted-foreground mt-1">AI lập lộ trình mới</p>
            </div>
            <MagneticButton
              size="sm"
              onClick={() => navigate("/dashboard/ke-hoach")}
              className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-full"
            >
              Tạo ngay
            </MagneticButton>
          </GlassCard>
        </TiltCard>
      </StaggerReveal>
    </div>
  );
}
