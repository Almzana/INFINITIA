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
  currentPhase,
  installmentStatusLabel,
  paymentSchedules,
  phaseInfo,
  type ProjectStatus,
  type ProjectType,
  projectStatusLabel,
  projectTypeLabel,
} from "@/data/projects"
import { t } from "@/i18n"
import { formatDate, formatMillion, formatPercent, todayISO } from "@/lib/format"
import { useProjectActions } from "@/hooks/use-project-actions"
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
  const actions = useProjectActions()
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = t("projects.new.errName")
    if (!(Number(form.value) > 0)) next.value = t("projects.new.errValue")
    if (!(Number(form.cost) > 0)) next.cost = t("projects.new.errCost")
    else if (Number(form.cost) >= Number(form.value)) next.cost = t("projects.new.errCostTooHigh")
    if (!form.end) next.end = t("projects.new.errEnd")
    else if (form.end <= form.start) next.end = t("projects.new.errEndBeforeStart")
    if (!form.manager.trim()) next.manager = t("projects.new.errManager")
    setErrors(next)
    if (Object.keys(next).length) return

    // The server assigns the id and builds the phase plan + payment schedule
    const project = await actions.create({
      name: form.name.trim(),
      type: form.type,
      location: form.location.trim() || "-",
      areaSqm: Number(form.areaSqm) || 0,
      value: Math.round(value),
      cost: Math.round(Number(form.cost) * 1_000_000),
      start: form.start,
      end: form.end,
      manager: form.manager.trim(),
    })
    if (!project) return
    toast.success(t("projects.new.created"), {
      description: t("projects.new.createdDesc", { id: project.id, phases: project.phases.length, installments: project.installments.length }),
    })
    onOpenChange(false)
    navigate(`/projects/${project.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("projects.new.title")}</DialogTitle>
            <DialogDescription>{t("projects.new.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormItem label={t("projects.new.name")} required htmlFor="p-name" error={errors.name} className="sm:col-span-2">
              <Input id="p-name" aria-invalid={!!errors.name} value={form.name} placeholder={t("projects.new.namePlaceholder")} onChange={(e) => set("name", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.type")} required>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(projectTypeLabel) as ProjectType[]).map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {projectTypeLabel[pt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label={t("projects.new.manager")} required htmlFor="p-manager" error={errors.manager}>
              <Input id="p-manager" aria-invalid={!!errors.manager} value={form.manager} placeholder={t("projects.new.managerPlaceholder")} onChange={(e) => set("manager", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.value")} required htmlFor="p-value" error={errors.value}>
              <Input id="p-value" type="number" min={0} step={0.1} aria-invalid={!!errors.value} value={form.value} onChange={(e) => set("value", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.cost")} required htmlFor="p-cost" error={errors.cost}>
              <Input id="p-cost" type="number" min={0} step={0.1} aria-invalid={!!errors.cost} value={form.cost} onChange={(e) => set("cost", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.start")} required htmlFor="p-start">
              <Input id="p-start" type="date" value={form.start} onChange={(e) => set("start", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.end")} required htmlFor="p-end" error={errors.end}>
              <Input id="p-end" type="date" aria-invalid={!!errors.end} value={form.end} onChange={(e) => set("end", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.location")} htmlFor="p-loc">
              <Input id="p-loc" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </FormItem>
            <FormItem label={t("projects.new.area")} htmlFor="p-area">
              <Input id="p-area" type="number" min={0} value={form.areaSqm} onChange={(e) => set("areaSqm", e.target.value)} />
            </FormItem>
            <div className="rounded-lg border bg-muted/40 p-3 sm:col-span-2">
              <p className="mb-2 text-sm font-medium">{t("projects.new.schedule")}</p>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("projects.create")}</Button>
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
  // Leaders and executives create projects (the API enforces the same rule)
  const { canCreate } = useProjectActions()

  React.useEffect(() => {
    if (params.get("new") && canCreate) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams, canCreate])

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
        title={t("projects.title")}
        description={t("projects.description")}
        actions={
          canCreate && (
            <Button onClick={() => setOpen(true)}>
              <PlusIcon /> {t("projects.create")}
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("projects.stat.active")} value={active.length} icon={BriefcaseIcon} hint={t("projects.stat.activeHint", { n: rows.length })} />
        <StatCard
          label={t("projects.stat.backlog")}
          value={formatMillion(active.reduce((s, r) => s + r.finance.outstanding, 0))}
          icon={WalletIcon}
          tone="success"
          hint={t("projects.stat.backlogHint")}
        />
        <StatCard label={t("projects.stat.overdue")} value={formatMillion(overdue)} icon={AlertTriangleIcon} tone="danger" hint={t("projects.stat.overdueHint", { n: overdueCount })} />
        <StatCard label={t("projects.stat.pendingCo")} value={pendingCo} icon={FileClockIcon} tone="warning" hint={t("projects.stat.pendingCoHint")} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-72">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder={t("projects.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("projects.filter.active")}</SelectItem>
                <SelectItem value="all">{t("common.all")}</SelectItem>
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
                <SelectItem value="all">{t("projects.filter.allTypes")}</SelectItem>
                {(Object.keys(projectTypeLabel) as ProjectType[]).map((pt) => (
                  <SelectItem key={pt} value={pt}>
                    {projectTypeLabel[pt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead>{t("projects.col.project")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("projects.col.currentPhase")}</TableHead>
                  <TableHead className="hidden w-36 lg:table-cell">{t("projects.col.progress")}</TableHead>
                  <TableHead className="text-right">{t("projects.col.contract")}</TableHead>
                  <TableHead className="hidden w-36 sm:table-cell">{t("projects.col.collected")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("projects.col.nextInstallment")}</TableHead>
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
                          {f.overdue > 0 && <Tag type="danger">{t("projects.overdueTag")}</Tag>}
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
                            <p className="text-xs text-muted-foreground">{t("projects.phaseUntil", { date: formatDate(phase.end, "d MMM yy") })}</p>
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
                          <Tag type={installmentTag.paid}>{t("projects.fullyCollected")}</Tag>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState title={t("projects.notFound")} />
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
