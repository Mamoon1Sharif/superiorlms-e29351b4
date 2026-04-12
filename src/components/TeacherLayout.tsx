import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, LayoutDashboard, LogOut, GraduationCap, Users, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function TeacherLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

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
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight">EduAdmin · Teacher</span>
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
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/login"); }} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
}
