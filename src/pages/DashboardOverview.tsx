import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
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

/**
 * Bento rules:
 * - Mobile: 1 column stack
 * - Tablet (md): 2-column simple grid
 * - Desktop (lg+): 12-column strict Bento
 * - 24px gap, p-6 padding, h-full + flex-col, action pinned via mt-auto
 */
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

  const accuracy = taskStats?.total ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
  const focusMinutes = pomodoroStats?.totalMinutes || 0;
  const focusSessions = pomodoroStats?.totalSessions || 0;
  const streakProgress = Math.min(100, (focusSessions % 10) * 10);

  const CardTitleRow = ({ icon: Icon, label }: { icon: any; label: string }) => (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold h-6 whitespace-nowrap">
      <Icon className="w-4 h-4 text-accent shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground tracking-tight">
            Xin chào! <span className="inline-block animate-pulse">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm truncate">
            {profile?.grade && `${profile.grade} · `}
            {profile?.goal || "Hãy bắt đầu hành trình học tập thông minh!"}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground glass px-3 py-1.5 rounded-full shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>AI-Mentor 2026</span>
        </div>
      </motion.div>

      {/* BENTO GRID */}
      <StaggerReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* HERO progress — wide card, 2 rows on desktop */}
        <TiltCard className="md:col-span-2 lg:col-span-8 lg:row-span-2" maxTilt={3}>
          <GlassCard variant="elevated" className="h-full p-6 flex flex-col border-glow overflow-hidden">
            <CardTitleRow icon={TrendingUp} label="Tiến độ tổng quan" />
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-6 mt-4 min-h-0">
              <div className="shrink-0">
                <LiquidProgress value={accuracy} size={160} label="Tiến độ" />
              </div>
              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                <p className="text-5xl font-heading font-bold text-foreground leading-none">{accuracy}%</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {taskStats?.completed || 0} / {taskStats?.total || 0} nhiệm vụ đã hoàn thành
                </p>
              </div>
            </div>
            <div className="pt-4 mt-auto">
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
        <TiltCard className="lg:col-span-4" maxTilt={4}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/20 blur-2xl pointer-events-none" />
            <CardTitleRow icon={Flame} label="Chuỗi tập trung" />
            <div className="flex-1 flex flex-col justify-center mt-3 relative">
              <p className="text-4xl font-heading font-bold text-foreground leading-none">{focusSessions}</p>
              <p className="text-xs text-muted-foreground mt-1">phiên hoàn thành</p>
              <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${streakProgress}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-accent to-accent/60 rounded-full"
                />
              </div>
            </div>
          </GlassCard>
        </TiltCard>

        {/* Focus minutes */}
        <TiltCard className="lg:col-span-2" maxTilt={4}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <CardTitleRow icon={Clock} label="Phút" />
            <div className="flex-1 flex flex-col justify-center mt-3">
              <p className="text-3xl font-heading font-bold text-foreground leading-none">{focusMinutes}</p>
              <p className="text-xs text-muted-foreground mt-1">tập trung</p>
            </div>
          </GlassCard>
        </TiltCard>

        {/* Questions */}
        <TiltCard className="lg:col-span-2" maxTilt={4}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <CardTitleRow icon={HelpCircle} label="Câu hỏi" />
            <div className="flex-1 flex flex-col justify-center mt-3">
              <p className="text-3xl font-heading font-bold text-foreground leading-none">{messageCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">đã hỏi</p>
            </div>
          </GlassCard>
        </TiltCard>

        {/* Plan */}
        <TiltCard className="md:col-span-2 lg:col-span-6 lg:row-span-2" maxTilt={3}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <CardTitleRow icon={BookOpen} label="Lộ trình hiện tại" />
            <div className="flex-1 flex flex-col mt-4 min-h-0">
              {activePlan ? (
                <>
                  <p className="text-xl font-heading font-bold text-foreground truncate">{activePlan.subject}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(activePlan as any).study_tasks?.filter((t: any) => t.completed).length || 0}/
                    {(activePlan as any).study_tasks?.length || 0} nhiệm vụ
                  </p>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Brain className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Chưa có lộ trình nào</p>
                </div>
              )}
            </div>
            <div className="pt-4 mt-auto">
              <MagneticButton
                size="sm"
                onClick={() => navigate("/dashboard/ke-hoach")}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
              >
                {activePlan ? "Tiếp tục học" : "Tạo lộ trình AI"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </MagneticButton>
            </div>
          </GlassCard>
        </TiltCard>

        {/* Recent notes */}
        <TiltCard className="md:col-span-2 lg:col-span-6 lg:row-span-2" maxTilt={3}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <div className="flex items-center justify-between h-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold whitespace-nowrap">
                <Target className="w-4 h-4 text-accent" />
                <span>Ghi chú gần đây</span>
              </div>
              <button
                onClick={() => navigate("/dashboard/ghi-chu")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Tất cả →
              </button>
            </div>
            <div className="flex-1 flex flex-col mt-4 space-y-2 min-h-0 overflow-y-auto">
              {recentNotes && recentNotes.length > 0 ? (
                recentNotes.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => navigate("/dashboard/ghi-chu")}
                    className="w-full text-left p-3 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors group"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    {n.subject && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.subject}</p>}
                  </button>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Chưa có ghi chú nào</p>
                </div>
              )}
            </div>
          </GlassCard>
        </TiltCard>

        {/* Quick actions row */}
        <TiltCard className="lg:col-span-4" maxTilt={4}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <CardTitleRow icon={Clock} label="Pomodoro" />
            <div className="flex-1 flex flex-col mt-3">
              <p className="text-base font-heading font-bold text-foreground">Phiên 25 phút</p>
              <p className="text-xs text-muted-foreground mt-1">Tập trung sâu</p>
            </div>
            <div className="pt-4 mt-auto">
              <MagneticButton
                size="sm"
                onClick={() => navigate("/dashboard/pomodoro")}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-full"
              >
                Bắt đầu
              </MagneticButton>
            </div>
          </GlassCard>
        </TiltCard>

        <TiltCard className="lg:col-span-4" maxTilt={4}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <CardTitleRow icon={Brain} label="Scriba AI" />
            <div className="flex-1 flex flex-col mt-3">
              <p className="text-base font-heading font-bold text-foreground">Hỏi trợ lý AI</p>
              <p className="text-xs text-muted-foreground mt-1">Giải đáp tức thì</p>
            </div>
            <div className="pt-4 mt-auto">
              <MagneticButton
                size="sm"
                onClick={() => navigate("/dashboard/scriba")}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-full"
              >
                Mở chat
              </MagneticButton>
            </div>
          </GlassCard>
        </TiltCard>

        <TiltCard className="md:col-span-2 lg:col-span-4" maxTilt={4}>
          <GlassCard variant="interactive" className="h-full p-6 flex flex-col">
            <CardTitleRow icon={TrendingUp} label="Kế hoạch mới" />
            <div className="flex-1 flex flex-col mt-3">
              <p className="text-base font-heading font-bold text-foreground">AI lập lộ trình</p>
              <p className="text-xs text-muted-foreground mt-1">Cá nhân hoá theo bạn</p>
            </div>
            <div className="pt-4 mt-auto">
              <MagneticButton
                size="sm"
                onClick={() => navigate("/dashboard/ke-hoach")}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-full"
              >
                Tạo ngay
              </MagneticButton>
            </div>
          </GlassCard>
        </TiltCard>
      </StaggerReveal>
    </div>
  );
}
