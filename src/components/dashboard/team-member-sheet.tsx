import { CalendarIcon, CheckCircle2Icon, CircleIcon } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { useMemberTasks } from "@/hooks/use-member-tasks"
import { t } from "@/i18n"
import { todayISO } from "@/lib/format"
import type { TeamMember } from "@/lib/team-api"
import { dueInfo, priorityLabel, priorityTag } from "@/lib/tasks"
import { cn } from "@/lib/utils"

/** A team member's tasks, as seen by their leader. */
export function TeamMemberSheet({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const { tasks, loading, error } = useMemberTasks(member?.id ?? null)
  const today = todayISO()

  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {t("dashboard.team.memberTasks", { name: `${member?.firstName ?? ""} ${member?.lastName ?? ""}` })}
          </SheetTitle>
          <SheetDescription>
            {member?.position} · {t("dashboard.team.memberOpen", { n: member?.openTasks ?? 0 })}
            {member?.overdueTasks ? t("dashboard.team.memberOverdue", { n: member.overdueTasks }) : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : tasks.length === 0 ? (
            <EmptyState title={t("dashboard.team.noTasks")} description={t("dashboard.team.noTasksDesc")} />
          ) : (
            <ul className="divide-y">
              {tasks.map((task) => {
                const done = task.status === "done"
                const due = done ? null : dueInfo(task.dueDate, today)
                return (
                  <li key={task.id} className={cn("flex gap-3 py-3", done && "opacity-60")}>
                    {done ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={cn("text-sm font-medium break-words", done && "line-through")}>{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {!done && <Tag type={priorityTag[task.priority]}>{priorityLabel[task.priority]}</Tag>}
                        {due && (
                          <span className={cn("inline-flex items-center gap-1", due.tone === "overdue" && "text-destructive")}>
                            <CalendarIcon className="size-3.5" /> {due.label}
                          </span>
                        )}
                        <span>{task.assignedByName ? t("tasks.assignedBy", { name: task.assignedByName }) : t("tasks.selfCreated")}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
