export const ROLES = {
  SUPER_ADMIN: "super_admin",
  TEACHER: "teacher",
  STUDENT: "student",
};

export const ROLE_HOME_ROUTE = {
  [ROLES.SUPER_ADMIN]: "/admin/dashboard",
  [ROLES.TEACHER]: "/teacher/dashboard",
  [ROLES.STUDENT]: "/student/dashboard",
};

export const NAV_ITEMS = {
  [ROLES.SUPER_ADMIN]: [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "User Center", path: "/admin/user-center" },
    { label: "Manage Super Admins", path: "/admin/super-admins" },
    { label: "Semesters", path: "/admin/semesters" },
    { label: "Manage Students", path: "/admin/students" },
    { label: "Manage Teachers", path: "/admin/teachers" },
    { label: "Manage Courses", path: "/admin/courses" },
    { label: "Coursework Creation", path: "/admin/coursework" },
    { label: "Coursework Approvals", path: "/admin/coursework-approvals" },
    { label: "Group Approvals", path: "/admin/groups" },
    { label: "Course Result", path: "/admin/reports" },
  ],
  [ROLES.TEACHER]: [
    { label: "Dashboard", path: "/teacher/dashboard" },
    { label: "My Courses", path: "/teacher/courses" },
    { label: "Coursework", path: "/teacher/coursework" },
    { label: "Student Groups", path: "/teacher/groups" },
    { label: "Submissions", path: "/teacher/submissions" },
    { label: "Course Result", path: "/teacher/grading" },
  ],
  [ROLES.STUDENT]: [
    { label: "Dashboard", path: "/student/dashboard" },
    { label: "My Courses", path: "/student/courses" },
    { label: "Class Groups", path: "/student/groups" },
    { label: "Course Result", path: "/student/grades" },
    { label: "Coursework Workflow", path: "/student/submit" },
  ],
};
