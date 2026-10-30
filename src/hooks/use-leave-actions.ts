import * as React from "react"
import { toast } from "sonner"
import type { LeaveType } from "@/data/mock"
import { can } from "@/lib/access"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { leavesApi } from "@/lib/leaves-api"
import { useStore } from "@/lib/store"
import { t } from "@/i18n"

function message(err: unknown) {
  if (err instanceof ApiError && err.code === "LEAVE_OVERLAP") return t("leave.error.overlap")
  if (err instanceof ApiError && err.code === "LEAVE_CROSSES_YEAR") return t("leave.error.crossesYear")
  if (err instanceof ApiError && err.code === "LEAVE_QUOTA_EXCEEDED") return t("leave.error.quota", { n: err.details?.[0]?.message ?? "0" })
  if (err instanceof ApiError && err.code === "NO_EMPLOYEE_RECORD") return t("leave.error.noEmployee")
  if (err instanceof ApiError && err.status === 403) return t("common.noPermission")
  if (err instanceof ApiError && err.status === 400) return t("leave.error.invalid")
  return t("common.saveFailed")
}

/** File my own leave; Leaders, HR & executives approve / reject what the API marks `canDecide`. */
export function useLeaveActions() {
  const { dispatch } = useStore()
  const user = useAuth().user

  const request = async (input: { type: LeaveType; from: string; to: string; reason: string }) => {
    try {
      const created = await leavesApi.create(input)
      dispatch({ type: "leave/upsertMany", leaves: [created] })
      return { ok: true as const, days: created.days }
    } catch (err) {
      return { ok: false as const, error: message(err) }
    }
  }

  const decide = async (ids: string[], status: "approved" | "rejected") => {
    try {
      const res = await leavesApi.decide(ids, status)
      dispatch({ type: "leave/upsertMany", leaves: res.data })
      // A Leader's approval only forwards the request to HR
      const forwarded = res.data.filter((l) => l.status === "pending").length
      const decided = res.data.length - forwarded
      const skipped = res.skipped ? t("leave.toast.skipped", { n: res.skipped }) : undefined
      if (forwarded) toast.success(t("leave.toast.forwarded", { n: forwarded }), { description: decided ? undefined : skipped })
      if (decided)
        toast[status === "approved" ? "success" : "warning"](t(status === "approved" ? "leave.toast.approved" : "leave.toast.rejected", { n: decided }), { description: skipped })
      // Nothing could be decided (no longer pending, or not this person's turn)
      if (!res.data.length) toast.info(skipped ?? t("leave.toast.skipped", { n: ids.length }))
    } catch (err) {
      toast.error(message(err))
    }
  }

  // Notifications can point at a request filed after the store was loaded
  const reload = React.useCallback(() => leavesApi.list().then((r) => dispatch({ type: "leave/replace", leaves: r.data })), [dispatch])

  return { request, decide, reload, canApprove: can.approveLeave(user?.role), myEmployeeId: user?.employeeId ?? null }
}
