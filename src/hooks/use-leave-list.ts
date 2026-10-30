import * as React from "react"
import type { LeaveRequest, LeaveStatus } from "@/data/mock"

export type LeaveTab = "all" | LeaveStatus

/** Tab filter, paging and the selection for bulk decisions (only rows the API marks `canDecide`). */
export function useLeaveList(leaves: LeaveRequest[]) {
  const [tab, setTabState] = React.useState<LeaveTab>("pending")
  const [page, setPageState] = React.useState(1)
  const [pageSize, setPageSizeState] = React.useState(10)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const counts = {
    all: leaves.length,
    pending: leaves.filter((l) => l.status === "pending").length,
    approved: leaves.filter((l) => l.status === "approved").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
  }
  const filtered = leaves.filter((l) => tab === "all" || l.status === tab)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const decidableRows = rows.filter((r) => r.canDecide)
  const allSelected = decidableRows.length > 0 && decidableRows.every((r) => selected.has(r.id))

  const clear = () => setSelected(new Set())
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })
  const toggleAll = (on: boolean) => setSelected(on ? new Set(decidableRows.map((r) => r.id)) : new Set())

  const setTab = (v: LeaveTab) => {
    setTabState(v)
    setPageState(1)
    clear()
  }
  const setPage = (p: number) => {
    setPageState(p)
    clear()
  }
  const setPageSize = (s: number) => {
    setPageSizeState(s)
    setPageState(1)
  }

  return { tab, setTab, counts, total: filtered.length, rows, page: safePage, setPage, pageSize, setPageSize, selected, toggle, toggleAll, allSelected, decidableCount: decidableRows.length, clear }
}
