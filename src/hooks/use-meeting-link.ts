import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { isValid, parseISO } from "date-fns"
import { useDeepLink } from "@/hooks/use-deep-link"
import { meetingsApi } from "@/lib/meetings-api"
import { useStore } from "@/lib/store"

const CLEAR = ["date"] as const
const validDate = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && isValid(parseISO(d)) ? d : null)

/**
 * `/rooms?date=<d>&meeting=<id>` (from a notification): jumps the day strip to that date and
 * hands back the meeting to open. Meetings of that day are fetched fresh, so moved or newly
 * created ones are found too.
 */
export function useMeetingLink(setDate: (d: string) => void) {
  const { state, dispatch } = useStore()
  const [params, setParams] = useSearchParams()
  const linkDate = validDate(params.get("date"))
  const hasMeeting = params.has("meeting")

  React.useEffect(() => {
    if (!linkDate) return
    setDate(linkDate)
    // A date-only link (e.g. a cancelled meeting) is done once the day strip moved: drop ?date= so
    // the next link to the same day moves it again
    if (!hasMeeting)
      setParams((p) => {
        p.delete("date")
        return p
      }, { replace: true })
  }, [linkDate, hasMeeting, setDate, setParams])

  const refresh = React.useCallback(async () => {
    if (!linkDate) return
    const res = await meetingsApi.list(linkDate, linkDate)
    dispatch({ type: "booking/replaceRange", from: linkDate, to: linkDate, bookings: res.data })
  }, [linkDate, dispatch])

  // Closing also drops ?date= so the next link to the same day still moves the day strip
  return useDeepLink("meeting", state.bookings, refresh, CLEAR)
}
