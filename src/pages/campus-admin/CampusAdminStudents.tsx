import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle, ChevronDown, ChevronRight, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function CampusAdminStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [regNoDraft, setRegNoDraft] = useState("");

  const { data: ca } = useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campus_admins").select("campus_id").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const campusId = ca?.campus_id;

  const { data: students } = useQuery({
    queryKey: ["ca-students", campusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const setApproval = async (studentId: string, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("students").update({
      approval_status: status,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq("id", studentId);
    if (error) { toast.error(error.message); return; }

    // Update program enrollment to match
    await supabase.from("program_enrollments")
      .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("student_id", studentId);

    toast.success(`Student ${status.toLowerCase()}`);
    queryClient.invalidateQueries({ queryKey: ["ca-students"] });
    queryClient.invalidateQueries({ queryKey: ["ca-pending-count"] });
    queryClient.invalidateQueries({ queryKey: ["ca-approved-count"] });
  };

  const saveRegNo = async (studentId: string) => {
    const { error } = await supabase.from("students").update({ reg_no: regNoDraft }).eq("id", studentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Reg number updated");
    setEditingRegId(null);
    queryClient.invalidateQueries({ queryKey: ["ca-students"] });
  };

  const filtered = (students ?? []).filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_no?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground text-sm mt-1">Approve registrations and view progress</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, reg no, email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10"></th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reg No</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <Fragment key={s.id}>
                    <tr className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-2 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(s.id)}>
                          {expanded.has(s.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4">
                        {editingRegId === s.id ? (
                          <div className="flex gap-1">
                            <Input value={regNoDraft} onChange={(e) => setRegNoDraft(e.target.value)} className="h-7 text-xs w-32" />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveRegNo(s.id)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{s.reg_no || "—"}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingRegId(s.id); setRegNoDraft(s.reg_no || ""); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.classes?.name ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{s.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={s.approval_status === "Approved" ? "default" : s.approval_status === "Rejected" ? "destructive" : "secondary"} className="text-[11px]">
                          {s.approval_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {s.approval_status === "Pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => setApproval(s.id, "Approved")}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setApproval(s.id, "Rejected")}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded.has(s.id) && (
                      <tr className="bg-muted/20">
                        <td colSpan={7} className="p-4">
                          <StudentProgress studentId={s.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentProgress({ studentId }: { studentId: string }) {
  const { data: enrollments } = useQuery({
    queryKey: ["ca-enrollments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", studentId);
      if (error) throw error;

      // Fallback: derive progress from student_progress when no enrollment rows
      if (!data || data.length === 0) {
        const { data: prog } = await supabase
          .from("student_progress")
          .select("module_id, completed")
          .eq("student_id", studentId);
        if (!prog?.length) return [];
        const moduleIds = Array.from(new Set(prog.map((p: any) => p.module_id)));
        const { data: mods } = await supabase.from("modules").select("id, course_id").in("id", moduleIds);
        const courseIds = Array.from(new Set((mods ?? []).map((m: any) => m.course_id)));
        const { data: courses } = await supabase.from("courses").select("id, title").in("id", courseIds);
        const { data: allMods } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
        const completedByCourse: Record<string, number> = {};
        const totalByCourse: Record<string, number> = {};
        (allMods ?? []).forEach((m: any) => { totalByCourse[m.course_id] = (totalByCourse[m.course_id] || 0) + 1; });
        (mods ?? []).forEach((m: any) => {
          const completed = prog.find((p: any) => p.module_id === m.id && p.completed);
          if (completed) completedByCourse[m.course_id] = (completedByCourse[m.course_id] || 0) + 1;
        });
        return (courses ?? []).map((c: any) => ({
          id: c.id,
          course_title: c.title,
          progress: totalByCourse[c.id] ? Math.round((completedByCourse[c.id] || 0) * 100 / totalByCourse[c.id]) : 0,
        }));
      }

      const ids = data.map((e: any) => e.course_id);
      const { data: courses } = await supabase.from("courses").select("id, title").in("id", ids);
      const cmap: Record<string, string> = {};
      (courses ?? []).forEach((c: any) => { cmap[c.id] = c.title; });
      return data.map((e: any) => ({ ...e, course_title: cmap[e.course_id] }));
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["ca-quizzes", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("score, max_score, module_id")
        .eq("student_id", studentId);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((q: any) => q.module_id)));
      if (!ids.length) return [];
      const { data: mods } = await supabase.from("modules").select("id, title").in("id", ids);
      const mmap: Record<string, string> = {};
      (mods ?? []).forEach((m: any) => { mmap[m.id] = m.title; });
      return (data ?? []).map((q: any) => ({ ...q, module_title: mmap[q.module_id] }));
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["ca-submissions", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("graded, grade")
        .eq("student_id", studentId);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold mb-2">Course Progress</p>
        {enrollments?.length ? (
          <div className="space-y-2">
            {enrollments.map((e: any) => (
              <div key={e.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="truncate">{e.course_title ?? "Course"}</span>
                  <span className="text-muted-foreground">{e.progress}%</span>
                </div>
                <Progress value={e.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">No enrollments</p>}
      </div>
      <div>
        <p className="text-xs font-semibold mb-2">Quiz Results</p>
        {quizzes?.length ? (
          <ul className="space-y-1 text-xs">
            {quizzes.map((q: any, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate">{q.module_title ?? "Quiz"}</span>
                <span className="font-medium">{q.score}/{q.max_score}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">No attempts</p>}
      </div>
      <div>
        <p className="text-xs font-semibold mb-2">Assignments</p>
        {subs?.length ? (
          <ul className="space-y-1 text-xs">
            {subs.map((s: any, i) => (
              <li key={i} className="flex justify-between">
                <span>Submission {i + 1}</span>
                <span className="text-muted-foreground">{s.graded ? `${s.grade ?? 0} pts` : "Pending"}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">No submissions</p>}
      </div>
    </div>
  );
}
