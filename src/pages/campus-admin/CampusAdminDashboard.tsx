import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, CheckCircle2, GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import { useStudentOverallProgress } from "@/components/StudentProgressDetail";

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

function StudentProgressRow({ s }: { s: any }) {
  const { data: overall = 0 } = useStudentOverallProgress(s.id);
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {(s.name || "?")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{s.name}</p>
        <p className="text-xs text-muted-foreground truncate">{s.reg_no || s.email}</p>
      </div>
      <div className="flex items-center gap-2 w-32">
        <Progress value={overall} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{overall}%</span>
      </div>
    </div>
  );
}

function SectionCard({ title, to, children, empty }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link to={to}>
            See more <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {children || <p className="text-sm text-muted-foreground py-4 text-center">{empty}</p>}
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
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("campus_id", campusId);
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: pendingCount } = useQuery({
    queryKey: ["ca-pending-count", campusId],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("campus_id", campusId)
        .eq("approval_status", "Pending");
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: approvedCount } = useQuery({
    queryKey: ["ca-approved-count", campusId],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("campus_id", campusId)
        .eq("approval_status", "Approved");
      return count ?? 0;
    },
    enabled: !!campusId,
  });

  const { data: classes } = useQuery({
    queryKey: ["ca-dash-classes", campusId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").eq("campus_id", campusId).order("name");
      return data ?? [];
    },
    enabled: !!campusId,
  });

  const { data: sections } = useQuery({
    queryKey: ["ca-dash-sections", campusId, classes?.map((c: any) => c.id).join(",")],
    queryFn: async () => {
      const ids = (classes ?? []).map((c: any) => c.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("sections").select("id, name, class_id").in("class_id", ids);
      return data ?? [];
    },
    enabled: !!classes,
  });

  const { data: teachers } = useQuery({
    queryKey: ["ca-dash-teachers", campusId],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id, name, email")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!campusId,
  });

  const { data: students } = useQuery({
    queryKey: ["ca-dash-students", campusId],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, name, email, reg_no")
        .eq("campus_id", campusId)
        .eq("approval_status", "Approved")
        .limit(50);
      return data ?? [];
    },
    enabled: !!campusId,
  });

  const campus = ca?.campuses as any;
  const classesCount = classes?.length;
  const teachersCount = teachers?.length;

  const sectionsByClass = (cid: string) => (sections ?? []).filter((s: any) => s.class_id === cid);

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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <SectionCard title="Campus Teachers" to="/campus-admin/teachers" empty="No teachers yet">
          {(teachers?.length ?? 0) > 0 && (
            <div className="divide-y">
              {teachers!.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-success/10 text-success">
                      {(t.name || "?")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Classes & Sections" to="/campus-admin/institute" empty="No classes yet">
          {(classes?.length ?? 0) > 0 && (
            <div className="divide-y">
              {classes!.slice(0, 5).map((c: any) => {
                const secs = sectionsByClass(c.id);
                return (
                  <div key={c.id} className="py-2">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {secs.length ? secs.map((s: any) => s.name).join(", ") : "No sections"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Students Progress" to="/campus-admin/classes" empty="No approved students yet">
          {(students?.length ?? 0) > 0 && <TopStudents students={students!} />}
        </SectionCard>
      </div>
    </div>
  );
}

function TopStudents({ students }: { students: any[] }) {
  // Fetch progress for all and sort client-side (limited list).
  const { data: ranked } = useQuery({
    queryKey: ["ca-dash-top-students", students.map((s) => s.id).join(",")],
    queryFn: async () => {
      const ids = students.map((s) => s.id);
      const { data: prog } = await supabase
        .from("student_progress")
        .select("student_id, completed")
        .in("student_id", ids)
        .eq("completed", true);
      const counts: Record<string, number> = {};
      (prog ?? []).forEach((p: any) => {
        counts[p.student_id] = (counts[p.student_id] ?? 0) + 1;
      });
      return [...students].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)).slice(0, 5);
    },
    enabled: students.length > 0,
  });
  const list = ranked ?? students.slice(0, 5);
  return (
    <div className="divide-y">
      {list.map((s: any) => (
        <StudentProgressRow key={s.id} s={s} />
      ))}
    </div>
  );
}
