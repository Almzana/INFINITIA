import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/lib/theme"
import { CalendarPlusIcon, MoonIcon, SunIcon, UserIcon, UserPlusIcon } from "lucide-react"
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
import { allNavItems } from "./nav"

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { state } = useStore()

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
    <CommandDialog open={open} onOpenChange={onOpenChange} title="ค้นหา" description="ค้นหาเมนู พนักงาน หรือคำสั่ง">
      <Command>
      <CommandInput placeholder="พิมพ์เพื่อค้นหาเมนู พนักงาน หรือคำสั่ง..." />
      <CommandList>
        <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
        <CommandGroup heading="เมนู">
          {allNavItems.map((item) => (
            <CommandItem key={item.url} value={`${item.title} ${item.keywords ?? ""}`} onSelect={() => run(() => navigate(item.url))}>
              <item.icon />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="ทางลัด">
          <CommandItem onSelect={() => run(() => navigate("/employees?new=1"))}>
            <UserPlusIcon /> เพิ่มพนักงานใหม่
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/leave?new=1"))}>
            <CalendarPlusIcon /> ยื่นใบลา
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <SunIcon /> โหมดสว่าง
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <MoonIcon /> โหมดมืด
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="พนักงาน">
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
