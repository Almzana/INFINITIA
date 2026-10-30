import { CheckIcon, XIcon } from "lucide-react"
import { ElPagination } from "@/components/shared/el-pagination"
import { EmptyState } from "@/components/shared/misc"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type Employee, type LeaveRequest, leaveStatusLabel } from "@/data/mock"
import { type LeaveTab, useLeaveList } from "@/hooks/use-leave-list"
import { t } from "@/i18n"
import { LeaveRow } from "./leave-row"

/** Tabs by status, bulk approve / reject of decidable rows, the table and paging. */
export function LeaveRequestsCard({ leaves, employees, onDecide, onView }: {
  leaves: LeaveRequest[]
  employees: Map<string, Employee>
  onDecide: (ids: string[], status: "approved" | "rejected") => void
  onView: (id: string) => void
}) {
  const list = useLeaveList(leaves)
  const decide = (ids: string[], status: "approved" | "rejected") => {
    list.clear()
    onDecide(ids, status)
  }

  return (
    <Card className="min-w-0">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={list.tab} onValueChange={(v) => list.setTab(v as LeaveTab)}>
            <TabsList>
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                <TabsTrigger key={s} value={s} className="gap-1.5">
                  {s === "all" ? t("common.all") : leaveStatusLabel[s]}
                  <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{list.counts[s]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {list.selected.size > 0 && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => decide([...list.selected], "approved")}>
                <CheckIcon /> {t("leave.approveCount", { n: list.selected.size })}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => decide([...list.selected], "rejected")}>
                <XIcon /> {t("leave.rejectBulk")}
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox aria-label={t("leave.selectAll")} disabled={list.decidableCount === 0} checked={list.allSelected} onCheckedChange={(c) => list.toggleAll(!!c)} />
                </TableHead>
                <TableHead>{t("leave.col.employee")}</TableHead>
                <TableHead>{t("leave.col.type")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("leave.col.date")}</TableHead>
                <TableHead className="hidden text-center sm:table-cell">{t("leave.col.days")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("leave.col.reason")}</TableHead>
                <TableHead>{t("leave.col.status")}</TableHead>
                <TableHead className="text-right">{t("leave.col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((l) => (
                <LeaveRow
                  key={l.id}
                  l={l}
                  emp={employees.get(l.employeeId)}
                  selected={list.selected.has(l.id)}
                  onSelect={(on) => list.toggle(l.id, on)}
                  onDecide={(s) => decide([l.id], s)}
                  onView={() => onView(l.id)}
                />
              ))}
              {list.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title={t("leave.empty")} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ElPagination total={list.total} page={list.page} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
      </CardContent>
    </Card>
  )
}
