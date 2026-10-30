import { formatDistanceToNow, parseISO } from "date-fns"
import { CalendarCheckIcon, CalendarClockIcon, CalendarXIcon, ListTodoIcon, type LucideIcon, MegaphoneIcon, ServerCrashIcon, XCircleIcon } from "lucide-react"
import { type LeaveType, leaveTypeLabel, type Room } from "@/data/mock"
import { t } from "@/i18n"
import { dateLocale, formatDate } from "@/lib/format"
import type { AppNotification } from "@/lib/notifications-api"

const icons: Record<string, LucideIcon> = {
  "leave.requested": CalendarClockIcon,
  "leave.approved": CalendarCheckIcon,
  "leave.rejected": XCircleIcon,
  "leave.forwarded": CalendarCheckIcon,
  "leave.requested_many": CalendarClockIcon,
  "task.assigned": ListTodoIcon,
  "meeting.invited": CalendarClockIcon,
  "meeting.changed": CalendarClockIcon,
  "meeting.uninvited": CalendarXIcon,
  "meeting.cancelled": CalendarXIcon,
  "announcement.published": MegaphoneIcon,
  "dev.server_error": ServerCrashIcon,
}

/** Tone of the icon: problems red, good news green, the rest neutral. */
export function notificationTone(type: string): "danger" | "success" | "primary" {
  if (type === "leave.rejected" || type === "dev.server_error" || type === "meeting.cancelled" || type === "meeting.uninvited") return "danger"
  if (type === "leave.approved") return "success"
  return "primary"
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))

/** Title, body, icon and relative time of a notification, in the current language. */
export function describeNotification(n: AppNotification, rooms: Room[]) {
  const p = n.params
  const known = n.type in icons
  const range = p.from && p.to ? (p.from === p.to ? formatDate(str(p.from), "d MMM") : `${formatDate(str(p.from), "d MMM")} – ${formatDate(str(p.to), "d MMM")}`) : ""
  const when = p.date ? `${formatDate(str(p.date), "EEE d MMM")} ${str(p.start)}–${str(p.end)}` : ""
  const vars = {
    actor: n.actorName ?? t("notifications.someone"),
    type: p.type ? (leaveTypeLabel[p.type as LeaveType] ?? str(p.type)) : "",
    days: str(p.days),
    range,
    when,
    room: rooms.find((r) => r.id === p.room)?.name ?? str(p.room),
    title: str(p.title),
    count: str(p.count),
    route: str(p.route),
    status: str(p.status),
    code: str(p.code),
  }
  let body = known ? t(`notifications.${n.type}.body`, vars) : ""
  if (n.type === "task.assigned" && p.due) body += ` · ${t("notifications.task.assigned.due", { date: formatDate(str(p.due), "d MMM") })}`
  return {
    title: known ? t(`notifications.${n.type}.title`) : t("notifications.generic.title"),
    body,
    icon: icons[n.type] ?? MegaphoneIcon,
    tone: notificationTone(n.type),
    ago: formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true, locale: dateLocale() }),
  }
}
