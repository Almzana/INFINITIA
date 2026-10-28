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
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/misc"
import { Tag, type TagType } from "@/components/shared/tag"
import {
  type AttendanceStatus,
  attendanceStatusLabel,
  buildAttendance,
  hourlyFlow,
  recentResignations,
  resignReasons,
  turnoverTrend,
} from "@/data/attendance"
import { departments } from "@/data/mock"
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

const flowConfig = {
  checkIn: { label: "เข้างาน", color: "var(--chart-1)" },
  checkOut: { label: "ออกงาน", color: "var(--chart-2)" },
} satisfies ChartConfig

const turnoverConfig = {
  resigned: { label: "ลาออก", color: "var(--chart-4)" },
  hired: { label: "รับเข้าใหม่", color: "var(--chart-5)" },
  rate: { label: "อัตราลาออก (%)", color: "var(--chart-1)" },
} satisfies ChartConfig

const deptConfig = {
  present: { label: "มาทำงาน", color: "var(--chart-1)" },
  late: { label: "มาสาย", color: "var(--warning)" },
  away: { label: "ลา/ขาด", color: "var(--chart-4)" },
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
      dept: d.replace("ฝ่าย", ""),
      present: rs.filter((r) => r.checkIn && r.checkIn <= "09:00").length,
      late: rs.filter((r) => r.checkIn && r.checkIn > "09:00").length,
      away: rs.filter((r) => !r.checkIn).length,
    }
  })

  const reasonsConfig = Object.fromEntries(resignReasons.map((r, i) => [r.reason, { label: r.reason, color: reasonColors[i] }])) satisfies ChartConfig

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
      ["รหัส", "ชื่อ", "ฝ่าย", "เวลาเข้า", "เวลาออก", "สถานะ"],
      ...records.map((r) => {
        const e = empMap.get(r.employeeId)
        return [e?.code ?? "", `${e?.firstName} ${e?.lastName}`, e?.department ?? "", r.checkIn ?? "", r.checkOut ?? "", attendanceStatusLabel[r.status]]
      }),
    ])
    toast.success(`ส่งออกข้อมูลเข้า-ออกงาน ${records.length} รายการแล้ว`)
  }

  return (
    <>
      <PageHeader
        title="แดชบอร์ดฝ่ายบุคคล"
        description={`การเข้า-ออกงานวันนี้ (${formatDate(today, "EEEEที่ d MMM yyyy")} · อัปเดต 17:45 น.) และการลาออกของพนักงาน`}
        actions={
          <Button variant="outline" className="bg-background" onClick={exportCsv}>
            <DownloadIcon /> ส่งออกเวลาเข้า-ออก
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <p>ข้อมูลเวลาเข้า-ออกงานและการลาออกเป็นข้อมูลจำลอง — รอเชื่อมต่อกับเครื่องสแกนนิ้ว/ระบบลงเวลาและ HRIS</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="มาทำงานวันนี้" value={`${present} / ${total}`} icon={UsersIcon} hint={`${Math.round((present / total) * 100)}% · ลา/ขาด ${away} คน`} />
        <StatCard label="ออกงานแล้ว" value={checkedOut} icon={LogOutIcon} tone="success" hint={`ยังอยู่ในออฟฟิศ ${stillIn} คน`} />
        <StatCard label="มาสายวันนี้" value={late} icon={ClockAlertIcon} tone="warning" hint="เข้างานหลัง 09:00 น." />
        <StatCard label="ลาออกปีนี้" value={resignedYtd} icon={UserMinusIcon} tone="danger" hint={`อัตราลาออก 12 เดือน ${annualRate.toFixed(1)}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>จำนวนคนเข้า-ออกงานรายชั่วโมง</CardTitle>
            <CardDescription>เวลาทำงาน 09:00–17:30 น.</CardDescription>
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
            <CardTitle>สถานะวันนี้</CardTitle>
            <CardDescription>พนักงานทั้งหมด {total} คน</CardDescription>
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
                    <span className="font-medium tabular-nums">{n} คน</span>
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
          <CardTitle>รายการเข้า-ออกงานวันนี้</CardTitle>
          <CardDescription>เรียงตามเวลาออกงานล่าสุด</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                <TabsTrigger value="out">ออกงานแล้ว</TabsTrigger>
                <TabsTrigger value="in">ยังอยู่</TabsTrigger>
                <TabsTrigger value="issue">ผิดปกติ</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative sm:w-64">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="ค้นหาชื่อ หรือฝ่าย..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead>พนักงาน</TableHead>
                  <TableHead className="hidden md:table-cell">ฝ่าย</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <LogInIcon className="size-3.5" /> เข้า
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <LogOutIcon className="size-3.5" /> ออก
                    </span>
                  </TableHead>
                  <TableHead className="text-right">สถานะ</TableHead>
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
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-xs">{e ? initials(e.firstName, e.lastName) : "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {e?.firstName} {e?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{e?.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{e?.department}</TableCell>
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
            <CardTitle>การมาทำงานแยกตามฝ่าย</CardTitle>
            <CardDescription>วันนี้</CardDescription>
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
            <CardTitle>แนวโน้มการลาออก 12 เดือน</CardTitle>
            <CardDescription>จำนวนคนลาออก / รับเข้าใหม่ และอัตราลาออกรายเดือน</CardDescription>
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
            <CardTitle>สาเหตุการลาออก</CardTitle>
            <CardDescription>12 เดือนล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={reasonsConfig} className="mx-auto aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="reason" hideLabel />} />
                <Pie data={resignReasons} dataKey="count" nameKey="reason" innerRadius={44} outerRadius={76} paddingAngle={2}>
                  {resignReasons.map((r, i) => (
                    <Cell key={r.reason} fill={reasonColors[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-3 space-y-1.5 text-xs">
              {resignReasons.map((r, i) => (
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
            <CardTitle>พนักงานที่ลาออกล่าสุด</CardTitle>
            <CardDescription>รวมคนที่แจ้งลาออกล่วงหน้า</CardDescription>
            <CardAction>
              <Button variant="link" asChild className="h-auto p-0">
                <Link to="/employees">
                  ข้อมูลพนักงาน <ArrowRightIcon />
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
                        {r.position} · {r.department} · อายุงาน {r.tenure}
                      </p>
                      <p className="text-xs text-muted-foreground">สาเหตุ: {r.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Tag type={upcoming ? "warning" : "info"}>{upcoming ? "วันสุดท้าย" : "ออกแล้ว"} {formatDate(r.lastDay, "d MMM yy")}</Tag>
                      <span className={r.exitInterview ? "text-xs text-success" : "text-xs text-destructive"}>
                        {r.exitInterview ? "สัมภาษณ์ออกแล้ว" : "ยังไม่สัมภาษณ์ออก"}
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
