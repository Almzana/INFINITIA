import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/lib/theme"
import { BriefcaseIcon, CalendarPlusIcon, FolderPlusIcon, MoonIcon, SunIcon, UserIcon, UserPlusIcon } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useStore } from "@/lib/store"
import { can, canSeePage } from "@/lib/access"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"
import { allNavItems } from "./nav"

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { state } = useStore()
  const role = useAuth().user?.role

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const run = (fn: () => void) => {
    onOpenChange(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t("common.search")} description={t("layout.cmd.description")}>
      <Command>
      <CommandInput placeholder={t("layout.cmd.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("layout.cmd.empty")}</CommandEmpty>
        <CommandGroup heading={t("common.menu")}>
          {allNavItems.filter((i) => canSeePage(i.url, role)).map((item) => (
            <CommandItem key={item.url} value={`${t(item.titleKey)} ${item.keywords ?? ""}`} onSelect={() => run(() => navigate(item.url))}>
              <item.icon />
              {t(item.titleKey)}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("layout.cmd.shortcuts")}>
          {can.manageEmployees(role) && (
            <CommandItem onSelect={() => run(() => navigate("/employees?new=1"))}>
              <UserPlusIcon /> {t("layout.cmd.newEmployee")}
            </CommandItem>
          )}
          {can.viewProjects(role) && (
            <CommandItem onSelect={() => run(() => navigate("/projects?new=1"))}>
              <FolderPlusIcon /> {t("layout.cmd.newProject")}
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(() => navigate("/leave?new=1"))}>
            <CalendarPlusIcon /> {t("layout.cmd.newLeave")}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <SunIcon /> {t("layout.cmd.lightMode")}
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <MoonIcon /> {t("layout.cmd.darkMode")}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("nav.projects")}>
          {(can.viewProjects(role) ? state.projects : []).map((p) => (
            <CommandItem key={p.id} value={`${p.name} ${p.id} ${p.manager}`} onSelect={() => run(() => navigate(`/projects/${p.id}`))}>
              <BriefcaseIcon />
              {p.name}
              <CommandShortcut>{p.id}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("nav.employees")}>
          {state.employees.slice(0, 40).map((e) => (
            <CommandItem
              key={e.id}
              value={`${e.firstName} ${e.lastName} ${e.nickname} ${e.code} ${e.department}`}
              onSelect={() => run(() => navigate(`/employees?view=${e.id}`))}
            >
              <UserIcon />
              {e.firstName} {e.lastName}
              <span className="text-muted-foreground">({e.nickname})</span>
              <CommandShortcut>{e.code}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
