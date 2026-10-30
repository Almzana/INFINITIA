import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { enUS, th } from "react-day-picker/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getLang, t } from "@/i18n"

const iso = (d: Date) => format(d, "yyyy-MM-dd")

/** Date-range picker; company holidays are marked in the calendar. Shows the working-day count. */
export function LeaveRangeField({ range, onChange, days, holidays, invalid }: {
  range: DateRange | undefined
  onChange: (r: DateRange | undefined) => void
  days: number
  holidays: Set<string>
  invalid: boolean
}) {
  const label = range?.from
    ? range.to && range.to.getTime() !== range.from.getTime()
      ? `${formatDate(iso(range.from))} – ${formatDate(iso(range.to))}`
      : formatDate(iso(range.from))
    : t("leave.form.pickRange")
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-invalid={invalid} className={cn("w-full justify-start font-normal", !range?.from && "text-muted-foreground")}>
          <CalendarIcon />
          <span className="truncate">{label}</span>
          {range?.from && <span className="ml-auto shrink-0 text-primary">{t("leave.form.workingDays", { n: days })}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={onChange}
          numberOfMonths={1}
          locale={getLang() === "en" ? enUS : th}
          modifiers={{ holiday: (d: Date) => holidays.has(iso(d)) }}
          modifiersClassNames={{ holiday: "text-destructive font-semibold" }}
        />
      </PopoverContent>
    </Popover>
  )
}
