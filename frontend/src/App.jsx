import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import FeatureRoute from "./routes/FeatureRoute";
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
const EmailStudentsPage = lazy(() => import("./pages/shared/EmailStudentsPage"));
const WhatsAppPage = lazy(() => import("./pages/shared/WhatsAppPage"));
const MessagesPage = lazy(() => import("./pages/shared/MessagesPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const WebsiteCmsPage = lazy(() => import("./pages/admin/WebsiteCmsPage"));
const CalendarNoticesPage = lazy(() => import("./pages/campus/CalendarNoticesPage"));
const AttendancePage = lazy(() => import("./pages/campus/AttendancePage"));
const TranscriptPage = lazy(() => import("./pages/campus/TranscriptPage"));
const AppealsPage = lazy(() => import("./pages/campus/AppealsPage"));
const HelpGuidesPage = lazy(() => import("./pages/campus/HelpGuidesPage"));
const BulkImportPage = lazy(() => import("./pages/campus/BulkImportPage"));
const AuditLogPage = lazy(() => import("./pages/campus/AuditLogPage"));
const BackupPage = lazy(() => import("./pages/campus/BackupPage"));
const RecycleBinPage = lazy(() => import("./pages/campus/RecycleBinPage"));
const TemplatesPage = lazy(() => import("./pages/campus/TemplatesPage"));
const CommentBankPage = lazy(() => import("./pages/campus/CommentBankPage"));
const RubricPage = lazy(() => import("./pages/campus/RubricPage"));
const DeadlinesPage = lazy(() => import("./pages/campus/DeadlinesPage"));
const GradingQueuePage = lazy(() => import("./pages/campus/GradingQueuePage"));

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
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={null}>
            <LoginPage />
          </Suspense>
        }
      />

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
            <Route path="/admin/email-students" element={<EmailStudentsPage />} />
            <Route path="/admin/whatsapp" element={<WhatsAppPage />} />
            <Route path="/admin/messages" element={<MessagesPage />} />
            <Route path="/admin/website" element={<WebsiteCmsPage />} />
            <Route path="/admin/calendar" element={<CalendarNoticesPage />} />
            <Route path="/admin/import" element={<BulkImportPage />} />
            <Route path="/admin/audit" element={<AuditLogPage />} />
            <Route path="/admin/backup" element={<BackupPage />} />
            <Route path="/admin/recycle" element={<RecycleBinPage />} />
            <Route path="/admin/help" element={<HelpGuidesPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/courses" element={<FeatureRoute feature="courses"><MyCoursesPage /></FeatureRoute>} />
            <Route path="/teacher/coursework" element={<FeatureRoute feature="coursework"><TeacherCourseworkPage /></FeatureRoute>} />
            <Route path="/teacher/groups" element={<FeatureRoute feature="groups"><TeacherGroupsPage /></FeatureRoute>} />
            <Route path="/teacher/submissions" element={<FeatureRoute feature="submissions"><SubmissionsPage /></FeatureRoute>} />
            <Route path="/teacher/grading" element={<FeatureRoute feature="grading"><GradingPage /></FeatureRoute>} />
            <Route path="/teacher/email-students" element={<FeatureRoute feature="email"><EmailStudentsPage /></FeatureRoute>} />
            <Route path="/teacher/whatsapp" element={<FeatureRoute feature="whatsapp"><WhatsAppPage /></FeatureRoute>} />
            <Route path="/teacher/messages" element={<FeatureRoute feature="messages"><MessagesPage /></FeatureRoute>} />
            <Route path="/teacher/calendar" element={<FeatureRoute feature="calendar"><CalendarNoticesPage /></FeatureRoute>} />
            <Route path="/teacher/attendance" element={<FeatureRoute feature="attendance"><AttendancePage /></FeatureRoute>} />
            <Route path="/teacher/appeals" element={<FeatureRoute feature="appeals"><AppealsPage /></FeatureRoute>} />
            <Route path="/teacher/templates" element={<FeatureRoute feature="templates"><TemplatesPage /></FeatureRoute>} />
            <Route path="/teacher/comments" element={<FeatureRoute feature="comments"><CommentBankPage /></FeatureRoute>} />
            <Route path="/teacher/rubrics" element={<FeatureRoute feature="rubric"><RubricPage /></FeatureRoute>} />
            <Route path="/teacher/queue" element={<FeatureRoute feature="queue"><GradingQueuePage /></FeatureRoute>} />
            <Route path="/teacher/help" element={<FeatureRoute feature="help"><HelpGuidesPage /></FeatureRoute>} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/my-coursework" element={<MyCourseworkPage />} />
            <Route path="/student/courses" element={<FeatureRoute feature="courses"><MyStudentCoursesPage /></FeatureRoute>} />
            <Route path="/student/coursework" element={<StudentCourseworkPage />} />
            <Route path="/student/submit" element={<FeatureRoute feature="submit"><SubmitWorkPage /></FeatureRoute>} />
            <Route path="/student/groups" element={<FeatureRoute feature="groups"><StudentGroupsPage /></FeatureRoute>} />
            <Route path="/student/grades" element={<FeatureRoute feature="grades"><GradesPage /></FeatureRoute>} />
            <Route path="/student/messages" element={<FeatureRoute feature="messages"><MessagesPage /></FeatureRoute>} />
            <Route path="/student/calendar" element={<FeatureRoute feature="calendar"><CalendarNoticesPage /></FeatureRoute>} />
            <Route path="/student/attendance" element={<FeatureRoute feature="attendance"><AttendancePage /></FeatureRoute>} />
            <Route path="/student/transcript" element={<FeatureRoute feature="transcript"><TranscriptPage /></FeatureRoute>} />
            <Route path="/student/appeals" element={<FeatureRoute feature="appeals"><AppealsPage /></FeatureRoute>} />
            <Route path="/student/help" element={<FeatureRoute feature="help"><HelpGuidesPage /></FeatureRoute>} />
            <Route path="/student/deadlines" element={<FeatureRoute feature="deadlines"><DeadlinesPage /></FeatureRoute>} />
          </Route>
        </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
