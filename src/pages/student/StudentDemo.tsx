import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Video, HelpCircle, FileText, CheckCircle2, ChevronRight, GraduationCap, Lock } from "lucide-react";
import VideoPlayer from "@/components/student/VideoPlayer";
import brandLogo from "@/assets/superior-logo.png";

interface ContentItem {
  id: string;
  moduleId: string;
  moduleTitle: string;
  type: "video" | "quiz" | "assignment";
  title: string;
  data: any;
}

export default function StudentDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // First published course by lowest sequence
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["demo-first-course"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, cover_url, sequence")
        .eq("status", "Published")
        .order("sequence", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const courseId = course?.id;

  const { data: modules } = useQuery({
    queryKey: ["demo-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("modules").select("*").eq("course_id", courseId!).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const moduleIds = useMemo(() => modules?.map((m) => m.id) ?? [], [modules]);

  const { data: lessons } = useQuery({
    queryKey: ["demo-lessons", courseId],
    queryFn: async () => {
      if (!moduleIds.length) return [];
      const { data, error } = await supabase.from("lessons").select("*").in("module_id", moduleIds).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: moduleIds.length > 0,
  });

  const { data: quizQuestions } = useQuery({
    queryKey: ["demo-quizzes", courseId],
    queryFn: async () => {
      if (!moduleIds.length) return [];
      const { data, error } = await supabase.from("quiz_questions").select("*").in("module_id", moduleIds).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: moduleIds.length > 0,
  });

  const { data: assignments } = useQuery({
    queryKey: ["demo-assignments", courseId],
    queryFn: async () => {
      if (!moduleIds.length) return [];
      const { data, error } = await supabase.from("assignment_details").select("*").in("module_id", moduleIds);
      if (error) throw error;
      return data;
    },
    enabled: moduleIds.length > 0,
  });

  const contentItems: ContentItem[] = useMemo(() => {
    if (!modules) return [];
    const items: ContentItem[] = [];
    for (const mod of modules) {
      const modLessons = (lessons ?? []).filter((l) => l.module_id === mod.id);
      for (const lesson of modLessons) {
        items.push({ id: lesson.id, moduleId: mod.id, moduleTitle: mod.title, type: "video", title: lesson.title, data: lesson });
      }
      const modQuestions = (quizQuestions ?? []).filter((q) => q.module_id === mod.id);
      if (modQuestions.length > 0) {
        items.push({ id: mod.id, moduleId: mod.id, moduleTitle: mod.title, type: "quiz", title: `${mod.title} - Quiz`, data: modQuestions });
      }
      const modAssignments = (assignments ?? []).filter((a) => a.module_id === mod.id);
      for (const assignment of modAssignments) {
        items.push({ id: assignment.id, moduleId: mod.id, moduleTitle: mod.title, type: "assignment", title: `${mod.title} - Assignment`, data: assignment });
      }
    }
    return items;
  }, [modules, lessons, quizQuestions, assignments]);

  const isItemCompleted = (item: ContentItem) => completedIds.has(`${item.type}-${item.id}`);
  const markComplete = (item: ContentItem) => setCompletedIds((prev) => new Set(prev).add(`${item.type}-${item.id}`));

  const currentItem = contentItems[activeIndex];
  const completedCount = contentItems.filter(isItemCompleted).length;
  const progressPercent = contentItems.length ? Math.round((completedCount / contentItems.length) * 100) : 0;

  const typeIcon = (type: string) => {
    if (type === "video") return <Video className="h-3.5 w-3.5" />;
    if (type === "quiz") return <HelpCircle className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };

  const groupedByModule = useMemo(() => {
    const groups: { moduleTitle: string; items: { item: ContentItem; globalIndex: number }[] }[] = [];
    let currentModule = "";
    for (let i = 0; i < contentItems.length; i++) {
      const item = contentItems[i];
      if (item.moduleId !== currentModule) {
        groups.push({ moduleTitle: item.moduleTitle, items: [] });
        currentModule = item.moduleId;
      }
      groups[groups.length - 1].items.push({ item, globalIndex: i });
    }
    return groups;
  }, [contentItems]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/login" className="flex items-center gap-2">
              <img src={brandLogo} alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
              <span className="font-bold text-sm tracking-tight">Superior Group of Colleges</span>
            </Link>
            <Badge variant="secondary" className="ml-2 gap-1">
              <GraduationCap className="h-3 w-3" /> Demo Mode
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/student/register"><Button size="sm">Sign Up</Button></Link>
            <Link to="/login"><Button size="sm" variant="outline">Exit Demo</Button></Link>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            You're previewing the first course in demo mode. Progress is not saved.
            Quizzes and assignments are read-only — <Link to="/student/register" className="text-primary font-medium hover:underline">register</Link> to submit answers.
          </CardContent>
        </Card>

        {courseLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading demo course...</div>
        ) : !course ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No published courses available.</CardContent></Card>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Link to="/login"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">{course.title}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{completedCount}/{contentItems.length} completed</span>
                  <span>·</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            </div>

            {course.cover_url && (
              <div className="relative w-full h-24 sm:h-32 rounded-lg overflow-hidden bg-muted">
                <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
              <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-140px)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Course Content</CardTitle></CardHeader>
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <CardContent className="p-2">
                    {groupedByModule.map((group, gi) => (
                      <div key={gi} className="mb-3">
                        <p className="text-[11px] font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider">{group.moduleTitle}</p>
                        {group.items.map(({ item, globalIndex }) => {
                          const completed = isItemCompleted(item);
                          const isActive = globalIndex === activeIndex;
                          return (
                            <button
                              key={`${item.type}-${item.id}`}
                              onClick={() => setActiveIndex(globalIndex)}
                              className={`w-full text-left p-3 rounded-lg mb-1 flex items-center gap-3 text-sm transition-colors ${
                                isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <div className="shrink-0">
                                {completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : typeIcon(item.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-xs">{item.title}</p>
                                <p className="text-[11px] text-muted-foreground capitalize">{item.type}</p>
                              </div>
                              {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    {!contentItems.length && (
                      <p className="text-xs text-muted-foreground text-center py-4">No content in this course yet.</p>
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>

              <div>
                {currentItem ? (
                  currentItem.type === "video" ? (
                    <VideoPlayer
                      lesson={currentItem.data}
                      completed={isItemCompleted(currentItem)}
                      onComplete={() => markComplete(currentItem)}
                    />
                  ) : currentItem.type === "quiz" ? (
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />{currentItem.title}</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {(currentItem.data as any[]).map((q, i) => (
                          <div key={q.id} className="space-y-2">
                            <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                            {q.question_type === "mcq" && Array.isArray(q.options) && (
                              <ul className="space-y-1 pl-4">
                                {q.options.map((opt: string, oi: number) => (
                                  <li key={oi} className="text-sm text-muted-foreground">• {opt}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                        <div className="rounded-md border border-dashed p-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> Sign up to attempt this quiz.
                        </div>
                        <Button onClick={() => markComplete(currentItem)} variant="outline" className="w-full">
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Reviewed
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{currentItem.title}</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm whitespace-pre-wrap">{currentItem.data.instructions}</p>
                        {currentItem.data.pdf_url && (
                          <a href={currentItem.data.pdf_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View attached PDF</a>
                        )}
                        <div className="rounded-md border border-dashed p-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> Sign up to submit this assignment.
                        </div>
                        <Button onClick={() => markComplete(currentItem)} variant="outline" className="w-full">
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Reviewed
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">This course has no content yet.</CardContent></Card>
                )}

                {currentItem && (
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" size="sm" disabled={activeIndex === 0} onClick={() => setActiveIndex(activeIndex - 1)}>← Previous</Button>
                    {activeIndex < contentItems.length - 1 && (
                      <Button size="sm" onClick={() => setActiveIndex(activeIndex + 1)}>Next →</Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
