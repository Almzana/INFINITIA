import { Button } from "@/components/ui/button"
import type { HistoryItem } from "@/hooks/use-request-runner"
import type { HttpMethod } from "@/lib/openapi"
import { t } from "@/i18n"
import { MethodBadge, StatusCode } from "./badges"

/** The last requests sent from this browser. */
export function RunnerHistory({ items, onClear }: { items: HistoryItem[]; onClear: () => void }) {
  if (!items.length) return null
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">{t("dev.runner.history")}</h3>
        <Button variant="ghost" size="xs" onClick={onClear}>{t("dev.runner.clear")}</Button>
      </div>
      <ul className="divide-y rounded-lg border text-xs">
        {items.map((h) => (
          <li key={h.at} className="flex items-center gap-2 px-2 py-1.5">
            <MethodBadge method={h.method as HttpMethod} />
            <code className="min-w-0 flex-1 truncate">{h.url}</code>
            <StatusCode status={h.status} />
            <span className="w-14 text-right font-mono text-muted-foreground tabular-nums">{h.ms} ms</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
