import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StudentProgressDetail, useStudentOverallProgress } from "@/components/StudentProgressDetail";

function StudentRow({ s, isOpen, onToggle }: { s: any; isOpen: boolean; onToggle: () => void }) {
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
                {s.name?.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{s.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-muted-foreground text-xs">{s.reg_no || "—"}</td>
        <td className="py-3 px-4 text-muted-foreground">{s.sections?.name || "—"}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2 max-w-[200px]">
            <Progress value={overall} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{overall}%</span>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="py-4 px-4">
            <StudentProgressDetail studentId={s.id} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function CampusAdminClasses() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const { data: ca } = useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("campus_admins").select("campus_id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const campusId = ca?.campus_id;

  const { data: classes } = useQuery({
    queryKey: ["ca-classes", campusId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("campus_id", campusId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const { data: students } = useQuery({
    queryKey: ["ca-classes-students", campusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("campus_id", campusId);
      if (error) throw error;
      const sectionIds = Array.from(new Set((data ?? []).map((s: any) => s.section_id).filter(Boolean)));
      let secMap: Record<string, string> = {};
      if (sectionIds.length) {
        const { data: secs } = await supabase.from("sections").select("id, name").in("id", sectionIds);
        (secs ?? []).forEach((s: any) => { secMap[s.id] = s.name; });
      }
      return (data ?? []).map((s: any) => ({ ...s, sections: s.section_id ? { name: secMap[s.section_id] } : null }));
    },
    enabled: !!campusId,
  });

  if (!classes || classes.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No classes yet. Add some in Institute Management.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse students by class and section, with overall progress</p>
      </div>
      <Tabs defaultValue={classes[0].id}>
        <TabsList className="flex-wrap h-auto">
          {classes.map((c) => <TabsTrigger key={c.id} value={c.id} className="text-xs">{c.name}</TabsTrigger>)}
        </TabsList>
        {classes.map((c) => {
          const cs = (students ?? []).filter((s: any) => s.class_id === c.id);
          return (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-8"></th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reg No</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Section</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Avg Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cs.length === 0 ? (
                        <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">No students in this class</td></tr>
                      ) : cs.map((s: any) => (
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
