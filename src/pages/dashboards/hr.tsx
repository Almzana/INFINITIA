import * as React from "react"
import { Link } from "react-router-dom"
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  ArrowRightIcon,
  ClockAlertIcon,
  DownloadIcon,
  InfoIcon,
  LogInIcon,
  LogOutIcon,
  SearchIcon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MyWorkSection } from "@/components/dashboard/my-work-section"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/misc"
import { Tag, type TagType } from "@/components/shared/tag"
import {
  type AttendanceStatus,
  attendanceStatusLabel,
  buildAttendance,
  hourlyFlow,
  recentResignations,
  resignReasonLabel,
  resignReasons,
  tenureLabel,
  turnoverTrend,
} from "@/data/attendance"
import { departments } from "@/data/mock"
import { deptLabel, t } from "@/i18n"
import { downloadCsv, formatDate, initials, todayISO } from "@/lib/format"
import { useStore } from "@/lib/store"

const attTag: Record<AttendanceStatus, TagType> = {
  "on-time": "success",
  late: "warning",
  left: "info",
  "early-leave": "danger",
  leave: "primary",
  absent: "danger",
}

// Chart labels are getters so they are read in the current language at render time
const flowConfig = {
  checkIn: { get label() { return t("dashboard.hr.chart.checkIn") }, color: "var(--chart-1)" },
  checkOut: { get label() { return t("dashboard.hr.chart.checkOut") }, color: "var(--chart-2)" },
} satisfies ChartConfig

const turnoverConfig = {
  resigned: { get label() { return t("dashboard.hr.chart.resigned") }, color: "var(--chart-4)" },
  hired: { get label() { return t("dashboard.hr.chart.hired") }, color: "var(--chart-5)" },
  rate: { get label() { return t("dashboard.hr.chart.rate") }, color: "var(--chart-1)" },
} satisfies ChartConfig

const deptConfig = {
  present: { get label() { return t("dashboard.hr.chart.present") }, color: "var(--chart-1)" },
  late: { get label() { return t("dashboard.hr.chart.late") }, color: "var(--warning)" },
  away: { get label() { return t("dashboard.hr.chart.away") }, color: "var(--chart-4)" },
} satisfies ChartConfig

const reasonColors = ["#3a352e", "#8c8277", "#b8a58a", "#a35f4f", "#6b7f6a", "#d4c4ad"]

type Filter = "all" | "in" | "out" | "issue"

