import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedSection } from "@/components/AnimatedSection";
import { CalendarDays, Loader2, Plus, Trash2, Award, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type ReviewQuestion = {
  question: string;
  options: string[];
  correct: number;
  hints?: string[];
};

export default function StudyPlanPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("1_week");
  const [generating, setGenerating] = useState(false);

  // Review state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<(number | null)[]>([null, null]);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  // Three-Strike hint state: attempts per question, shown hints per question
  const [reviewAttempts, setReviewAttempts] = useState<number[]>([0, 0]);
  const [reviewHintsShown, setReviewHintsShown] = useState<number[]>([0, 0]);
  const [questionLocked, setQuestionLocked] = useState<boolean[]>([false, false]);

  // Flashcards state
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

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

      const { data: plan, error: planError } = await supabase
        .from("study_plans")
        .insert({ user_id: user.id, subject, duration, status: "active" })
        .select()
        .single();
      if (planError) throw planError;

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

  const handleTaskCheck = async (task: any, plan: any) => {
    if (task.completed) {
      // Uncheck
      await supabase.from("study_tasks").update({ completed: false, completed_at: null }).eq("id", task.id);
      queryClient.invalidateQueries({ queryKey: ["study-plans", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["task-stats", user?.id] });
      return;
    }
    // Open review dialog
    setReviewTask({ ...task, planSubject: plan.subject });
    setReviewAnswers([null, null]);
    setReviewSubmitted(false);
    setReviewAttempts([0, 0]);
    setReviewHintsShown([0, 0]);
    setQuestionLocked([false, false]);
    setReviewLoading(true);
    setReviewOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("review-task", {
        body: {
          taskTitle: task.title,
          taskDescription: task.description,
          grade: profile?.grade,
          subject: plan.subject,
        },
      });
      if (error) throw error;
      setReviewQuestions(data.questions || []);
    } catch (e: any) {
      toast.error("Không tạo được câu hỏi ôn tập");
      setReviewOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  // Check a single question answer (Three-Strike Rule)
  const checkAnswer = (qi: number) => {
    const q = reviewQuestions[qi];
    const answer = reviewAnswers[qi];
    if (answer === null || questionLocked[qi]) return;

    if (answer === q.correct) {
      // Correct — lock this question
      const newLocked = [...questionLocked];
      newLocked[qi] = true;
      setQuestionLocked(newLocked);
      toast.success(`Câu ${qi + 1}: Đúng rồi! 🎉`);
    } else {
      // Wrong — increment attempts
      const newAttempts = [...reviewAttempts];
      newAttempts[qi] += 1;
      setReviewAttempts(newAttempts);

      if (newAttempts[qi] >= 3) {
        // 3 strikes — reveal answer and lock
        const newLocked = [...questionLocked];
        newLocked[qi] = true;
        setQuestionLocked(newLocked);
        toast.error(`Câu ${qi + 1}: Đáp án đúng là "${q.options[q.correct]}"`);
      } else {
        // Show next hint
        const newHints = [...reviewHintsShown];
        newHints[qi] = Math.min(newAttempts[qi], (q.hints || []).length);
        setReviewHintsShown(newHints);

        // Reset selection for retry
        const newAnswers = [...reviewAnswers];
        newAnswers[qi] = null;
        setReviewAnswers(newAnswers);

        toast.info(`Sai rồi! Thử lại nhé (lần ${newAttempts[qi]}/3)`);
      }
    }
  };

  // Final submit — called when all questions are locked (answered correctly or 3 strikes)
  const submitReview = async () => {
    if (!reviewTask || !user) return;
    const score = reviewQuestions.reduce((s, q, i) => {
      return s + (reviewAnswers[i] === q.correct ? 1 : 0);
    }, 0);
    const allCorrect = score === reviewQuestions.length;
    setReviewSubmitted(true);

    // Save review log regardless
    await supabase.from("task_reviews" as any).insert({
      task_id: reviewTask.id,
      user_id: user.id,
      questions: reviewQuestions,
      answers: reviewAnswers,
      score,
    });

    // ONLY mark task complete if all answers were correct
    if (allCorrect) {
      await supabase.from("study_tasks").update({
        completed: true,
        completed_at: new Date().toISOString(),
      }).eq("id", reviewTask.id);
      toast.success("Hoàn thành! Bài học đã được đánh dấu xong ✅");
    } else {
      toast.error("Có câu trả lời sai — bạn cần làm lại bài này để tick hoàn thành");
    }

    queryClient.invalidateQueries({ queryKey: ["study-plans", user.id] });
    queryClient.invalidateQueries({ queryKey: ["task-stats", user.id] });
  };

  const allQuestionsLocked = questionLocked.every(Boolean);

  const skipReview = async () => {
    if (!reviewTask || !user) return;
    await supabase.from("study_tasks").update({
      completed: true,
      completed_at: new Date().toISOString(),
    }).eq("id", reviewTask.id);
    queryClient.invalidateQueries({ queryKey: ["study-plans", user.id] });
    queryClient.invalidateQueries({ queryKey: ["task-stats", user.id] });
    setReviewOpen(false);
  };

  const isPlanComplete = (plan: any) => {
    const tasks = plan.study_tasks || [];
    return tasks.length > 0 && tasks.every((t: any) => t.completed);
  };

  const generateFlashcards = async (plan: any) => {
    if (!user) return;
    setFlashcardsLoading(true);
    setFlashcardsOpen(true);
    setFlashcardIndex(0);
    setFlipped(false);

    try {
      // Check if flashcards already exist
      const { data: existing } = await supabase
        .from("flashcards" as any)
        .select("*")
        .eq("plan_id", plan.id)
        .eq("user_id", user.id);

      if (existing && existing.length > 0) {
        setFlashcards(existing.map((f: any) => ({ front: f.front, back: f.back })));
        setFlashcardsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: {
          tasks: plan.study_tasks,
          subject: plan.subject,
          grade: profile?.grade,
        },
      });
      if (error) throw error;

      const cards = data.flashcards || [];
      setFlashcards(cards);

      // Save to DB
      if (cards.length > 0) {
        await supabase.from("flashcards" as any).insert(
          cards.map((c: any) => ({ plan_id: plan.id, user_id: user.id, front: c.front, back: c.back }))
        );
      }
    } catch (e: any) {
      toast.error("Không tạo được flashcards");
      setFlashcardsOpen(false);
    } finally {
      setFlashcardsLoading(false);
    }
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
            <Input placeholder="Nhập môn học / chủ đề (VD: Toán hình học)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1_week">1 Tuần</SelectItem>
                <SelectItem value="2_weeks">2 Tuần</SelectItem>
                <SelectItem value="1_month">1 Tháng</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generatePlan} disabled={generating || !subject.trim()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo...</> : "Tạo kế hoạch AI"}
            </Button>
          </CardContent>
        </Card>
      </AnimatedSection>

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
              <div className="flex items-center gap-1">
                {isPlanComplete(plan) && (
                  <Button variant="outline" size="sm" onClick={() => generateFlashcards(plan)} className="text-xs gap-1">
                    <Award className="w-3.5 h-3.5" /> Flashcards
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(plan.study_tasks || [])
                .sort((a: any, b: any) => a.day_number - b.day_number)
                .map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleTaskCheck(task, plan)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        Ngày {task.day_number}: {task.title}
                      </p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
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

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={(open) => { if (!open) setReviewOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Ôn tập: {reviewTask?.title}</DialogTitle>
          </DialogHeader>
          {reviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tạo câu hỏi...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewQuestions.map((q, qi) => {
                const isLocked = questionLocked[qi];
                const attempts = reviewAttempts[qi];
                const hintsToShow = reviewHintsShown[qi];
                const failedOut = isLocked && reviewAnswers[qi] !== q.correct;

                return (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{qi + 1}. {q.question}</p>
                    
                    {/* Hints */}
                    {hintsToShow > 0 && q.hints && (
                      <div className="space-y-1">
                        {q.hints.slice(0, hintsToShow).map((hint, hi) => (
                          <div key={hi} className="flex items-start gap-2 px-3 py-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                            <span className="text-amber-600 dark:text-amber-400 text-xs font-bold mt-0.5">💡 Gợi ý {hi + 1}:</span>
                            <span className="text-xs text-amber-800 dark:text-amber-300">{hint}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => {
                        const selected = reviewAnswers[qi] === oi;
                        const isCorrect = q.correct === oi;
                        let optClass = "border-border hover:bg-secondary/50";
                        
                        if (isLocked) {
                          if (isCorrect) optClass = "border-green-500 bg-green-50 dark:bg-green-950";
                          else if (failedOut && selected) optClass = "border-destructive bg-red-50 dark:bg-red-950";
                          else optClass = "border-border opacity-50";
                        } else if (selected) {
                          optClass = "border-accent bg-accent/10";
                        }

                        return (
                          <button
                            key={oi}
                            disabled={isLocked}
                            onClick={() => {
                              const newAnswers = [...reviewAnswers];
                              newAnswers[qi] = oi;
                              setReviewAnswers(newAnswers);
                            }}
                            className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${optClass}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {/* Per-question check button */}
                    {!isLocked && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkAnswer(qi)}
                        disabled={reviewAnswers[qi] === null}
                        className="text-xs"
                      >
                        Kiểm tra câu {qi + 1} {attempts > 0 ? `(${attempts}/3)` : ""}
                      </Button>
                    )}

                    {/* Status badge */}
                    {isLocked && (
                      <p className={`text-xs font-medium ${reviewAnswers[qi] === q.correct ? "text-green-600" : "text-destructive"}`}>
                        {reviewAnswers[qi] === q.correct ? "✅ Đúng!" : `❌ Sai 3 lần — Đáp án: ${q.options[q.correct]}`}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="flex gap-2">
                {!reviewSubmitted ? (
                  <>
                    {allQuestionsLocked ? (
                      <Button
                        onClick={submitReview}
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        Hoàn thành ôn tập
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground flex-1 text-center py-2">
                        Trả lời từng câu hỏi để hoàn thành
                      </p>
                    )}
                    <Button variant="ghost" onClick={skipReview} className="text-muted-foreground">
                      Bỏ qua
                    </Button>
                  </>
                ) : (
                  (() => {
                    const correct = reviewQuestions.reduce((s, q, i) => s + (reviewAnswers[i] === q.correct ? 1 : 0), 0);
                    const allRight = correct === reviewQuestions.length;
                    return (
                      <Button onClick={() => setReviewOpen(false)} className={`w-full ${allRight ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}`}>
                        {correct}/{reviewQuestions.length} đúng — {allRight ? "Đã hoàn thành ✅" : "Chưa đạt, cần làm lại"}
                      </Button>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flashcards Dialog */}
      <Dialog open={flashcardsOpen} onOpenChange={(open) => { if (!open) setFlashcardsOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Award className="w-5 h-5" /> Flashcards ôn tập
            </DialogTitle>
          </DialogHeader>
          {flashcardsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tạo flashcards...</span>
            </div>
          ) : flashcards.length > 0 ? (
            <div className="space-y-4">
              <div
                onClick={() => setFlipped(!flipped)}
                className="min-h-[160px] rounded-lg border border-border bg-secondary/30 flex items-center justify-center p-6 cursor-pointer"
                style={{ perspective: "600px" }}
              >
                <div
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.5s cubic-bezier(0.33, 1, 0.68, 1)",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    position: "relative",
                    width: "100%",
                    minHeight: "120px",
                  }}
                >
                  {/* Front */}
                  <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p className="text-center text-sm font-medium text-foreground">
                      {flashcards[flashcardIndex]?.front}
                    </p>
                  </div>
                  {/* Back */}
                  <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p className="text-center text-sm font-medium text-foreground">
                      {flashcards[flashcardIndex]?.back}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {flipped ? "Đáp án" : "Câu hỏi"} — Nhấn để lật • {flashcardIndex + 1}/{flashcards.length}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={flashcardIndex === 0}
                  onClick={() => { setFlashcardIndex(flashcardIndex - 1); setFlipped(false); }}
                >
                  ← Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setFlipped(false); setFlashcardIndex(0); }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={flashcardIndex === flashcards.length - 1}
                  onClick={() => { setFlashcardIndex(flashcardIndex + 1); setFlipped(false); }}
                >
                  Sau →
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Không có flashcards</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
