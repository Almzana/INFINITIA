import * as React from "react"
import { addDays, format } from "date-fns"
import { can } from "@/lib/access"
import { useAuth } from "@/lib/auth"
import { announcementsApi } from "@/lib/announcements-api"
import { employeesApi } from "@/lib/employees-api"
import { leavesApi } from "@/lib/leaves-api"
import { meetingsApi } from "@/lib/meetings-api"
import { projectsApi } from "@/lib/projects-api"
import { useStore } from "@/lib/store"
import { timesheetApi } from "@/lib/timesheet-api"

const iso = (d: Date) => format(d, "yyyy-MM-dd")

/**
 * Loads company data from the API into the shared store whenever the signed-in user changes
 * (employees, leave, timesheet, announcements, projects, meeting rooms, and meetings from yesterday
 * to 30 days ahead — the rooms page loads other weeks on demand), so every page reads the same records.
 * What each role receives (e.g. salary, canEdit) is decided by the server.
 */
export function useDataSync() {
  const { user } = useAuth()
  const { dispatch } = useStore()
  const email = user?.email
  // HR has no access to projects (see lib/access.ts); the API would answer 403 anyway
  const loadProjects = can.viewProjects(user?.role)

  React.useEffect(() => {
    if (!email) return
    let cancelled = false
    const from = iso(addDays(new Date(), -1))
    const to = iso(addDays(new Date(), 30))
    const tsFrom = iso(addDays(new Date(), -35))

    // Independent requests in parallel; a failing one keeps its cached data
    void Promise.allSettled([
      employeesApi.listAll().then((r) => !cancelled && dispatch({ type: "employee/replace", employees: r.data })),
      meetingsApi.rooms().then((r) => !cancelled && dispatch({ type: "room/replace", rooms: r.data })),
      meetingsApi.list(from, to).then((r) => !cancelled && dispatch({ type: "booking/replaceRange", from, to, bookings: r.data })),
      announcementsApi.list().then((r) => !cancelled && dispatch({ type: "announcement/replace", announcements: r.data })),
      loadProjects ? projectsApi.list().then((r) => !cancelled && dispatch({ type: "project/replace", projects: r.data })) : Promise.resolve(),
      leavesApi.list().then((r) => !cancelled && dispatch({ type: "leave/replace", leaves: r.data })),
      // Recent weeks of the timesheet (own entries for staff, everyone's for executives)
      loadProjects
        ? timesheetApi.list(tsFrom, to).then((r) => !cancelled && dispatch({ type: "timesheet/replaceRange", employeeId: null, from: tsFrom, to, entries: r.data }))
        : Promise.resolve(),
    ])
    return () => {
      cancelled = true
    }
  }, [email, loadProjects, dispatch])
}
