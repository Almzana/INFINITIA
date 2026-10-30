import * as React from "react"
import { BellIcon, CheckCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmptyState } from "@/components/shared/misc"
import { useLiveRefresh } from "@/hooks/use-live-refresh"
import { useNotifications } from "@/hooks/use-notifications"
import { t } from "@/i18n"
import type { AppNotification } from "@/lib/notifications-api"
import { useStore } from "@/lib/store"
import { NotificationItem } from "./notification-item"

/** Header bell: the signed-in user's own notifications; clicking one opens the related item. */
export function NotificationsBell() {
  const { items, unread, loaded, reload, open, markAllRead } = useNotifications()
  const { state } = useStore()
  // New notifications reload the lists they are about (leave, meetings, announcements)
  useLiveRefresh(items, loaded)
  const [show, setShow] = React.useState(false)

  const onOpenChange = (o: boolean) => {
    setShow(o)
    if (o) void reload()
  }
  const onPick = (n: AppNotification) => {
    setShow(false)
    void open(n)
  }

  return (
    <Popover open={show} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `${t("notifications.title")} — ${t("notifications.unread", { n: unread })}` : t("notifications.title")}>
          <BellIcon />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="font-medium">{t("notifications.title")}</p>
            {unread > 0 && <p className="text-xs text-muted-foreground">{t("notifications.unread", { n: unread })}</p>}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => void markAllRead()}>
              <CheckCheckIcon /> {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState title={t("notifications.empty")} description={t("notifications.emptyHint")} />
        ) : (
          <ul className="max-h-[min(26rem,70svh)] divide-y overflow-y-auto">
            {items.map((n) => (
              <NotificationItem key={n.id} n={n} rooms={state.rooms} onOpen={onPick} />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
