import { RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/misc"
import { AppearanceTab } from "@/components/settings/appearance-tab"
import { NotificationsTab } from "@/components/settings/notifications-tab"
import { ProfileTab } from "@/components/settings/profile-tab"
import { SecurityTab } from "@/components/settings/security-tab"
import { t } from "@/i18n"

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <Tabs defaultValue="profile" className="gap-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="profile">{t("settings.tab.profile")}</TabsTrigger>
          <TabsTrigger value="security">{t("settings.tab.security")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.tab.notifications")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("settings.tab.appearance")}</TabsTrigger>
          <TabsTrigger value="system">{t("settings.tab.system")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.system.title")}</CardTitle>
              <CardDescription>{t("settings.system.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RotateCcwIcon /> {t("settings.system.reload")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
