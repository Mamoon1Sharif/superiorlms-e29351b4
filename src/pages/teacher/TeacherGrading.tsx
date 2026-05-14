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
import { CheckCircle2, FileText, ExternalLink, GraduationCap, Link as LinkIcon } from "lucide-react";
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

  // Capstone submissions for my students
  const { data: capstoneSubs, refetch: refetchCapstone } = useQuery({
    queryKey: ["capstone-subs", myStudentIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("capstone_submissions").select("*").in("student_id", myStudentIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: myStudentIds.length > 0,
  });

  const [capstoneReview, setCapstoneReview] = useState<any>(null);
  const [capGrade, setCapGrade] = useState("");
  const [capComments, setCapComments] = useState("");
  const [capStatus, setCapStatus] = useState<"Approved" | "Rejected">("Approved");

  const reviewCapstone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("capstone_submissions").update({
        grade: capGrade ? parseInt(capGrade) : null,
        grading_comments: capComments,
        status: capStatus,
        graded: true,
        graded_by: user?.id ?? null,
        graded_at: new Date().toISOString(),
      }).eq("id", capstoneReview.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capstone reviewed");
      setCapstoneReview(null); setCapGrade(""); setCapComments(""); setCapStatus("Approved");
      refetchCapstone();
    },
    onError: (e: any) => toast.error(e.message),
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

      {/* Capstone reviews */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" /> Capstone Submissions ({capstoneSubs?.length ?? 0})
        </h3>
        {(capstoneSubs?.length ?? 0) === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No capstone submissions yet</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {capstoneSubs!.map((s: any) => (
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
                      <p className="text-xs text-muted-foreground">
                        {(s.profile_links?.length ?? 0)} link(s) · {(s.files?.length ?? 0)} file(s)
                        {s.description && " · has description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={s.status === "Approved" ? "default" : s.status === "Rejected" ? "destructive" : "secondary"}>
                      {s.status}
                    </Badge>
                    <Button size="sm" variant={s.graded ? "outline" : "default"} onClick={() => {
                      setCapstoneReview(s);
                      setCapGrade(s.grade?.toString() ?? "");
                      setCapComments(s.grading_comments ?? "");
                      setCapStatus(s.status === "Rejected" ? "Rejected" : "Approved");
                    }}>
                      {s.graded ? "Re-review" : "Review"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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

      {/* Capstone review dialog */}
      <Dialog open={!!capstoneReview} onOpenChange={(v) => { if (!v) setCapstoneReview(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Capstone Submission</DialogTitle>
          </DialogHeader>
          {capstoneReview && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{getStudentName(capstoneReview.student_id)}</p>

              {(capstoneReview.profile_links?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Profile / Portfolio Links</p>
                  <div className="space-y-1">
                    {capstoneReview.profile_links.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 underline">
                        <LinkIcon className="h-3 w-3" /> {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(capstoneReview.files?.filter((f: any) => f.kind === "submission")?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Project Files</p>
                  <div className="space-y-1">
                    {capstoneReview.files.filter((f: any) => f.kind === "submission").map((f: any, i: number) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 underline">
                        <FileText className="h-3 w-3" /> {f.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(capstoneReview.files?.filter((f: any) => f.kind === "earnings")?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Proof of Earnings</p>
                  <div className="space-y-1">
                    {capstoneReview.files.filter((f: any) => f.kind === "earnings").map((f: any, i: number) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 underline">
                        <FileText className="h-3 w-3" /> {f.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {capstoneReview.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Description</p>
                  <p className="text-sm whitespace-pre-wrap p-3 rounded-md bg-muted/40">{capstoneReview.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Decision</Label>
                  <div className="flex gap-2 mt-1">
                    <Button type="button" size="sm" variant={capStatus === "Approved" ? "default" : "outline"} onClick={() => setCapStatus("Approved")}>Approve</Button>
                    <Button type="button" size="sm" variant={capStatus === "Rejected" ? "destructive" : "outline"} onClick={() => setCapStatus("Rejected")}>Reject</Button>
                  </div>
                </div>
                <div>
                  <Label>Grade (out of 100, optional)</Label>
                  <Input type="number" min={0} max={100} value={capGrade} onChange={(e) => setCapGrade(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Comments</Label>
                <Textarea value={capComments} onChange={(e) => setCapComments(e.target.value)} rows={3} placeholder="Feedback for the student..." />
              </div>

              <Button className="w-full" onClick={() => reviewCapstone.mutate()} disabled={reviewCapstone.isPending}>
                {reviewCapstone.isPending ? "Saving..." : "Submit Review"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
