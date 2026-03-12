import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AnimatePresence, motion } from "framer-motion";

const pageTransition = {
  initial: { opacity: 0, y: 12 } as const,
  animate: { opacity: 1, y: 0 } as const,
  exit: { opacity: 0, y: -8 } as const,
  transition: { type: "spring" as const, stiffness: 400, damping: 28 },
};

export default function Dashboard() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4u bg-background/80 backdrop-blur-md">
            <SidebarTrigger className="mr-4u" />
            <span className="font-heading font-semibold text-foreground">AI-Mentor</span>
          </header>
          <main className="flex-1 p-6u overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                {...pageTransition}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
