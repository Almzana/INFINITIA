import { LoaderIcon } from "lucide-react"
import { PasswordInput } from "@/components/employees/password-input"
import { FormItem } from "@/components/shared/misc"
import { Button } from "@/components/ui/button"
import { useChangePassword } from "@/hooks/use-change-password"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"
import { NewPasswordFields } from "./new-password-fields"

/** Current / new / confirm password form. Used on /change-password and in Settings → Security. */
export function ChangePasswordForm({ onSuccess, className }: { onSuccess?: () => void; className?: string }) {
  const f = useChangePassword(onSuccess)

  return (
    <form onSubmit={f.submit} className={cn("space-y-4", className)} noValidate>
      <FormItem label={t("password.current")} required htmlFor="cp-current" error={f.errors.current}>
        <PasswordInput
          id="cp-current"
          autoComplete="current-password"
          value={f.current}
          onChange={f.setCurrent}
          invalid={!!f.errors.current}
        />
      </FormItem>
      <NewPasswordFields
        idPrefix="cp"
        next={f.next}
        onNext={f.setNext}
        confirm={f.confirm}
        onConfirm={f.setConfirm}
        rules={f.rules}
        errors={f.errors}
      />
      <Button type="submit" className="w-full sm:w-auto" disabled={f.loading}>
        {f.loading && <LoaderIcon className="animate-spin" />}
        {t("password.submit")}
      </Button>
    </form>
  )
}
