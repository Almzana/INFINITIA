import { BriefcaseIcon, KeyRoundIcon, LoaderIcon, UserRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Employee } from "@/data/mock"
import { useEmployeeForm } from "@/hooks/use-employee-form"
import { t } from "@/i18n"
import { AccountFields } from "./account-fields"
import { EmployeePersonalFields } from "./employee-personal-fields"
import { EmployeeWorkFields } from "./employee-work-fields"
import { FormSection } from "./form-section"
import { LeaderSelect } from "./leader-select"

/** Add a new employee (with login account) or edit an existing one. */
export function EmployeeFormDialog({ open, onOpenChange, initial, canGrantExecutive }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: Employee | null
  canGrantExecutive: boolean
}) {
  const { values, account, errors, saving, isNew, leaderOptions, set, setAcc, submit } = useEmployeeForm(open, initial, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} noValidate className="space-y-6">
          <DialogHeader>
            <DialogTitle>{isNew ? t("employees.form.titleNew") : t("employees.form.titleEdit")}</DialogTitle>
            <DialogDescription>{t("common.required")}</DialogDescription>
          </DialogHeader>

          <FormSection icon={BriefcaseIcon} title={t("employees.form.sectionWork")}>
            <EmployeeWorkFields values={values} errors={errors} set={set} />
            <LeaderSelect value={values.managerId} options={leaderOptions} error={errors.managerId} onChange={(id) => set("managerId", id)} />
          </FormSection>

          <FormSection icon={UserRoundIcon} title={t("employees.form.sectionPersonal")} hint={t("employees.form.sectionPersonalHint")}>
            <EmployeePersonalFields values={values} errors={errors} set={set} />
          </FormSection>

          {isNew && (
            <FormSection icon={KeyRoundIcon} title={t("employees.form.sectionAccount")} hint={t("employees.form.sectionAccountHint")}>
              <AccountFields values={account} errors={errors} set={setAcc} canGrantExecutive={canGrantExecutive} />
            </FormSection>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderIcon className="animate-spin" />}
              {isNew ? t("employees.add") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
