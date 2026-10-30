import * as React from "react"
import { addDays, format, parseISO } from "date-fns"
import { meetingsApi } from "@/lib/meetings-api"
import { useStore } from "@/lib/store"

/** Loads meetings for the week around `date` into the store whenever the viewed date changes. */
export function useWeekMeetings(date: string) {
  const { dispatch } = useStore()
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    const d = parseISO(date)
    const from = format(addDays(d, -3), "yyyy-MM-dd")
    const to = format(addDays(d, 3), "yyyy-MM-dd")
    setLoading(true)
    try {
      const res = await meetingsApi.list(from, to)
      dispatch({ type: "booking/replaceRange", from, to, bookings: res.data })
    } catch {
      /* keep what is cached */
    } finally {
      setLoading(false)
    }
  }, [date, dispatch])

  React.useEffect(() => {
    void load()
  }, [load])

  return { loading, reload: load }
}
