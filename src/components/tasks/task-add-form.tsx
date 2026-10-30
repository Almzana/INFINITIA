import * as React from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { t } from "@/i18n"
import type { TeamMember } from "@/lib/team-api"
import { priorityLabel, type NewTask, type TaskPriority } from "@/lib/tasks"

const ME = "me"

/** Quick add. Leaders also get an "assign to" picker with their team members. */
export function TaskAddForm({ onAdd, members = [] }: { onAdd: (draft: NewTask) => Promise<boolean>; members?: TeamMember[] }) {
  const [title, setTitle] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  const [priority, setPriority] = React.useState<TaskPriority>("medium")
  const [assignee, setAssignee] = React.useState(ME)
  const [saving, setSaving] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const ok = await onAdd({
      title: title.trim(),
      dueDate: dueDate || null,
      priority,
      ...(assignee !== ME ? { assigneeEmployeeId: assignee } : {}),
    })
    setSaving(false)
    if (ok) {
      setTitle("")
      setDueDate("")
      setPriority("medium")
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 lg:flex-row">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={assignee === ME ? t("tasks.form.placeholderNew") : t("tasks.form.placeholderAssign")}
        maxLength={200}
        aria-label={t("tasks.form.title")}
        className="lg:flex-1"
      />
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        {members.length > 0 && (
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-full sm:w-40" aria-label={t("tasks.form.assignTo")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ME}>{t("tasks.form.self")}</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.firstName} {m.nickname && `(${m.nickname})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label={t("tasks.form.dueDate")} className="min-w-0 flex-1 sm:w-40" />
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
          <SelectTrigger className="w-28" aria-label={t("tasks.form.priority")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(priorityLabel) as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {priorityLabel[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="icon" disabled={saving || !title.trim()} aria-label={assignee === ME ? t("tasks.form.add") : t("tasks.form.assign")}>
          <PlusIcon />
        </Button>
      </div>
    </form>
  )
}
