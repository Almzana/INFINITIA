import type { FailedRequest } from "@/lib/dev-api"
import { t } from "@/i18n"
import { StatusCode } from "./badges"

/** Latest failed requests from real traffic: when, which route, status, error code and message. */
export function FailuresList({ items }: { items: FailedRequest[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{t("dev.monitor.noFailures")}</p>
  return (
    <ul className="max-h-[32rem] divide-y overflow-y-auto rounded-lg border">
      {items.map((f) => (
        <li key={`${f.reqId}-${f.at}`} className="space-y-0.5 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusCode status={f.status} />
            <code className="min-w-0 flex-1 truncate">{f.route}</code>
            <span className="font-mono text-muted-foreground tabular-nums">{f.ms} ms</span>
            <time className="text-muted-foreground tabular-nums" dateTime={f.at}>{new Date(f.at).toLocaleTimeString()}</time>
          </div>
          <div className="flex flex-wrap gap-x-3 text-muted-foreground">
            <code className="truncate">{f.path}</code>
            {f.code && <span className="font-mono text-foreground">{f.code}</span>}
            {f.message && <span className="truncate">{f.message}</span>}
            <span className="font-mono">{f.reqId}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
