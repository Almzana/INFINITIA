import { TableCell, TableRow } from "@/components/ui/table"
import type { AuditRow as Row } from "@/lib/audit-api"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AuditActionTag } from "./audit-action-tag"
import { entityLabel, isSecurityAction } from "./audit-labels"
import { summarize } from "./audit-summary"

/**
 * One log entry. Phones see time + action (actor and summary stacked under them);
 * wider screens get dedicated actor / record type / details / IP columns.
 */
export function AuditRow({ row, onOpen }: { row: Row; onOpen: (r: Row) => void }) {
  const summary = summarize(row.action, row.details)
  return (
    <TableRow
      tabIndex={0}
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(row)
        }
      }}
      className={cn("cursor-pointer", isSecurityAction(row.action) && "bg-warning/5")}
    >
      <TableCell className="align-top text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:text-sm">
        {formatDate(row.at, "d MMM yyyy")}
        <span className="block">{formatDate(row.at, "HH:mm:ss")}</span>
      </TableCell>
      <TableCell className="hidden align-top font-medium sm:table-cell">{row.actorName}</TableCell>
      <TableCell className="align-top whitespace-normal">
        <AuditActionTag action={row.action} />
        <p className="mt-1 text-xs text-muted-foreground sm:hidden">{row.actorName}</p>
        {summary && <p className="mt-1 line-clamp-2 text-xs break-words text-muted-foreground lg:hidden">{summary}</p>}
      </TableCell>
      <TableCell className="hidden align-top md:table-cell">
        {entityLabel(row.entity)}
        {row.entityId && <span className="block font-mono text-xs text-muted-foreground">{row.entityId}</span>}
      </TableCell>
      <TableCell className="hidden min-w-64 align-top whitespace-normal lg:table-cell">
        <p className="line-clamp-2 text-sm break-words text-muted-foreground" title={summary}>
          {summary || "-"}
        </p>
      </TableCell>
      <TableCell className="hidden align-top font-mono text-xs text-muted-foreground xl:table-cell">{row.ip ?? "-"}</TableCell>
    </TableRow>
  )
}
