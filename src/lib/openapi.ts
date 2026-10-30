import { addDays, format } from "date-fns"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface JsonSchema {
  type?: string | string[]
  format?: string
  enum?: unknown[]
  const?: unknown
  default?: unknown
  minimum?: number
  minLength?: number
  pattern?: string
  items?: JsonSchema
  properties?: Record<string, JsonSchema>
  required?: string[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
}

export interface Param {
  name: string
  in: "path" | "query" | "header"
  required: boolean
  schema: JsonSchema
}

export interface Endpoint {
  id: string
  method: HttpMethod
  path: string
  tag: string
  summary: string
  secured: boolean
  params: Param[]
  body: JsonSchema | null
  bodyType: string | null
}

interface RawOp {
  tags?: string[]
  summary?: string
  security?: unknown[]
  parameters?: { name: string; in: string; required?: boolean; schema?: JsonSchema }[]
  requestBody?: { content?: Record<string, { schema?: JsonSchema }> }
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"]

/** Flatten an OpenAPI 3 document into a list of operations the console can show and call. */
export function parseSpec(spec: { paths?: Record<string, Record<string, RawOp>> }): Endpoint[] {
  const out: Endpoint[] = []
  for (const [path, ops] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      const op = ops[method.toLowerCase()]
      if (!op) continue
      const content = op.requestBody?.content ?? {}
      const bodyType = Object.keys(content)[0] ?? null
      out.push({
        id: `${method} ${path}`,
        method,
        path,
        tag: op.tags?.[0] ?? "other",
        summary: op.summary ?? "",
        secured: !!op.security?.length,
        params: (op.parameters ?? [])
          .filter((p) => p.in === "path" || p.in === "query")
          .map((p) => ({ name: p.name, in: p.in as Param["in"], required: !!p.required || p.in === "path", schema: p.schema ?? {} })),
        body: bodyType ? (content[bodyType].schema ?? {}) : null,
        bodyType,
      })
    }
  }
  return out
}

/** Read-only and needs no ids: safe to call automatically in the health check. */
export const isAutoCheckable = (e: Endpoint) => e.method === "GET" && !e.params.some((p) => p.in === "path") && e.bodyType === null

/** A plausible value for a schema, used to pre-fill forms and required query parameters. */
export function sampleValue(s: JsonSchema, name = ""): unknown {
  if (s.const !== undefined) return s.const
  if (s.default !== undefined) return s.default
  if (s.enum?.length) return s.enum[0]
  const branch = s.oneOf?.[0] ?? s.anyOf?.[0]
  if (branch) return sampleValue(branch, name)
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type
  if (type === "object" || s.properties) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(s.properties ?? {})) obj[k] = sampleValue(v, k)
    return obj
  }
  if (type === "array") return s.items ? [sampleValue(s.items, name)] : []
  if (type === "integer" || type === "number") return s.minimum ?? 1
  if (type === "boolean") return false
  if (s.format === "date" || /date|^from$|^to$/i.test(name)) return format(addDays(new Date(), name === "to" ? 7 : 0), "yyyy-MM-dd")
  if (s.format === "email") return "someone@example.com"
  return name ? `test ${name}`.padEnd(s.minLength ?? 0, "x") : ""
}

/** "/api/x/{id}" + values → "/api/x/42?q=1" (empty optional query values are left out). */
export function buildUrl(e: Endpoint, values: Record<string, string>) {
  let url = e.path.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(values[k] ?? ""))
  const q = new URLSearchParams()
  for (const p of e.params) if (p.in === "query" && values[p.name]) q.set(p.name, values[p.name])
  const qs = q.toString()
  if (qs) url += `?${qs}`
  return url
}
