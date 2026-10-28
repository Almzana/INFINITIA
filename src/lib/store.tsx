import * as React from "react"
import { addDays, format } from "date-fns"
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
import {
  type ChangeOrder,
  type InstallmentStatus,
  isTriggered,
  type PhaseKey,
  type Project,
  seedProjects,
} from "@/data/projects"
import { seedTimesheet, type TimeEntry } from "@/data/timesheet"
import { todayISO } from "@/lib/format"

interface State {
  employees: Employee[]
  leaves: LeaveRequest[]
  announcements: Announcement[]
  bookings: Booking[]
  projects: Project[]
  timesheet: TimeEntry[]
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
  | { type: "project/add"; project: Project }
  | { type: "project/phase"; projectId: string; phase: PhaseKey; progress: number }
  | { type: "installment/status"; projectId: string; installmentId: string; status: InstallmentStatus }
  | { type: "changeOrder/add"; projectId: string; changeOrder: ChangeOrder }
  | { type: "changeOrder/decide"; projectId: string; changeOrderId: string; status: "approved" | "rejected" }
  | { type: "timesheet/week"; employeeId: string; from: string; to: string; entries: TimeEntry[] }
  | { type: "reset" }

const STORAGE_KEY = "hr-portal-state-v3"
const seed: State = {
  employees: seedEmployees,
  leaves: seedLeaves,
  announcements: seedAnnouncements,
  bookings: seedBookings,
  projects: seedProjects,
  timesheet: seedTimesheet(seedEmployees, seedProjects),
}

const updateProject = (state: State, id: string, fn: (p: Project) => Project): State => ({
  ...state,
  projects: state.projects.map((p) => (p.id === id ? fn(p) : p)),
})

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
    case "project/add":
      return { ...state, projects: [action.project, ...state.projects] }
    case "project/phase":
      return updateProject(state, action.projectId, (p) => {
        const phases = p.phases.map((ph) => (ph.key === action.phase ? { ...ph, progress: action.progress } : ph))
        // Auto-bill: installments whose trigger is now reached move from pending to invoiced
        const installments = p.installments.map((i) => (i.status === "pending" && isTriggered(phases, i) ? { ...i, status: "invoiced" as const } : i))
        return { ...p, phases, installments }
      })
    case "installment/status":
      return updateProject(state, action.projectId, (p) => ({
        ...p,
        installments: p.installments.map((i) =>
          i.id === action.installmentId ? { ...i, status: action.status, paidDate: action.status === "paid" ? todayISO() : undefined } : i,
        ),
      }))
    case "changeOrder/add":
      return updateProject(state, action.projectId, (p) => ({ ...p, changeOrders: [...p.changeOrders, action.changeOrder] }))
    case "changeOrder/decide":
      return updateProject(state, action.projectId, (p) => {
        const today = todayISO()
        const co = p.changeOrders.find((c) => c.id === action.changeOrderId)
        if (!co || co.status !== "pending") return p
        const changeOrders = p.changeOrders.map((c) => (c.id === co.id ? { ...c, status: action.status, decidedDate: today } : c))
        // An approved change order with a price is billed as its own installment
        const installments =
          action.status === "approved" && co.amount !== 0
            ? [
                ...p.installments,
                {
                  id: `${p.id}-I-${co.id}`,
                  title: co.amount > 0 ? `งานเพิ่ม: ${co.title}` : `ลดงาน: ${co.title}`,
                  amount: co.amount,
                  phase: null,
                  atProgress: 0,
                  dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
                  status: "invoiced" as const,
                  changeOrderId: co.id,
                },
              ]
            : p.installments
        return { ...p, changeOrders, installments }
      })
    case "timesheet/week":
      return {
        ...state,
        timesheet: [
          ...state.timesheet.filter((t) => !(t.employeeId === action.employeeId && t.date >= action.from && t.date <= action.to)),
          ...action.entries,
        ],
      }
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

/** Hours logged in the timesheet per project id */
export function useProjectHours() {
  const { state } = useStore()
  return React.useMemo(() => {
    const m = new Map<string, number>()
    for (const t of state.timesheet) m.set(t.projectId, (m.get(t.projectId) ?? 0) + t.hours)
    return m
  }, [state.timesheet])
}

export const newId = () => Math.random().toString(36).slice(2, 10)
