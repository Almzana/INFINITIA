import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertTriangleIcon, BriefcaseIcon, FileClockIcon, PlusIcon, SearchIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, FormItem, PageHeader, StatCard } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { installmentTag, projectStatusTag, useProjectRows } from "@/components/projects/shared"
import {
  createProject,
  currentPhase,
  installmentStatusLabel,
  paymentSchedules,
  phaseInfo,
  type ProjectStatus,
  type ProjectType,
  projectStatusLabel,
  projectTypeLabel,
} from "@/data/projects"
import { formatDate, formatMillion, formatPercent, todayISO } from "@/lib/format"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const emptyForm = {
  name: "",
  type: "design-build" as ProjectType,
  location: "กรุงเทพฯ",
  areaSqm: "",
  value: "",
  cost: "",
  start: todayISO(),
  end: "",
  manager: "",
}

function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = React.useState(emptyForm)
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  React.useEffect(() => {
    if (open) {
      setForm(emptyForm)
      setErrors({})
    }
  }, [open])

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const value = Number(form.value) * 1_000_000

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = "กรุณากรอกชื่อโครงการ"
    if (!(Number(form.value) > 0)) next.value = "กรุณากรอกมูลค่าสัญญา"
    if (!(Number(form.cost) > 0)) next.cost = "กรุณากรอกงบต้นทุน"
    else if (Number(form.cost) >= Number(form.value)) next.cost = "งบต้นทุนควรน้อยกว่ามูลค่าสัญญา"
    if (!form.end) next.end = "กรุณาเลือกวันสิ้นสุด"
    else if (form.end <= form.start) next.end = "วันสิ้นสุดต้องอยู่หลังวันเริ่ม"
    if (!form.manager.trim()) next.manager = "กรุณาระบุผู้ดูแลโครงการ"
    setErrors(next)
    if (Object.keys(next).length) return

    const maxId = Math.max(0, ...state.projects.map((p) => Number(p.id.replace(/\D/g, "")) || 0))
    const project = createProject({
      id: `PJ${String(maxId + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      type: form.type,
      location: form.location.trim() || "-",
      areaSqm: Number(form.areaSqm) || 0,
      value,
      cost: Number(form.cost) * 1_000_000,
      start: form.start,
      end: form.end,
      manager: form.manager.trim(),
    })
    dispatch({ type: "project/add", project })
    toast.success("สร้างโครงการแล้ว", { description: `${project.id} · แผนงาน ${project.phases.length} เฟส · ${project.installments.length} งวดเงิน` })
    onOpenChange(false)
    navigate(`/projects/${project.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>สร้างโครงการใหม่</DialogTitle>
            <DialogDescription>ระบบจะสร้างแผนเฟสงานและงวดเงินตามประเภทงานให้อัตโนมัติ</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormItem label="ชื่อโครงการ" required htmlFor="p-name" error={errors.name} className="sm:col-span-2">
              <Input id="p-name" aria-invalid={!!errors.name} value={form.name} placeholder="เช่น The Riverside Residence" onChange={(e) => set("name", e.target.value)} />
            </FormItem>
            <FormItem label="ประเภทงาน" required>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(projectTypeLabel) as ProjectType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {projectTypeLabel[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="ผู้ดูแลโครงการ" required htmlFor="p-manager" error={errors.manager}>
              <Input id="p-manager" aria-invalid={!!errors.manager} value={form.manager} placeholder="เช่น PM สมชาย" onChange={(e) => set("manager", e.target.value)} />
            </FormItem>
            <FormItem label="มูลค่าสัญญา (ล้านบาท)" required htmlFor="p-value" error={errors.value}>
              <Input id="p-value" type="number" min={0} step={0.1} aria-invalid={!!errors.value} value={form.value} onChange={(e) => set("value", e.target.value)} />
            </FormItem>
            <FormItem label="งบต้นทุนวัสดุและผู้รับเหมา (ล้านบาท)" required htmlFor="p-cost" error={errors.cost}>
              <Input id="p-cost" type="number" min={0} step={0.1} aria-invalid={!!errors.cost} value={form.cost} onChange={(e) => set("cost", e.target.value)} />
            </FormItem>
            <FormItem label="วันเริ่มสัญญา" required htmlFor="p-start">
              <Input id="p-start" type="date" value={form.start} onChange={(e) => set("start", e.target.value)} />
            </FormItem>
            <FormItem label="กำหนดแล้วเสร็จ" required htmlFor="p-end" error={errors.end}>
              <Input id="p-end" type="date" aria-invalid={!!errors.end} value={form.end} onChange={(e) => set("end", e.target.value)} />
            </FormItem>
            <FormItem label="ที่ตั้ง" htmlFor="p-loc">
              <Input id="p-loc" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </FormItem>
            <FormItem label="พื้นที่ใช้สอย (ตร.ม.)" htmlFor="p-area">
              <Input id="p-area" type="number" min={0} value={form.areaSqm} onChange={(e) => set("areaSqm", e.target.value)} />
            </FormItem>
            <div className="rounded-lg border bg-muted/40 p-3 sm:col-span-2">
              <p className="mb-2 text-sm font-medium">งวดเงินที่จะสร้าง</p>
              <ul className="grid gap-1 text-xs sm:grid-cols-2">
                {paymentSchedules[form.type].map(([title, pct, phase]) => (
                  <li key={title} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {title}
                      {phase && <span className="opacity-70"> · {phaseInfo[phase].label}</span>}
                    </span>
                    <span className="tabular-nums">
                      {pct}%{value > 0 && ` · ${formatMillion((value * pct) / 100, 2)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">สร้างโครงการ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectsPage() {
  const rows = useProjectRows()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState<"active" | "all" | ProjectStatus>("active")
  const [type, setType] = React.useState<"all" | ProjectType>("all")
  const [open, setOpen] = React.useState(false)
  const today = todayISO()

  React.useEffect(() => {
    if (params.get("new")) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const active = rows.filter((r) => r.status !== "completed")
  const overdue = rows.reduce((s, r) => s + r.finance.overdue, 0)
  const overdueCount = rows.filter((r) => r.finance.overdue > 0).length
  const pendingCo = rows.reduce((s, r) => s + r.finance.pendingChangeOrders, 0)

  const list = rows
    .filter((r) => (status === "all" ? true : status === "active" ? r.status !== "completed" : r.status === status))
    .filter((r) => type === "all" || r.project.type === type)
    .filter((r) => `${r.project.name} ${r.project.id} ${r.project.manager}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.project.start.localeCompare(a.project.start))

  return (
    <>
      <PageHeader
        title="โครงการ"
        description="ติดตามเฟสงาน งวดเงิน และใบเปลี่ยนแปลงงานของทุกโครงการ"
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon /> สร้างโครงการ
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="โครงการที่กำลังดำเนินการ" value={active.length} icon={BriefcaseIcon} hint={`จากทั้งหมด ${rows.length} โครงการ`} />
        <StatCard
          label="มูลค่างานคงเหลือ (Backlog)"
          value={formatMillion(active.reduce((s, r) => s + r.finance.outstanding, 0))}
          icon={WalletIcon}
          tone="success"
          hint="มูลค่าสัญญาที่ยังไม่ได้เก็บเงิน"
        />
        <StatCard label="งวดเงินเกินกำหนด" value={formatMillion(overdue)} icon={AlertTriangleIcon} tone="danger" hint={`${overdueCount} โครงการ`} />
        <StatCard label="Change Order รออนุมัติ" value={pendingCo} icon={FileClockIcon} tone="warning" hint="รอลูกค้าตัดสินใจ" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-72">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="ค้นหาชื่อ รหัส หรือผู้ดูแล..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">กำลังดำเนินการ</SelectItem>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {projectStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภทงาน</SelectItem>
                {(Object.keys(projectTypeLabel) as ProjectType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {projectTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead>โครงการ</TableHead>
                  <TableHead className="hidden md:table-cell">เฟสปัจจุบัน</TableHead>
                  <TableHead className="hidden w-36 lg:table-cell">ความคืบหน้า</TableHead>
                  <TableHead className="text-right">มูลค่าสัญญา</TableHead>
                  <TableHead className="hidden w-36 sm:table-cell">เก็บเงินแล้ว</TableHead>
                  <TableHead className="hidden xl:table-cell">งวดถัดไป</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(({ project: p, status: st, finance: f }) => {
                  const phase = currentPhase(p)
                  const next = p.installments.find((i) => i.status !== "paid")
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium">{p.name}</p>
                          {f.overdue > 0 && <Tag type="danger">ค้างชำระ</Tag>}
                          {f.pendingChangeOrders > 0 && <Tag type="warning">CO {f.pendingChangeOrders}</Tag>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.id} · {projectTypeLabel[p.type]} · {p.manager}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {phase ? (
                          <>
                            <p className="text-sm">{phaseInfo[phase.key].label}</p>
                            <p className="text-xs text-muted-foreground">ถึง {formatDate(phase.end, "d MMM yy")}</p>
                          </>
                        ) : (
                          <Tag type={projectStatusTag[st]} dot>
                            {projectStatusLabel[st]}
                          </Tag>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={f.progress} className="h-1.5" />
                          <span className="w-9 text-right text-xs tabular-nums">{f.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="tabular-nums">{formatMillion(f.contract)}</p>
                        {f.changeOrderValue !== 0 && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            CO {f.changeOrderValue > 0 ? "+" : ""}
                            {formatMillion(f.changeOrderValue)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={(f.collected / f.contract) * 100} className="h-1.5" />
                          <span className="w-9 text-right text-xs tabular-nums">{formatPercent(f.collected / f.contract, 0)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {next ? (
                          <div className="space-y-0.5">
                            <p className="truncate text-sm">{next.title}</p>
                            <p className={cn("text-xs", next.status === "invoiced" && next.dueDate < today ? "text-destructive" : "text-muted-foreground")}>
                              {formatMillion(next.amount, 2)} · {installmentStatusLabel[next.status]}
                            </p>
                          </div>
                        ) : (
                          <Tag type={installmentTag.paid}>เก็บครบแล้ว</Tag>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState title="ไม่พบโครงการ" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewProjectDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
