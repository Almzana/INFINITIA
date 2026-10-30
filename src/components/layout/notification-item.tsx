import { ChevronRightIcon } from "lucide-react"
import type { Room } from "@/data/mock"
import { describeNotification } from "@/lib/notification-text"
import type { AppNotification } from "@/lib/notifications-api"
import { cn } from "@/lib/utils"

const toneClass = {
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
}

/** One row in the bell. The whole row is a button that opens the related item. */
export function NotificationItem({ n, rooms, onOpen }: { n: AppNotification; rooms: Room[]; onOpen: (n: AppNotification) => void }) {
  const d = describeNotification(n, rooms)
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={cn("flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none", !n.read && "bg-primary/[0.04]")}
      >
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", toneClass[d.tone])}>
          <d.icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className={cn("block", !n.read && "font-semibold")}>{d.title}</span>
          {d.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{d.body}</span>}
          <span className="block text-xs text-muted-foreground/80">{d.ago}</span>
        </span>
        <span className="flex flex-col items-center gap-2 pt-1">
          {!n.read && <span className="size-2 rounded-full bg-primary" aria-hidden />}
          {n.link && <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />}
        </span>
      </button>
    </li>
  )
}
