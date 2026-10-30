import { InfoIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Employee } from "@/data/mock"
import { useAccountForm } from "@/hooks/use-account-form"
import { t } from "@/i18n"
import { AccountFields } from "./account-fields"

/** Set username + password: creates the account, or sets a new password for an existing one. */
export function AccountDialog({ employee, onClose, canGrantExecutive }: { employee: Employee | null; onClose: () => void; canGrantExecutive: boolean }) {
  const { values, errors, saving, hasAccount, set, submit } = useAccountForm(employee, onClose)

  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{hasAccount ? t("employees.account.resetPassword") : t("employees.account.createAccount")}</DialogTitle>
            <DialogDescription>
              {employee?.firstName} {employee?.lastName} · {employee?.code}
            </DialogDescription>
          </DialogHeader>
          {hasAccount && (
            <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              {t("employees.account.signOutWarning")}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <AccountFields
              values={values}
              errors={errors}
              set={set}
              canGrantExecutive={canGrantExecutive}
              passwordLabel={hasAccount ? t("employees.account.newPassword") : t("employees.account.password")}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderIcon className="animate-spin" />}
              {hasAccount ? t("employees.account.resetPassword") : t("employees.account.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
