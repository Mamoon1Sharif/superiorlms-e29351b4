import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeacherStudents() {
  const { user } = useAuth();

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

  const { data: students } = useQuery({
    queryKey: ["my-students", assignedClassIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name), campuses(name)")
        .in("class_id", assignedClassIds);
      if (error) throw error;
      return data;
    },
    enabled: assignedClassIds.length > 0,
  });

  const { data: progress } = useQuery({
    queryKey: ["student-progress-all", assignedClassIds],
    queryFn: async () => {
      const studentIds = students?.map((s) => s.id) ?? [];
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase.from("student_progress").select("*").in("student_id", studentIds);
      if (error) throw error;
      return data;
    },
    enabled: (students?.length ?? 0) > 0,
  });

  const getStudentProgress = (studentId: string) => {
    const items = progress?.filter((p) => p.student_id === studentId) ?? [];
    const completed = items.filter((p) => p.completed).length;
    return { total: items.length, completed };
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
      <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
      <Tabs defaultValue={assignedClassIds[0]}>
        <TabsList>
          {classAssignments?.map((a: any) => (
            <TabsTrigger key={a.class_id} value={a.class_id} className="text-xs">
              {a.classes?.campuses?.name} · {a.classes?.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {classAssignments?.map((a: any) => {
          const classStudents = students?.filter((s) => s.class_id === a.class_id) ?? [];
          return (
            <TabsContent key={a.class_id} value={a.class_id} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Progress</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No students in this class</td></tr>
                      ) : classStudents.map((s) => {
                        const prog = getStudentProgress(s.id);
                        return (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
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
                            <td className="py-3 px-4 text-muted-foreground">{prog.completed}/{prog.total} items</td>
                            <td className="py-3 px-4">
                              <Badge variant={s.status === "Active" ? "default" : "destructive"} className="text-[11px]">{s.status}</Badge>
                            </td>
                          </tr>
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
