import * as React from "react"
import { todayISO } from "@/lib/format"
import { useStore } from "@/lib/store"

/** Upcoming meetings the signed-in user organizes or attends (flag computed by the API). */
export function useMyMeetings(limit = 5) {
  const { state } = useStore()
  const today = todayISO()
  const now = new Date().toTimeString().slice(0, 5)

  return React.useMemo(() => {
    const upcoming = state.bookings
      .filter((b) => b.involvesMe && (b.date > today || (b.date === today && b.end > now)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    const roomName = (id: string) => state.rooms.find((r) => r.id === id)?.name ?? id
    return { meetings: upcoming.slice(0, limit), total: upcoming.length, roomName, today }
  }, [state.bookings, state.rooms, today, now, limit])
}
