import * as React from "react"
import { Link, Navigate } from "react-router-dom"
import { EyeIcon, EyeOffIcon, LoaderIcon, LockIcon, UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BRAND, BrandMark, Wordmark } from "@/components/shared/brand"
import { FormItem } from "@/components/shared/misc"
import { useLoginForm } from "@/hooks/use-login-form"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"

export default function LoginPage() {
  const { user } = useAuth()
  const { email, setEmail, password, setPassword, loading, errors, submit } = useLoginForm()
  const [show, setShow] = React.useState(false)

  if (user) return <Navigate to="/" replace />

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
            {t("auth.intro")}
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
            <h1 className="text-2xl font-semibold">{t("auth.login")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle", { domain: BRAND.domain })}</p>
          </div>

          <div className="space-y-4">
            <FormItem label={t("auth.usernameLabel")} required htmlFor="email" error={errors.email}>
              <div className="relative">
                <UserIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder={t("auth.usernamePlaceholder", { domain: BRAND.domain })}
                  className="h-10 pl-8"
                  value={email}
                  aria-invalid={!!errors.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </FormItem>
            <FormItem label={t("auth.password")} required htmlFor="password" error={errors.password}>
              <div className="relative">
                <LockIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-10 pr-9 pl-8"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </FormItem>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <Label htmlFor="remember" className="font-normal">
                  {t("auth.rememberMe")}
                </Label>
              </div>
              <Button variant="link" className="h-auto p-0" asChild>
                <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
              </Button>
            </div>
          </div>

          <Button type="submit" size="lg" className="h-10 w-full" disabled={loading}>
            {loading && <LoaderIcon className="animate-spin" />}
            {t("auth.login")}
          </Button>
        </form>
      </div>
    </div>
  )
}
