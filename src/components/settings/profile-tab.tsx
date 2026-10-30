import { InfoIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FormItem } from "@/components/shared/misc"
import { PhotoUploader } from "@/components/shared/photo-uploader"
import { useProfileForm } from "@/hooks/use-profile-form"
import { deptLabel, t } from "@/i18n"

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <InfoIcon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** Photo, read-only HR fields, and my editable nickname / phone. */
export function ProfileTab() {
  const f = useProfileForm()
  const editable = !!f.me

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile.title")}</CardTitle>
        <CardDescription>{t("settings.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PhotoUploader employee={f.me} fallbackName={f.user?.name ?? ""} />
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormItem label={t("settings.profile.name")} htmlFor="s-name">
            <Input id="s-name" value={f.user?.name ?? ""} disabled />
          </FormItem>
          <FormItem label={t("settings.profile.email")} htmlFor="s-email">
            <Input id="s-email" value={f.user?.email ?? ""} disabled />
          </FormItem>
          <FormItem label={t("settings.profile.department")} htmlFor="s-dept" className="sm:col-span-2">
            <Input id="s-dept" value={deptLabel(f.user?.department ?? "")} disabled />
          </FormItem>
          <div className="sm:col-span-2">
            <Hint>{t("settings.profile.hrHint")}</Hint>
          </div>
          <FormItem label={t("settings.profile.nickname")} htmlFor="s-nickname">
            <Input id="s-nickname" value={f.nickname} disabled={!editable} onChange={(e) => f.setNickname(e.target.value)} />
          </FormItem>
          <FormItem label={t("settings.profile.phone")} htmlFor="s-phone" error={f.phoneError}>
            <Input
              id="s-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={f.phone}
              disabled={!editable}
              aria-invalid={!!f.phoneError}
              onChange={(e) => f.setPhone(e.target.value)}
            />
          </FormItem>
          {!editable && (
            <div className="sm:col-span-2">
              <Hint>{t("settings.profile.noRecord")}</Hint>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end">
        <Button variant="outline" className="w-full sm:w-auto" disabled={!editable || f.loading} onClick={f.reset}>
          {t("common.cancel")}
        </Button>
        <Button className="w-full sm:w-auto" disabled={!editable || f.loading} onClick={f.save}>
          {f.loading && <LoaderIcon className="animate-spin" />}
          {t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  )
}
