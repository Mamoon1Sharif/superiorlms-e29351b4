import { Users, BookOpen, Building2, TrendingUp, GraduationCap, CheckCircle2, Clock, FileText } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const enrollmentData = [
  { campus: "Lahore", students: 1240 },
  { campus: "Karachi", students: 980 },
  { campus: "Islamabad", students: 760 },
  { campus: "Faisalabad", students: 540 },
  { campus: "Rawalpindi", students: 420 },
];

const courseProgress = [
  { name: "Completed", value: 45, color: "hsl(152, 60%, 42%)" },
  { name: "In Progress", value: 35, color: "hsl(199, 89%, 38%)" },
  { name: "Not Started", value: 20, color: "hsl(210, 16%, 82%)" },
];

const recentEnrollments = [
  { name: "Ahmed Hassan", course: "Web Development", campus: "Lahore", status: "Pending" },
  { name: "Sara Khan", course: "Data Science", campus: "Karachi", status: "Approved" },
  { name: "Usman Ali", course: "Mobile App Dev", campus: "Islamabad", status: "Approved" },
  { name: "Fatima Noor", course: "AI & ML", campus: "Faisalabad", status: "Pending" },
  { name: "Bilal Mahmood", course: "Cybersecurity", campus: "Rawalpindi", status: "Rejected" },
];

const statusColor: Record<string, string> = {
  Pending: "bg-warning/15 text-warning border-warning/20",
  Approved: "bg-success/15 text-success border-success/20",
  Rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your education network
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value="3,940" change="+12% this month" changeType="positive" icon={Users} />
        <StatCard title="Active Courses" value="24" change="+3 new courses" changeType="positive" icon={BookOpen} iconColor="bg-accent/10 text-accent" />
        <StatCard title="Campuses" value="5" change="All operational" changeType="neutral" icon={Building2} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Completion Rate" value="78%" change="+5% vs last quarter" changeType="positive" icon={TrendingUp} iconColor="bg-success/10 text-success" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Enrollments by Campus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={enrollmentData}>
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
          <CardHeader>
            <CardTitle className="text-base">Course Progress</CardTitle>
          </CardHeader>
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
        <CardHeader>
          <CardTitle className="text-base">Recent Enrollments</CardTitle>
        </CardHeader>
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
                {recentEnrollments.map((e, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-2 font-medium">{e.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{e.course}</td>
                    <td className="py-3 px-2 text-muted-foreground">{e.campus}</td>
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
