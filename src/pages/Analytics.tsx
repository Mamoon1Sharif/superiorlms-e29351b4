import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Analytics() {
  const { data: campuses } = useQuery({
    queryKey: ["campuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*, students(campus_id)");
      if (error) throw error;
      return data;
    },
  });

  // Avg progress by campus
  const campusPerformance = (campuses ?? []).map((c) => {
    const campusEnrollments = (enrollments ?? []).filter((e: any) => e.students?.campus_id === c.id);
    const avg = campusEnrollments.length > 0
      ? Math.round(campusEnrollments.reduce((s, e) => s + e.progress, 0) / campusEnrollments.length)
      : 0;
    return { campus: c.city, avgProgress: avg };
  });

  // Enrollment counts by campus
  const enrollmentByCampus = (campuses ?? []).map((c) => ({
    campus: c.city,
    enrollments: (enrollments ?? []).filter((e: any) => e.students?.campus_id === c.id).length,
  }));

  // Status distribution
  const statusCounts = ["Approved", "Pending", "Rejected"].map((s) => ({
    status: s,
    count: (enrollments ?? []).filter((e) => e.status === s).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Performance insights across your network</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Enrollments by Campus</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={enrollmentByCampus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="campus" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="hsl(199, 89%, 38%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Avg Progress by Campus</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={campusPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="campus" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avgProgress" fill="hsl(168, 71%, 39%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Enrollment Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(262, 52%, 47%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <EnrollmentStats />
    </div>
  );
}

function EnrollmentStats() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-enrollment-stats"],
    queryFn: async () => {
      const [{ data: enrollments, error: eErr }, { data: students, error: sErr }, { data: campuses, error: cErr }] = await Promise.all([
        supabase.from("enrollments").select("status, student_id"),
        supabase.from("students").select("id, campus_id"),
        supabase.from("campuses").select("id, name, city"),
      ]);
      if (eErr) throw eErr;
      if (sErr) throw sErr;
      if (cErr) throw cErr;

      const studentCampus: Record<string, string | null> = {};
      (students ?? []).forEach((s: any) => (studentCampus[s.id] = s.campus_id));

      const stats: Record<string, { received: number; approved: number; rejected: number; pending: number }> = {};
      (campuses ?? []).forEach((c: any) => (stats[c.id] = { received: 0, approved: 0, rejected: 0, pending: 0 }));

      (enrollments ?? []).forEach((e: any) => {
        const cid = studentCampus[e.student_id];
        if (!cid || !stats[cid]) return;
        stats[cid].received += 1;
        if (e.status === "Approved") stats[cid].approved += 1;
        else if (e.status === "Rejected") stats[cid].rejected += 1;
        else stats[cid].pending += 1;
      });

      return (campuses ?? []).map((c: any) => ({ ...c, ...stats[c.id] }));
    },
  });

  const totals = (rows ?? []).reduce(
    (acc, r: any) => {
      acc.received += r.received;
      acc.approved += r.approved;
      acc.rejected += r.rejected;
      acc.pending += r.pending;
      return acc;
    },
    { received: 0, approved: 0, rejected: 0, pending: 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Enrollment Overview</h2>
        <p className="text-muted-foreground text-xs mt-1">Approvals are managed by Campus Admins for each campus.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Received</p><p className="text-2xl font-bold mt-1">{totals.received}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold mt-1">{totals.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold mt-1 text-primary">{totals.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold mt-1 text-destructive">{totals.rejected}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campus</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">City</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Received</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Pending</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Approved</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : (rows ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No campuses found</td></tr>
                ) : (
                  (rows ?? []).map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{r.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{r.city}</td>
                      <td className="py-3 px-4 text-right">{r.received}</td>
                      <td className="py-3 px-4 text-right"><Badge variant="secondary" className="text-[11px]">{r.pending}</Badge></td>
                      <td className="py-3 px-4 text-right"><Badge className="text-[11px]">{r.approved}</Badge></td>
                      <td className="py-3 px-4 text-right"><Badge variant="destructive" className="text-[11px]">{r.rejected}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
