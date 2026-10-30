import { FileTextIcon, UsersIcon } from "lucide-react"
import type { Booking } from "@/data/mock"
import { t } from "@/i18n"
import { pct } from "@/lib/meeting-form"
import { cn } from "@/lib/utils"

const blockColors = [
  "bg-primary/15 text-primary border-primary/40",
  "bg-success/15 text-success border-success/40",
  "bg-warning/15 text-warning border-warning/40",
  "bg-destructive/15 text-destructive border-destructive/40",
]

/** A meeting positioned on the room's day timeline. */
export function MeetingBlock({ b, colorIdx, onOpen }: { b: Booking; colorIdx: number; onOpen: (b: Booking) => void }) {
  const attendees = b.attendeeIds?.length ?? 0
  return (
    <button
      onClick={() => onOpen(b)}
      className={cn(
        "absolute inset-y-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left text-xs transition-shadow hover:shadow-md",
        blockColors[colorIdx % blockColors.length],
        b.involvesMe && "ring-2 ring-primary/60",
      )}
      style={{ left: `${pct(b.start)}%`, width: `${pct(b.end) - pct(b.start)}%` }}
      title={`${b.title} · ${b.start}–${b.end} · ${b.owner}`}
    >
      <p className="truncate font-medium">{b.title}</p>
      <p className="flex items-center gap-1.5 truncate opacity-80">
        {b.start}–{b.end}
        {attendees > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <UsersIcon className="size-3" />
            {attendees}
          </span>
        )}
        {b.minutes && <FileTextIcon className="size-3" aria-label={t("rooms.hasMinutes")} />}
      </p>
    </button>
  )
}
