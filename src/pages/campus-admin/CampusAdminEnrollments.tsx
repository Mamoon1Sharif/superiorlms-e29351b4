import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const PROGRAM_NAME = "Digital Skill Certification";

export default function CampusAdminEnrollments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: rows } = useQuery({
    queryKey: ["ca-program-enrollments", campusId],
    queryFn: async () => {
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, name, email, reg_no, classes(name)")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false });
      if (sErr) throw sErr;
      const ids = (students ?? []).map((s: any) => s.id);
      if (!ids.length) return [];

      const { data: pes, error: pErr } = await supabase
        .from("program_enrollments")
        .select("id, status, applied_at, student_id, programs(name)")
        .in("student_id", ids);
      if (pErr) throw pErr;

      const peMap: Record<string, any> = {};
      (pes ?? []).forEach((p: any) => {
        // Prefer the Digital Skill Certification enrollment if multiple exist
        if (!peMap[p.student_id] || p.programs?.name === PROGRAM_NAME) {
          peMap[p.student_id] = p;
        }
      });

      return (students ?? [])
        .map((s: any) => ({ ...s, enrollment: peMap[s.id] }))
        .filter((s: any) => s.enrollment);
    },
    enabled: !!campusId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("program_enrollments")
        .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["ca-program-enrollments"] });
      toast.success(`Enrollment ${status.toLowerCase()}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = rows?.filter((r: any) => r.enrollment.status === "Pending") ?? [];
  const processed = rows?.filter((r: any) => r.enrollment.status !== "Pending") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Program Enrollments</h1>
        <p className="text-muted-foreground text-sm mt-1">Approve students for the {PROGRAM_NAME} program</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Pending Requests ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No pending program enrollment requests</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {pending.map((r: any) => (
              <Card key={r.enrollment.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {r.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.email} · {r.classes?.name ?? "No class"} {r.reg_no ? `· ${r.reg_no}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[11px]">{r.enrollment.programs?.name ?? PROGRAM_NAME}</Badge>
                    <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: r.enrollment.id, status: "Approved" })} disabled={updateStatus.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: r.enrollment.id, status: "Rejected" })} disabled={updateStatus.isPending}>
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Program</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((r: any) => (
                    <tr key={r.enrollment.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{r.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{r.enrollment.programs?.name ?? PROGRAM_NAME}</td>
                      <td className="py-3 px-4">
                        <Badge variant={r.enrollment.status === "Approved" ? "default" : "destructive"} className="text-[11px]">{r.enrollment.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {processed.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No processed requests</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
