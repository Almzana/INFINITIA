import * as React from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon, TerminalSquareIcon, UserIcon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { BrandMark, Wordmark } from "@/components/shared/brand"
import { deptLabel, t } from "@/i18n"
import { roleLabel, useAuth } from "@/lib/auth"
import { useStore } from "@/lib/store"
import { findNav, navGroupsFor } from "./nav"

export function AppSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { state } = useStore()
  const active = findNav(pathname)
  const { isMobile, setOpenMobile } = useSidebar()

  // On phones the sidebar is an overlay sheet: close it once a link navigates
  React.useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])
  // Badge = requests waiting for me; only approvers have any
  // Requests waiting for me: as Leader, HR or executive (the API marks them)
  const pendingLeaves = state.leaves.filter((l) => l.canDecide).length

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <BrandMark />
                <div className="grid flex-1 text-left leading-tight">
                  <Wordmark className="truncate text-sm" />
                  <span className="truncate text-xs text-muted-foreground">{t("layout.tagline")}</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroupsFor(user?.role).map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={active?.url === item.url} tooltip={t(item.titleKey)}>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{t(item.titleKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.url === "/leave" && pendingLeaves > 0 && (
                    <SidebarMenuBadge className="bg-destructive! text-white!">{pendingLeaves}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <EmployeeAvatar
                    person={state.employees.find((e) => e.id === user?.employeeId)}
                    name={user?.name}
                    className="size-8 rounded-lg"
                    fallbackClassName="rounded-lg"
                  />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user && roleLabel[user.role]} · {user && deptLabel(user.department)}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <UserIcon /> {t("layout.myProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <SettingsIcon /> {t("nav.settings")}
                </DropdownMenuItem>
                {user?.isDeveloper && (
                  <DropdownMenuItem onClick={() => navigate("/dev")}>
                    <TerminalSquareIcon /> {t("dev.title")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOutIcon /> {t("layout.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
