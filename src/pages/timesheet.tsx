import * as React from "react"
import { Link } from "react-router-dom"
import { addDays, format, isSameDay, parseISO } from "date-fns"
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState, PageHeader } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import type { Employee } from "@/data/mock"
import { currentPhase, LABOR_RATE, type PhaseKey, phaseInfo, type Project } from "@/data/projects"
import { projectDepartments, type TimeEntry, WEEK_HOURS, weekStartOf } from "@/data/timesheet"
import { deptLabel, t } from "@/i18n"
import { useAuth } from "@/lib/auth"
import { formatDate, dateLocale } from "@/lib/format"
import { useWeekTimesheet } from "@/hooks/use-week-timesheet"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const DAYS = 6 // Mon–Sat: site teams often work Saturdays
const ymd = (d: Date) => format(d, "yyyy-MM-dd")

interface Row {
  key: string
  projectId: string
  phase: PhaseKey
  hours: Record<string, string>
}

function rowsFromEntries(entries: TimeEntry[]): Row[] {
  const map = new Map<string, Row>()
  for (const t of entries) {
    const key = `${t.projectId}|${t.phase}`
    const row = map.get(key) ?? { key, projectId: t.projectId, phase: t.phase, hours: {} }
    row.hours[t.date] = String((Number(row.hours[t.date]) || 0) + t.hours)
    map.set(key, row)
  }
  return [...map.values()]
}

const sumRow = (r: Row) => Object.values(r.hours).reduce((s, h) => s + (Number(h) || 0), 0)

