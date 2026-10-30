import type { ChangeOrder, Installment, PhaseKey, Project } from "@/data/projects"
import { apiFetch } from "@/lib/api"

export type NewProjectInput = Pick<Project, "name" | "type" | "location" | "areaSqm" | "value" | "cost" | "start" | "end" | "manager">
export type NewChangeOrderInput = Pick<ChangeOrder, "title" | "description" | "amount" | "costImpact" | "daysImpact" | "requestedBy">

/** Billing rules run on the server; every write returns the full updated project. */
export const projectsApi = {
  list: () => apiFetch<{ data: Project[] }>("/projects"),
  create: (input: NewProjectInput) => apiFetch<Project>("/projects", { method: "POST", json: input }),
  setPhase: (id: string, phase: PhaseKey, progress: number) =>
    apiFetch<{ project: Project; billed: string[] }>(`/projects/${id}/phases/${phase}`, { method: "PUT", json: { progress } }),
  setInstallment: (id: string, installmentId: string, status: Installment["status"]) =>
    apiFetch<Project>(`/projects/${id}/installments/${encodeURIComponent(installmentId)}`, { method: "PUT", json: { status } }),
  addChangeOrder: (id: string, input: NewChangeOrderInput) =>
    apiFetch<Project>(`/projects/${id}/change-orders`, { method: "POST", json: input }),
  decideChangeOrder: (id: string, coId: string, status: "approved" | "rejected") =>
    apiFetch<Project>(`/projects/${id}/change-orders/${encodeURIComponent(coId)}`, { method: "PUT", json: { status } }),
  addMember: (id: string, employeeId: string) => apiFetch<Project>(`/projects/${id}/members/${encodeURIComponent(employeeId)}`, { method: "PUT" }),
  removeMember: (id: string, employeeId: string) => apiFetch<Project>(`/projects/${id}/members/${encodeURIComponent(employeeId)}`, { method: "DELETE" }),
}
