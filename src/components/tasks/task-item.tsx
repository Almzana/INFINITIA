import { CalendarIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tag } from "@/components/shared/tag"
import { t } from "@/i18n"
import { dueInfo, priorityLabel, priorityTag, type Task } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const dueTone = {
  overdue: "text-destructive",
  today: "text-warning font-medium",
  normal: "text-muted-foreground",
}

export function TaskItem({
  task,
  today,
  onToggle,
  onRemove,
}: {
  task: Task
  today: string
  onToggle: (task: Task) => void
  onRemove: (task: Task) => void
}) {
  const done = task.status === "done"
  const due = done ? null : dueInfo(task.dueDate, today)
  const checkboxId = `task-${task.id}`

  return (
    <li className={cn("group flex items-start gap-3 py-3 first:pt-0 last:pb-0", done && "opacity-60")}>
      <Checkbox id={checkboxId} checked={done} onCheckedChange={() => onToggle(task)} className="mt-0.5" aria-label={t("tasks.item.markDone", { title: task.title })} />
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={checkboxId} className={cn("block cursor-pointer text-sm font-medium break-words", done && "line-through")}>
          {task.title}
        </label>
        {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
        {task.assignedByName && <p className="text-xs text-primary">{t("tasks.assignedBy", { name: task.assignedByName })}</p>}
        {(due || !done) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!done && <Tag type={priorityTag[task.priority]}>{priorityLabel[task.priority]}</Tag>}
            {due && (
              <span className={cn("inline-flex items-center gap-1", dueTone[due.tone])}>
                <CalendarIcon className="size-3.5" /> {due.label}
              </span>
            )}
          </div>
        )}
      </div>
      {/* Tasks a leader assigned can only be removed by that leader */}
      {!task.assignedByUserId && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          onClick={() => onRemove(task)}
          aria-label={t("tasks.item.remove", { title: task.title })}
        >
          <Trash2Icon className="size-4" />
        </Button>
      )}
    </li>
  )
}
