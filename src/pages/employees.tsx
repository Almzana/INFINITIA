import * as React from "react"
import { useSearchParams } from "react-router-dom"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BriefcaseIcon,
  CalendarIcon,
  DownloadIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ElPagination } from "@/components/shared/el-pagination"
import { EmptyState, FormItem, PageHeader } from "@/components/shared/misc"
import { Tag, type TagType } from "@/components/shared/tag"
import { departments, type Employee, type EmployeeStatus, employeeStatusLabel } from "@/data/mock"
import { formatCurrency, formatDate, initials } from "@/lib/format"
import { newId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export const statusTag: Record<EmployeeStatus, TagType> = {
  active: "success",
  probation: "primary",
  leave: "warning",
  resigned: "info",
}

type SortKey = "code" | "firstName" | "department" | "startDate" | "salary"

const emptyForm: Omit<Employee, "id"> = {
  code: "",
  firstName: "",
  lastName: "",
  nickname: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  status: "probation",
  startDate: "2026-11-01",
  salary: 25000,
}

function EmployeeFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: Employee | null
}) {
  const { state, dispatch } = useStore()
  const [form, setForm] = React.useState<Omit<Employee, "id">>(emptyForm)
  const [errors, setErrors] = React.useState<Partial<Record<keyof Employee, string>>>({})

  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(initial ?? { ...emptyForm, code: `EMP${1001 + state.employees.length + Math.floor(Math.random() * 50)}` })
  }, [open, initial, state.employees.length])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.firstName.trim()) next.firstName = "กรุณากรอกชื่อ"
    if (!form.lastName.trim()) next.lastName = "กรุณากรอกนามสกุล"
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "รูปแบบอีเมลไม่ถูกต้อง"
    if (!form.department) next.department = "กรุณาเลือกฝ่าย"
    if (!form.position.trim()) next.position = "กรุณากรอกตำแหน่ง"
    setErrors(next)
    if (Object.keys(next).length) return

    dispatch({ type: "employee/upsert", employee: { ...form, id: initial?.id ?? newId() } })
    toast.success(initial ? "บันทึกการแก้ไขแล้ว" : "เพิ่มพนักงานเรียบร้อย", { description: `${form.firstName} ${form.lastName}` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{initial ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}</DialogTitle>
            <DialogDescription>ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormItem label="รหัสพนักงาน" htmlFor="code">
              <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} />
            </FormItem>
            <FormItem label="ชื่อเล่น" htmlFor="nickname">
              <Input id="nickname" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} />
            </FormItem>
            <FormItem label="ชื่อ" required htmlFor="firstName" error={errors.firstName}>
              <Input id="firstName" aria-invalid={!!errors.firstName} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </FormItem>
            <FormItem label="นามสกุล" required htmlFor="lastName" error={errors.lastName}>
              <Input id="lastName" aria-invalid={!!errors.lastName} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </FormItem>
            <FormItem label="อีเมล" required htmlFor="email" error={errors.email}>
              <Input id="email" type="email" aria-invalid={!!errors.email} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </FormItem>
            <FormItem label="เบอร์โทร" htmlFor="phone">
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08x-xxx-xxxx" />
            </FormItem>
            <FormItem label="ฝ่าย" required error={errors.department}>
              <Select value={form.department} onValueChange={(v) => set("department", v)}>
                <SelectTrigger className="w-full" aria-invalid={!!errors.department}>
                  <SelectValue placeholder="เลือกฝ่าย" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="ตำแหน่ง" required htmlFor="position" error={errors.position}>
              <Input id="position" aria-invalid={!!errors.position} value={form.position} onChange={(e) => set("position", e.target.value)} />
            </FormItem>
            <FormItem label="สถานะ">
              <Select value={form.status} onValueChange={(v) => set("status", v as EmployeeStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {employeeStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="วันเริ่มงาน" htmlFor="startDate">
              <Input id="startDate" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </FormItem>
            <FormItem label="เงินเดือน (บาท)" htmlFor="salary" className="sm:col-span-2">
              <Input id="salary" type="number" min={0} step={500} value={form.salary} onChange={(e) => set("salary", Number(e.target.value))} />
            </FormItem>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">{initial ? "บันทึก" : "เพิ่มพนักงาน"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EmployeeSheet({ employee, onClose, onEdit }: { employee: Employee | null; onClose: () => void; onEdit: (e: Employee) => void }) {
  const { state } = useStore()
  const leaves = employee ? state.leaves.filter((l) => l.employeeId === employee.id) : []
  const used = leaves.filter((l) => l.status === "approved").reduce((s, l) => s + l.days, 0)

  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        {employee && (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">ข้อมูลพนักงาน</SheetTitle>
              <SheetDescription className="sr-only">รายละเอียดของ {employee.firstName}</SheetDescription>
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-primary/10 text-xl text-primary">{initials(employee.firstName, employee.lastName)}</AvatarFallback>
                </Avatar>
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
            <div className="space-y-6 overflow-auto px-4">
              <dl className="space-y-3 text-sm">
                {[
                  { icon: BriefcaseIcon, label: "ตำแหน่ง", value: `${employee.position} · ${employee.department}` },
                  { icon: MailIcon, label: "อีเมล", value: employee.email },
                  { icon: PhoneIcon, label: "เบอร์โทร", value: employee.phone || "-" },
                  { icon: CalendarIcon, label: "วันเริ่มงาน", value: formatDate(employee.startDate) },
                  { icon: WalletIcon, label: "เงินเดือน", value: formatCurrency(employee.salary) },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="mt-0.5 size-4 text-muted-foreground" />
                    <dt className="w-24 shrink-0 text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium break-all">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "ใช้วันลาแล้ว", value: used },
                  { label: "คงเหลือ", value: Math.max(0, 15 - used) },
                  { label: "คำขอทั้งหมด", value: leaves.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <p className="text-xl font-semibold tabular-nums">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => onEdit(employee)}>
                <PencilIcon /> แก้ไขข้อมูล
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SortHeader({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" } | null; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort?.key === k
  const Icon = !active ? ArrowUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead className={className}>
      <button onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-primary")}>
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  )
}

export default function EmployeesPage() {
  const { state, dispatch } = useStore()
  const [params, setParams] = useSearchParams()

  // Search form (applied on submit, Element Plus style)
  const [keyword, setKeyword] = React.useState("")
  const [dept, setDept] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [applied, setApplied] = React.useState({ keyword: "", dept: "all", status: "all" })

  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Employee | null>(null)
  const [viewing, setViewing] = React.useState<Employee | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<string[] | null>(null)

  // Deep links from the command palette / dashboard
  React.useEffect(() => {
    if (params.get("new")) {
      setEditing(null)
      setFormOpen(true)
      setParams({}, { replace: true })
    }
    const v = params.get("view")
    if (v) {
      setViewing(state.employees.find((e) => e.id === v) ?? null)
      setParams({}, { replace: true })
    }
  }, [params, setParams, state.employees])

  const filtered = React.useMemo(() => {
    const kw = applied.keyword.trim().toLowerCase()
    let rows = state.employees.filter(
      (e) =>
        (!kw || `${e.firstName} ${e.lastName} ${e.nickname} ${e.code} ${e.email} ${e.position}`.toLowerCase().includes(kw)) &&
        (applied.dept === "all" || e.department === applied.dept) &&
        (applied.status === "all" || e.status === applied.status),
    )
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        const r = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv), "th")
        return sort.dir === "asc" ? r : -r
      })
    }
    return rows
  }, [state.employees, applied, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someOnPageSelected = rows.some((r) => selected.has(r.id))

  const onSort = (k: SortKey) => setSort((s) => (s?.key !== k ? { key: k, dir: "asc" } : s.dir === "asc" ? { key: k, dir: "desc" } : null))

  const search = (e?: React.FormEvent) => {
    e?.preventDefault()
    setApplied({ keyword, dept, status })
    setPage(1)
  }
  const reset = () => {
    setKeyword("")
    setDept("all")
    setStatus("all")
    setApplied({ keyword: "", dept: "all", status: "all" })
    setPage(1)
  }

  const exportCsv = () => {
    const header = ["รหัส", "ชื่อ", "นามสกุล", "ชื่อเล่น", "อีเมล", "เบอร์โทร", "ฝ่าย", "ตำแหน่ง", "สถานะ", "วันเริ่มงาน"]
    const lines = filtered.map((e) =>
      [e.code, e.firstName, e.lastName, e.nickname, e.email, e.phone, e.department, e.position, employeeStatusLabel[e.status], e.startDate]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "employees.csv"
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(`ส่งออก ${filtered.length} รายการแล้ว`)
  }

  const doDelete = () => {
    if (!confirmDelete) return
    dispatch({ type: "employee/delete", ids: confirmDelete })
    setSelected((s) => new Set([...s].filter((id) => !confirmDelete.includes(id))))
    toast.success(`ลบพนักงาน ${confirmDelete.length} รายการแล้ว`)
    setConfirmDelete(null)
  }

  const openEdit = (e: Employee) => {
    setViewing(null)
    setEditing(e)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader title="พนักงาน" description="จัดการข้อมูลพนักงานทั้งหมดในองค์กร" />

      <Card>
        <CardContent>
          <form onSubmit={search} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_auto]">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="ค้นหาชื่อ รหัส อีเมล ตำแหน่ง..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฝ่าย</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {employeeStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button type="submit">
                <SearchIcon /> ค้นหา
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                <RotateCcwIcon /> รีเซ็ต
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <PlusIcon /> เพิ่มพนักงาน
            </Button>
            <Button variant="destructive" disabled={selected.size === 0} onClick={() => setConfirmDelete([...selected])}>
              <Trash2Icon /> ลบที่เลือก{selected.size > 0 && ` (${selected.size})`}
            </Button>
            <Button variant="outline" className="ml-auto" onClick={exportCsv}>
              <DownloadIcon /> ส่งออก CSV
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="เลือกทั้งหน้า"
                      checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                      onCheckedChange={(c) =>
                        setSelected((s) => {
                          const n = new Set(s)
                          rows.forEach((r) => (c ? n.add(r.id) : n.delete(r.id)))
                          return n
                        })
                      }
                    />
                  </TableHead>
                  <SortHeader label="พนักงาน" k="firstName" sort={sort} onSort={onSort} />
                  <SortHeader label="รหัส" k="code" sort={sort} onSort={onSort} className="hidden md:table-cell" />
                  <SortHeader label="ฝ่าย / ตำแหน่ง" k="department" sort={sort} onSort={onSort} className="hidden lg:table-cell" />
                  <TableHead>สถานะ</TableHead>
                  <SortHeader label="วันเริ่มงาน" k="startDate" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
                  <SortHeader label="เงินเดือน" k="salary" sort={sort} onSort={onSort} className="hidden text-right xl:table-cell" />
                  <TableHead className="w-12 text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id} data-state={selected.has(e.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`เลือก ${e.firstName}`}
                        checked={selected.has(e.id)}
                        onCheckedChange={(c) =>
                          setSelected((s) => {
                            const n = new Set(s)
                            if (c) n.add(e.id)
                            else n.delete(e.id)
                            return n
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <button className="flex items-center gap-3 text-left" onClick={() => setViewing(e)}>
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(e.firstName, e.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium hover:text-primary">
                            {e.firstName} {e.lastName} <span className="font-normal text-muted-foreground">({e.nickname})</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{e.email}</p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">{e.code}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p>{e.department}</p>
                      <p className="text-xs text-muted-foreground">{e.position}</p>
                    </TableCell>
                    <TableCell>
                      <Tag type={statusTag[e.status]} dot>
                        {employeeStatusLabel[e.status]}
                      </Tag>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{formatDate(e.startDate)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums xl:table-cell">{formatCurrency(e.salary)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="เมนู">
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewing(e)}>ดูรายละเอียด</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <PencilIcon /> แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete([e.id])}>
                            <Trash2Icon /> ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ElPagination
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      <EmployeeSheet employee={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบพนักงาน {confirmDelete?.length} รายการใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={doDelete}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
