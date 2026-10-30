import * as React from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { authApi } from "@/lib/auth-api"
import { useAuth } from "@/lib/auth"
import { useStore } from "@/lib/store"
import { t } from "@/i18n"

const PHONE = /^[0-9+()\-\s]*$/

/** My own nickname and phone (HR maintains everything else). */
export function useProfileForm() {
  const { user } = useAuth()
  const { state, dispatch } = useStore()
  // My employee record; accounts without one cannot edit these fields
  const me = state.employees.find((e) => e.id === user?.employeeId)
  const [nickname, setNickname] = React.useState(me?.nickname ?? "")
  const [phone, setPhone] = React.useState(me?.phone ?? "")
  const [phoneError, setPhoneError] = React.useState<string>()
  const [loading, setLoading] = React.useState(false)

  // The store may load after the first render: take the record's values once it arrives
  const [syncedId, setSyncedId] = React.useState(me?.id)
  if (me?.id !== syncedId) {
    setSyncedId(me?.id)
    setNickname(me?.nickname ?? "")
    setPhone(me?.phone ?? "")
  }

  const reset = () => {
    setNickname(me?.nickname ?? "")
    setPhone(me?.phone ?? "")
    setPhoneError(undefined)
  }

  const save = async () => {
    if (!me) return
    const patch = { nickname: nickname.trim(), phone: phone.trim() }
    if (!PHONE.test(patch.phone)) return setPhoneError(t("settings.profile.phoneInvalid"))
    setPhoneError(undefined)
    setLoading(true)
    try {
      const saved = await authApi.updateProfile(patch)
      dispatch({ type: "employee/upsert", employee: { ...me, nickname: saved.nickname, phone: saved.phone } })
      setNickname(saved.nickname)
      setPhone(saved.phone)
      toast.success(t("settings.profile.saved"))
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_EMPLOYEE_RECORD") toast.error(t("settings.profile.noRecord"))
      else if (err instanceof ApiError && err.details?.some((d) => d.field === "phone")) setPhoneError(t("settings.profile.phoneInvalid"))
      else toast.error(t("settings.profile.saveFailed"), { description: t("common.saveFailed") })
    } finally {
      setLoading(false)
    }
  }

  return { user, me, nickname, setNickname, phone, setPhone, phoneError, loading, reset, save }
}
