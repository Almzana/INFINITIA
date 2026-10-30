import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarPlusIcon,
  ClockIcon,
  DoorOpenIcon,
  MegaphoneIcon,
  PinIcon,
  UsersIcon,
} from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tag } from "@/components/shared/tag"
import { MyWorkSection } from "@/components/dashboard/my-work-section"
import { PageHeader, StatCard } from "@/components/shared/misc"
import { activities, departments, headcountTrend, leaveTypeLabel } from "@/data/mock"
import { deptLabel, t } from "@/i18n"
import { useAuth } from "@/lib/auth"
import { formatDate, todayISO } from "@/lib/format"
import { useEmployeeMap, useStore } from "@/lib/store"

// Earthy palette matching the INFINI I.A. brand
const deptColors = ["#3a352e", "#b8a58a", "#8c8277", "#a35f4f", "#6b7f6a", "#d4c4ad", "#5d574f"]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return t("dashboard.greeting.morning")
  if (h < 17) return t("dashboard.greeting.afternoon")
  return t("dashboard.greeting.evening")
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { state } = useStore()
  const employeeMap = useEmployeeMap()
  const navigate = useNavigate()

  const active = state.employees.filter((e) => e.status !== "resigned")
  const pending = state.leaves.filter((l) => l.status === "pending")
  const onLeaveToday = state.employees.filter((e) => e.status === "leave").length
  const today = todayISO()
  const todayBookings = state.bookings.filter((b) => b.date === today)

  const byDept = React.useMemo(
    () =>
      departments.map((d, i) => ({
        dept: d,
        value: active.filter((e) => e.department === d).length,
        fill: deptColors[i % deptColors.length],
      })),
    [active],
  )
  const deptConfig = Object.fromEntries(byDept.map((d) => [d.dept, { label: deptLabel(d.dept), color: d.fill }])) satisfies ChartConfig
  const trendConfig = {
    headcount: { label: t("dashboard.home.headcount"), color: "var(--chart-1)" },
  } satisfies ChartConfig
  const flowConfig = {
    hires: { label: t("dashboard.home.hires"), color: "var(--chart-2)" },
    exits: { label: t("dashboard.home.exits"), color: "var(--chart-4)" },
  } satisfies ChartConfig

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name ?? ""} 👋`}
        description={t("dashboard.home.description", { date: formatDate(today, t("dashboard.home.datePattern")), n: pending.length })}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/leave?new=1")}>
              <CalendarPlusIcon /> {t("dashboard.home.requestLeave")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dashboard.home.stat.employees")} value={active.length} icon={UsersIcon} trend={4.9} hint={t("dashboard.home.stat.fromLastMonth")} />
        <StatCard label={t("dashboard.home.stat.pendingLeave")} value={pending.length} icon={ClockIcon} tone="warning" hint={t("dashboard.home.stat.actionNeeded")} />
        <StatCard label={t("dashboard.home.stat.onLeave")} value={onLeaveToday} icon={CalendarCheckIcon} tone="danger" trend={-12} hint={t("dashboard.home.stat.fromLastWeek")} />
        <StatCard label={t("dashboard.home.stat.bookings")} value={todayBookings.length} icon={DoorOpenIcon} tone="success" hint={t("dashboard.home.stat.ofRooms", { n: state.rooms.length })} />
      </div>

      <MyWorkSection />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.home.headcount")}</CardTitle>
            <CardDescription>{t("dashboard.home.headcountDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-64 w-full">
              <AreaChart data={headcountTrend} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="fillHead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-headcount)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-headcount)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 2"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="headcount" type="monotone" stroke="var(--color-headcount)" strokeWidth={2} fill="url(#fillHead)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.home.byDept")}</CardTitle>
            <CardDescription>{t("dashboard.home.byDeptDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={deptConfig} className="mx-auto h-48 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="dept" hideLabel />} />
                <Pie data={byDept} dataKey="value" nameKey="dept" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {byDept.map((d) => (
                    <Cell key={d.dept} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {byDept.map((d) => (
                <li key={d.dept} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: d.fill }} />
                  <span className="truncate text-muted-foreground">{deptLabel(d.dept)}</span>
                  <span className="ml-auto font-medium tabular-nums">{d.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.home.pendingLeave")}</CardTitle>
            <CardDescription>{t("dashboard.home.pendingLeaveDesc")}</CardDescription>
            <CardAction>
              <Button variant="link" asChild className="h-auto p-0">
                <Link to="/leave">
                  {t("common.viewAll")} <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {pending.slice(0, 5).map((l) => {
                const emp = employeeMap.get(l.employeeId)
                return (
                  <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <EmployeeAvatar person={emp} className="size-9" fallbackClassName="" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {emp?.firstName} {emp?.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(l.from)} · {t("common.days", { n: l.days })} · {l.reason}
                      </p>
                    </div>
                    <Tag type={l.type === "sick" ? "danger" : l.type === "vacation" ? "primary" : "warning"}>{leaveTypeLabel[l.type]}</Tag>
                  </li>
                )
              })}
              {pending.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.home.noPending")}</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.home.flow")}</CardTitle>
            <CardDescription>{t("dashboard.home.monthly")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={flowConfig} className="h-56 w-full">
              <BarChart data={headcountTrend} margin={{ left: -28 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="hires" fill="var(--color-hires)" radius={4} />
                <Bar dataKey="exits" fill="var(--color-exits)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.home.roomsToday")}</CardTitle>
            <CardAction>
              <Button variant="link" asChild className="h-auto p-0">
                <Link to="/rooms">
                  {t("dashboard.home.bookRoom")} <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {todayBookings
                .sort((a, b) => a.start.localeCompare(b.start))
                .slice(0, 5)
                .map((b) => (
                  <li key={b.id} className="flex gap-3 text-sm">
                    <span className="w-12 shrink-0 pt-0.5 text-xs font-medium text-primary tabular-nums">{b.start}</span>
                    <div className="min-w-0 border-l-2 border-primary/40 pl-3">
                      <p className="truncate font-medium">{b.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {state.rooms.find((r) => r.id === b.roomId)?.name} · {b.start}–{b.end}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.home.announcements")}</CardTitle>
            <CardAction>
              <Button variant="link" asChild className="h-auto p-0">
                <Link to="/announcements">
                  {t("common.all")} <ArrowRightIcon />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {state.announcements.slice(0, 4).map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {a.pinned ? <PinIcon className="size-4" /> : <MegaphoneIcon className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.author} · {formatDate(a.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.home.activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-4">
              {activities.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                  <p>
                    <span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.when}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
