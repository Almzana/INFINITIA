import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Tag } from "@/components/shared/tag"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { type Employee, type LeaveRequest, leaveTypeLabel } from "@/data/mock"
import { formatDate } from "@/lib/format"
import { deptLabel, t } from "@/i18n"
import { LeaveStatusTag } from "./leave-status-tag"
import { typeTag } from "./leave-tags"

/** One request in the table; approve / reject only when the API says this viewer may decide it. */
export function LeaveRow({ l, emp, selected, onSelect, onDecide, onView }: {
  l: LeaveRequest
  emp?: Employee
  selected: boolean
  onSelect: (on: boolean) => void
  onDecide: (status: "approved" | "rejected") => void
  onView: () => void
}) {
  return (
    <TableRow data-state={selected ? "selected" : undefined} className="cursor-pointer" onClick={onView}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox aria-label={t("leave.selectRow", { id: l.id })} disabled={!l.canDecide} checked={selected} onCheckedChange={(c) => onSelect(!!c)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <EmployeeAvatar person={emp} className="size-8" fallbackClassName="text-xs" />
          <div>
            <p className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : t("common.noData")}</p>
            <p className="text-xs text-muted-foreground">{emp && deptLabel(emp.department)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Tag type={typeTag[l.type]}>{leaveTypeLabel[l.type]}</Tag>
      </TableCell>
      <TableCell className="hidden md:table-cell">{l.from === l.to ? formatDate(l.from) : `${formatDate(l.from, "d MMM")} – ${formatDate(l.to)}`}</TableCell>
      <TableCell className="hidden text-center tabular-nums sm:table-cell">{t("common.days", { n: l.days })}</TableCell>
      <TableCell className="hidden max-w-48 truncate text-muted-foreground lg:table-cell">{l.reason}</TableCell>
      <TableCell>
        <LeaveStatusTag leave={l} />
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {l.canDecide ? (
          <div className="flex justify-end gap-1">
            <Button size="xs" variant="ghost" className="text-success hover:bg-success/10 hover:text-success" onClick={() => onDecide("approved")}>
              {t("leave.approve")}
            </Button>
            <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDecide("rejected")}>
              {t("leave.reject")}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
