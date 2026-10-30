import { BriefcaseIcon, CakeIcon, CalendarIcon, HomeIcon, KeyRoundIcon, MailIcon, PencilIcon, PhoneIcon, SirenIcon, UserCheckIcon, WalletIcon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { PhotoUploader } from "@/components/shared/photo-uploader"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tag } from "@/components/shared/tag"
import { type Employee, employeeStatusLabel } from "@/data/mock"
import { roleLabel } from "@/lib/auth"
import { statusTag } from "@/lib/employee-form"
import { formatCurrency, formatDate } from "@/lib/format"
import { useStore } from "@/lib/store"
import { deptLabel, t } from "@/i18n"

/** Read-only details. Sensitive rows only render when the API sent them (HR / executives). */
export function EmployeeSheet({ employee, canManage, editable, onClose, onEdit, onAccount }: {
  employee: Employee | null
  canManage: boolean
  editable: boolean
  onClose: () => void
  onEdit: (e: Employee) => void
  onAccount: (e: Employee) => void
}) {
  const { state } = useStore()
  // The sheet gets a snapshot; read the live record so a new photo shows immediately
  const live = (employee && state.employees.find((x) => x.id === employee.id)) || employee
  const leaves = employee ? state.leaves.filter((l) => l.employeeId === employee.id) : []
  const used = leaves.filter((l) => l.status === "approved").reduce((s, l) => s + l.days, 0)

  const rows = employee
    ? [
        { icon: BriefcaseIcon, label: t("employees.field.position"), value: `${employee.position} · ${deptLabel(employee.department)}` },
        { icon: MailIcon, label: t("employees.field.email"), value: employee.email },
        { icon: PhoneIcon, label: t("employees.field.phone"), value: employee.phone || "-" },
        { icon: CalendarIcon, label: t("employees.field.startDate"), value: formatDate(employee.startDate) },
        canManage && { icon: WalletIcon, label: t("employees.field.salary"), value: employee.salary === undefined ? "-" : formatCurrency(employee.salary) },
        canManage && { icon: CakeIcon, label: t("employees.field.birthDate"), value: employee.birthDate ? formatDate(employee.birthDate) : "-" },
        canManage && { icon: HomeIcon, label: t("employees.field.address"), value: employee.address || "-" },
        canManage && { icon: SirenIcon, label: t("employees.sheet.emergency"), value: [employee.emergencyName, employee.emergencyPhone].filter(Boolean).join(" · ") || "-" },
        canManage && {
          icon: UserCheckIcon,
          label: t("employees.sheet.account"),
          value: employee.username ? `${employee.username} (${roleLabel[employee.role ?? "staff"]})` : t("employees.sheet.noAccount"),
        },
      ].filter((r) => !!r)
    : []

  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        {employee && (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">{t("employees.sheet.title")}</SheetTitle>
              <SheetDescription className="sr-only">{t("employees.sheet.description", { name: employee.firstName })}</SheetDescription>
              <div className="flex items-center gap-4">
                <EmployeeAvatar person={live} className="size-16" fallbackClassName="text-xl" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {employee.nickname && `(${employee.nickname}) · `}
                    {employee.code}
                  </p>
                  <Tag type={statusTag[employee.status]} dot>
                    {employeeStatusLabel[employee.status]}
                  </Tag>
                </div>
              </div>
            </SheetHeader>
            <div className="space-y-6 overflow-auto px-4 pb-6">
              <dl className="space-y-3 text-sm">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <dt className="w-24 shrink-0 text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: t("employees.sheet.leaveUsed"), value: used },
                  { label: t("employees.sheet.leaveLeft"), value: Math.max(0, 15 - used) },
                  { label: t("employees.sheet.leaveRequests"), value: leaves.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <p className="text-xl font-semibold tabular-nums">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {editable && <PhotoUploader employee={live} size="size-12" />}
              {editable && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => onEdit(employee)}>
                    <PencilIcon /> {t("employees.sheet.editInfo")}
                  </Button>
                  <Button variant="outline" onClick={() => onAccount(employee)}>
                    <KeyRoundIcon /> {employee.username ? t("employees.account.resetPassword") : t("employees.account.createAccount")}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
