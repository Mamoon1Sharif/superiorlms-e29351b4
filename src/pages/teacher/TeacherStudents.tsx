import { useState, Fragment } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, BookOpen, ClipboardCheck, FileText } from "lucide-react";

function StudentDetailRow({ student, courses }: { student: any; courses: any[] }) {
  const { data: progress } = useQuery({
    queryKey: ["student-detail-progress", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_progress")
        .select("*, modules(title, type, course_id, courses(title))")
        .eq("student_id", student.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: quizAttempts } = useQuery({
    queryKey: ["student-detail-quiz", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, modules(title, course_id, courses(title))")
        .eq("student_id", student.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["student-detail-submissions", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*, assignment_details(module_id, modules(title, course_id, courses(title)))")
        .eq("student_id", student.id);
      if (error) throw error;
      return data;
    },
  });

  const enrolledCourses = courses.filter((c) => c.student_id === student.id);

  return (
    <tr className="bg-muted/20">
      <td colSpan={4} className="py-4 px-4">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Courses Enrolled
              </div>
              <div className="text-xl font-semibold mt-1">{enrolledCourses.length}</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardCheck className="h-3.5 w-3.5" /> Quiz Attempts
              </div>
              <div className="text-xl font-semibold mt-1">{quizAttempts?.length ?? 0}</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Submissions
              </div>
              <div className="text-xl font-semibold mt-1">{submissions?.length ?? 0}</div>
            </div>
          </div>

          {enrolledCourses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course Progress</p>
              {enrolledCourses.map((c: any) => (
                <div key={c.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{c.courses?.title}</span>
                    <span className="text-xs text-muted-foreground">{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} className="h-1.5" />
                </div>
              ))}
            </div>
          )}

          {quizAttempts && quizAttempts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quiz Results</p>
              <div className="space-y-1">
                {quizAttempts.map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between text-sm rounded border bg-background px-3 py-2">
                    <span className="text-muted-foreground">{q.modules?.courses?.title} · {q.modules?.title}</span>
                    <Badge variant="secondary" className="text-[11px]">{q.score}/{q.max_score}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submissions && submissions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assignments</p>
              <div className="space-y-1">
                {submissions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm rounded border bg-background px-3 py-2">
                    <span className="text-muted-foreground">
                      {s.assignment_details?.modules?.courses?.title} · {s.assignment_details?.modules?.title}
                    </span>
                    <Badge variant={s.graded ? "default" : "outline"} className="text-[11px]">
                      {s.graded ? `${s.grade ?? 0} marks` : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!progress || progress.length === 0) && enrolledCourses.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No activity yet for this student.</p>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function TeacherStudents() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data: teacher } = useQuery({
    queryKey: ["my-teacher-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: classAssignments } = useQuery({
    queryKey: ["my-class-assignments", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name, campus_id, campuses(name))")
        .eq("teacher_id", teacher!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  const assignedClassIds = classAssignments?.map((a: any) => a.class_id) ?? [];
  const assignedCampusIds = [...new Set(classAssignments?.map((a: any) => a.classes?.campus_id).filter(Boolean) ?? [])];

  const { data: students } = useQuery({
    queryKey: ["my-students", assignedClassIds, assignedCampusIds],
    queryFn: async () => {
      let query = supabase.from("students").select("*, classes(name), campuses(name)");
      if (assignedClassIds.length > 0 && assignedCampusIds.length > 0) {
        query = query.or(`class_id.in.(${assignedClassIds.join(",")}),and(class_id.is.null,campus_id.in.(${assignedCampusIds.join(",")}))`);
      } else if (assignedClassIds.length > 0) {
        query = query.in("class_id", assignedClassIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: assignedClassIds.length > 0,
  });

  const studentIds = students?.map((s) => s.id) ?? [];

  const { data: enrollments } = useQuery({
    queryKey: ["my-students-enrollments", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
        .in("student_id", studentIds);
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0,
  });

  const getOverallProgress = (studentId: string) => {
    const items = enrollments?.filter((e) => e.student_id === studentId && e.status === "Approved") ?? [];
    if (items.length === 0) return 0;
    return Math.round(items.reduce((s, e) => s + (e.progress || 0), 0) / items.length);
  };

  if (!classAssignments || classAssignments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No classes assigned yet</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
        <p className="text-muted-foreground text-sm mt-1">Click a student to view their detailed progress</p>
      </div>
      <Tabs defaultValue={assignedClassIds[0]}>
        <TabsList className="flex-wrap h-auto">
          {classAssignments?.map((a: any) => (
            <TabsTrigger key={a.class_id} value={a.class_id} className="text-xs">
              {a.classes?.campuses?.name} · {a.classes?.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {classAssignments?.map((a: any) => {
          const classStudents = students?.filter(
            (s) => s.class_id === a.class_id || (s.class_id === null && s.campus_id === a.classes?.campus_id)
          ) ?? [];
          return (
            <TabsContent key={a.class_id} value={a.class_id} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-8"></th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Avg Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No students in this class</td></tr>
                      ) : classStudents.map((s) => {
                        const isOpen = expanded.has(s.id);
                        const overall = getOverallProgress(s.id);
                        return (
                          <Fragment key={s.id}>
                            <tr
                              className="border-b hover:bg-muted/30 cursor-pointer"
                              onClick={() => toggle(s.id)}
                            >
                              <td className="py-3 px-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </Button>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {s.name.split(" ").map((n: string) => n[0]).join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{s.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{s.email}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2 max-w-[200px]">
                                  <Progress value={overall} className="h-1.5 flex-1" />
                                  <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{overall}%</span>
                                </div>
                              </td>
                            </tr>
                            {isOpen && (
                              <StudentDetailRow
                                student={s}
                                courses={(enrollments ?? []).map((e) => ({ ...e, id: e.id }))}
                              />
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
