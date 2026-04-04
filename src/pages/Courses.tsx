import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Video, HelpCircle, FileText, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function Courses() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["courses-with-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_campuses(campuses(id, name, city)), modules(id, type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("course_id, progress");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course deleted");
      queryClient.invalidateQueries({ queryKey: ["courses-with-details"] });
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "Published" ? "Draft" : "Published";
      const { error } = await supabase.from("courses").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses-with-details"] });
    },
  });

  const enriched = (courses ?? []).map((c) => {
    const courseEnrollments = enrollments?.filter((e) => e.course_id === c.id) ?? [];
    const avgProgress = courseEnrollments.length > 0
      ? Math.round(courseEnrollments.reduce((s, e) => s + e.progress, 0) / courseEnrollments.length)
      : 0;
    const campusNames = (c.course_campuses as any[])?.map((cc: any) => cc.campuses?.city).filter(Boolean) ?? [];
    const mods = (c.modules as any[]) ?? [];
    return {
      ...c,
      studentCount: courseEnrollments.length,
      avgProgress,
      campusNames,
      moduleCount: mods.length,
      videoCount: mods.filter((m: any) => m.type === "video").length,
      quizCount: mods.filter((m: any) => m.type === "quiz").length,
      assignmentCount: mods.filter((m: any) => m.type === "assignment").length,
    };
  });

  const filtered = enriched.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your course catalog</p>
        </div>
        <Button onClick={() => navigate("/courses/create")}>
          <Plus className="h-4 w-4 mr-2" /> Create Course
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No courses yet. Create your first course to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <Card key={course.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    <Badge variant={course.status === "Published" ? "default" : "secondary"} className="text-[11px]">{course.status}</Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/courses/edit/${course.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePublish.mutate({ id: course.id, status: course.status })}>
                        {course.status === "Published" ? "Unpublish" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(course.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{course.moduleCount} modules</span>
                  <span>{course.studentCount} students</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {course.videoCount} Videos</span>
                  <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {course.quizCount} Quizzes</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {course.assignmentCount} Assignments</span>
                </div>
                {course.studentCount > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Avg. Progress</span>
                      <span className="font-medium">{course.avgProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${course.avgProgress}%` }} />
                    </div>
                  </div>
                )}
                {course.campusNames.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {course.campusNames.map((c: string) => (
                      <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
