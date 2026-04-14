import { CircularProgress, Stack } from "@mui/material";
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ROLES } from "./utils/roleConfig";

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CoursesPage = lazy(() => import("./pages/admin/CoursesPage"));
const CourseworkPage = lazy(() => import("./pages/admin/CourseworkPage"));
const GroupsPage = lazy(() => import("./pages/admin/GroupsPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const SemestersPage = lazy(() => import("./pages/admin/SemestersPage"));
const StudentsPage = lazy(() => import("./pages/admin/StudentsPage"));
const SuperAdminsPage = lazy(() => import("./pages/admin/SuperAdminsPage"));
const TeachersPage = lazy(() => import("./pages/admin/TeachersPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));

const GradesPage = lazy(() => import("./pages/student/GradesPage"));
const MyCourseworkPage = lazy(() => import("./pages/student/MyCourseworkPage"));
const MyStudentCoursesPage = lazy(() => import("./pages/student/MyStudentCoursesPage"));
const StudentCourseworkPage = lazy(() => import("./pages/student/StudentCourseworkPage"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentGroupsPage = lazy(() => import("./pages/student/StudentGroupsPage"));
const SubmitWorkPage = lazy(() => import("./pages/student/SubmitWorkPage"));

const GradingPage = lazy(() => import("./pages/teacher/GradingPage"));
const MyCoursesPage = lazy(() => import("./pages/teacher/MyCoursesPage"));
const SubmissionsPage = lazy(() => import("./pages/teacher/SubmissionsPage"));
const TeacherCourseworkPage = lazy(() => import("./pages/teacher/TeacherCourseworkPage"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherGroupsPage = lazy(() => import("./pages/teacher/TeacherGroupsPage"));

const Loader = () => (
  <Stack alignItems="center" justifyContent="center" minHeight="100vh">
    <CircularProgress />
  </Stack>
);

const AdminUsersRedirect = () => {
  const location = useLocation();
  const role = new URLSearchParams(location.search).get("role");
  if (role === "teacher") return <Navigate to="/admin/teachers" replace />;
  if (role === "student") return <Navigate to="/admin/students" replace />;
  if (role === "super_admin") return <Navigate to="/admin/super-admins" replace />;
  return <Navigate to="/admin/user-center" replace />;
};

function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/user-center" element={<UsersPage pageTitle="Admin User Center" />} />
            <Route path="/admin/super-admins" element={<SuperAdminsPage />} />
            <Route path="/admin/semesters" element={<SemestersPage />} />
            <Route path="/admin/users" element={<AdminUsersRedirect />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/teachers" element={<TeachersPage />} />
            <Route path="/admin/courses" element={<CoursesPage />} />
            <Route path="/admin/coursework" element={<CourseworkPage />} />
            <Route path="/admin/coursework-approvals" element={<SubmissionsPage />} />
            <Route path="/admin/groups" element={<GroupsPage />} />
            <Route path="/admin/groups/create" element={<GroupsPage />} />
            <Route path="/admin/group" element={<GroupsPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/courses" element={<MyCoursesPage />} />
            <Route path="/teacher/coursework" element={<TeacherCourseworkPage />} />
            <Route path="/teacher/groups" element={<TeacherGroupsPage />} />
            <Route path="/teacher/submissions" element={<SubmissionsPage />} />
            <Route path="/teacher/grading" element={<GradingPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/my-coursework" element={<MyCourseworkPage />} />
            <Route path="/student/courses" element={<MyStudentCoursesPage />} />
            <Route path="/student/coursework" element={<StudentCourseworkPage />} />
            <Route path="/student/submit" element={<SubmitWorkPage />} />
            <Route path="/student/groups" element={<StudentGroupsPage />} />
            <Route path="/student/grades" element={<GradesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
