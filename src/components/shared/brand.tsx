import { cn } from "@/lib/utils"

export const BRAND = {
  name: "INFINI I.A.",
  tagline: "Innovative Architecture & Interior Design",
  domain: "infini-ia.com",
}

/** Square monogram used where a compact logo is needed (sidebar, mobile login). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-brand text-[11px] font-light tracking-[0.12em] text-primary-foreground",
        className,
      )}
    >
      IA
    </div>
  )
}

/** Thin, wide-tracked wordmark in the style of the INFINI I.A. logo. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-brand font-light tracking-[0.28em] uppercase", className)}>{BRAND.name}</span>
}
