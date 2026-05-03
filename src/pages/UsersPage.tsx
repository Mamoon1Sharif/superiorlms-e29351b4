import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, GraduationCap, ShieldCheck, Pencil, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AddTeacherDialog from "@/components/AddTeacherDialog";
import AddCampusAdminDialog from "@/components/AddCampusAdminDialog";

function EditStudentDialog({ student, open, onOpenChange }: { student: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [phone, setPhone] = useState(student.phone || "");
  const [status, setStatus] = useState(student.status);
  const [regionId, setRegionId] = useState("");
  const [campusId, setCampusId] = useState(student.campus_id || "");
  const [classId, setClassId] = useState(student.class_id || "");
  const [saving, setSaving] = useState(false);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campuses } = useQuery({
    queryKey: ["campuses-by-region", regionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*").eq("region_id", regionId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!regionId,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-by-campus", campusId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("campus_id", campusId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("students").update({
      name, email, phone: phone || null, status,
      campus_id: campusId || null,
      class_id: classId || null,
    }).eq("id", student.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["students"] });
    toast.success("Student updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label>Region</Label>
            <Select value={regionId} onValueChange={(v) => { setRegionId(v); setCampusId(""); setClassId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>{regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={(v) => { setCampusId(v); setClassId(""); }} disabled={!regionId}>
              <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
              <SelectContent>{campuses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId} disabled={!campusId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTeacherDialog({ teacher, open, onOpenChange }: { teacher: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(teacher.name);
  const [email, setEmail] = useState(teacher.email);
  const [status, setStatus] = useState(teacher.status);
  const [regionId, setRegionId] = useState("");
  const [campusId, setCampusId] = useState(teacher.campus_id || "");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [saving, setSaving] = useState(false);

  // Preload region from teacher's campus so the cascading dropdowns aren't empty
  useEffect(() => {
    (async () => {
      if (teacher.campus_id && !regionId) {
        const { data } = await supabase.from("campuses").select("region_id").eq("id", teacher.campus_id).maybeSingle();
        if (data?.region_id) setRegionId(data.region_id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.campus_id]);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campuses } = useQuery({
    queryKey: ["campuses-by-region", regionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*").eq("region_id", regionId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!regionId,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-by-campus", campusId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("campus_id", campusId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const { data: sectionsList } = useQuery({
    queryKey: ["sections-by-class-edit", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*").eq("class_id", classId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });

  const { data: currentAssignments } = useQuery({
    queryKey: ["teacher-class-assignments", teacher.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name, campuses(name)), sections(name)")
        .eq("teacher_id", teacher.id);
      if (error) throw error;
      return data;
    },
  });

  const addClass = async () => {
    if (!classId) return;
    const secKey = sectionId || null;
    if (currentAssignments?.some((a) => a.class_id === classId && (a.section_id || null) === secKey)) {
      toast.error("Class/section already assigned");
      return;
    }
    const { data, error } = await supabase
      .from("teacher_class_assignments")
      .insert({ teacher_id: teacher.id, class_id: classId, section_id: secKey })
      .select()
      .single();
    if (error) { console.error("addClass error:", error); toast.error(error.message); return; }
    console.log("addClass inserted:", data);
    await queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments", teacher.id] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments-all"] });
    setClassId("");
    setSectionId("");
    toast.success("Class assigned");
  };

  const removeAssignment = async (assignmentId: string) => {
    const { error } = await supabase.from("teacher_class_assignments").delete().eq("id", assignmentId);
    if (error) { console.error("remove error:", error); toast.error(error.message); return; }
    await queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments", teacher.id] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments-all"] });
    toast.success("Class removed");
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("teachers").update({ name, email, status, campus_id: campusId || null }).eq("id", teacher.id);
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Auto-persist a class selected in the dropdown but not added via "Add Class"
    const secKey = sectionId || null;
    if (classId && !currentAssignments?.some((a) => a.class_id === classId && (a.section_id || null) === secKey)) {
      const { error: assignErr } = await supabase
        .from("teacher_class_assignments")
        .insert({ teacher_id: teacher.id, class_id: classId, section_id: secKey });
      if (assignErr) { setSaving(false); toast.error(assignErr.message); return; }
    }

    setSaving(false);
    await queryClient.invalidateQueries({ queryKey: ["teachers"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments-all"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments", teacher.id] });
    toast.success("Teacher updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium">Class Assignments</p>
            {currentAssignments && currentAssignments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentAssignments.map((a: any) => (
                  <Badge key={a.id} variant="secondary" className="text-xs cursor-pointer" onClick={() => removeAssignment(a.id)}>
                    {a.classes?.campuses?.name} · {a.classes?.name}{a.sections?.name ? ` · ${a.sections.name}` : " · All sections"} ✕
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No classes assigned</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Region</Label>
                <Select value={regionId} onValueChange={(v) => { setRegionId(v); setCampusId(""); setClassId(""); setSectionId(""); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Region" /></SelectTrigger>
                  <SelectContent>
                    {regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Campus</Label>
                <Select value={campusId} onValueChange={(v) => { setCampusId(v); setClassId(""); setSectionId(""); }} disabled={!regionId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Campus" /></SelectTrigger>
                  <SelectContent>
                    {campuses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }} disabled={!campusId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Section (optional)</Label>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!classId || !sectionsList?.length}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={sectionsList?.length ? "All sections" : "No sections"} /></SelectTrigger>
                  <SelectContent>
                    {sectionsList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addClass} disabled={!classId}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Class
            </Button>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaginationBar({ page, setPage, total, perPage }: { page: number; setPage: (n: number) => void; total: number; perPage: number }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
      <span className="text-muted-foreground">
        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span className="text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

const PER_PAGE = 20;

function StudentTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editStudent, setEditStudent] = useState<any>(null);
  useEffect(() => { setPage(1); }, [search]);

  const { data: nonStudentUserIds } = useQuery({
    queryKey: ["non-student-user-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "teacher", "campus_admin"]);
      if (error) throw error;
      return data.map((r) => r.user_id);
    },
  });

  const { data: users } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*, campuses(name), classes(name)");
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
    .filter((u) => !nonStudentUserIds?.includes(u.user_id))
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  const pagedUsers = filteredUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reg No</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campus</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Approval</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((u) => (
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
                    <td className="py-3 px-4 text-muted-foreground">{u.reg_no || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{(u.campuses as any)?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{(u.classes as any)?.name ?? "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.approval_status === "Approved" ? "default" : u.approval_status === "Rejected" ? "destructive" : "secondary"} className="text-[11px]">
                        {u.approval_status ?? "—"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === "Active" ? "default" : "destructive"} className="text-[11px]">{u.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditStudent(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} setPage={setPage} total={filteredUsers.length} perPage={PER_PAGE} />
        </CardContent>
      </Card>
      {editStudent && (
        <EditStudentDialog student={editStudent} open={!!editStudent} onOpenChange={(v) => { if (!v) setEditStudent(null); }} />
      )}
    </div>
  );
}

function TeacherTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  useEffect(() => { setPage(1); }, [search]);

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
        .select("*, classes(name, campus_id, campuses(name)), sections(name)");
      if (error) throw error;
      return data;
    },
  });

  const filteredTeachers = (teachers ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const pagedTeachers = filteredTeachers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Assigned Campus</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Assigned Classes (Section)</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedTeachers.map((t) => {
                  const classAssignments = getAssignedClasses(t.id);
                  const campusNames = Array.from(new Set(
                    classAssignments
                      .map((a: any) => a.classes?.campuses?.name)
                      .filter(Boolean)
                  ));
                  const primaryCampus = (t as any).campuses?.name;
                  if (primaryCampus && !campusNames.includes(primaryCampus)) campusNames.unshift(primaryCampus);
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
                          {campusNames.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
                          {campusNames.map((name) => (
                            <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {classAssignments.length === 0 && <span className="text-muted-foreground text-xs">None</span>}
                          {classAssignments.map((a: any) => (
                            <Badge key={a.id} variant="outline" className="text-[10px]">
                              {a.classes?.name}{a.sections?.name ? ` (${a.sections.name})` : " (All sections)"}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={t.status === "Active" ? "default" : "destructive"} className="text-[11px]">{t.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTeacher(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} setPage={setPage} total={filteredTeachers.length} perPage={PER_PAGE} />
        </CardContent>
      </Card>
      {editTeacher && (
        <EditTeacherDialog teacher={editTeacher} open={!!editTeacher} onOpenChange={(v) => { if (!v) setEditTeacher(null); }} />
      )}
    </div>
  );
}

function EditCampusAdminDialog({ campusAdmin, open, onOpenChange }: { campusAdmin: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(campusAdmin.name || campusAdmin.profile?.name || "");
  const [email, setEmail] = useState(campusAdmin.email || campusAdmin.profile?.email || "");
  const [regionId, setRegionId] = useState(campusAdmin.campuses?.region_id || "");
  const [campusId, setCampusId] = useState(campusAdmin.campus_id || "");
  const [saving, setSaving] = useState(false);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campuses } = useQuery({
    queryKey: ["campuses-by-region", regionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*").eq("region_id", regionId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!regionId,
  });

  const handleSave = async () => {
    if (!name || !email || !campusId) {
      toast.error("Name, email and campus are required");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("campus_admins") as any)
      .update({ name, email, campus_id: campusId })
      .eq("id", campusAdmin.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["campus-admins"] });
    toast.success("Campus admin updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Campus Admin</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Region</Label>
            <Select value={regionId} onValueChange={(v) => { setRegionId(v); setCampusId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>{regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId} disabled={!regionId}>
              <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
              <SelectContent>{campuses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CampusAdminTable() {
  const [editCampusAdmin, setEditCampusAdmin] = useState<any>(null);
  const [page, setPage] = useState(1);

  const { data: campusAdmins, isLoading, error } = useQuery({
    queryKey: ["campus-admins"],
    queryFn: async () => {
      const { data: admins, error: aErr } = await supabase
        .from("campus_admins")
        .select("*")
        .order("created_at", { ascending: false });
      if (aErr) throw aErr;

      const campusIds = Array.from(new Set((admins ?? []).map((a: any) => a.campus_id).filter(Boolean)));
      let campusMap: Record<string, { name?: string; city?: string; region_id?: string; region?: { name?: string } }> = {};
      if (campusIds.length) {
        const { data: campusRows } = await supabase
          .from("campuses")
          .select("id, name, city, region_id")
          .in("id", campusIds);
        const regionIds = Array.from(new Set((campusRows ?? []).map((c: any) => c.region_id).filter(Boolean)));
        let regionMap: Record<string, { name?: string }> = {};
        if (regionIds.length) {
          const { data: regionRows } = await supabase.from("regions").select("id, name").in("id", regionIds);
          regionRows?.forEach((r: any) => { regionMap[r.id] = { name: r.name }; });
        }
        campusRows?.forEach((c: any) => { campusMap[c.id] = { name: c.name, city: c.city, region_id: c.region_id, region: regionMap[c.region_id] }; });
      }

      const userIds = (admins ?? []).map((a: any) => a.user_id);
      let profiles: Record<string, { name?: string; email?: string }> = {};
      if (userIds.length) {
        const { data: studentRows } = await supabase
          .from("students")
          .select("user_id, name, email")
          .in("user_id", userIds);
        studentRows?.forEach((s: any) => { profiles[s.user_id] = { name: s.name, email: s.email }; });
      }
      return (admins ?? []).map((a: any) => ({
        ...a,
        name: a.name ?? profiles[a.user_id]?.name,
        email: a.email ?? profiles[a.user_id]?.email,
        campuses: campusMap[a.campus_id],
        profile: profiles[a.user_id],
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddCampusAdminDialog />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campus</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">City</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
                )}
                {error && (
                  <tr><td colSpan={7} className="py-8 text-center text-destructive text-sm">{(error as Error).message}</td></tr>
                )}
                {!isLoading && (campusAdmins ?? []).slice((page - 1) * PER_PAGE, page * PER_PAGE).map((ca: any) => (
                  <tr key={ca.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{ca.name ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{ca.email ?? ca.user_id}</td>
                    <td className="py-3 px-4 text-muted-foreground">{ca.campuses?.region?.name ?? "—"}</td>
                    <td className="py-3 px-4">{ca.campuses?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{ca.campuses?.city ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(ca.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCampusAdmin(ca)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && (campusAdmins ?? []).length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No campus admins yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar page={page} setPage={setPage} total={(campusAdmins ?? []).length} perPage={PER_PAGE} />
        </CardContent>
      </Card>
      {editCampusAdmin && (
        <EditCampusAdminDialog campusAdmin={editCampusAdmin} open={!!editCampusAdmin} onOpenChange={(v) => { if (!v) setEditCampusAdmin(null); }} />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage students, teachers, and campus admins</p>
      </div>
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Students</TabsTrigger>
          <TabsTrigger value="teachers" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> Teachers</TabsTrigger>
          <TabsTrigger value="campus-admins" className="gap-1.5"><Building2 className="h-4 w-4" /> Campus Admins</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4"><StudentTable /></TabsContent>
        <TabsContent value="teachers" className="mt-4"><TeacherTable /></TabsContent>
        <TabsContent value="campus-admins" className="mt-4"><CampusAdminTable /></TabsContent>
      </Tabs>
    </div>
  );
}
