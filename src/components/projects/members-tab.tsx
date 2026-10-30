import { InfoIcon, XIcon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { EmptyState } from "@/components/shared/misc"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Employee } from "@/data/mock"
import type { Project } from "@/data/projects"
import { useProjectActions } from "@/hooks/use-project-actions"
import { useEmployeeMap, useStore } from "@/lib/store"
import { deptLabel, t } from "@/i18n"
import { MemberPicker } from "./member-picker"

/** Who may log hours on this project; executives and the creating Leader add or remove members. */
export function MembersTab({ project }: { project: Project }) {
  const { state } = useStore()
  const employees = useEmployeeMap()
  const { canEditProject, addMember, removeMember } = useProjectActions()
  const canEdit = canEditProject(project)
  const ids = project.memberIds ?? []
  const members = ids.map((id) => employees.get(id)).filter((e): e is Employee => !!e)
  const candidates = state.employees.filter((e) => e.status !== "resigned" && !ids.includes(e.id))
  // Hours each member logged here (only what this viewer has loaded)
  const hoursOf = (id: string) => state.timesheet.filter((x) => x.projectId === project.id && x.employeeId === id).reduce((s, x) => s + x.hours, 0)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{t("projects.members.title")} ({members.length})</CardTitle>
          <CardDescription>{t("projects.members.description")}</CardDescription>
        </div>
        {canEdit && <MemberPicker candidates={candidates} onPick={(e) => void addMember(project, e.id)} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <EmptyState title={t("projects.members.empty")} />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {members.map((e) => {
              const hours = hoursOf(e.id)
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <EmployeeAvatar person={e} className="size-9" fallbackClassName="text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.firstName} {e.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.position} · {deptLabel(e.department)}
                      {hours > 0 && ` · ${t("projects.members.hours", { n: hours })}`}
                    </p>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => void removeMember(project, e.id)} aria-label={t("projects.members.remove", { name: e.firstName })}>
                      <XIcon />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {canEdit && members.length > 0 && (
          <p className="flex gap-1.5 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" /> {t("projects.members.removeHint")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
