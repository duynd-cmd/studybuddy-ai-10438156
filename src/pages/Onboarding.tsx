import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Brain, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const grades = [
  "Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5",
  "Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9",
  "Lớp 10", "Lớp 11", "Lớp 12",
  "Đại học",
];

const gradeGroups = [
  { label: "Tiểu học", grades: grades.slice(0, 5) },
  { label: "THCS", grades: grades.slice(5, 9) },
  { label: "THPT", grades: grades.slice(9, 12) },
  { label: "", grades: grades.slice(12) },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState("");
  const [subjects, setSubjects] = useState("");
  const [goal, setGoal] = useState("");

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (profile?.onboarding_completed) return <Navigate to="/dashboard" replace />;

  const progress = (step / 3) * 100;

  const handleComplete = async () => {
    const subjectList = subjects.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      await updateProfile.mutateAsync({
        grade,
        subjects: subjectList,
        goal,
        onboarding_completed: true,
      });
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4u">
      <Card className="w-full max-w-lg bg-card border-border shadow-card">
        <CardContent className="p-8u">
          <Progress value={progress} className="mb-8u h-2" />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <div className="text-center mb-6u">
                  <BookOpen className="w-12 h-12 mx-auto mb-4u text-foreground" />
                  <h2 className="text-h2 font-heading font-semibold text-foreground">Bạn đang học lớp mấy?</h2>
                  <p className="text-sm text-muted-foreground mt-2u">Giúp AI Mentor điều chỉnh độ khó phù hợp.</p>
                </div>
                <div className="space-y-4u">
                  {gradeGroups.map((group) => (
                    <div key={group.label}>
                      {group.label && (
                        <p className="text-xs font-medium text-muted-foreground mb-2u uppercase tracking-wider">{group.label}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2u">
                        {group.grades.map((g) => (
                          <button
                            key={g}
                            onClick={() => setGrade(g)}
                            className={`py-3u px-4u rounded-lg border text-sm font-medium transition-all duration-200 ${
                              grade === g
                                ? "bg-accent text-accent-foreground border-accent shadow-sm"
                                : "bg-background border-border text-foreground hover:border-accent/50 hover:bg-accent/10"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-8u bg-accent text-accent-foreground hover:bg-accent/90 font-heading font-semibold"
                  disabled={!grade}
                  onClick={() => setStep(2)}
                >
                  Tiếp tục
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <div className="text-center mb-6u">
                  <Brain className="w-12 h-12 mx-auto mb-4u text-foreground" />
                  <h2 className="text-h2 font-heading font-semibold text-foreground">Môn học nào bạn muốn cải thiện?</h2>
                  <p className="text-sm text-muted-foreground mt-2u">AI Mentor sẽ tập trung hỗ trợ bạn các môn này.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2u block">
                    Nhập tên các môn (cách nhau bởi dấu phẩy)
                  </label>
                  <Textarea
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                    placeholder="Ví dụ: Toán Hình, Tiếng Anh, Hóa Học hữu cơ..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3u mt-8u">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 font-heading">
                    Quay lại
                  </Button>
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-heading font-semibold"
                    disabled={!subjects.trim()}
                    onClick={() => setStep(3)}
                  >
                    Tiếp tục
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <div className="text-center mb-6u">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4u text-accent" />
                  <h2 className="text-h2 font-heading font-semibold text-foreground">Mục tiêu của bạn là gì?</h2>
                  <p className="text-sm text-muted-foreground mt-2u">Để chúng tôi thiết kế lộ trình phù hợp nhất.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2u block">
                    Chia sẻ ngắn gọn mục tiêu của bạn
                  </label>
                  <Textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Ví dụ: Đậu Đại học Bách Khoa, Đạt 8.0 IELTS, Nắm chắc kiến thức cơ bản..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-3u mt-8u">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 font-heading">
                    Quay lại
                  </Button>
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-heading font-semibold"
                    disabled={!goal.trim() || updateProfile.isPending}
                    onClick={handleComplete}
                  >
                    {updateProfile.isPending ? "Đang lưu..." : "Hoàn tất →"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
