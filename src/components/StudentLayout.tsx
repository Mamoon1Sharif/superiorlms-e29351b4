import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, LayoutDashboard, GraduationCap } from "lucide-react";
import brandLogo from "@/assets/superior-logo.png";
import UserMenu from "@/components/UserMenu";

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/student" className="flex items-center gap-2">
              <img src={brandLogo} alt="Superior Group of Colleges logo" width={32} height={32} className="h-8 w-8 object-contain" loading="lazy" />
              <span className="font-bold text-sm tracking-tight">Superior Group of Colleges</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link to="/student" className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </Link>
              <Link to="/student/catalog" className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Courses
              </Link>
              <Link to="/student/capstone" className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Capstone
              </Link>
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
