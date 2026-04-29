import { supabase } from "@/integrations/supabase/client";

export interface CourseCompletion {
  courseId: string;
  totalItems: number;
  completedItems: number;
  isComplete: boolean;
}

/**
 * Computes per-course completion for a student across the given course IDs.
 * A course is "complete" when all its content items (videos, quizzes, assignments)
 * are marked completed in student_progress.
 */
export async function getCourseCompletions(
  studentId: string,
  courseIds: string[]
): Promise<Record<string, CourseCompletion>> {
  const result: Record<string, CourseCompletion> = {};
  if (!courseIds.length) return result;

  const { data: modules } = await supabase
    .from("modules")
    .select("id, course_id")
    .in("course_id", courseIds);

  const moduleIds = (modules ?? []).map((m: any) => m.id);
  const moduleToCourse = new Map<string, string>();
  (modules ?? []).forEach((m: any) => moduleToCourse.set(m.id, m.course_id));

  // Initialize counters
  for (const cid of courseIds) {
    result[cid] = { courseId: cid, totalItems: 0, completedItems: 0, isComplete: false };
  }

  if (!moduleIds.length) {
    // Courses with no modules can't be "completed" for unlocking purposes
    for (const cid of courseIds) result[cid].isComplete = false;
    return result;
  }

  const [{ data: lessons }, { data: questions }, { data: assignments }, { data: progress }] = await Promise.all([
    supabase.from("lessons").select("id, module_id").in("module_id", moduleIds),
    supabase.from("quiz_questions").select("module_id").in("module_id", moduleIds),
    supabase.from("assignment_details").select("id, module_id").in("module_id", moduleIds),
    supabase.from("student_progress").select("item_id, module_id, completed").eq("student_id", studentId).in("module_id", moduleIds),
  ]);

  // Build valid item ids per course
  const courseValidItems = new Map<string, Set<string>>();
  const ensure = (cid: string) => {
    if (!courseValidItems.has(cid)) courseValidItems.set(cid, new Set());
    return courseValidItems.get(cid)!;
  };

  (lessons ?? []).forEach((l: any) => {
    const cid = moduleToCourse.get(l.module_id);
    if (cid) ensure(cid).add(l.id);
  });
  (assignments ?? []).forEach((a: any) => {
    const cid = moduleToCourse.get(a.module_id);
    if (cid) ensure(cid).add(a.id);
  });
  // Each module with quiz questions counts as one "quiz item" keyed by module_id
  const moduleHasQuiz = new Set<string>();
  (questions ?? []).forEach((q: any) => moduleHasQuiz.add(q.module_id));
  moduleHasQuiz.forEach((mid) => {
    const cid = moduleToCourse.get(mid);
    if (cid) ensure(cid).add(mid); // quiz item id == module id
  });

  // Completed items keyed by course
  const courseCompleted = new Map<string, Set<string>>();
  (progress ?? []).forEach((p: any) => {
    if (!p.completed) return;
    const cid = moduleToCourse.get(p.module_id);
    if (!cid) return;
    if (!courseCompleted.has(cid)) courseCompleted.set(cid, new Set());
    const valid = courseValidItems.get(cid);
    if (valid?.has(p.item_id)) courseCompleted.get(cid)!.add(p.item_id);
  });

  for (const cid of courseIds) {
    const total = courseValidItems.get(cid)?.size ?? 0;
    const completed = courseCompleted.get(cid)?.size ?? 0;
    result[cid] = {
      courseId: cid,
      totalItems: total,
      completedItems: completed,
      isComplete: total > 0 && completed >= total,
    };
  }
  return result;
}
