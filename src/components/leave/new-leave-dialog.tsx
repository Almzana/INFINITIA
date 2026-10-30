import { LoaderIcon, TriangleAlertIcon } from "lucide-react"
import { FormItem } from "@/components/shared/misc"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { type LeaveType, leaveTypeLabel } from "@/data/mock"
import { useLeaveForm } from "@/hooks/use-leave-form"
import type { LeaveBalance } from "@/lib/leaves-api"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"
import { LeaveRangeField } from "./leave-range-field"

/** File a leave request: type (with what is left of it), dates (holidays not counted), reason. */
export function NewLeaveDialog({ open, onOpenChange, holidays, onYear, balance, onSubmitted }: {
  open: boolean
  /** Load the holidays of a year the picked dates fall in */
  onYear: (y: number) => void
  onOpenChange: (o: boolean) => void
  holidays: Set<string>
  balance: LeaveBalance[] | null
  onSubmitted: () => void
}) {
  const f = useLeaveForm({ open, holidays, onYear, balance, onDone: () => {
    onOpenChange(false)
    onSubmitted()
  } })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={f.submit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("leave.apply")}</DialogTitle>
            <DialogDescription>{t("leave.dialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <FormItem label={t("leave.form.type")} required>
              <RadioGroup value={f.type} onValueChange={(v) => f.setType(v as LeaveType)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(leaveTypeLabel) as LeaveType[]).map((k) => (
                  <label
                    key={k}
                    className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors", f.type === k && "border-primary bg-primary/5 text-primary")}
                  >
                    <RadioGroupItem value={k} />
                    {leaveTypeLabel[k]}
                  </label>
                ))}
              </RadioGroup>
              {f.bal && <p className="text-xs text-muted-foreground">{t("leave.form.remaining", { type: leaveTypeLabel[f.type], n: Math.max(0, f.bal.remaining) })}</p>}
            </FormItem>
            <FormItem label={t("leave.form.date")} required error={f.errors.range}>
              <LeaveRangeField range={f.range} onChange={f.setRange} days={f.days} holidays={holidays} invalid={!!f.errors.range} />
              {f.skippedHolidays > 0 && <p className="text-xs text-muted-foreground">{t("leave.form.holidaysSkipped", { n: f.skippedHolidays })}</p>}
              {f.crossesYear && <p className="flex items-center gap-1.5 text-xs text-destructive"><TriangleAlertIcon className="size-3.5" /> {t("leave.error.crossesYear")}</p>}
              {f.over && !f.crossesYear && (
                <p className={cn("flex items-center gap-1.5 text-xs", f.blocked ? "text-destructive" : "text-warning")}>
                  <TriangleAlertIcon className="size-3.5" /> {t(f.blocked ? "leave.form.overQuota" : "leave.form.overQuotaSoft")}
                </p>
              )}
            </FormItem>
            <FormItem label={t("leave.form.reason")} required htmlFor="reason" error={f.errors.reason}>
              <Textarea id="reason" rows={3} aria-invalid={!!f.errors.reason} placeholder={t("leave.form.reasonPlaceholder")} value={f.reason} onChange={(e) => f.setReason(e.target.value)} />
            </FormItem>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={f.submitting || f.blocked}>
              {f.submitting && <LoaderIcon className="animate-spin" />} {t("leave.form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
