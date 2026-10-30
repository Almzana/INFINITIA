import { Link } from "react-router-dom"
import { ArrowLeftIcon, LoaderIcon, MailCheckIcon, UserIcon } from "lucide-react"
import { AuthNotice } from "@/components/auth/auth-notice"
import { AuthShell } from "@/components/auth/auth-shell"
import { BRAND } from "@/components/shared/brand"
import { FormItem } from "@/components/shared/misc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useForgotPassword } from "@/hooks/use-forgot-password"
import { t } from "@/i18n"

function BackToLogin() {
  return (
    <Button variant="link" size="sm" className="w-full" asChild>
      <Link to="/login">
        <ArrowLeftIcon /> {t("password.backToLogin")}
      </Link>
    </Button>
  )
}

export default function ForgotPasswordPage() {
  const f = useForgotPassword()

  if (f.sent) {
    return (
      <AuthShell>
        <div className="space-y-6 pt-2">
          <AuthNotice icon={MailCheckIcon} tone="success" title={t("password.forgot.sentTitle")}>
            <p>{t("password.forgot.sentDescription")}</p>
            <p className="text-xs">{t("password.forgot.sentHint")}</p>
          </AuthNotice>
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={f.again}>
              {t("password.forgot.again")}
            </Button>
            <BackToLogin />
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t("password.forgot.title")} description={t("password.forgot.description")}>
      <form onSubmit={f.submit} className="space-y-4" noValidate>
        <FormItem label={t("auth.usernameLabel")} required htmlFor="fp-login" error={f.error}>
          <div className="relative">
            <UserIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fp-login"
              autoComplete="username"
              autoFocus
              className="h-10 pl-8"
              placeholder={t("auth.usernamePlaceholder", { domain: BRAND.domain })}
              value={f.login}
              aria-invalid={!!f.error}
              onChange={(e) => f.setLogin(e.target.value)}
            />
          </div>
        </FormItem>
        <Button type="submit" size="lg" className="h-10 w-full" disabled={f.loading}>
          {f.loading && <LoaderIcon className="animate-spin" />}
          {t("password.forgot.submit")}
        </Button>
        <BackToLogin />
      </form>
    </AuthShell>
  )
}
