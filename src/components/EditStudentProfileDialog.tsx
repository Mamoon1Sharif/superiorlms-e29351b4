import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Query keys to invalidate after save */
  invalidateKeys?: unknown[][];
}

export default function EditStudentProfileDialog({ studentId, open, onOpenChange, invalidateKeys }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [regNo, setRegNo] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("first_name, last_name, name, phone, reg_no")
        .eq("id", studentId)
        .maybeSingle();
      setLoading(false);
      if (cancelled) return;
      if (error) { toast.error(error.message); return; }
      const fn = data?.first_name ?? "";
      const ln = data?.last_name ?? "";
      // Fallback to splitting name if first/last not stored
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
    })();
    return () => { cancelled = true; };
  }, [open, studentId]);

  const save = async () => {
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    setSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await supabase
      .from("students")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: fullName,
        phone: phone.trim() || null,
        reg_no: regNo.trim() || null,
      })
      .eq("id", studentId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    (invalidateKeys ?? []).forEach((k) => qc.invalidateQueries({ queryKey: k }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit student profile</DialogTitle>
          <DialogDescription>Update name, phone number, or registration number.</DialogDescription>
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
