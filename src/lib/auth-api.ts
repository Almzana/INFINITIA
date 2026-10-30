import { apiFetch } from "@/lib/api"
import type { User } from "@/lib/auth"

/** Session lives in an httpOnly cookie set by the API; the browser sends it automatically. */
export const authApi = {
  /** login = username or email */
  login: (login: string, password: string) => apiFetch<{ user: User }>("/auth/login", { method: "POST", json: { login, password } }),
  me: () => apiFetch<{ user: User }>("/auth/me"),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  /**
   * Errors: 400 WRONG_PASSWORD (field currentPassword), 400 WEAK_PASSWORD with details[0].message one of
   * "length" | "letters_digits" | "personal" | "same". Other sessions are signed out; this one stays.
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<void>("/auth/password", { method: "PUT", json: { currentPassword, newPassword } }),
  /** Always succeeds (204) so it cannot reveal which accounts exist; an email is sent if the account does. */
  forgotPassword: (login: string) => apiFetch<void>("/auth/forgot", { method: "POST", json: { login } }),
  /** Errors: 400 INVALID_TOKEN (expired / used), 400 WEAK_PASSWORD. Signs out all sessions. */
  resetPassword: (token: string, newPassword: string) => apiFetch<void>("/auth/reset", { method: "POST", json: { token, newPassword } }),
  /** My own nickname / phone (HR owns the rest). Error 400 NO_EMPLOYEE_RECORD when the account has none. */
  updateProfile: (patch: { nickname?: string; phone?: string }) =>
    apiFetch<{ nickname: string; phone: string }>("/auth/profile", { method: "PATCH", json: patch }),
}
