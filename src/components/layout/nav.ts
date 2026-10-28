import type { LucideIcon } from "lucide-react"
import {
  CalendarCheckIcon,
  DoorOpenIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  keywords?: string
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "ภาพรวม",
    items: [{ title: "แดชบอร์ด", url: "/", icon: LayoutDashboardIcon, keywords: "dashboard home" }],
  },
  {
    label: "งานบุคคล",
    items: [
      { title: "พนักงาน", url: "/employees", icon: UsersIcon, keywords: "employee staff" },
      { title: "การลา", url: "/leave", icon: CalendarCheckIcon, keywords: "leave" },
    ],
  },
  {
    label: "สำนักงาน",
    items: [
      { title: "จองห้องประชุม", url: "/rooms", icon: DoorOpenIcon, keywords: "room booking meeting" },
      { title: "ประกาศ", url: "/announcements", icon: MegaphoneIcon, keywords: "news announcement" },
    ],
  },
  {
    label: "ระบบ",
    items: [{ title: "ตั้งค่า", url: "/settings", icon: SettingsIcon, keywords: "settings profile" }],
  },
]

export const allNavItems = navGroups.flatMap((g) => g.items)

export function findNav(pathname: string) {
  return allNavItems.find((i) => (i.url === "/" ? pathname === "/" : pathname.startsWith(i.url)))
}
