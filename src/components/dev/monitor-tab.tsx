import { RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/misc"
import type { useDevHistory } from "@/hooks/use-dev-history"
import type { DevStats } from "@/lib/dev-api"
import { t } from "@/i18n"
import { FailuresList } from "./failures-list"
import { HistoryChart } from "./history-chart"
import { RouteStatsTable } from "./route-stats-table"

/** Stored history and 5xx failures, then live statistics from real traffic since the server started. */
export function MonitorTab({ stats, statsError, onReset, history }: { stats: DevStats | null; statsError: boolean; onReset: () => void; history: ReturnType<typeof useDevHistory> }) {
  return (
    <div className="space-y-6">
      {statsError && <p className="text-sm text-destructive">{t("dev.statsFailed")}</p>}
      <HistoryChart points={history.points} hours={history.hours} onHours={history.setHours} totals={history.totals} />
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>{t("dev.monitor.stored")}</CardTitle>
          <CardDescription>{t("dev.monitor.storedHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FailuresList items={history.failures} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{t("dev.monitor.routes")}</CardTitle>
            <CardDescription>{t("dev.monitor.routesHint")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcwIcon /> {t("dev.monitor.reset")}
          </Button>
        </CardHeader>
        <CardContent>{stats ? <RouteStatsTable routes={stats.routes} /> : <EmptyState />}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("dev.monitor.failures")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FailuresList items={stats?.recent ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
