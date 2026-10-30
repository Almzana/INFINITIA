import * as React from "react"
import { ApiError } from "@/lib/api"
import { type DevStats, devApi } from "@/lib/dev-api"
import { type Endpoint, parseSpec } from "@/lib/openapi"

const POLL_MS = 5000

/**
 * The console's data: every API operation (from the OpenAPI document) and live server statistics,
 * refreshed every 5 s while the tab is visible. `status` is "off" when the server does not expose
 * the console (production) and "denied" for accounts that are not developers.
 */
export function useDevConsole() {
  const [status, setStatus] = React.useState<"loading" | "on" | "off" | "denied">("loading")
  const [endpoints, setEndpoints] = React.useState<Endpoint[]>([])
  const [stats, setStats] = React.useState<DevStats | null>(null)
  const [statsError, setStatsError] = React.useState(false)

  const loadStats = React.useCallback(async () => {
    try {
      setStats(await devApi.stats())
      setStatsError(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setStatus("off")
      else if (err instanceof ApiError && err.status === 403) setStatus("denied")
      else setStatsError(true)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    Promise.all([devApi.spec(), devApi.stats()])
      .then(([spec, s]) => {
        if (cancelled) return
        setEndpoints(parseSpec(spec).filter((e) => !e.path.startsWith("/api/dev/")))
        setStats(s)
        setStatus("on")
      })
      .catch((err) => !cancelled && setStatus(err instanceof ApiError && err.status === 403 ? "denied" : "off"))
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (status !== "on") return
    const id = window.setInterval(() => document.visibilityState === "visible" && void loadStats(), POLL_MS)
    return () => window.clearInterval(id)
  }, [status, loadStats])

  const reset = async () => {
    await devApi.reset().catch(() => undefined)
    await loadStats()
  }

  return { status, endpoints, stats, statsError, refresh: loadStats, reset }
}
