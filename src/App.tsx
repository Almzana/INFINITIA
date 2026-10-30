import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { Skeleton } from "@/components/ui/skeleton"
import LoginPage from "@/pages/login"

const DashboardPage = lazy(() => import("@/pages/dashboards"))
const EmployeesPage = lazy(() => import("@/pages/employees"))
const LeavePage = lazy(() => import("@/pages/leave"))
const ProjectsPage = lazy(() => import("@/pages/projects"))
const ProjectDetailPage = lazy(() => import("@/pages/projects/detail"))
const TimesheetPage = lazy(() => import("@/pages/timesheet"))
const RoomsPage = lazy(() => import("@/pages/rooms"))
const AnnouncementsPage = lazy(() => import("@/pages/announcements"))
const SettingsPage = lazy(() => import("@/pages/settings"))
const AuditPage = lazy(() => import("@/pages/audit"))
const ChangePasswordPage = lazy(() => import("@/pages/change-password"))
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"))
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"))
const NotFoundPage = lazy(() => import("@/pages/not-found"))
const DevConsolePage = lazy(() => import("@/pages/dev"))

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

const page = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Outside the app shell: reachable signed out (forgot / reset) or before the first password change */}
      <Route path="/forgot-password" element={page(<ForgotPasswordPage />)} />
      <Route path="/reset-password" element={page(<ResetPasswordPage />)} />
      <Route path="/change-password" element={page(<ChangePasswordPage />)} />
      {/* Developer console: its own full-screen layout; the server only serves its data in dev / test */}
      <Route path="/dev" element={page(<DevConsolePage />)} />
      <Route element={<AppLayout />}>
        <Route index element={page(<DashboardPage />)} />
        <Route path="employees" element={page(<EmployeesPage />)} />
        <Route path="leave" element={page(<LeavePage />)} />
        <Route path="projects" element={page(<ProjectsPage />)} />
        <Route path="projects/:id" element={page(<ProjectDetailPage />)} />
        <Route path="timesheet" element={page(<TimesheetPage />)} />
        <Route path="rooms" element={page(<RoomsPage />)} />
        <Route path="announcements" element={page(<AnnouncementsPage />)} />
        <Route path="settings" element={page(<SettingsPage />)} />
        <Route path="audit" element={page(<AuditPage />)} />
        <Route path="*" element={page(<NotFoundPage />)} />
      </Route>
    </Routes>
  )
}
