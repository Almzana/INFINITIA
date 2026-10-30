import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { t } from "@/i18n"

/**
 * Opens the record named by `?<key>=<id>` (how notifications link to an item).
 * The store is loaded once per sign-in, so the cached copy may be stale (a Leader already
 * forwarded the request, the meeting moved) or missing (created since). The list is therefore
 * always refreshed first and the item handed out only afterwards; if it is still missing, a
 * "no longer exists" toast is shown. Closing drops the parameter (and the `alsoClear` ones).
 */
export function useDeepLink<T extends { id: string }>(key: string, items: T[], refresh: () => Promise<unknown>, alsoClear: readonly string[] = []) {
  const [params, setParams] = useSearchParams()
  const id = params.get(key)
  // The id whose refresh has finished; the item is not handed out before that
  const [fresh, setFresh] = React.useState<string | null>(null)
  // The id whose refresh failed (network): say so instead of "no longer exists"
  const [failed, setFailed] = React.useState<string | null>(null)
  const item = id && fresh === id ? (items.find((x) => x.id === id) ?? null) : null
  const extra = alsoClear.join(",")

  const close = React.useCallback(() => {
    // Opening the same item again later must wait for a new refresh
    setFresh(null)
    setParams((p) => {
      p.delete(key)
      for (const k of extra ? extra.split(",") : []) p.delete(k)
      return p
    }, { replace: true })
  }, [key, extra, setParams])

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    void refresh()
      .then(() => !cancelled && setFailed(null))
      .catch(() => !cancelled && setFailed(id))
      .then(() => !cancelled && setFresh(id))
    return () => {
      cancelled = true
    }
  }, [id, refresh])

  // Refreshed but still not there: deleted, or not visible to this account
  const gone = !!id && fresh === id && !item
  React.useEffect(() => {
    if (!gone) return
    toast.error(failed === id ? t("common.loadFailed") : t("notifications.gone"))
    close()
  }, [gone, failed, id, close])

  return { item, close }
}
