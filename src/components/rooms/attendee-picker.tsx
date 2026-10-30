import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { deptLabel, t } from "@/i18n"
import { useEmployeeMap, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/** Searchable multi-select of employees, shown as removable chips. */
export function AttendeePicker({ value, onChange, disabled }: { value: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
  const { state } = useStore()
  const byId = useEmployeeMap()
  const active = state.employees.filter((e) => e.status !== "resigned")
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((id) => {
          const e = byId.get(id)
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2.5 text-xs">
              {e ? `${e.firstName} ${e.lastName}` : id}
              {!disabled && (
                <button type="button" onClick={() => toggle(id)} className="rounded-full p-0.5 hover:bg-muted" aria-label={t("rooms.attendee.remove", { name: e?.firstName ?? id })}>
                  <XIcon className="size-3" />
                </button>
              )}
            </span>
          )
        })}
        {value.length === 0 && <span className="text-xs text-muted-foreground">{t("rooms.attendee.none")}</span>}
      </div>
      {!disabled && (
        <Popover modal>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <PlusIcon /> {t("rooms.attendee.add")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("rooms.attendee.search")} />
              <CommandList className="max-h-64">
                <CommandEmpty>{t("rooms.attendee.empty")}</CommandEmpty>
                {active.map((e) => (
                  <CommandItem key={e.id} value={`${e.firstName} ${e.lastName} ${e.nickname} ${e.department} ${deptLabel(e.department)} ${e.id}`} onSelect={() => toggle(e.id)}>
                    <CheckIcon className={cn("size-4", value.includes(e.id) ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">
                      {e.firstName} {e.lastName} <span className="text-muted-foreground">· {deptLabel(e.department)}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
