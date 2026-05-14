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
import { Plus, Trash2, Video, HelpCircle, FileText, ArrowLeft, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import CoverImageUpload from "@/components/CoverImageUpload";
import FileUploadField from "@/components/FileUploadField";

interface VideoLesson { title: string; description: string; youtube_url: string; thumbnail_url: string | null; }
interface QuizQuestion { question: string; question_type: "mcq" | "true_false" | "fill_blank"; options: string[]; correct_answer: number; correct_answer_text: string; }
interface AssignmentDetail { instructions: string; pdf_url: string | null; max_marks: number; max_file_size_mb: number; }
interface ModuleData {
  id?: string;
  title: string;
  videos: VideoLesson[];
  questions: QuizQuestion[];
  assignment: AssignmentDetail | null;
}

const emptyVideo = (): VideoLesson => ({ title: "", description: "", youtube_url: "", thumbnail_url: null });
const emptyMcq = (): QuizQuestion => ({ question: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: 0, correct_answer_text: "" });
const emptyTrueFalse = (): QuizQuestion => ({ question: "", question_type: "true_false", options: ["True", "False"], correct_answer: 0, correct_answer_text: "" });
const emptyFillBlank = (): QuizQuestion => ({ question: "", question_type: "fill_blank", options: [], correct_answer: 0, correct_answer_text: "" });
const emptyAssignment = (): AssignmentDetail => ({ instructions: "", pdf_url: null, max_marks: 100, max_file_size_mb: 10 });

export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);


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
      setCoverUrl((course as any).cover_url ?? null);
      
      const mods = ((course.modules as any[]) ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          videos: (m.lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => ({
            title: l.title, description: l.description ?? "", youtube_url: l.youtube_url ?? "", thumbnail_url: l.thumbnail_url ?? null,
          })),
          questions: (m.quiz_questions ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((q: any) => ({
            question: q.question,
            question_type: (q.question_type || "mcq") as "mcq" | "true_false" | "fill_blank",
            options: q.options ?? ["", "", "", ""],
            correct_answer: q.correct_answer,
            correct_answer_text: q.correct_answer_text ?? "",
          })),
          assignment: m.assignment_details?.[0]
            ? { instructions: m.assignment_details[0].instructions, pdf_url: m.assignment_details[0].pdf_url ?? null, max_marks: m.assignment_details[0].max_marks, max_file_size_mb: m.assignment_details[0].max_file_size_mb ?? 10 }
            : null,
        }));
      setModules(mods.length > 0 ? mods : []);
      setLoaded(true);
    }
  }, [course, loaded]);

  const addModule = () => setModules((p) => [...p, { title: "", videos: [], questions: [], assignment: null }]);
  const removeModule = (i: number) => setModules((p) => p.filter((_, idx) => idx !== i));
  const updateModule = (i: number, u: Partial<ModuleData>) => setModules((p) => p.map((m, idx) => idx === i ? { ...m, ...u } : m));

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      await supabase.from("courses").update({ title, description, cover_url: coverUrl }).eq("id", id!);
      await supabase.from("modules").delete().eq("course_id", id!);

      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        if (!mod.title.trim()) continue;
        const hasVideos = mod.videos.some(v => v.title.trim());
        const hasQuiz = mod.questions.some(q => q.question.trim());
        const hasAssignment = mod.assignment && mod.assignment.instructions.trim();
        const moduleType = hasVideos ? "video" : hasQuiz ? "quiz" : hasAssignment ? "assignment" : "video";

        const { data: dbMod } = await supabase.from("modules").insert({ course_id: id!, title: mod.title, type: moduleType, sort_order: i }).select().single();
        if (!dbMod) continue;

        const validVideos = mod.videos.filter((v) => v.title.trim());
        if (validVideos.length > 0) {
          await supabase.from("lessons").insert(validVideos.map((v, vi) => ({ module_id: dbMod.id, title: v.title, description: v.description, youtube_url: v.youtube_url, thumbnail_url: v.thumbnail_url, sort_order: vi })));
        }

        const validQs = mod.questions.filter((q) => q.question.trim());
        if (validQs.length > 0) {
          await supabase.from("quiz_questions").insert(validQs.map((q, qi) => ({
            module_id: dbMod.id, question: q.question, question_type: q.question_type,
            options: q.options, correct_answer: q.correct_answer,
            correct_answer_text: q.correct_answer_text, sort_order: qi,
          })));
        }

        if (mod.assignment && mod.assignment.instructions.trim()) {
          await supabase.from("assignment_details").insert({
            module_id: dbMod.id, instructions: mod.assignment.instructions,
            pdf_url: mod.assignment.pdf_url, max_marks: mod.assignment.max_marks,
            max_file_size_mb: mod.assignment.max_file_size_mb,
          });
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
          <CoverImageUpload value={coverUrl} onChange={setCoverUrl} />
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modules</h2>
          <Button variant="outline" size="sm" onClick={addModule}><Plus className="h-3.5 w-3.5 mr-1" /> Add Module</Button>
        </div>

        {modules.map((mod, modIdx) => (
          <ModuleEditor key={modIdx} mod={mod} modIdx={modIdx} updateModule={updateModule} removeModule={removeModule} />
        ))}
      </div>

      <div className="flex gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}</Button>
        <Button variant="outline" onClick={() => navigate("/courses")}>Cancel</Button>
      </div>
    </div>
  );
}

