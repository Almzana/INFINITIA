import * as React from "react"
import { t } from "@/i18n"
import { type Task, tasksApi } from "@/lib/tasks"

/** Tasks of one team member (the API only allows their leader or an executive). */
export function useMemberTasks(employeeId: string | null) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    tasksApi
      .list(employeeId)
      .then((res) => !cancelled && setTasks(res.data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : t("tasks.memberLoadFailed")))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [employeeId])

  return { tasks, loading, error }
}
