import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { CalendarPlusIcon, SlidersHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/misc"
import { BalanceCards } from "@/components/leave/balance-cards"
import { HolidaysCard } from "@/components/leave/holidays-card"
import { LeaveDetailDialog } from "@/components/leave/leave-detail-dialog"
import { LeavePolicyDialog } from "@/components/leave/leave-policy-dialog"
import { LeaveRequestsCard } from "@/components/leave/leave-requests-card"
import { NewLeaveDialog } from "@/components/leave/new-leave-dialog"
import { useDeepLink } from "@/hooks/use-deep-link"
import { useLeaveActions } from "@/hooks/use-leave-actions"
import { useLeaveCalendar } from "@/hooks/use-leave-calendar"
import { useEmployeeMap, useStore } from "@/lib/store"
import { t } from "@/i18n"

export default function LeavePage() {
  const { state } = useStore()
  const { decide, canApprove, reload } = useLeaveActions()
  const cal = useLeaveCalendar()
  const employeeMap = useEmployeeMap()
  // ?view=<id> from a notification (or a row click) opens that request
  const detail = useDeepLink("view", state.leaves, reload)
  const [params, setParams] = useSearchParams()
  const [newOpen, setNewOpen] = React.useState(false)
  const [policyOpen, setPolicyOpen] = React.useState(false)

  React.useEffect(() => {
    if (params.get("new")) {
      setNewOpen(true)
      setParams((p) => {
        p.delete("new")
        return p
      }, { replace: true })
    }
  }, [params, setParams])

  const view = (id: string) =>
    setParams((p) => {
      p.set("view", id)
      return p
    })
  const onDecide = async (ids: string[], status: "approved" | "rejected") => {
    await decide(ids, status)
    void cal.reloadBalance()
  }

  return (
    <>
      <PageHeader
        title={t("leave.title")}
        description={canApprove ? t("leave.descriptionApprover") : t("leave.descriptionSelf")}
        actions={
          <>
            {canApprove && (
              <Button variant="outline" onClick={() => setPolicyOpen(true)}>
                <SlidersHorizontalIcon /> {t("leave.policy.open")}
              </Button>
            )}
            <Button onClick={() => setNewOpen(true)}>
              <CalendarPlusIcon /> {t("leave.apply")}
            </Button>
          </>
        }
      />

      <BalanceCards balance={cal.balance} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <LeaveRequestsCard leaves={state.leaves} employees={employeeMap} onDecide={(ids, s) => void onDecide(ids, s)} onView={view} />
        <HolidaysCard holidays={cal.holidays} year={cal.viewYear} onYear={cal.showYear} canManage={canApprove} onAdd={cal.addHoliday} onRemove={(d) => void cal.removeHoliday(d)} />
      </div>

      <NewLeaveDialog open={newOpen} onOpenChange={setNewOpen} holidays={cal.holidaySet} onYear={cal.ensureYear} balance={cal.balance} onSubmitted={() => void cal.reloadBalance()} />
      {canApprove && <LeavePolicyDialog open={policyOpen} onOpenChange={setPolicyOpen} policies={cal.policies} onSave={cal.savePolicies} />}
      <LeaveDetailDialog
        leave={detail.item}
        employee={detail.item ? employeeMap.get(detail.item.employeeId) : undefined}
        decidable={!!detail.item?.canDecide}
        onClose={detail.close}
        onDecide={(id, status) => void onDecide([id], status)}
      />
    </>
  )
}