function WeekEditor({ employee, weekStart, projects, onSave, loadWeek }: {
  employee: Employee
  weekStart: Date
  projects: Project[]
  onSave: (entries: Omit<TimeEntry, "id" | "employeeId">[]) => Promise<boolean>
  loadWeek: (from: string, to: string) => Promise<TimeEntry[]>
}) {
  const { state } = useStore()
  const days = Array.from({ length: DAYS }, (_, i) => addDays(weekStart, i))
  const from = ymd(days[0])
  const to = ymd(days[DAYS - 1])
  const inWeek = (t: TimeEntry, a: string, b: string) => t.employeeId === employee.id && t.date >= a && t.date <= b

  const [rows, setRows] = React.useState<Row[]>(() => rowsFromEntries(state.timesheet.filter((t) => inWeek(t, from, to))))
  const [dirty, setDirty] = React.useState(false)
  const [addProject, setAddProject] = React.useState("")

  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const active = projects.filter((p) => currentPhase(p))
  const today = new Date()

  const update = (fn: (rs: Row[]) => Row[]) => {
    setRows(fn)
    setDirty(true)
  }

  const setHours = (key: string, date: string, value: string) => {
    if (value !== "" && !/^\d{0,2}(\.\d?)?$/.test(value)) return
    update((rs) => rs.map((r) => (r.key === key ? { ...r, hours: { ...r.hours, [date]: value } } : r)))
  }

  const addRow = (projectId: string) => {
    const p = projectMap.get(projectId)
    if (!p) return
    const phase = (currentPhase(p) ?? p.phases[p.phases.length - 1]).key
    const key = `${projectId}|${phase}`
    if (rows.some((r) => r.key === key)) return toast.info(t("timesheet.toast.rowExists"))
    update((rs) => [...rs, { key, projectId, phase, hours: {} }])
    setAddProject("")
  }

  const changePhase = (key: string, phase: PhaseKey) => {
    const row = rows.find((r) => r.key === key)!
    const nextKey = `${row.projectId}|${phase}`
    if (rows.some((r) => r.key === nextKey)) return toast.info(t("timesheet.toast.phaseExists"))
    update((rs) => rs.map((r) => (r.key === key ? { ...r, key: nextKey, phase } : r)))
  }

  const copyLastWeek = async () => {
    const prevFrom = ymd(addDays(weekStart, -7))
    const prevTo = ymd(addDays(weekStart, -7 + DAYS - 1))
    // Fetch the previous week: it may be older than what the app has loaded
    const prev = rowsFromEntries((await loadWeek(prevFrom, prevTo)).filter((t) => inWeek(t, prevFrom, prevTo)))
    if (!prev.length) return toast.info(t("timesheet.toast.noLastWeek"))
    update(() =>
      prev.map((r) => ({
        ...r,
        hours: Object.fromEntries(Object.entries(r.hours).map(([d, h]) => [ymd(addDays(parseISO(d), 7)), h])),
      })),
    )
    toast.success(t("timesheet.toast.copied", { n: prev.length }), { description: t("timesheet.toast.copiedDesc") })
  }

  const dayTotal = (d: string) => rows.reduce((s, r) => s + (Number(r.hours[d]) || 0), 0)
  const weekTotal = rows.reduce((s, r) => s + sumRow(r), 0)
  const overDay = days.some((d) => dayTotal(ymd(d)) > 12)

  const save = async () => {
    if (overDay) return toast.error(t("timesheet.toast.overDay"))
    const entries = rows.flatMap((r) =>
      Object.entries(r.hours)
        .filter(([, h]) => Number(h) > 0)
        .map(([date, h]) => ({ projectId: r.projectId, phase: r.phase, date, hours: Number(h) })),
    )
    if (!(await onSave(entries))) return
    setRows((rs) => rs.filter((r) => sumRow(r) > 0))
    setDirty(false)
    toast.success(t("timesheet.toast.saved"), {
      description: t("timesheet.toast.savedDesc", { name: employee.firstName, hours: weekTotal, cost: (weekTotal * LABOR_RATE).toLocaleString() }),
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {projects.length === 0 && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{t("timesheet.noProjects")}</p>}
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="w-[34%]">{t("timesheet.editor.projectPhase")}</TableHead>
                {days.map((d) => (
                  <TableHead key={d.toISOString()} className={cn("text-center", isSameDay(d, today) && "text-primary")}>
                    <span className="block text-xs">{format(d, "EEE", { locale: dateLocale() })}</span>
                    <span className="font-semibold">{format(d, "d")}</span>
                  </TableHead>
                ))}
                <TableHead className="text-right">{t("timesheet.editor.total")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const p = projectMap.get(r.projectId)
                return (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Link to={`/projects/${r.projectId}`} className="block truncate text-sm font-medium hover:underline">
                        {p?.name ?? r.projectId}
                      </Link>
                      <Select value={r.phase} onValueChange={(v) => changePhase(r.key, v as PhaseKey)}>
                        <SelectTrigger size="sm" className="mt-1 h-6 w-full max-w-52 border-dashed text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(p?.phases ?? []).map((ph) => (
                            <SelectItem key={ph.key} value={ph.key}>
                              {phaseInfo[ph.key].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {days.map((d) => {
                      const k = ymd(d)
                      return (
                        <TableCell key={k} className="px-1">
                          <Input
                            inputMode="decimal"
                            aria-label={`${p?.name} ${k}`}
                            className="h-8 w-full min-w-12 text-center tabular-nums"
                            value={r.hours[k] ?? ""}
                            placeholder="–"
                            onChange={(e) => setHours(r.key, k, e.target.value)}
                          />
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-medium tabular-nums">{sumRow(r)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" aria-label={t("timesheet.editor.removeRow")} onClick={() => update((rs) => rs.filter((x) => x.key !== r.key))}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={DAYS + 3}>
                    <EmptyState title={t("timesheet.editor.emptyTitle")} description={t("timesheet.editor.emptyDesc")} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">{t("timesheet.editor.dayTotal")}</TableCell>
                {days.map((d) => {
                  const total = dayTotal(ymd(d))
                  return (
                    <TableCell key={d.toISOString()} className={cn("text-center font-semibold tabular-nums", total > 12 ? "text-destructive" : total >= 8 ? "text-success" : total > 0 ? "" : "text-muted-foreground")}>
                      {total || "–"}
                    </TableCell>
                  )
                })}
                <TableCell className={cn("text-right font-semibold tabular-nums", weekTotal >= WEEK_HOURS ? "text-success" : "text-warning")}>{weekTotal}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={addProject} onValueChange={addRow}>
              <SelectTrigger className="w-64">
                <PlusIcon className="size-4" />
                <SelectValue placeholder={t("timesheet.editor.addProject")} />
              </SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={copyLastWeek}>
              <CopyIcon /> {t("timesheet.editor.copyLastWeek")}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {dirty && <span className="text-sm text-warning">{t("timesheet.editor.unsaved")}</span>}
            <Button onClick={save} disabled={!dirty}>
              <SaveIcon /> {t("common.save")}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("timesheet.editor.footnote", { target: WEEK_HOURS, rate: LABOR_RATE })}
        </p>
      </CardContent>
    </Card>
  )
}

function TeamOverview({ staff, weekStart, onPick }: { staff: Employee[]; weekStart: Date; onPick: (id: string) => void }) {
  const { state } = useStore()
  const from = ymd(weekStart)
  const to = ymd(addDays(weekStart, DAYS - 1))
  const rows = staff
    .map((e) => {
      const entries = state.timesheet.filter((t) => t.employeeId === e.id && t.date >= from && t.date <= to)
      return { e, hours: entries.reduce((s, t) => s + t.hours, 0), days: new Set(entries.map((t) => t.date)).size, projects: new Set(entries.map((t) => t.projectId)).size }
    })
    .sort((a, b) => a.hours - b.hours)
  // Mid-week, expect 8 h for each weekday already finished (today not counted yet)
  const todayStr = ymd(new Date())
  const finishedWeekdays = Array.from({ length: 5 }, (_, i) => ymd(addDays(weekStart, i))).filter((d) => d < todayStr).length
  const expected = Math.min(WEEK_HOURS, finishedWeekdays * 8)
  const complete = rows.filter((r) => r.hours >= expected).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("timesheet.team.title")}</CardTitle>
        <CardDescription>
          {t("timesheet.team.summary", { complete, total: rows.length, expected, hours: rows.reduce((s, r) => s + r.hours, 0).toLocaleString() })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead>{t("timesheet.team.employee")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("timesheet.team.department")}</TableHead>
                <TableHead className="text-right">{t("timesheet.team.hours")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("timesheet.team.days")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("timesheet.team.projects")}</TableHead>
                <TableHead className="text-right">{t("timesheet.team.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ e, hours, days, projects }) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => onPick(e.id)}>
                  <TableCell>
                    <p className="font-medium">
                      {e.firstName} {e.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{e.position}</p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{deptLabel(e.department)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{hours}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{days}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{projects}</TableCell>
                  <TableCell className="text-right">
                    <Tag type={hours >= expected ? "success" : hours > 0 ? "warning" : "danger"} dot>
                      {hours >= expected ? t("timesheet.team.complete") : hours > 0 ? t("timesheet.team.short", { n: expected - hours }) : t("timesheet.team.none")}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TimesheetPage() {
  const { state } = useStore()
  const { user } = useAuth()
  const staff = React.useMemo(
    () => state.employees.filter((e) => e.status !== "resigned" && projectDepartments.includes(e.department)),
    [state.employees],
  )
  // Staff log their own time; executives may pick anyone and see the team overview (the API enforces it)
  const isExecutive = user?.role === "executive"
  const [picked, setEmployeeId] = React.useState("")
  // Until someone is picked, default to the first person once the directory has loaded
  const employeeId = isExecutive ? picked || (staff[0]?.id ?? "") : (user?.employeeId ?? "")
  const [weekStart, setWeekStart] = React.useState(() => weekStartOf(new Date()))
  const [tab, setTab] = React.useState("mine")
  const employee = state.employees.find((e) => e.id === employeeId)
  const canSeeTeam = isExecutive
  const week = useWeekTimesheet(weekStart, DAYS)
  const weekKey = ymd(weekStart)
  const isThisWeek = weekKey === ymd(weekStartOf(new Date()))

  return (
    <>
      <PageHeader
        title={t("timesheet.title")}
        description={t("timesheet.description")}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="bg-background" aria-label={t("timesheet.prevWeek")} onClick={() => setWeekStart((w) => addDays(w, -7))}>
              <ChevronLeftIcon />
            </Button>
            <div className="min-w-44 rounded-lg border bg-background px-3 py-1.5 text-center text-sm">
              {formatDate(weekKey, "d MMM")} – {formatDate(ymd(addDays(weekStart, DAYS - 1)), "d MMM yyyy")}
              {isThisWeek && <span className="ml-1 text-xs text-primary">{t("timesheet.thisWeek")}</span>}
            </div>
            <Button variant="outline" size="icon" className="bg-background" aria-label={t("timesheet.nextWeek")} onClick={() => setWeekStart((w) => addDays(w, 7))}>
              <ChevronRightIcon />
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        {canSeeTeam && (
          <TabsList>
            <TabsTrigger value="mine">{t("timesheet.tab.mine")}</TabsTrigger>
            <TabsTrigger value="team">{t("timesheet.tab.team")}</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="mine" className="space-y-4">
          {isExecutive && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("timesheet.logFor")}</span>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-72 bg-background">
                <SelectValue placeholder={t("timesheet.pickEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {staff.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} · {e.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          )}
          {!week.ready ? (
            <Skeleton className="h-72 w-full" />
          ) : employee ? (
            // Remount the editor whenever the person or week changes so its draft starts from saved data
            <WeekEditor
              key={`${employee.id}-${weekKey}`}
              employee={employee}
              weekStart={weekStart}
              // Only projects this person is a member of (the API refuses others too)
              projects={state.projects.filter((p) => p.memberIds?.includes(employee.id))}
              onSave={(entries) => week.saveWeek(employee.id, entries)}
              loadWeek={(from, to) => week.loadEntries(employee.id, from, to)}
            />
          ) : (
            <Card>
              <EmptyState
                title={isExecutive ? t("timesheet.noStaff") : t("timesheet.notLinked")}
                description={isExecutive ? undefined : t("timesheet.notLinkedDesc")}
              />
            </Card>
          )}
        </TabsContent>
        {canSeeTeam && (
          <TabsContent value="team">
            <TeamOverview
              staff={staff}
              weekStart={weekStart}
              onPick={(id) => {
                setEmployeeId(id)
                setTab("mine")
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </>
  )
}
