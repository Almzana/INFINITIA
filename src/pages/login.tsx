import * as React from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { EyeIcon, EyeOffIcon, LoaderIcon, LockIcon, MailIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BRAND, BrandMark, Wordmark } from "@/components/shared/brand"
import { FormItem } from "@/components/shared/misc"
import { type Role, roleLabel, useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = React.useState("admin@infini-ia.com")
  const [password, setPassword] = React.useState("")
  const [show, setShow] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [role, setRole] = React.useState<Role>("executive")
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({})

  if (user) return <Navigate to="/" replace />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "กรุณากรอกอีเมลให้ถูกต้อง"
    if (password.length < 4) next.password = "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"
    setErrors(next)
    if (Object.keys(next).length) return

    setLoading(true)
    setTimeout(() => {
      login(email, role)
      toast.success("เข้าสู่ระบบสำเร็จ", { description: "ยินดีต้อนรับกลับมา" })
      const from = (location.state as { from?: string } | null)?.from ?? "/"
      navigate(from, { replace: true })
    }, 700)
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#2f2b28] p-10 text-[#ece7e0] lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#5d574f_0%,transparent_60%)] opacity-60" />
        <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-[#8c8277]/60 to-transparent" />
        <Wordmark className="relative text-sm" />
        <div className="relative space-y-5">
          <p className="font-brand text-xs font-light tracking-[0.4em] text-[#b8a58a] uppercase">Welcome to</p>
          <Wordmark className="block text-5xl" />
          <p className="max-w-md font-brand text-sm font-light tracking-wide text-[#ece7e0]/70">The World of {BRAND.tagline}</p>
          <p className="max-w-md pt-4 text-sm text-[#ece7e0]/70">
            ระบบภายในสำหรับทีมสถาปนิก นักออกแบบ และทีมก่อสร้าง — จัดการข้อมูลพนักงาน การลา ห้องประชุม และประกาศได้ในที่เดียว
          </p>
        </div>
        <p className="relative text-xs tracking-wide text-[#ece7e0]/50">© 2026 {BRAND.name} · {BRAND.domain}</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6" noValidate>
          <div className="space-y-2 text-center lg:text-left">
            <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
              <BrandMark className="size-11 rounded-xl text-sm" />
              <Wordmark className="text-sm" />
            </div>
            <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
            <p className="text-sm text-muted-foreground">ใช้อีเมลบริษัท (@{BRAND.domain}) เพื่อเข้าสู่ระบบ</p>
          </div>

          <div className="space-y-4">
            <FormItem label="อีเมล" required htmlFor="email" error={errors.email}>
              <div className="relative">
                <MailIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="h-10 pl-8"
                  value={email}
                  aria-invalid={!!errors.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </FormItem>
            <FormItem label="รหัสผ่าน" required htmlFor="password" error={errors.password}>
              <div className="relative">
                <LockIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  className="h-10 pr-9 pl-8"
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </FormItem>
            <FormItem label="เข้าสู่ระบบในฐานะ (โหมดสาธิต)">
              <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} className="grid grid-cols-3 gap-2">
                {(Object.keys(roleLabel) as Role[]).map((r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                      role === r && "border-primary bg-primary/5 font-medium",
                    )}
                  >
                    <RadioGroupItem value={r} />
                    {r === "hr" ? "HR" : roleLabel[r]}
                  </label>
                ))}
              </RadioGroup>
            </FormItem>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <Label htmlFor="remember" className="font-normal">
                  จดจำฉันไว้
                </Label>
              </div>
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => toast.info("กรุณาติดต่อฝ่ายไอที ต่อ 1234")}>
                ลืมรหัสผ่าน?
              </Button>
            </div>
          </div>

          <Button type="submit" size="lg" className="h-10 w-full" disabled={loading}>
            {loading && <LoaderIcon className="animate-spin" />}
            เข้าสู่ระบบ
          </Button>
          <p className="text-center text-xs text-muted-foreground">โหมดสาธิต: ใช้อีเมลใดก็ได้ และรหัสผ่าน 4 ตัวขึ้นไป</p>
        </form>
      </div>
    </div>
  )
}
