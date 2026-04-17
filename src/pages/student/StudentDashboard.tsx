import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle2, ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: student } = useQuery({
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

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title, description, status, cover_url)")
        .eq("student_id", student!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!student,
  });

  const approvedCount = enrollments?.filter((e) => e.status === "Approved").length ?? 0;
  const pendingCount = enrollments?.filter((e) => e.status === "Pending").length ?? 0;
  const avgProgress = enrollments?.filter((e) => e.status === "Approved").length
    ? Math.round(
        enrollments.filter((e) => e.status === "Approved").reduce((s, e) => s + e.progress, 0) /
          enrollments.filter((e) => e.status === "Approved").length
      )
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {student?.name ?? "Student"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {(student?.campuses as any)?.name} — {(student?.campuses as any)?.city}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Active Courses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgProgress}%</p>
              <p className="text-xs text-muted-foreground">Avg. Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">My Courses</h2>
        {!enrollments?.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">You haven't enrolled in any courses yet.</p>
              <Link to="/student/catalog" className="text-primary text-sm font-medium hover:underline mt-1 inline-block">
                Browse available courses →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => {
              const cover = (enrollment.courses as any)?.cover_url;
              return (
              <Card key={enrollment.id} className="group hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col" onClick={() => enrollment.status === "Approved" ? window.location.href = `/student/course/${enrollment.course_id}` : undefined}>
                <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <Badge
                    variant={enrollment.status === "Approved" ? "default" : enrollment.status === "Pending" ? "secondary" : "destructive"}
                    className="absolute top-2 right-2 text-[11px] shadow"
                  >
                    {enrollment.status}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">
                    {(enrollment.courses as any)?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollment.status === "Approved" && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{enrollment.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${enrollment.progress}%` }} />
                      </div>
                      <Link to={`/student/course/${enrollment.course_id}`} className="text-primary text-xs font-medium hover:underline mt-2 inline-block">
                        Continue Learning →
                      </Link>
                    </div>
                  )}
                  {enrollment.status === "Pending" && (
                    <p className="text-xs text-muted-foreground">Awaiting admin approval</p>
                  )}
                  {enrollment.status === "Rejected" && (
                    <p className="text-xs text-destructive">Enrollment was rejected</p>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
