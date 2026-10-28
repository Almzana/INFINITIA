import * as React from "react"
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  BriefcaseIcon,
  CalendarIcon,
  CoinsIcon,
  InfoIcon,
  MapPinIcon,
  RulerIcon,
  SearchIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
} from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/misc"
import { Tag, type TagType } from "@/components/shared/tag"
import {
  ANNUAL_TARGET,
  marginOf,
  monthlyFinance,
  pipeline,
  profitOf,
  type Project,
  type ProjectStatus,
  type ProjectType,
  projects,
  projectStatusLabel,
  projectTypeLabel,
} from "@/data/projects"
import { formatDate, formatMillion, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const statusTag: Record<ProjectStatus, TagType> = { completed: "success", handover: "primary", "in-progress": "warning", design: "info" }
const typeColors: Record<ProjectType, string> = {
  "design-build": "#3a352e",
  architecture: "#b8a58a",
  interior: "#8c8277",
  construction: "#a35f4f",
}

const financeConfig = {
  revenue: { label: "รายได้", color: "var(--chart-1)" },
  cost: { label: "ต้นทุน", color: "var(--chart-2)" },
  profit: { label: "กำไร", color: "var(--success)" },
  target: { label: "เป้าหมาย", color: "var(--chart-4)" },
} satisfies ChartConfig

const millionTick = (v: number) => `${Math.round(v / 1_000_000)}`

type SortKey = "name" | "value" | "profit" | "margin" | "progress"

function marginTone(m: number) {
  if (m >= 0.25) return "text-success"
  if (m >= 0.2) return "text-foreground"
  return "text-warning"
}

type Sort = { key: SortKey; dir: "asc" | "desc" }

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

function ProjectSheet({ project, onClose }: { project: Project | null; onClose: () => void }) {
  return (
    <Sheet open={!!project} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        {project && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap gap-2">
                <Tag type={statusTag[project.status]} dot>
                  {projectStatusLabel[project.status]}
                </Tag>
                <Tag type="info">{projectTypeLabel[project.type]}</Tag>
              </div>
              <SheetTitle className="font-brand text-lg font-medium tracking-wide uppercase">{project.name}</SheetTitle>
              <SheetDescription>รหัสโครงการ {project.id}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 overflow-auto px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "มูลค่าสัญญา", value: formatMillion(project.value) },
                  { label: "ต้นทุน", value: formatMillion(project.cost) },
                  { label: "กำไรขั้นต้น", value: formatMillion(profitOf(project)), tone: "text-success" },
                  { label: "อัตรากำไร", value: formatPercent(marginOf(project)), tone: marginTone(marginOf(project)) },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={cn("text-lg font-semibold tabular-nums", s.tone)}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ความคืบหน้างาน</span>
                  <span className="font-medium tabular-nums">{project.progress}%</span>
                </div>
                <Progress value={project.progress} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">เก็บเงินแล้ว</span>
                  <span className="font-medium tabular-nums">
                    {formatMillion(project.collected)} ({formatPercent(project.collected / project.value, 0)})
                  </span>
                </div>
                <Progress value={(project.collected / project.value) * 100} />
                <p className="text-xs text-muted-foreground">คงค้างรับ {formatMillion(project.value - project.collected)}</p>
              </div>

              <Separator />
              <dl className="space-y-3 text-sm">
                {[
                  { icon: MapPinIcon, label: "ที่ตั้ง", value: project.location },
                  { icon: RulerIcon, label: "พื้นที่ใช้สอย", value: `${project.areaSqm.toLocaleString()} ตร.ม.` },
                  { icon: CalendarIcon, label: "ระยะเวลา", value: `${formatDate(project.start, "MMM yyyy")} – ${formatDate(project.end, "MMM yyyy")}` },
                  { icon: UserIcon, label: "ผู้ดูแลโครงการ", value: project.manager },
                  { icon: CoinsIcon, label: "มูลค่าต่อ ตร.ม.", value: `฿${Math.round(project.value / project.areaSqm).toLocaleString()}` },
                ].map((r) => (
                  <div key={r.label} className="flex items-start gap-3">
                    <r.icon className="mt-0.5 size-4 text-muted-foreground" />
                    <dt className="w-28 shrink-0 text-muted-foreground">{r.label}</dt>
                    <dd className="font-medium">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default function ExecutiveDashboard() {
  const [year, setYear] = React.useState("all")
  const [status, setStatus] = React.useState<"all" | ProjectStatus>("all")
  const [q, setQ] = React.useState("")
  const [sort, setSort] = React.useState<Sort>({ key: "profit", dir: "desc" })
  const onSort = (k: SortKey) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "desc" ? "asc" : "desc" }))
  const [viewing, setViewing] = React.useState<Project | null>(null)

  // Year filter = projects whose contract was signed (started) in that year
  const scoped = projects.filter((p) => year === "all" || String(Number(p.start.slice(0, 4)) + 543) === year)

  const totals = React.useMemo(() => {
    const value = scoped.reduce((s, p) => s + p.value, 0)
    const cost = scoped.reduce((s, p) => s + p.cost, 0)
    const collected = scoped.reduce((s, p) => s + p.collected, 0)
    return { value, cost, profit: value - cost, collected, margin: value ? (value - cost) / value : 0 }
  }, [scoped])

  const completed = scoped.filter((p) => p.status === "completed").length
  const active = scoped.filter((p) => p.status !== "completed").length
  const ytdRevenue = monthlyFinance.reduce((s, m) => s + m.revenue, 0)
  const ytdProfit = monthlyFinance.reduce((s, m) => s + m.profit, 0)

  const byType = (Object.keys(projectTypeLabel) as ProjectType[])
    .map((t) => ({ type: t, label: projectTypeLabel[t], value: scoped.filter((p) => p.type === t).reduce((s, p) => s + p.value, 0), fill: typeColors[t] }))
    .filter((d) => d.value > 0)
  const typeConfig = Object.fromEntries(byType.map((d) => [d.label, { label: d.label, color: d.fill }])) satisfies ChartConfig

  const top5 = [...scoped].sort((a, b) => profitOf(b) - profitOf(a)).slice(0, 5)
  const maxProfit = top5.length ? profitOf(top5[0]) : 1

  const rows = React.useMemo(() => {
    const val = (p: Project) =>
      sort.key === "name" ? p.name : sort.key === "value" ? p.value : sort.key === "profit" ? profitOf(p) : sort.key === "margin" ? marginOf(p) : p.progress
    return scoped
      .filter((p) => (status === "all" || p.status === status) && p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const av = val(a)
        const bv = val(b)
        const r = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number)
        return sort.dir === "asc" ? r : -r
      })
  }, [scoped, status, q, sort])

  const rowTotals = {
    value: rows.reduce((s, p) => s + p.value, 0),
    cost: rows.reduce((s, p) => s + p.cost, 0),
  }

  return (
    <>
      <PageHeader
        title="ภาพรวมผู้บริหาร"
        description="ยอดขาย โครงการ และผลกำไรของ INFINI I.A."
        actions={
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-44 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกปี (เซ็นสัญญา)</SelectItem>
              {["2569", "2568", "2567", "2566"].map((y) => (
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
          ชื่อโครงการมาจาก Portfolio บนเว็บไซต์บริษัท ส่วน<strong>ตัวเลขการเงินทั้งหมดเป็นข้อมูลจำลอง</strong> — รอเชื่อมต่อกับระบบบัญชี/ERP
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="มูลค่าสัญญารวม" value={formatMillion(totals.value)} icon={BriefcaseIcon} hint={`${scoped.length} โครงการ`} />
        <StatCard label="กำไรขั้นต้นรวม" value={formatMillion(totals.profit)} icon={TrendingUpIcon} tone="success" hint={`อัตรากำไร ${formatPercent(totals.margin)}`} />
        <StatCard label="เก็บเงินแล้ว" value={formatMillion(totals.collected)} icon={BanknoteIcon} tone="warning" hint={`ค้างรับ ${formatMillion(totals.value - totals.collected)}`} />
        <StatCard label="สถานะโครงการ" value={`${completed} / ${active}`} icon={TargetIcon} tone="danger" hint="เสร็จแล้ว / กำลังดำเนินการ" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>รายได้ ต้นทุน และกำไร ปี 2569</CardTitle>
            <CardDescription>หน่วย: ล้านบาท · รับรู้รายได้ตามความคืบหน้างาน</CardDescription>
            <CardAction className="text-right">
              <p className="text-xs text-muted-foreground">รายได้สะสม</p>
              <p className="font-semibold tabular-nums">{formatMillion(ytdRevenue)}</p>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={financeConfig} className="h-72 w-full">
              <ComposedChart data={monthlyFinance} margin={{ left: -16, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={millionTick} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{financeConfig[name as keyof typeof financeConfig]?.label}</span>
                          <span className="font-medium tabular-nums">{formatMillion(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
                <Line dataKey="profit" type="monotone" stroke="var(--color-profit)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line dataKey="target" type="step" stroke="var(--color-target)" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>เป้าหมายยอดขายปี 2569</CardTitle>
            <CardDescription>เทียบรายได้สะสมกับเป้าทั้งปี</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold tabular-nums">{formatPercent(ytdRevenue / ANNUAL_TARGET, 0)}</p>
                <p className="text-right text-xs text-muted-foreground">
                  {formatMillion(ytdRevenue, 0)}
                  <br />
                  จาก {formatMillion(ANNUAL_TARGET, 0)}
                </p>
              </div>
              <Progress value={(ytdRevenue / ANNUAL_TARGET) * 100} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                เหลืออีก {formatMillion(ANNUAL_TARGET - ytdRevenue)} ใน 2 เดือน · กำไรสะสม {formatMillion(ytdProfit)}
              </p>
            </div>
            <Separator />
            <div className="space-y-2.5">
              <p className="text-sm font-medium">Pipeline การขาย</p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>มูลค่าตามประเภทงาน</CardTitle>
            <CardDescription>สัดส่วนมูลค่าสัญญา</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
            <ChartContainer config={typeConfig} className="aspect-square h-48 shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel formatter={(v, n) => `${n}: ${formatMillion(Number(v))}`} />} />
                <Pie data={byType} dataKey="value" nameKey="label" innerRadius={52} outerRadius={84} paddingAngle={2}>
                  {byType.map((d) => (
                    <Cell key={d.type} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="w-full space-y-2.5 text-sm">
              {byType.map((d) => (
                <li key={d.type} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: d.fill }} />
                  <span className="flex-1 text-muted-foreground">{d.label}</span>
                  <span className="font-medium tabular-nums">{formatMillion(d.value, 0)}</span>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{formatPercent(d.value / totals.value, 0)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5 โครงการกำไรสูงสุด</CardTitle>
            <CardDescription>กำไรขั้นต้น (มูลค่าสัญญา − ต้นทุน)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3.5">
              {top5.map((p, i) => (
                <li key={p.id}>
                  <button className="w-full space-y-1.5 text-left" onClick={() => setViewing(p)}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">
                        <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                        <span className="font-medium hover:underline">{p.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatMillion(profitOf(p))}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${(profitOf(p) / maxProfit) * 100}%` }} />
                    </div>
                  </button>
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
          <CardDescription>คลิกที่โครงการเพื่อดูรายละเอียดการเงิน</CardDescription>
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
                  <SortHead sort={sort} onSort={onSort} k="value" label="มูลค่าสัญญา" className="text-right" />
                  <TableHead className="hidden text-right lg:table-cell">ต้นทุน</TableHead>
                  <SortHead sort={sort} onSort={onSort} k="profit" label="กำไร" className="text-right" />
                  <SortHead sort={sort} onSort={onSort} k="margin" label="% กำไร" className="hidden text-right sm:table-cell" />
                  <SortHead sort={sort} onSort={onSort} k="progress" label="ความคืบหน้า" className="hidden w-40 xl:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setViewing(p)}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {projectTypeLabel[p.type]} · {p.location}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Tag type={statusTag[p.status]} dot>
                        {projectStatusLabel[p.status]}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMillion(p.value)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">{formatMillion(p.cost)}</TableCell>
                    <TableCell className="text-right font-medium text-success tabular-nums">{formatMillion(profitOf(p))}</TableCell>
                    <TableCell className={cn("hidden text-right font-medium tabular-nums sm:table-cell", marginTone(marginOf(p)))}>
                      {formatPercent(marginOf(p))}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="h-1.5" />
                        <span className="w-9 text-right text-xs tabular-nums">{p.progress}%</span>
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
                    <TableCell className="text-right font-semibold tabular-nums">{formatMillion(rowTotals.value)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatMillion(rowTotals.cost)}</TableCell>
                    <TableCell className="text-right font-semibold text-success tabular-nums">{formatMillion(rowTotals.value - rowTotals.cost)}</TableCell>
                    <TableCell className="hidden text-right font-semibold tabular-nums sm:table-cell">
                      {formatPercent((rowTotals.value - rowTotals.cost) / rowTotals.value)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProjectSheet project={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
