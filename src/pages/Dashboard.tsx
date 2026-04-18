import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { MeshGradient } from "@/components/ui/mesh-gradient";

const pageTransition = {
  initial: { opacity: 0, y: 12 } as const,
  animate: { opacity: 1, y: 0 } as const,
  exit: { opacity: 0, y: -8 } as const,
  transition: { type: "spring" as const, stiffness: 280, damping: 30 },
};

export default function Dashboard() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <MeshGradient />
      <div className="min-h-screen flex w-full relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/40 px-4u glass sticky top-0 z-40">
            <SidebarTrigger className="mr-4u" />
            <span className="font-heading font-semibold text-foreground">AI-Mentor</span>
          </header>
          <main className="flex-1 p-6u overflow-auto">
            <LayoutGroup>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  {...pageTransition}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </LayoutGroup>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
