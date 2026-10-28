import * as React from "react"
import { addDays, format, parseISO } from "date-fns"
import { th } from "date-fns/locale"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormItem, PageHeader } from "@/components/shared/misc"
import { Tag } from "@/components/shared/tag"
import { type Booking, rooms } from "@/data/mock"
import { useAuth } from "@/lib/auth"
import { formatDate, todayISO } from "@/lib/format"
import { newId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const START_HOUR = 8
const END_HOUR = 18
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const slots = Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }, (_, i) => {
  const m = START_HOUR * 60 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`
})
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
const pct = (t: string) => ((toMin(t) - START_HOUR * 60) / ((END_HOUR - START_HOUR) * 60)) * 100

const blockColors = [
  "bg-primary/15 text-primary border-primary/40",
  "bg-success/15 text-success border-success/40",
  "bg-warning/15 text-warning border-warning/40",
  "bg-destructive/15 text-destructive border-destructive/40",
]


function BookDialog({
  open,
  onOpenChange,
  date,
  preset,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  date: string
  preset: { roomId: string; start: string } | null
}) {
  const { state, dispatch } = useStore()
  const { user } = useAuth()
  const [form, setForm] = React.useState({ roomId: rooms[0].id, title: "", date, start: "09:00", end: "10:00" })
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    const start = preset?.start ?? "09:00"
    const endIdx = Math.min(slots.indexOf(start) + 2, slots.length - 1)
    setForm({ roomId: preset?.roomId ?? rooms[0].id, title: "", date, start, end: slots[endIdx] })
    setError(null)
  }, [open, preset, date])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return setError("กรุณาระบุหัวข้อการประชุม")
    if (toMin(form.end) <= toMin(form.start)) return setError("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม")
    const clash = state.bookings.find(
      (b) => b.roomId === form.roomId && b.date === form.date && toMin(b.start) < toMin(form.end) && toMin(form.start) < toMin(b.end),
    )
    if (clash) return setError(`ห้องไม่ว่าง: ชนกับ "${clash.title}" (${clash.start}–${clash.end})`)

    dispatch({ type: "booking/add", booking: { ...form, id: newId(), owner: user?.name ?? "ฉัน" } })
    toast.success("จองห้องสำเร็จ", { description: `${rooms.find((r) => r.id === form.roomId)?.name} · ${form.start}–${form.end}` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>จองห้องประชุม</DialogTitle>
            <DialogDescription>ระบบจะตรวจสอบเวลาซ้อนทับให้อัตโนมัติ</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormItem label="หัวข้อ" required htmlFor="title" className="sm:col-span-2">
              <Input id="title" value={form.title} placeholder="เช่น ประชุมทีมประจำสัปดาห์" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormItem>
            <FormItem label="ห้อง" required className="sm:col-span-2">
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · ชั้น {r.floor} · {r.capacity} ที่นั่ง
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="วันที่" htmlFor="date" className="sm:col-span-2">
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </FormItem>
            {(["start", "end"] as const).map((k) => (
              <FormItem key={k} label={k === "start" ? "เวลาเริ่ม" : "เวลาสิ้นสุด"} required>
                <Select value={form[k]} onValueChange={(v) => setForm({ ...form, [k]: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {slots.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} น.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            ))}
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">ยืนยันการจอง</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BookingBlock({ b, colorIdx, onDelete }: { b: Booking; colorIdx: number; onDelete: (b: Booking) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "absolute inset-y-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left text-xs transition-shadow hover:shadow-md",
            blockColors[colorIdx % blockColors.length],
          )}
          style={{ left: `${pct(b.start)}%`, width: `${pct(b.end) - pct(b.start)}%` }}
        >
          <p className="truncate font-medium">{b.title}</p>
          <p className="truncate opacity-80">
            {b.start}–{b.end}
          </p>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <p className="font-medium">{b.title}</p>
        <p className="text-sm text-muted-foreground">
          {rooms.find((r) => r.id === b.roomId)?.name} · {b.start}–{b.end} น.
        </p>
        <p className="text-sm">ผู้จอง: {b.owner}</p>
        <Button size="sm" variant="destructive" className="w-full" onClick={() => onDelete(b)}>
          <Trash2Icon /> ยกเลิกการจอง
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export default function RoomsPage() {
  const TODAY = todayISO()
  const { state, dispatch } = useStore()
  const [date, setDate] = React.useState(TODAY)
  const [open, setOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<{ roomId: string; start: string } | null>(null)

  const dayBookings = state.bookings.filter((b) => b.date === date)
  const week = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(TODAY), i - 1), "yyyy-MM-dd"))

  const book = (roomId?: string, start?: string) => {
    setPreset(roomId && start ? { roomId, start } : null)
    setOpen(true)
  }

  const remove = (b: Booking) => {
    dispatch({ type: "booking/delete", id: b.id })
    toast.success("ยกเลิกการจองแล้ว", { description: b.title })
  }

  return (
    <>
      <PageHeader
        title="จองห้องประชุม"
        description="ดูตารางห้องว่างและจองได้ทันที — คลิกช่องว่างในตารางเพื่อจองเร็ว"
        actions={
          <Button onClick={() => book()}>
            <PlusIcon /> จองห้อง
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="วันก่อนหน้า" onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}>
              <ChevronLeftIcon />
            </Button>
            <div className="flex flex-1 gap-1.5 overflow-x-auto">
              {week.map((d) => {
                const dt = parseISO(d)
                return (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    className={cn(
                      "flex min-w-14 flex-1 flex-col items-center rounded-lg border px-2 py-1.5 text-xs transition-colors",
                      d === date ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary",
                    )}
                  >
                    <span className="opacity-80">{format(dt, "EEE", { locale: th })}</span>
                    <span className="text-base font-semibold">{format(dt, "d")}</span>
                  </button>
                )
              })}
            </div>
            <Button variant="outline" size="icon" aria-label="วันถัดไป" onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}>
              <ChevronRightIcon />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(date, "EEEEที่ d MMMM yyyy")} {date === TODAY && <Tag className="ml-1">วันนี้</Tag>} — มีการจอง {dayBookings.length} รายการ
          </p>

          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[820px]">
              <div className="flex border-b bg-muted/60 text-xs text-muted-foreground">
                <div className="w-40 shrink-0 border-r px-3 py-2 font-medium">ห้อง</div>
                <div className="relative flex flex-1">
                  {hours.map((h) => (
                    <div key={h} className="flex-1 border-r px-1.5 py-2 last:border-r-0">
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>
              {rooms.map((r, ri) => (
                <div key={r.id} className="flex border-b last:border-b-0">
                  <div className="w-40 shrink-0 border-r px-3 py-2">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UsersIcon className="size-3" /> {r.capacity} · ชั้น {r.floor}
                    </p>
                  </div>
                  <div className="relative h-16 flex-1">
                    <div className="absolute inset-0 flex">
                      {hours.map((h) => (
                        <div key={h} className="flex flex-1 border-r last:border-r-0">
                          {[0, 30].map((m) => (
                            <button
                              key={m}
                              aria-label={`จอง ${r.name} ${h}:${m === 0 ? "00" : "30"}`}
                              className="flex-1 transition-colors hover:bg-primary/5"
                              onClick={() => book(r.id, `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    {dayBookings
                      .filter((b) => b.roomId === r.id)
                      .map((b) => (
                        <BookingBlock key={b.id} b={b} colorIdx={ri} onDelete={remove} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {rooms.map((r) => {
          const count = dayBookings.filter((b) => b.roomId === r.id).length
          return (
            <Card key={r.id} size="sm">
              <CardHeader>
                <CardTitle>{r.name}</CardTitle>
                <CardDescription>
                  ชั้น {r.floor} · {r.capacity} ที่นั่ง
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {r.facilities.map((f) => (
                    <Tag key={f} type="info">
                      {f}
                    </Tag>
                  ))}
                </div>
                <Tag type={count === 0 ? "success" : "warning"} dot>
                  {count === 0 ? "ว่างทั้งวัน" : `จองแล้ว ${count} ช่วง`}
                </Tag>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <BookDialog open={open} onOpenChange={setOpen} date={date} preset={preset} />
    </>
  )
}
