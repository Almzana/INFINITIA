import * as React from "react"
import { sendRaw, type Verdict, verdictOf } from "@/lib/dev-api"
import { buildUrl, type Endpoint, isAutoCheckable, sampleValue } from "@/lib/openapi"

export interface CheckResult {
  status: number
  ms: number
  verdict: Verdict
  /** Error code from the body, when there is one */
  code: string | null
}

const CONCURRENCY = 4

/** Required query parameters get sample values (e.g. a 7-day date range) so the call is valid. */
function checkUrl(e: Endpoint) {
  const values: Record<string, string> = {}
  for (const p of e.params) if (p.in === "query" && p.required) values[p.name] = String(sampleValue(p.schema, p.name))
  return buildUrl(e, values)
}

/**
 * Calls every read-only route that needs no id, a few at a time, as the signed-in user.
 * Routes that change data are never called automatically.
 */
export function useHealthCheck(endpoints: Endpoint[]) {
  const checkable = React.useMemo(() => endpoints.filter(isAutoCheckable), [endpoints])
  const [results, setResults] = React.useState<Record<string, CheckResult>>({})
  const [running, setRunning] = React.useState(false)
  const [done, setDone] = React.useState(0)
  const [lastRun, setLastRun] = React.useState<Date | null>(null)

  const run = async () => {
    setRunning(true)
    setDone(0)
    setResults({})
    const queue = [...checkable]
    const worker = async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        const res = await sendRaw("GET", checkUrl(e))
        let code: string | null = null
        if (res.status >= 400) {
          try {
            code = JSON.parse(res.body)?.error?.code ?? null
          } catch {
            /* not JSON */
          }
        }
        const id = e.id
        setResults((r) => ({ ...r, [id]: { status: res.status, ms: res.ms, verdict: verdictOf(res.status), code } }))
        setDone((d) => d + 1)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setRunning(false)
    setLastRun(new Date())
  }

  const summary = React.useMemo(() => {
    const list = Object.values(results)
    const count = (v: Verdict) => list.filter((r) => r.verdict === v).length
    return { ok: count("ok"), denied: count("denied"), invalid: count("invalid"), broken: count("broken"), avgMs: list.length ? Math.round(list.reduce((a, r) => a + r.ms, 0) / list.length) : 0 }
  }, [results])

  return { checkable, results, running, done, lastRun, run, summary }
}
