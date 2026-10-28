import * as React from "react"
import { useTheme } from "@/lib/theme"
import { MonitorIcon, MoonIcon, RotateCcwIcon, SunIcon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormItem, PageHeader } from "@/components/shared/misc"
import { useAuth } from "@/lib/auth"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const notificationOptions = [
  { id: "leave", label: "คำขอลาใหม่", desc: "แจ้งเตือนเมื่อมีลูกทีมยื่นใบลา", default: true },
  { id: "approve", label: "ผลการอนุมัติ", desc: "แจ้งเมื่อคำขอของคุณได้รับการพิจารณา", default: true },
  { id: "announce", label: "ประกาศใหม่", desc: "แจ้งเมื่อมีประกาศจากบริษัท", default: true },
  { id: "room", label: "เตือนก่อนประชุม", desc: "แจ้งเตือนล่วงหน้า 15 นาที", default: false },
  { id: "email", label: "ส่งสรุปทางอีเมล", desc: "สรุปกิจกรรมประจำสัปดาห์ทุกวันจันทร์", default: false },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { dispatch } = useStore()
  const { theme, setTheme } = useTheme()
  const [name, setName] = React.useState(user?.name ?? "")
  const [phone, setPhone] = React.useState("02-123-4567 ต่อ 1001")

  return (
    <>
      <PageHeader title="ตั้งค่า" description="จัดการโปรไฟล์ การแจ้งเตือน และการแสดงผล" />

      <Tabs defaultValue="profile" className="gap-4">
        <TabsList>
          <TabsTrigger value="profile">โปรไฟล์</TabsTrigger>
          <TabsTrigger value="notifications">การแจ้งเตือน</TabsTrigger>
          <TabsTrigger value="appearance">การแสดงผล</TabsTrigger>
          <TabsTrigger value="system">ระบบ</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              <CardDescription>ข้อมูลนี้จะแสดงให้เพื่อนร่วมงานเห็น</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-primary/10 text-xl text-primary">AD</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Button variant="outline" size="sm" onClick={() => toast.info("ฟีเจอร์อัปโหลดรูปพร้อมเชื่อมต่อ API")}>
                    เปลี่ยนรูปโปรไฟล์
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG หรือ PNG ขนาดไม่เกิน 2MB</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormItem label="ชื่อที่แสดง" htmlFor="s-name" required>
                  <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
                </FormItem>
                <FormItem label="อีเมล" htmlFor="s-email">
                  <Input id="s-email" value={user?.email ?? ""} disabled />
                </FormItem>
                <FormItem label="ฝ่าย" htmlFor="s-dept">
                  <Input id="s-dept" value={user?.department ?? ""} disabled />
                </FormItem>
                <FormItem label="เบอร์ติดต่อ" htmlFor="s-phone">
                  <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </FormItem>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              <Button variant="outline">ยกเลิก</Button>
              <Button onClick={() => toast.success("บันทึกโปรไฟล์แล้ว")}>บันทึก</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>การแจ้งเตือน</CardTitle>
              <CardDescription>เลือกเรื่องที่ต้องการรับการแจ้งเตือน</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {notificationOptions.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-sm text-muted-foreground">{o.desc}</p>
                  </div>
                  <Switch defaultChecked={o.default} onCheckedChange={(c) => toast.success(`${c ? "เปิด" : "ปิด"}การแจ้งเตือน: ${o.label}`)} />
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>ธีม</CardTitle>
              <CardDescription>เลือกรูปแบบการแสดงผลที่สบายตาสำหรับคุณ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "light", label: "สว่าง", icon: SunIcon },
                  { value: "dark", label: "มืด", icon: MoonIcon },
                  { value: "system", label: "ตามระบบ", icon: MonitorIcon },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-colors",
                      theme === t.value ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/50",
                    )}
                  >
                    <t.icon className="size-6" />
                    {t.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลสาธิต</CardTitle>
              <CardDescription>ข้อมูลในระบบนี้เก็บไว้ในเบราว์เซอร์ (localStorage) เพื่อการทดลองใช้งาน</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => {
                  dispatch({ type: "reset" })
                  toast.success("รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นแล้ว")
                }}
              >
                <RotateCcwIcon /> รีเซ็ตข้อมูลทั้งหมด
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
