import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import brandLogo from "@/assets/superior-logo.png";
import { toast } from "sonner";

export default function StudentRegister() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [regNo, setRegNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campuses } = useQuery({
    queryKey: ["campuses", regionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("id, name, city, region_id").eq("region_id", regionId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!regionId,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-by-campus-reg", campusId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id, name").eq("campus_id", campusId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!campusId,
  });

  const { data: sectionsList } = useQuery({
    queryKey: ["sections-by-class-reg", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("id, name").eq("class_id", classId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });

  const handleRegionChange = (value: string) => {
    setRegionId(value);
    setCampusId("");
    setClassId("");
    setSectionId("");
  };

  const handleCampusChange = (value: string) => {
    setCampusId(value);
    setClassId("");
    setSectionId("");
  };

  const handleClassChange = (value: string) => {
    setClassId(value);
    setSectionId("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) {
      toast.error("Please select a campus");
      return;
    }
    if (!regionId) {
      toast.error("Please select a region");
      return;
    }
    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone,
          reg_no: regNo,
          campus_id: campusId,
          class_id: classId || null,
          section_id: sectionId || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-2 mb-3">
            <img src={brandLogo} alt="Superior Group of Colleges logo" width={56} height={56} className="h-14 w-14 object-contain" />
            <span className="font-bold text-sm tracking-tight">Superior Group of Colleges</span>
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Join Superior Group of Colleges to access your courses</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ahmed" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Hassan" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input required value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. STU-2026-001" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={regionId} onValueChange={handleRegionChange}>
                <SelectTrigger><SelectValue placeholder="Select your region" /></SelectTrigger>
                <SelectContent>
                  {(regions ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select value={campusId} onValueChange={handleCampusChange} disabled={!regionId}>
                <SelectTrigger><SelectValue placeholder={regionId ? "Select your campus" : "Select a region first"} /></SelectTrigger>
                <SelectContent>
                  {(campuses ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={handleClassChange} disabled={!campusId}>
                <SelectTrigger><SelectValue placeholder={campusId ? "Select your class" : "Select a campus first"} /></SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder={classId ? "Select your section" : "Select a class first"} /></SelectTrigger>
                <SelectContent>
                  {(sectionsList ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</> : "Sign Up"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
