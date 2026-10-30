import { addDays, format, parseISO } from "date-fns"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n"
import { dateLocale } from "@/lib/format"
import { cn } from "@/lib/utils"

const shift = (d: string, n: number) => format(addDays(parseISO(d), n), "yyyy-MM-dd")

/** Prev / next day buttons around a 7-day strip starting yesterday. */
export function DayStrip({ today, date, onChange }: { today: string; date: string; onChange: (d: string) => void }) {
  const week = Array.from({ length: 7 }, (_, i) => shift(today, i - 1))
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label={t("rooms.prevDay")} onClick={() => onChange(shift(date, -1))}>
        <ChevronLeftIcon />
      </Button>
      <div className="flex flex-1 gap-1.5 overflow-x-auto">
        {week.map((d) => {
          const dt = parseISO(d)
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              className={cn(
                "flex min-w-14 flex-1 flex-col items-center rounded-lg border px-2 py-1.5 text-xs transition-colors",
                d === date ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary",
              )}
            >
              <span className="opacity-80">{format(dt, "EEE", { locale: dateLocale() })}</span>
              <span className="text-base font-semibold">{format(dt, "d")}</span>
            </button>
          )
        })}
      </div>
      <Button variant="outline" size="icon" aria-label={t("rooms.nextDay")} onClick={() => onChange(shift(date, 1))}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
