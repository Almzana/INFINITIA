import { BabyIcon, BriefcaseIcon, HeartPulseIcon, type LucideIcon, PalmtreeIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { type LeaveType, leaveTypeLabel } from "@/data/mock"
import type { LeaveBalance } from "@/lib/leaves-api"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

const look: Record<LeaveType, { icon: LucideIcon; color: string }> = {
  vacation: { icon: PalmtreeIcon, color: "text-primary bg-primary/10" },
  sick: { icon: HeartPulseIcon, color: "text-destructive bg-destructive/10" },
  personal: { icon: BriefcaseIcon, color: "text-warning bg-warning/10" },
  maternity: { icon: BabyIcon, color: "text-success bg-success/10" },
}

/** This year's quota per leave type: remaining days, approved and pending usage. Maternity only once used. */
export function BalanceCards({ balance }: { balance: LeaveBalance[] | null }) {
  if (!balance) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }
  const shown = balance.filter((b) => b.type !== "maternity" || b.used + b.pending > 0)
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", shown.length > 3 ? "xl:grid-cols-4" : "lg:grid-cols-3")}>
      {shown.map((b) => {
        const { icon: Icon, color } = look[b.type]
        const taken = b.used + b.pending
        return (
          <Card key={b.type}>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-9 items-center justify-center rounded-lg", color)}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t("leave.balance", { type: leaveTypeLabel[b.type] })}</p>
                  <p className={cn("text-lg font-semibold tabular-nums", b.remaining < 0 && "text-destructive")}>
                    {Math.max(0, b.remaining)} <span className="text-sm font-normal text-muted-foreground">{t("leave.ofDays", { n: b.quota })}</span>
                  </p>
                </div>
              </div>
              <Progress value={b.quota ? Math.min(100, (taken / b.quota) * 100) : 0} />
              <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>{t("leave.used", { n: b.used })}</span>
                {b.pending > 0 && <span>{t("leave.pendingDays", { n: b.pending })}</span>}
                {b.remaining < 0 && <span className="text-destructive">{t("leave.overQuota", { n: -b.remaining })}</span>}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
