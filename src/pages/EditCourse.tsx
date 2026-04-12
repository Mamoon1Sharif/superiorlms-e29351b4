import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Video, HelpCircle, FileText, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface VideoLesson { title: string; description: string; youtube_url: string; }
interface QuizQuestion { question: string; options: string[]; correct_answer: number; }
interface AssignmentDetail { instructions: string; deadline: string; max_marks: number; max_file_size_mb: number; }
interface ModuleData {
  id?: string;
  title: string;
  type: "video" | "quiz" | "assignment";
  videos: VideoLesson[];
  questions: QuizQuestion[];
  assignment: AssignmentDetail;
}

const emptyVideo = (): VideoLesson => ({ title: "", description: "", youtube_url: "" });
const emptyQuestion = (): QuizQuestion => ({ question: "", options: ["", "", "", ""], correct_answer: 0 });
const emptyAssignment = (): AssignmentDetail => ({ instructions: "", deadline: "", max_marks: 100, max_file_size_mb: 10 });

export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: campuses } = useQuery({
    queryKey: ["campuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("id, name, city");
      if (error) throw error;
      return data;
    },
  });

  const { data: course } = useQuery({
    queryKey: ["course-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_campuses(campus_id), modules(*, lessons(*), quiz_questions(*), assignment_details(*))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (course && !loaded) {
      setTitle(course.title);
      setDescription(course.description ?? "");
      setSelectedCampuses((course.course_campuses as any[])?.map((cc: any) => cc.campus_id) ?? []);
      const mods = ((course.modules as any[]) ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          type: m.type as "video" | "quiz" | "assignment",
          videos: (m.lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => ({
            title: l.title, description: l.description ?? "", youtube_url: l.youtube_url ?? "",
          })),
          questions: (m.quiz_questions ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((q: any) => ({
            question: q.question, options: q.options ?? ["", "", "", ""], correct_answer: q.correct_answer,
          })),
          assignment: m.assignment_details?.[0]
            ? { instructions: m.assignment_details[0].instructions, deadline: m.assignment_details[0].deadline?.slice(0, 16) ?? "", max_marks: m.assignment_details[0].max_marks, max_file_size_mb: m.assignment_details[0].max_file_size_mb ?? 10 }
            : emptyAssignment(),
        }));
      setModules(mods.length > 0 ? mods : []);
      setLoaded(true);
    }
  }, [course, loaded]);

  const toggleCampus = (cid: string) => setSelectedCampuses((p) => p.includes(cid) ? p.filter((c) => c !== cid) : [...p, cid]);
  const addModule = (type: "video" | "quiz" | "assignment") => setModules((p) => [...p, { title: "", type, videos: type === "video" ? [emptyVideo()] : [], questions: type === "quiz" ? [emptyQuestion()] : [], assignment: emptyAssignment() }]);
  const removeModule = (i: number) => setModules((p) => p.filter((_, idx) => idx !== i));
  const updateModule = (i: number, u: Partial<ModuleData>) => setModules((p) => p.map((m, idx) => idx === i ? { ...m, ...u } : m));

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      await supabase.from("courses").update({ title, description }).eq("id", id!);
      await supabase.from("course_campuses").delete().eq("course_id", id!);
      if (selectedCampuses.length > 0) {
        await supabase.from("course_campuses").insert(selectedCampuses.map((cid) => ({ course_id: id!, campus_id: cid })));
      }
      // Delete old modules (cascades to lessons, quiz_questions, assignment_details)
      await supabase.from("modules").delete().eq("course_id", id!);
      // Recreate modules
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        if (!mod.title.trim()) continue;
        const { data: dbMod } = await supabase.from("modules").insert({ course_id: id!, title: mod.title, type: mod.type, sort_order: i }).select().single();
        if (!dbMod) continue;
        if (mod.type === "video") {
          const valid = mod.videos.filter((v) => v.title.trim());
          if (valid.length) await supabase.from("lessons").insert(valid.map((v, vi) => ({ module_id: dbMod.id, title: v.title, description: v.description, youtube_url: v.youtube_url, sort_order: vi })));
        }
        if (mod.type === "quiz") {
          const valid = mod.questions.filter((q) => q.question.trim());
          if (valid.length) await supabase.from("quiz_questions").insert(valid.map((q, qi) => ({ module_id: dbMod.id, question: q.question, options: q.options, correct_answer: q.correct_answer, sort_order: qi })));
        }
        if (mod.type === "assignment") {
          await supabase.from("assignment_details").insert({ module_id: dbMod.id, instructions: mod.assignment.instructions, deadline: mod.assignment.deadline || null, max_marks: mod.assignment.max_marks, max_file_size_mb: mod.assignment.max_file_size_mb });
        }
      }
      toast.success("Course updated!");
      queryClient.invalidateQueries({ queryKey: ["courses-with-details"] });
      navigate("/courses");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!course && id) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Course</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Update modules, videos, quizzes, and assignments</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Course Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="space-y-2">
            <Label>Assign to Campuses</Label>
            <div className="flex flex-wrap gap-2">
              {(campuses ?? []).map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCampus(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedCampuses.includes(c.id) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modules</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addModule("video")}><Video className="h-3.5 w-3.5 mr-1" /> Video</Button>
            <Button variant="outline" size="sm" onClick={() => addModule("quiz")}><HelpCircle className="h-3.5 w-3.5 mr-1" /> Quiz</Button>
            <Button variant="outline" size="sm" onClick={() => addModule("assignment")}><FileText className="h-3.5 w-3.5 mr-1" /> Assignment</Button>
          </div>
        </div>

        {modules.map((mod, modIdx) => (
          <Card key={modIdx}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-[11px] shrink-0">
                  {mod.type === "video" && <><Video className="h-3 w-3 mr-1" />Video</>}
                  {mod.type === "quiz" && <><HelpCircle className="h-3 w-3 mr-1" />Quiz</>}
                  {mod.type === "assignment" && <><FileText className="h-3 w-3 mr-1" />Assignment</>}
                </Badge>
                <Input value={mod.title} onChange={(e) => updateModule(modIdx, { title: e.target.value })} placeholder="Module title" className="font-medium" />
                <Button variant="ghost" size="icon" onClick={() => removeModule(modIdx)} className="text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mod.type === "video" && mod.videos.map((vid, vi) => (
                <div key={vi} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between"><span className="text-xs font-medium text-muted-foreground">Video {vi + 1}</span>
                    {mod.videos.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateModule(modIdx, { videos: mod.videos.filter((_, i) => i !== vi) })}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                  <Input placeholder="Title" value={vid.title} onChange={(e) => { const v = [...mod.videos]; v[vi] = { ...v[vi], title: e.target.value }; updateModule(modIdx, { videos: v }); }} />
                  <Input placeholder="YouTube URL" value={vid.youtube_url} onChange={(e) => { const v = [...mod.videos]; v[vi] = { ...v[vi], youtube_url: e.target.value }; updateModule(modIdx, { videos: v }); }} />
                </div>
              ))}
              {mod.type === "video" && <Button variant="outline" size="sm" onClick={() => updateModule(modIdx, { videos: [...mod.videos, emptyVideo()] })}><Plus className="h-3 w-3 mr-1" /> Add Video</Button>}

              {mod.type === "quiz" && mod.questions.map((q, qi) => (
                <div key={qi} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between"><span className="text-xs font-medium text-muted-foreground">Q{qi + 1}</span>
                    {mod.questions.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateModule(modIdx, { questions: mod.questions.filter((_, i) => i !== qi) })}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                  <Input placeholder="Question" value={q.question} onChange={(e) => { const qs = [...mod.questions]; qs[qi] = { ...qs[qi], question: e.target.value }; updateModule(modIdx, { questions: qs }); }} />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`e-${modIdx}-${qi}`} checked={q.correct_answer === oi} onChange={() => { const qs = [...mod.questions]; qs[qi] = { ...qs[qi], correct_answer: oi }; updateModule(modIdx, { questions: qs }); }} className="accent-primary" />
                        <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => { const qs = [...mod.questions]; const opts = [...qs[qi].options]; opts[oi] = e.target.value; qs[qi] = { ...qs[qi], options: opts }; updateModule(modIdx, { questions: qs }); }} className="text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {mod.type === "quiz" && <Button variant="outline" size="sm" onClick={() => updateModule(modIdx, { questions: [...mod.questions, emptyQuestion()] })}><Plus className="h-3 w-3 mr-1" /> Add Question</Button>}

              {mod.type === "assignment" && (
                <>
                  <Textarea placeholder="Instructions..." value={mod.assignment.instructions} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, instructions: e.target.value } })} rows={3} />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Deadline</Label><Input type="datetime-local" value={mod.assignment.deadline} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, deadline: e.target.value } })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Max Marks</Label><Input type="number" value={mod.assignment.max_marks} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, max_marks: parseInt(e.target.value) || 0 } })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Max File Size (MB)</Label><Input type="number" value={mod.assignment.max_file_size_mb} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment, max_file_size_mb: parseInt(e.target.value) || 10 } })} /></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}</Button>
        <Button variant="outline" onClick={() => navigate("/courses")}>Cancel</Button>
      </div>
    </div>
  );
}
