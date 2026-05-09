import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Loader2, BookOpen, Users, Award } from "lucide-react";
import brandLogo from "@/assets/superior-logo.png";
import { toast } from "sonner";
import collegeBg from "@/assets/college-bg.jpg";
import { fetchAppSettings } from "@/lib/appSettings";

const quotes = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteIndex] = useState(() => Math.floor(Math.random() * quotes.length));
  const [stats, setStats] = useState({ courses: 0, students: 0, campuses: 0 });
  const [bgUrl, setBgUrl] = useState<string>(collegeBg);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(44);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      if (s.login_background_url) setBgUrl(s.login_background_url);
      setLogoUrl(s.logo_url);
      setLogoSize(s.logo_size);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const [c, s, ca] = await Promise.all([
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("campuses").select("*", { count: "exact", head: true }),
      ]);
      setStats({ courses: c.count ?? 0, students: s.count ?? 0, campuses: ca.count ?? 0 });
    };
    loadStats();
  }, []);

  // If already logged in, redirect based on role
  useEffect(() => {
    if (authLoading || !user) return;

    const redirect = async () => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role === "admin") { navigate("/", { replace: true }); return; }
      if (roleData?.role === "teacher") { navigate("/teacher", { replace: true }); return; }
      if (roleData?.role === "campus_admin") { navigate("/campus-admin", { replace: true }); return; }

      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentData) { navigate("/student", { replace: true }); return; }
    };
    redirect();
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      toast.error("Login failed");
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.role === "admin") { navigate("/"); setLoading(false); return; }
    if (roleData?.role === "teacher") { navigate("/teacher"); setLoading(false); return; }
    if (roleData?.role === "campus_admin") { navigate("/campus-admin"); setLoading(false); return; }

    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (studentData) { navigate("/student"); setLoading(false); return; }

    toast.error("No role assigned to this account. Contact admin.");
    await supabase.auth.signOut();
    setLoading(false);
  };

  const quote = quotes[quoteIndex];

  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        {/* College background image */}
        <img
          src={bgUrl}
          alt="Superior College of Commerce Sargodha campus building"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/80 to-primary/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-primary/40" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Organization logo" style={{ height: logoSize, width: "auto" }} className="object-contain" />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-lg tracking-tight">Superior Group</h2>
              <p className="text-xs text-white/70">of Colleges</p>
            </div>
          </div>

          <div className="space-y-8">
            <blockquote className="space-y-4">
              <p className="text-2xl font-semibold leading-relaxed italic">
                "{quote.text}"
              </p>
              <footer className="text-sm text-white/70 font-medium">
                — {quote.author}
              </footer>
            </blockquote>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/15">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-white/60" />
                <div>
                  <p className="text-xl font-bold">{stats.courses}</p>
                  <p className="text-xs text-white/60">Courses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-white/60" />
                <div>
                  <p className="text-xl font-bold">{stats.students}</p>
                  <p className="text-xs text-white/60">Students</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-white/60" />
                <div>
                  <p className="text-xl font-bold">{stats.campuses}</p>
                  <p className="text-xs text-white/60">Campuses</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Superior Group of Colleges. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
            <img src={brandLogo} alt="Superior Group of Colleges logo" width={48} height={48} className="h-12 w-12 object-contain" />
            <div>
              <h2 className="font-bold text-lg text-foreground">Superior Group</h2>
              <p className="text-xs text-muted-foreground">of Colleges</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription className="text-base">
                Sign in to your learning management system
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email Address</Label>
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Password</Label>
                    <a href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">New student?</span>
                </div>
              </div>

              <a href="/student/register">
                <Button variant="outline" className="w-full h-11">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Student Registration
                </Button>
              </a>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Admins, teachers and students all sign in here.
          </p>
        </div>
      </div>
    </div>
  );
}
