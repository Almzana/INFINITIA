import * as React from "react"
import { useAuth } from "@/lib/auth"
import { type RawResponse, sendRaw } from "@/lib/dev-api"
import { buildUrl, type Endpoint, sampleValue } from "@/lib/openapi"

export interface HistoryItem {
  at: string
  method: string
  url: string
  status: number
  ms: number
}

const HISTORY_MAX = 15
// Per account: another developer on the same browser must not see these URLs (they carry ids)
const historyKey = (account: string) => `dev-console:history:${account}`

// Per-viewer convenience only: storage can be unavailable (private mode), so every access is guarded
function readHistory(key: string): HistoryItem[] {
  try {
    localStorage.removeItem("dev-console:history") // the old, shared key
    return JSON.parse(localStorage.getItem(key) ?? "[]") as HistoryItem[]
  } catch {
    return []
  }
}
function writeHistory(key: string, items: HistoryItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

/** Form state and sending for one operation: path / query values, a JSON body pre-filled from its schema. */
export function useRequestRunner() {
  const key = historyKey(useAuth().user?.id ?? "anonymous")
  const [endpoint, setEndpoint] = React.useState<Endpoint | null>(null)
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [body, setBody] = React.useState("")
  const [bodyError, setBodyError] = React.useState<string | null>(null)
  const [response, setResponse] = React.useState<RawResponse | null>(null)
  const [sending, setSending] = React.useState(false)
  const [history, setHistory] = React.useState<HistoryItem[]>(() => readHistory(key))
  // The account became known (or changed) after mount: show that account's history
  React.useEffect(() => setHistory(readHistory(key)), [key])

  const select = (e: Endpoint) => {
    setEndpoint(e)
    const v: Record<string, string> = {}
    for (const p of e.params) if (p.required || p.schema.default !== undefined) v[p.name] = p.in === "path" ? "" : String(sampleValue(p.schema, p.name))
    setValues(v)
    setBody(e.bodyType?.includes("json") && e.body ? JSON.stringify(sampleValue(e.body), null, 2) : "")
    setBodyError(null)
    setResponse(null)
  }

  const setValue = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }))
  const url = endpoint ? buildUrl(endpoint, values) : ""
  const missing = endpoint ? endpoint.params.filter((p) => p.in === "path" && !values[p.name]).map((p) => p.name) : []

  const send = async () => {
    if (!endpoint || missing.length) return
    if (body && endpoint.bodyType?.includes("json")) {
      try {
        JSON.parse(body)
      } catch (err) {
        return setBodyError(String((err as Error).message))
      }
    }
    setBodyError(null)
    setSending(true)
    const res = await sendRaw(endpoint.method, url, endpoint.bodyType ? body : undefined, endpoint.bodyType ?? undefined)
    setResponse(res)
    setSending(false)
    const entry = { at: new Date().toISOString(), method: endpoint.method, url, status: res.status, ms: res.ms }
    // Functional update: two requests in flight must not drop each other's entry
    setHistory((h) => {
      const next = [entry, ...h].slice(0, HISTORY_MAX)
      writeHistory(key, next)
      return next
    })
  }

  const clearHistory = () => {
    setHistory([])
    writeHistory(key, [])
  }

  return { endpoint, select, values, setValue, body, setBody, bodyError, url, missing, send, sending, response, history, clearHistory }
}
