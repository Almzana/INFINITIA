import * as React from "react"
import { Link } from "react-router-dom"
import { addDays, format, isSameDay, parseISO } from "date-fns"
import { th } from "date-fns/locale"
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState, PageHeader } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import type { Employee } from "@/data/mock"
import { currentPhase, LABOR_RATE, type PhaseKey, phaseInfo, type Project } from "@/data/projects"
import { projectDepartments, type TimeEntry, WEEK_HOURS, weekStartOf } from "@/data/timesheet"
import { useAuth } from "@/lib/auth"
import { formatDate } from "@/lib/format"
import { newId, useStore } from "@/lib/store"
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

function WeekEditor({ employee, weekStart, projects }: { employee: Employee; weekStart: Date; projects: Project[] }) {
  const { state, dispatch } = useStore()
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
    if (rows.some((r) => r.key === key)) return toast.info("มีแถวของโครงการและเฟสนี้อยู่แล้ว")
    update((rs) => [...rs, { key, projectId, phase, hours: {} }])
    setAddProject("")
  }

  const changePhase = (key: string, phase: PhaseKey) => {
    const row = rows.find((r) => r.key === key)!
    const nextKey = `${row.projectId}|${phase}`
    if (rows.some((r) => r.key === nextKey)) return toast.info("มีแถวของเฟสนี้อยู่แล้ว")
    update((rs) => rs.map((r) => (r.key === key ? { ...r, key: nextKey, phase } : r)))
  }

  const copyLastWeek = () => {
    const prevFrom = ymd(addDays(weekStart, -7))
    const prevTo = ymd(addDays(weekStart, -7 + DAYS - 1))
    const prev = rowsFromEntries(state.timesheet.filter((t) => inWeek(t, prevFrom, prevTo)))
    if (!prev.length) return toast.info("สัปดาห์ที่แล้วไม่มีการลงชั่วโมง")
    update(() =>
      prev.map((r) => ({
        ...r,
        hours: Object.fromEntries(Object.entries(r.hours).map(([d, h]) => [ymd(addDays(parseISO(d), 7)), h])),
      })),
    )
    toast.success(`คัดลอก ${prev.length} แถวจากสัปดาห์ที่แล้ว`, { description: "ตรวจสอบแล้วกดบันทึก" })
  }

  const dayTotal = (d: string) => rows.reduce((s, r) => s + (Number(r.hours[d]) || 0), 0)
  const weekTotal = rows.reduce((s, r) => s + sumRow(r), 0)
  const overDay = days.some((d) => dayTotal(ymd(d)) > 12)

  const save = () => {
    if (overDay) return toast.error("มีบางวันลงเกิน 12 ชั่วโมง กรุณาตรวจสอบ")
    const entries: TimeEntry[] = rows.flatMap((r) =>
      Object.entries(r.hours)
        .filter(([, h]) => Number(h) > 0)
        .map(([date, h]) => ({ id: newId(), employeeId: employee.id, projectId: r.projectId, phase: r.phase, date, hours: Number(h) })),
    )
    dispatch({ type: "timesheet/week", employeeId: employee.id, from, to, entries })
    setRows((rs) => rs.filter((r) => sumRow(r) > 0))
    setDirty(false)
    toast.success("บันทึกชั่วโมงงานแล้ว", { description: `${employee.firstName} · ${weekTotal} ชม. · ต้นทุน ฿${(weekTotal * LABOR_RATE).toLocaleString()}` })
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="w-[34%]">โครงการ / เฟส</TableHead>
                {days.map((d) => (
                  <TableHead key={d.toISOString()} className={cn("text-center", isSameDay(d, today) && "text-primary")}>
                    <span className="block text-xs">{format(d, "EEE", { locale: th })}</span>
                    <span className="font-semibold">{format(d, "d")}</span>
                  </TableHead>
                ))}
                <TableHead className="text-right">รวม</TableHead>
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
                      <Button variant="ghost" size="icon-sm" aria-label="ลบแถว" onClick={() => update((rs) => rs.filter((x) => x.key !== r.key))}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={DAYS + 3}>
                    <EmptyState title="ยังไม่มีการลงชั่วโมงในสัปดาห์นี้" description="เพิ่มโครงการด้านล่าง หรือคัดลอกจากสัปดาห์ที่แล้ว" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">รวมต่อวัน</TableCell>
                {days.map((d) => {
                  const t = dayTotal(ymd(d))
                  return (
                    <TableCell key={d.toISOString()} className={cn("text-center font-semibold tabular-nums", t > 12 ? "text-destructive" : t >= 8 ? "text-success" : t > 0 ? "" : "text-muted-foreground")}>
                      {t || "–"}
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
                <SelectValue placeholder="เพิ่มโครงการ" />
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
              <CopyIcon /> คัดลอกสัปดาห์ที่แล้ว
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {dirty && <span className="text-sm text-warning">มีการแก้ไขที่ยังไม่บันทึก</span>}
            <Button onClick={save} disabled={!dirty}>
              <SaveIcon /> บันทึก
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          เป้าหมาย {WEEK_HOURS} ชม./สัปดาห์ · ต้นทุนแรงงานคิดที่ ฿{LABOR_RATE}/ชม. และนำไปคำนวณกำไรของโครงการโดยอัตโนมัติ
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
        <CardTitle>ภาพรวมทีมสัปดาห์นี้</CardTitle>
        <CardDescription>
          ลงครบตามวันทำงาน {complete} / {rows.length} คน (คาดหวัง {expected} ชม.) · รวม {rows.reduce((s, r) => s + r.hours, 0).toLocaleString()} ชม.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead>พนักงาน</TableHead>
                <TableHead className="hidden md:table-cell">ฝ่าย</TableHead>
                <TableHead className="text-right">ชั่วโมง</TableHead>
                <TableHead className="hidden text-right sm:table-cell">วันที่ลง</TableHead>
                <TableHead className="hidden text-right sm:table-cell">โครงการ</TableHead>
                <TableHead className="text-right">สถานะ</TableHead>
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
                  <TableCell className="hidden text-muted-foreground md:table-cell">{e.department}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{hours}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{days}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{projects}</TableCell>
                  <TableCell className="text-right">
                    <Tag type={hours >= expected ? "success" : hours > 0 ? "warning" : "danger"} dot>
                      {hours >= expected ? "ครบ" : hours > 0 ? `ขาด ${expected - hours} ชม.` : "ยังไม่ลง"}
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
  const [employeeId, setEmployeeId] = React.useState(() => staff[0]?.id ?? "")
  const [weekStart, setWeekStart] = React.useState(() => weekStartOf(new Date()))
  const [tab, setTab] = React.useState("mine")
  const employee = staff.find((e) => e.id === employeeId)
  const canSeeTeam = user?.role === "executive" || user?.role === "hr"
  const weekKey = ymd(weekStart)
  const isThisWeek = weekKey === ymd(weekStartOf(new Date()))

  return (
    <>
      <PageHeader
        title="บันทึกชั่วโมงงาน"
        description="ลงเวลาทำงานแยกตามโครงการและเฟส เพื่อคำนวณต้นทุนแรงงานและกำไรจริงของแต่ละโครงการ"
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="bg-background" aria-label="สัปดาห์ก่อน" onClick={() => setWeekStart((w) => addDays(w, -7))}>
              <ChevronLeftIcon />
            </Button>
            <div className="min-w-44 rounded-lg border bg-background px-3 py-1.5 text-center text-sm">
              {formatDate(weekKey, "d MMM")} – {formatDate(ymd(addDays(weekStart, DAYS - 1)), "d MMM yyyy")}
              {isThisWeek && <span className="ml-1 text-xs text-primary">(สัปดาห์นี้)</span>}
            </div>
            <Button variant="outline" size="icon" className="bg-background" aria-label="สัปดาห์ถัดไป" onClick={() => setWeekStart((w) => addDays(w, 7))}>
              <ChevronRightIcon />
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        {canSeeTeam && (
          <TabsList>
            <TabsTrigger value="mine">ลงชั่วโมง</TabsTrigger>
            <TabsTrigger value="team">ภาพรวมทีม</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="mine" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">ลงชั่วโมงให้:</span>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-72 bg-background">
                <SelectValue placeholder="เลือกพนักงาน" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} · {e.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">(โหมดสาธิต — ระบบจริงจะใช้บัญชีที่ล็อกอิน)</span>
          </div>
          {employee ? (
            // Remount the editor whenever the person or week changes so its draft starts from saved data
            <WeekEditor key={`${employee.id}-${weekKey}`} employee={employee} weekStart={weekStart} projects={state.projects} />
          ) : (
            <Card>
              <EmptyState title="ไม่มีพนักงานในฝ่ายที่ลงชั่วโมงโครงการ" />
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
