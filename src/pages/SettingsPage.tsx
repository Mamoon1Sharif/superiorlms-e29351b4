import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fetchAppSettings, applyFavicon } from "@/lib/appSettings";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loginBg, setLoginBg] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"bg" | "fav" | null>(null);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      setLoginBg(s.login_background_url);
      setFavicon(s.favicon_url);
    });
  }, []);

  const upload = async (file: File, kind: "bg" | "fav") => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be < 5MB"); return; }
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("app-assets").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("app-assets").getPublicUrl(path);
      const url = data.publicUrl;

      const column = kind === "bg" ? "login_background_url" : "favicon_url";
      const { error: updErr } = await (supabase as any)
        .from("app_settings")
        .update({ [column]: url, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (updErr) throw updErr;

      if (kind === "bg") setLoginBg(url);
      else { setFavicon(url); applyFavicon(url); }
      toast.success(kind === "bg" ? "Login background updated" : "Favicon updated");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your admin portal</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
          <CardDescription>Customize the login page background and the application favicon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Login background */}
          <div className="space-y-2">
            <Label>Login Page Background</Label>
            <p className="text-xs text-muted-foreground">Shown on the left panel of the login screen. 16:9 recommended.</p>
            {loginBg ? (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={loginBg} alt="Login background preview" className="w-full aspect-[16/9] object-cover" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full aspect-[16/9] rounded-lg border-2 border-dashed border-border bg-muted/30">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <label className="inline-flex">
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading === "bg"}>
                <span className="cursor-pointer">
                  {uploading === "bg" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                  {loginBg ? "Replace background" : "Upload background"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading === "bg"}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "bg"); e.target.value = ""; }}
              />
            </label>
          </div>

          {/* Favicon */}
          <div className="space-y-2 pt-4 border-t border-border">
            <Label>Favicon</Label>
            <p className="text-xs text-muted-foreground">Shown in browser tabs. Square PNG recommended (e.g. 512×512).</p>
            <div className="flex items-center gap-3">
              {favicon ? (
                <img src={favicon} alt="Favicon preview" className="h-16 w-16 rounded-md border border-border object-contain bg-background" />
              ) : (
                <div className="h-16 w-16 rounded-md border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <label className="inline-flex">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading === "fav"}>
                  <span className="cursor-pointer">
                    {uploading === "fav" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                    {favicon ? "Replace favicon" : "Upload favicon"}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                  className="hidden"
                  disabled={uploading === "fav"}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "fav"); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input defaultValue="Superior Group of Colleges" />
          </div>
          <div className="space-y-2">
            <Label>Admin Email</Label>
            <Input defaultValue="admin@superior.edu.pk" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Receive email for new registrations</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deadline reminders</p>
              <p className="text-xs text-muted-foreground">Auto-remind students before deadlines</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
