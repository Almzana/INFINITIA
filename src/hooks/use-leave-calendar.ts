import * as React from "react"
import { toast } from "sonner"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { type Holiday, type LeaveBalance, type LeavePolicy, leavesApi } from "@/lib/leaves-api"

const failed = (err: unknown) => toast.error(err instanceof ApiError && err.status === 403 ? t("common.noPermission") : t("common.saveFailed"))

/**
 * My leave balance for this year, the holiday calendar (this year and next, so requests across
 * New Year count correctly) and, for HR / executives, editing holidays and the leave policy.
 */
export function useLeaveCalendar() {
  const email = useAuth().user?.email
  const [year] = React.useState(() => new Date().getFullYear())
  const [balance, setBalance] = React.useState<LeaveBalance[] | null>(null)
  const [holidays, setHolidays] = React.useState<Holiday[]>([])
  const [policies, setPolicies] = React.useState<LeavePolicy[]>([])

  const reloadBalance = React.useCallback(async () => {
    if (!email) return
    setBalance((await leavesApi.balance(year).catch(() => ({ data: [] }))).data)
  }, [email, year])

  /** (Re)load one year of holidays into the merged list. */
  const inFlight = React.useRef(new Set<number>())
  const loadYear = React.useCallback(async (y: number) => {
    // One request per year at a time (the page and the form both ask on open)
    if (inFlight.current.has(y)) return
    inFlight.current.add(y)
    const res = await leavesApi.holidays(y).catch(() => null)
    inFlight.current.delete(y)
    if (!res) return
    setHolidays((hs) => [...hs.filter((h) => !h.date.startsWith(String(y))), ...res.data].sort((a, b) => a.date.localeCompare(b.date)))
    setLoadedYears((ys) => (ys.includes(y) ? ys : [...ys, y]))
  }, [])
  const [loadedYears, setLoadedYears] = React.useState<number[]>([])
  /** Load a year once (the card browsing years, the form picking dates in another year). */
  const ensureYear = React.useCallback((y: number) => {
    if (!loadedYears.includes(y)) void loadYear(y)
  }, [loadedYears, loadYear])
  // The year the holidays card shows
  const [viewYear, setViewYear] = React.useState(year)

  React.useEffect(() => {
    void reloadBalance()
    void loadYear(year)
    void loadYear(year + 1)
    void leavesApi.policy().then((r) => setPolicies(r.data)).catch(() => undefined)
  }, [reloadBalance, loadYear, year])

  const showYear = (y: number) => {
    setViewYear(y)
    ensureYear(y)
  }

  const holidaySet = React.useMemo(() => new Set(holidays.map((h) => h.date)), [holidays])

  const addHoliday = async (h: Holiday) => {
    try {
      await leavesApi.addHoliday(h)
      await loadYear(Number(h.date.slice(0, 4)))
      return true
    } catch (err) {
      failed(err)
      return false
    }
  }

  const removeHoliday = async (date: string) => {
    try {
      await leavesApi.removeHoliday(date)
      setHolidays((hs) => hs.filter((h) => h.date !== date))
    } catch (err) {
      failed(err)
    }
  }

  const savePolicies = async (next: LeavePolicy[]) => {
    const changed = next.filter((p) => {
      const old = policies.find((o) => o.type === p.type)
      return !old || old.daysPerYear !== p.daysPerYear || old.enforce !== p.enforce
    })
    const results = await Promise.allSettled(changed.map((p) => leavesApi.setPolicy(p)))
    // Some may have been saved even if others failed: show what the server now has
    await Promise.all([leavesApi.policy().then((r) => setPolicies(r.data)).catch(() => undefined), reloadBalance()])
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected")
    if (failure) {
      failed(failure.reason)
      return false
    }
    toast.success(t("leave.policy.saved"))
    return true
  }

  return { year, viewYear, showYear, ensureYear, balance, holidays, holidaySet, policies, reloadBalance, addHoliday, removeHoliday, savePolicies }
}
