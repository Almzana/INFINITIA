import * as React from "react"
import { Navigate, useSearchParams } from "react-router-dom"
import { LoaderIcon, LockIcon, ShieldOffIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DevHeader } from "@/components/dev/dev-header"
import { EndpointsTab } from "@/components/dev/endpoints-tab"
import { HealthPanel } from "@/components/dev/health-panel"
import { MonitorTab } from "@/components/dev/monitor-tab"
import { OverviewTiles } from "@/components/dev/overview-tiles"
import { useDevConsole } from "@/hooks/use-dev-console"
import { useDevHistory } from "@/hooks/use-dev-history"
import { useHealthCheck } from "@/hooks/use-health-check"
import { useRequestRunner } from "@/hooks/use-request-runner"
import { useAuth } from "@/lib/auth"
import type { Endpoint } from "@/lib/openapi"
import { t } from "@/i18n"

/** Developer-only console: API health check, request runner and live route statistics. */
export default function DevConsolePage() {
  const { user } = useAuth()
  const dev = useDevConsole()
  const health = useHealthCheck(dev.endpoints)
  const runner = useRequestRunner()
  const history = useDevHistory(dev.status === "on")
  // ?tab=monitor (from a 5xx alert) opens that tab
  const [params] = useSearchParams()
  const [tab, setTab] = React.useState(() => params.get("tab") ?? "overview")

  if (!user) return <Navigate to="/login" replace state={{ from: `/dev${params.size ? `?${params}` : ""}` }} />
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />

  const open = (e: Endpoint) => {
    runner.select(e)
    setTab("endpoints")
  }

  return (
    <div className="min-h-svh bg-page">
      <DevHeader user={user} />
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">{t("dev.subtitle")}</p>
        {dev.status === "loading" && <LoaderIcon className="mx-auto size-6 animate-spin text-muted-foreground" aria-label={t("common.loading")} />}
        {(dev.status === "off" || dev.status === "denied") && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              {dev.status === "denied" ? <LockIcon className="size-8 text-muted-foreground" /> : <ShieldOffIcon className="size-8 text-muted-foreground" />}
              <p className="font-medium">{t(`dev.${dev.status}`)}</p>
              <p className="max-w-md text-sm text-muted-foreground">{t(dev.status === "denied" ? "dev.deniedHint" : "dev.offHint")}</p>
            </CardContent>
          </Card>
        )}
        {dev.status === "on" && (
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList>
              <TabsTrigger value="overview">{t("dev.tab.overview")}</TabsTrigger>
              <TabsTrigger value="endpoints">{t("dev.tab.endpoints")}</TabsTrigger>
              <TabsTrigger value="monitor">{t("dev.tab.monitor")}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              <OverviewTiles total={dev.endpoints.length} checked={!!health.lastRun} {...health.summary} stats={dev.stats} />
              <HealthPanel checkable={health.checkable} results={health.results} running={health.running} done={health.done} lastRun={health.lastRun} onRun={() => void health.run()} onOpen={open} />
            </TabsContent>
            <TabsContent value="endpoints">
              <EndpointsTab endpoints={dev.endpoints} results={health.results} runner={runner} />
            </TabsContent>
            <TabsContent value="monitor">
              <MonitorTab stats={dev.stats} statsError={dev.statsError} onReset={() => void dev.reset()} history={history} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
