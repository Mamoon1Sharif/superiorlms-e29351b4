import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import FileUploadField from "@/components/FileUploadField";
import { ArrowLeft, Save, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function CapstoneSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["capstone-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("capstone_settings").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxFileSize, setMaxFileSize] = useState(25);
  const [deadline, setDeadline] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title ?? "Final Capstone Project");
    setInstructions(data.instructions ?? "");
    setMaxFileSize(data.max_file_size_mb ?? 25);
    setDeadline(data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : "");
    setIsPublished(!!data.is_published);
    setCoverUrl(data.cover_url ?? null);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        id: true,
        title: title.trim() || "Final Capstone Project",
        instructions,
        max_file_size_mb: Math.max(1, Math.min(200, Number(maxFileSize) || 25)),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        is_published: isPublished,
        cover_url: coverUrl,
      };
      const { error } = await supabase.from("capstone_settings").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capstone settings saved");
      qc.invalidateQueries({ queryKey: ["capstone-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/courses"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Courses</Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" /> Capstone Project
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Final project students complete after all 8 courses.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Settings</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="published" className="text-sm">Published</Label>
                <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>

            <div>
              <Label>Cover image (optional)</Label>
              <FileUploadField
                value={coverUrl}
                onChange={setCoverUrl}
                bucket="course-covers"
                accept="image/*"
                kind="image"
              />
            </div>

            <div>
              <Label>Instructions for students</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={10}
                maxLength={5000}
                placeholder="Explain what students must submit: portfolio links, files, proof of earnings, deliverables, evaluation criteria, etc."
              />
              <p className="text-[11px] text-muted-foreground mt-1">{instructions.length}/5000 characters</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Max file size (MB)</Label>
                <Input type="number" min={1} max={200} value={maxFileSize} onChange={(e) => setMaxFileSize(Number(e.target.value))} />
              </div>
              <div>
                <Label>Deadline (optional)</Label>
                <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Saving..." : "Save Capstone Settings"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
