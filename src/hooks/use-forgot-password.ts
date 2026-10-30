import * as React from "react"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { t } from "@/i18n"

/** Request a reset link. The API never reveals whether the account exists, so success looks the same for everyone. */
export function useForgotPassword() {
  const [login, setLogin] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = login.trim()
    if (!value) return setError(t("auth.errors.usernameRequired"))
    setError(undefined)
    setLoading(true)
    try {
      await authApi.forgotPassword(value)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t("password.forgot.tooMany") : t("auth.errors.network"))
    } finally {
      setLoading(false)
    }
  }

  /** Back to the form (e.g. to try another username). */
  const again = () => setSent(false)

  return { login, setLogin, error, loading, sent, submit, again }
}
