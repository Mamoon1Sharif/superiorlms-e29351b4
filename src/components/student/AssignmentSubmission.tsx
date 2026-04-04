import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileText, Calendar, Award } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AssignmentSubmissionProps {
  assignment: {
    id: string;
    instructions: string;
    deadline: string | null;
    max_marks: number;
    module_id: string;
  } | null;
  studentId: string;
  completed: boolean;
  onComplete: () => void;
}

export default function AssignmentSubmission({ assignment, studentId, completed, onComplete }: AssignmentSubmissionProps) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

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

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignment_submissions").upsert({
        student_id: studentId,
        assignment_id: assignment!.id,
        submission_text: text,
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

  const isOverdue = assignment.deadline && new Date(assignment.deadline) < new Date();

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
        {assignment.deadline && (
          <div className="flex items-center gap-1.5 text-xs mt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
              Due: {format(new Date(assignment.deadline), "PPp")}
              {isOverdue && " (Overdue)"}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium mb-1">Instructions:</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Your Answer:</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your answer here..."
            className="min-h-[200px]"
          />
        </div>

        <Button
          className="w-full"
          disabled={!text.trim() || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Assignment"}
        </Button>
      </CardContent>
    </Card>
  );
}
