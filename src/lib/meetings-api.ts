import type { Booking, Room } from "@/data/mock"
import { apiFetch } from "@/lib/api"

export interface MeetingInput {
  roomId: string
  title: string
  date: string
  start: string
  end: string
  agenda: string | null
  attendeeIds: string[]
}

export const meetingsApi = {
  rooms: () => apiFetch<{ data: Room[] }>("/rooms"),
  /** Inclusive date range, at most 92 days. */
  list: (from: string, to: string) => apiFetch<{ data: Booking[] }>(`/meetings?${new URLSearchParams({ from, to })}`),
  create: (input: MeetingInput) => apiFetch<Booking>("/meetings", { method: "POST", json: input }),
  update: (id: string, patch: Partial<MeetingInput> & { minutes?: string | null }) =>
    apiFetch<Booking>(`/meetings/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (id: string) => apiFetch<void>(`/meetings/${encodeURIComponent(id)}`, { method: "DELETE" }),
}
