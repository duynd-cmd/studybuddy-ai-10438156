import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedSection } from "@/components/AnimatedSection";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StudyPlanPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("1_week");
  const [generating, setGenerating] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["study-plans", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("study_plans")
        .select("*, study_tasks(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const generatePlan = async () => {
    if (!subject.trim() || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {
        body: { subject, duration, grade: profile?.grade, subjects: profile?.subjects, goal: profile?.goal },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from("study_plans")
        .insert({ user_id: user.id, subject, duration, status: "active" })
        .select()
        .single();
      if (planError) throw planError;

      // Insert tasks
      const tasks = (data.tasks || []).map((t: any) => ({
        plan_id: plan.id,
        user_id: user.id,
        day_number: t.day_number,
        title: t.title,
        description: t.description,
      }));
      if (tasks.length > 0) {
        await supabase.from("study_tasks").insert(tasks);
      }

      queryClient.invalidateQueries({ queryKey: ["study-plans", user.id] });
      queryClient.invalidateQueries({ queryKey: ["active-plan", user.id] });
      toast.success("Đã tạo kế hoạch học tập!");
      setSubject("");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi tạo kế hoạch");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await supabase.from("study_tasks").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: ["study-plans", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["task-stats", user?.id] });
  };

  const deletePlan = async (planId: string) => {
    await supabase.from("study_plans").delete().eq("id", planId);
    queryClient.invalidateQueries({ queryKey: ["study-plans", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["active-plan", user?.id] });
    toast.success("Đã xóa kế hoạch");
  };

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <h1 className="text-2xl font-heading font-bold text-foreground">Kế hoạch học tập</h1>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Plus className="w-4 h-4" /> Tạo kế hoạch mới với AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nhập môn học / chủ đề (VD: Toán hình học)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_week">1 Tuần</SelectItem>
                <SelectItem value="2_weeks">2 Tuần</SelectItem>
                <SelectItem value="1_month">1 Tháng</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generatePlan}
              disabled={generating || !subject.trim()}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo...</> : "Tạo kế hoạch AI"}
            </Button>
          </CardContent>
        </Card>
      </AnimatedSection>

      {/* Plans list */}
      {plans?.map((plan: any, i: number) => (
        <AnimatedSection key={plan.id} delay={0.2 + i * 0.05}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> {plan.subject}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.study_tasks?.filter((t: any) => t.completed).length || 0}/{plan.study_tasks?.length || 0} hoàn thành
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(plan.study_tasks || [])
                .sort((a: any, b: any) => a.day_number - b.day_number)
                .map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => toggleTask(task.id, !!checked)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        Ngày {task.day_number}: {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </AnimatedSection>
      ))}

      {!isLoading && (!plans || plans.length === 0) && (
        <AnimatedSection delay={0.2}>
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có kế hoạch nào. Tạo kế hoạch đầu tiên!</p>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
