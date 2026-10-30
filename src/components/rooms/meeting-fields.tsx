import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FormItem } from "@/components/shared/misc"
import type { Room } from "@/data/mock"
import { type MeetingErrors, type MeetingFormValues, slots } from "@/lib/meeting-form"
import { t } from "@/i18n"
import { AttendeePicker } from "./attendee-picker"

type Props = {
  values: MeetingFormValues
  errors: MeetingErrors
  set: <K extends keyof MeetingFormValues>(k: K, v: MeetingFormValues[K]) => void
  rooms: Room[]
  readOnly: boolean
  showMinutes: boolean
}

/** Title, room, time, agenda, attendees and (for existing meetings) minutes. */
export function MeetingFields({ values, errors, set, rooms, readOnly, showMinutes }: Props) {
  return (
    <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
      <FormItem label={t("rooms.form.title")} required htmlFor="title" error={errors.title} className="sm:col-span-2">
        <Input id="title" maxLength={200} value={values.title} placeholder={t("rooms.form.titlePlaceholder")} onChange={(e) => set("title", e.target.value)} />
      </FormItem>
      <FormItem label={t("rooms.form.room")} required className="sm:col-span-2">
        <Select value={values.roomId} onValueChange={(v) => set("roomId", v)} disabled={readOnly}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("rooms.form.roomPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} · {t("rooms.floor", { n: r.floor })} · {t("rooms.seats", { n: r.capacity })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
      <FormItem label={t("rooms.form.date")} required htmlFor="date" error={errors.date} className="sm:col-span-2">
        <Input id="date" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
      </FormItem>
      {(["start", "end"] as const).map((k) => (
        <FormItem key={k} label={k === "start" ? t("rooms.form.start") : t("rooms.form.end")} required error={errors[k]}>
          <Select value={values[k]} onValueChange={(v) => set(k, v)} disabled={readOnly}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {slots.map((s) => (
                <SelectItem key={s} value={s}>
                  {t("rooms.timeSuffix", { time: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      ))}
      <FormItem label={t("rooms.form.agenda")} htmlFor="agenda" className="sm:col-span-2">
        <Textarea id="agenda" rows={3} maxLength={4000} placeholder={"1. ...\n2. ..."} value={values.agenda} onChange={(e) => set("agenda", e.target.value)} />
      </FormItem>
      <FormItem label={t("rooms.form.attendees", { n: values.attendeeIds.length })} className="sm:col-span-2">
        <AttendeePicker value={values.attendeeIds} onChange={(ids) => set("attendeeIds", ids)} disabled={readOnly} />
      </FormItem>
      {showMinutes && (
        <FormItem label={t("rooms.form.minutes")} htmlFor="minutes" className="sm:col-span-2">
          <Textarea
            id="minutes"
            rows={5}
            maxLength={20000}
            placeholder={t("rooms.form.minutesPlaceholder")}
            value={values.minutes}
            onChange={(e) => set("minutes", e.target.value)}
          />
        </FormItem>
      )}
    </fieldset>
  )
}
