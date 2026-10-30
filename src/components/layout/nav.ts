import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  CalendarCheckIcon,
  DoorOpenIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  ScrollTextIcon,
  SettingsIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react"
import { canSeePage } from "@/lib/access"
import type { Role } from "@/lib/auth"

export interface NavItem {
  /** Translation key: render with t(item.titleKey) */
  titleKey: string
  url: string
  icon: LucideIcon
  keywords?: string
}

export const navGroups: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: "nav.group.overview",
    items: [{ titleKey: "nav.dashboard", url: "/", icon: LayoutDashboardIcon, keywords: "dashboard home" }],
  },
  {
    labelKey: "nav.group.projects",
    items: [
      { titleKey: "nav.projects", url: "/projects", icon: BriefcaseIcon, keywords: "project phase installment change order" },
      { titleKey: "nav.timesheet", url: "/timesheet", icon: TimerIcon, keywords: "timesheet hours" },
    ],
  },
  {
    labelKey: "nav.group.people",
    items: [
      { titleKey: "nav.employees", url: "/employees", icon: UsersIcon, keywords: "employee staff" },
      { titleKey: "nav.leave", url: "/leave", icon: CalendarCheckIcon, keywords: "leave" },
    ],
  },
  {
    labelKey: "nav.group.office",
    items: [
      { titleKey: "nav.rooms", url: "/rooms", icon: DoorOpenIcon, keywords: "room booking meeting" },
      { titleKey: "nav.announcements", url: "/announcements", icon: MegaphoneIcon, keywords: "news announcement" },
    ],
  },
  {
    labelKey: "nav.group.system",
    items: [
      { titleKey: "nav.settings", url: "/settings", icon: SettingsIcon, keywords: "settings profile password" },
      { titleKey: "nav.audit", url: "/audit", icon: ScrollTextIcon, keywords: "audit log history activity" },
    ],
  },
]

export const allNavItems = navGroups.flatMap((g) => g.items)

export function findNav(pathname: string) {
  return allNavItems.find((i) => (i.url === "/" ? pathname === "/" : pathname.startsWith(i.url)))
}

/** Menu groups filtered to what this role may open (see lib/access.ts). */
export function navGroupsFor(role: Role | undefined) {
  return navGroups.map((g) => ({ ...g, items: g.items.filter((i) => canSeePage(i.url, role)) })).filter((g) => g.items.length > 0)
}
