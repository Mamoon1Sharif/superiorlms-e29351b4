import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Assn { classId: string; className: string; sectionId: string | null; sectionName: string | null; }

function AddTeacherForCampus({ campusId }: { campusId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [assignments, setAssignments] = useState<Assn[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: classes } = useQuery({
    queryKey: ["ca-classes", campusId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("campus_id", campusId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const { data: sectionsList } = useQuery({
    queryKey: ["sections-by-class-ca", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*").eq("class_id", classId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });

  const addAssn = () => {
    if (!classId) return;
    const key = `${classId}::${sectionId || "all"}`;
    if (assignments.some((a) => `${a.classId}::${a.sectionId || "all"}` === key)) return toast.error("Already added");
    const cls = classes?.find((c) => c.id === classId);
    const sec = sectionsList?.find((s) => s.id === sectionId);
    if (cls) {
      setAssignments([...assignments, { classId: cls.id, className: cls.name, sectionId: sec?.id ?? null, sectionName: sec?.name ?? null }]);
      setClassId(""); setSectionId("");
    }
  };

  const submit = async () => {
    if (!name || !email || !password) return toast.error("Fill all fields");
    if (password.length < 6) return toast.error("Password min 6 chars");
    setSubmitting(true);
    let finals = [...assignments];
    const key = `${classId}::${sectionId || "all"}`;
    if (classId && !finals.some((a) => `${a.classId}::${a.sectionId || "all"}` === key)) {
      const cls = classes?.find((c) => c.id === classId);
      const sec = sectionsList?.find((s) => s.id === sectionId);
      if (cls) finals.push({ classId: cls.id, className: cls.name, sectionId: sec?.id ?? null, sectionName: sec?.name ?? null });
    }
    const { data, error } = await supabase.functions.invoke("invite-teacher", {
      body: {
        name, email, password,
        campus_id: campusId,
        class_assignments: finals.map((a) => ({ class_id: a.classId, section_id: a.sectionId })),
      },
    });
    setSubmitting(false);
    if (error || data?.error) return toast.error(error?.message || data?.error || "Failed");
    toast.success("Teacher created");
    queryClient.invalidateQueries({ queryKey: ["ca-teachers"] });
    queryClient.invalidateQueries({ queryKey: ["ca-teacher-assignments"] });
    setName(""); setEmail(""); setPassword(""); setAssignments([]); setClassId(""); setSectionId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Teacher</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Teacher</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" /></div>
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium">Assign Classes</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Section (optional)</Label>
                <Select value={sectionId} onValueChange={setSectionId} disabled={!classId || !sectionsList?.length}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={sectionsList?.length ? "All sections" : "No sections"} /></SelectTrigger>
                  <SelectContent>{sectionsList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addAssn} disabled={!classId}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Class
            </Button>
            {assignments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {assignments.map((a) => {
                  const k = `${a.classId}::${a.sectionId || "all"}`;
                  return (
                    <Badge key={k} variant="secondary" className="text-xs cursor-pointer"
                      onClick={() => setAssignments(assignments.filter((x) => `${x.classId}::${x.sectionId || "all"}` !== k))}>
                      {a.className}{a.sectionName ? ` · ${a.sectionName}` : " · All sections"} ✕
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting || !name || !email || !password}>
            {submitting ? "Creating..." : "Create Teacher"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CampusAdminTeachers() {
  const { user } = useAuth();

  const { data: ca } = useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("campus_admins").select("campus_id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const campusId = ca?.campus_id;

  const { data: teachers } = useQuery({
    queryKey: ["ca-teachers", campusId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("campus_id", campusId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const teacherIds = (teachers ?? []).map((t) => t.id);
  const { data: assignments } = useQuery({
    queryKey: ["ca-teacher-assignments", teacherIds.join(",")],
    queryFn: async () => {
      if (!teacherIds.length) return [];
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name), sections(name)")
        .in("teacher_id", teacherIds);
      if (error) throw error;
      return data;
    },
    enabled: !!teacherIds.length,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground text-sm mt-1">Add and assign teachers to your classes</p>
        </div>
        {campusId && <AddTeacherForCampus campusId={campusId} />}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Teachers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Classes / Sections</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(teachers ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No teachers yet</TableCell></TableRow>
              ) : teachers!.map((t) => {
                const ta = (assignments ?? []).filter((a: any) => a.teacher_id === t.id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {ta.length === 0 ? <span className="text-xs text-muted-foreground">None</span> :
                          ta.map((a: any) => (
                            <Badge key={a.id} variant="secondary" className="text-xs">
                              {a.classes?.name}{a.sections?.name ? ` · ${a.sections.name}` : " · All"}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
