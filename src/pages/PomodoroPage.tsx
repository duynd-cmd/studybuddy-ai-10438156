import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { LiquidProgress } from "@/components/motion/LiquidProgress";
import { ParticleBurst, useParticleBurst } from "@/components/motion/ParticleBurst";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, Coffee, Clock } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { toast } from "sonner";

type SessionType = "focus" | "short_break" | "long_break";

const DURATIONS: Record<SessionType, number> = { focus: 25 * 60, short_break: 5 * 60, long_break: 15 * 60 };
const LABELS: Record<SessionType, string> = { focus: "Tập trung", short_break: "Nghỉ ngắn", long_break: "Nghỉ dài" };

export default function PomodoroPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const burst = useParticleBurst();

  const [sessionType, setSessionType] = useState<SessionType>("focus");
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [subject, setSubject] = useState("");
  const [completedFocus, setCompletedFocus] = useState(0);

  const total = DURATIONS[sessionType];
  const progress = ((total - timeLeft) / total) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isRunning && sessionType === "focus") { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isRunning, sessionType]);

  const handleComplete = useCallback(async () => {
    setIsRunning(false);
    burst.fire();
    if (sessionType === "focus" && user) {
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id, subject: subject || null,
        duration_minutes: DURATIONS.focus / 60, session_type: "focus",
        completed_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["pomodoro-today", user.id] });
      queryClient.invalidateQueries({ queryKey: ["pomodoro-stats", user.id] });
      const newCount = completedFocus + 1;
      setCompletedFocus(newCount);
      toast.success("Phiên tập trung hoàn thành! 🎉");
      if (newCount % 4 === 0) { setSessionType("long_break"); setTimeLeft(DURATIONS.long_break); }
      else { setSessionType("short_break"); setTimeLeft(DURATIONS.short_break); }
    } else {
      toast.success("Nghỉ ngơi xong! Tiếp tục nào 💪");
      setSessionType("focus"); setTimeLeft(DURATIONS.focus);
    }
  }, [sessionType, user, subject, completedFocus, queryClient, burst]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); handleComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, handleComplete]);

  const switchSession = (type: SessionType) => { setIsRunning(false); setSessionType(type); setTimeLeft(DURATIONS[type]); };

  const { data: todaySessions } = useQuery({
    queryKey: ["pomodoro-today", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("pomodoro_sessions").select("*")
        .eq("user_id", user.id).gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <AnimatedSection>
        <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Pomodoro</h1>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <GlassCard variant="elevated" className="p-6 border-glow relative">
          <ParticleBurst trigger={burst.trigger} count={28} />
          <div className="space-y-6">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Chọn môn học (tùy chọn)" /></SelectTrigger>
              <SelectContent>
                {(profile?.subjects || []).map((s: string) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 justify-center">
              {(["focus", "short_break", "long_break"] as SessionType[]).map((t) => (
                <Button key={t} variant={sessionType === t ? "default" : "outline"} size="sm"
                  onClick={() => switchSession(t)}
                  className={sessionType === t ? "bg-accent text-accent-foreground rounded-full" : "rounded-full"}>
                  {LABELS[t]}
                </Button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <LiquidProgress value={progress} size={220} label={LABELS[sessionType]} />
              <div className="text-center">
                <div className="font-heading font-bold text-foreground text-3xl tabular-nums tracking-tight">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">còn lại</div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => { setIsRunning(false); setTimeLeft(DURATIONS[sessionType]); }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <MagneticButton onClick={() => setIsRunning(!isRunning)} className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 rounded-full">
                {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isRunning ? "Tạm dừng" : "Bắt đầu"}
              </MagneticButton>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Phiên tập trung hôm nay: {todaySessions?.filter((s: any) => s.session_type === "focus").length || 0}
            </p>
          </div>
        </GlassCard>
      </AnimatedSection>

      {todaySessions && todaySessions.length > 0 && (
        <AnimatedSection delay={0.2}>
          <GlassCard className="p-5">
            <CardHeader className="p-0 pb-3"><CardTitle className="text-base font-heading">Lịch sử hôm nay</CardTitle></CardHeader>
            <CardContent className="p-0 space-y-2">
              {todaySessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2">
                    {s.session_type === "focus" ? <Clock className="w-3.5 h-3.5 text-accent" /> : <Coffee className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-foreground">{s.subject || LABELS[s.session_type as SessionType]}</span>
                  </div>
                  <span className="text-muted-foreground">{s.duration_minutes} phút</span>
                </div>
              ))}
            </CardContent>
          </GlassCard>
        </AnimatedSection>
      )}
    </div>
  );
}
