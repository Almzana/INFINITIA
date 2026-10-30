import * as React from "react"
import { PlusIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, PageHeader } from "@/components/shared/misc"
import { AnnouncementCard } from "@/components/announcements/announcement-card"
import { AnnouncementDetailDialog } from "@/components/announcements/announcement-detail-dialog"
import { AnnouncementDialog } from "@/components/announcements/announcement-dialog"
import { categories, categoryLabel } from "@/components/announcements/categories"
import type { Announcement } from "@/data/mock"
import { useAnnouncements } from "@/hooks/use-announcements"
import { useDeepLink } from "@/hooks/use-deep-link"
import { useStore } from "@/lib/store"
import { can } from "@/lib/access"
import { useAuth } from "@/lib/auth"
import { t } from "@/i18n"

export default function AnnouncementsPage() {
  const canManage = can.manageAnnouncements(useAuth().user?.role)
  const { list, q, setQ, cat, setCat, togglePin, remove, reload } = useAnnouncements()
  // ?view=<id> from a notification opens that announcement (looked up unfiltered)
  const detail = useDeepLink("view", useStore().state.announcements, reload)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Announcement | null>(null)

  const openForm = (a: Announcement | null) => {
    setEditing(a)
    setOpen(true)
  }

  return (
    <>
      <PageHeader
        title={t("announcements.title")}
        description={canManage ? t("announcements.descriptionManage") : t("announcements.description")}
        actions={
          canManage && (
            <Button onClick={() => openForm(null)}>
              <PlusIcon /> {t("announcements.create")}
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="bg-background pl-8" placeholder={t("announcements.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...categories] as const).map((c) => (
            <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
              {c === "all" ? t("common.all") : categoryLabel(c)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <AnnouncementCard key={a.id} a={a} canManage={canManage} onEdit={openForm} onPin={(x) => void togglePin(x)} onDelete={(x) => void remove(x)} />
        ))}
      </div>
      {list.length === 0 && (
        <Card>
          <EmptyState title={t("announcements.emptyTitle")} description={t("announcements.emptyDescription")} />
        </Card>
      )}

      <AnnouncementDetailDialog a={detail.item} onClose={detail.close} />
      {canManage && <AnnouncementDialog open={open} onOpenChange={setOpen} editing={editing} />}
    </>
  )
}
