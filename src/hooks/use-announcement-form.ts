import * as React from "react"
import { toast } from "sonner"
import type { Announcement } from "@/data/mock"
import { t } from "@/i18n"
import { type AnnouncementInput, announcementsApi } from "@/lib/announcements-api"
import { useStore } from "@/lib/store"

type Errors = { title?: string; body?: string; form?: string }
const empty: AnnouncementInput = { title: "", body: "", category: "ทั่วไป", pinned: false }

/** Create a new announcement, or edit `editing`. */
export function useAnnouncementForm(open: boolean, editing: Announcement | null, onDone: () => void) {
  const { dispatch } = useStore()
  const [form, setForm] = React.useState<AnnouncementInput>(empty)
  const [errors, setErrors] = React.useState<Errors>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(editing ? { title: editing.title, body: editing.body, category: editing.category, pinned: editing.pinned } : empty)
  }, [open, editing])

  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!form.title.trim()) next.title = t("announcements.error.titleRequired")
    if (!form.body.trim()) next.body = t("announcements.error.bodyRequired")
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const input = { ...form, title: form.title.trim(), body: form.body.trim() }
      const saved = editing ? await announcementsApi.update(editing.id, input) : await announcementsApi.create(input)
      dispatch({ type: "announcement/upsert", announcement: saved })
      toast.success(editing ? t("announcements.toast.saved") : t("announcements.toast.published"))
      onDone()
    } catch {
      setErrors({ form: t("announcements.error.saveFailed") })
    } finally {
      setSaving(false)
    }
  }

  return { form, errors, saving, set, submit }
}
