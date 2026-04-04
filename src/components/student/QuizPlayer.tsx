import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, HelpCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  options: any;
  correct_answer: number;
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
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);

  const submitQuiz = useMutation({
    mutationFn: async () => {
      let score = 0;
      for (const q of questions) {
        if (answers[q.id] === q.correct_answer) score++;
      }
      const maxScore = questions.length;

      // Save attempt
      const { error } = await supabase.from("quiz_attempts").insert({
        student_id: studentId,
        module_id: moduleId,
        answers: answers,
        score,
        max_score: maxScore,
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

  const allAnswered = questions.every(q => answers[q.id] !== undefined);

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
            const opts = Array.isArray(q.options) ? q.options : [];
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            return (
              <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                <p className="font-medium text-sm mb-2">
                  {idx + 1}. {q.question}
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 inline ml-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive inline ml-2" />
                  )}
                </p>
                <div className="space-y-1 text-sm">
                  {opts.map((opt: string, i: number) => (
                    <div key={i} className={`px-3 py-1.5 rounded ${
                      i === q.correct_answer ? "text-green-700 font-medium" :
                      i === userAnswer && !isCorrect ? "text-destructive line-through" : "text-muted-foreground"
                    }`}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Quiz
        </CardTitle>
        <p className="text-sm text-muted-foreground">{questions.length} questions · Answer all to submit</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, idx) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          return (
            <div key={q.id} className="space-y-3">
              <p className="font-medium text-sm">{idx + 1}. {q.question}</p>
              <RadioGroup
                value={answers[q.id]?.toString()}
                onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: parseInt(val) }))}
              >
                {opts.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={i.toString()} id={`${q.id}-${i}`} />
                    <Label htmlFor={`${q.id}-${i}`} className="text-sm cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        })}

        <Button
          className="w-full"
          disabled={!allAnswered || submitQuiz.isPending}
          onClick={() => submitQuiz.mutate()}
        >
          {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
        </Button>
      </CardContent>
    </Card>
  );
}
