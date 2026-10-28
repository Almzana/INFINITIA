import type { LucideIcon } from "lucide-react"
import { InboxIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title = "ไม่พบข้อมูล", description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <InboxIcon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

const toneClass = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  tone = "primary",
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  trend?: number
  hint?: string
  tone?: keyof typeof toneClass
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {(trend !== undefined || hint) && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {trend !== undefined && (
                <span className={cn("inline-flex items-center gap-0.5 font-medium", trend >= 0 ? "text-success" : "text-destructive")}>
                  {trend >= 0 ? <TrendingUpIcon className="size-3.5" /> : <TrendingDownIcon className="size-3.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
              {hint}
            </p>
          )}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneClass[tone])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Element Plus style form item: label on top, required asterisk, error text below. */
export function FormItem({
  label,
  required,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {required && <span className="mr-0.5 text-destructive">*</span>}
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
