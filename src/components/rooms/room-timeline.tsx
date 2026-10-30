import { UsersIcon } from "lucide-react"
import type { Booking, Room } from "@/data/mock"
import { t } from "@/i18n"
import { hours } from "@/lib/meeting-form"
import { MeetingBlock } from "./meeting-block"

/** Rooms x hours grid for one day; empty half-hour cells start a booking. Scrolls sideways on small screens. */
export function RoomTimeline({ rooms, bookings, onSlot, onOpen }: {
  rooms: Room[]
  bookings: Booking[]
  onSlot: (roomId: string, start: string) => void
  onOpen: (b: Booking) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[820px]">
        <div className="flex border-b bg-muted/60 text-xs text-muted-foreground">
          <div className="w-40 shrink-0 border-r px-3 py-2 font-medium">{t("rooms.room")}</div>
          <div className="relative flex flex-1">
            {hours.map((h) => (
              <div key={h} className="flex-1 border-r px-1.5 py-2 last:border-r-0">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>
        {rooms.map((r, ri) => (
          <div key={r.id} className="flex border-b last:border-b-0">
            <div className="w-40 shrink-0 border-r px-3 py-2">
              <p className="text-sm font-medium">{r.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <UsersIcon className="size-3" /> {r.capacity} · {t("rooms.floor", { n: r.floor })}
              </p>
            </div>
            <div className="relative h-16 flex-1">
              <div className="absolute inset-0 flex">
                {hours.map((h) => (
                  <div key={h} className="flex flex-1 border-r last:border-r-0">
                    {["00", "30"].map((m) => {
                      const time = `${String(h).padStart(2, "0")}:${m}`
                      return <button key={m} aria-label={t("rooms.bookSlot", { room: r.name, time })} className="flex-1 transition-colors hover:bg-primary/5" onClick={() => onSlot(r.id, time)} />
                    })}
                  </div>
                ))}
              </div>
              {bookings
                .filter((b) => b.roomId === r.id)
                .map((b) => (
                  <MeetingBlock key={b.id} b={b} colorIdx={ri} onOpen={onOpen} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
