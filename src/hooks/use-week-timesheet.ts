import * as React from "react"
import { toast } from "sonner"
import { addDays, format } from "date-fns"
import type { TimeEntry } from "@/data/timesheet"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { projectsApi } from "@/lib/projects-api"
import { useStore } from "@/lib/store"
import { timesheetApi } from "@/lib/timesheet-api"

const ymd = (d: Date) => format(d, "yyyy-MM-dd")

/**
 * Loads one week of entries (everyone's for executives, own for staff — the API decides) into the
 * store, and saves a person's week. `ready` turns true once the week is loaded.
 */
export function useWeekTimesheet(weekStart: Date, days: number) {
  const { dispatch } = useStore()
  const from = ymd(weekStart)
  const to = ymd(addDays(weekStart, days - 1))
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    timesheetApi
      .list(from, to)
      .then((r) => !cancelled && dispatch({ type: "timesheet/replaceRange", employeeId: null, from, to, entries: r.data }))
      .catch(() => {
        /* keep cached entries */
      })
      .finally(() => !cancelled && setLoadedKey(from))
    return () => {
      cancelled = true
    }
  }, [from, to, dispatch])

  const saveWeek = async (employeeId: string, entries: Omit<TimeEntry, "id" | "employeeId">[]) => {
    try {
      const res = await timesheetApi.saveWeek({ employeeId, from, to, entries })
      dispatch({ type: "timesheet/replaceRange", employeeId: res.employeeId, from, to, entries: res.data })
      // Labour cost on project pages uses server totals: refresh them
      projectsApi
        .list()
        .then((r) => dispatch({ type: "project/replace", projects: r.data }))
        .catch(() => {
          /* costs refresh on the next load */
        })
      return true
    } catch (err) {
      const notMember = err instanceof ApiError && err.code === "NOT_PROJECT_MEMBER"
      toast.error(err instanceof ApiError && err.status === 403 ? t("timesheet.toast.forbidden") : t("timesheet.toast.saveFailed"), {
        description: notMember ? t("timesheet.toast.notMember", { ids: (err.details ?? []).map((d) => d.message).join(", ") }) : err instanceof ApiError && err.status === 400 ? err.message : undefined,
      })
      return false
    }
  }

  /** One person's entries for any range (e.g. the previous week, which may not be loaded yet). */
  const loadEntries = async (employeeId: string, a: string, b: string) => {
    try {
      return (await timesheetApi.list(a, b, employeeId)).data
    } catch {
      return []
    }
  }

  return { ready: loadedKey === from, from, to, saveWeek, loadEntries }
}
