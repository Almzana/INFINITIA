import * as React from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router-dom"
import { useTheme } from "@/lib/theme"
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Kbd } from "@/components/shared/kbd"
import { useDataSync } from "@/hooks/use-data-sync"
import { canSeePage } from "@/lib/access"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"
import { AppSidebar } from "./app-sidebar"
import { CommandMenu } from "./command-menu"
import { findNav } from "./nav"
import { NotificationsBell } from "./notifications-bell"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={t("layout.toggleTheme")}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export function AppLayout() {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const current = findNav(pathname)
  useDataSync()

  if (!user) return <Navigate to="/login" replace state={{ from: pathname + search }} />
  // Typed URLs too: a page this role may not open goes back to the dashboard
  // A password set by HR must be replaced before anything else (the API enforces this too)
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />
  if (current && !canSeePage(current.url, user.role)) return <Navigate to="/" replace />

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-page">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t("layout.home")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {current && current.url !== "/" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{t(current.titleKey)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              className="w-9 justify-start gap-2 px-2.5 text-muted-foreground sm:w-64"
              onClick={() => setCmdOpen(true)}
            >
              <SearchIcon />
              <span className="hidden flex-1 text-left font-normal sm:inline">{t("layout.searchPlaceholder")}</span>
              <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
            </Button>
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 space-y-6 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
    </SidebarProvider>
  )
}
