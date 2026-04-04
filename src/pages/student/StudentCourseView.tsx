import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Video, HelpCircle, FileText, CheckCircle2, Lock, ChevronRight } from "lucide-react";
import VideoPlayer from "@/components/student/VideoPlayer";
import QuizPlayer from "@/components/student/QuizPlayer";
import AssignmentSubmission from "@/components/student/AssignmentSubmission";

interface ContentItem {
  id: string;
  moduleId: string;
  moduleTitle: string;
  type: "video" | "quiz" | "assignment";
  title: string;
  sortOrder: number;
  moduleSortOrder: number;
  data: any;
}

export default function StudentCourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: student } = useQuery({
    queryKey: ["my-student", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students").select("id").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: course } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("id, title, description").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: modules } = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules").select("*").eq("course_id", courseId!).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lessons } = useQuery({
    queryKey: ["course-lessons", courseId],
    queryFn: async () => {
      if (!modules?.length) return [];
      const moduleIds = modules.filter(m => m.type === "video").map(m => m.id);
      if (!moduleIds.length) return [];
      const { data, error } = await supabase
        .from("lessons").select("*").in("module_id", moduleIds).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!modules?.length,
  });

  const { data: quizQuestions } = useQuery({
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      if (!modules?.length) return [];
      const moduleIds = modules.filter(m => m.type === "quiz").map(m => m.id);
      if (!moduleIds.length) return [];
      const { data, error } = await supabase
        .from("quiz_questions").select("*").in("module_id", moduleIds).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!modules?.length,
  });

  const { data: assignments } = useQuery({
    queryKey: ["course-assignments", courseId],
    queryFn: async () => {
      if (!modules?.length) return [];
      const moduleIds = modules.filter(m => m.type === "assignment").map(m => m.id);
      if (!moduleIds.length) return [];
      const { data, error } = await supabase
        .from("assignment_details").select("*").in("module_id", moduleIds);
      if (error) throw error;
      return data;
    },
    enabled: !!modules?.length,
  });

  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ["my-progress", student?.id, courseId],
    queryFn: async () => {
      if (!modules?.length) return [];
      const moduleIds = modules.map(m => m.id);
      const { data, error } = await supabase
        .from("student_progress")
        .select("*")
        .eq("student_id", student!.id)
        .in("module_id", moduleIds);
      if (error) throw error;
      return data;
    },
    enabled: !!student && !!modules?.length,
  });

  // Build flat sequential content list
  const contentItems: ContentItem[] = useMemo(() => {
    if (!modules) return [];
    const items: ContentItem[] = [];

    for (const mod of modules) {
      if (mod.type === "video") {
        const modLessons = (lessons ?? []).filter(l => l.module_id === mod.id);
        for (const lesson of modLessons) {
          items.push({
            id: lesson.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            type: "video",
            title: lesson.title,
            sortOrder: lesson.sort_order,
            moduleSortOrder: mod.sort_order,
            data: lesson,
          });
        }
      } else if (mod.type === "quiz") {
        items.push({
          id: mod.id,
          moduleId: mod.id,
          moduleTitle: mod.title,
          type: "quiz",
          title: mod.title,
          sortOrder: 0,
          moduleSortOrder: mod.sort_order,
          data: (quizQuestions ?? []).filter(q => q.module_id === mod.id),
        });
      } else if (mod.type === "assignment") {
        const modAssignments = (assignments ?? []).filter(a => a.module_id === mod.id);
        for (const assignment of modAssignments) {
          items.push({
            id: assignment.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            type: "assignment",
            title: mod.title,
            sortOrder: 0,
            moduleSortOrder: mod.sort_order,
            data: assignment,
          });
        }
        if (!modAssignments.length) {
          items.push({
            id: mod.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            type: "assignment",
            title: mod.title,
            sortOrder: 0,
            moduleSortOrder: mod.sort_order,
            data: null,
          });
        }
      }
    }

    return items;
  }, [modules, lessons, quizQuestions, assignments]);

  const isItemCompleted = (item: ContentItem) => {
    return progress?.some(p => p.item_id === item.id && p.completed) ?? false;
  };

  const isItemUnlocked = (index: number) => {
    if (index === 0) return true;
    // All previous items must be completed
    for (let i = 0; i < index; i++) {
      if (!isItemCompleted(contentItems[i])) return false;
    }
    return true;
  };

  const markComplete = useMutation({
    mutationFn: async ({ itemId, moduleId, itemType, score }: { itemId: string; moduleId: string; itemType: string; score?: number }) => {
      const { error } = await supabase.from("student_progress").upsert({
        student_id: student!.id,
        module_id: moduleId,
        item_type: itemType,
        item_id: itemId,
        completed: true,
        score: score ?? null,
      }, { onConflict: "student_id,item_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProgress();
      queryClient.invalidateQueries({ queryKey: ["my-progress"] });
    },
  });

  const currentItem = contentItems[activeIndex];
  const completedCount = contentItems.filter(isItemCompleted).length;
  const progressPercent = contentItems.length ? Math.round((completedCount / contentItems.length) * 100) : 0;

  const typeIcon = (type: string) => {
    if (type === "video") return <Video className="h-3.5 w-3.5" />;
    if (type === "quiz") return <HelpCircle className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };

  if (!course || !student) {
    return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/student">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{course.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{completedCount}/{contentItems.length} completed</span>
            <span>·</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Sidebar - Content list */}
        <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-140px)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Course Content</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-240px)]">
            <CardContent className="p-2">
              {contentItems.map((item, idx) => {
                const completed = isItemCompleted(item);
                const unlocked = isItemUnlocked(idx);
                const isActive = idx === activeIndex;

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => unlocked && setActiveIndex(idx)}
                    disabled={!unlocked}
                    className={`w-full text-left p-3 rounded-lg mb-1 flex items-center gap-3 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : unlocked
                        ? "hover:bg-muted/80 text-foreground"
                        : "opacity-50 cursor-not-allowed text-muted-foreground"
                    }`}
                  >
                    <div className="shrink-0">
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : unlocked ? (
                        typeIcon(item.type)
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-xs">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{item.type}</p>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Main content area */}
        <div>
          {currentItem ? (
            <>
              {currentItem.type === "video" && (
                <VideoPlayer
                  lesson={currentItem.data}
                  completed={isItemCompleted(currentItem)}
                  onComplete={() =>
                    markComplete.mutate({
                      itemId: currentItem.id,
                      moduleId: currentItem.moduleId,
                      itemType: "video",
                    })
                  }
                />
              )}
              {currentItem.type === "quiz" && (
                <QuizPlayer
                  moduleId={currentItem.moduleId}
                  questions={currentItem.data}
                  studentId={student!.id}
                  completed={isItemCompleted(currentItem)}
                  onComplete={(score) =>
                    markComplete.mutate({
                      itemId: currentItem.id,
                      moduleId: currentItem.moduleId,
                      itemType: "quiz",
                      score,
                    })
                  }
                />
              )}
              {currentItem.type === "assignment" && (
                <AssignmentSubmission
                  assignment={currentItem.data}
                  studentId={student!.id}
                  completed={isItemCompleted(currentItem)}
                  onComplete={() =>
                    markComplete.mutate({
                      itemId: currentItem.id,
                      moduleId: currentItem.moduleId,
                      itemType: "assignment",
                    })
                  }
                />
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex(activeIndex - 1)}
                >
                  ← Previous
                </Button>
                {activeIndex < contentItems.length - 1 && isItemCompleted(currentItem) && (
                  <Button
                    size="sm"
                    onClick={() => setActiveIndex(activeIndex + 1)}
                  >
                    Next →
                  </Button>
                )}
                {activeIndex === contentItems.length - 1 && isItemCompleted(currentItem) && (
                  <Badge variant="default" className="text-sm py-1.5 px-3">🎉 Course Complete!</Badge>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                This course has no content yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
