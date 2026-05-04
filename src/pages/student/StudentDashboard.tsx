import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle2, ImageIcon, Award, AlertCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getCourseCompletions } from "@/lib/courseProgress";
import digitalSkillProgram from "@/assets/digital-skill-program.jpeg";

const PROGRAM_ID = "00000000-0000-0000-0000-000000000001";

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: student, refetch: refetchStudent } = useQuery({
    queryKey: ["my-student", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, campuses(name, city)")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: programEnrollment, refetch: refetchProgram } = useQuery({
    queryKey: ["my-program", student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_enrollments")
        .select("*")
        .eq("student_id", student!.id)
        .eq("program_id", PROGRAM_ID)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!student,
  });

  // Show all courses available for this campus once approved (ordered by sequence)
  const { data: campusCourses } = useQuery({
    queryKey: ["campus-courses-dashboard", student?.campus_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_campuses")
        .select("courses(*)")
        .eq("campus_id", student!.campus_id!);
      if (error) throw error;
      const list = (data?.map((cc: any) => cc.courses).filter(Boolean) ?? []).filter((c: any) => c.status === "Published");
      return list.sort((a: any, b: any) => (a.sequence ?? 9999) - (b.sequence ?? 9999));
    },
    enabled: !!student?.campus_id && programEnrollment?.status === "Approved" && student?.approval_status === "Approved",
  });

  const { data: completions } = useQuery({
    queryKey: ["course-completions", student?.id, campusCourses?.map((c: any) => c.id).join(",")],
    queryFn: async () => getCourseCompletions(student!.id, (campusCourses ?? []).map((c: any) => c.id)),
    enabled: !!student && !!campusCourses?.length,
  });

  const applyToProgram = async () => {
    if (!student) return;
    const { error } = await supabase.from("program_enrollments").insert({
      student_id: student.id,
      program_id: PROGRAM_ID,
      status: "Pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted");
    refetchProgram();
  };

  const studentApproved = student?.approval_status === "Approved";
  const programApproved = programEnrollment?.status === "Approved";
  const fullyApproved = studentApproved && programApproved;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {student?.name ?? "Student"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {(student?.campuses as any)?.name} — {(student?.campuses as any)?.city}
          {student?.reg_no && <span> · Reg: {student.reg_no}</span>}
        </p>
      </div>

      {/* Program enrollment card */}
      <Card className="overflow-hidden">
        <div className={`grid grid-cols-1 ${fullyApproved ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
          {/* Left: text content */}
          <div className={`p-6 flex flex-col gap-4 order-2 md:order-1 ${fullyApproved ? "" : "md:col-span-1"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Digital Skill Certification</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">A single program covering all available courses</p>
                </div>
              </div>
              {programEnrollment && (
                <Badge variant={programApproved ? "default" : programEnrollment.status === "Rejected" ? "destructive" : "secondary"}>
                  {programEnrollment.status}
                </Badge>
              )}
            </div>

            {!programEnrollment ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Apply once to get access to every course in the program.</p>
                <Button onClick={applyToProgram}>Apply Now</Button>
              </div>
            ) : !studentApproved ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Waiting for campus admin approval</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your principal will approve your account shortly. You'll then get access to all courses.</p>
                </div>
              </div>
            ) : programEnrollment.status === "Rejected" ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm">Your program enrollment was rejected. Please contact your campus admin.</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <p className="text-sm font-medium">You're enrolled. All published courses below are available to you.</p>
              </div>
            )}
          </div>

          {/* Right: image */}
          <div className={`bg-[#0b1f4a] flex items-center justify-center p-4 order-1 md:order-2 ${fullyApproved ? "" : "md:col-span-3"}`}>
            <img
              src={digitalSkillProgram}
              alt="Digital Skill Certification — 8 in-demand skills"
              className={`w-full h-auto object-contain ${fullyApproved ? "max-h-[320px]" : "max-h-[560px]"}`}
            />
          </div>
        </div>
      </Card>

      {fullyApproved && (
        <div>
          <h2 className="text-lg font-semibold mb-3">My Courses</h2>
          {!campusCourses?.length ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No courses available at your campus yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {campusCourses.map((course: any, idx: number) => {
                const cover = course.cover_url;
                // Locked unless previous course (by sequence) is fully complete
                const prev = idx > 0 ? campusCourses[idx - 1] : null;
                const prevDone = !prev || (completions?.[prev.id]?.isComplete ?? false);
                const locked = !prevDone;
                const done = completions?.[course.id]?.isComplete ?? false;
                const seq = course.sequence ?? idx + 1;

                const inner = (
                  <Card className={`group transition-shadow overflow-hidden flex flex-col h-full ${locked ? "opacity-60" : "hover:shadow-md cursor-pointer"}`}>
                    <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                      {cover ? (
                        <img src={cover} alt="" className={`w-full h-full object-cover ${!locked && "group-hover:scale-105 transition-transform duration-300"}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <Badge variant="secondary" className="absolute top-2 left-2 text-[11px] shadow">Course {seq}</Badge>
                      {locked && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {done && !locked && (
                        <Badge className="absolute top-2 right-2 text-[11px] shadow bg-success text-success-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Badge>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {locked ? (
                        <p className="text-xs text-muted-foreground">Complete Course {seq - 1} to unlock</p>
                      ) : (
                        <p className="text-xs text-primary font-medium">{done ? "Review course →" : "Open course →"}</p>
                      )}
                    </CardContent>
                  </Card>
                );

                return locked ? (
                  <div key={course.id} onClick={() => toast.info(`Complete Course ${seq - 1} to unlock this course`)}>
                    {inner}
                  </div>
                ) : (
                  <Link to={`/student/course/${course.id}`} key={course.id}>{inner}</Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
