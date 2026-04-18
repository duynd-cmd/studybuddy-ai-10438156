import { LayoutDashboard, BookOpen, Search, Brain, Clock, FileText, LogOut, Layers } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Tổng quan", url: "/dashboard", icon: LayoutDashboard },
  { title: "Lộ trình", url: "/dashboard/ke-hoach", icon: BookOpen },
  { title: "Tài liệu", url: "/dashboard/tai-nguyen", icon: Search },
  { title: "Scriba AI", url: "/dashboard/scriba", icon: Brain },
  { title: "Study Hub", url: "/dashboard/study-hub", icon: Layers },
  { title: "Đồng hồ", url: "/dashboard/pomodoro", icon: Clock },
  { title: "Ghi chú", url: "/dashboard/ghi-chu", icon: FileText },
];

const spring = { type: "spring" as const, stiffness: 400, damping: 28 };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();

  const displayName = user?.email?.split("@")[0] || "Học sinh";
  const initial = displayName.charAt(0).toUpperCase();
  const gradeLabel = profile?.grade ? `Lớp ${profile.grade}` : "";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-sidebar/60 backdrop-blur-2xl">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-base text-foreground">AI Mentor</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center mx-auto">
            <Brain className="w-5 h-5 text-accent-foreground" />
          </div>
        )}

        {/* User card */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="mt-4 rounded-lg bg-secondary/60 p-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">Xin chào, {displayName}</p>
                {gradeLabel && (
                  <span className="inline-block mt-0.5 text-[10px] font-medium bg-accent/30 text-foreground px-1.5 py-0.5 rounded">
                    {gradeLabel}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-4 mb-1">
            {!collapsed && "Công cụ học tập"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, index) => {
                const isActive =
                  item.url === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: index * 0.04 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className={`transition-all rounded-lg ${
                            isActive
                              ? "bg-foreground text-primary-foreground font-medium shadow-[0_0_0_1px_hsl(var(--accent)/0.3),0_4px_20px_-4px_hsl(var(--accent)/0.4)]"
                              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:backdrop-blur-md"
                          }`}
                          activeClassName=""
                        >
                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }} transition={spring}>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={signOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2">Đăng xuất</span>}
          </Button>
        </motion.div>
      </SidebarFooter>
    </Sidebar>
  );
}
