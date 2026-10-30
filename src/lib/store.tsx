import * as React from "react"
import { useAuth } from "@/lib/auth"
import {
  type Announcement,
  type Booking,
  type Room,
  type Employee,
  type LeaveRequest,
} from "@/data/mock"
import type { Project } from "@/data/projects"
import type { TimeEntry } from "@/data/timesheet"

interface State {
  employees: Employee[]
  leaves: LeaveRequest[]
  announcements: Announcement[]
  rooms: Room[]
  bookings: Booking[]
  projects: Project[]
  timesheet: TimeEntry[]
}

type Action =
  | { type: "employee/replace"; employees: Employee[] }
  | { type: "employee/upsert"; employee: Employee }
  | { type: "employee/delete"; ids: string[] }
  | { type: "leave/replace"; leaves: LeaveRequest[] }
  | { type: "leave/upsertMany"; leaves: LeaveRequest[] }
  | { type: "announcement/replace"; announcements: Announcement[] }
  | { type: "announcement/upsert"; announcement: Announcement }
  | { type: "announcement/delete"; id: string }
  | { type: "room/replace"; rooms: Room[] }
  | { type: "booking/replaceRange"; from: string; to: string; bookings: Booking[] }
  | { type: "booking/upsert"; booking: Booking }
  | { type: "booking/delete"; id: string }
  | { type: "project/replace"; projects: Project[] }
  | { type: "project/upsert"; project: Project }
  /** employeeId null = everyone's entries in the range are replaced */
  | { type: "timesheet/replaceRange"; employeeId: string | null; from: string; to: string; entries: TimeEntry[] }
  | { type: "reset" }

/**
 * Company data lives in the API. The store is an in-memory cache filled by useDataSync, starting empty
 * and never written to localStorage, so nothing (salaries, leave, ...) outlives the session in the browser.
 */
const empty: State = { employees: [], leaves: [], announcements: [], rooms: [], bookings: [], projects: [], timesheet: [] }

// Older versions cached the whole store in localStorage; remove it so it cannot leak to the next user
const LEGACY_KEYS = ["hr-portal-state-v3", "hr-portal-state-v2", "hr-portal-state"]

function reducer(state: State, action: Action): State {
  switch (action.type) {
    // Employees come from the API (useDataSync)
    case "employee/replace":
      return { ...state, employees: action.employees }
    case "employee/upsert": {
      const exists = state.employees.some((e) => e.id === action.employee.id)
      return {
        ...state,
        employees: exists
          ? state.employees.map((e) => (e.id === action.employee.id ? action.employee : e))
          : [action.employee, ...state.employees],
      }
    }
    case "employee/delete":
      return { ...state, employees: state.employees.filter((e) => !action.ids.includes(e.id)) }
    // Leaves come from the API (useDataSync); the server scopes them to what this user may see
    case "leave/replace":
      return { ...state, leaves: action.leaves }
    case "leave/upsertMany": {
      const ids = new Set(action.leaves.map((l) => l.id))
      return { ...state, leaves: [...action.leaves, ...state.leaves.filter((l) => !ids.has(l.id))] }
    }
    // Announcements come from the API (useDataSync); writes go through the API first
    case "announcement/replace":
      return { ...state, announcements: action.announcements }
    case "announcement/upsert": {
      const others = state.announcements.filter((a) => a.id !== action.announcement.id)
      return { ...state, announcements: [action.announcement, ...others] }
    }
    case "announcement/delete":
      return { ...state, announcements: state.announcements.filter((a) => a.id !== action.id) }
    // Rooms and meetings come from the API (see useDataSync / useWeekMeetings)
    case "room/replace":
      return { ...state, rooms: action.rooms }
    case "booking/replaceRange":
      return {
        ...state,
        // Also drop older copies of these meetings outside the range (a meeting moved to another day)
        bookings: [
          ...state.bookings.filter((b) => (b.date < action.from || b.date > action.to) && !action.bookings.some((n) => n.id === b.id)),
          ...action.bookings,
        ],
      }
    case "booking/upsert": {
      const others = state.bookings.filter((b) => b.id !== action.booking.id)
      return { ...state, bookings: [...others, action.booking] }
    }
    case "booking/delete":
      return { ...state, bookings: state.bookings.filter((b) => b.id !== action.id) }
    // Projects come from the API (useDataSync); billing rules run on the server
    case "project/replace":
      return { ...state, projects: action.projects }
    case "project/upsert": {
      const exists = state.projects.some((p) => p.id === action.project.id)
      return {
        ...state,
        projects: exists ? state.projects.map((p) => (p.id === action.project.id ? action.project : p)) : [...state.projects, action.project],
      }
    }
    case "timesheet/replaceRange":
      return {
        ...state,
        timesheet: [
          ...state.timesheet.filter(
            (t) => !((action.employeeId === null || t.employeeId === action.employeeId) && t.date >= action.from && t.date <= action.to),
          ),
          ...action.entries,
        ],
      }
    case "reset":
      return empty
  }
}

function clearLegacyCache() {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k)
  } catch {
    /* storage unavailable */
  }
}

const StoreContext = React.createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null)

function UserStore({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, empty)
  React.useEffect(clearLegacyCache, [])
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

/** A fresh store per signed-in user: logging out or switching user drops everything the previous one loaded. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const email = useAuth().user?.email ?? "signed-out"
  return <UserStore key={email}>{children}</UserStore>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}

export function useEmployeeMap() {
  const { state } = useStore()
  return React.useMemo(() => new Map(state.employees.map((e) => [e.id, e])), [state.employees])
}

/** Hours logged in the timesheet per project id */
export function useProjectHours() {
  const { state } = useStore()
  return React.useMemo(() => {
    const m = new Map<string, number>()
    // Prefer the server total (all people); the loaded entries may be only my own
    for (const p of state.projects) if (p.loggedHours !== undefined) m.set(p.id, p.loggedHours)
    for (const t of state.timesheet) if (!state.projects.some((p) => p.id === t.projectId && p.loggedHours !== undefined)) m.set(t.projectId, (m.get(t.projectId) ?? 0) + t.hours)
    return m
  }, [state.timesheet, state.projects])
}

export const newId = () => Math.random().toString(36).slice(2, 10)
