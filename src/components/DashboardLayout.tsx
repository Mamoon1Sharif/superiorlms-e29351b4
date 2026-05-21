import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import UserMenu from "@/components/UserMenu";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/courses": "Courses",
  "/users": "Users",
  "/institute": "Institute Management",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/notifications": "Notifications",
};

export function DashboardLayout() {
  const location = useLocation();
  const title =
    TITLES[location.pathname] ??
    Object.entries(TITLES).find(([p]) => p !== "/" && location.pathname.startsWith(p))?.[1] ??
    "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-card px-4 shrink-0">
            <SidebarTrigger />
            {title && <h1 className="text-base font-semibold tracking-tight">{title}</h1>}
            <div className="flex-1" />
            <ThemeSwitcher />
            <UserMenu />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
