import { ListTodoIcon, RotateCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/misc"
import { useTasks } from "@/hooks/use-tasks"
import { t } from "@/i18n"
import type { TeamMember } from "@/lib/team-api"
import { TaskAddForm } from "./task-add-form"
import { TaskItem } from "./task-item"

/** Dashboard card: the signed-in user's to-do list, backed by the tasks API. */
export function TodoCard({ className, members, onAssigned }: { className?: string; members?: TeamMember[]; onAssigned?: () => void }) {
  const { tasks, loading, error, summary, today, reload, add, toggle, remove } = useTasks()

  const description = loading
    ? t("common.loading")
    : t("tasks.card.open", { n: summary.open }) + (summary.overdue ? t("tasks.card.overdue", { n: summary.overdue }) : "") + t("tasks.card.done", { n: summary.done })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodoIcon className="size-4 text-primary" /> {t("tasks.card.title")}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => void reload()} aria-label={t("tasks.card.reload")}>
            <RotateCwIcon className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <TaskAddForm
          members={members}
          onAdd={async (draft) => {
            const ok = await add(draft)
            if (ok && draft.assigneeEmployeeId) onAssigned?.()
            return ok
          }}
        />

        {loading && tasks.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm">
            <p className="text-destructive">{t("tasks.card.connectError", { error })}</p>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState title={t("tasks.card.empty")} description={t("tasks.card.emptyDesc")} />
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto pr-1">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} today={today} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
