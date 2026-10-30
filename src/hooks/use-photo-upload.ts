import * as React from "react"
import { toast } from "sonner"
import type { Employee } from "@/data/mock"
import { t } from "@/i18n"
import { ApiError } from "@/lib/api"
import { employeesApi } from "@/lib/employees-api"
import { checkPhotoFile, type CropArea, prepareAvatar } from "@/lib/photo"
import { useStore } from "@/lib/store"

function message(err: unknown) {
  if (err instanceof Error && err.message === "not-an-image") return t("photo.error.notImage")
  if (err instanceof Error && err.message === "too-large") return t("photo.error.tooLarge")
  if (err instanceof Error && err.message === "unreadable") return t("photo.error.unreadable")
  if (err instanceof ApiError && err.status === 403) return t("common.noPermission")
  if (err instanceof ApiError && (err.status === 400 || err.status === 413 || err.status === 415)) return t("photo.error.invalid")
  return t("photo.error.failed")
}

/** Pick → crop in a dialog → resize in the browser → upload, then update the employee everywhere in the app. */
export function usePhotoUpload(employee: Employee | null | undefined) {
  const { dispatch } = useStore()
  const [busy, setBusy] = React.useState(false)
  // The picked file waiting in the crop dialog, with an object URL to preview it
  const [pending, setPending] = React.useState<{ file: File; url: string } | null>(null)

  React.useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.url)
  }, [pending])

  const apply = (photoVersion: number | null) => {
    if (employee) dispatch({ type: "employee/upsert", employee: { ...employee, photoVersion } })
  }

  const pick = async (file: File) => {
    if (!employee) return toast.error(t("photo.error.noRecord"))
    try {
      checkPhotoFile(file)
      // Formats the browser cannot decode (e.g. HEIC outside Safari) fail here, not inside the cropper
      ;(await createImageBitmap(file).catch(() => {
        throw new Error("unreadable")
      })).close()
      setPending({ file, url: URL.createObjectURL(file) })
    } catch (err) {
      toast.error(message(err))
    }
  }

  const cancel = () => setPending(null)

  const confirm = async (area: CropArea) => {
    if (!employee || !pending) return
    const { file } = pending
    setPending(null)
    setBusy(true)
    try {
      const image = await prepareAvatar(file, area)
      const { photoVersion } = await employeesApi.uploadPhoto(employee.id, image)
      apply(photoVersion)
      toast.success(t("photo.saved"))
    } catch (err) {
      toast.error(message(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!employee) return
    setBusy(true)
    try {
      await employeesApi.deletePhoto(employee.id)
      apply(null)
      toast.success(t("photo.removed"))
    } catch (err) {
      toast.error(message(err))
    } finally {
      setBusy(false)
    }
  }

  return { busy, pending: pending?.url ?? null, pick, cancel, confirm, remove }
}
