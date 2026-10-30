import { Link } from "react-router-dom"
import { CircleCheckIcon, LinkIcon, LoaderIcon } from "lucide-react"
import { AuthNotice } from "@/components/auth/auth-notice"
import { AuthShell } from "@/components/auth/auth-shell"
import { NewPasswordFields } from "@/components/auth/new-password-fields"
import { Button } from "@/components/ui/button"
import { useResetPassword } from "@/hooks/use-reset-password"
import { t } from "@/i18n"

export default function ResetPasswordPage() {
  const f = useResetPassword()

  if (f.status === "done") {
    return (
      <AuthShell>
        <div className="space-y-6 pt-2">
          <AuthNotice icon={CircleCheckIcon} tone="success" title={t("password.reset.doneTitle")}>
            <p>{t("password.reset.doneDescription")}</p>
          </AuthNotice>
          <Button className="w-full" onClick={f.finish}>
            {t("auth.login")}
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (f.status === "invalid") {
    return (
      <AuthShell>
        <div className="space-y-6 pt-2">
          <AuthNotice icon={LinkIcon} tone="danger" title={t("password.reset.invalidTitle")}>
            <p>{t("password.reset.invalidDescription")}</p>
          </AuthNotice>
          <div className="space-y-2">
            <Button className="w-full" asChild>
              <Link to="/forgot-password">{t("password.reset.requestNew")}</Link>
            </Button>
            <Button variant="link" size="sm" className="w-full" asChild>
              <Link to="/login">{t("password.backToLogin")}</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t("password.reset.title")} description={t("password.reset.description")}>
      <form onSubmit={f.submit} className="space-y-4" noValidate>
        <NewPasswordFields
          idPrefix="rp"
          next={f.next}
          onNext={f.setNext}
          confirm={f.confirm}
          onConfirm={f.setConfirm}
          rules={f.rules}
          errors={f.errors}
        />
        <Button type="submit" size="lg" className="h-10 w-full" disabled={f.loading}>
          {f.loading && <LoaderIcon className="animate-spin" />}
          {t("password.reset.submit")}
        </Button>
      </form>
    </AuthShell>
  )
}
