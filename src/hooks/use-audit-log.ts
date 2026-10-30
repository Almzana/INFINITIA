import * as React from "react"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { type AuditRow, auditApi } from "@/lib/audit-api"

export interface AuditFilters {
  entity: string // "all" or one of AUDIT_ENTITIES
  q: string
}

const EMPTY: AuditFilters = { entity: "all", q: "" }
export const AUDIT_PAGE_SIZES = [20, 50, 100]

/** Server-paged audit log: draft filters are applied on submit, page/pageSize drive the request. */
export function useAuditLog() {
  const [draft, setDraft] = React.useState<AuditFilters>(EMPTY)
  const [applied, setApplied] = React.useState<AuditFilters>(EMPTY)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(AUDIT_PAGE_SIZES[0])
  const [rows, setRows] = React.useState<AuditRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [selected, setSelected] = React.useState<AuditRow | null>(null)

  React.useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    auditApi
      .list({ page, pageSize, entity: applied.entity === "all" ? undefined : applied.entity, q: applied.q }, ctrl.signal)
      .then((res) => {
        setRows(res.data)
        setTotal(res.meta.total)
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        setRows([])
        setTotal(0)
        setError(err instanceof ApiError && err.status === 403 ? t("audit.error.forbidden") : t("audit.error.load"))
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [page, pageSize, applied, reloadKey])

  const search = (e?: React.FormEvent) => {
    e?.preventDefault()
    setApplied({ ...draft, q: draft.q.trim() })
    setPage(1)
  }

  const reset = () => {
    setDraft(EMPTY)
    setApplied(EMPTY)
    setPage(1)
  }

  const changePageSize = (s: number) => {
    setPageSize(s)
    setPage(1)
  }

  return {
    draft,
    setDraft,
    search,
    reset,
    rows,
    total,
    page,
    pageSize,
    setPage,
    changePageSize,
    loading,
    error,
    retry: () => setReloadKey((k) => k + 1),
    selected,
    select: setSelected,
  }
}
