import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, HelpCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  question_type?: string;
  options: any;
  correct_answer: number;
  correct_answer_text?: string;
  sort_order: number;
}

interface QuizPlayerProps {
  moduleId: string;
  questions: Question[];
  studentId: string;
  completed: boolean;
  onComplete: (score: number) => void;
}

export default function QuizPlayer({ moduleId, questions, studentId, completed, onComplete }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getQuestionType = (q: Question) => (q.question_type || "mcq") as "mcq" | "true_false" | "fill_blank";

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const isCurrentAnswered = () => {
    if (!currentQ) return false;
    const type = getQuestionType(currentQ);
    if (type === "fill_blank") return (textAnswers[currentQ.id] || "").trim().length > 0;
    return answers[currentQ.id] !== undefined;
  };

  const allAnswered = questions.every(q => {
    const type = getQuestionType(q);
    if (type === "fill_blank") return (textAnswers[q.id] || "").trim().length > 0;
    return answers[q.id] !== undefined;
  });

  const submitQuiz = useMutation({
    mutationFn: async () => {
      let score = 0;
      for (const q of questions) {
        const type = getQuestionType(q);
        if (type === "fill_blank") {
          if ((textAnswers[q.id] || "").trim().toLowerCase() === (q.correct_answer_text || "").trim().toLowerCase()) score++;
        } else {
          if (answers[q.id] === q.correct_answer) score++;
        }
      }
      const maxScore = questions.length;
      const { error } = await supabase.from("quiz_attempts").insert({
        student_id: studentId, module_id: moduleId,
        answers: { ...answers, ...textAnswers }, score, max_score: maxScore,
      });
      if (error) throw error;
      return { score, maxScore };
    },
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      onComplete(data.score);
      toast.success(`Quiz completed! Score: ${data.score}/${data.maxScore}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (completed && !submitted) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="font-medium">Quiz already completed</p>
          <p className="text-sm text-muted-foreground mt-1">You've already taken this quiz.</p>
        </CardContent>
      </Card>
    );
  }

  if (submitted && result) {
    const percentage = Math.round((result.score / result.maxScore) * 100);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" /> Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <p className="text-4xl font-bold">{result.score}/{result.maxScore}</p>
            <p className="text-muted-foreground mt-1">{percentage}% correct</p>
          </div>
          {questions.map((q, idx) => {
            const type = getQuestionType(q);
            const opts = Array.isArray(q.options) ? q.options : [];
            let isCorrect = false;
            if (type === "fill_blank") {
              isCorrect = (textAnswers[q.id] || "").trim().toLowerCase() === (q.correct_answer_text || "").trim().toLowerCase();
            } else {
              isCorrect = answers[q.id] === q.correct_answer;
            }
            const typeLabel = type === "mcq" ? "MCQ" : type === "true_false" ? "True/False" : "Fill in Blank";
            return (
              <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                <p className="font-medium text-sm mb-2">
                  {idx + 1}. {q.question}
                  <Badge variant="outline" className="ml-2 text-[10px]">{typeLabel}</Badge>
                  {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" /> : <AlertCircle className="h-4 w-4 text-destructive inline ml-2" />}
                </p>
                {type === "fill_blank" ? (
                  <div className="text-sm space-y-1">
                    <p>Your answer: <span className={isCorrect ? "text-green-700 font-medium" : "text-destructive line-through"}>{textAnswers[q.id] || "(empty)"}</span></p>
                    {!isCorrect && <p>Correct: <span className="text-green-700 font-medium">{q.correct_answer_text}</span></p>}
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    {opts.map((opt: string, i: number) => (
                      <div key={i} className={`px-3 py-1.5 rounded ${
                        i === q.correct_answer ? "text-green-700 font-medium" :
                        i === answers[q.id] && !isCorrect ? "text-destructive line-through" : "text-muted-foreground"
                      }`}>
                        {type === "true_false" ? opt : `${String.fromCharCode(65 + i)}. ${opt}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  const type = getQuestionType(currentQ);
  const opts = Array.isArray(currentQ.options) ? currentQ.options : [];
  const typeLabel = type === "mcq" ? "MCQ" : type === "true_false" ? "True/False" : "Fill in Blank";
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Quiz
          </CardTitle>
          <span className="text-sm text-muted-foreground font-medium">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="font-medium">{currentIndex + 1}. {currentQ.question}</p>
            <Badge variant="outline" className="text-[10px] shrink-0">{typeLabel}</Badge>
          </div>

          {type === "mcq" && (
            <RadioGroup
              value={answers[currentQ.id]?.toString()}
              onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQ.id]: parseInt(val) }))}
              className="space-y-2"
            >
              {opts.map((opt: string, i: number) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value={i.toString()} id={`${currentQ.id}-${i}`} />
                  <Label htmlFor={`${currentQ.id}-${i}`} className="text-sm cursor-pointer flex-1">{String.fromCharCode(65 + i)}. {opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {type === "true_false" && (
            <RadioGroup
              value={answers[currentQ.id]?.toString()}
              onValueChange={(val) => setAnswers(prev => ({ ...prev, [currentQ.id]: parseInt(val) }))}
              className="space-y-2"
            >
              {["True", "False"].map((label, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value={i.toString()} id={`${currentQ.id}-tf-${i}`} />
                  <Label htmlFor={`${currentQ.id}-tf-${i}`} className="text-sm cursor-pointer flex-1">{label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {type === "fill_blank" && (
            <Input
              placeholder="Type your answer..."
              value={textAnswers[currentQ.id] || ""}
              onChange={(e) => setTextAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
              className="max-w-md"
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          {isLastQuestion ? (
            <Button
              disabled={!allAnswered || submitQuiz.isPending}
              onClick={() => submitQuiz.mutate()}
            >
              {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={!isCurrentAnswered()}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
