import type { Announcement } from "@/data/mock"
import { apiFetch, fetchAllPages } from "@/lib/api"

export type AnnouncementInput = Pick<Announcement, "title" | "body" | "category" | "pinned">

/** Everyone reads; HR and executives write (the API enforces it). */
export const announcementsApi = {
  list: async () => ({
    data: await fetchAllPages((page) => apiFetch<{ data: Announcement[]; meta: { total: number } }>(`/announcements?pageSize=200&page=${page}`)),
  }),
  create: (input: AnnouncementInput) => apiFetch<Announcement>("/announcements", { method: "POST", json: input }),
  update: (id: string, patch: Partial<AnnouncementInput>) =>
    apiFetch<Announcement>(`/announcements/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (id: string) => apiFetch<void>(`/announcements/${encodeURIComponent(id)}`, { method: "DELETE" }),
}
