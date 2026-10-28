import * as React from "react"

export type Role = "executive" | "hr" | "staff"

export interface User {
  name: string
  email: string
  role: Role
  department: string
}

export const roleLabel: Record<Role, string> = {
  executive: "ผู้บริหาร",
  hr: "ฝ่ายบุคคล (HR)",
  staff: "พนักงาน",
}

// Demo profiles per role. Replace with the profile returned by your SSO / backend.
const demoProfiles: Record<Role, Omit<User, "email" | "role">> = {
  executive: { name: "ผู้บริหาร", department: "ฝ่ายบริหาร" },
  hr: { name: "HR Manager", department: "ฝ่ายบุคคล" },
  staff: { name: "พนักงานทั่วไป", department: "ฝ่ายออกแบบภายใน" },
}

const AUTH_KEY = "hr-portal-user"

const AuthContext = React.createContext<{
  user: User | null
  login: (email: string, role: Role) => void
  switchRole: (role: Role) => void
  updateProfile: (patch: Partial<Pick<User, "name">>) => void
  logout: () => void
} | null>(null)

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    const u = raw ? (JSON.parse(raw) as User) : null
    // Sessions saved before roles existed get the executive view
    return u && !(u.role in roleLabel) ? { ...u, role: "executive" } : u
  } catch {
    return null
  }
}

function persist(u: User | null) {
  try {
    if (u) localStorage.setItem(AUTH_KEY, JSON.stringify(u))
    else localStorage.removeItem(AUTH_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(readUser)

  // Demo only: the role is picked on the login screen. Wire this to your SSO / backend.
  const login = React.useCallback((email: string, role: Role) => {
    const u: User = { ...demoProfiles[role], email, role }
    setUser(u)
    persist(u)
  }, [])

  const switchRole = React.useCallback((role: Role) => {
    setUser((prev) => {
      if (!prev) return prev
      const u: User = { ...prev, ...demoProfiles[role], role }
      persist(u)
      return u
    })
  }, [])

  const updateProfile = React.useCallback((patch: Partial<Pick<User, "name">>) => {
    setUser((prev) => {
      if (!prev) return prev
      const u = { ...prev, ...patch }
      persist(u)
      return u
    })
  }, [])

  const logout = React.useCallback(() => {
    setUser(null)
    persist(null)
  }, [])

  return <AuthContext.Provider value={{ user, login, switchRole, updateProfile, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
