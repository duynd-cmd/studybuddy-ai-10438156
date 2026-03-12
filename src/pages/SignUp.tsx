import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SignUp() {
  const { user, signUp, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Đăng ký thất bại. " + error.message);
    } else {
      toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4u">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md"
      >
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="text-center">
            <Link to="/" className="font-heading text-xl font-bold text-foreground mb-4u inline-block">
              AI-Mentor
            </Link>
            <CardTitle className="text-h2 font-heading">Đăng ký</CardTitle>
            <CardDescription>Tạo tài khoản để bắt đầu học tập thông minh</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4u">
              <div>
                <label className="text-sm font-medium text-foreground mb-1u block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1u block">Mật khẩu</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-heading font-semibold"
                disabled={submitting}
              >
                {submitting ? "Đang tạo tài khoản..." : "Đăng ký"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6u">
              Đã có tài khoản?{" "}
              <Link to="/dang-nhap" className="text-foreground font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
