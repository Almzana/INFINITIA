import * as React from "react"
import { CalendarHeartIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, todayISO } from "@/lib/format"
import type { Holiday } from "@/lib/leaves-api"
import { t } from "@/i18n"
import { HolidayForm } from "./holiday-form"

const SHORT = 5

/** Upcoming company holidays (whole year on demand); HR / executives add and remove them. */
export function HolidaysCard({ holidays, year, onYear, canManage, onAdd, onRemove }: {
  holidays: Holiday[]
  year: number
  onYear: (y: number) => void
  canManage: boolean
  onAdd: (h: Holiday) => Promise<boolean>
  onRemove: (date: string) => void
}) {
  const [all, setAll] = React.useState(false)
  const today = todayISO()
  const thisYear = holidays.filter((h) => h.date.startsWith(String(year)))
  const upcoming = thisYear.filter((h) => h.date >= today)
  // Another year: show it whole; this year: the next few, the whole year on demand
  const isCurrent = String(year) === today.slice(0, 4)
  const list = all || !isCurrent ? thisYear : upcoming.slice(0, SHORT)

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1">
          <CalendarHeartIcon className="mr-1 size-4 text-primary" /> {t("leave.holidays.title")}
          <Button variant="ghost" size="icon-xs" onClick={() => onYear(year - 1)} aria-label={t("leave.holidays.prevYear")}>
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">{formatDate(`${year}-01-01`, "yyyy")}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => onYear(year + 1)} aria-label={t("leave.holidays.nextYear")}>
            <ChevronRightIcon />
          </Button>
        </CardTitle>
        {isCurrent && thisYear.length > SHORT && (
          <Button variant="link" size="xs" className="h-auto p-0" onClick={() => setAll((a) => !a)}>
            {all ? t("leave.holidays.less") : t("leave.holidays.all", { n: thisYear.length })}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">{t(isCurrent ? "leave.holidays.empty" : "leave.holidays.emptyYear")}</p>}
        <ul className="divide-y">
          {list.map((h) => (
            <li key={h.date} className="flex items-center gap-3 py-2 text-sm">
              <span className={`w-24 shrink-0 tabular-nums ${h.date < today ? "text-muted-foreground" : "font-medium"}`}>{formatDate(h.date, "EEE d MMM")}</span>
              <span className="min-w-0 flex-1 truncate">{h.name}</span>
              {isCurrent && h.date === upcoming[0]?.date && <span className="shrink-0 rounded bg-primary/10 px-1.5 text-[11px] text-primary">{t("leave.holidays.next")}</span>}
              {canManage && (
                <Button variant="ghost" size="icon-xs" onClick={() => onRemove(h.date)} aria-label={t("leave.holidays.remove", { name: h.name })}>
                  <XIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="space-y-2 border-t pt-3">
            <HolidayForm onAdd={onAdd} />
            <p className="flex gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" /> {t("leave.holidays.hint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
