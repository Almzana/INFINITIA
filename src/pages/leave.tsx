import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { differenceInCalendarDays, format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { th } from "react-day-picker/locale"
import { CalendarIcon, CalendarPlusIcon, CheckIcon, HeartPulseIcon, PalmtreeIcon, BriefcaseIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ElPagination } from "@/components/shared/el-pagination"
import { EmptyState, FormItem, PageHeader } from "@/components/shared/misc"
import { Tag, type TagType } from "@/components/shared/tag"
import { type LeaveStatus, type LeaveType, leaveStatusLabel, leaveTypeLabel } from "@/data/mock"
import { formatDate, initials } from "@/lib/format"
import { newId, useEmployeeMap, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const statusTag: Record<LeaveStatus, TagType> = { pending: "warning", approved: "success", rejected: "danger" }
const typeTag: Record<LeaveType, TagType> = { sick: "danger", vacation: "primary", personal: "warning", maternity: "success" }

const balances = [
  { type: "vacation" as const, icon: PalmtreeIcon, used: 5, total: 15, color: "text-primary bg-primary/10" },
  { type: "sick" as const, icon: HeartPulseIcon, used: 2, total: 30, color: "text-destructive bg-destructive/10" },
  { type: "personal" as const, icon: BriefcaseIcon, used: 1, total: 6, color: "text-warning bg-warning/10" },
]

function NewLeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const [type, setType] = React.useState<LeaveType>("vacation")
  const [range, setRange] = React.useState<DateRange | undefined>()
  const [reason, setReason] = React.useState("")
  const [errors, setErrors] = React.useState<{ range?: string; reason?: string }>({})

  React.useEffect(() => {
    if (open) {
      setType("vacation")
      setRange(undefined)
      setReason("")
      setErrors({})
    }
  }, [open])

  const days = range?.from ? differenceInCalendarDays(range.to ?? range.from, range.from) + 1 : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!range?.from) next.range = "กรุณาเลือกวันที่ลา"
    if (reason.trim().length < 3) next.reason = "กรุณาระบุเหตุผล"
    setErrors(next)
    if (Object.keys(next).length || !range?.from) return

    dispatch({
      type: "leave/add",
      leave: {
        id: `LV${newId().slice(0, 4).toUpperCase()}`,
        employeeId: "1",
        type,
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to ?? range.from, "yyyy-MM-dd"),
        days,
        reason,
        status: "pending",
        createdAt: format(new Date(), "yyyy-MM-dd"),
      },
    })
    toast.success("ส่งคำขอลาเรียบร้อย", { description: `${leaveTypeLabel[type]} ${days} วัน — รอหัวหน้าอนุมัติ` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>ยื่นใบลา</DialogTitle>
            <DialogDescription>คำขอจะถูกส่งให้หัวหน้างานพิจารณา</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <FormItem label="ประเภทการลา" required>
              <RadioGroup value={type} onValueChange={(v) => setType(v as LeaveType)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(leaveTypeLabel) as LeaveType[]).map((t) => (
                  <label
                    key={t}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      type === t && "border-primary bg-primary/5 text-primary",
                    )}
                  >
                    <RadioGroupItem value={t} />
                    {leaveTypeLabel[t]}
                  </label>
                ))}
              </RadioGroup>
            </FormItem>
            <FormItem label="วันที่ลา" required error={errors.range}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-invalid={!!errors.range}
                    className={cn("w-full justify-start font-normal", !range?.from && "text-muted-foreground")}
                  >
                    <CalendarIcon />
                    {range?.from
                      ? range.to && range.to.getTime() !== range.from.getTime()
                        ? `${formatDate(format(range.from, "yyyy-MM-dd"))} – ${formatDate(format(range.to, "yyyy-MM-dd"))}`
                        : formatDate(format(range.from, "yyyy-MM-dd"))
                      : "เลือกช่วงวันที่"}
                    {days > 0 && <span className="ml-auto text-primary">{days} วัน</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} locale={th} defaultMonth={new Date(2026, 10)} />
                </PopoverContent>
              </Popover>
            </FormItem>
            <FormItem label="เหตุผล" required htmlFor="reason" error={errors.reason}>
              <Textarea id="reason" rows={3} aria-invalid={!!errors.reason} placeholder="ระบุเหตุผลการลา" value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormItem>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">ส่งคำขอ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function LeavePage() {
  const { state, dispatch } = useStore()
  const employeeMap = useEmployeeMap()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = React.useState<"all" | LeaveStatus>("pending")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [newOpen, setNewOpen] = React.useState(false)

  React.useEffect(() => {
    if (params.get("new")) {
      setNewOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const counts = {
    all: state.leaves.length,
    pending: state.leaves.filter((l) => l.status === "pending").length,
    approved: state.leaves.filter((l) => l.status === "approved").length,
    rejected: state.leaves.filter((l) => l.status === "rejected").length,
  }

  const filtered = state.leaves.filter((l) => tab === "all" || l.status === tab)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const pendingRows = rows.filter((r) => r.status === "pending")
  const allSelected = pendingRows.length > 0 && pendingRows.every((r) => selected.has(r.id))

  const setStatus = (ids: string[], status: LeaveStatus) => {
    dispatch({ type: "leave/status", ids, status })
    setSelected(new Set())
    toast[status === "approved" ? "success" : "warning"](
      `${status === "approved" ? "อนุมัติ" : "ไม่อนุมัติ"} ${ids.length} รายการแล้ว`,
    )
  }

  return (
    <>
      <PageHeader
        title="การลา"
        description="ยื่นใบลา ติดตามสถานะ และอนุมัติคำขอของทีม"
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <CalendarPlusIcon /> ยื่นใบลา
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {balances.map((b) => (
          <Card key={b.type}>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-9 items-center justify-center rounded-lg", b.color)}>
                  <b.icon className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{leaveTypeLabel[b.type]}คงเหลือ</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {b.total - b.used} <span className="text-sm font-normal text-muted-foreground">/ {b.total} วัน</span>
                  </p>
                </div>
              </div>
              <Progress value={(b.used / b.total) * 100} />
              <p className="text-xs text-muted-foreground">ใช้ไปแล้ว {b.used} วัน</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as typeof tab)
                setPage(1)
                setSelected(new Set())
              }}
            >
              <TabsList>
                {(["pending", "approved", "rejected", "all"] as const).map((t) => (
                  <TabsTrigger key={t} value={t} className="gap-1.5">
                    {t === "all" ? "ทั้งหมด" : leaveStatusLabel[t]}
                    <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{counts[t]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => setStatus([...selected], "approved")}>
                  <CheckIcon /> อนุมัติ ({selected.size})
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus([...selected], "rejected")}>
                  <XIcon /> ไม่อนุมัติ
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="เลือกทั้งหมด"
                      disabled={pendingRows.length === 0}
                      checked={allSelected}
                      onCheckedChange={(c) => setSelected(c ? new Set(pendingRows.map((r) => r.id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>พนักงาน</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="hidden md:table-cell">วันที่</TableHead>
                  <TableHead className="hidden text-center sm:table-cell">จำนวน</TableHead>
                  <TableHead className="hidden lg:table-cell">เหตุผล</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => {
                  const emp = employeeMap.get(l.employeeId)
                  return (
                    <TableRow key={l.id} data-state={selected.has(l.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          aria-label={`เลือก ${l.id}`}
                          disabled={l.status !== "pending"}
                          checked={selected.has(l.id)}
                          onCheckedChange={(c) =>
                            setSelected((s) => {
                              const n = new Set(s)
                              if (c) n.add(l.id)
                              else n.delete(l.id)
                              return n
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">{emp ? initials(emp.firstName, emp.lastName) : "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "ไม่พบข้อมูล"}
                            </p>
                            <p className="text-xs text-muted-foreground">{emp?.department}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tag type={typeTag[l.type]}>{leaveTypeLabel[l.type]}</Tag>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {l.from === l.to ? formatDate(l.from) : `${formatDate(l.from, "d MMM")} – ${formatDate(l.to)}`}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums sm:table-cell">{l.days} วัน</TableCell>
                      <TableCell className="hidden max-w-48 truncate text-muted-foreground lg:table-cell">{l.reason}</TableCell>
                      <TableCell>
                        <Tag type={statusTag[l.status]} dot>
                          {leaveStatusLabel[l.status]}
                        </Tag>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="xs" variant="ghost" className="text-success hover:bg-success/10 hover:text-success" onClick={() => setStatus([l.id], "approved")}>
                              อนุมัติ
                            </Button>
                            <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setStatus([l.id], "rejected")}>
                              ปฏิเสธ
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState title="ไม่มีคำขอในหมวดนี้" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <ElPagination
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      <NewLeaveDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  )
}
