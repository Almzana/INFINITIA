import * as React from "react"
import type { TagType } from "@/components/shared/tag"
import {
  type ChangeOrderStatus,
  financeOf,
  type InstallmentStatus,
  type Project,
  type ProjectFinance,
  type ProjectStatus,
  projectStatus,
} from "@/data/projects"
import { useProjectHours, useStore } from "@/lib/store"

export const projectStatusTag: Record<ProjectStatus, TagType> = {
  completed: "success",
  handover: "primary",
  "in-progress": "warning",
  design: "info",
}

export const installmentTag: Record<InstallmentStatus, TagType> = { pending: "info", invoiced: "warning", paid: "success" }
export const changeOrderTag: Record<ChangeOrderStatus, TagType> = { pending: "warning", approved: "success", rejected: "danger" }

export interface ProjectRow {
  project: Project
  status: ProjectStatus
  finance: ProjectFinance
}

/** Every project with its derived status and finance (timesheet hours included). */
export function useProjectRows(): ProjectRow[] {
  const { state } = useStore()
  const hours = useProjectHours()
  return React.useMemo(
    () => state.projects.map((p) => ({ project: p, status: projectStatus(p), finance: financeOf(p, hours.get(p.id) ?? 0) })),
    [state.projects, hours],
  )
}

export function marginTone(m: number) {
  if (m >= 0.25) return "text-success"
  if (m >= 0.18) return "text-foreground"
  return "text-warning"
}
