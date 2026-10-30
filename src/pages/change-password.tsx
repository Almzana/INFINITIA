import { Link, Navigate, useNavigate } from "react-router-dom"
import { LogOutIcon, ShieldAlertIcon } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"

export default function ChangePasswordPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return <Navigate to="/login" replace />
  const forced = !!user.mustChangePassword

  return (
    <AuthShell
      title={forced ? t("password.page.mustTitle") : t("password.page.title")}
      description={forced ? undefined : t("password.page.description")}
    >
      {forced && (
        <div className="mb-4 flex gap-3 rounded-md bg-warning/10 p-3 text-sm text-warning" role="status">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>{t("password.page.mustDescription")}</p>
        </div>
      )}
      <ChangePasswordForm onSuccess={() => navigate("/", { replace: true })} />
      <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOutIcon /> {t("password.signOut")}
        </Button>
        {!forced && (
          <Button variant="link" size="sm" asChild>
            <Link to="/">{t("password.page.back")}</Link>
          </Button>
        )}
      </div>
    </AuthShell>
  )
}
