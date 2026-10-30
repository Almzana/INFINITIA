import type { Employee } from "@/data/mock"
import { apiFetch, fetchAllPages } from "@/lib/api"
import type { Role } from "@/lib/auth"

/** Editable employee fields (everything except id and account info). */
export type EmployeeInput = Omit<Employee, "id" | "username" | "role">

export interface AccountInput {
  username?: string
  password: string
  role?: Role
}

export const employeesApi = {
  /** The whole directory (all pages); the app filters client-side. */
  listAll: async () => ({
    data: await fetchAllPages((page) => apiFetch<{ data: Employee[]; meta: { total: number } }>(`/employees?pageSize=500&page=${page}`)),
  }),
  create: (input: EmployeeInput, account: Required<Pick<AccountInput, "username">> & AccountInput) =>
    apiFetch<Employee>("/employees", { method: "POST", json: { ...input, account } }),
  update: (id: string, patch: Partial<EmployeeInput>) => apiFetch<Employee>(`/employees/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
  remove: (ids: string[]) =>
    apiFetch<{ deleted: number }>(`/employees?${new URLSearchParams(ids.map((id) => ["ids", id]))}`, { method: "DELETE" }),
  setAccount: (id: string, account: AccountInput) =>
    apiFetch<Employee>(`/employees/${encodeURIComponent(id)}/account`, { method: "PUT", json: account }),
  /** Raw image body (already resized in the browser) */
  uploadPhoto: (id: string, image: Blob) =>
    apiFetch<{ photoVersion: number }>(`/employees/${encodeURIComponent(id)}/photo`, { method: "PUT", body: image, headers: { "content-type": image.type } }),
  deletePhoto: (id: string) => apiFetch<void>(`/employees/${encodeURIComponent(id)}/photo`, { method: "DELETE" }),
}
