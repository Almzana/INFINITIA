import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from "recharts"
import { differenceInCalendarDays, parseISO } from "date-fns"
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  BriefcaseIcon,
  InfoIcon,
  SearchIcon,
  TrendingUpIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { marginTone, type ProjectRow, projectStatusTag, useProjectRows } from "@/components/projects/shared"
import { ANNUAL_TARGET, pipeline, type ProjectStatus, type ProjectType, projectStatusLabel, projectTypeLabel } from "@/data/projects"
import { formatMillion, formatPercent, todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"

const typeColors: Record<ProjectType, string> = {
  "design-build": "#3a352e",
  architecture: "#b8a58a",
  interior: "#8c8277",
  construction: "#a35f4f",
}

const billingConfig = {
  paid: { label: "รับเงินจริง", color: "var(--chart-1)" },
  scheduled: { label: "ตามแผนงวดเงิน", color: "var(--chart-2)" },
  target: { label: "เป้าหมายรายเดือน", color: "var(--chart-4)" },
} satisfies ChartConfig

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
const millionTick = (v: number) => `${Math.round(v / 1_000_000)}`

type SortKey = "name" | "contract" | "profit" | "margin" | "progress"
type Sort = { key: SortKey; dir: "asc" | "desc" }

const sortValue = (r: ProjectRow, k: SortKey) =>
  k === "name" ? r.project.name : k === "contract" ? r.finance.contract : k === "profit" ? r.finance.profit : k === "margin" ? r.finance.margin : r.finance.progress

function SortHead({ k, label, sort, onSort, className }: { k: SortKey; label: string; sort: Sort; onSort: (k: SortKey) => void; className?: string }) {
  const Icon = sort.key !== k ? ArrowUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead className={className}>
      <button className={cn("inline-flex items-center gap-1 hover:text-foreground", sort.key === k && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  )
}

export default function ExecutiveDashboard() {
  const allRows = useProjectRows()
  const navigate = useNavigate()
  const [year, setYear] = React.useState("all")
  const [status, setStatus] = React.useState<"all" | ProjectStatus>("all")
  const [q, setQ] = React.useState("")
  const [sort, setSort] = React.useState<Sort>({ key: "profit", dir: "desc" })
  const onSort = (k: SortKey) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "desc" ? "asc" : "desc" }))

  const today = todayISO()
  const thisYear = today.slice(0, 4)
  const yearsBE = [...new Set(allRows.map((r) => String(Number(r.project.start.slice(0, 4)) + 543)))].sort().reverse()

  // Year filter = projects whose contract was signed (started) in that Buddhist-era year
  const scoped = allRows.filter((r) => year === "all" || String(Number(r.project.start.slice(0, 4)) + 543) === year)

  const totals = React.useMemo(() => {
    const sum = (fn: (r: ProjectRow) => number) => scoped.reduce((s, r) => s + fn(r), 0)
    const contract = sum((r) => r.finance.contract)
    const profit = sum((r) => r.finance.profit)
    return {
      contract,
      profit,
      margin: contract ? profit / contract : 0,
      collected: sum((r) => r.finance.collected),
      overdue: sum((r) => r.finance.overdue),
      changeOrders: sum((r) => r.finance.changeOrderValue),
      pendingCo: sum((r) => r.finance.pendingChangeOrders),
      laborCost: sum((r) => r.finance.laborCost),
    }
  }, [scoped])

  const completed = scoped.filter((r) => r.status === "completed").length

  // Billing for the current calendar year, from installments (cash basis)
  const billing = React.useMemo(() => {
    const months = MONTHS.map((month) => ({ month, paid: 0, scheduled: 0, target: ANNUAL_TARGET / 12 }))
    for (const { project } of allRows) {
      for (const i of project.installments) {
        if (i.dueDate.startsWith(thisYear)) months[Number(i.dueDate.slice(5, 7)) - 1].scheduled += i.amount
        if (i.status === "paid" && i.paidDate?.startsWith(thisYear)) months[Number(i.paidDate.slice(5, 7)) - 1].paid += i.amount
      }
    }
    return months
  }, [allRows, thisYear])
  const ytdCollected = billing.reduce((s, m) => s + m.paid, 0)
  const monthsLeft = 12 - Number(today.slice(5, 7))

  const byType = (Object.keys(projectTypeLabel) as ProjectType[])
    .map((t) => ({ type: t, label: projectTypeLabel[t], value: scoped.filter((r) => r.project.type === t).reduce((s, r) => s + r.finance.contract, 0), fill: typeColors[t] }))
    .filter((d) => d.value > 0)
  const typeConfig = Object.fromEntries(byType.map((d) => [d.label, { label: d.label, color: d.fill }])) satisfies ChartConfig

  const top5 = [...scoped].sort((a, b) => b.finance.profit - a.finance.profit).slice(0, 5)
  const maxProfit = top5.length ? Math.max(1, top5[0].finance.profit) : 1

  // Follow-ups: overdue installments and change orders waiting for the client
  const overdueItems = scoped
    .flatMap(({ project }) =>
      project.installments.filter((i) => i.status === "invoiced" && i.dueDate < today).map((i) => ({ project, i, days: differenceInCalendarDays(parseISO(today), parseISO(i.dueDate)) })),
    )
    .sort((a, b) => b.days - a.days)
  const pendingCos = scoped.flatMap(({ project }) => project.changeOrders.filter((c) => c.status === "pending").map((c) => ({ project, c })))

  const rows = React.useMemo(
    () =>
      scoped
        .filter((r) => (status === "all" || r.status === status) && r.project.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => {
          const av = sortValue(a, sort.key)
          const bv = sortValue(b, sort.key)
          const res = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number)
          return sort.dir === "asc" ? res : -res
        }),
    [scoped, status, q, sort],
  )
  const rowContract = rows.reduce((s, r) => s + r.finance.contract, 0)
  const rowCost = rows.reduce((s, r) => s + r.finance.totalCost, 0)

  return (
    <>
      <PageHeader
        title="ภาพรวมผู้บริหาร"
        description="ยอดขาย โครงการ และผลกำไรของ INFINI I.A. — คำนวณจากโมดูลโครงการ งวดเงิน Change Order และ Timesheet"
        actions={
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-44 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกปี (เซ็นสัญญา)</SelectItem>
              {yearsBE.map((y) => (
                <SelectItem key={y} value={y}>
                  เซ็นสัญญาปี {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <p>
          ชื่อโครงการมาจาก Portfolio บนเว็บไซต์บริษัท ส่วน<strong>ตัวเลขเริ่มต้นเป็นข้อมูลจำลอง</strong> — เมื่ออัปเดตเฟสงาน งวดเงิน Change Order หรือชั่วโมงงาน
          ตัวเลขในหน้านี้จะเปลี่ยนตามทันที
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="มูลค่าสัญญารวม"
          value={formatMillion(totals.contract)}
          icon={BriefcaseIcon}
          hint={`${scoped.length} โครงการ · CO ${totals.changeOrders >= 0 ? "+" : ""}${formatMillion(totals.changeOrders)}`}
        />
        <StatCard label="กำไรขั้นต้นคาดการณ์" value={formatMillion(totals.profit)} icon={TrendingUpIcon} tone="success" hint={`อัตรากำไร ${formatPercent(totals.margin)} · หักค่าแรงออกแบบแล้ว`} />
        <StatCard label="เก็บเงินแล้ว" value={formatMillion(totals.collected)} icon={BanknoteIcon} tone="warning" hint={`ค้างรับ ${formatMillion(totals.contract - totals.collected)}`} />
        <StatCard
          label="งวดเงินเกินกำหนด"
          value={formatMillion(totals.overdue)}
          icon={AlertTriangleIcon}
          tone="danger"
          hint={`${overdueItems.length} งวด · CO รออนุมัติ ${totals.pendingCo} · เสร็จแล้ว ${completed} โครงการ`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>รายรับตามงวดเงิน ปี {Number(thisYear) + 543}</CardTitle>
            <CardDescription>หน่วย: ล้านบาท · ทุกโครงการ (ไม่ขึ้นกับตัวกรองปี)</CardDescription>
            <CardAction className="text-right">
              <p className="text-xs text-muted-foreground">รับแล้วปีนี้</p>
              <p className="font-semibold tabular-nums">{formatMillion(ytdCollected)}</p>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={billingConfig} className="h-72 w-full">
              <ComposedChart data={billing} margin={{ left: -16, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={millionTick} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{billingConfig[name as keyof typeof billingConfig]?.label}</span>
                          <span className="font-medium tabular-nums">{formatMillion(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="scheduled" fill="var(--color-scheduled)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
                <Line dataKey="target" type="step" stroke="var(--color-target)" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>เป้ารายรับปี {Number(thisYear) + 543}</CardTitle>
            <CardDescription>เงินที่รับจริงเทียบเป้าทั้งปี</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold tabular-nums">{formatPercent(ytdCollected / ANNUAL_TARGET, 0)}</p>
                <p className="text-right text-xs text-muted-foreground">
                  {formatMillion(ytdCollected, 0)}
                  <br />
                  จาก {formatMillion(ANNUAL_TARGET, 0)}
                </p>
              </div>
              <Progress value={Math.min(100, (ytdCollected / ANNUAL_TARGET) * 100)} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {ytdCollected >= ANNUAL_TARGET
                  ? "ถึงเป้าแล้ว"
                  : `เหลืออีก ${formatMillion(ANNUAL_TARGET - ytdCollected)}${monthsLeft > 0 ? ` ใน ${monthsLeft} เดือน` : ""}`}{" "}
                · ต้นทุนแรงงานออกแบบรวม {formatMillion(totals.laborCost)}
              </p>
            </div>
            <Separator />
            <div className="space-y-2.5">
              <p className="text-sm font-medium">
                Pipeline การขาย <span className="text-xs font-normal text-muted-foreground">(ตัวอย่าง — รอโมดูล CRM)</span>
              </p>
              {pipeline.map((s, i) => (
                <div key={s.stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.stage}</span>
                    <span className="tabular-nums">
                      {s.count} ราย{s.value > 0 && <span className="text-muted-foreground"> · {formatMillion(s.value, 0)}</span>}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / pipeline[0].count) * 100}%`, opacity: 1 - i * 0.12 }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>ต้องติดตาม</CardTitle>
            <CardDescription>งวดเงินเกินกำหนดและ Change Order ที่รอลูกค้า</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueItems.length === 0 && pendingCos.length === 0 && <EmptyState title="ไม่มีรายการค้าง 🎉" />}
            {overdueItems.length > 0 && (
              <ul className="space-y-2">
                {overdueItems.slice(0, 5).map(({ project, i, days }) => (
                  <li key={i.id}>
                    <Link to={`/projects/${project.id}`} className="flex items-start justify-between gap-2 rounded-md p-1.5 text-sm hover:bg-muted">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{project.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{i.title}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-medium tabular-nums">{formatMillion(i.amount, 1)}</span>
                        <span className="block text-xs text-destructive">เกิน {days} วัน</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {pendingCos.length > 0 && (
              <>
                <Separator />
                <ul className="space-y-2">
                  {pendingCos.map(({ project, c }) => (
                    <li key={c.id}>
                      <Link to={`/projects/${project.id}`} className="flex items-start justify-between gap-2 rounded-md p-1.5 text-sm hover:bg-muted">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{project.name}</span>
                        </span>
                        <Tag type="warning">{formatMillion(c.amount, 1)}</Tag>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>มูลค่าตามประเภทงาน</CardTitle>
            <CardDescription>สัดส่วนมูลค่าสัญญา (รวม CO)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={typeConfig} className="mx-auto aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel formatter={(v, n) => `${n}: ${formatMillion(Number(v))}`} />} />
                <Pie data={byType} dataKey="value" nameKey="label" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {byType.map((d) => (
                    <Cell key={d.type} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-2 text-sm">
              {byType.map((d) => (
                <li key={d.type} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: d.fill }} />
                  <span className="flex-1 text-muted-foreground">{d.label}</span>
                  <span className="font-medium tabular-nums">{formatMillion(d.value, 0)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5 โครงการกำไรสูงสุด</CardTitle>
            <CardDescription>หลังหักต้นทุนวัสดุ ผู้รับเหมา และค่าแรงออกแบบ</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3.5">
              {top5.map(({ project, finance }, i) => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="block space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">
                        <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                        <span className="font-medium hover:underline">{project.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatMillion(finance.profit)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${(finance.profit / maxProfit) * 100}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
              {top5.length === 0 && <EmptyState title="ไม่มีโครงการในปีที่เลือก" />}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>โครงการทั้งหมด</CardTitle>
          <CardDescription>คลิกที่โครงการเพื่อดูเฟสงาน งวดเงิน และ Change Order</CardDescription>
          <CardAction>
            <Button variant="link" asChild className="h-auto p-0">
              <Link to="/projects">
                จัดการโครงการ <ArrowRightIcon />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-72">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="ค้นหาชื่อโครงการ..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                {(Object.keys(projectStatusLabel) as ProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {projectStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <SortHead sort={sort} onSort={onSort} k="name" label="โครงการ" />
                  <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                  <SortHead sort={sort} onSort={onSort} k="contract" label="มูลค่าสัญญา" className="text-right" />
                  <TableHead className="hidden text-right lg:table-cell">ต้นทุนรวม</TableHead>
                  <SortHead sort={sort} onSort={onSort} k="profit" label="กำไร" className="text-right" />
                  <SortHead sort={sort} onSort={onSort} k="margin" label="% กำไร" className="hidden text-right sm:table-cell" />
                  <SortHead sort={sort} onSort={onSort} k="progress" label="ความคืบหน้า" className="hidden w-40 xl:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ project: p, status: st, finance: f }) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {projectTypeLabel[p.type]} · {p.location}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Tag type={projectStatusTag[st]} dot>
                        {projectStatusLabel[st]}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMillion(f.contract)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">{formatMillion(f.totalCost)}</TableCell>
                    <TableCell className="text-right font-medium text-success tabular-nums">{formatMillion(f.profit)}</TableCell>
                    <TableCell className={cn("hidden text-right font-medium tabular-nums sm:table-cell", marginTone(f.margin))}>{formatPercent(f.margin)}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={f.progress} className="h-1.5" />
                        <span className="w-9 text-right text-xs tabular-nums">{f.progress}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState title="ไม่พบโครงการ" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium">รวม {rows.length} โครงการ</TableCell>
                    <TableCell className="hidden md:table-cell" />
                    <TableCell className="text-right font-semibold tabular-nums">{formatMillion(rowContract)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatMillion(rowCost)}</TableCell>
                    <TableCell className="text-right font-semibold text-success tabular-nums">{formatMillion(rowContract - rowCost)}</TableCell>
                    <TableCell className="hidden text-right font-semibold tabular-nums sm:table-cell">
                      {formatPercent(rowContract ? (rowContract - rowCost) / rowContract : 0)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
