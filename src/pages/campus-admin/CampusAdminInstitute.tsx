import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CampusAdminInstitute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ca } = useQuery({
    queryKey: ["my-campus-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campus_admins")
        .select("campus_id, campuses(name, city)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  const campusId = ca?.campus_id;
  const campus = ca?.campuses as any;

  const { data: classes } = useQuery({
    queryKey: ["ca-classes", campusId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("campus_id", campusId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const classIds = (classes ?? []).map((c) => c.id);

  const { data: sections } = useQuery({
    queryKey: ["ca-sections", classIds.join(",")],
    queryFn: async () => {
      if (!classIds.length) return [];
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .in("class_id", classIds)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!classIds.length,
  });

  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [sectionClassId, setSectionClassId] = useState("");

  const addClass = useMutation({
    mutationFn: async () => {
      if (!className.trim()) throw new Error("Enter class name");
      const { error } = await supabase.from("classes").insert({ name: className.trim(), campus_id: campusId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Class added");
      setClassName("");
      queryClient.invalidateQueries({ queryKey: ["ca-classes"] });
      queryClient.invalidateQueries({ queryKey: ["classes-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSection = useMutation({
    mutationFn: async () => {
      if (!sectionName.trim() || !sectionClassId) throw new Error("Pick class and enter section name");
      const { error } = await supabase.from("sections").insert({ name: sectionName.trim(), class_id: sectionClassId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section added");
      setSectionName("");
      queryClient.invalidateQueries({ queryKey: ["ca-sections"] });
      queryClient.invalidateQueries({ queryKey: ["sections-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delClass = async (id: string) => {
    if (!confirm("Delete this class? Its sections will also be removed.")) return;
    await supabase.from("sections").delete().eq("class_id", id);
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Class deleted");
    queryClient.invalidateQueries({ queryKey: ["ca-classes"] });
    queryClient.invalidateQueries({ queryKey: ["ca-sections"] });
  };

  const delSection = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Section deleted");
    queryClient.invalidateQueries({ queryKey: ["ca-sections"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Institute Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {campus?.name ? `${campus.name} · ` : ""}Manage classes and sections in your campus
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Add Class</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Class name</Label>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 9" />
            </div>
            <Button onClick={() => addClass.mutate()} disabled={addClass.isPending || !campusId}>
              <Plus className="h-4 w-4 mr-2" /> Add Class
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Add Section</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Class</Label>
              <Select value={sectionClassId} onValueChange={setSectionClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section name</Label>
              <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. A" />
            </div>
            <Button onClick={() => addSection.mutate()} disabled={addSection.isPending}>
              <Plus className="h-4 w-4 mr-2" /> Add Section
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Classes & Sections</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead className="w-[80px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(classes ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No classes yet</TableCell></TableRow>
              ) : classes!.map((c) => {
                const cs = (sections ?? []).filter((s) => s.class_id === c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {cs.length === 0 ? <span className="text-xs text-muted-foreground">No sections</span> :
                          cs.map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs">
                              {s.name}
                              <button onClick={() => delSection(s.id)} className="text-muted-foreground hover:text-destructive">×</button>
                            </span>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delClass(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
