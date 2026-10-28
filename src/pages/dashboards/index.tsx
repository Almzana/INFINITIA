import { lazy } from "react"
import { useAuth } from "@/lib/auth"

const ExecutiveDashboard = lazy(() => import("./executive"))
const HrDashboard = lazy(() => import("./hr"))
const StaffDashboard = lazy(() => import("@/pages/dashboard"))

/** Home page: each role gets its own dashboard. */
export default function RoleDashboard() {
  const { user } = useAuth()
  if (user?.role === "executive") return <ExecutiveDashboard />
  if (user?.role === "hr") return <HrDashboard />
  return <StaffDashboard />
}
