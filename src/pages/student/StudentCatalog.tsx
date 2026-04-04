import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Video, HelpCircle, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentCatalog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: student } = useQuery({
    queryKey: ["my-student", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, campus_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Courses assigned to this student's campus
  const { data: campusCourses } = useQuery({
    queryKey: ["campus-courses", student?.campus_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_campuses")
        .select("courses(*, modules(id, type))")
        .eq("campus_id", student!.campus_id!);
      if (error) throw error;
      return data?.map((cc: any) => cc.courses).filter(Boolean) ?? [];
    },
    enabled: !!student?.campus_id,
  });

  const { data: myEnrollments } = useQuery({
    queryKey: ["my-enrollments", student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, status")
        .eq("student_id", student!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!student,
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("enrollments").insert({
        student_id: student!.id,
        course_id: courseId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrollment request submitted!");
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to enroll");
    },
  });

  const getEnrollmentStatus = (courseId: string) => {
    return myEnrollments?.find((e) => e.course_id === courseId)?.status ?? null;
  };

  const publishedCourses = (campusCourses ?? []).filter((c: any) => c.status === "Published");
  const filtered = publishedCourses.filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Courses available at your campus
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!filtered.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No courses available at your campus yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course: any) => {
            const status = getEnrollmentStatus(course.id);
            const videoCount = course.modules?.filter((m: any) => m.type === "video").length ?? 0;
            const quizCount = course.modules?.filter((m: any) => m.type === "quiz").length ?? 0;
            const assignmentCount = course.modules?.filter((m: any) => m.type === "assignment").length ?? 0;

            return (
              <Card key={course.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                  {course.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {videoCount} Videos</span>
                    <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {quizCount} Quizzes</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {assignmentCount}</span>
                  </div>

                  {status === "Approved" ? (
                    <Link to={`/student/course/${course.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> View Course
                      </Button>
                    </Link>
                  ) : status === "Pending" ? (
                    <Badge variant="secondary" className="w-fit">Pending Approval</Badge>
                  ) : status === "Rejected" ? (
                    <Badge variant="destructive" className="w-fit">Rejected</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => enrollMutation.mutate(course.id)}
                      disabled={enrollMutation.isPending}
                    >
                      Enroll Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
