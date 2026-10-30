import * as React from "react"
import { addDays, format } from "date-fns"
import { announcementsApi } from "@/lib/announcements-api"
import { leavesApi } from "@/lib/leaves-api"
import { meetingsApi } from "@/lib/meetings-api"
import type { AppNotification } from "@/lib/notifications-api"
import { useStore } from "@/lib/store"

const iso = (d: Date) => format(d, "yyyy-MM-dd")

/**
 * The store is loaded once per sign-in. When a new notification arrives (leave decided or
 * forwarded, meeting changed, announcement published), reload that list so pages, the sidebar
 * badge and counts are current without a full page reload. The first load only sets the baseline.
 */
export function useLiveRefresh(items: AppNotification[], loaded: boolean) {
  const { dispatch } = useStore()
  const seen = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!loaded) return
    const newest = items.length ? Math.max(...items.map((n) => n.id)) : 0
    if (seen.current === null) {
      seen.current = newest
      return
    }
    const fresh = items.filter((n) => n.id > (seen.current ?? 0))
    seen.current = Math.max(seen.current, newest)
    const kinds = new Set(fresh.map((n) => n.type.split(".")[0]))

    if (kinds.has("leave")) void leavesApi.list().then((r) => dispatch({ type: "leave/replace", leaves: r.data })).catch(() => undefined)
    if (kinds.has("announcement")) void announcementsApi.list().then((r) => dispatch({ type: "announcement/replace", announcements: r.data })).catch(() => undefined)
    if (kinds.has("meeting")) {
      const from = iso(addDays(new Date(), -1))
      const to = iso(addDays(new Date(), 30))
      void meetingsApi.list(from, to).then((r) => dispatch({ type: "booking/replaceRange", from, to, bookings: r.data })).catch(() => undefined)
    }
  }, [items, loaded, dispatch])
}
