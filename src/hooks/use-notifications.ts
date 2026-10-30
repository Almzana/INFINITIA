import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { type AppNotification, notificationsApi } from "@/lib/notifications-api"

const POLL_MS = 60_000

/**
 * The signed-in user's notifications: polled every minute while the tab is visible and refreshed
 * when the bell opens. Opening one marks it read and navigates to the related item.
 */
export function useNotifications() {
  const email = useAuth().user?.email
  const navigate = useNavigate()
  const [items, setItems] = React.useState<AppNotification[]>([])
  const [unread, setUnread] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  // The first answer arrived (an empty list is a real baseline too)
  const [loaded, setLoaded] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await notificationsApi.list()
      setItems(res.data)
      setLoaded(true)
      setUnread(res.unread)
    } catch {
      /* keep what we have; the next poll retries */
    } finally {
      setLoading(false)
    }
  }, [email])

  React.useEffect(() => {
    void load()
    const tick = () => document.visibilityState === "visible" && void load()
    const id = window.setInterval(tick, POLL_MS)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [load])

  const open = async (n: AppNotification) => {
    if (!n.read) {
      // Optimistic: the dot disappears at once; a failure is corrected by the next poll
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((u) => Math.max(0, u - 1))
      notificationsApi.markRead([n.id]).catch(() => void load())
    }
    if (n.link) navigate(n.link)
  }

  const markAllRead = async () => {
    setItems((xs) => xs.map((x) => ({ ...x, read: true })))
    setUnread(0)
    await notificationsApi.markAllRead().catch(() => void load())
  }

  return { items, unread, loading, loaded, reload: load, open, markAllRead }
}
