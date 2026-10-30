import * as React from "react"
import { toast } from "sonner"
import { ApiError, SESSION_EXPIRED } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { labelMap, t } from "@/i18n/core"

export type Role = "executive" | "hr" | "staff"

export interface User {
  /** Account id (from the API) */
  id?: string
  username?: string
  /** The user's own employee record (from the API) */
  employeeId?: string | null
  /** Password was set by HR: must choose a new one before using the app */
  mustChangePassword?: boolean
  /** May open the Developer Console at /dev (independent of role; from the API) */
  isDeveloper?: boolean
  name: string
  email: string
  role: Role
  department: string
}

export const roleLabel = labelMap<Role>("common.role", ["executive", "hr", "staff"])

const AUTH_KEY = "hr-portal-user"

const AuthContext = React.createContext<{
  user: User | null
  login: (login: string, password: string) => Promise<User>
  refresh: () => Promise<void>
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

  // Bumped by login/logout: a slower /auth/me answer from before must not overwrite them
  const generation = React.useRef(0)
  // When the signed-in user last changed: a 401 from a request sent before that is about the old session
  const changedAt = React.useRef(0)

  // The cached user renders instantly; the server session is the source of truth.
  React.useEffect(() => {
    const gen = generation.current
    authApi
      .me()
      .then(({ user: u }) => {
        if (gen !== generation.current) return
        setUser(u)
        persist(u)
      })
      .catch((err) => {
        if (gen === generation.current && err instanceof ApiError && err.status === 401) {
          setUser(null)
          persist(null)
        }
      })
  }, [])

  React.useEffect(() => {
    // Another tab signed in or out (the session cookie is shared): follow it
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_KEY && e.key !== null) return
      generation.current++
      changedAt.current = performance.now()
      setUser(readUser())
    }
    // An API call found the session gone: back to the sign-in page (AppLayout redirects)
    const onExpired = (e: Event) => {
      const startedAt = (e as CustomEvent<{ startedAt?: number }>).detail?.startedAt ?? 0
      if (startedAt < changedAt.current) return
      generation.current++
      changedAt.current = performance.now()
      // Only tell someone who was signed in here (the stored user), once. After the current task
      // turn, so it replaces the "save failed" toasts of requests that hit the same 401
      if (readUser()) {
        setTimeout(() => {
          toast.dismiss()
          toast.warning(t("auth.sessionExpired"))
        }, 0)
      }
      setUser(null)
      persist(null)
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener(SESSION_EXPIRED, onExpired)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(SESSION_EXPIRED, onExpired)
    }
  }, [])

  /** Throws ApiError (e.g. 401 INVALID_CREDENTIALS, 429) so the form can show it. */
  const login = React.useCallback(async (loginId: string, password: string) => {
    const { user: u } = await authApi.login(loginId, password)
    generation.current++
    changedAt.current = performance.now()
    setUser(u)
    persist(u)
    return u
  }, [])

  /** Re-read the signed-in user from the server (e.g. after changing the password). */
  const refresh = React.useCallback(async () => {
    const { user: u } = await authApi.me()
    setUser(u)
    persist(u)
  }, [])

  const logout = React.useCallback(() => {
    generation.current++
    changedAt.current = performance.now()
    setUser(null)
    persist(null)
    authApi.logout().catch(() => {
      /* already signed out locally; the session expires on its own */
    })
  }, [])

  return <AuthContext.Provider value={{ user, login, refresh, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