export default function HrDashboard() {
  const { state } = useStore()
  const [filter, setFilter] = React.useState<Filter>("all")
  const [q, setQ] = React.useState("")
  const today = todayISO()

  const empMap = React.useMemo(() => new Map(state.employees.map((e) => [e.id, e])), [state.employees])
  const records = React.useMemo(() => buildAttendance(state.employees), [state.employees])
  const flow = React.useMemo(() => hourlyFlow(records), [records])

  const count = (s: AttendanceStatus[]) => records.filter((r) => s.includes(r.status)).length
  const total = records.length
  const present = count(["on-time", "late", "left", "early-leave"])
  const late = records.filter((r) => r.checkIn && r.checkIn > "09:00").length
  const stillIn = count(["on-time", "late"])
  const checkedOut = count(["left", "early-leave"])
  const away = count(["leave", "absent"])

  const resignedYtd = turnoverTrend.slice(2).reduce((s, m) => s + m.resigned, 0)
  const avgHead = turnoverTrend.reduce((s, m) => s + m.headcount, 0) / turnoverTrend.length
  const annualRate = (turnoverTrend.reduce((s, m) => s + m.resigned, 0) / avgHead) * 100

  const byDept = departments.map((d) => {
    const rs = records.filter((r) => empMap.get(r.employeeId)?.department === d)
    return {
      // Short axis label: Thai names drop the department prefix
      dept: deptLabel(d).replace("ฝ่าย", ""),
      present: rs.filter((r) => r.checkIn && r.checkIn <= "09:00").length,
      late: rs.filter((r) => r.checkIn && r.checkIn > "09:00").length,
      away: rs.filter((r) => !r.checkIn).length,
    }
  })

  const reasons = resignReasons.map((r) => ({ ...r, reason: resignReasonLabel[r.key] }))
  const reasonsConfig = Object.fromEntries(reasons.map((r, i) => [r.reason, { label: r.reason, color: reasonColors[i] }])) satisfies ChartConfig

  const list = records
    .filter((r) => {
      if (filter === "in") return r.status === "on-time" || r.status === "late"
      if (filter === "out") return r.status === "left" || r.status === "early-leave"
      if (filter === "issue") return ["late", "early-leave", "absent"].includes(r.status) || (r.checkIn ?? "") > "09:00"
      return true
    })
    .filter((r) => {
      const e = empMap.get(r.employeeId)
      return !q || `${e?.firstName} ${e?.lastName} ${e?.nickname} ${e?.department}`.toLowerCase().includes(q.toLowerCase())
    })
    // Most recent clock-outs first, then people still in the office
    .sort((a, b) => (b.checkOut ?? "").localeCompare(a.checkOut ?? "") || (a.checkIn ?? "99").localeCompare(b.checkIn ?? "99"))

  const exportCsv = () => {
    downloadCsv(`attendance-${today}.csv`, [
      [t("dashboard.hr.csv.code"), t("dashboard.hr.csv.name"), t("dashboard.hr.csv.dept"), t("dashboard.hr.csv.in"), t("dashboard.hr.csv.out"), t("dashboard.hr.csv.status")],
      ...records.map((r) => {
        const e = empMap.get(r.employeeId)
        return [e?.code ?? "", `${e?.firstName} ${e?.lastName}`, e ? deptLabel(e.department) : "", r.checkIn ?? "", r.checkOut ?? "", attendanceStatusLabel[r.status]]
      }),
    ])
    toast.success(t("dashboard.hr.exported", { n: records.length }))
  }

  return (
    <>
      <PageHeader
        title={t("dashboard.hr.title")}
        description={t("dashboard.hr.description", { date: formatDate(today, t("dashboard.hr.datePattern")) })}
        actions={
          <Button variant="outline" className="bg-background" onClick={exportCsv}>
            <DownloadIcon /> {t("dashboard.hr.export")}
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <p>{t("dashboard.hr.mockNotice")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dashboard.hr.stat.present")} value={`${present} / ${total}`} icon={UsersIcon} hint={t("dashboard.hr.stat.presentHint", { pct: Math.round((present / total) * 100), n: away })} />
        <StatCard label={t("dashboard.hr.stat.checkedOut")} value={checkedOut} icon={LogOutIcon} tone="success" hint={t("dashboard.hr.stat.stillIn", { n: stillIn })} />
        <StatCard label={t("dashboard.hr.stat.late")} value={late} icon={ClockAlertIcon} tone="warning" hint={t("dashboard.hr.stat.lateHint")} />
        <StatCard label={t("dashboard.hr.stat.resigned")} value={resignedYtd} icon={UserMinusIcon} tone="danger" hint={t("dashboard.hr.stat.rateHint", { rate: annualRate.toFixed(1) })} />
      </div>

      <MyWorkSection />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.hr.hourly")}</CardTitle>
            <CardDescription>{t("dashboard.hr.hourlyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={flowConfig} className="h-64 w-full">
              <BarChart data={flow} margin={{ left: -24 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="checkIn" fill="var(--color-checkIn)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="checkOut" fill="var(--color-checkOut)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.hr.statusToday")}</CardTitle>
            <CardDescription>{t("dashboard.hr.totalEmployees", { n: total })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["on-time", "late", "left", "early-leave", "leave", "absent"] as AttendanceStatus[]).map((s) => {
              const n = count([s])
              return (
                <div key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Tag type={attTag[s]} dot>
                      {attendanceStatusLabel[s]}
                    </Tag>
                    <span className="font-medium tabular-nums">{t("common.people", { n })}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(n / total) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.hr.list")}</CardTitle>
          <CardDescription>{t("dashboard.hr.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
                <TabsTrigger value="out">{t("dashboard.hr.filter.out")}</TabsTrigger>
                <TabsTrigger value="in">{t("dashboard.hr.filter.in")}</TabsTrigger>
                <TabsTrigger value="issue">{t("dashboard.hr.filter.issue")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative sm:w-64">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder={t("dashboard.hr.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead>{t("dashboard.hr.col.employee")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("dashboard.hr.col.dept")}</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <LogInIcon className="size-3.5" /> {t("dashboard.hr.col.in")}
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <LogOutIcon className="size-3.5" /> {t("dashboard.hr.col.out")}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">{t("dashboard.hr.col.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => {
                  const e = empMap.get(r.employeeId)
                  const isLate = (r.checkIn ?? "") > "09:00"
                  return (
                    <TableRow key={r.employeeId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar person={e} className="size-8" fallbackClassName="text-xs" />
                          <div>
                            <p className="font-medium">
                              {e?.firstName} {e?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{e?.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{e && deptLabel(e.department)}</TableCell>
                      <TableCell className={isLate ? "font-medium text-warning tabular-nums" : "tabular-nums"}>{r.checkIn ?? "—"}</TableCell>
                      <TableCell className={r.status === "early-leave" ? "font-medium text-destructive tabular-nums" : "tabular-nums"}>{r.checkOut ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Tag type={attTag[r.status]} dot>
                          {attendanceStatusLabel[r.status]}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.hr.byDept")}</CardTitle>
            <CardDescription>{t("common.today")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={deptConfig} className="h-64 w-full">
              <BarChart data={byDept} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="dept" tickLine={false} axisLine={false} width={84} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="present" stackId="a" fill="var(--color-present)" />
                <Bar dataKey="late" stackId="a" fill="var(--color-late)" />
                <Bar dataKey="away" stackId="a" fill="var(--color-away)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.hr.turnover")}</CardTitle>
            <CardDescription>{t("dashboard.hr.turnoverDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={turnoverConfig} className="h-64 w-full">
              <ComposedChart data={turnoverTrend} margin={{ left: -24, right: -8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(m: string) => m.split(" ")[0]} />
                <YAxis yAxisId="n" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area yAxisId="n" dataKey="hired" type="monotone" fill="var(--color-hired)" fillOpacity={0.15} stroke="var(--color-hired)" />
                <Bar yAxisId="n" dataKey="resigned" fill="var(--color-resigned)" radius={[4, 4, 0, 0]} barSize={14} />
                <Line yAxisId="r" dataKey="rate" type="monotone" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 2.5 }} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.hr.reasons")}</CardTitle>
            <CardDescription>{t("dashboard.hr.last12")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={reasonsConfig} className="mx-auto aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="reason" hideLabel />} />
                <Pie data={reasons} dataKey="count" nameKey="reason" innerRadius={44} outerRadius={76} paddingAngle={2}>
                  {reasons.map((r, i) => (
                    <Cell key={r.reason} fill={reasonColors[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-3 space-y-1.5 text-xs">
              {reasons.map((r, i) => (
                <li key={r.reason} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: reasonColors[i] }} />
                  <span className="flex-1 text-muted-foreground">{r.reason}</span>
                  <span className="font-medium tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.hr.recent")}</CardTitle>
            <CardDescription>{t("dashboard.hr.recentDesc")}</CardDescription>
            <CardAction>
              <Button variant="link" asChild className="h-auto p-0">
                <Link to="/employees">
                  {t("dashboard.hr.employeeData")} <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {recentResignations.map((r) => {
                const upcoming = r.lastDay >= today
                return (
                  <li key={r.name} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-destructive/10 text-destructive">{initials(r.name.split(" ")[0], r.name.split(" ")[1])}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.position} · {deptLabel(r.department)} · {t("dashboard.hr.tenure", { tenure: tenureLabel(r.tenureMonths) })}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("dashboard.hr.reason", { reason: resignReasonLabel[r.reason] })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Tag type={upcoming ? "warning" : "info"}>{upcoming ? t("dashboard.hr.lastDay") : t("dashboard.hr.left")} {formatDate(r.lastDay, "d MMM yy")}</Tag>
                      <span className={r.exitInterview ? "text-xs text-success" : "text-xs text-destructive"}>
                        {r.exitInterview ? t("dashboard.hr.exitDone") : t("dashboard.hr.exitPending")}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
