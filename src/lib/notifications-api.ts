import { apiFetch } from "@/lib/api"

export interface AppNotification {
  id: number
  /** e.g. "leave.requested", "meeting.invited" — rendered in the viewer's language */
  type: string
  params: Record<string, string | number | null>
  /** In-app path that opens the related item */
  link: string | null
  actorName: string | null
  createdAt: string
  read: boolean
}

export const notificationsApi = {
  list: (limit = 30) => apiFetch<{ data: AppNotification[]; unread: number }>(`/notifications?limit=${limit}`),
  markRead: (ids: number[]) => apiFetch<{ updated: number }>("/notifications/read", { method: "POST", json: { ids } }),
  markAllRead: () => apiFetch<{ updated: number }>("/notifications/read", { method: "POST", json: { all: true } }),
}
