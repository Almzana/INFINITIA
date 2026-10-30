import { LoaderIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Booking } from "@/data/mock"
import { type MeetingPreset, useMeetingForm } from "@/hooks/use-meeting-form"
import { t } from "@/i18n"
import { useStore } from "@/lib/store"
import { MeetingFields } from "./meeting-fields"

/** New booking, or details of an existing meeting (editable by its organizer, HR and executives). */
export function MeetingDialog({ open, onOpenChange, meeting, preset, date }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  meeting: Booking | null
  preset: MeetingPreset
  date: string
}) {
  const { state } = useStore()
  const { values, errors, saving, isNew, readOnly, set, submit, cancelMeeting } = useMeetingForm(open, meeting, preset, date, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isNew ? t("rooms.dialog.new") : readOnly ? t("rooms.dialog.view") : t("rooms.dialog.edit")}</DialogTitle>
            <DialogDescription>
              {isNew ? t("rooms.dialog.newDesc") : t("rooms.dialog.owner", { name: meeting?.owner ?? "" }) + (readOnly ? t("rooms.dialog.readOnly") : "")}
            </DialogDescription>
          </DialogHeader>

          <MeetingFields values={values} errors={errors} set={set} rooms={state.rooms} readOnly={readOnly} showMinutes={!isNew} />

          {errors.form && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}

          <DialogFooter className="gap-2 sm:justify-between">
            {!isNew && !readOnly ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void cancelMeeting()}>
                <Trash2Icon /> {t("rooms.dialog.cancelMeeting")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {readOnly ? t("common.close") : t("common.cancel")}
              </Button>
              {!readOnly && (
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderIcon className="animate-spin" />}
                  {isNew ? t("rooms.dialog.confirmBooking") : t("common.save")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
