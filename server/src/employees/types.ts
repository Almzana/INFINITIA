import type { Role } from "../auth/repository.ts"
export type { Role }

export type EmployeeStatus = "active" | "probation" | "leave" | "resigned"

export interface EmployeeInput {
  code: string
  firstName: string
  lastName: string
  nickname: string
  email: string
  phone: string
  department: string
  position: string
  status: EmployeeStatus
  startDate: string
  salary: number
  birthDate: string | null
  address: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  managerId: string | null
}

export interface Account {
  username: string
  password: string
  role: Role
}

/** POST body: only these fields are required, the rest get defaults. */
export type CreateEmployeeBody = Pick<EmployeeInput, "code" | "firstName" | "lastName" | "email" | "department" | "position" | "startDate"> &
  Partial<EmployeeInput> & { account: Omit<Account, "role"> & { role?: Role } }

export interface ListFilters {
  q?: string
  department?: string
  status?: EmployeeStatus
  page: number
  pageSize: number
}
