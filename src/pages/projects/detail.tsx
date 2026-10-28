import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { differenceInCalendarDays, parseISO } from "date-fns"
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  FilePlusIcon,
  MapPinIcon,
  ReceiptIcon,
  RulerIcon,
  TimerIcon,
  TrendingUpIcon,
  UserIcon,
  WalletIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, FormItem, StatCard } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { changeOrderTag, installmentTag, marginTone, projectStatusTag } from "@/components/projects/shared"
import {
  type ChangeOrder,
  changeOrderStatusLabel,
  financeOf,
  type Installment,
  installmentStatusLabel,
  isTriggered,
  LABOR_RATE,
  type PhaseKey,
  phaseInfo,
  type Project,
  projectStatus,
  projectStatusLabel,
  projectTypeLabel,
} from "@/data/projects"
import { formatDate, formatMillion, formatPercent, initials, todayISO } from "@/lib/format"
import { useEmployeeMap, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const progressSteps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

function PhaseTimeline({ project }: { project: Project }) {
  const { dispatch } = useStore()
  const today = todayISO()
  const start = parseISO(project.start)
  const span = Math.max(1, differenceInCalendarDays(parseISO(project.end), start))
  const pos = (d: string) => Math.min(100, Math.max(0, (differenceInCalendarDays(parseISO(d), start) / span) * 100))
  const todayPos = pos(today)
  const showToday = today >= project.start && today <= project.end

  const setProgress = (key: PhaseKey, progress: number) => {
    const phases = project.phases.map((ph) => (ph.key === key ? { ...ph, progress } : ph))
    const billed = project.installments.filter((i) => i.status === "pending" && isTriggered(phases, i))
    dispatch({ type: "project/phase", projectId: project.id, phase: key, progress })
    toast.success(`อัปเดต ${phaseInfo[key].label} เป็น ${progress}%`, {
      description: billed.length ? `วางบิลอัตโนมัติ: ${billed.map((b) => b.title).join(", ")}` : undefined,
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative ml-0 hidden h-5 text-[11px] text-muted-foreground md:ml-[13.5rem] md:mr-36 md:block">
        <span className="absolute left-0">{formatDate(project.start, "MMM yy")}</span>
        <span className="absolute right-0">{formatDate(project.end, "MMM yy")}</span>
        {showToday && (
          <span className="absolute -translate-x-1/2 font-medium text-destructive" style={{ left: `${todayPos}%` }}>
            วันนี้
          </span>
        )}
      </div>
      {project.phases.map((ph) => {
        const late = ph.progress < 100 && ph.end < today
        return (
          <div key={ph.key} className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <div className="md:w-52 md:shrink-0">
              <p className="text-sm font-medium">{phaseInfo[ph.key].label}</p>
              <p className={cn("text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                {formatDate(ph.start, "d MMM yy")} – {formatDate(ph.end, "d MMM yy")}
                {late && " · เลยกำหนด"}
              </p>
            </div>
            <div className="relative h-7 flex-1 rounded-md bg-muted">
              <div
                className={cn("absolute inset-y-1 overflow-hidden rounded", late ? "bg-destructive/20" : "bg-primary/15")}
                style={{ left: `${pos(ph.start)}%`, width: `${Math.max(1.5, pos(ph.end) - pos(ph.start))}%` }}
              >
                <div className={cn("h-full", ph.progress === 100 ? "bg-success" : late ? "bg-destructive" : "bg-primary")} style={{ width: `${ph.progress}%` }} />
              </div>
              {showToday && <div className="absolute inset-y-0 w-px bg-destructive" style={{ left: `${todayPos}%` }} />}
            </div>
            <div className="flex items-center gap-2 md:w-32 md:shrink-0 md:justify-end">
              <Select value={String(ph.progress)} onValueChange={(v) => setProgress(ph.key, Number(v))}>
                <SelectTrigger size="sm" className="w-24" aria-label={`ความคืบหน้า ${phaseInfo[ph.key].label}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...progressSteps, ph.progress])]
                    .sort((a, b) => a - b)
                    .map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}%
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {ph.progress === 100 && <CheckIcon className="size-4 text-success" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function triggerLabel(i: Installment) {
  if (i.changeOrderId) return "Change Order"
  if (i.phase === null) return "หลังหมดประกัน 1 ปี"
  return i.atProgress === 0 ? `เริ่ม${phaseInfo[i.phase].label}` : `${phaseInfo[i.phase].label} ${i.atProgress}%`
}

function InstallmentsTab({ project }: { project: Project }) {
  const { dispatch } = useStore()
  const today = todayISO()
  const total = project.installments.reduce((s, i) => s + i.amount, 0)
  const paid = project.installments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)

  const setStatus = (i: Installment, status: Installment["status"]) => {
    dispatch({ type: "installment/status", projectId: project.id, installmentId: i.id, status })
    toast.success(status === "paid" ? "บันทึกรับเงินแล้ว" : "วางบิลแล้ว", { description: `${i.title} · ${formatMillion(i.amount, 2)}` })
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>งวดเงิน</TableHead>
            <TableHead className="hidden md:table-cell">เงื่อนไข</TableHead>
            <TableHead className="text-right">จำนวนเงิน</TableHead>
            <TableHead className="hidden sm:table-cell">กำหนดชำระ</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">ดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {project.installments.map((i, idx) => {
            const overdue = i.status === "invoiced" && i.dueDate < today
            const ready = isTriggered(project.phases, i)
            return (
              <TableRow key={i.id} className={overdue ? "bg-destructive/5" : undefined}>
                <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                <TableCell>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground md:hidden">{triggerLabel(i)}</p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{triggerLabel(i)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", i.amount < 0 && "text-destructive")}>
                  {formatMillion(i.amount, 2)}
                  <p className="text-xs text-muted-foreground">{formatPercent(i.amount / project.value, 0)}</p>
                </TableCell>
                <TableCell className={cn("hidden sm:table-cell", overdue && "font-medium text-destructive")}>
                  {formatDate(i.dueDate, "d MMM yy")}
                  {overdue && <p className="text-xs">เกิน {differenceInCalendarDays(parseISO(today), parseISO(i.dueDate))} วัน</p>}
                  {i.paidDate && <p className="text-xs text-muted-foreground">รับเงิน {formatDate(i.paidDate, "d MMM yy")}</p>}
                </TableCell>
                <TableCell>
                  <Tag type={overdue ? "danger" : installmentTag[i.status]} dot>
                    {overdue ? "เกินกำหนด" : installmentStatusLabel[i.status]}
                  </Tag>
                </TableCell>
                <TableCell className="text-right">
                  {i.status === "pending" && (
                    <Button size="xs" variant={ready ? "default" : "ghost"} onClick={() => setStatus(i, "invoiced")}>
                      <ReceiptIcon /> วางบิล
                    </Button>
                  )}
                  {i.status === "invoiced" && (
                    <div className="flex justify-end gap-1">
                      <Button size="xs" className="bg-success hover:bg-success/90" onClick={() => setStatus(i, "paid")}>
                        <WalletIcon /> รับเงิน
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setStatus(i, "pending")} aria-label="ยกเลิกบิล">
                        <XIcon />
                      </Button>
                    </div>
                  )}
                  {i.status === "paid" && <CheckIcon className="ml-auto size-4 text-success" />}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell />
            <TableCell className="font-medium">รวม</TableCell>
            <TableCell className="hidden md:table-cell" />
            <TableCell className="text-right font-semibold tabular-nums">{formatMillion(total, 2)}</TableCell>
            <TableCell colSpan={3} className="text-right text-xs">
              รับแล้ว <span className="font-semibold text-success">{formatMillion(paid, 2)}</span> · คงเหลือ{" "}
              <span className="font-semibold">{formatMillion(total - paid, 2)}</span>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

const emptyChangeOrder = { title: "", description: "", requestedBy: "ลูกค้า" as ChangeOrder["requestedBy"], amount: "", cost: "", days: "0" }

function NewChangeOrderDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const [form, setForm] = React.useState(emptyChangeOrder)
  const [errors, setErrors] = React.useState<{ title?: string; amount?: string }>({})

  React.useEffect(() => {
    if (open) {
      setForm(emptyChangeOrder)
      setErrors({})
    }
  }, [open])

  const amount = Number(form.amount) * 1_000_000
  const cost = Number(form.cost) * 1_000_000

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.title.trim()) next.title = "กรุณาระบุหัวข้อ"
    if (form.amount === "" || Number.isNaN(Number(form.amount))) next.amount = "กรุณาระบุมูลค่า (ใส่ 0 ได้ถ้าไม่เก็บเงินเพิ่ม)"
    setErrors(next)
    if (Object.keys(next).length) return
    const co: ChangeOrder = {
      id: `${project.id}-CO${project.changeOrders.length + 1}`,
      title: form.title.trim(),
      description: form.description.trim(),
      amount,
      costImpact: cost,
      daysImpact: Number(form.days) || 0,
      status: "pending",
      requestedBy: form.requestedBy,
      date: todayISO(),
    }
    dispatch({ type: "changeOrder/add", projectId: project.id, changeOrder: co })
    toast.success("สร้าง Change Order แล้ว", { description: `${co.id} · รอลูกค้าอนุมัติ` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>สร้างใบเปลี่ยนแปลงงาน (Change Order)</DialogTitle>
            <DialogDescription>{project.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormItem label="หัวข้อ" required htmlFor="co-title" error={errors.title} className="sm:col-span-2">
              <Input id="co-title" aria-invalid={!!errors.title} value={form.title} placeholder="เช่น เพิ่มห้องซาวน่า" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormItem>
            <FormItem label="รายละเอียด" htmlFor="co-desc" className="sm:col-span-2">
              <Textarea id="co-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormItem>
            <FormItem label="ผู้ขอเปลี่ยนแปลง">
              <Select value={form.requestedBy} onValueChange={(v) => setForm({ ...form, requestedBy: v as ChangeOrder["requestedBy"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ลูกค้า">ลูกค้า</SelectItem>
                  <SelectItem value="บริษัท">บริษัท (เช่น ปัญหาหน้างาน)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="ผลกระทบระยะเวลา (วัน)" htmlFor="co-days">
              <Input id="co-days" type="number" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
            </FormItem>
            <FormItem label="มูลค่าเรียกเก็บลูกค้า (ล้านบาท)" required htmlFor="co-amount" error={errors.amount}>
              <Input id="co-amount" type="number" step={0.1} aria-invalid={!!errors.amount} value={form.amount} placeholder="ติดลบได้ถ้าลดงาน" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </FormItem>
            <FormItem label="ต้นทุนที่เพิ่ม (ล้านบาท)" htmlFor="co-cost">
              <Input id="co-cost" type="number" step={0.1} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </FormItem>
            {(amount !== 0 || cost !== 0) && (
              <p className={cn("rounded-md border px-3 py-2 text-sm sm:col-span-2", amount - cost >= 0 ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}>
                กำไรจากรายการนี้ {formatMillion(amount - cost, 2)}
                {amount > 0 && ` (${formatPercent((amount - cost) / amount)})`}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">ส่งให้ลูกค้าอนุมัติ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangeOrdersTab({ project, onNew }: { project: Project; onNew: () => void }) {
  const { dispatch } = useStore()
  const approved = project.changeOrders.filter((c) => c.status === "approved")
  const pending = project.changeOrders.filter((c) => c.status === "pending")

  const decide = (co: ChangeOrder, status: "approved" | "rejected") => {
    dispatch({ type: "changeOrder/decide", projectId: project.id, changeOrderId: co.id, status })
    toast.success(status === "approved" ? "ลูกค้าอนุมัติ Change Order แล้ว" : "บันทึกว่าไม่อนุมัติแล้ว", {
      description: status === "approved" && co.amount !== 0 ? `เพิ่มงวดเงิน ${formatMillion(co.amount, 2)} และวางบิลแล้ว` : co.title,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          อนุมัติแล้ว {approved.length} รายการ ({formatMillion(approved.reduce((s, c) => s + c.amount, 0), 2)}) · รออนุมัติ {pending.length} รายการ (
          {formatMillion(pending.reduce((s, c) => s + c.amount, 0), 2)})
        </p>
        <Button size="sm" onClick={onNew}>
          <FilePlusIcon /> สร้าง Change Order
        </Button>
      </div>
      {project.changeOrders.length === 0 && (
        <Card>
          <EmptyState title="ยังไม่มีใบเปลี่ยนแปลงงาน" description="บันทึกทุกการเปลี่ยนแปลงเพื่อคุมงบประมาณและระยะเวลา" />
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {[...project.changeOrders].reverse().map((co) => (
          <Card key={co.id} size="sm">
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {co.id} · ขอโดย{co.requestedBy} · {formatDate(co.date, "d MMM yy")}
                  </p>
                  <p className="font-medium">{co.title}</p>
                </div>
                <Tag type={changeOrderTag[co.status]} dot>
                  {changeOrderStatusLabel[co.status]}
                </Tag>
              </div>
              {co.description && <p className="text-sm text-muted-foreground">{co.description}</p>}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">เรียกเก็บ</p>
                  <p className={cn("font-semibold tabular-nums", co.amount < 0 && "text-destructive")}>{formatMillion(co.amount, 2)}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">ต้นทุน</p>
                  <p className="font-semibold tabular-nums">{formatMillion(co.costImpact, 2)}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">ระยะเวลา</p>
                  <p className="font-semibold tabular-nums">
                    {co.daysImpact > 0 ? "+" : ""}
                    {co.daysImpact} วัน
                  </p>
                </div>
              </div>
              {co.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => decide(co, "approved")}>
                    <CheckIcon /> ลูกค้าอนุมัติ
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide(co, "rejected")}>
                    <XIcon /> ไม่อนุมัติ
                  </Button>
                </div>
              ) : (
                co.decidedDate && <p className="text-xs text-muted-foreground">ตัดสินใจเมื่อ {formatDate(co.decidedDate, "d MMM yyyy")}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function HoursTab({ project }: { project: Project }) {
  const { state } = useStore()
  const employeeMap = useEmployeeMap()
  const entries = state.timesheet.filter((t) => t.projectId === project.id)
  const logged = entries.reduce((s, t) => s + t.hours, 0)

  const byPerson = [...entries.reduce((m, t) => m.set(t.employeeId, (m.get(t.employeeId) ?? 0) + t.hours), new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const byPhase = project.phases
    .map((ph) => ({ key: ph.key, hours: entries.filter((t) => t.phase === ph.key).reduce((s, t) => s + t.hours, 0) }))
    .filter((x) => x.hours > 0)
  const maxPhase = Math.max(1, ...byPhase.map((x) => x.hours))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "ชั่วโมงจาก Timesheet", value: `${logged.toLocaleString()} ชม.` },
          { label: "ชั่วโมงก่อนเริ่มใช้ระบบ", value: `${project.priorHours.toLocaleString()} ชม.` },
          { label: `ต้นทุนแรงงานออกแบบ (฿${LABOR_RATE}/ชม.)`, value: formatMillion((logged + project.priorHours) * LABOR_RATE, 2) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>แยกตามคน</CardTitle>
          </CardHeader>
          <CardContent>
            {byPerson.length === 0 && <EmptyState title="ยังไม่มีการลงชั่วโมง" />}
            <ul className="divide-y">
              {byPerson.map(([id, hours]) => {
                const e = employeeMap.get(id)
                return (
                  <li key={id} className="flex items-center gap-3 py-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-xs">{e ? initials(e.firstName, e.lastName) : "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e ? `${e.firstName} ${e.lastName}` : "ไม่พบข้อมูล"}</p>
                      <p className="truncate text-xs text-muted-foreground">{e?.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{hours} ชม.</p>
                      <p className="text-xs text-muted-foreground tabular-nums">฿{(hours * LABOR_RATE).toLocaleString()}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>แยกตามเฟส</CardTitle>
            <CardDescription>จาก Timesheet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byPhase.length === 0 && <EmptyState title="ยังไม่มีการลงชั่วโมง" />}
            {byPhase.map((x) => (
              <div key={x.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{phaseInfo[x.key].label}</span>
                  <span className="font-medium tabular-nums">{x.hours} ชม.</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(x.hours / maxPhase) * 100}%` }} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/timesheet">
                <TimerIcon /> ไปที่บันทึกชั่วโมงงาน
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { state } = useStore()
  const project = state.projects.find((p) => p.id === id)
  const logged = state.timesheet.filter((t) => t.projectId === id).reduce((s, t) => s + t.hours, 0)
  const [coOpen, setCoOpen] = React.useState(false)
  const [tab, setTab] = React.useState("overview")

  if (!project) {
    return (
      <Card>
        <EmptyState title="ไม่พบโครงการ" description={`ไม่มีโครงการรหัส ${id}`} />
        <div className="flex justify-center pb-6">
          <Button variant="outline" asChild>
            <Link to="/projects">
              <ArrowLeftIcon /> กลับไปหน้าโครงการ
            </Link>
          </Button>
        </div>
      </Card>
    )
  }

  const f = financeOf(project, logged)
  const status = projectStatus(project)

  return (
    <>
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link to="/projects">
            <ArrowLeftIcon /> โครงการทั้งหมด
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Tag type={projectStatusTag[status]} dot>
                {projectStatusLabel[status]}
              </Tag>
              <Tag type="info">{projectTypeLabel[project.type]}</Tag>
              {f.overdue > 0 && <Tag type="danger">ค้างชำระ {formatMillion(f.overdue, 2)}</Tag>}
            </div>
            <h1 className="font-brand text-xl font-medium tracking-wide uppercase sm:text-2xl">{project.name}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{project.id}</span>
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {project.location}
              </span>
              {project.areaSqm > 0 && (
                <span className="inline-flex items-center gap-1">
                  <RulerIcon className="size-3.5" /> {project.areaSqm.toLocaleString()} ตร.ม.
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <UserIcon className="size-3.5" /> {project.manager}
              </span>
              <span>
                {formatDate(project.start, "d MMM yy")} – {formatDate(project.end, "d MMM yy")}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-background" asChild>
              <Link to="/timesheet">
                <TimerIcon /> ลงชั่วโมง
              </Link>
            </Button>
            <Button
              onClick={() => {
                setTab("change-orders")
                setCoOpen(true)
              }}
            >
              <FilePlusIcon /> Change Order
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="มูลค่าสัญญา (รวม CO)"
          value={formatMillion(f.contract)}
          icon={ReceiptIcon}
          hint={f.changeOrderValue !== 0 ? `เดิม ${formatMillion(project.value)} · CO ${formatMillion(f.changeOrderValue)}` : "ยังไม่มี Change Order"}
        />
        <StatCard label="กำไรคาดการณ์" value={formatMillion(f.profit)} icon={TrendingUpIcon} tone="success" hint={`อัตรากำไร ${formatPercent(f.margin)}`} />
        <StatCard label="เก็บเงินแล้ว" value={formatMillion(f.collected)} icon={WalletIcon} tone="warning" hint={`ค้างรับ ${formatMillion(f.outstanding)}`} />
        <StatCard label="ความคืบหน้า" value={`${f.progress}%`} icon={ClockIcon} tone="danger" hint={`ชั่วโมงงาน ${f.hours.toLocaleString()} ชม.`} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="overview">เฟสงานและการเงิน</TabsTrigger>
          <TabsTrigger value="installments">งวดเงิน</TabsTrigger>
          <TabsTrigger value="change-orders" className="gap-1.5">
            Change Order
            {f.pendingChangeOrders > 0 && <span className="rounded-full bg-warning px-1.5 text-[11px] text-white">{f.pendingChangeOrders}</span>}
          </TabsTrigger>
          <TabsTrigger value="hours">ชั่วโมงงาน</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>แผนงานตามเฟส</CardTitle>
                <CardDescription>ปรับความคืบหน้าแต่ละเฟส — เมื่อถึงเงื่อนไขงวดเงิน ระบบจะวางบิลให้อัตโนมัติ</CardDescription>
              </CardHeader>
              <CardContent>
                <PhaseTimeline project={project} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>สรุปการเงิน</CardTitle>
                <CardDescription>คาดการณ์เมื่อจบโครงการ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "มูลค่าสัญญาเดิม", value: project.value },
                  { label: "Change Order ที่อนุมัติ", value: f.changeOrderValue },
                  { label: "มูลค่าสัญญารวม", value: f.contract, bold: true },
                ].map((r) => (
                  <div key={r.label} className={cn("flex justify-between", r.bold && "font-semibold")}>
                    <span className={r.bold ? undefined : "text-muted-foreground"}>{r.label}</span>
                    <span className="tabular-nums">{formatMillion(r.value, 2)}</span>
                  </div>
                ))}
                <Separator className="my-3" />
                {[
                  { label: "ต้นทุนวัสดุและผู้รับเหมา", value: f.directCost },
                  { label: `ต้นทุนแรงงานออกแบบ (${f.hours.toLocaleString()} ชม.)`, value: f.laborCost },
                  { label: "ต้นทุนรวม", value: f.totalCost, bold: true },
                ].map((r) => (
                  <div key={r.label} className={cn("flex justify-between gap-2", r.bold && "font-semibold")}>
                    <span className={r.bold ? undefined : "text-muted-foreground"}>{r.label}</span>
                    <span className="tabular-nums">−{formatMillion(r.value, 2)}</span>
                  </div>
                ))}
                <Separator className="my-3" />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">กำไรขั้นต้น</span>
                  <span className="text-lg font-semibold text-success tabular-nums">{formatMillion(f.profit, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">อัตรากำไร</span>
                  <span className={cn("font-medium tabular-nums", marginTone(f.margin))}>{formatPercent(f.margin)}</span>
                </div>
                <Separator className="my-3" />
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">เก็บเงินแล้ว</span>
                    <span className="tabular-nums">{formatPercent(f.collected / f.contract, 0)}</span>
                  </div>
                  <Progress value={(f.collected / f.contract) * 100} />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ความคืบหน้างาน</span>
                    <span className="tabular-nums">{f.progress}%</span>
                  </div>
                  <Progress value={f.progress} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="installments">
          <InstallmentsTab project={project} />
        </TabsContent>

        <TabsContent value="change-orders">
          <ChangeOrdersTab project={project} onNew={() => setCoOpen(true)} />
        </TabsContent>

        <TabsContent value="hours">
          <HoursTab project={project} />
        </TabsContent>
      </Tabs>

      <NewChangeOrderDialog project={project} open={coOpen} onOpenChange={setCoOpen} />
    </>
  )
}
