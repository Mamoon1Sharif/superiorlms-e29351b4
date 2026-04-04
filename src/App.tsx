import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import StudentLayout from "@/components/StudentLayout";
import Dashboard from "@/pages/Dashboard";
import Courses from "@/pages/Courses";
import CreateCourse from "@/pages/CreateCourse";
import EditCourse from "@/pages/EditCourse";
import UsersPage from "@/pages/UsersPage";
import Campuses from "@/pages/Campuses";
import Analytics from "@/pages/Analytics";
import Notifications from "@/pages/Notifications";
import SettingsPage from "@/pages/SettingsPage";
import StudentLogin from "@/pages/student/StudentLogin";
import StudentRegister from "@/pages/student/StudentRegister";
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentCatalog from "@/pages/student/StudentCatalog";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Admin routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/create" element={<CreateCourse />} />
              <Route path="/courses/edit/:id" element={<EditCourse />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/campuses" element={<Campuses />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            {/* Student auth */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />
            {/* Student portal (protected) */}
            <Route element={<StudentLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/catalog" element={<StudentCatalog />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
