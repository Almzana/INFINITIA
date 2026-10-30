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
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MembersTab } from "@/components/projects/members-tab"
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
import { t } from "@/i18n"
import { formatDate, formatMillion, formatPercent, todayISO } from "@/lib/format"
import { useProjectActions } from "@/hooks/use-project-actions"
import { useEmployeeMap, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const progressSteps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

/** requestedBy is stored in Thai; show it in the current language */
const requesterLabel = (by: ChangeOrder["requestedBy"]) => (by === "ลูกค้า" ? t("projects.co.byClient") : t("projects.co.byCompany"))

function PhaseTimeline({ project }: { project: Project }) {
  const actions = useProjectActions()
  const today = todayISO()
  const start = parseISO(project.start)
  const span = Math.max(1, differenceInCalendarDays(parseISO(project.end), start))
  const pos = (d: string) => Math.min(100, Math.max(0, (differenceInCalendarDays(parseISO(d), start) / span) * 100))
  const todayPos = pos(today)
  const showToday = today >= project.start && today <= project.end

  // The server applies the billing rules and reports what got invoiced
  const setProgress = (key: PhaseKey, progress: number) => void actions.setPhase(project, key, progress)

  return (
    <div className="space-y-3">
      <div className="relative ml-0 hidden h-5 text-[11px] text-muted-foreground md:ml-[13.5rem] md:mr-36 md:block">
        <span className="absolute left-0">{formatDate(project.start, "MMM yy")}</span>
        <span className="absolute right-0">{formatDate(project.end, "MMM yy")}</span>
        {showToday && (
          <span className="absolute -translate-x-1/2 font-medium text-destructive" style={{ left: `${todayPos}%` }}>
            {t("common.today")}
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
                {late && t("projects.plan.late")}
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
              <Select value={String(ph.progress)} onValueChange={(v) => setProgress(ph.key, Number(v))} disabled={!actions.canEditProject(project)}>
                <SelectTrigger size="sm" className="w-24" aria-label={t("projects.plan.progressAria", { phase: phaseInfo[ph.key].label })}>
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
  if (i.phase === null) return t("projects.inst.trigger.retention")
  return i.atProgress === 0
    ? t("projects.inst.trigger.start", { phase: phaseInfo[i.phase].label })
    : t("projects.inst.trigger.progress", { phase: phaseInfo[i.phase].label, n: i.atProgress })
}

function InstallmentsTab({ project }: { project: Project }) {
  const actions = useProjectActions()
  const today = todayISO()
  const total = project.installments.reduce((s, i) => s + i.amount, 0)
  const paid = project.installments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)

  const setStatus = async (i: Installment, status: Installment["status"]) => {
    if (!(await actions.setInstallment(project, i.id, status))) return
    toast.success(status === "paid" ? t("projects.inst.paymentRecorded") : t("projects.inst.invoiced"), { description: `${i.title} · ${formatMillion(i.amount, 2)}` })
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>{t("projects.inst.col.installment")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("projects.inst.col.condition")}</TableHead>
            <TableHead className="text-right">{t("projects.inst.col.amount")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("projects.inst.col.due")}</TableHead>
            <TableHead>{t("projects.inst.col.status")}</TableHead>
            <TableHead className="text-right">{t("projects.inst.col.action")}</TableHead>
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
                  {overdue && <p className="text-xs">{t("projects.inst.overdueDays", { n: differenceInCalendarDays(parseISO(today), parseISO(i.dueDate)) })}</p>}
                  {i.paidDate && <p className="text-xs text-muted-foreground">{t("projects.inst.paidOn", { date: formatDate(i.paidDate, "d MMM yy") })}</p>}
                </TableCell>
                <TableCell>
                  <Tag type={overdue ? "danger" : installmentTag[i.status]} dot>
                    {overdue ? t("projects.inst.overdue") : installmentStatusLabel[i.status]}
                  </Tag>
                </TableCell>
                <TableCell className="text-right">
                  {actions.canFinance && i.status === "pending" && (
                    <Button size="xs" variant={ready ? "default" : "ghost"} onClick={() => setStatus(i, "invoiced")}>
                      <ReceiptIcon /> {t("projects.inst.invoice")}
                    </Button>
                  )}
                  {actions.canFinance && i.status === "invoiced" && (
                    <div className="flex justify-end gap-1">
                      <Button size="xs" className="bg-success hover:bg-success/90" onClick={() => setStatus(i, "paid")}>
                        <WalletIcon /> {t("projects.inst.receive")}
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setStatus(i, "pending")} aria-label={t("projects.inst.cancelInvoice")}>
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
            <TableCell className="font-medium">{t("projects.inst.total")}</TableCell>
            <TableCell className="hidden md:table-cell" />
            <TableCell className="text-right font-semibold tabular-nums">{formatMillion(total, 2)}</TableCell>
            <TableCell colSpan={3} className="text-right text-xs">
              {t("projects.inst.received")} <span className="font-semibold text-success">{formatMillion(paid, 2)}</span> · {t("projects.inst.remaining")}{" "}
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
  const actions = useProjectActions()
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.title.trim()) next.title = t("projects.co.errTitle")
    if (form.amount === "" || Number.isNaN(Number(form.amount))) next.amount = t("projects.co.errAmount")
    setErrors(next)
    if (Object.keys(next).length) return
    const saved = await actions.addChangeOrder(project, {
      title: form.title.trim(),
      description: form.description.trim(),
      amount: Math.round(amount),
      costImpact: Math.round(cost),
      daysImpact: Number(form.days) || 0,
      requestedBy: form.requestedBy,
    })
    if (!saved) return
    toast.success(t("projects.co.created"), { description: t("projects.co.createdDesc", { id: saved.changeOrders.at(-1)?.id ?? "" }) })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("projects.co.newTitle")}</DialogTitle>
            <DialogDescription>{project.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormItem label={t("projects.co.titleLabel")} required htmlFor="co-title" error={errors.title} className="sm:col-span-2">
              <Input id="co-title" aria-invalid={!!errors.title} value={form.title} placeholder={t("projects.co.titlePlaceholder")} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormItem>
            <FormItem label={t("projects.co.details")} htmlFor="co-desc" className="sm:col-span-2">
              <Textarea id="co-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormItem>
            <FormItem label={t("projects.co.requestedBy")}>
              <Select value={form.requestedBy} onValueChange={(v) => setForm({ ...form, requestedBy: v as ChangeOrder["requestedBy"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ลูกค้า">{t("projects.co.byClient")}</SelectItem>
                  <SelectItem value="บริษัท">{t("projects.co.byCompanyHint")}</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label={t("projects.co.daysImpactLabel")} htmlFor="co-days">
              <Input id="co-days" type="number" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
            </FormItem>
            <FormItem label={t("projects.co.amountLabel")} required htmlFor="co-amount" error={errors.amount}>
              <Input id="co-amount" type="number" step={0.1} aria-invalid={!!errors.amount} value={form.amount} placeholder={t("projects.co.amountPlaceholder")} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </FormItem>
            <FormItem label={t("projects.co.costLabel")} htmlFor="co-cost">
              <Input id="co-cost" type="number" step={0.1} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </FormItem>
            {(amount !== 0 || cost !== 0) && (
              <p className={cn("rounded-md border px-3 py-2 text-sm sm:col-span-2", amount - cost >= 0 ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}>
                {t("projects.co.profit", { amount: formatMillion(amount - cost, 2) })}
                {amount > 0 && ` (${formatPercent((amount - cost) / amount)})`}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("projects.co.submit")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChangeOrdersTab({ project, onNew }: { project: Project; onNew: () => void }) {
  const actions = useProjectActions()
  const approved = project.changeOrders.filter((c) => c.status === "approved")
  const pending = project.changeOrders.filter((c) => c.status === "pending")

  const decide = async (co: ChangeOrder, status: "approved" | "rejected") => {
    if (!(await actions.decideChangeOrder(project, co.id, status))) return
    toast.success(status === "approved" ? t("projects.co.approvedToast") : t("projects.co.rejectedToast"), {
      description: status === "approved" && co.amount !== 0 ? t("projects.co.approvedDesc", { amount: formatMillion(co.amount, 2) }) : co.title,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("projects.co.summary", {
            approved: approved.length,
            approvedAmount: formatMillion(approved.reduce((s, c) => s + c.amount, 0), 2),
            pending: pending.length,
            pendingAmount: formatMillion(pending.reduce((s, c) => s + c.amount, 0), 2),
          })}
        </p>
        {actions.canEditProject(project) && (
          <Button size="sm" onClick={onNew}>
            <FilePlusIcon /> {t("projects.co.new")}
          </Button>
        )}
      </div>
      {project.changeOrders.length === 0 && (
        <Card>
          <EmptyState title={t("projects.co.empty")} description={t("projects.co.emptyDesc")} />
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {[...project.changeOrders].reverse().map((co) => (
          <Card key={co.id} size="sm">
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("projects.co.meta", { id: co.id, by: requesterLabel(co.requestedBy), date: formatDate(co.date, "d MMM yy") })}
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
                  <p className="text-muted-foreground">{t("projects.co.billed")}</p>
                  <p className={cn("font-semibold tabular-nums", co.amount < 0 && "text-destructive")}>{formatMillion(co.amount, 2)}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">{t("projects.co.cost")}</p>
                  <p className="font-semibold tabular-nums">{formatMillion(co.costImpact, 2)}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-muted-foreground">{t("projects.co.duration")}</p>
                  <p className="font-semibold tabular-nums">
                    {co.daysImpact > 0 ? "+" : ""}
                    {t("common.days", { n: co.daysImpact })}
                  </p>
                </div>
              </div>
              {co.status === "pending" && !actions.canFinance ? (
                <p className="text-xs text-muted-foreground">{t("projects.co.waitingExec")}</p>
              ) : co.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => decide(co, "approved")}>
                    <CheckIcon /> {t("projects.co.clientApproved")}
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide(co, "rejected")}>
                    <XIcon /> {t("projects.co.reject")}
                  </Button>
                </div>
              ) : (
                co.decidedDate && <p className="text-xs text-muted-foreground">{t("projects.co.decidedOn", { date: formatDate(co.decidedDate, "d MMM yyyy") })}</p>
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
  const entries = state.timesheet.filter((x) => x.projectId === project.id)
  const logged = entries.reduce((s, x) => s + x.hours, 0)

  const byPerson = [...entries.reduce((m, x) => m.set(x.employeeId, (m.get(x.employeeId) ?? 0) + x.hours), new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const byPhase = project.phases
    .map((ph) => ({ key: ph.key, hours: entries.filter((x) => x.phase === ph.key).reduce((s, x) => s + x.hours, 0) }))
    .filter((x) => x.hours > 0)
  const maxPhase = Math.max(1, ...byPhase.map((x) => x.hours))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("projects.hours.timesheet"), value: t("projects.hours.value", { n: logged.toLocaleString() }) },
          { label: t("projects.hours.prior"), value: t("projects.hours.value", { n: project.priorHours.toLocaleString() }) },
          { label: t("projects.hours.laborCost", { rate: LABOR_RATE }), value: formatMillion((logged + project.priorHours) * LABOR_RATE, 2) },
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
            <CardTitle>{t("projects.hours.byPerson")}</CardTitle>
          </CardHeader>
          <CardContent>
            {byPerson.length === 0 && <EmptyState title={t("projects.hours.empty")} />}
            <ul className="divide-y">
              {byPerson.map(([id, hours]) => {
                const e = employeeMap.get(id)
                return (
                  <li key={id} className="flex items-center gap-3 py-2">
                    <EmployeeAvatar person={e} className="size-8" fallbackClassName="text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e ? `${e.firstName} ${e.lastName}` : t("common.noData")}</p>
                      <p className="truncate text-xs text-muted-foreground">{e?.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{t("projects.hours.value", { n: hours })}</p>
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
            <CardTitle>{t("projects.hours.byPhase")}</CardTitle>
            <CardDescription>{t("projects.hours.fromTimesheet")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byPhase.length === 0 && <EmptyState title={t("projects.hours.empty")} />}
            {byPhase.map((x) => (
              <div key={x.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{phaseInfo[x.key].label}</span>
                  <span className="font-medium tabular-nums">{t("projects.hours.value", { n: x.hours })}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(x.hours / maxPhase) * 100}%` }} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/timesheet">
                <TimerIcon /> {t("projects.hours.goToTimesheet")}
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
  const { canEditProject } = useProjectActions()
  const project = state.projects.find((p) => p.id === id)
  // Server total covers everyone; loaded entries may be only my own
  const logged = project?.loggedHours ?? state.timesheet.filter((x) => x.projectId === id).reduce((s, x) => s + x.hours, 0)
  const [coOpen, setCoOpen] = React.useState(false)
  const [tab, setTab] = React.useState("overview")

  if (!project) {
    return (
      <Card>
        <EmptyState title={t("projects.notFound")} description={t("projects.notFoundDesc", { id: id ?? "" })} />
        <div className="flex justify-center pb-6">
          <Button variant="outline" asChild>
            <Link to="/projects">
              <ArrowLeftIcon /> {t("projects.backToList")}
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
            <ArrowLeftIcon /> {t("projects.allProjects")}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Tag type={projectStatusTag[status]} dot>
                {projectStatusLabel[status]}
              </Tag>
              <Tag type="info">{projectTypeLabel[project.type]}</Tag>
              {f.overdue > 0 && <Tag type="danger">{t("projects.overdueAmount", { amount: formatMillion(f.overdue, 2) })}</Tag>}
            </div>
            <h1 className="font-brand text-xl font-medium tracking-wide uppercase sm:text-2xl">{project.name}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{project.id}</span>
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {project.location}
              </span>
              {project.areaSqm > 0 && (
                <span className="inline-flex items-center gap-1">
                  <RulerIcon className="size-3.5" /> {t("projects.area", { n: project.areaSqm.toLocaleString() })}
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
                <TimerIcon /> {t("projects.logHours")}
              </Link>
            </Button>
            {canEditProject(project) && (
              <Button
                onClick={() => {
                  setTab("change-orders")
                  setCoOpen(true)
                }}
              >
                <FilePlusIcon /> Change Order
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("projects.stat.contractInclCo")}
          value={formatMillion(f.contract)}
          icon={ReceiptIcon}
          hint={
            f.changeOrderValue !== 0
              ? t("projects.stat.contractHint", { original: formatMillion(project.value), co: formatMillion(f.changeOrderValue) })
              : t("projects.stat.noCo")
          }
        />
        <StatCard label={t("projects.stat.profit")} value={formatMillion(f.profit)} icon={TrendingUpIcon} tone="success" hint={t("projects.stat.marginHint", { pct: formatPercent(f.margin) })} />
        <StatCard label={t("projects.stat.collected")} value={formatMillion(f.collected)} icon={WalletIcon} tone="warning" hint={t("projects.stat.receivableHint", { amount: formatMillion(f.outstanding) })} />
        <StatCard label={t("projects.stat.progress")} value={`${f.progress}%`} icon={ClockIcon} tone="danger" hint={t("projects.stat.hoursHint", { n: f.hours.toLocaleString() })} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="overview">{t("projects.tab.overview")}</TabsTrigger>
          <TabsTrigger value="installments">{t("projects.tab.installments")}</TabsTrigger>
          <TabsTrigger value="change-orders" className="gap-1.5">
            Change Order
            {f.pendingChangeOrders > 0 && <span className="rounded-full bg-warning px-1.5 text-[11px] text-white">{f.pendingChangeOrders}</span>}
          </TabsTrigger>
          <TabsTrigger value="hours">{t("projects.tab.hours")}</TabsTrigger>
          <TabsTrigger value="members">{t("projects.tab.members")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("projects.plan.title")}</CardTitle>
                <CardDescription>{t("projects.plan.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PhaseTimeline project={project} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.fin.title")}</CardTitle>
                <CardDescription>{t("projects.fin.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: t("projects.fin.originalContract"), value: project.value },
                  { label: t("projects.fin.approvedCo"), value: f.changeOrderValue },
                  { label: t("projects.fin.totalContract"), value: f.contract, bold: true },
                ].map((r) => (
                  <div key={r.label} className={cn("flex justify-between", r.bold && "font-semibold")}>
                    <span className={r.bold ? undefined : "text-muted-foreground"}>{r.label}</span>
                    <span className="tabular-nums">{formatMillion(r.value, 2)}</span>
                  </div>
                ))}
                <Separator className="my-3" />
                {[
                  { label: t("projects.fin.directCost"), value: f.directCost },
                  { label: t("projects.fin.laborCost", { n: f.hours.toLocaleString() }), value: f.laborCost },
                  { label: t("projects.fin.totalCost"), value: f.totalCost, bold: true },
                ].map((r) => (
                  <div key={r.label} className={cn("flex justify-between gap-2", r.bold && "font-semibold")}>
                    <span className={r.bold ? undefined : "text-muted-foreground"}>{r.label}</span>
                    <span className="tabular-nums">−{formatMillion(r.value, 2)}</span>
                  </div>
                ))}
                <Separator className="my-3" />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{t("projects.fin.grossProfit")}</span>
                  <span className="text-lg font-semibold text-success tabular-nums">{formatMillion(f.profit, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("projects.fin.margin")}</span>
                  <span className={cn("font-medium tabular-nums", marginTone(f.margin))}>{formatPercent(f.margin)}</span>
                </div>
                <Separator className="my-3" />
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("projects.fin.collected")}</span>
                    <span className="tabular-nums">{formatPercent(f.collected / f.contract, 0)}</span>
                  </div>
                  <Progress value={(f.collected / f.contract) * 100} />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("projects.fin.workProgress")}</span>
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

        <TabsContent value="members">
          <MembersTab project={project} />
        </TabsContent>
      </Tabs>

      <NewChangeOrderDialog project={project} open={coOpen} onOpenChange={setCoOpen} />
    </>
  )
}
