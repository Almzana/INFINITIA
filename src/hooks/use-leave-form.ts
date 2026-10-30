import * as React from "react"
import { eachDayOfInterval, format, isWeekend } from "date-fns"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { type LeaveType, leaveTypeLabel } from "@/data/mock"
import { useLeaveActions } from "@/hooks/use-leave-actions"
import { type LeaveBalance, leavesApi } from "@/lib/leaves-api"
import { t } from "@/i18n"

const iso = (d: Date) => format(d, "yyyy-MM-dd")

/**
 * The new-leave form: working days (weekends and company holidays excluded, as the server counts
 * them), what is left of the chosen type's quota, validation and submit.
 */
export function useLeaveForm({ open, holidays, onYear, balance, onDone }: { open: boolean; holidays: Set<string>; onYear: (y: number) => void; balance: LeaveBalance[] | null; onDone: () => void }) {
  const { request } = useLeaveActions()
  const [type, setType] = React.useState<LeaveType>("vacation")
  const [range, setRange] = React.useState<DateRange | undefined>()
  const [reason, setReason] = React.useState("")
  const [errors, setErrors] = React.useState<{ range?: string; reason?: string }>({})
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setType("vacation")
    setRange(undefined)
    setReason("")
    setErrors({})
    // Other-year balances may have changed since the last time (requests, policy edits)
    setOtherYear(null)
  }, [open])

  const weekdays = range?.from ? eachDayOfInterval({ start: range.from, end: range.to ?? range.from }).filter((d) => !isWeekend(d)) : []
  const skippedHolidays = weekdays.filter((d) => holidays.has(iso(d))).length
  const days = weekdays.length - skippedHolidays

  // Quotas are per calendar year: check against the year the leave falls in (fetched when not this year)
  const year = range?.from?.getFullYear() ?? new Date().getFullYear()
  const crossesYear = !!range?.from && !!range.to && range.to.getFullYear() !== range.from.getFullYear()
  const [otherYear, setOtherYear] = React.useState<{ year: number; data: LeaveBalance[] } | null>(null)
  const thisYear = new Date().getFullYear()
  React.useEffect(() => {
    if (year === thisYear || otherYear?.year === year) return
    let cancelled = false
    leavesApi.balance(year).then((r) => !cancelled && setOtherYear({ year, data: r.data })).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [year, thisYear, otherYear?.year])
  // Holidays of that year are needed to count working days as the server will
  React.useEffect(() => onYear(year), [year, onYear])
  const yearBalance = year === thisYear ? balance : otherYear?.year === year ? otherYear.data : null

  const bal = yearBalance?.find((b) => b.type === type)
  const over = !!bal && days > 0 && days > bal.remaining
  const blocked = (over && !!bal?.enforce) || crossesYear

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!range?.from) next.range = t("leave.error.pickDate")
    else if (crossesYear) next.range = t("leave.error.crossesYear")
    else if (days === 0) next.range = t("leave.error.weekendOnly")
    if (reason.trim().length < 3) next.reason = t("leave.error.reason")
    setErrors(next)
    if (Object.keys(next).length || !range?.from || blocked) return

    // Filed for the signed-in employee; the server recounts days and checks overlaps and the quota
    setSubmitting(true)
    const res = await request({ type, from: iso(range.from), to: iso(range.to ?? range.from), reason: reason.trim() })
    setSubmitting(false)
    if (!res.ok) return setErrors({ range: res.error })
    toast.success(t("leave.toast.submitted"), { description: t("leave.toast.submittedDesc", { type: leaveTypeLabel[type], n: res.days }) })
    onDone()
  }

  return { type, setType, range, setRange, reason, setReason, errors, submitting, days, skippedHolidays, bal, over, blocked, crossesYear, submit }
}
