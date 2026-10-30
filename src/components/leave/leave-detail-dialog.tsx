import { CheckIcon, XIcon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Tag } from "@/components/shared/tag"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type Employee, type LeaveRequest, leaveTypeLabel } from "@/data/mock"
import { formatDate } from "@/lib/format"
import { deptLabel, t } from "@/i18n"
import { LeaveStatusTag } from "./leave-status-tag"
import { typeTag } from "./leave-tags"

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[6rem_1fr] gap-3 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
)

/** One leave request, opened from a notification. Approvers can decide it here. */
export function LeaveDetailDialog({ leave, employee, decidable, onClose, onDecide }: {
  leave: LeaveRequest | null
  employee?: Employee
  decidable: boolean
  onClose: () => void
  onDecide: (id: string, status: "approved" | "rejected") => void
}) {
  const decide = (status: "approved" | "rejected") => {
    if (!leave) return
    onDecide(leave.id, status)
    onClose()
  }
  return (
    <Dialog open={!!leave} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {leave && (
          <>
            <DialogHeader>
              <DialogTitle>{leaveTypeLabel[leave.type]}</DialogTitle>
              <DialogDescription>{formatDate(leave.createdAt)}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <EmployeeAvatar person={employee} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium">{employee ? `${employee.firstName} ${employee.lastName}` : t("common.noData")}</p>
                <p className="text-xs text-muted-foreground">{employee && deptLabel(employee.department)}</p>
              </div>
            </div>
            <dl className="space-y-2.5">
              <Row label={t("leave.col.type")}><Tag type={typeTag[leave.type]}>{leaveTypeLabel[leave.type]}</Tag></Row>
              <Row label={t("leave.col.date")}>{leave.from === leave.to ? formatDate(leave.from) : `${formatDate(leave.from, "d MMM")} – ${formatDate(leave.to)}`}</Row>
              <Row label={t("leave.col.days")}>{t("common.days", { n: leave.days })}</Row>
              <Row label={t("leave.col.reason")}><span className="whitespace-pre-line">{leave.reason}</span></Row>
              <Row label={t("leave.col.status")}><LeaveStatusTag leave={leave} /></Row>
            </dl>
            <DialogFooter>
              {decidable ? (
                <>
                  <Button variant="destructive" onClick={() => decide("rejected")}><XIcon /> {t("leave.reject")}</Button>
                  <Button className="bg-success hover:bg-success/90" onClick={() => decide("approved")}><CheckIcon /> {t("leave.approve")}</Button>
                </>
              ) : (
                <Button variant="outline" onClick={onClose}>{t("common.close")}</Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
