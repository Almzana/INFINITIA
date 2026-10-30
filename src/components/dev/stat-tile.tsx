import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const tones = {
  neutral: "bg-muted text-foreground",
  good: "bg-success/10 text-success",
  bad: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
}

/** One number with a label and an icon. */
export function StatTile({ icon: Icon, label, value, hint, tone = "neutral" }: { icon: LucideIcon; label: string; value: React.ReactNode; hint?: string; tone?: keyof typeof tones }) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
