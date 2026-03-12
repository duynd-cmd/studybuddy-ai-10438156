import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Brain, Clock, FileText, Target, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const features = [
  { icon: Target, title: "Kế hoạch cá nhân", desc: "AI tạo lộ trình học tập theo cấp lớp và mục tiêu của bạn, bám sát chương trình MOET 2018." },
  { icon: Brain, title: "Trợ lý AI thông minh", desc: "Hỏi đáp, giải thích bài, tóm tắt nội dung — tất cả bằng tiếng Việt, phù hợp trình độ." },
  { icon: FileText, title: "Scriba — Trợ lý PDF", desc: "Upload sách giáo khoa, ghi chú. AI trả lời câu hỏi và trích xuất nội dung theo trang." },
  { icon: BookOpen, title: "Tài nguyên chọn lọc", desc: "Tài liệu uy tín được lọc theo lớp, môn học và chương trình giáo dục quốc gia." },
  { icon: Clock, title: "Pomodoro tập trung", desc: "Hẹn giờ Pomodoro nghiêm ngặt giúp bạn tập trung cao độ trong từng phiên học." },
  { icon: Users, title: "Bài tập thích ứng", desc: "Câu hỏi tự động tăng độ khó dựa trên kết quả trước đó, giúp bạn tiến bộ liên tục." },
];

const testimonials = [
  { name: "Minh Anh", grade: "Lớp 11, Hà Nội", quote: "AI-Mentor giúp mình ôn thi đại học hiệu quả hơn rất nhiều. Kế hoạch học tập rõ ràng, bài tập tự động tăng độ khó!" },
  { name: "Thầy Hoàng", grade: "Giáo viên Toán, TP.HCM", quote: "Một công cụ tuyệt vời hỗ trợ giảng dạy. Học sinh chủ động hơn khi có lộ trình riêng." },
  { name: "Thu Hà", grade: "Lớp 9, Đà Nẵng", quote: "Scriba giúp mình đọc sách giáo khoa nhanh hơn. Chỉ cần hỏi là có câu trả lời kèm số trang!" },
  { name: "Bảo Long", grade: "Lớp 12, Cần Thơ", quote: "Pomodoro kết hợp với kế hoạch học tập AI — combo hoàn hảo cho mùa thi!" },
];

export default function Index() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const nextTestimonial = () => setCurrentTestimonial((p) => (p + 1) % testimonials.length);
  const prevTestimonial = () => setCurrentTestimonial((p) => (p - 1 + testimonials.length) % testimonials.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <span className="font-heading text-xl font-bold text-foreground">AI-Mentor</span>
          <div className="flex gap-3u">
            <Button variant="ghost" asChild>
              <Link to="/dang-nhap">Đăng nhập</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/dang-ky">Đăng ký</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4u">
        <div className="container text-center max-w-3xl mx-auto">
          <AnimatedSection>
            <h1 className="text-h1 font-heading font-bold text-foreground mb-6u">
              Học thông minh hơn với
              <span className="text-accent-foreground bg-accent inline-block px-3u py-1u rounded-lg ml-2 mt-2">
                AI-Mentor
              </span>
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="text-body text-muted-foreground mb-10u max-w-2xl mx-auto">
              Nền tảng học tập cá nhân hóa bằng AI cho học sinh Lớp 1–12, bám sát chương trình giáo dục MOET 2018. Kế hoạch riêng, bài tập thích ứng, trợ lý thông minh.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-4u justify-center">
              <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8u py-6u font-heading font-semibold">
                <Link to="/dang-ky">Bắt đầu học ngay</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8u py-6u font-heading">
                <Link to="/dang-nhap">Đăng nhập</Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4u">
        <div className="container">
          <AnimatedSection>
            <h2 className="text-h2 font-heading font-semibold text-center mb-12u">
              Tất cả công cụ bạn cần, trong một nền tảng
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6u">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.1}>
                <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
                  <Card className="h-full bg-card border-border shadow-card hover:shadow-lift transition-shadow duration-300">
                    <CardContent className="p-8u">
                      <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4u">
                        <f.icon className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <h3 className="font-heading font-semibold text-lg mb-2u text-foreground">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4u bg-secondary/50">
        <div className="container max-w-2xl mx-auto">
          <AnimatedSection>
            <h2 className="text-h2 font-heading font-semibold text-center mb-12u">
              Học sinh & giáo viên nói gì?
            </h2>
          </AnimatedSection>
          <div className="relative">
            <Card className="bg-card border-border shadow-card overflow-hidden">
              <CardContent className="p-10u text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonial}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  >
                    <p className="text-body text-foreground mb-6u italic leading-relaxed">
                      "{testimonials[currentTestimonial].quote}"
                    </p>
                    <p className="font-heading font-semibold text-foreground">
                      {testimonials[currentTestimonial].name}
                    </p>
                    <p className="text-sm text-muted-foreground">{testimonials[currentTestimonial].grade}</p>
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
            <div className="flex justify-center gap-4u mt-6u">
              <Button variant="outline" size="icon" onClick={prevTestimonial} aria-label="Trước">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTestimonial(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentTestimonial ? "bg-accent" : "bg-border"}`}
                    aria-label={`Testimonial ${i + 1}`}
                  />
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={nextTestimonial} aria-label="Sau">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-4u">
        <div className="container text-center max-w-2xl mx-auto">
          <AnimatedSection>
            <h2 className="text-h2 font-heading font-semibold mb-4u">Sẵn sàng học hiệu quả hơn?</h2>
            <p className="text-muted-foreground mb-8u">Đăng ký miễn phí và bắt đầu hành trình học tập thông minh ngay hôm nay.</p>
            <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8u py-6u font-heading font-semibold">
              <Link to="/dang-ky">Đăng ký miễn phí</Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Sticky CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: showSticky ? 0 : 100 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border py-3u px-4u"
      >
        <div className="container flex items-center justify-between">
          <p className="text-sm font-heading font-medium text-foreground hidden sm:block">
            🚀 Bắt đầu học thông minh cùng AI-Mentor
          </p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 font-heading font-semibold ml-auto">
            <Link to="/dang-ky">Đăng ký miễn phí</Link>
          </Button>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="border-t border-border py-8u px-4u">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">© 2026 AI-Mentor. Nền tảng học tập thông minh cho học sinh Việt Nam.</p>
        </div>
      </footer>
    </div>
  );
}
