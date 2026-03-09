import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const titles: Record<string, string> = {
  "/dashboard/ke-hoach": "Kế hoạch học tập",
  "/dashboard/tai-nguyen": "Tài nguyên",
  "/dashboard/scriba": "Scriba — Trợ lý PDF",
  "/dashboard/ghi-chu": "Ghi chú",
  "/dashboard/pomodoro": "Pomodoro",
};

export default function DashboardPlaceholder() {
  const { pathname } = useLocation();
  const title = titles[pathname] || "Tính năng";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-card border-border shadow-card max-w-md w-full">
        <CardContent className="p-10u text-center">
          <Construction className="w-12 h-12 mx-auto mb-4u text-muted-foreground" />
          <h2 className="text-h2 font-heading font-semibold text-foreground mb-2u">{title}</h2>
          <p className="text-muted-foreground">
            Tính năng này đang được phát triển và sẽ sớm ra mắt trong Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
