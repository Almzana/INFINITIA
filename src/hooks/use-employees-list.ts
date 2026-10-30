import * as React from "react"
import { toast } from "sonner"
import type { Employee } from "@/data/mock"
import { apiErrorToForm } from "@/hooks/use-employee-form"
import { employeesApi } from "@/lib/employees-api"
import { useStore } from "@/lib/store"
import { t } from "@/i18n"

export type SortKey = "code" | "firstName" | "department" | "startDate" | "salary"
export type Sort = { key: SortKey; dir: "asc" | "desc" } | null
export type Filters = { keyword: string; dept: string; status: string }

const noFilters: Filters = { keyword: "", dept: "all", status: "all" }

/** Search / sort / paging / selection / delete for the employees table. */
export function useEmployeesList() {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = React.useState<Filters>(noFilters)
  const [applied, setApplied] = React.useState<Filters>(noFilters)
  const [sort, setSort] = React.useState<Sort>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const filtered = React.useMemo(() => {
    const kw = applied.keyword.trim().toLowerCase()
    let rows = state.employees.filter(
      (e) =>
        (!kw || `${e.firstName} ${e.lastName} ${e.nickname} ${e.code} ${e.email} ${e.position} ${e.username ?? ""}`.toLowerCase().includes(kw)) &&
        (applied.dept === "all" || e.department === applied.dept) &&
        (applied.status === "all" || e.status === applied.status),
    )
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key] ?? 0
        const bv = b[sort.key] ?? 0
        const r = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv), "th")
        return sort.dir === "asc" ? r : -r
      })
    }
    return rows
  }, [state.employees, applied, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const onSort = (k: SortKey) => setSort((s) => (s?.key !== k ? { key: k, dir: "asc" } : s.dir === "asc" ? { key: k, dir: "desc" } : null))

  const search = (e?: React.FormEvent) => {
    e?.preventDefault()
    setApplied(draft)
    setPage(1)
    // Don't keep rows selected that the new filter hides (they would be deleted invisibly)
    setSelected(new Set())
  }
  const reset = () => {
    setDraft(noFilters)
    setApplied(noFilters)
    setPage(1)
    setSelected(new Set())
  }

  const toggle = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)))
      return n
    })

  const remove = async (ids: string[]) => {
    try {
      const { deleted } = await employeesApi.remove(ids)
      dispatch({ type: "employee/delete", ids })
      toggle(ids, false)
      toast.success(t("employees.toast.deleted", { n: deleted }))
    } catch (err) {
      apiErrorToForm(err)
    }
  }

  const changePageSize = (s: number) => {
    setPageSize(s)
    setPage(1)
  }

  return {
    draft, setDraft, search, reset, filtered, rows, sort, onSort, page: safePage, setPage, pageSize, changePageSize, selected, toggle, remove,
    findById: (id: string): Employee | undefined => state.employees.find((e) => e.id === id),
  }
}
