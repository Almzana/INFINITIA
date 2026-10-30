import * as React from "react"
import { type FailedRequest, devApi, type HistoryPoint } from "@/lib/dev-api"

const REFRESH_MS = 60_000
const HOUR = 3_600_000

/** One point per hour, missing hours as zero, so the chart has no gaps. */
function fillHours(points: HistoryPoint[], hours: number): HistoryPoint[] {
  const byHour = new Map(points.map((p) => [Math.floor(Date.parse(p.bucket) / HOUR), p]))
  const now = Math.floor(Date.now() / HOUR)
  return Array.from({ length: hours }, (_, i) => {
    const h = now - hours + 1 + i
    return byHour.get(h) ?? { bucket: new Date(h * HOUR).toISOString(), count: 0, serverErrors: 0, clientErrors: 0, avgMs: 0 }
  })
}

/**
 * Stored request history (24 h or 7 days) and stored 5xx failures for the Monitor tab, refreshed
 * every minute (the server writes its counters once a minute).
 */
export function useDevHistory(enabled: boolean) {
  const [hours, setHours] = React.useState<24 | 168>(24)
  const [points, setPoints] = React.useState<HistoryPoint[]>([])
  const [failures, setFailures] = React.useState<FailedRequest[]>([])

  // Only the newest request may update the chart (switching 24 h / 7 days quickly)
  const latest = React.useRef(0)
  const load = React.useCallback(async () => {
    const mine = ++latest.current
    const [h, f] = await Promise.all([devApi.history(hours), devApi.failures(50)]).catch(() => [null, null])
    if (mine !== latest.current) return
    if (h) setPoints(fillHours(h.data, hours))
    if (f) setFailures(f.data)
  }, [hours])

  React.useEffect(() => {
    if (!enabled) return
    void load()
    const id = window.setInterval(() => document.visibilityState === "visible" && void load(), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [enabled, load])

  const totals = React.useMemo(
    () => points.reduce((a, p) => ({ count: a.count + p.count, serverErrors: a.serverErrors + p.serverErrors, clientErrors: a.clientErrors + p.clientErrors }), { count: 0, serverErrors: 0, clientErrors: 0 }),
    [points],
  )

  return { hours, setHours, points, failures, totals, reload: load }
}
