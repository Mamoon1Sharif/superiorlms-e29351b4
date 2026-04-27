import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import StudentLayout from "@/components/StudentLayout";
import TeacherLayout from "@/components/TeacherLayout";
import CampusAdminLayout from "@/components/CampusAdminLayout";
import RoleGuard from "@/components/guards/RoleGuard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Courses from "@/pages/Courses";
import CreateCourse from "@/pages/CreateCourse";
import EditCourse from "@/pages/EditCourse";
import UsersPage from "@/pages/UsersPage";
import Campuses from "@/pages/Campuses";
import InstituteManagement from "@/pages/InstituteManagement";
import Analytics from "@/pages/Analytics";
import Notifications from "@/pages/Notifications";
import SettingsPage from "@/pages/SettingsPage";
import StudentRegister from "@/pages/student/StudentRegister";
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentCatalog from "@/pages/student/StudentCatalog";
import StudentCourseView from "@/pages/student/StudentCourseView";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherStudents from "@/pages/teacher/TeacherStudents";
import TeacherGrading from "@/pages/teacher/TeacherGrading";
import TeacherSetup from "@/pages/teacher/TeacherSetup";
import CampusAdminDashboard from "@/pages/campus-admin/CampusAdminDashboard";
import CampusAdminStudents from "@/pages/campus-admin/CampusAdminStudents";
import CampusAdminStudentDetail from "@/pages/campus-admin/CampusAdminStudentDetail";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/teacher/setup" element={<TeacherSetup />} />
            <Route path="/student/register" element={<StudentRegister />} />

            {/* Admin routes */}
            <Route element={<RoleGuard allowedRoles={["admin"]}><DashboardLayout /></RoleGuard>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/create" element={<CreateCourse />} />
              <Route path="/courses/edit/:id" element={<EditCourse />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/campuses" element={<Campuses />} />
              <Route path="/institute" element={<InstituteManagement />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Teacher routes */}
            <Route element={<RoleGuard allowedRoles={["teacher"]}><TeacherLayout /></RoleGuard>}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/students" element={<TeacherStudents />} />
              <Route path="/teacher/grading" element={<TeacherGrading />} />
            </Route>

            {/* Campus Admin routes */}
            <Route element={<RoleGuard allowedRoles={["campus_admin"]}><CampusAdminLayout /></RoleGuard>}>
              <Route path="/campus-admin" element={<CampusAdminDashboard />} />
              <Route path="/campus-admin/students" element={<CampusAdminStudents />} />
              <Route path="/campus-admin/students/:id" element={<CampusAdminStudentDetail />} />
            </Route>

            {/* Student routes */}
            <Route element={<RoleGuard allowedRoles={["student"]}><StudentLayout /></RoleGuard>}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/catalog" element={<StudentCatalog />} />
              <Route path="/student/course/:courseId" element={<StudentCourseView />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
