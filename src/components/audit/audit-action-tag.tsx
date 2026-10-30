import { ShieldAlertIcon } from "lucide-react"
import { Tag } from "@/components/shared/tag"
import { t } from "@/i18n"
import { actionLabel, actionTone, isSecurityAction } from "./audit-labels"

/** Coloured action label; security events get a shield icon. */
export function AuditActionTag({ action }: { action: string }) {
  const security = isSecurityAction(action)
  return (
    <Tag type={actionTone(action)}>
      {security && <ShieldAlertIcon className="size-3.5" aria-label={t("audit.security")} />}
      {actionLabel(action)}
    </Tag>
  )
}
