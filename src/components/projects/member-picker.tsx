import * as React from "react"
import { UserPlusIcon } from "lucide-react"
import { EmployeeAvatar } from "@/components/shared/employee-avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Employee } from "@/data/mock"
import { deptLabel, t } from "@/i18n"

/** Searchable list of active employees who are not members yet; picking one adds them. */
export function MemberPicker({ candidates, onPick }: { candidates: Employee[]; onPick: (e: Employee) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" disabled={candidates.length === 0}>
          <UserPlusIcon /> {t("projects.members.add")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder={t("projects.members.search")} />
          <CommandList>
            <CommandEmpty>{t("common.noData")}</CommandEmpty>
            <CommandGroup heading={t("projects.members.pick")}>
              {candidates.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`${e.firstName} ${e.lastName} ${e.nickname ?? ""} ${e.code}`}
                  onSelect={() => {
                    setOpen(false)
                    onPick(e)
                  }}
                >
                  <EmployeeAvatar person={e} className="size-6" fallbackClassName="text-[10px]" />
                  <span className="min-w-0 flex-1 truncate">
                    {e.firstName} {e.lastName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{deptLabel(e.department)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
