import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { DownloadIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ElPagination } from "@/components/shared/el-pagination"
import { PageHeader } from "@/components/shared/misc"
import { AccountDialog } from "@/components/employees/account-dialog"
import { DeleteConfirm } from "@/components/employees/delete-confirm"
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog"
import { EmployeeSheet } from "@/components/employees/employee-sheet"
import { EmployeesFilter } from "@/components/employees/employees-filter"
import { EmployeesTable } from "@/components/employees/employees-table"
import { type Employee, employeeStatusLabel } from "@/data/mock"
import { useEmployeesList } from "@/hooks/use-employees-list"
import { useAuth } from "@/lib/auth"
import { downloadCsv } from "@/lib/format"
import { deptLabel, t } from "@/i18n"

export default function EmployeesPage() {
  const { user } = useAuth()
  // UI gating only; the API enforces the same rule
  const canManage = user?.role === "hr" || user?.role === "executive"
  const list = useEmployeesList()
  const [params, setParams] = useSearchParams()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Employee | null>(null)
  const [viewing, setViewing] = React.useState<Employee | null>(null)
  const [account, setAccount] = React.useState<Employee | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<string[] | null>(null)

  // Deep links from the command palette / dashboard
  const { findById } = list
  React.useEffect(() => {
    if (params.get("new") && canManage) {
      setEditing(null)
      setFormOpen(true)
      setParams({}, { replace: true })
    }
    const v = params.get("view")
    if (v) {
      setViewing(findById(v) ?? null)
      setParams({}, { replace: true })
    }
  }, [params, setParams, findById, canManage])

  const openEdit = (e: Employee) => {
    setViewing(null)
    setEditing(e)
    setFormOpen(true)
  }
  const openAccount = (e: Employee) => {
    setViewing(null)
    setAccount(e)
  }

  const exportCsv = () => {
    downloadCsv("employees.csv", [
      [t("employees.col.code"), t("employees.field.firstName"), t("employees.field.lastName"), t("employees.field.nickname"), t("employees.field.email"), t("employees.field.phone"), t("employees.field.department"), t("employees.field.position"), t("employees.field.status"), t("employees.field.startDate")],
      ...list.filtered.map((e) => [e.code, e.firstName, e.lastName, e.nickname, e.email, e.phone, deptLabel(e.department), e.position, employeeStatusLabel[e.status], e.startDate]),
    ])
    toast.success(t("employees.exported", { n: list.filtered.length }))
  }

  return (
    <>
      <PageHeader title={t("employees.title")} description={t("employees.description")} />

      <EmployeesFilter draft={list.draft} onChange={list.setDraft} onSearch={list.search} onReset={list.reset} />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <PlusIcon /> {t("employees.add")}
                </Button>
                <Button variant="destructive" disabled={list.selected.size === 0} onClick={() => setConfirmDelete([...list.selected])}>
                  <Trash2Icon /> {t("employees.deleteSelected")}{list.selected.size > 0 && ` (${list.selected.size})`}
                </Button>
              </>
            )}
            <Button variant="outline" className="ml-auto" onClick={exportCsv}>
              <DownloadIcon /> {t("employees.exportCsv")}
            </Button>
          </div>

          <EmployeesTable
            rows={list.rows}
            selected={list.selected}
            onToggle={list.toggle}
            sort={list.sort}
            onSort={list.onSort}
            canManage={canManage}
            isExecutive={user?.role === "executive"}
            actions={{ onView: setViewing, onEdit: openEdit, onAccount: openAccount, onDelete: setConfirmDelete }}
          />

          <ElPagination
            total={list.filtered.length}
            page={list.page}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
            onPageSizeChange={list.changePageSize}
          />
        </CardContent>
      </Card>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} canGrantExecutive={user?.role === "executive"} />
      <AccountDialog employee={account} onClose={() => setAccount(null)} canGrantExecutive={user?.role === "executive"} />
      <EmployeeSheet employee={viewing} canManage={canManage} editable={canManage && (user?.role === "executive" || viewing?.role !== "executive")} onClose={() => setViewing(null)} onEdit={openEdit} onAccount={openAccount} />
      <DeleteConfirm
        ids={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={(ids) => {
          setConfirmDelete(null)
          void list.remove(ids)
        }}
      />
    </>
  )
}
