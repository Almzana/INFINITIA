import * as React from "react"
import { ChevronRightIcon, UsersRoundIcon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tag } from "@/components/shared/tag"
import { t } from "@/i18n"
import type { TeamMember } from "@/lib/team-api"
import { TeamMemberSheet } from "./team-member-sheet"

/** Leaders only: each direct report with their open / overdue task counts. */
export function TeamCard({ members }: { members: TeamMember[] }) {
  const [viewing, setViewing] = React.useState<TeamMember | null>(null)
  const open = members.reduce((s, m) => s + m.openTasks, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRoundIcon className="size-4 text-primary" /> {t("dashboard.team.title")}
        </CardTitle>
        <CardDescription>
          {t("dashboard.team.description", { n: members.length, open })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <li key={m.id}>
              <button onClick={() => setViewing(m)} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40">
                <EmployeeAvatar person={m} className="size-9" fallbackClassName="text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.firstName} {m.nickname && <span className="font-normal text-muted-foreground">({m.nickname})</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.position}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Tag type={m.openTasks ? "primary" : "success"}>{m.openTasks ? t("dashboard.team.open", { n: m.openTasks }) : t("dashboard.team.free")}</Tag>
                  {m.overdueTasks > 0 && <Tag type="danger">{t("dashboard.team.overdue", { n: m.overdueTasks })}</Tag>}
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
      <TeamMemberSheet member={viewing} onClose={() => setViewing(null)} />
    </Card>
  )
}
