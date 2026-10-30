import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** A row of large selectable tiles (theme, language). Stacks on mobile. */
export function ChoiceGrid<V extends string>({ options, value, onChange, columns = 3 }: {
  options: { value: V; label: string; sub?: string; icon?: LucideIcon }[]
  value: V
  onChange: (v: V) => void
  columns?: 2 | 3
}) {
  return (
    <div className={cn("grid gap-3", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 text-sm transition-colors",
            value === o.value ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50",
          )}
        >
          {o.icon && <o.icon className="size-6" />}
          <span className="font-medium">{o.label}</span>
          {o.sub && <span className="text-xs text-muted-foreground">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}
