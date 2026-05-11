import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, XCircle, Pencil, Save, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function CampusAdminStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [regNoDraft, setRegNoDraft] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const { data: ca } = useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campus_admins").select("campus_id").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const campusId = ca?.campus_id;

  const { data: students } = useQuery({
    queryKey: ["ca-students", campusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const { data: classes } = useQuery({
    queryKey: ["ca-students-classes", campusId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").eq("campus_id", campusId).order("name");
      return data ?? [];
    },
    enabled: !!campusId,
  });

  const { data: sections } = useQuery({
    queryKey: ["ca-students-sections", classFilter],
    queryFn: async () => {
      if (classFilter === "all") return [];
      const { data } = await supabase.from("sections").select("id, name").eq("class_id", classFilter).order("name");
      return data ?? [];
    },
    enabled: classFilter !== "all",
  });

  const setApproval = async (studentId: string, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("students").update({
      approval_status: status,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq("id", studentId);
    if (error) { toast.error(error.message); return; }

    await supabase.from("program_enrollments")
      .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("student_id", studentId);

    toast.success(`Student ${status.toLowerCase()}`);
    queryClient.invalidateQueries({ queryKey: ["ca-students"] });
    queryClient.invalidateQueries({ queryKey: ["ca-pending-count"] });
    queryClient.invalidateQueries({ queryKey: ["ca-approved-count"] });
  };

  const saveRegNo = async (studentId: string) => {
    const { error } = await supabase.from("students").update({ reg_no: regNoDraft }).eq("id", studentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Reg number updated");
    setEditingRegId(null);
    queryClient.invalidateQueries({ queryKey: ["ca-students"] });
  };

  const filtered = (students ?? []).filter((s: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.name?.toLowerCase().includes(q) ||
      s.reg_no?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q);
    const matchClass = classFilter === "all" || s.class_id === classFilter;
    const matchSection = sectionFilter === "all" || s.section_id === sectionFilter;
    return matchSearch && matchClass && matchSection;
  });

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground text-sm mt-1">Approve registrations · click a row to view progress</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, reg no, email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSectionFilter("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {(classes ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === "all"}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All sections" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {(sections ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reg No</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/campus-admin/students/${s.id}`)}
                  >
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {s.name}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </td>
                    <td className="py-3 px-4" onClick={stop}>
                      {editingRegId === s.id ? (
                        <div className="flex gap-1">
                          <Input value={regNoDraft} onChange={(e) => setRegNoDraft(e.target.value)} className="h-7 text-xs w-32" />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveRegNo(s.id)}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{s.reg_no || "—"}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingRegId(s.id); setRegNoDraft(s.reg_no || ""); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{s.classes?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{s.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={s.approval_status === "Approved" ? "default" : s.approval_status === "Rejected" ? "destructive" : "secondary"} className="text-[11px]">
                        {s.approval_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={stop}>
                      {s.approval_status === "Pending" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => setApproval(s.id, "Approved")}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setApproval(s.id, "Rejected")}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
