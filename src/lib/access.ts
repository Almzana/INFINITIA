import type { Role } from "@/lib/auth"

/**
 * Who may see which part of the app. This only shapes the UI (menus, routes, buttons);
 * the API enforces the same rules on every request.
 *
 * | page          | staff         | hr        | executive |
 * | projects      | view          | –         | all       |
 * | timesheet     | own           | –         | all       |
 * | employees     | view          | manage    | manage    |
 * | leave         | own requests  | approve   | approve   |
 * | rooms         | yes           | yes       | yes       |
 * | announcements | read          | manage    | manage    |
 */
const ALL: Role[] = ["staff", "hr", "executive"]

export const pageRoles: Record<string, Role[]> = {
  "/": ALL,
  "/projects": ["staff", "executive"],
  "/timesheet": ["staff", "executive"],
  "/employees": ALL,
  "/leave": ALL,
  "/rooms": ALL,
  "/announcements": ALL,
  "/settings": ALL,
  // Activity trail of who changed what (HR actions included), executives only
  "/audit": ["executive"],
}

export function canSeePage(url: string, role: Role | undefined) {
  if (!role) return false
  return (pageRoles[url] ?? ALL).includes(role)
}

/**
 * Where to go after signing in: back to the page the user came from only if this account may open
 * it (the previous visitor of the same browser may have been someone else, e.g. on /dev), else home.
 */
export function landingAfterLogin(from: string | undefined, user: { role: Role; isDeveloper?: boolean }) {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return "/"
  const path = from.split(/[?#]/)[0]
  if (path === "/login") return "/"
  if (path === "/dev" || path.startsWith("/dev/")) return user.isDeveloper ? from : "/"
  // Pages are listed by their first segment (e.g. /projects covers /projects/PR001)
  const section = `/${path.split("/")[1] ?? ""}`
  return canSeePage(section, user.role) ? from : "/"
}

const managers = (role: Role | undefined) => role === "hr" || role === "executive"

export const can = {
  manageEmployees: managers,
  manageAnnouncements: managers,
  approveLeave: managers,
  viewProjects: (role: Role | undefined) => role === "staff" || role === "executive",
}
