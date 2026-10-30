import { CheckIcon, CircleIcon } from "lucide-react"
import type { PasswordRule } from "@/hooks/use-change-password"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

/** Live checklist of the password requirements. */
export function PasswordRuleList({ rules }: { rules: PasswordRule[] }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-xs" aria-live="polite">
      <p className="mb-1.5 font-medium text-muted-foreground">{t("password.rule.title")}</p>
      <ul className="space-y-1">
        {rules.map((r) => (
          <li key={r.id} className={cn("flex items-start gap-2", r.ok ? "text-success" : "text-muted-foreground")}>
            {r.ok ? <CheckIcon className="mt-px size-3.5 shrink-0" /> : <CircleIcon className="mt-0.5 size-3 shrink-0" />}
            <span>{t(`password.rule.${r.id}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
