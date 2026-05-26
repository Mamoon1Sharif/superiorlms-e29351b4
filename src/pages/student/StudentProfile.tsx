import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentProfile() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [regNo, setRegNo] = useState("");

  const { data: student, isLoading, refetch } = useQuery({
    queryKey: ["my-student-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name), campuses(name), sections(name)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!student) return;
    const fn = (student as any).first_name ?? "";
    const ln = (student as any).last_name ?? "";
    if (!fn && !ln && student.name) {
      const parts = student.name.trim().split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
    } else {
      setFirstName(fn);
      setLastName(ln);
    }
    setPhone((student as any).phone ?? "");
    setRegNo(student.reg_no ?? "");
  }, [student]);

  const save = async () => {
    if (!student) return;
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
      .eq("id", student.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    refetch();
  };

  if (isLoading || !student) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your registration details if anything is incorrect.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription>Email, campus, class and section can only be changed by your campus administrator.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Registration number</Label>
            <Input value={regNo} onChange={(e) => setRegNo(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm">{student.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Campus</Label>
              <p className="text-sm">{(student as any).campuses?.name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Class</Label>
              <p className="text-sm">{(student as any).classes?.name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Section</Label>
              <p className="text-sm">{(student as any).sections?.name ?? "—"}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
