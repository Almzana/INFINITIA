import * as React from "react"
import { toast } from "sonner"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { todayISO } from "@/lib/format"
import { type NewTask, type Task, tasksApi } from "@/lib/tasks"

/** Same order as the API: open first, then due date (none last), then priority. */
const rank = { high: 0, medium: 1, low: 2 }
function sortTasks(list: Task[]) {
  return [...list].sort(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      rank[a.priority] - rank[b.priority],
  )
}

/** Loads and mutates the signed-in user's to-do list. UI components only render what this returns. */
export function useTasks() {
  const { user, logout } = useAuth()
  const email = user?.email
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  /** Session expired or revoked on the server: sign out locally so the router sends the user to /login. */
  const handleAuthError = React.useCallback(
    (err: unknown) => {
      // AuthProvider already signs out and tells the user (SESSION_EXPIRED from apiFetch)
      return err instanceof ApiError && err.status === 401
    },
    [logout],
  )

  const reload = React.useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await tasksApi.list()
      setTasks(res.data)
      setError(null)
    } catch (err) {
      if (!handleAuthError(err)) setError(err instanceof Error ? err.message : t("tasks.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [email, handleAuthError])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const add = async (input: NewTask) => {
    try {
      const created = await tasksApi.create(input)
      // A task assigned to a team member is not mine: confirm instead of listing it
      if (created.assigneeEmail === email) setTasks((prev) => sortTasks([...prev, created]))
      else toast.success(t("tasks.assigned"), { description: created.title })
      return true
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : t("tasks.addFailed"))
      return false
    }
  }

  // Optimistic: flip immediately, roll back if the server rejects it
  const toggle = async (task: Task) => {
    const status = task.status === "done" ? "todo" : "done"
    setTasks((prev) => sortTasks(prev.map((x) => (x.id === task.id ? { ...x, status } : x))))
    try {
      await tasksApi.update(task.id, { status })
    } catch (err) {
      setTasks((prev) => sortTasks(prev.map((x) => (x.id === task.id ? task : x))))
      if (!handleAuthError(err)) toast.error(t("tasks.toggleFailed"))
    }
  }

  const remove = async (task: Task) => {
    setTasks((prev) => prev.filter((x) => x.id !== task.id))
    try {
      await tasksApi.remove(task.id)
    } catch (err) {
      setTasks((prev) => sortTasks([...prev, task]))
      if (!handleAuthError(err)) toast.error(t("tasks.removeFailed"))
    }
  }

  const today = todayISO()
  const open = tasks.filter((x) => x.status === "todo")
  const summary = {
    open: open.length,
    overdue: open.filter((x) => x.dueDate && x.dueDate < today).length,
    done: tasks.length - open.length,
  }

  return { tasks, loading, error, summary, today, reload, add, toggle, remove }
}
