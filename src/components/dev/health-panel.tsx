import { LoaderIcon, PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { CheckResult } from "@/hooks/use-health-check"
import type { Endpoint } from "@/lib/openapi"
import { t } from "@/i18n"
import { MethodBadge, VerdictBadge } from "./badges"

const order = { broken: 0, invalid: 1, denied: 2, ok: 3 }

/** Run-all button, progress and one row per checked route (broken first). */
export function HealthPanel({ checkable, results, running, done, lastRun, onRun, onOpen }: {
  checkable: Endpoint[]
  results: Record<string, CheckResult>
  running: boolean
  done: number
  lastRun: Date | null
  onRun: () => void
  onOpen: (e: Endpoint) => void
}) {
  const rows = [...checkable].sort((a, b) => (order[results[a.id]?.verdict] ?? 4) - (order[results[b.id]?.verdict] ?? 4) || a.path.localeCompare(b.path))
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{t("dev.health.title")}</CardTitle>
          <CardDescription>{t("dev.health.description", { n: checkable.length })}</CardDescription>
        </div>
        <Button onClick={onRun} disabled={running || checkable.length === 0} className="shrink-0">
          {running ? <LoaderIcon className="animate-spin" /> : <PlayIcon />}
          {running ? t("dev.health.running", { done, total: checkable.length }) : t("dev.health.run")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {running && <Progress value={(done / Math.max(1, checkable.length)) * 100} />}
        <p className="text-xs text-muted-foreground">{lastRun ? t("dev.health.lastRun", { time: lastRun.toLocaleTimeString() }) : t("dev.health.never")}</p>
        <ul className="divide-y rounded-lg border">
          {rows.map((e) => {
            const r = results[e.id]
            return (
              <li key={e.id}>
                <button type="button" onClick={() => onOpen(e)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-muted/50">
                  <MethodBadge method={e.method} />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">{e.path}</span>
                  {r?.code && <span className="hidden font-mono text-xs text-muted-foreground md:inline">{r.code}</span>}
                  {r && <span className="w-14 text-right font-mono text-xs text-muted-foreground tabular-nums">{r.ms} ms</span>}
                  {r ? <VerdictBadge verdict={r.verdict} status={r.status} /> : <span className="w-20 text-right text-xs text-muted-foreground">{running ? "…" : t("dev.verdict.none")}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
