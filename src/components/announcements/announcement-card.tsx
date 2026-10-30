import { MegaphoneIcon, MoreVerticalIcon, PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tag } from "@/components/shared/tag"
import type { Announcement } from "@/data/mock"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { deptLabel, t } from "@/i18n"
import { categoryLabel, categoryTag } from "./categories"

/** One announcement. The menu (edit / pin / delete) is only rendered for HR & executives. */
export function AnnouncementCard({ a, canManage, onEdit, onPin, onDelete }: {
  a: Announcement
  canManage: boolean
  onEdit: (a: Announcement) => void
  onPin: (a: Announcement) => void
  onDelete: (a: Announcement) => void
}) {
  return (
    <Card className={cn(a.pinned && "ring-primary/40")}>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", a.pinned ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
            {a.pinned ? <PinIcon className="size-5" /> : <MegaphoneIcon className="size-5" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Tag type={categoryTag[a.category]}>{categoryLabel(a.category)}</Tag>
              {a.pinned && <Tag type="danger">{t("announcements.pinned")}</Tag>}
            </div>
            <h3 className="font-semibold break-words">{a.title}</h3>
            <p className="text-xs text-muted-foreground">
              {deptLabel(a.author)} · {formatDate(a.date)}
            </p>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("common.menu")}>
                  <MoreVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(a)}>
                  <PencilIcon /> {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPin(a)}>
                  {a.pinned ? <PinOffIcon /> : <PinIcon />}
                  {a.pinned ? t("announcements.unpin") : t("announcements.pin")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(a)}>
                  <Trash2Icon /> {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{a.body}</p>
      </CardContent>
    </Card>
  )
}
