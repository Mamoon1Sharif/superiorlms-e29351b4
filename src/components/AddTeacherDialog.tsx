import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ClassAssignment {
  classId: string;
  className: string;
  campusName: string;
  sectionId: string | null;
  sectionName: string | null;
}

export default function AddTeacherDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

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
    queryKey: ["sections-by-class-tch", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*").eq("class_id", classId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });

  const addClassAssignment = () => {
    if (!classId) return;
    const dupKey = `${classId}::${sectionId || "all"}`;
    if (assignments.some((a) => `${a.classId}::${a.sectionId || "all"}` === dupKey)) {
      toast.error("Class/section already assigned");
      return;
    }
    const cls = classes?.find((c) => c.id === classId);
    const campus = campuses?.find((c) => c.id === campusId);
    const sec = sectionsList?.find((s) => s.id === sectionId);
    if (cls && campus) {
      setAssignments([...assignments, {
        classId: cls.id,
        className: cls.name,
        campusName: campus.name,
        sectionId: sec?.id ?? null,
        sectionName: sec?.name ?? null,
      }]);
      setClassId("");
      setSectionId("");
    }
  };

  const removeAssignment = (key: string) => {
    setAssignments(assignments.filter((a) => `${a.classId}::${a.sectionId || "all"}` !== key));
  };

  const handleSubmit = async () => {
    if (!name || !email || !password) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);

    // Auto-include any class selected but not yet added via "Add Class" button
    let finalAssignments = [...assignments];
    const pendingKey = `${classId}::${sectionId || "all"}`;
    if (classId && !finalAssignments.some((a) => `${a.classId}::${a.sectionId || "all"}` === pendingKey)) {
      const cls = classes?.find((c) => c.id === classId);
      const campus = campuses?.find((c) => c.id === campusId);
      const sec = sectionsList?.find((s) => s.id === sectionId);
      if (cls && campus) {
        finalAssignments.push({
          classId: cls.id,
          className: cls.name,
          campusName: campus.name,
          sectionId: sec?.id ?? null,
          sectionName: sec?.name ?? null,
        });
      }
    }

    const { data, error } = await supabase.functions.invoke("invite-teacher", {
      body: {
        name,
        email,
        password,
        campus_id: campusId || null,
        class_assignments: finalAssignments.map((a) => ({ class_id: a.classId, section_id: a.sectionId })),
      },
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to create teacher");
      return;
    }

    if (data?.error) {
      toast.error(data.error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["teachers"] });
    queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments-all"] });
    toast.success("Teacher created successfully!");
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRegionId("");
    setCampusId("");
    setClassId("");
    setSectionId("");
    setAssignments([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Teacher</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@email.com" />
            </div>
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} />
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium">Assign Classes</p>
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
            <Button type="button" variant="outline" size="sm" onClick={addClassAssignment} disabled={!classId}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Class
            </Button>
            {assignments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {assignments.map((a) => {
                  const key = `${a.classId}::${a.sectionId || "all"}`;
                  return (
                    <Badge key={key} variant="secondary" className="text-xs cursor-pointer" onClick={() => removeAssignment(key)}>
                      {a.campusName} · {a.className}{a.sectionName ? ` · ${a.sectionName}` : " · All sections"} ✕
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!name || !email || !password || submitting}
          >
            {submitting ? "Creating..." : "Create Teacher"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
