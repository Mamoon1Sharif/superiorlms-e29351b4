import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function AddCampusAdminDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    queryKey: ["campuses-by-region", regionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*").eq("region_id", regionId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!regionId,
  });

  const handleSubmit = async () => {
    if (!name || !email || !password || !campusId) {
      toast.error("All fields are required");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("invite-campus-admin", {
      body: { name, email, password, campus_id: campusId },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Failed to create campus admin");
      return;
    }
    toast.success("Campus admin created");
    queryClient.invalidateQueries({ queryKey: ["campus-admins"] });
    setName(""); setEmail(""); setPassword(""); setRegionId(""); setCampusId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Campus Admin</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Campus Admin / Principal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="principal@email.com" /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} /></div>
          <div>
            <Label>Region</Label>
            <Select value={regionId} onValueChange={(v) => { setRegionId(v); setCampusId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>{regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Campus</Label>
            <Select value={campusId} onValueChange={setCampusId} disabled={!regionId}>
              <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
              <SelectContent>{campuses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Campus Admin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
