import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileText, Award, Upload, X, Paperclip } from "lucide-react";
import { toast } from "sonner";

interface AssignmentSubmissionProps {
  assignment: {
    id: string;
    instructions: string;
    deadline?: string | null;
    pdf_url?: string | null;
    max_marks: number;
    max_file_size_mb?: number;
    module_id: string;
  } | null;
  studentId: string;
  completed: boolean;
  onComplete: () => void;
}

export default function AssignmentSubmission({ assignment, studentId, completed, onComplete }: AssignmentSubmissionProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const maxSizeMB = assignment?.max_file_size_mb ?? 10;
  const allowedTypes = [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  const { data: existingSubmission } = useQuery({
    queryKey: ["my-submission", studentId, assignment?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("student_id", studentId)
        .eq("assignment_id", assignment!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!assignment?.id && !!studentId,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max size is ${maxSizeMB}MB`);
      return;
    }
    if (!allowedTypes.includes(selected.type)) {
      toast.error("Unsupported file type. Please upload PDF, PPT, Word, or video files.");
      return;
    }
    setFile(selected);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${studentId}/${assignment!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("assignment-files").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const { error } = await supabase.from("assignment_submissions").upsert({
        student_id: studentId,
        assignment_id: assignment!.id,
        submission_text: text,
        ...(fileUrl && { file_url: fileUrl, file_name: fileName }),
      }, { onConflict: "student_id,assignment_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment submitted!");
      queryClient.invalidateQueries({ queryKey: ["my-submission"] });
      onComplete();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!assignment) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No assignment details available.
        </CardContent>
      </Card>
    );
  }

  if (existingSubmission || completed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" /> Assignment Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-1">Your Submission:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {existingSubmission?.submission_text || "Submitted"}
            </p>
          </div>
          {existingSubmission?.file_name && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Paperclip className="h-4 w-4 text-primary shrink-0" />
              <a
                href={existingSubmission.file_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline truncate"
              >
                {existingSubmission.file_name}
              </a>
            </div>
          )}
          {existingSubmission?.graded && (
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Grade: {existingSubmission.grade}/{assignment.max_marks}
              </span>
            </div>
          )}
          {existingSubmission && !existingSubmission.graded && (
            <Badge variant="secondary">Awaiting grading</Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Assignment
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="h-3.5 w-3.5" /> {assignment.max_marks} marks
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium mb-1">Instructions:</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
        </div>

        {assignment.pdf_url && (
          <a
            href={assignment.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-primary underline truncate flex-1">Download assignment PDF</span>
          </a>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Description / Comments:</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your work, add comments..."
            className="min-h-[150px]"
          />
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Upload Document <span className="text-muted-foreground font-normal">(max {maxSizeMB}MB — PDF, PPT, Word, Video)</span></p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.webm,.mov"
            onChange={handleFileSelect}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Paperclip className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm truncate flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choose File
            </Button>
          )}
        </div>

        <Button
          className="w-full"
          disabled={(!text.trim() && !file) || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Assignment"}
        </Button>
      </CardContent>
    </Card>
  );
}
