import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Video, HelpCircle, FileText, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const courses = [
  { id: 1, title: "Full Stack Web Development", modules: 12, students: 340, campuses: ["Lahore", "Karachi"], status: "Published", progress: 85 },
  { id: 2, title: "Data Science & Analytics", modules: 10, students: 280, campuses: ["Islamabad", "Lahore"], status: "Published", progress: 72 },
  { id: 3, title: "Mobile App Development", modules: 8, students: 195, campuses: ["Karachi"], status: "Draft", progress: 45 },
  { id: 4, title: "Artificial Intelligence & ML", modules: 15, students: 410, campuses: ["Lahore", "Faisalabad", "Rawalpindi"], status: "Published", progress: 60 },
  { id: 5, title: "Cybersecurity Fundamentals", modules: 9, students: 150, campuses: ["Islamabad"], status: "Draft", progress: 30 },
  { id: 6, title: "Cloud Computing with AWS", modules: 11, students: 220, campuses: ["Lahore", "Karachi"], status: "Published", progress: 90 },
];

export default function Courses() {
  const [search, setSearch] = useState("");
  const filtered = courses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your course catalog</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Create Course
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((course) => (
          <Card key={course.id} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={course.status === "Published" ? "default" : "secondary"} className="text-[11px]">
                      {course.status}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Manage Modules</DropdownMenuItem>
                    <DropdownMenuItem>{course.status === "Published" ? "Unpublish" : "Publish"}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{course.modules} modules</span>
                <span>{course.students} students</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Videos</span>
                <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> Quizzes</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Assignments</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Avg. Progress</span>
                  <span className="font-medium">{course.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${course.progress}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {course.campuses.map((c) => (
                  <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
