import { KeyRoundIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { t } from "@/i18n"

/** Change my password from Settings. */
export function SecurityTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-4 text-primary" /> {t("password.security.title")}
        </CardTitle>
        <CardDescription>{t("password.security.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm className="max-w-md" />
      </CardContent>
    </Card>
  )
}
