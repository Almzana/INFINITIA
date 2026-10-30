import { apiFetch } from "@/lib/api"

export const AUDIT_ENTITIES = ["user", "employee", "leave", "project", "announcement"] as const
export type AuditEntity = (typeof AUDIT_ENTITIES)[number]

export interface AuditRow {
  id: number
  at: string
  actorName: string
  action: string
  entity: string
  entityId: string | null
  details: Record<string, unknown>
  ip: string | null
}

export interface AuditQuery {
  page: number
  pageSize: number
  entity?: string
  q?: string
}

export interface AuditPage {
  data: AuditRow[]
  meta: { page: number; pageSize: number; total: number }
}

/** Executives only (the API answers 403 otherwise). Server-side paging, newest first. */
export const auditApi = {
  list: ({ page, pageSize, entity, q }: AuditQuery, signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(Math.min(pageSize, 200)) })
    if (entity) params.set("entity", entity)
    if (q?.trim()) params.set("q", q.trim())
    return apiFetch<AuditPage>(`/audit?${params.toString()}`, { signal })
  },
}
