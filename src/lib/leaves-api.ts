import type { LeaveRequest, LeaveType } from "@/data/mock"
import { apiFetch, fetchAllPages } from "@/lib/api"

export interface LeaveBalance {
  type: LeaveType
  quota: number
  /** Approved days this year */
  used: number
  /** Days in requests still waiting for approval */
  pending: number
  /** quota − used − pending (negative = over the quota; only possible when not enforced) */
  remaining: number
  enforce: boolean
}

export interface LeavePolicy {
  type: LeaveType
  daysPerYear: number
  enforce: boolean
}

export interface Holiday {
  date: string
  name: string
}

/** Staff get their own requests and their team's (as Leader); HR & executives get everyone's (the API decides). */
export const leavesApi = {
  list: async () => ({
    data: await fetchAllPages((page) => apiFetch<{ data: LeaveRequest[]; meta: { total: number } }>(`/leaves?pageSize=500&page=${page}`)),
  }),
  /** Working days (weekends and holidays excluded) are counted by the server. */
  create: (input: { type: LeaveType; from: string; to: string; reason: string }) => apiFetch<LeaveRequest>("/leaves", { method: "POST", json: input }),
  /** A Leader's approval forwards to HR (still pending); HR / executives decide finally; the caller's own are skipped. */
  decide: (ids: string[], status: "approved" | "rejected") =>
    apiFetch<{ data: LeaveRequest[]; skipped: number }>("/leaves/status", { method: "PUT", json: { ids, status } }),
  balance: (year: number) => apiFetch<{ year: number; data: LeaveBalance[] }>(`/leaves/balance?year=${year}`),
  policy: () => apiFetch<{ data: LeavePolicy[] }>("/leaves/policy"),
  setPolicy: (p: LeavePolicy) =>
    apiFetch<LeavePolicy>(`/leaves/policy/${p.type}`, { method: "PUT", json: { daysPerYear: p.daysPerYear, enforce: p.enforce } }),
  holidays: (year: number) => apiFetch<{ data: Holiday[] }>(`/holidays?year=${year}`),
  addHoliday: (h: Holiday) => apiFetch<Holiday>("/holidays", { method: "POST", json: h }),
  removeHoliday: (date: string) => apiFetch<void>(`/holidays/${encodeURIComponent(date)}`, { method: "DELETE" }),
}