function ModuleEditor({ mod, modIdx, updateModule, removeModule }: {
  mod: ModuleData; modIdx: number;
  updateModule: (i: number, u: Partial<ModuleData>) => void;
  removeModule: (i: number) => void;
}) {
  const addVideo = () => updateModule(modIdx, { videos: [...mod.videos, emptyVideo()] });
  const addQuestion = (type: "mcq" | "true_false" | "fill_blank") => {
    const q = type === "mcq" ? emptyMcq() : type === "true_false" ? emptyTrueFalse() : emptyFillBlank();
    updateModule(modIdx, { questions: [...mod.questions, q] });
  };
  const toggleAssignment = () => updateModule(modIdx, { assignment: mod.assignment ? null : emptyAssignment() });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input value={mod.title} onChange={(e) => updateModule(modIdx, { title: e.target.value })} placeholder="Module title" className="font-medium" />
          <Button variant="ghost" size="icon" onClick={() => removeModule(modIdx)} className="text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addVideo}><Video className="h-3.5 w-3.5 mr-1" /> Add Video</Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("mcq")}><HelpCircle className="h-3.5 w-3.5 mr-1" /> MCQ</Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("true_false")}><HelpCircle className="h-3.5 w-3.5 mr-1" /> True/False</Button>
          <Button variant="outline" size="sm" onClick={() => addQuestion("fill_blank")}><HelpCircle className="h-3.5 w-3.5 mr-1" /> Fill in Blank</Button>
          {!mod.assignment && <Button variant="outline" size="sm" onClick={toggleAssignment}><FileText className="h-3.5 w-3.5 mr-1" /> Add Assignment</Button>}
        </div>

        {mod.videos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Video className="h-3 w-3" /> Videos</p>
            {mod.videos.map((vid, vi) => (
              <div key={vi} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between"><span className="text-xs font-medium text-muted-foreground">Video {vi + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateModule(modIdx, { videos: mod.videos.filter((_, i) => i !== vi) })}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Input placeholder="Title" value={vid.title} onChange={(e) => { const v = [...mod.videos]; v[vi] = { ...v[vi], title: e.target.value }; updateModule(modIdx, { videos: v }); }} />
                <Input placeholder="YouTube URL" value={vid.youtube_url} onChange={(e) => { const v = [...mod.videos]; v[vi] = { ...v[vi], youtube_url: e.target.value }; updateModule(modIdx, { videos: v }); }} />
                <FileUploadField
                  value={vid.thumbnail_url}
                  onChange={(url) => { const v = [...mod.videos]; v[vi] = { ...v[vi], thumbnail_url: url }; updateModule(modIdx, { videos: v }); }}
                  bucket="video-thumbnails"
                  accept="image/*"
                  kind="image"
                  label="Video thumbnail"
                  maxSizeMB={5}
                />
              </div>
            ))}
          </div>
        )}

        {mod.questions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><HelpCircle className="h-3 w-3" /> Quiz Questions</p>
            {mod.questions.map((q, qi) => (
              <QuestionEditor key={qi} q={q} qi={qi} modIdx={modIdx} mod={mod} updateModule={updateModule} />
            ))}
          </div>
        )}

        {mod.assignment && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Assignment</p>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={toggleAssignment}><Trash2 className="h-3 w-3" /></Button>
            </div>
            <Textarea placeholder="Instructions..." value={mod.assignment.instructions} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment!, instructions: e.target.value } })} rows={3} />
            <FileUploadField
              value={mod.assignment.pdf_url}
              onChange={(url) => updateModule(modIdx, { assignment: { ...mod.assignment!, pdf_url: url } })}
              bucket="assignment-pdfs"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              kind="document"
              label="Assignment File (PDF or Word, optional)"
              buttonLabel="Upload PDF or Word"
              maxSizeMB={20}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Max Marks</Label><Input type="number" value={mod.assignment.max_marks} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment!, max_marks: parseInt(e.target.value) || 0 } })} /></div>
              <div className="space-y-1"><Label className="text-xs">Max Submission File (MB)</Label><Input type="number" value={mod.assignment.max_file_size_mb} onChange={(e) => updateModule(modIdx, { assignment: { ...mod.assignment!, max_file_size_mb: parseInt(e.target.value) || 10 } })} /></div>
            </div>
          </div>
        )}

        {mod.videos.length === 0 && mod.questions.length === 0 && !mod.assignment && (
          <p className="text-sm text-muted-foreground text-center py-4">Add videos, quiz questions, or an assignment to this module.</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionEditor({ q, qi, modIdx, mod, updateModule }: {
  q: QuizQuestion; qi: number; modIdx: number; mod: ModuleData;
  updateModule: (i: number, u: Partial<ModuleData>) => void;
}) {
  const updateQ = (updates: Partial<QuizQuestion>) => {
    const qs = [...mod.questions];
    qs[qi] = { ...qs[qi], ...updates };
    updateModule(modIdx, { questions: qs });
  };
  const removeQ = () => updateModule(modIdx, { questions: mod.questions.filter((_, i) => i !== qi) });
  const typeLabel = q.question_type === "mcq" ? "MCQ" : q.question_type === "true_false" ? "True/False" : "Fill in Blank";

  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Q{qi + 1}</span>
          <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeQ}><Trash2 className="h-3 w-3" /></Button>
      </div>
      <Input placeholder="Question" value={q.question} onChange={(e) => updateQ({ question: e.target.value })} />
      {q.question_type === "mcq" && (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" name={`e-${modIdx}-${qi}`} checked={q.correct_answer === oi} onChange={() => updateQ({ correct_answer: oi })} className="accent-primary" />
              <Input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={(e) => { const opts = [...q.options]; opts[oi] = e.target.value; updateQ({ options: opts }); }} className="text-sm" />
            </div>
          ))}
        </div>
      )}
      {q.question_type === "true_false" && (
        <div className="flex gap-4">
          {["True", "False"].map((label, i) => (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name={`tf-${modIdx}-${qi}`} checked={q.correct_answer === i} onChange={() => updateQ({ correct_answer: i })} className="accent-primary" />
              {label}
            </label>
          ))}
        </div>
      )}
      {q.question_type === "fill_blank" && (
        <Input placeholder="Correct answer" value={q.correct_answer_text} onChange={(e) => updateQ({ correct_answer_text: e.target.value })} className="text-sm" />
      )}
    </div>
  );
}
