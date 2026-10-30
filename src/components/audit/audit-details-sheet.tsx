import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { t } from "@/i18n"
import type { AuditRow } from "@/lib/audit-api"
import { formatDate } from "@/lib/format"
import { AuditActionTag } from "./audit-action-tag"
import { AuditDetailsList } from "./audit-details-list"
import { entityLabel } from "./audit-labels"

/** Full record of one log entry. */
export function AuditDetailsSheet({ row, onClose }: { row: AuditRow | null; onClose: () => void }) {
  const meta = row
    ? [
        { label: t("audit.col.time"), value: formatDate(row.at, "d MMM yyyy HH:mm:ss") },
        { label: t("audit.col.actor"), value: row.actorName },
        { label: t("audit.col.entity"), value: entityLabel(row.entity) },
        { label: t("audit.sheet.entityId"), value: row.entityId ?? "-" },
        { label: t("audit.col.ip"), value: row.ip ?? "-" },
      ]
    : []

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle>{t("audit.sheet.title")}</SheetTitle>
              <SheetDescription className="sr-only">{t("audit.sheet.description")}</SheetDescription>
              <div>
                <AuditActionTag action={row.action} />
              </div>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
              <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-2 text-sm">
                {meta.map((m) => (
                  <div key={m.label} className="contents">
                    <dt className="text-muted-foreground">{m.label}</dt>
                    <dd className="break-words">{m.value}</dd>
                  </div>
                ))}
              </dl>
              <Separator />
              <h3 className="text-sm font-medium">{t("audit.sheet.details")}</h3>
              <AuditDetailsList details={row.details} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
