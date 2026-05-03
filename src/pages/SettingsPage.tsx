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
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const [loginBg, setLoginBg] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(44);
  const [savingSize, setSavingSize] = useState(false);
  const [uploading, setUploading] = useState<"bg" | "fav" | "logo" | null>(null);

  useEffect(() => {
    fetchAppSettings().then((s) => {
      setLoginBg(s.login_background_url);
      setFavicon(s.favicon_url);
      setLogo(s.logo_url);
      setLogoSize(s.logo_size);
    });
  }, []);

  const upload = async (file: File, kind: "bg" | "fav" | "logo") => {
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

      const column = kind === "bg" ? "login_background_url" : kind === "fav" ? "favicon_url" : "logo_url";
      const { error: updErr } = await (supabase as any)
        .from("app_settings")
        .update({ [column]: url, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (updErr) throw updErr;

      if (kind === "bg") setLoginBg(url);
      else if (kind === "fav") { setFavicon(url); applyFavicon(url); }
      else setLogo(url);
      toast.success("Updated");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const saveLogoSize = async (size: number) => {
    setSavingSize(true);
    try {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update({ logo_size: size, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
      toast.success("Logo size saved");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSavingSize(false);
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

          {/* Logo */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label>Organization Logo</Label>
            <p className="text-xs text-muted-foreground">Shown on the login screen left panel. Transparent PNG recommended.</p>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/90">
              {logo ? (
                <img src={logo} alt="Logo preview" style={{ height: logoSize, width: "auto" }} className="object-contain" />
              ) : (
                <div className="h-11 w-11 rounded-md border-2 border-dashed border-white/40 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-white/60" />
                </div>
              )}
            </div>
            <label className="inline-flex">
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading === "logo"}>
                <span className="cursor-pointer">
                  {uploading === "logo" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                  {logo ? "Replace logo" : "Upload logo"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading === "logo"}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "logo"); e.target.value = ""; }}
              />
            </label>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Logo height: {logoSize}px</Label>
                <Button type="button" size="sm" variant="ghost" disabled={savingSize} onClick={() => saveLogoSize(logoSize)}>
                  {savingSize ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save size"}
                </Button>
              </div>
              <Slider min={24} max={120} step={2} value={[logoSize]} onValueChange={(v) => setLogoSize(v[0])} />
            </div>
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

    </div>
  );
}
