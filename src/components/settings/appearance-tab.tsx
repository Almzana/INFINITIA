import { LanguagesIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type Lang, t, useLang } from "@/i18n"
import { useTheme } from "@/lib/theme"
import { ChoiceGrid } from "./choice-grid"

/** Language (ไทย / English) and theme. */
export function AppearanceTab() {
  const { lang, setLang } = useLang()
  const { theme, setTheme } = useTheme()

  const changeLang = (l: Lang) => {
    if (l === lang) return
    setLang(l)
    // The app remounts in the new language; this toast is created after that
    setTimeout(() => toast.success(t("settings.lang.changed")), 0)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LanguagesIcon className="size-4 text-primary" /> {t("settings.lang.title")}
          </CardTitle>
          <CardDescription>{t("settings.lang.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Each option is written in its own language so it is recognisable whatever is selected */}
          <ChoiceGrid<Lang>
            columns={2}
            value={lang}
            onChange={changeLang}
            options={[
              { value: "th", label: "ภาษาไทย", sub: "Thai" },
              { value: "en", label: "English", sub: "อังกฤษ" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme.title")}</CardTitle>
          <CardDescription>{t("settings.theme.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChoiceGrid
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: t("settings.theme.light"), icon: SunIcon },
              { value: "dark", label: t("settings.theme.dark"), icon: MoonIcon },
              { value: "system", label: t("settings.theme.system"), icon: MonitorIcon },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
