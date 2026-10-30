import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const toneClass = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
}

/** Icon + title + text, for confirmations and problems on the auth screens. */
export function AuthNotice({ icon: Icon, tone, title, children }: {
  icon: LucideIcon
  tone: keyof typeof toneClass
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center" role={tone === "danger" ? "alert" : "status"}>
      <div className={cn("flex size-12 items-center justify-center rounded-full", toneClass[tone])}>
        <Icon className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="space-y-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}
