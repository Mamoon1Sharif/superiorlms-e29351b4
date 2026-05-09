import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Users, ClipboardCheck } from "lucide-react";
import brandLogo from "@/assets/superior-logo.png";
import UserMenu from "@/components/UserMenu";

export default function TeacherLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!user) return null;

  const navItems = [
    { to: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/teacher/students", icon: Users, label: "My Students" },
    { to: "/teacher/grading", icon: ClipboardCheck, label: "Grading" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/teacher" className="flex items-center gap-2">
              <img src={brandLogo} alt="Superior Group of Colleges logo" width={32} height={32} className="h-8 w-8 object-contain" loading="lazy" />
              <span className="font-bold text-sm tracking-tight">Superior Group of Colleges · Teacher</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
}
