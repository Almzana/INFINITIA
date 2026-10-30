import { EmptyState } from "@/components/shared/misc"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { t } from "@/i18n"
import type { AuditRow as Row } from "@/lib/audit-api"
import { AuditRow } from "./audit-row"

const COLUMNS = 6

/** Responsive log table: columns appear progressively from phone (2) to desktop (6). */
export function AuditTable({ rows, loading, onOpen }: { rows: Row[]; loading: boolean; onOpen: (r: Row) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="w-28 sm:w-36">{t("audit.col.time")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("audit.col.actor")}</TableHead>
            <TableHead>{t("audit.col.action")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("audit.col.entity")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("audit.col.details")}</TableHead>
            <TableHead className="hidden xl:table-cell">{t("audit.col.ip")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-busy={loading}>
          {loading && rows.length === 0
            ? Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLUMNS}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : rows.map((r) => <AuditRow key={r.id} row={r} onOpen={onOpen} />)}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS}>
                <EmptyState description={t("audit.table.emptyHint")} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
