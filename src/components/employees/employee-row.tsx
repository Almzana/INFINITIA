import { KeyRoundIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { Tag } from "@/components/shared/tag"
import { type Employee, employeeStatusLabel } from "@/data/mock"
import { statusTag } from "@/lib/employee-form"
import { formatCurrency, formatDate } from "@/lib/format"
import { deptLabel, t } from "@/i18n"

export type RowActions = {
  onView: (e: Employee) => void
  onEdit: (e: Employee) => void
  onAccount: (e: Employee) => void
  onDelete: (ids: string[]) => void
}

export function EmployeeRow({ e, selected, onSelect, canManage, editable, actions }: {
  e: Employee
  selected: boolean
  onSelect: (on: boolean) => void
  canManage: boolean
  /** May edit / reset password / delete this particular record */
  editable: boolean
  actions: RowActions
}) {
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      {canManage && (
        <TableCell>
          <Checkbox aria-label={t("employees.table.selectRow", { name: e.firstName })} checked={selected} disabled={!editable} onCheckedChange={(c) => onSelect(!!c)} />
        </TableCell>
      )}
      <TableCell>
        <button className="flex items-center gap-3 text-left" onClick={() => actions.onView(e)}>
          <EmployeeAvatar person={e} className="size-8" fallbackClassName="text-xs" />
          <div className="min-w-0">
            <p className="font-medium hover:text-primary">
              {e.firstName} {e.lastName} {e.nickname && <span className="font-normal text-muted-foreground">({e.nickname})</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {e.email}
              {canManage && e.username && ` · @${e.username}`}
            </p>
          </div>
        </button>
      </TableCell>
      <TableCell className="hidden font-mono text-xs md:table-cell">{e.code}</TableCell>
      <TableCell className="hidden lg:table-cell">
        <p>{deptLabel(e.department)}</p>
        <p className="text-xs text-muted-foreground">{e.position}</p>
      </TableCell>
      <TableCell>
        <Tag type={statusTag[e.status]} dot>
          {employeeStatusLabel[e.status]}
        </Tag>
      </TableCell>
      <TableCell className="hidden xl:table-cell">{formatDate(e.startDate)}</TableCell>
      {canManage && <TableCell className="hidden text-right tabular-nums xl:table-cell">{e.salary === undefined ? "-" : formatCurrency(e.salary)}</TableCell>}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("common.menu")}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onView(e)}>{t("common.viewDetails")}</DropdownMenuItem>
            {editable && (
              <>
                <DropdownMenuItem onClick={() => actions.onEdit(e)}>
                  <PencilIcon /> {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.onAccount(e)}>
                  <KeyRoundIcon /> {e.username ? t("employees.account.resetPassword") : t("employees.account.createAccount")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete([e.id])}>
                  <Trash2Icon /> {t("common.delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
