import * as React from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router-dom"
import { useTheme } from "@/lib/theme"
import { BellIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Kbd } from "@/components/shared/kbd"
import { activities } from "@/data/mock"
import { useAuth } from "@/lib/auth"
import { AppSidebar } from "./app-sidebar"
import { CommandMenu } from "./command-menu"
import { findNav } from "./nav"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="สลับธีม">
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

function Notifications() {
  const [unread, setUnread] = React.useState(3)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="การแจ้งเตือน">
          <BellIcon />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-medium">การแจ้งเตือน</p>
          <Button variant="link" size="xs" className="h-auto p-0" onClick={() => setUnread(0)}>
            อ่านทั้งหมด
          </Button>
        </div>
        <ul className="max-h-80 divide-y overflow-auto">
          {activities.map((a, i) => (
            <li key={a.id} className="flex gap-3 px-4 py-3 text-sm">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i < unread ? "bg-primary" : "bg-transparent"}`} />
              <div>
                <p>
                  <span className="font-medium">{a.who}</span> {a.what}
                </p>
                <p className="text-xs text-muted-foreground">{a.when}</p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export function AppLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const current = findNav(pathname)

  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

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
                  <Link to="/">หน้าแรก</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {current && current.url !== "/" && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{current.title}</BreadcrumbPage>
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
              <span className="hidden flex-1 text-left font-normal sm:inline">ค้นหา...</span>
              <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
            </Button>
            <Notifications />
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
