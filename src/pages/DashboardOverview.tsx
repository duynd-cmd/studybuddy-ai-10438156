import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Brain, CalendarDays, FileText, Clock } from "lucide-react";
import { AnimatedSection } from "@/components/AnimatedSection";

export default function DashboardOverview() {
  const { data: profile } = useProfile();

  return (
    <div className="space-y-6u">
      <AnimatedSection>
        <div>
          <h1 className="text-h2 font-heading font-bold text-foreground">
            Xin chào! 👋
          </h1>
          <p className="text-muted-foreground mt-1u">
            {profile?.grade && `${profile.grade} · `}
            {profile?.goal || "Hãy bắt đầu hành trình học tập thông minh!"}
          </p>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4u">
        {[
          { icon: CalendarDays, title: "Kế hoạch học tập", desc: "Xem và quản lý lộ trình hàng tuần", color: "text-foreground" },
          { icon: Brain, title: "Môn học của bạn", desc: profile?.subjects?.join(", ") || "Chưa thiết lập", color: "text-foreground" },
          { icon: Target, title: "Mục tiêu", desc: profile?.goal || "Chưa thiết lập", color: "text-foreground" },
          { icon: BookOpen, title: "Tài nguyên", desc: "Khám phá tài liệu theo chương trình", color: "text-foreground" },
          { icon: FileText, title: "Scriba", desc: "Upload PDF và hỏi đáp thông minh", color: "text-foreground" },
          { icon: Clock, title: "Pomodoro", desc: "Bắt đầu phiên tập trung", color: "text-foreground" },
        ].map((item, i) => (
          <AnimatedSection key={item.title} delay={i * 0.08}>
            <Card className="bg-card border-border shadow-card hover:shadow-lift transition-shadow duration-200 cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3u">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <CardTitle className="text-base font-heading">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}
