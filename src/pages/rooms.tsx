import * as React from "react"
import { LoaderIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { DayStrip } from "@/components/rooms/day-strip"
import { MeetingDialog } from "@/components/rooms/meeting-dialog"
import { RoomCards } from "@/components/rooms/room-cards"
import { RoomTimeline } from "@/components/rooms/room-timeline"
import type { Booking } from "@/data/mock"
import type { MeetingPreset } from "@/hooks/use-meeting-form"
import { useMeetingLink } from "@/hooks/use-meeting-link"
import { useWeekMeetings } from "@/hooks/use-week-meetings"
import { formatDate, todayISO } from "@/lib/format"
import { useStore } from "@/lib/store"
import { t } from "@/i18n"

export default function RoomsPage() {
  const TODAY = todayISO()
  const { state } = useStore()
  const [date, setDate] = React.useState(TODAY)
  const { loading } = useWeekMeetings(date)

  const [open, setOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<MeetingPreset>(null)
  const [meeting, setMeeting] = React.useState<Booking | null>(null)

  // A notification link opens its meeting once that day is loaded
  const { item: linked, close: closeLink } = useMeetingLink(setDate)
  React.useEffect(() => {
    if (!linked) return
    setMeeting(linked)
    setPreset(null)
    setOpen(true)
    closeLink()
  }, [linked, closeLink])

  const dayBookings = state.bookings.filter((b) => b.date === date)

  const book = (roomId?: string, start?: string) => {
    setMeeting(null)
    setPreset(roomId && start ? { roomId, start } : null)
    setOpen(true)
  }
  const openMeeting = (b: Booking) => {
    setMeeting(b)
    setPreset(null)
    setOpen(true)
  }

  return (
    <>
      <PageHeader
        title={t("rooms.title")}
        description={t("rooms.description")}
        actions={
          <Button onClick={() => book()}>
            <PlusIcon /> {t("rooms.book")}
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <DayStrip today={TODAY} date={date} onChange={setDate} />
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {formatDate(date, t("rooms.dayPattern"))} {date === TODAY && <Tag className="ml-1">{t("common.today")}</Tag>} {t("rooms.bookingCount", { n: dayBookings.length })}
            {loading && <LoaderIcon className="ml-1 size-3.5 animate-spin" aria-label={t("common.loading")} />}
          </p>
          <RoomTimeline rooms={state.rooms} bookings={dayBookings} onSlot={book} onOpen={openMeeting} />
        </CardContent>
      </Card>

      <RoomCards rooms={state.rooms} bookings={dayBookings} />

      <MeetingDialog open={open} onOpenChange={setOpen} meeting={meeting} preset={preset} date={date} />
    </>
  )
}
