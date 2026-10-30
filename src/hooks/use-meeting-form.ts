import * as React from "react"
import { toast } from "sonner"
import type { Booking } from "@/data/mock"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { type MeetingErrors, type MeetingFormValues, toMeetingForm, toMeetingInput, validateMeeting } from "@/lib/meeting-form"
import { meetingsApi } from "@/lib/meetings-api"
import { useStore } from "@/lib/store"

export type MeetingPreset = { roomId: string; start: string } | null

function errorMessage(err: unknown): MeetingErrors {
  if (err instanceof ApiError && err.code === "ROOM_TAKEN") return { form: t("rooms.error.roomTaken") }
  if (err instanceof ApiError && err.status === 403) return { form: t("rooms.error.forbidden") }
  if (err instanceof ApiError && err.status === 400) return { form: err.message }
  return { form: t("common.saveFailed") }
}

/** Create, view/edit (incl. minutes) and cancel a meeting. `meeting` null = new booking. */
export function useMeetingForm(open: boolean, meeting: Booking | null, preset: MeetingPreset, date: string, onDone: () => void) {
  const { state, dispatch } = useStore()
  const [values, setValues] = React.useState<MeetingFormValues>(() => toMeetingForm(null, { roomId: "", date, start: "09:00" }))
  const [errors, setErrors] = React.useState<MeetingErrors>({})
  const [saving, setSaving] = React.useState(false)
  const isNew = !meeting
  const readOnly = !!meeting && !meeting.canEdit

  const reset = React.useEffectEvent(() => {
    setErrors({})
    setValues(toMeetingForm(meeting, { roomId: preset?.roomId ?? state.rooms[0]?.id ?? "", date, start: preset?.start ?? "09:00" }))
  })
  React.useEffect(() => {
    if (open) reset()
  }, [open, meeting, preset])

  const set = <K extends keyof MeetingFormValues>(k: K, v: MeetingFormValues[K]) => setValues((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    const next = validateMeeting(values, state.bookings, meeting?.id)
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const input = toMeetingInput(values)
      const saved = isNew ? await meetingsApi.create(input) : await meetingsApi.update(meeting.id, { ...input, minutes: values.minutes.trim() || null })
      dispatch({ type: "booking/upsert", booking: saved })
      const room = state.rooms.find((r) => r.id === saved.roomId)?.name
      toast.success(isNew ? t("rooms.toast.booked") : t("rooms.toast.saved"), { description: `${room} · ${saved.start}–${saved.end}` })
      onDone()
    } catch (err) {
      setErrors(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const cancelMeeting = async () => {
    if (!meeting) return
    try {
      await meetingsApi.remove(meeting.id)
      dispatch({ type: "booking/delete", id: meeting.id })
      toast.success(t("rooms.toast.cancelled"), { description: meeting.title })
      onDone()
    } catch (err) {
      setErrors(errorMessage(err))
    }
  }

  return { values, errors, saving, isNew, readOnly, set, submit, cancelMeeting }
}
