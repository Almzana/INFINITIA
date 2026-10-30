import { AlertCircleIcon, RotateCwIcon } from "lucide-react"
import { AuditDetailsSheet } from "@/components/audit/audit-details-sheet"
import { AuditFilter } from "@/components/audit/audit-filter"
import { AuditTable } from "@/components/audit/audit-table"
import { ElPagination } from "@/components/shared/el-pagination"
import { PageHeader } from "@/components/shared/misc"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AUDIT_PAGE_SIZES, useAuditLog } from "@/hooks/use-audit-log"
import { t } from "@/i18n"

/** Executives only (route guard + API). */
export default function AuditPage() {
  const log = useAuditLog()

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("audit.title")} description={t("audit.description")} />
      <Card>
        <CardContent className="space-y-4">
          <AuditFilter draft={log.draft} onChange={log.setDraft} onSearch={log.search} onReset={log.reset} />
          {log.error ? (
            <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center text-sm">
              <AlertCircleIcon className="size-6 text-destructive" />
              <p>{log.error}</p>
              <Button variant="outline" size="sm" onClick={log.retry}>
                <RotateCwIcon /> {t("common.retry")}
              </Button>
            </div>
          ) : (
            <AuditTable rows={log.rows} loading={log.loading} onOpen={log.select} />
          )}
          <ElPagination
            total={log.total}
            page={log.page}
            pageSize={log.pageSize}
            pageSizes={AUDIT_PAGE_SIZES}
            onPageChange={log.setPage}
            onPageSizeChange={log.changePageSize}
          />
        </CardContent>
      </Card>
      <AuditDetailsSheet row={log.selected} onClose={() => log.select(null)} />
    </div>
  )
}
