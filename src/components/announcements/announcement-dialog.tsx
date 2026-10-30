import { LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FormItem } from "@/components/shared/misc"
import type { Announcement } from "@/data/mock"
import { useAnnouncementForm } from "@/hooks/use-announcement-form"
import { t } from "@/i18n"
import { categories, categoryLabel } from "./categories"

export function AnnouncementDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Announcement | null }) {
  const { form, errors, saving, set, submit } = useAnnouncementForm(open, editing, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{editing ? t("announcements.dialog.edit") : t("announcements.dialog.create")}</DialogTitle>
            <DialogDescription>{t("announcements.dialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormItem label={t("announcements.form.title")} required htmlFor="a-title" error={errors.title}>
              <Input id="a-title" maxLength={200} aria-invalid={!!errors.title} value={form.title} onChange={(e) => set("title", e.target.value)} />
            </FormItem>
            <FormItem label={t("announcements.form.category")}>
              <Select value={form.category} onValueChange={(v) => set("category", v as Announcement["category"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label={t("announcements.form.body")} required htmlFor="a-body" error={errors.body}>
              <Textarea id="a-body" rows={6} maxLength={10000} aria-invalid={!!errors.body} value={form.body} onChange={(e) => set("body", e.target.value)} />
            </FormItem>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t("announcements.form.pin")}</p>
                <p className="text-xs text-muted-foreground">{t("announcements.form.pinDesc")}</p>
              </div>
              <Switch checked={form.pinned} onCheckedChange={(c) => set("pinned", c)} />
            </label>
            {errors.form && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderIcon className="animate-spin" />}
              {editing ? t("common.save") : t("announcements.form.publish")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
