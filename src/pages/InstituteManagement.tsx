import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InstituteManagement() {
  const queryClient = useQueryClient();

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campuses } = useQuery({
    queryKey: ["campuses-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campuses")
        .select("*, regions:region_id(id, name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, campuses:campus_id(id, name, city)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Build unified table rows
  const tableRows = buildTableRows(regions ?? [], campuses ?? [], classes ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Institute Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your regions, campuses, and classes
        </p>
      </div>

      <Tabs defaultValue="add" className="space-y-4">
        <TabsList>
          <TabsTrigger value="add">Add New</TabsTrigger>
          <TabsTrigger value="overview">Overview Table</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <AddRegionCard queryClient={queryClient} />
            <AddCampusCard queryClient={queryClient} regions={regions ?? []} />
            <AddClassCard queryClient={queryClient} campuses={campuses ?? []} />
          </div>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Institute Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="w-[60px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No data yet. Add regions, campuses, and classes to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">{row.region}</TableCell>
                        <TableCell>{row.campus}</TableCell>
                        <TableCell>{row.className}</TableCell>
                        <TableCell>
                          <DeleteButton
                            type={row.deleteType}
                            id={row.deleteId}
                            queryClient={queryClient}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TableRowData {
  key: string;
  region: string;
  campus: string;
  className: string;
  deleteType: "region" | "campus" | "class";
  deleteId: string;
}

function buildTableRows(
  regions: any[],
  campuses: any[],
  classes: any[]
): TableRowData[] {
  const rows: TableRowData[] = [];

  for (const region of regions) {
    const regionCampuses = campuses.filter(
      (c) => (c as any).regions?.id === region.id
    );

    if (regionCampuses.length === 0) {
      rows.push({
        key: `r-${region.id}`,
        region: region.name,
        campus: "—",
        className: "—",
        deleteType: "region",
        deleteId: region.id,
      });
    } else {
      for (const campus of regionCampuses) {
        const campusClasses = classes.filter(
          (cl) => (cl as any).campuses?.id === campus.id
        );

        if (campusClasses.length === 0) {
          rows.push({
            key: `c-${campus.id}`,
            region: region.name,
            campus: `${campus.name} — ${campus.city}`,
            className: "—",
            deleteType: "campus",
            deleteId: campus.id,
          });
        } else {
          for (const cls of campusClasses) {
            rows.push({
              key: `cl-${cls.id}`,
              region: region.name,
              campus: `${campus.name} — ${campus.city}`,
              className: cls.name,
              deleteType: "class",
              deleteId: cls.id,
            });
          }
        }
      }
    }
  }

  // Campuses without region
  const orphanCampuses = campuses.filter((c) => !(c as any).regions);
  for (const campus of orphanCampuses) {
    const campusClasses = classes.filter(
      (cl) => (cl as any).campuses?.id === campus.id
    );
    if (campusClasses.length === 0) {
      rows.push({
        key: `oc-${campus.id}`,
        region: "—",
        campus: `${campus.name} — ${campus.city}`,
        className: "—",
        deleteType: "campus",
        deleteId: campus.id,
      });
    } else {
      for (const cls of campusClasses) {
        rows.push({
          key: `ocl-${cls.id}`,
          region: "—",
          campus: `${campus.name} — ${campus.city}`,
          className: cls.name,
          deleteType: "class",
          deleteId: cls.id,
        });
      }
    }
  }

  return rows;
}

function DeleteButton({
  type,
  id,
  queryClient,
}: {
  type: "region" | "campus" | "class";
  id: string;
  queryClient: any;
}) {
  const table = type === "region" ? "regions" : type === "campus" ? "campuses" : "classes";
  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      queryClient.invalidateQueries({ queryKey: ["campuses-all"] });
      queryClient.invalidateQueries({ queryKey: ["classes-all"] });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-destructive"
      onClick={() => deleteMut.mutate()}
      disabled={deleteMut.isPending}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function AddRegionCard({ queryClient }: { queryClient: any }) {
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("regions").insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      setName("");
      toast.success("Region added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add Region</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="e.g. Lahore"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && add.mutate()}
        />
        <Button
          size="sm"
          className="w-full"
          onClick={() => name.trim() && add.mutate()}
          disabled={add.isPending || !name.trim()}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Region
        </Button>
      </CardContent>
    </Card>
  );
}

function AddCampusCard({
  queryClient,
  regions,
}: {
  queryClient: any;
  regions: any[];
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [regionId, setRegionId] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campuses").insert({
        name: name.trim(),
        city: city.trim(),
        region_id: regionId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campuses-all"] });
      setName("");
      setCity("");
      toast.success("Campus added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add Campus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={regionId} onValueChange={setRegionId}>
          <SelectTrigger>
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Campus name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button
          size="sm"
          className="w-full"
          onClick={() => name.trim() && city.trim() && add.mutate()}
          disabled={add.isPending || !name.trim() || !city.trim()}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Campus
        </Button>
      </CardContent>
    </Card>
  );
}

function AddClassCard({
  queryClient,
  campuses,
}: {
  queryClient: any;
  campuses: any[];
}) {
  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes").insert({
        name: name.trim(),
        campus_id: campusId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes-all"] });
      setName("");
      toast.success("Class added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add Class</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={campusId} onValueChange={setCampusId}>
          <SelectTrigger>
            <SelectValue placeholder="Select campus" />
          </SelectTrigger>
          <SelectContent>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {c.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="e.g. BSCS-1A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && campusId && add.mutate()}
        />
        <Button
          size="sm"
          className="w-full"
          onClick={() => name.trim() && campusId && add.mutate()}
          disabled={add.isPending || !name.trim() || !campusId}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Class
        </Button>
      </CardContent>
    </Card>
  );
}
