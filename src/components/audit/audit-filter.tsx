import { RotateCcwIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AuditFilters } from "@/hooks/use-audit-log"
import { t } from "@/i18n"
import { AUDIT_ENTITIES } from "@/lib/audit-api"
import { entityLabel } from "./audit-labels"

/** Search form: applied on submit (button or Enter). */
export function AuditFilter({ draft, onChange, onSearch, onReset }: {
  draft: AuditFilters
  onChange: (f: AuditFilters) => void
  onSearch: (e?: React.FormEvent) => void
  onReset: () => void
}) {
  return (
    <form onSubmit={onSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={t("audit.filter.placeholder")}
          aria-label={t("common.search")}
          maxLength={100}
          value={draft.q}
          onChange={(e) => onChange({ ...draft, q: e.target.value })}
        />
      </div>
      <Select value={draft.entity} onValueChange={(entity) => onChange({ ...draft, entity })}>
        <SelectTrigger className="w-full" aria-label={t("audit.col.entity")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("audit.filter.allEntities")}</SelectItem>
          {AUDIT_ENTITIES.map((e) => (
            <SelectItem key={e} value={e}>
              {entityLabel(e)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none">
          <SearchIcon /> {t("common.search")}
        </Button>
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={onReset}>
          <RotateCcwIcon /> {t("common.reset")}
        </Button>
      </div>
    </form>
  )
}
