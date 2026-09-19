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
    { key: "dashboard", label: "Dashboard", path: "/admin/dashboard" },
    { key: "users", label: "User Center", path: "/admin/user-center" },
    { key: "super_admins", label: "Manage Super Admins", path: "/admin/super-admins" },
    { key: "semesters", label: "Semesters", path: "/admin/semesters" },
    { key: "students", label: "Manage Students", path: "/admin/students" },
    { key: "teachers", label: "Manage Teachers", path: "/admin/teachers" },
    { key: "courses", label: "Manage Courses", path: "/admin/courses" },
    { key: "coursework", label: "Assessment Creation", path: "/admin/coursework" },
    { key: "approvals", label: "Assessment Approvals", path: "/admin/coursework-approvals" },
    { key: "groups", label: "Group Approvals", path: "/admin/groups" },
    { key: "reports", label: "Course Result", path: "/admin/reports" },
    { key: "email", label: "Email", path: "/admin/email-students" },
    { key: "whatsapp", label: "WhatsApp", path: "/admin/whatsapp" },
    { key: "messages", label: "Messages", path: "/admin/messages" },
    { key: "settings", label: "Settings", path: "/admin/settings" },
  ],
  [ROLES.TEACHER]: [
    { key: "dashboard", label: "Dashboard", path: "/teacher/dashboard" },
    { key: "courses", label: "My Courses", path: "/teacher/courses" },
    { key: "coursework", label: "Assessment", path: "/teacher/coursework" },
    { key: "groups", label: "Student Groups", path: "/teacher/groups" },
    { key: "submissions", label: "Submissions", path: "/teacher/submissions" },
    { key: "grading", label: "Course Result", path: "/teacher/grading" },
    { key: "email", label: "Email", path: "/teacher/email-students" },
    { key: "whatsapp", label: "WhatsApp", path: "/teacher/whatsapp" },
    { key: "messages", label: "Messages", path: "/teacher/messages" },
  ],
  [ROLES.STUDENT]: [
    { key: "dashboard", label: "Dashboard", path: "/student/dashboard" },
    { key: "courses", label: "My Courses", path: "/student/courses" },
    { key: "groups", label: "Class Groups", path: "/student/groups" },
    { key: "grades", label: "Course Result", path: "/student/grades" },
    { key: "submit", label: "Assessment Workflow", path: "/student/submit" },
    { key: "messages", label: "Messages", path: "/student/messages" },
  ],
};

export const MODULE_CATALOG = {
  teacher: [
    { key: "courses", label: "My Courses" },
    { key: "coursework", label: "Assessment" },
    { key: "groups", label: "Student Groups" },
    { key: "submissions", label: "Submissions" },
    { key: "grading", label: "Course Result" },
    { key: "email", label: "Email" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "messages", label: "Messages" },
  ],
  student: [
    { key: "courses", label: "My Courses" },
    { key: "groups", label: "Class Groups" },
    { key: "grades", label: "Course Result" },
    { key: "submit", label: "Assessment Workflow" },
    { key: "messages", label: "Messages" },
  ],
};

export const visibleNavItems = (role, isModuleOn, labelFor) =>
  (NAV_ITEMS[role] || [])
    .filter((item) => isModuleOn(role, item.key))
    .map((item) => ({ ...item, label: labelFor(role, item.key, item.label) }));
