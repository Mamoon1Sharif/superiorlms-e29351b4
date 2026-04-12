import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, GraduationCap, ShieldCheck, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import AddTeacherDialog from "@/components/AddTeacherDialog";

function StudentTable() {
  const [search, setSearch] = useState("");

  const { data: adminUserIds } = useQuery({
    queryKey: ["admin-user-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      return data.map((r) => r.user_id);
    },
  });

  const { data: users } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*, campuses(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("student_id, course_id");
      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = (users ?? [])
    .filter((u) => !adminUserIds?.includes(u.user_id))
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campus</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Courses</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {u.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{(u.campuses as any)?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{enrollments?.filter((e) => e.student_id === u.id).length ?? 0}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === "Active" ? "default" : "destructive"} className="text-[11px]">{u.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeacherTable() {
  const [search, setSearch] = useState("");

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*, campuses(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["teacher-class-assignments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name, campus_id, campuses(name))");
      if (error) throw error;
      return data;
    },
  });

  const filteredTeachers = (teachers ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const getAssignedClasses = (teacherId: string) =>
    assignments?.filter((a) => a.teacher_id === teacherId) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search teachers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <AddTeacherDialog />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Assigned Classes</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => {
                  const classAssignments = getAssignedClasses(t.id);
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {t.name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{t.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {classAssignments.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
                          {classAssignments.map((a: any) => (
                            <Badge key={a.id} variant="outline" className="text-[10px]">
                              {a.classes?.campuses?.name} · {a.classes?.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={t.status === "Active" ? "default" : "destructive"} className="text-[11px]">{t.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EnrollmentApprovals() {
  const queryClient = useQueryClient();

  const { data: enrollments } = useQuery({
    queryKey: ["pending-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, students(name, email, campuses(name)), courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-enrollments"] });
      toast.success(`Enrollment ${status.toLowerCase()}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = enrollments?.filter((e) => e.status === "Pending") ?? [];
  const processed = enrollments?.filter((e) => e.status !== "Pending") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Pending Requests ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No pending enrollment requests</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pending.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(e.students as any)?.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{(e.students as any)?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(e.students as any)?.email} · {(e.students as any)?.campuses?.name ?? "No campus"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[11px]">{(e.courses as any)?.title}</Badge>
                    <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: e.id, status: "Approved" })} disabled={updateStatus.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: e.id, status: "Rejected" })} disabled={updateStatus.isPending}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Processed ({processed.length})</h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{(e.students as any)?.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{(e.courses as any)?.title}</td>
                      <td className="py-3 px-4">
                        <Badge variant={e.status === "Approved" ? "default" : "destructive"} className="text-[11px]">{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage students, teachers, and enrollment approvals</p>
      </div>
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Students</TabsTrigger>
          <TabsTrigger value="teachers" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> Teachers</TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /> Enrollments</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4"><StudentTable /></TabsContent>
        <TabsContent value="teachers" className="mt-4"><TeacherTable /></TabsContent>
        <TabsContent value="enrollments" className="mt-4"><EnrollmentApprovals /></TabsContent>
      </Tabs>
    </div>
  );
}
