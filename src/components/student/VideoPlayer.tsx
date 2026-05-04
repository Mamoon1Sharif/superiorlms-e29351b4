import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Play } from "lucide-react";

interface VideoPlayerProps {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    youtube_url: string | null;
    thumbnail_url?: string | null;
  };
  completed: boolean;
  onComplete: () => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId = "";
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") || "";
    } else if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export default function VideoPlayer({ lesson, completed, onComplete }: VideoPlayerProps) {
  const embedUrl = lesson.youtube_url ? getYouTubeEmbedUrl(lesson.youtube_url) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            {lesson.title}
          </CardTitle>
          {completed && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          )}
        </div>
        {lesson.description && (
          <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {embedUrl ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : lesson.thumbnail_url ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No video URL provided</p>
          </div>
        )}

        {!completed && (
          <Button onClick={onComplete} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Completed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
