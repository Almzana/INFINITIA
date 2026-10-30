import type { LucideIcon } from "lucide-react"

/** Titled group of form fields; 1 column on mobile, 2 from sm up. */
export function FormSection({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex w-full items-center gap-2 border-b pb-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
        {hint && <span className="ml-auto text-xs font-normal text-muted-foreground">{hint}</span>}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
