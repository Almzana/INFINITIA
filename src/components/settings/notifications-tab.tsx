import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { t } from "@/i18n"

const options = [
  { id: "leave", default: true },
  { id: "approve", default: true },
  { id: "announce", default: true },
  { id: "room", default: false },
  { id: "email", default: false },
]

export function NotificationsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.notify.title")}</CardTitle>
        <CardDescription>{t("settings.notify.description")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {options.map((o) => {
          const name = t(`settings.notify.${o.id}`)
          return (
            <label key={o.id} className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{t(`settings.notify.${o.id}Desc`)}</p>
              </div>
              <Switch
                defaultChecked={o.default}
                onCheckedChange={(c) => toast.success(t(c ? "settings.notify.toggledOn" : "settings.notify.toggledOff", { name }))}
              />
            </label>
          )
        })}
      </CardContent>
    </Card>
  )
}
