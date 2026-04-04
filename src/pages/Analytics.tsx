import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const monthlyEnrollments = [
  { month: "Jan", enrollments: 120 }, { month: "Feb", enrollments: 180 },
  { month: "Mar", enrollments: 240 }, { month: "Apr", enrollments: 310 },
  { month: "May", enrollments: 280 }, { month: "Jun", enrollments: 390 },
];

const quizPerformance = [
  { campus: "Lahore", avgScore: 78 }, { campus: "Karachi", avgScore: 72 },
  { campus: "Islamabad", avgScore: 81 }, { campus: "Faisalabad", avgScore: 69 },
  { campus: "Rawalpindi", avgScore: 74 },
];

const completionTrend = [
  { week: "W1", rate: 45 }, { week: "W2", rate: 52 }, { week: "W3", rate: 58 },
  { week: "W4", rate: 63 }, { week: "W5", rate: 70 }, { week: "W6", rate: 78 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Performance insights across your network</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Enrollments</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyEnrollments}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="enrollments" fill="hsl(199, 89%, 38%, 0.15)" stroke="hsl(199, 89%, 38%)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Avg Quiz Score by Campus</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={quizPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="campus" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="hsl(168, 71%, 39%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Completion Rate Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="hsl(262, 52%, 47%)" strokeWidth={2} dot={{ fill: "hsl(262, 52%, 47%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
