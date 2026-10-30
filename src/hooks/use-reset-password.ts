import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { useAuth } from "@/lib/auth"
import { type PasswordErrors, toastPasswordError, useNewPassword, weakPasswordMessage } from "@/hooks/use-change-password"

export type ResetStatus = "form" | "done" | "invalid"

/** Set a new password from the emailed link (?token=...). */
export function useResetPassword() {
  const [params] = useSearchParams()
  const token = params.get("token")?.trim() ?? ""
  const { logout } = useAuth()
  const navigate = useNavigate()
  // The account is unknown here, so the "nothing personal" rule is only checked by the server
  const fields = useNewPassword([])
  const [status, setStatus] = React.useState<ResetStatus>(token ? "form" : "invalid")
  const [errors, setErrors] = React.useState<PasswordErrors>({})
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = fields.validate() ?? {}
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await authApi.resetPassword(token, fields.next)
      fields.reset()
      // Every session was revoked on the server. Signing out locally here would remount the app (the
      // store is keyed by user) and lose this "done" screen, so it happens when the user moves on.
      setStatus("done")
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_TOKEN") setStatus("invalid")
      else if (err instanceof ApiError && err.code === "WEAK_PASSWORD") setErrors({ next: weakPasswordMessage(err) })
      else toastPasswordError(err)
    } finally {
      setLoading(false)
    }
  }

  /** Leave the done screen: drop any cached (now revoked) user, then sign in fresh. */
  const finish = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return { status, ...fields, errors, loading, submit, finish }
}
