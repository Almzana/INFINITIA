import { cn } from "@/lib/utils"

export type TagType = "primary" | "success" | "warning" | "danger" | "info"

// Element Plus style el-tag (light effect)
const styles: Record<TagType, string> = {
  primary: "text-primary bg-primary/10 border-primary/25",
  success: "text-success bg-success/10 border-success/25",
  warning: "text-warning bg-warning/10 border-warning/25",
  danger: "text-destructive bg-destructive/10 border-destructive/25",
  info: "text-info bg-info/10 border-info/25",
}

export function Tag({
  type = "primary",
  dot,
  className,
  children,
}: {
  type?: TagType
  dot?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap",
        styles[type],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
