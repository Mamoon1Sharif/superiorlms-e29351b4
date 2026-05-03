import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Analytics() {
  const [enrollmentRegionId, setEnrollmentRegionId] = useState<string | null>(null);
  const [progressRegionId, setProgressRegionId] = useState<string | null>(null);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*");
      if (error) throw error;
      return data;
    },
  });

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

  // Compute real per-student overall progress (matches StudentProgressDetail logic)
  const { data: studentProgressMap } = useQuery({
    queryKey: ["analytics-student-progress"],
    queryFn: async () => {
      const [{ data: students }, { data: courses }] = await Promise.all([
        supabase.from("students").select("id, campus_id"),
        supabase.from("courses").select("id").eq("status", "Published"),
      ]);
      const courseIds = (courses ?? []).map((c: any) => c.id);
      if (!courseIds.length || !students?.length) return { byCampus: {} as Record<string, number[]> };

      const { data: mods } = await supabase
        .from("modules").select("id, course_id").in("course_id", courseIds);
      const moduleIds = (mods ?? []).map((m: any) => m.id);
      if (!moduleIds.length) return { byCampus: {} as Record<string, number[]> };

      const [{ data: lessons }, { data: quizQs }, { data: assignments }, { data: prog }] = await Promise.all([
        supabase.from("lessons").select("id, module_id").in("module_id", moduleIds),
        supabase.from("quiz_questions").select("module_id").in("module_id", moduleIds),
        supabase.from("assignment_details").select("id, module_id").in("module_id", moduleIds),
        supabase.from("student_progress").select("student_id, item_id, completed").in("module_id", moduleIds),
      ]);

      const valid = new Set<string>();
      (lessons ?? []).forEach((l: any) => valid.add(l.id));
      (assignments ?? []).forEach((a: any) => valid.add(a.id));
      const quizModules = new Set((quizQs ?? []).map((q: any) => q.module_id));
      quizModules.forEach((id) => valid.add(id as string));
      const total = valid.size;

      const byStudent: Record<string, Set<string>> = {};
      (prog ?? []).forEach((p: any) => {
        if (p.completed && valid.has(p.item_id)) {
          (byStudent[p.student_id] = byStudent[p.student_id] ?? new Set()).add(p.item_id);
        }
      });

      const byCampus: Record<string, number[]> = {};
      (students ?? []).forEach((s: any) => {
        if (!s.campus_id) return;
        const pct = total ? Math.min(100, Math.round(((byStudent[s.id]?.size ?? 0) * 100) / total)) : 0;
        (byCampus[s.campus_id] = byCampus[s.campus_id] ?? []).push(pct);
      });

      return { byCampus };
    },
  });

  // Disambiguate campuses sharing the same city by appending the campus name when needed
  const cityCounts: Record<string, number> = {};
  (campuses ?? []).forEach((c: any) => {
    cityCounts[c.city] = (cityCounts[c.city] ?? 0) + 1;
  });
  const labelFor = (c: any) => (cityCounts[c.city] > 1 ? `${c.city} - ${c.name}` : c.city);

  const NO_REGION = "__none__";
  const regionList = [
    ...(regions ?? []),
    { id: NO_REGION, name: "Unassigned" },
  ];

  const campusesInRegion = (rid: string) =>
    (campuses ?? []).filter((c: any) => (c.region_id ?? NO_REGION) === rid);

  const enrollmentsForCampus = (cid: string) =>
    (enrollments ?? []).filter((e: any) => e.students?.campus_id === cid);

  const enrollmentByRegion = regionList
    .map((r: any) => {
      const cs = campusesInRegion(r.id);
      const count = cs.reduce((sum, c: any) => sum + enrollmentsForCampus(c.id).length, 0);
      return { id: r.id, region: r.name, enrollments: count };
    })
    .filter((r) => r.enrollments > 0 || r.id !== NO_REGION);

  const avgProgressForCampus = (cid: string) => {
    const arr = studentProgressMap?.byCampus?.[cid] ?? [];
    return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  };

  const progressByRegion = regionList
    .map((r: any) => {
      const cs = campusesInRegion(r.id);
      const all = cs.flatMap((c: any) => studentProgressMap?.byCampus?.[c.id] ?? []);
      const avg = all.length > 0 ? Math.round(all.reduce((s, v) => s + v, 0) / all.length) : 0;
      return { id: r.id, region: r.name, avgProgress: avg };
    })
    .filter((r) => r.id !== NO_REGION || campusesInRegion(NO_REGION).length > 0);

  const enrollmentByCampusInRegion = (rid: string) =>
    campusesInRegion(rid).map((c: any) => ({
      campus: labelFor(c),
      enrollments: enrollmentsForCampus(c.id).length,
    }));

  const progressByCampusInRegion = (rid: string) =>
    campusesInRegion(rid).map((c: any) => ({
      campus: labelFor(c),
      avgProgress: avgProgressForCampus(c.id),
    }));

  const regionName = (rid: string | null) =>
    regionList.find((r: any) => r.id === rid)?.name ?? "";

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
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>
                {enrollmentRegionId
                  ? `Enrollments — ${regionName(enrollmentRegionId)}`
                  : "Enrollments by Region"}
              </span>
              {enrollmentRegionId && (
                <Button variant="ghost" size="sm" onClick={() => setEnrollmentRegionId(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={enrollmentRegionId ? enrollmentByCampusInRegion(enrollmentRegionId) : enrollmentByRegion}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey={enrollmentRegionId ? "campus" : "region"} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="enrollments"
                  fill="hsl(199, 89%, 38%)"
                  radius={[6, 6, 0, 0]}
                  cursor={enrollmentRegionId ? "default" : "pointer"}
                  onClick={(d: any) => {
                    if (!enrollmentRegionId && d?.id) setEnrollmentRegionId(d.id);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            {!enrollmentRegionId && (
              <p className="text-xs text-muted-foreground mt-2">Click a bar to view campuses in that region.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>
                {progressRegionId
                  ? `Avg Progress — ${regionName(progressRegionId)}`
                  : "Avg Progress by Region"}
              </span>
              {progressRegionId && (
                <Button variant="ghost" size="sm" onClick={() => setProgressRegionId(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={progressRegionId ? progressByCampusInRegion(progressRegionId) : progressByRegion}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey={progressRegionId ? "campus" : "region"} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar
                  dataKey="avgProgress"
                  fill="hsl(168, 71%, 39%)"
                  radius={[6, 6, 0, 0]}
                  cursor={progressRegionId ? "default" : "pointer"}
                  onClick={(d: any) => {
                    if (!progressRegionId && d?.id) setProgressRegionId(d.id);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            {!progressRegionId && (
              <p className="text-xs text-muted-foreground mt-2">Click a bar to view campuses in that region.</p>
            )}
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
        supabase.from("program_enrollments").select("status, student_id"),
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
