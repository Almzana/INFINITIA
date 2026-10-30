import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, EllipsisIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, "gap", total]
  if (current >= total - 3) return [1, "gap", total - 4, total - 3, total - 2, total - 1, total]
  return [1, "gap", current - 1, current, current + 1, "gap", total]
}

// Mirrors el-pagination layout="total, sizes, prev, pager, next, jumper"
export function ElPagination({
  total,
  page,
  pageSize,
  pageSizes = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: {
  total: number
  page: number
  pageSize: number
  pageSizes?: number[]
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const [jump, setJump] = React.useState("")

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {t("shared.pager.totalPrefix")} <span className="font-medium text-foreground">{total}</span> {t("shared.pager.totalSuffix")}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {t("shared.pager.perPage", { n: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t("shared.pager.prev")}>
          <ChevronLeftIcon />
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageList(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <EllipsisIcon key={`gap${i}`} className="size-4" />
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "h-7 min-w-7 rounded-md px-1.5 text-sm font-medium transition-colors",
                  p === page ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <span className="sm:hidden">
          {page} / {pageCount}
        </span>
        <Button variant="ghost" size="icon-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label={t("shared.pager.next")}>
          <ChevronRightIcon />
        </Button>
        <span className="hidden items-center gap-1.5 md:flex">
          {t("shared.pager.goTo")}
          <Input
            className="h-7 w-12 text-center"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && jump) {
                onPageChange(Math.min(pageCount, Math.max(1, Number(jump))))
                setJump("")
              }
            }}
          />
          {t("shared.pager.page")}
        </span>
      </div>
    </div>
  )
}
