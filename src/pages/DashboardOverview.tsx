import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Target, Brain, HelpCircle, TrendingUp } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

  const accuracy = taskStats?.total
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  const chartData = taskStats?.total
    ? [
        { name: "Hoàn thành", value: taskStats.completed },
        { name: "Chưa xong", value: taskStats.total - taskStats.completed },
      ]
    : [{ name: "Chưa có", value: 1 }];

  const CHART_COLORS = ["hsl(88, 100%, 50%)", "hsl(39, 20%, 80%)"];

  const stats = [
    { icon: Clock, label: "Phút tập trung", value: pomodoroStats?.totalMinutes || 0 },
    { icon: Target, label: "Phiên Pomodoro", value: pomodoroStats?.totalSessions || 0 },
    { icon: TrendingUp, label: "Độ chính xác", value: `${accuracy}%` },
    { icon: HelpCircle, label: "Câu hỏi đã hỏi", value: messageCount || 0 },
  ];

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Xin chào! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {profile?.grade && `${profile.grade} · `}
              {profile?.goal || "Hãy bắt đầu hành trình học tập thông minh!"}
            </p>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <AnimatedSection key={stat.label} delay={i * 0.08}>
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                  <stat.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedSection delay={0.3}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-heading">Lộ trình hiện tại</CardTitle>
            </CardHeader>
            <CardContent>
              {activePlan ? (
                <div className="space-y-3">
                  <p className="font-medium text-foreground">{activePlan.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {(activePlan as any).study_tasks?.filter((t: any) => t.completed).length || 0}/
                    {(activePlan as any).study_tasks?.length || 0} nhiệm vụ hoàn thành
                  </p>
                  <Button size="sm" onClick={() => navigate("/dashboard/ke-hoach")} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Tiếp tục học
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Chưa có lộ trình nào</p>
                  <Button size="sm" onClick={() => navigate("/dashboard/ke-hoach")} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Tạo lộ trình AI
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.4}>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-heading">Chất lượng học tập</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[160px]">
                {taskStats?.total ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
                )}
              </div>
              {taskStats?.total ? (
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Hoàn thành</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-border" /> Chưa xong</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
