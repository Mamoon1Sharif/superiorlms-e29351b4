import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Users, BookOpen, User } from "lucide-react";

const campuses = [
  { id: 1, name: "Lahore Main Campus", city: "Lahore", students: 1240, teachers: 18, courses: 12, status: "Active" },
  { id: 2, name: "Karachi Campus", city: "Karachi", students: 980, teachers: 14, courses: 10, status: "Active" },
  { id: 3, name: "Islamabad Campus", city: "Islamabad", students: 760, teachers: 11, courses: 8, status: "Active" },
  { id: 4, name: "Faisalabad Campus", city: "Faisalabad", students: 540, teachers: 8, courses: 6, status: "Active" },
  { id: 5, name: "Rawalpindi Campus", city: "Rawalpindi", students: 420, teachers: 6, courses: 5, status: "Active" },
];

export default function Campuses() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campuses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your campus network</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Campus
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {campuses.map((campus) => (
          <Card key={campus.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{campus.name}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {campus.city}
                  </p>
                </div>
                <Badge variant="default" className="text-[11px]">{campus.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <Users className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{campus.students.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Students</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <User className="h-4 w-4 mx-auto text-accent mb-1" />
                  <p className="text-lg font-bold">{campus.teachers}</p>
                  <p className="text-[11px] text-muted-foreground">Teachers</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <BookOpen className="h-4 w-4 mx-auto text-warning mb-1" />
                  <p className="text-lg font-bold">{campus.courses}</p>
                  <p className="text-[11px] text-muted-foreground">Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
