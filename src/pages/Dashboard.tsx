import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, Building2, TrendingUp, MapPin, GraduationCap, Layers, PlayCircle, ClipboardCheck, FileText, UserCheck } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const useCount = (table: string) =>
  useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count, error } = await supabase.from(table as any).select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
...
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Regions" value={regionsCount ?? 0} icon={MapPin} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Campuses" value={totalCampuses} icon={Building2} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Classes" value={classesCount ?? 0} icon={Layers} iconColor="bg-accent/10 text-accent" />
        <StatCard title="Students" value={totalStudents} icon={Users} />
        <StatCard title="Teachers" value={teachersCount ?? 0} icon={UserCheck} iconColor="bg-success/10 text-success" />
        <StatCard title="Courses" value={courses?.length ?? 0} icon={BookOpen} iconColor="bg-accent/10 text-accent" />
        <StatCard title="Published" value={publishedCourses} icon={GraduationCap} iconColor="bg-success/10 text-success" />
        <StatCard title="Modules" value={modulesCount ?? 0} icon={ClipboardCheck} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Lessons" value={lessonsCount ?? 0} icon={PlayCircle} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Enrollments" value={enrollmentsCount ?? 0} icon={FileText} iconColor="bg-accent/10 text-accent" />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard title="Avg. Progress" value={`${avgProgress}%`} icon={TrendingUp} iconColor="bg-success/10 text-success" />
        <StatCard title="Approved Enrollments" value={approvedEnrollments.length} icon={UserCheck} iconColor="bg-primary/10 text-primary" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Students by Campus</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={campusEnrollments}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="campus" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="students" fill="hsl(199, 89%, 38%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Enrollment Progress</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={courseProgress} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {courseProgress.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {courseProgress.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Enrollments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Course</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Campus</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 px-2 font-medium">{(e.students as any)?.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{(e.courses as any)?.title}</td>
                    <td className="py-3 px-2 text-muted-foreground">{(e.students as any)?.campuses?.name}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
