import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, LayoutDashboard, Users, GraduationCap, BookOpen, School } from "lucide-react";
import UserMenu from "@/components/UserMenu";

export default function CampusAdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/campus-admin" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight">Campus Admin</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                to="/campus-admin"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </Link>
              <Link
                to="/campus-admin/institute"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <School className="h-3.5 w-3.5" /> Campus
              </Link>
              <Link
                to="/campus-admin/teachers"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <GraduationCap className="h-3.5 w-3.5" /> Teachers
              </Link>
              <Link
                to="/campus-admin/classes"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5" /> Classes
              </Link>
              <Link
                to="/campus-admin/students"
                className="text-sm px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Users className="h-3.5 w-3.5" /> Students
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
