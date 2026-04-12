import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function TeacherGrading() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [comments, setComments] = useState("");

  const { data: teacher } = useQuery({
    queryKey: ["my-teacher-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: classAssignments } = useQuery({
    queryKey: ["my-class-assignments", teacher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_class_assignments")
        .select("class_id")
        .eq("teacher_id", teacher!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!teacher,
  });

  const assignedClassIds = classAssignments?.map((a) => a.class_id) ?? [];

  const { data: myStudents } = useQuery({
    queryKey: ["my-students-ids", assignedClassIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, name").in("class_id", assignedClassIds);
      if (error) throw error;
      return data;
    },
    enabled: assignedClassIds.length > 0,
  });

  const myStudentIds = myStudents?.map((s) => s.id) ?? [];

  const { data: submissions } = useQuery({
    queryKey: ["class-submissions", myStudentIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .in("student_id", myStudentIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: myStudentIds.length > 0,
  });

  const { data: assignmentDetails } = useQuery({
    queryKey: ["assignment-details-for-grading"],
    queryFn: async () => {
      const assignmentIds = [...new Set(submissions?.map((s) => s.assignment_id) ?? [])];
      if (assignmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("assignment_details")
        .select("*, modules(title, course_id, courses(title))")
        .in("id", assignmentIds);
      if (error) throw error;
      return data;
    },
    enabled: (submissions?.length ?? 0) > 0,
  });

  const gradeSubmission = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({ grade: parseInt(grade), grading_comments: comments, graded: true })
        .eq("id", gradingSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-submissions"] });
      toast.success("Submission graded");
      setGradingSubmission(null);
      setGrade("");
      setComments("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getStudentName = (studentId: string) =>
    myStudents?.find((s) => s.id === studentId)?.name ?? "Unknown";

  const getAssignment = (assignmentId: string) =>
    assignmentDetails?.find((a: any) => a.id === assignmentId);

  const ungraded = submissions?.filter((s) => !s.graded) ?? [];
  const graded = submissions?.filter((s) => s.graded) ?? [];

  if (assignedClassIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Assignment Grading</h1>
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No classes assigned yet</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Assignment Grading</h1>

      <div>
        <h3 className="text-sm font-semibold mb-3">Pending Grading ({ungraded.length})</h3>
        {ungraded.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No submissions to grade</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {ungraded.map((s) => {
              const assignment = getAssignment(s.assignment_id);
              return (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getStudentName(s.student_id).split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{getStudentName(s.student_id)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(assignment as any)?.modules?.courses?.title} · {(assignment as any)?.modules?.title}
                        </p>
                        {s.submission_text && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.submission_text}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.file_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={s.file_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5 mr-1" /> File
                          </a>
                        </Button>
                      )}
                      <Button size="sm" onClick={() => { setGradingSubmission(s); setGrade(""); setComments(""); }}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Grade
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Graded ({graded.length})</h3>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Assignment</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Comments</th>
                </tr>
              </thead>
              <tbody>
                {graded.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">No graded submissions</td></tr>
                ) : graded.map((s) => {
                  const assignment = getAssignment(s.assignment_id);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{getStudentName(s.student_id)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{(assignment as any)?.modules?.title ?? "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="default" className="text-[11px]">{s.grade}/{(assignment as any)?.max_marks ?? 100}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{(s as any).grading_comments || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!gradingSubmission} onOpenChange={(v) => { if (!v) setGradingSubmission(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          {gradingSubmission && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{getStudentName(gradingSubmission.student_id)}</p>
                {gradingSubmission.submission_text && (
                  <p className="text-xs text-muted-foreground mt-1">{gradingSubmission.submission_text}</p>
                )}
                {gradingSubmission.file_url && (
                  <a href={gradingSubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
                    <FileText className="h-3 w-3" /> View attached file <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div>
                <Label>Grade (out of {getAssignment(gradingSubmission.assignment_id)?.max_marks ?? 100})</Label>
                <Input type="number" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Enter marks" />
              </div>
              <div>
                <Label>Comments (optional)</Label>
                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Feedback for the student..." rows={3} />
              </div>
              <Button className="w-full" onClick={() => gradeSubmission.mutate()} disabled={!grade || gradeSubmission.isPending}>
                Submit Grade
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
