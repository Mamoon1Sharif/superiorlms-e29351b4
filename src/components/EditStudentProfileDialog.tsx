import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type EditScope =
  | { kind: "campus"; campusId: string }
  | { kind: "teacher"; teacherId: string };

interface Props {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, also allows changing class & section within scope. */
  scope?: EditScope;
  invalidateKeys?: unknown[][];
}

const NONE = "__none__";

export default function EditStudentProfileDialog({ studentId, open, onOpenChange, scope, invalidateKeys }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [regNo, setRegNo] = useState("");
  const [classId, setClassId] = useState<string>(NONE);
  const [sectionId, setSectionId] = useState<string>(NONE);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("first_name, last_name, name, phone, reg_no, class_id, section_id")
        .eq("id", studentId)
        .maybeSingle();
      setLoading(false);
      if (cancelled) return;
      if (error) { toast.error(error.message); return; }
      const fn = data?.first_name ?? "";
      const ln = data?.last_name ?? "";
      if (!fn && !ln && data?.name) {
        const parts = data.name.trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
      } else {
        setFirstName(fn);
        setLastName(ln);
      }
      setPhone(data?.phone ?? "");
      setRegNo(data?.reg_no ?? "");
      setClassId(data?.class_id ?? NONE);
      setSectionId(data?.section_id ?? NONE);
    })();
    return () => { cancelled = true; };
  }, [open, studentId]);

  // Campus scope: all classes in campus
  const { data: campusClasses } = useQuery({
    queryKey: ["edit-dialog-campus-classes", scope?.kind === "campus" ? scope.campusId : null],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name")
        .eq("campus_id", (scope as any).campusId)
        .order("name");
      return data ?? [];
    },
    enabled: open && scope?.kind === "campus",
  });

  // Teacher scope: only classes/sections the teacher is assigned to
  const { data: teacherAssignments } = useQuery({
    queryKey: ["edit-dialog-teacher-assignments", scope?.kind === "teacher" ? scope.teacherId : null],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_class_assignments")
        .select("class_id, section_id, classes(id, name)")
        .eq("teacher_id", (scope as any).teacherId);
      return data ?? [];
    },
    enabled: open && scope?.kind === "teacher",
  });

  // Allowed class list + map of allowed sections per class
  const { allowedClasses, allowedSectionsByClass } = useMemo(() => {
    if (scope?.kind === "teacher") {
      const map = new Map<string, { id: string; name: string }>();
      const sects: Record<string, Set<string> | null> = {};
      (teacherAssignments ?? []).forEach((a: any) => {
        if (a.classes) map.set(a.class_id, { id: a.class_id, name: a.classes.name });
        if (a.section_id === null || a.section_id === undefined) sects[a.class_id] = null;
        else if (sects[a.class_id] !== null) {
          const s = sects[a.class_id] ?? new Set<string>();
          s.add(a.section_id);
          sects[a.class_id] = s;
        }
      });
      return { allowedClasses: Array.from(map.values()), allowedSectionsByClass: sects };
    }
    return {
      allowedClasses: (campusClasses ?? []) as any[],
      allowedSectionsByClass: {} as Record<string, Set<string> | null>,
    };
  }, [scope, teacherAssignments, campusClasses]);

  // Sections for selected class
  const { data: sectionOptions } = useQuery({
    queryKey: ["edit-dialog-sections", classId],
    queryFn: async () => {
      if (classId === NONE) return [];
      const { data } = await supabase.from("sections").select("id, name").eq("class_id", classId).order("name");
      return data ?? [];
    },
    enabled: open && !!scope && classId !== NONE,
  });

  const visibleSections = useMemo(() => {
    if (!scope) return [];
    const all = sectionOptions ?? [];
    if (scope.kind === "teacher") {
      const allowed = allowedSectionsByClass[classId];
      if (allowed === null) return all; // all sections allowed
      if (!allowed) return [];
      return all.filter((s: any) => allowed.has(s.id));
    }
    return all;
  }, [scope, sectionOptions, allowedSectionsByClass, classId]);

  const save = async () => {
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    setSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const patch: Record<string, any> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      name: fullName,
      phone: phone.trim() || null,
      reg_no: regNo.trim() || null,
    };
    if (scope) {
      patch.class_id = classId === NONE ? null : classId;
      patch.section_id = sectionId === NONE ? null : sectionId;
    }
    const { error } = await supabase.from("students").update(patch).eq("id", studentId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    (invalidateKeys ?? []).forEach((k) => qc.invalidateQueries({ queryKey: k as any }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit student profile</DialogTitle>
          <DialogDescription>
            Update name, phone, registration number{scope ? ", class or section" : ""}.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" />
            </div>
            <div className="space-y-2">
              <Label>Registration number</Label>
              <Input value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. STU-2026-001" />
            </div>
            {scope && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(NONE); }}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No class</SelectItem>
                      {allowedClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={sectionId} onValueChange={setSectionId} disabled={classId === NONE}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No section</SelectItem>
                      {visibleSections.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
