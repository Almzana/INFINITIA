import * as React from "react"
import { CameraIcon, LoaderIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Employee } from "@/data/mock"
import { usePhotoUpload } from "@/hooks/use-photo-upload"
import { t } from "@/i18n"
import { EmployeeAvatar } from "./employee-avatar"
import { PhotoCropDialog } from "./photo-crop-dialog"

/** Avatar with change / remove buttons. `fallbackName` is shown when there is no employee record. */
export function PhotoUploader({ employee, fallbackName, size = "size-16" }: { employee?: Employee | null; fallbackName?: string; size?: string }) {
  const { busy, pending, pick, cancel, confirm, remove } = usePhotoUpload(employee)
  const input = React.useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <EmployeeAvatar person={employee} name={fallbackName} className={size} fallbackClassName="text-xl" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70" aria-label={t("photo.uploading")}>
            <LoaderIcon className="size-5 animate-spin" />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy || !employee} onClick={() => input.current?.click()}>
            <CameraIcon /> {employee?.photoVersion ? t("photo.change") : t("photo.upload")}
          </Button>
          {employee?.photoVersion && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => void remove()}>
              <Trash2Icon /> {t("photo.remove")}
            </Button>
          )}
        </div>
        <p className="max-w-72 text-xs text-muted-foreground">{employee ? t("photo.hint") : t("photo.error.noRecord")}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = "" // allow picking the same file again
          if (file) void pick(file)
        }}
      />
      <PhotoCropDialog key={pending ?? "none"} src={pending} onCancel={cancel} onConfirm={(a) => void confirm(a)} />
    </div>
  )
}
