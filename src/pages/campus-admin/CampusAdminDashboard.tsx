import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, CheckCircle2, GraduationCap, BookOpen } from "lucide-react";

function useMyCampusId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campus_admins")
        .select("campus_id, campuses(name, city)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

function StatCard({ icon: Icon, label, value, color = "primary" }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`h-5 w-5 text-${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampusAdminDashboard() {
  const { data: ca } = useMyCampusId();
  const campusId = ca?.campus_id;

  const { data: studentsCount } = useQuery({
    queryKey: ["ca-students-count", campusId],
    queryFn: async () => {
      const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("campus_id", campusId);
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["ca-pending-count", campusId],
    queryFn: async () => {
      const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("campus_id", campusId).eq("approval_status", "Pending");
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: approvedCount } = useQuery({
    queryKey: ["ca-approved-count", campusId],
    queryFn: async () => {
      const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("campus_id", campusId).eq("approval_status", "Approved");
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: classesCount } = useQuery({
    queryKey: ["ca-classes-count", campusId],
    queryFn: async () => {
      const { count } = await supabase.from("classes").select("id", { count: "exact", head: true }).eq("campus_id", campusId);
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: teachersCount } = useQuery({
    queryKey: ["ca-teachers-count", campusId],
    queryFn: async () => {
      const { count } = await supabase.from("teachers").select("id", { count: "exact", head: true }).eq("campus_id", campusId);
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const campus = (ca?.campuses as any);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{campus?.name ?? "Campus"} Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">{campus?.city ?? ""}</p>
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Total Students" value={studentsCount} />
        <StatCard icon={Clock} label="Pending Approval" value={pendingCount} color="warning" />
        <StatCard icon={CheckCircle2} label="Approved" value={approvedCount} color="success" />
        <StatCard icon={BookOpen} label="Classes" value={classesCount} />
        <StatCard icon={GraduationCap} label="Teachers" value={teachersCount} />
      </div>
    </div>
  );
}
