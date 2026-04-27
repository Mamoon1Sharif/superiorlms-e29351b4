import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, ClipboardList, FileText } from "lucide-react";

export default function CampusAdminStudentDetail() {
  const { id: studentId } = useParams();

  const { data: student } = useQuery({
    queryKey: ["ca-student", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name), campuses(name)")
        .eq("id", studentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  const { data: courseProgress } = useQuery({
    queryKey: ["ca-student-course-progress", studentId],
    queryFn: async () => {
      // Show all published courses in the program
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, status")
        .eq("status", "Published");
      if (!courses?.length) return [];

      const courseIds = courses.map((c) => c.id);
      const { data: allMods } = await supabase
        .from("modules")
        .select("id, course_id, title, type")
        .in("course_id", courseIds);

      const moduleIdsAll = (allMods ?? []).map((m) => m.id);

      // Count actual content items per module: lessons + quizzes (1 per module if any) + assignments
      const [{ data: lessons }, { data: quizQs }, { data: assignmentsData }] = await Promise.all([
        moduleIdsAll.length
          ? supabase.from("lessons").select("id, module_id").in("module_id", moduleIdsAll)
          : Promise.resolve({ data: [] as any[] }),
        moduleIdsAll.length
          ? supabase.from("quiz_questions").select("module_id").in("module_id", moduleIdsAll)
          : Promise.resolve({ data: [] as any[] }),
        moduleIdsAll.length
          ? supabase.from("assignment_details").select("id, module_id").in("module_id", moduleIdsAll)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const { data: prog } = await supabase
        .from("student_progress")
        .select("module_id, item_id, item_type, completed, score")
        .eq("student_id", studentId!);

      const { data: quizzes } = await supabase
        .from("quiz_attempts")
        .select("module_id, score, max_score, created_at")
        .eq("student_id", studentId!);

      const allAssignmentIds = (assignmentsData ?? []).map((a: any) => a.id);
      const { data: submissions } = allAssignmentIds.length
        ? await supabase
            .from("assignment_submissions")
            .select("assignment_id, grade, graded, created_at")
            .eq("student_id", studentId!)
            .in("assignment_id", allAssignmentIds)
        : { data: [] as any[] };

      const modsByCourse: Record<string, any[]> = {};
      (allMods ?? []).forEach((m) => {
        modsByCourse[m.course_id] = modsByCourse[m.course_id] || [];
        modsByCourse[m.course_id].push(m);
      });

      // Build the set of expected content item IDs per module
      const lessonsByModule: Record<string, string[]> = {};
      (lessons ?? []).forEach((l: any) => {
        (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] || []).push(l.id);
      });
      const modulesWithQuiz = new Set((quizQs ?? []).map((q: any) => q.module_id));
      const assignmentsByModule: Record<string, string[]> = {};
      (assignmentsData ?? []).forEach((a: any) => {
        (assignmentsByModule[a.module_id] = assignmentsByModule[a.module_id] || []).push(a.id);
      });

      const result = courses.map((c) => {
        const mods = modsByCourse[c.id] ?? [];
        const moduleIds = mods.map((m) => m.id);
        const courseProg = (prog ?? []).filter((p) => moduleIds.includes(p.module_id));
        const courseQuizzes = (quizzes ?? []).filter((q) => moduleIds.includes(q.module_id));

        // Total content items = lessons + (1 per module that has quiz questions) + assignments
        let totalItems = 0;
        const validItemIds = new Set<string>();
        for (const m of mods) {
          const lIds = lessonsByModule[m.id] ?? [];
          totalItems += lIds.length;
          lIds.forEach((id) => validItemIds.add(id));
          if (modulesWithQuiz.has(m.id)) {
            totalItems += 1;
            // quiz item_id stored as module id by student view
            validItemIds.add(m.id);
          }
          const aIds = assignmentsByModule[m.id] ?? [];
          totalItems += aIds.length;
          aIds.forEach((id) => validItemIds.add(id));
        }

        // Dedupe completed items by item_id, only counting valid items
        const completedItemIds = new Set(
          courseProg
            .filter((p) => p.completed && validItemIds.has(p.item_id))
            .map((p) => p.item_id)
        );
        const completedCount = completedItemIds.size;
        const percent = totalItems
          ? Math.min(100, Math.round((completedCount * 100) / totalItems))
          : 0;

        // Build assignment list for this course with submission status
        const courseAssignments: any[] = [];
        for (const m of mods) {
          const aIds = assignmentsByModule[m.id] ?? [];
          for (const aId of aIds) {
            const sub = (submissions ?? []).find((s: any) => s.assignment_id === aId);
            courseAssignments.push({
              assignment_id: aId,
              module_title: m.title,
              submitted: !!sub,
              graded: sub?.graded ?? false,
              grade: sub?.grade ?? null,
            });
          }
        }

        return {
          id: c.id,
          title: c.title,
          modules: mods,
          progress: percent,
          quizzes: courseQuizzes,
          assignments: courseAssignments,
          studentProgress: courseProg,
          completedCount,
          totalCount: totalItems,
        };
      });

      return result;
    },
    enabled: !!studentId,
  });

  if (!student) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/campus-admin/students"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{student.email}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
              {student.reg_no && <span>Reg: {student.reg_no}</span>}
              {student.classes?.name && <span>· {student.classes.name}</span>}
              {student.campuses?.name && <span>· {student.campuses.name}</span>}
              {student.phone && <span>· {student.phone}</span>}
            </div>
          </div>
          <Badge
            variant={student.approval_status === "Approved" ? "default" : student.approval_status === "Rejected" ? "destructive" : "secondary"}
          >
            {student.approval_status}
          </Badge>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Courses</h2>
        {!courseProgress?.length ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">No course activity yet</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {courseProgress.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" /> {c.title}
                    </CardTitle>
                    <span className="text-sm font-medium text-muted-foreground">{c.completedCount}/{c.totalCount} · {c.progress}%</span>
                  </div>
                  <Progress value={c.progress} className="h-1.5 mt-2" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3 pt-0">
                  <div>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Quiz Results</p>
                    {c.quizzes.length ? (
                      <ul className="space-y-1 text-xs">
                        {c.quizzes.map((q: any, i: number) => {
                          const mod = c.modules.find((m: any) => m.id === q.module_id);
                          return (
                            <li key={i} className="flex justify-between gap-2">
                              <span className="truncate text-muted-foreground">{mod?.title ?? "Quiz"}</span>
                              <span className="font-medium">{q.score}/{q.max_score}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : <p className="text-xs text-muted-foreground">No attempts</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Assignments</p>
                    {c.assignments.length ? (
                      <ul className="space-y-1 text-xs">
                        {c.assignments.map((a: any, i: number) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="truncate text-muted-foreground">{a.module_title}</span>
                            <span className="font-medium">
                              {!a.submitted ? (
                                <span className="text-muted-foreground">Not submitted</span>
                              ) : a.graded ? (
                                <span>Graded: {a.grade ?? 0}</span>
                              ) : (
                                <span>Submitted</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-muted-foreground">No assignments</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Lessons Completed</p>
                    {(() => {
                      const seen = new Set<string>();
                      const completed = c.studentProgress.filter((p: any) => {
                        if (!p.completed || p.item_type !== "video" || seen.has(p.item_id)) return false;
                        seen.add(p.item_id);
                        return true;
                      });
                      if (!completed.length) {
                        return <p className="text-xs text-muted-foreground">None yet</p>;
                      }
                      return (
                        <ul className="space-y-1 text-xs">
                          {completed.map((p: any, i: number) => {
                            const mod = c.modules.find((m: any) => m.id === p.module_id);
                            return (
                              <li key={i} className="flex justify-between gap-2">
                                <span className="truncate text-muted-foreground">{mod?.title ?? p.item_type}</span>
                                <span className="font-medium capitalize">{p.item_type}</span>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
