import type { TimeEntry } from "@/data/timesheet"
import { apiFetch } from "@/lib/api"

/** Staff: own entries only. Executives: anyone's, or everyone's when employeeId is omitted. */
export const timesheetApi = {
  list: (from: string, to: string, employeeId?: string) =>
    apiFetch<{ data: TimeEntry[] }>(`/timesheet?${new URLSearchParams({ from, to, ...(employeeId ? { employeeId } : {}) })}`),
  /** Replaces one person's entries for the week [from, to]. */
  saveWeek: (input: { employeeId?: string; from: string; to: string; entries: Omit<TimeEntry, "id" | "employeeId">[] }) =>
    apiFetch<{ employeeId: string; data: TimeEntry[] }>("/timesheet/week", { method: "PUT", json: input }),
}
