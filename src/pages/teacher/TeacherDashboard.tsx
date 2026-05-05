import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TeacherDashboard() {
  const { user } = useAuth();

  const { data: teacher } = useQuery({
    queryKey: ["my-teacher-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*, campuses(name)").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: classAssignments } = useQuery({
    queryKey: ["my-class-assignments-dash", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name, campus_id, campuses(name)), sections(name)")
        .eq("teacher_id", teacher!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  const assignedClassIds = Array.from(new Set((classAssignments ?? []).map((a: any) => a.class_id)));

  const { data: students } = useQuery({
    queryKey: ["my-students-dash", assignedClassIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, class_id, section_id")
        .in("class_id", assignedClassIds);
      if (error) throw error;
      return data;
    },
    enabled: assignedClassIds.length > 0,
  });

  const studentIds = (students ?? []).map((s: any) => s.id);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["my-pending-grading", studentIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("assignment_submissions")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("graded", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: studentIds.length > 0,
  });

  // Compute per-student overall progress in a single batch
  const { data: ranked } = useQuery({
    queryKey: ["teacher-students-ranked", studentIds],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id").eq("status", "Published");
      const courseIds = (courses ?? []).map((c: any) => c.id);
      if (!courseIds.length) return [];

      const { data: mods } = await supabase.from("modules").select("id").in("course_id", courseIds);
      const moduleIds = (mods ?? []).map((m: any) => m.id);
      if (!moduleIds.length) return [];

      const [{ data: lessons }, { data: quizQs }, { data: assignmentsData }, { data: prog }] = await Promise.all([
        supabase.from("lessons").select("id, module_id").in("module_id", moduleIds),
        supabase.from("quiz_questions").select("module_id").in("module_id", moduleIds),
        supabase.from("assignment_details").select("id, module_id").in("module_id", moduleIds),
        supabase
          .from("student_progress")
          .select("student_id, item_id, completed")
          .in("student_id", studentIds)
          .in("module_id", moduleIds),
      ]);

      const valid = new Set<string>();
      (lessons ?? []).forEach((l: any) => valid.add(l.id));
      (assignmentsData ?? []).forEach((a: any) => valid.add(a.id));
      const quizModules = new Set((quizQs ?? []).map((q: any) => q.module_id));
      quizModules.forEach((id) => valid.add(id as string));
      const total = valid.size;

      const perStudent: Record<string, Set<string>> = {};
      (prog ?? []).forEach((p: any) => {
        if (!p.completed || !valid.has(p.item_id)) return;
        (perStudent[p.student_id] = perStudent[p.student_id] || new Set()).add(p.item_id);
      });

      return (students ?? []).map((s: any) => ({
        ...s,
        progress: total ? Math.min(100, Math.round(((perStudent[s.id]?.size ?? 0) * 100) / total)) : 0,
      }));
    },
    enabled: studentIds.length > 0,
  });

  // Class & section name lookups
  const classNameById: Record<string, string> = {};
  (classAssignments ?? []).forEach((a: any) => { if (a.classes) classNameById[a.class_id] = a.classes.name; });
  const sectionIds = Array.from(new Set((students ?? []).map((s: any) => s.section_id).filter(Boolean)));
  const { data: sectionsData } = useQuery({
    queryKey: ["teacher-section-names", sectionIds],
    queryFn: async () => {
      const { data } = await supabase.from("sections").select("id, name").in("id", sectionIds);
      return data ?? [];
    },
    enabled: sectionIds.length > 0,
  });
  const sectionNameById: Record<string, string> = {};
  (sectionsData ?? []).forEach((s: any) => { sectionNameById[s.id] = s.name; });

  const sortedAsc = [...(ranked ?? [])].sort((a, b) => a.progress - b.progress);
  const top = [...(ranked ?? [])].sort((a, b) => b.progress - a.progress).slice(0, 5);
  const worst = sortedAsc.slice(0, 5);

  const campusName = (teacher as any)?.campuses?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Teacher Dashboard{campusName ? ` · ${campusName}` : ""}
        </h1>
        <p className="text-muted-foreground">Welcome back, {teacher?.name ?? user?.email}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Classes (Sections)</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classAssignments?.length ?? 0}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {classAssignments?.map((a: any) => (
                <Badge key={a.id} variant="outline" className="text-[10px]">
                  {a.classes?.name} ({a.sections?.name ?? "All Sections"})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PerformanceCard
          title="Top Performing Students"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
          rows={top}
          classNameById={classNameById}
          sectionNameById={sectionNameById}
          empty="No student activity yet"
        />
        <PerformanceCard
          title="Needs Attention"
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          rows={worst}
          classNameById={classNameById}
          sectionNameById={sectionNameById}
          empty="No student activity yet"
        />
      </div>
    </div>
  );
}

function PerformanceCard({
  title, icon, rows, classNameById, sectionNameById, empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: any[];
  classNameById: Record<string, string>;
  sectionNameById: Record<string, string>;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{empty}</p>
        ) : rows.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(s.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <span className="text-xs text-muted-foreground tabular-nums">{s.progress}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {classNameById[s.class_id] ?? "—"} · {s.section_id ? (sectionNameById[s.section_id] ?? "—") : "—"}
              </p>
              <Progress value={s.progress} className="h-1.5 mt-1" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
