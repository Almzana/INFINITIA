import * as React from "react"
import { format } from "date-fns"
import { MegaphoneIcon, MoreVerticalIcon, PinIcon, PinOffIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, FormItem, PageHeader } from "@/components/shared/misc"
import { Tag, type TagType } from "@/components/shared/tag"
import type { Announcement } from "@/data/mock"
import { useAuth } from "@/lib/auth"
import { formatDate } from "@/lib/format"
import { newId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const categories: Announcement["category"][] = ["ทั่วไป", "HR", "IT", "กิจกรรม"]
const categoryTag: Record<Announcement["category"], TagType> = { ทั่วไป: "info", HR: "primary", IT: "warning", กิจกรรม: "success" }

function NewAnnouncementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { dispatch } = useStore()
  const { user } = useAuth()
  const [form, setForm] = React.useState({ title: "", body: "", category: "ทั่วไป" as Announcement["category"], pinned: false })
  const [errors, setErrors] = React.useState<{ title?: string; body?: string }>({})

  React.useEffect(() => {
    if (open) {
      setForm({ title: "", body: "", category: "ทั่วไป", pinned: false })
      setErrors({})
    }
  }, [open])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.title.trim()) next.title = "กรุณากรอกหัวข้อ"
    if (!form.body.trim()) next.body = "กรุณากรอกเนื้อหา"
    setErrors(next)
    if (Object.keys(next).length) return
    dispatch({
      type: "announcement/add",
      announcement: { ...form, id: newId(), author: user?.department ?? "ผู้ดูแลระบบ", date: format(new Date(), "yyyy-MM-dd") },
    })
    toast.success("เผยแพร่ประกาศแล้ว")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>สร้างประกาศ</DialogTitle>
            <DialogDescription>ประกาศจะแสดงให้พนักงานทุกคนเห็น</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <FormItem label="หัวข้อ" required htmlFor="a-title" error={errors.title}>
              <Input id="a-title" aria-invalid={!!errors.title} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormItem>
            <FormItem label="หมวดหมู่">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Announcement["category"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="เนื้อหา" required htmlFor="a-body" error={errors.body}>
              <Textarea id="a-body" rows={5} aria-invalid={!!errors.body} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </FormItem>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">ปักหมุดประกาศ</p>
                <p className="text-xs text-muted-foreground">แสดงไว้ด้านบนสุดเสมอ</p>
              </div>
              <Switch checked={form.pinned} onCheckedChange={(c) => setForm({ ...form, pinned: c })} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit">เผยแพร่</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AnnouncementsPage() {
  const { state, dispatch } = useStore()
  const [q, setQ] = React.useState("")
  const [cat, setCat] = React.useState<"all" | Announcement["category"]>("all")
  const [open, setOpen] = React.useState(false)

  const list = state.announcements
    .filter((a) => (cat === "all" || a.category === cat) && `${a.title} ${a.body}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader
        title="ประกาศ"
        description="ข่าวสารและประกาศจากหน่วยงานต่างๆ ในองค์กร"
        actions={
          <Button onClick={() => setOpen(true)}>
            <PlusIcon /> สร้างประกาศ
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="bg-background pl-8" placeholder="ค้นหาประกาศ..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...categories] as const).map((c) => (
            <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
              {c === "all" ? "ทั้งหมด" : c}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <Card key={a.id} className={cn(a.pinned && "ring-primary/40")}>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", a.pinned ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  {a.pinned ? <PinIcon className="size-5" /> : <MegaphoneIcon className="size-5" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag type={categoryTag[a.category]}>{a.category}</Tag>
                    {a.pinned && <Tag type="danger">ปักหมุด</Tag>}
                  </div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {a.author} · {formatDate(a.date)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="เมนู">
                      <MoreVerticalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => dispatch({ type: "announcement/pin", id: a.id })}>
                      {a.pinned ? <PinOffIcon /> : <PinIcon />}
                      {a.pinned ? "เลิกปักหมุด" : "ปักหมุด"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        dispatch({ type: "announcement/delete", id: a.id })
                        toast.success("ลบประกาศแล้ว")
                      }}
                    >
                      <Trash2Icon /> ลบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{a.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {list.length === 0 && (
        <Card>
          <EmptyState title="ไม่พบประกาศ" description="ลองเปลี่ยนคำค้นหาหรือหมวดหมู่" />
        </Card>
      )}

      <NewAnnouncementDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
