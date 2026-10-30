import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/misc"
import type { Employee } from "@/data/mock"
import type { Sort, SortKey } from "@/hooks/use-employees-list"
import { t } from "@/i18n"
import { EmployeeRow, type RowActions } from "./employee-row"
import { SortHeader } from "./sort-header"

/** Employees table; selection, salary column and row actions only for HR / executives. */
export function EmployeesTable({ rows, selected, onToggle, sort, onSort, canManage, isExecutive, actions }: {
  rows: Employee[]
  selected: Set<string>
  onToggle: (ids: string[], on: boolean) => void
  sort: Sort
  onSort: (k: SortKey) => void
  canManage: boolean
  /** HR may not touch executives' records (the API refuses it too) */
  isExecutive: boolean
  actions: RowActions
}) {
  const editable = (e: Employee) => canManage && (isExecutive || e.role !== "executive")
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someOnPage = rows.some((r) => selected.has(r.id))
  const columns = canManage ? 8 : 6

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            {canManage && (
              <TableHead className="w-10">
                <Checkbox
                  aria-label={t("employees.table.selectPage")}
                  checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                  onCheckedChange={(c) => onToggle(rows.filter(editable).map((r) => r.id), !!c)}
                />
              </TableHead>
            )}
            <SortHeader label={t("employees.col.employee")} k="firstName" sort={sort} onSort={onSort} />
            <SortHeader label={t("employees.col.code")} k="code" sort={sort} onSort={onSort} className="hidden md:table-cell" />
            <SortHeader label={t("employees.col.deptPosition")} k="department" sort={sort} onSort={onSort} className="hidden lg:table-cell" />
            <TableHead>{t("employees.field.status")}</TableHead>
            <SortHeader label={t("employees.field.startDate")} k="startDate" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
            {canManage && <SortHeader label={t("employees.field.salary")} k="salary" sort={sort} onSort={onSort} className="hidden text-right xl:table-cell" />}
            <TableHead className="w-12 text-right">{t("employees.col.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => (
            <EmployeeRow
              key={e.id}
              e={e}
              selected={selected.has(e.id)}
              onSelect={(on) => onToggle([e.id], on)}
              canManage={canManage}
              editable={editable(e)}
              actions={actions}
            />
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns}>
                <EmptyState description={t("employees.table.emptyHint")} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
