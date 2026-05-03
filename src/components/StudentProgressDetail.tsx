import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardList, FileText } from "lucide-react";

interface Props {
  studentId: string;
}

/**
 * Shared student progress view. Computes per-course completion the same way
 * across roles (admin, campus admin, teacher) so the percentages match.
 */
export function StudentProgressDetail({ studentId }: Props) {
  const { data: courseProgress, isLoading } = useQuery({
    queryKey: ["student-progress-detail", studentId],
    queryFn: async () => {
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
        .eq("student_id", studentId);

      const { data: quizzes } = await supabase
        .from("quiz_attempts")
        .select("module_id, score, max_score, created_at")
        .eq("student_id", studentId);

      const allAssignmentIds = (assignmentsData ?? []).map((a: any) => a.id);
      const { data: submissions } = allAssignmentIds.length
        ? await supabase
            .from("assignment_submissions")
            .select("assignment_id, grade, graded, created_at")
            .eq("student_id", studentId)
            .in("assignment_id", allAssignmentIds)
        : { data: [] as any[] };

      const modsByCourse: Record<string, any[]> = {};
      (allMods ?? []).forEach((m) => {
        modsByCourse[m.course_id] = modsByCourse[m.course_id] || [];
        modsByCourse[m.course_id].push(m);
      });

      const lessonsByModule: Record<string, string[]> = {};
      (lessons ?? []).forEach((l: any) => {
        (lessonsByModule[l.module_id] = lessonsByModule[l.module_id] || []).push(l.id);
      });
      const modulesWithQuiz = new Set((quizQs ?? []).map((q: any) => q.module_id));
      const assignmentsByModule: Record<string, string[]> = {};
      (assignmentsData ?? []).forEach((a: any) => {
        (assignmentsByModule[a.module_id] = assignmentsByModule[a.module_id] || []).push(a.id);
      });

      return courses.map((c) => {
        const mods = modsByCourse[c.id] ?? [];
        const moduleIds = mods.map((m) => m.id);
        const courseProg = (prog ?? []).filter((p) => moduleIds.includes(p.module_id));
        const courseQuizzes = (quizzes ?? []).filter((q) => moduleIds.includes(q.module_id));

        let totalItems = 0;
        const validItemIds = new Set<string>();
        for (const m of mods) {
          const lIds = lessonsByModule[m.id] ?? [];
          totalItems += lIds.length;
          lIds.forEach((id) => validItemIds.add(id));
          if (modulesWithQuiz.has(m.id)) {
            totalItems += 1;
            validItemIds.add(m.id);
          }
          const aIds = assignmentsByModule[m.id] ?? [];
          totalItems += aIds.length;
          aIds.forEach((id) => validItemIds.add(id));
        }

        const completedItemIds = new Set(
          courseProg.filter((p) => p.completed && validItemIds.has(p.item_id)).map((p) => p.item_id),
        );
        const completedCount = completedItemIds.size;
        const percent = totalItems ? Math.min(100, Math.round((completedCount * 100) / totalItems)) : 0;

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
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading progress…</p>;
  }

  if (!courseProgress?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          No course activity yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {courseProgress.map((c) => (
        <Card key={c.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> {c.title}
              </CardTitle>
              <span className="text-sm font-medium text-muted-foreground">
                {c.completedCount}/{c.totalCount} · {c.progress}%
              </span>
            </div>
            <Progress value={c.progress} className="h-1.5 mt-2" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 pt-0">
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Quiz Results
              </p>
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
              ) : (
                <p className="text-xs text-muted-foreground">No attempts</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Assignments
              </p>
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
              ) : (
                <p className="text-xs text-muted-foreground">No assignments</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Lessons Completed
              </p>
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
  );
}

/** Compute single overall percent across published courses for a student. */
export function useStudentOverallProgress(studentId: string) {
  return useQuery({
    queryKey: ["student-overall-progress", studentId],
    queryFn: async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("status", "Published");
      const courseIds = (courses ?? []).map((c) => c.id);
      if (!courseIds.length) return 0;

      const { data: allMods } = await supabase
        .from("modules")
        .select("id, course_id")
        .in("course_id", courseIds);
      const moduleIds = (allMods ?? []).map((m) => m.id);
      if (!moduleIds.length) return 0;

      const [{ data: lessons }, { data: quizQs }, { data: assignmentsData }, { data: prog }] = await Promise.all([
        supabase.from("lessons").select("id, module_id").in("module_id", moduleIds),
        supabase.from("quiz_questions").select("module_id").in("module_id", moduleIds),
        supabase.from("assignment_details").select("id, module_id").in("module_id", moduleIds),
        supabase
          .from("student_progress")
          .select("item_id, completed")
          .eq("student_id", studentId)
          .in("module_id", moduleIds),
      ]);

      const valid = new Set<string>();
      (lessons ?? []).forEach((l: any) => valid.add(l.id));
      (assignmentsData ?? []).forEach((a: any) => valid.add(a.id));
      const quizModules = new Set((quizQs ?? []).map((q: any) => q.module_id));
      quizModules.forEach((id) => valid.add(id as string));

      const total = valid.size;
      if (!total) return 0;

      const completed = new Set(
        (prog ?? []).filter((p: any) => p.completed && valid.has(p.item_id)).map((p: any) => p.item_id),
      );
      return Math.min(100, Math.round((completed.size * 100) / total));
    },
    enabled: !!studentId,
  });
}
