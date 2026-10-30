import * as React from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"

export type PasswordRule = { id: "length" | "lettersDigits" | "personal" | "match"; ok: boolean }

/** The same rules the API enforces (8–128 chars, a letter and a digit, nothing personal) plus the confirmation. */
export function passwordRules(password: string, confirm: string, personal: (string | null | undefined)[]): PasswordRule[] {
  const lower = password.toLowerCase()
  const tokens = personal.map((p) => (p ?? "").trim().toLowerCase()).filter((p) => p.length >= 3)
  const rules: PasswordRule[] = [
    { id: "length", ok: password.length >= 8 && password.length <= 128 },
    { id: "lettersDigits", ok: /\p{L}/u.test(password) && /\d/.test(password) },
  ]
  if (tokens.length) rules.push({ id: "personal", ok: !!password && !tokens.some((tok) => lower.includes(tok)) })
  rules.push({ id: "match", ok: !!password && password === confirm })
  return rules
}

/** Turns a WEAK_PASSWORD reason ("length" | "letters_digits" | "personal" | "same") into a message. */
export function weakPasswordMessage(err: ApiError): string {
  const reason = err.details?.[0]?.message
  return reason && ["length", "letters_digits", "personal", "same"].includes(reason) ? t(`password.weak.${reason}`) : t("password.weak.generic")
}

/** Toast for errors that are not tied to a field (rate limit, network, server). */
export function toastPasswordError(err: unknown) {
  if (err instanceof ApiError && err.status === 429) toast.error(t("password.error.tooMany"), { description: t("password.error.tooManyHint") })
  else toast.error(t("password.error.failed"), { description: t("password.error.failedHint") })
}

/** New + confirm fields with the live rule checklist. */
export function useNewPassword(personal: (string | null | undefined)[]) {
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const rules = passwordRules(next, confirm, personal)
  /** Error for the "new" / "confirm" fields when the rules are not met (null = valid). */
  const validate = () => {
    if (rules.some((r) => r.id !== "match" && !r.ok)) return { next: t("password.error.rules") }
    if (next !== confirm) return { confirm: t("password.error.mismatch") }
    return null
  }
  const reset = () => {
    setNext("")
    setConfirm("")
  }
  return { next, setNext, confirm, setConfirm, rules, validate, reset }
}

export type PasswordErrors = { current?: string; next?: string; confirm?: string }

/** Change my own password; on success re-reads the user (clears mustChangePassword). */
export function useChangePassword(onSuccess?: () => void) {
  const { user, refresh } = useAuth()
  const fields = useNewPassword([user?.username, user?.email?.split("@")[0]])
  const [current, setCurrent] = React.useState("")
  const [errors, setErrors] = React.useState<PasswordErrors>({})
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: PasswordErrors = { ...(current ? {} : { current: t("password.error.currentRequired") }), ...fields.validate() }
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await authApi.changePassword(current, fields.next)
      setCurrent("")
      fields.reset()
      await refresh().catch(() => undefined)
      toast.success(t("password.changed"), { description: t("password.changedHint") })
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError && err.code === "WRONG_PASSWORD") setErrors({ current: t("password.error.wrong") })
      else if (err instanceof ApiError && err.code === "WEAK_PASSWORD") setErrors({ next: weakPasswordMessage(err) })
      else toastPasswordError(err)
    } finally {
      setLoading(false)
    }
  }

  return { current, setCurrent, ...fields, errors, loading, submit }
}
