import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type AllowedRole = "admin" | "teacher" | "student" | "campus_admin";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AllowedRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const checkRole = async () => {
      // Check user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData && allowedRoles.includes(roleData.role as AllowedRole)) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // If student role is allowed, also check students table
      if (allowedRoles.includes("student")) {
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (studentData) {
          setAuthorized(true);
          setChecking(false);
          return;
        }
      }

      // Not authorized — redirect to appropriate place
      if (roleData?.role === "admin") {
        navigate("/", { replace: true });
      } else if (roleData?.role === "teacher") {
        navigate("/teacher", { replace: true });
      } else if (roleData?.role === "campus_admin") {
        navigate("/campus-admin", { replace: true });
      } else {
        // Check if student
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (studentData) {
          navigate("/student", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      }
      setChecking(false);
    };

    checkRole();
  }, [user, authLoading, allowedRoles, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
