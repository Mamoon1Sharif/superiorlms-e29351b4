import { Card, CardContent } from "@/components/ui/card";
import { Bell, UserPlus, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

const notifications = [
  { id: 1, icon: UserPlus, title: "New student registration", description: "Ahmed Hassan registered for Web Development at Lahore campus", time: "5 min ago", type: "info" },
  { id: 2, icon: CheckCircle2, title: "Assignment graded", description: "Dr. Ayesha graded 15 assignments for Data Science module", time: "1 hour ago", type: "success" },
  { id: 3, icon: AlertTriangle, title: "Low quiz performance", description: "Faisalabad campus average dropped below 70% on Module 3 Quiz", time: "3 hours ago", type: "warning" },
  { id: 4, icon: Clock, title: "Deadline approaching", description: "Mobile App Dev assignment deadline in 2 days – 45 pending submissions", time: "5 hours ago", type: "neutral" },
  { id: 5, icon: UserPlus, title: "Teacher onboarded", description: "Prof. Kamran Sheikh added to Karachi campus", time: "1 day ago", type: "info" },
];

const typeColors: Record<string, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  neutral: "text-muted-foreground",
};

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Stay updated on activity across campuses</p>
      </div>
      <div className="space-y-3 max-w-2xl">
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`mt-0.5 ${typeColors[n.type]}`}>
                <n.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
