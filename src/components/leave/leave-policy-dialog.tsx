import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { leaveTypeLabel } from "@/data/mock"
import type { LeavePolicy } from "@/lib/leaves-api"
import { t } from "@/i18n"

/** HR / executives: yearly days per leave type and whether going over is refused. */
export function LeavePolicyDialog({ open, onOpenChange, policies, onSave }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  policies: LeavePolicy[]
  onSave: (next: LeavePolicy[]) => Promise<boolean>
}) {
  const [draft, setDraft] = React.useState(policies)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (open) setDraft(policies)
  }, [open, policies])

  const update = (type: LeavePolicy["type"], patch: Partial<LeavePolicy>) => setDraft((d) => d.map((p) => (p.type === type ? { ...p, ...patch } : p)))
  const valid = draft.every((p) => Number.isInteger(p.daysPerYear) && p.daysPerYear >= 0 && p.daysPerYear <= 366)

  const save = async () => {
    setBusy(true)
    if (await onSave(draft)) onOpenChange(false)
    setBusy(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("leave.policy.title")}</DialogTitle>
          <DialogDescription>{t("leave.policy.description")}</DialogDescription>
        </DialogHeader>
        <div className="divide-y rounded-lg border">
          {draft.map((p) => (
            <div key={p.type} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <span className="min-w-24 flex-1 text-sm font-medium">{leaveTypeLabel[p.type]}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Input
                  type="number"
                  min={0}
                  max={366}
                  className="h-8 w-20 text-right tabular-nums"
                  value={Number.isNaN(p.daysPerYear) ? "" : p.daysPerYear}
                  onChange={(e) => update(p.type, { daysPerYear: e.target.valueAsNumber })}
                  aria-label={`${leaveTypeLabel[p.type]} ${t("leave.policy.days")}`}
                />
                {t("leave.policy.days")}
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={p.enforce} onCheckedChange={(c) => update(p.type, { enforce: c })} />
                {t("leave.policy.enforce")}
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={() => void save()} disabled={busy || !valid}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
