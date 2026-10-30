import { Link } from "react-router-dom"
import { ArrowRightIcon, CalendarClockIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { useMyMeetings } from "@/hooks/use-my-meetings"
import { t } from "@/i18n"
import { formatDate } from "@/lib/format"

/** Upcoming meetings I organize or attend. */
export function MyMeetingsCard({ className }: { className?: string }) {
  const { meetings, total, roomName, today } = useMyMeetings()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClockIcon className="size-4 text-primary" /> {t("dashboard.meetings.title")}
        </CardTitle>
        <CardDescription>{t("dashboard.meetings.description", { n: total })}</CardDescription>
        <CardAction>
          <Button variant="link" asChild className="h-auto p-0">
            <Link to="/rooms">
              {t("dashboard.meetings.schedule")} <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <EmptyState title={t("dashboard.meetings.empty")} description={t("dashboard.meetings.emptyDesc")} />
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => (
              <li key={m.id} className="flex gap-3 text-sm">
                <div className="w-14 shrink-0 pt-0.5 text-xs tabular-nums">
                  <p className="font-medium text-primary">{m.start}</p>
                  <p className="text-muted-foreground">{m.date === today ? t("common.today") : formatDate(m.date, "d MMM")}</p>
                </div>
                <div className="min-w-0 flex-1 border-l-2 border-primary/40 pl-3">
                  <p className="truncate font-medium">{m.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>
                      {roomName(m.roomId)} · {m.start}–{m.end}
                    </span>
                    {(m.attendeeIds?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <UsersIcon className="size-3" /> {m.attendeeIds?.length}
                      </span>
                    )}
                    {m.canEdit && m.organizerUserId && <Tag className="h-5">{t("dashboard.meetings.organizer")}</Tag>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
