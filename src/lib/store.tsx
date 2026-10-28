import * as React from "react"
import {
  announcements as seedAnnouncements,
  bookings as seedBookings,
  employees as seedEmployees,
  leaveRequests as seedLeaves,
  type Announcement,
  type Booking,
  type Employee,
  type LeaveRequest,
  type LeaveStatus,
} from "@/data/mock"

interface State {
  employees: Employee[]
  leaves: LeaveRequest[]
  announcements: Announcement[]
  bookings: Booking[]
}

type Action =
  | { type: "employee/upsert"; employee: Employee }
  | { type: "employee/delete"; ids: string[] }
  | { type: "leave/add"; leave: LeaveRequest }
  | { type: "leave/status"; ids: string[]; status: LeaveStatus }
  | { type: "announcement/add"; announcement: Announcement }
  | { type: "announcement/pin"; id: string }
  | { type: "announcement/delete"; id: string }
  | { type: "booking/add"; booking: Booking }
  | { type: "booking/delete"; id: string }
  | { type: "reset" }

const STORAGE_KEY = "hr-portal-state-v2"
const seed: State = { employees: seedEmployees, leaves: seedLeaves, announcements: seedAnnouncements, bookings: seedBookings }

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
    case "leave/add":
      return { ...state, leaves: [action.leave, ...state.leaves] }
    case "leave/status":
      return { ...state, leaves: state.leaves.map((l) => (action.ids.includes(l.id) ? { ...l, status: action.status } : l)) }
    case "announcement/add":
      return { ...state, announcements: [action.announcement, ...state.announcements] }
    case "announcement/pin":
      return { ...state, announcements: state.announcements.map((a) => (a.id === action.id ? { ...a, pinned: !a.pinned } : a)) }
    case "announcement/delete":
      return { ...state, announcements: state.announcements.filter((a) => a.id !== action.id) }
    case "booking/add":
      return { ...state, bookings: [...state.bookings, action.booking] }
    case "booking/delete":
      return { ...state, bookings: state.bookings.filter((b) => b.id !== action.id) }
    case "reset":
      return seed
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...seed, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable */
  }
  return seed
}

const StoreContext = React.createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, load)

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable */
    }
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
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

export const newId = () => Math.random().toString(36).slice(2, 10)
