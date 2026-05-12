import { useState, Fragment } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { StudentProgressDetail, useStudentOverallProgress } from "@/components/StudentProgressDetail";

function StudentRow({ s, onToggle, isOpen }: { s: any; onToggle: () => void; isOpen: boolean }) {
  const { data: overall = 0 } = useStudentOverallProgress(s.id);
  return (
    <>
      <tr className="border-b hover:bg-muted/30 cursor-pointer" onClick={onToggle}>
        <td className="py-3 px-2">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {s.name.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{s.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-muted-foreground">{s.email}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2 max-w-[200px]">
            <Progress value={overall} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{overall}%</span>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-muted/20">
          <td colSpan={4} className="py-4 px-4">
            <StudentProgressDetail studentId={s.id} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function TeacherStudents() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sectionFilters, setSectionFilters] = useState<Record<string, string>>({});
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data: teacher } = useQuery({
    queryKey: ["my-teacher-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: classAssignments } = useQuery({
    queryKey: ["my-class-assignments", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("*, classes(name, campus_id, campuses(name)), sections(name)")
        .eq("teacher_id", teacher!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  const assignedClassIds = Array.from(new Set(classAssignments?.map((a: any) => a.class_id) ?? []));
  const assignedCampusIds = Array.from(
    new Set(classAssignments?.map((a: any) => a.classes?.campus_id).filter(Boolean) ?? []),
  );

  const { data: students } = useQuery({
    queryKey: ["my-students", assignedClassIds, assignedCampusIds],
    queryFn: async () => {
      const [byClass, byCampusNull] = await Promise.all([
        assignedClassIds.length
          ? supabase
              .from("students")
              .select("*, classes(name), campuses(name), sections(name)")
              .in("class_id", assignedClassIds)
          : Promise.resolve({ data: [], error: null } as any),
        assignedCampusIds.length
          ? supabase
              .from("students")
              .select("*, classes(name), campuses(name), sections(name)")
              .is("class_id", null)
              .in("campus_id", assignedCampusIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (byClass.error) throw byClass.error;
      if (byCampusNull.error) throw byCampusNull.error;
      const map = new Map<string, any>();
      [...(byClass.data ?? []), ...(byCampusNull.data ?? [])].forEach((s: any) => map.set(s.id, s));
      return Array.from(map.values());
    },
    enabled: assignedClassIds.length > 0,
  });

  if (!classAssignments || classAssignments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No classes assigned yet</CardContent></Card>
      </div>
    );
  }

  // Group assignments by class to make tabs (one per class, regardless of section count)
  const tabsByClass = Array.from(
    new Map(classAssignments.map((a: any) => [a.class_id, a])).values(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
        <p className="text-muted-foreground text-sm mt-1">Click a student to view their detailed progress</p>
      </div>
      <Tabs defaultValue={tabsByClass[0]?.class_id}>
        <TabsList className="flex-wrap h-auto">
          {tabsByClass.map((a: any) => (
            <TabsTrigger key={a.class_id} value={a.class_id} className="text-xs">
              {a.classes?.campuses?.name} · {a.classes?.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabsByClass.map((a: any) => {
          const allClassStudents = students?.filter(
            (s) => s.class_id === a.class_id || (s.class_id === null && s.campus_id === a.classes?.campus_id),
          ) ?? [];
          const classSections = Array.from(
            new Map(
              allClassStudents
                .filter((s: any) => s.section_id)
                .map((s: any) => [s.section_id, { id: s.section_id, name: (s as any).sections?.name || "—" }]),
            ).values(),
          );
          const sectionFilter = sectionFilters[a.class_id] ?? "all";
          const search = (searchFilters[a.class_id] ?? "").trim().toLowerCase();
          const classStudents = allClassStudents.filter((s: any) => {
            const matchSection = sectionFilter === "all" || s.section_id === sectionFilter;
            const matchSearch =
              !search ||
              s.name?.toLowerCase().includes(search) ||
              s.email?.toLowerCase().includes(search) ||
              s.reg_no?.toLowerCase().includes(search);
            return matchSection && matchSearch;
          });
          return (
            <TabsContent key={a.class_id} value={a.class_id} className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchFilters[a.class_id] ?? ""}
                    onChange={(e) => setSearchFilters((p) => ({ ...p, [a.class_id]: e.target.value }))}
                    placeholder="Search name, email, reg no"
                    className="h-8 text-xs pl-7 w-[240px]"
                  />
                </div>
                {classSections.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground ml-2">Section:</span>
                    <Select value={sectionFilter} onValueChange={(v) => setSectionFilters((p) => ({ ...p, [a.class_id]: v }))}>
                      <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sections</SelectItem>
                        {classSections.map((sec: any) => (
                          <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-8"></th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Avg Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.length === 0 ? (
                        <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No students in this class</td></tr>
                      ) : classStudents.map((s) => (
                        <Fragment key={s.id}>
                          <StudentRow s={s} isOpen={expanded.has(s.id)} onToggle={() => toggle(s.id)} />
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
