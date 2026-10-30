import { Tag } from "@/components/shared/tag"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Announcement } from "@/data/mock"
import { formatDate } from "@/lib/format"
import { deptLabel, t } from "@/i18n"
import { categoryLabel, categoryTag } from "./categories"

/** The full text of one announcement, opened from a notification. */
export function AnnouncementDetailDialog({ a, onClose }: { a: Announcement | null; onClose: () => void }) {
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {a && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Tag type={categoryTag[a.category]}>{categoryLabel(a.category)}</Tag>
                {a.pinned && <Tag type="danger">{t("announcements.pinned")}</Tag>}
              </div>
              <DialogTitle className="break-words">{a.title}</DialogTitle>
              <DialogDescription>
                {deptLabel(a.author)} · {formatDate(a.date)}
              </DialogDescription>
            </DialogHeader>
            <p className="max-h-[60svh] overflow-y-auto text-sm leading-relaxed whitespace-pre-line">{a.body}</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
