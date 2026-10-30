import { apiFetch } from "@/lib/api"

export interface TeamMember {
  id: string
  code: string
  firstName: string
  lastName: string
  nickname: string
  position: string
  email: string
  photoVersion?: number | null
  hasAccount: boolean
  openTasks: number
  overdueTasks: number
}

export const teamApi = {
  /** My direct reports; isLeader = I have at least one. */
  mine: () => apiFetch<{ isLeader: boolean; members: TeamMember[] }>("/team"),
}
