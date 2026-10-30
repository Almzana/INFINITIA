import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { landingAfterLogin } from "@/lib/access"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"

type Errors = { email?: string; password?: string }

/** Login form state, validation and submission against the API. */
export function useLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Errors>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!email.trim()) next.email = t("auth.errors.usernameRequired")
    if (!password) next.password = t("auth.errors.passwordRequired")
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      toast.success(t("auth.success"), { description: t("auth.welcomeBack") })
      // Back to where the visitor was, unless this account may not open it (e.g. /dev for non-developers)
      const from = (location.state as { from?: string } | null)?.from
      navigate(landingAfterLogin(from, user), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setErrors({ password: t("auth.errors.invalid") })
      else if (err instanceof ApiError && err.status === 429) toast.error(t("auth.errors.tooMany"), { description: t("auth.errors.tooManyHint") })
      else toast.error(t("auth.errors.network"), { description: t("auth.errors.networkHint") })
    } finally {
      setLoading(false)
    }
  }

  return { email, setEmail, password, setPassword, loading, errors, submit }
}
