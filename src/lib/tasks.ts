import { addDays, format, parseISO } from "date-fns"
import type { TagType } from "@/components/shared/tag"
import { labelMap, t } from "@/i18n"
import { apiFetch, fetchAllPages } from "@/lib/api"
import { formatDate } from "@/lib/format"

export type TaskPriority = "low" | "medium" | "high"
export type TaskStatus = "todo" | "done"

export interface Task {
  id: string
  title: string
  description: string | null
  assigneeEmail: string
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  projectId: string | null
  /** Set when a leader assigned this task */
  assignedByUserId: string | null
  assignedByName: string | null
  createdAt: string
  updatedAt: string
}

/** Assignee defaults to the signed-in user; the server checks any assigneeEmployeeId. */
export type NewTask = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "dueDate" | "priority" | "projectId">> & {
    /** Leader: assign to a team member instead of myself */
    assigneeEmployeeId?: string
  }
export type TaskPatch = Partial<Pick<Task, "title" | "description" | "dueDate" | "priority" | "status" | "projectId">>

export const priorityLabel = labelMap<TaskPriority>("tasks.priority", ["high", "medium", "low"])
export const priorityTag: Record<TaskPriority, TagType> = { high: "danger", medium: "warning", low: "info" }

/** Human label + urgency for a due date relative to today (both "YYYY-MM-DD"). */
export function dueInfo(dueDate: string | null, today: string): { label: string; tone: "overdue" | "today" | "normal" } | null {
  if (!dueDate) return null
  if (dueDate < today) return { label: t("tasks.overdue", { date: formatDate(dueDate, "d MMM") }), tone: "overdue" }
  if (dueDate === today) return { label: t("common.today"), tone: "today" }
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd")
  if (dueDate === tomorrow) return { label: t("common.tomorrow"), tone: "normal" }
  return { label: formatDate(dueDate, "d MMM"), tone: "normal" }
}

export const tasksApi = {
  /** My tasks, or a team member's (leader / executive) when employeeId is given */
  list: async (employeeId?: string) => ({
    data: await fetchAllPages((page) =>
      apiFetch<{ data: Task[]; meta: { total: number } }>(
        `/tasks?${new URLSearchParams({ pageSize: "100", page: String(page), ...(employeeId ? { employeeId } : {}) })}`,
      ),
    ),
  }),
  create: (input: NewTask) => apiFetch<Task>("/tasks", { method: "POST", json: input }),
  update: (id: string, patch: TaskPatch) => apiFetch<Task>(`/tasks/${id}`, { method: "PATCH", json: patch }),
  remove: (id: string) => apiFetch<void>(`/tasks/${id}`, { method: "DELETE" }),
}
