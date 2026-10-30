import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tag } from "@/components/shared/tag"
import type { Booking, Room } from "@/data/mock"
import { t } from "@/i18n"

/** Per-room summary for the selected day. */
export function RoomCards({ rooms, bookings }: { rooms: Room[]; bookings: Booking[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {rooms.map((r) => {
        const count = bookings.filter((b) => b.roomId === r.id).length
        return (
          <Card key={r.id} size="sm">
            <CardHeader>
              <CardTitle>{r.name}</CardTitle>
              <CardDescription>
                {t("rooms.floor", { n: r.floor })} · {t("rooms.seats", { n: r.capacity })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {r.facilities.map((f) => (
                  <Tag key={f} type="info">
                    {f}
                  </Tag>
                ))}
              </div>
              <Tag type={count === 0 ? "success" : "warning"} dot>
                {count === 0 ? t("rooms.freeAllDay") : t("rooms.bookedSlots", { n: count })}
              </Tag>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
