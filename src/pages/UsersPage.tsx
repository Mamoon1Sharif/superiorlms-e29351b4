import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, GraduationCap, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const students = [
  { id: 1, name: "Ahmed Hassan", email: "ahmed@student.edu.pk", campus: "Lahore", courses: 3, status: "Active" },
  { id: 2, name: "Sara Khan", email: "sara@student.edu.pk", campus: "Karachi", courses: 2, status: "Active" },
  { id: 3, name: "Usman Ali", email: "usman@student.edu.pk", campus: "Islamabad", courses: 4, status: "Suspended" },
  { id: 4, name: "Fatima Noor", email: "fatima@student.edu.pk", campus: "Faisalabad", courses: 1, status: "Active" },
  { id: 5, name: "Bilal Mahmood", email: "bilal@student.edu.pk", campus: "Rawalpindi", courses: 2, status: "Active" },
];

const teachers = [
  { id: 1, name: "Dr. Ayesha Siddiqui", email: "ayesha@edu.pk", campus: "Lahore", courses: 4, status: "Active" },
  { id: 2, name: "Prof. Kamran Sheikh", email: "kamran@edu.pk", campus: "Karachi", courses: 3, status: "Active" },
  { id: 3, name: "Dr. Rizwan Ahmed", email: "rizwan@edu.pk", campus: "Islamabad", courses: 2, status: "Active" },
];

function UserTable({ users, role }: { users: typeof students; role: string }) {
  const [search, setSearch] = useState("");
  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Search ${role}s...`} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add {role}
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campus</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Courses</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {u.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.campus}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.courses}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === "Active" ? "default" : "destructive"} className="text-[11px]">
                        {u.status}
                      </Badge>
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

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage students and campus teachers</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Students
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Teachers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4">
          <UserTable users={students} role="Student" />
        </TabsContent>
        <TabsContent value="teachers" className="mt-4">
          <UserTable users={teachers} role="Teacher" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
