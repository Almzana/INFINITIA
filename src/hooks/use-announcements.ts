import * as React from "react"
import { toast } from "sonner"
import type { Announcement } from "@/data/mock"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { announcementsApi } from "@/lib/announcements-api"
import { useStore } from "@/lib/store"

export type CategoryFilter = "all" | Announcement["category"]

const failed = (err: unknown) =>
  toast.error(err instanceof ApiError && err.status === 403 ? t("announcements.error.forbidden") : t("announcements.error.actionFailed"))

/** Search / filter the feed, and pin or delete (HR & executives) through the API. */
export function useAnnouncements() {
  const { state, dispatch } = useStore()
  const [q, setQ] = React.useState("")
  const [cat, setCat] = React.useState<CategoryFilter>("all")

  const list = React.useMemo(
    () =>
      state.announcements
        .filter((a) => (cat === "all" || a.category === cat) && `${a.title} ${a.body}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)),
    [state.announcements, q, cat],
  )

  const togglePin = async (a: Announcement) => {
    try {
      dispatch({ type: "announcement/upsert", announcement: await announcementsApi.update(a.id, { pinned: !a.pinned }) })
    } catch (err) {
      failed(err)
    }
  }

  const remove = async (a: Announcement) => {
    try {
      await announcementsApi.remove(a.id)
      dispatch({ type: "announcement/delete", id: a.id })
      toast.success(t("announcements.toast.deleted"))
    } catch (err) {
      failed(err)
    }
  }

  // Notifications can point at an announcement published after the store was loaded
  const reload = React.useCallback(() => announcementsApi.list().then((r) => dispatch({ type: "announcement/replace", announcements: r.data })), [dispatch])

  return { list, q, setQ, cat, setCat, togglePin, remove, reload }
}
