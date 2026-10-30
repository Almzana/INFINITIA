import * as React from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Holiday } from "@/lib/leaves-api"
import { t } from "@/i18n"

/** HR / executives: add a holiday (an existing date is renamed). */
export function HolidayForm({ onAdd }: { onAdd: (h: Holiday) => Promise<boolean> }) {
  const [date, setDate] = React.useState("")
  const [name, setName] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !name.trim()) return
    setBusy(true)
    const ok = await onAdd({ date, name: name.trim() })
    setBusy(false)
    if (ok) {
      setDate("")
      setName("")
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-2">
      <Input type="date" aria-label={t("leave.holidays.date")} value={date} onChange={(e) => setDate(e.target.value)} required />
      <Input aria-label={t("leave.holidays.name")} placeholder={t("leave.holidays.name")} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} required />
      <Button type="submit" variant="outline" className="col-span-2" disabled={busy || !date || !name.trim()}>
        <PlusIcon /> {t("leave.holidays.add")}
      </Button>
    </form>
  )
}
