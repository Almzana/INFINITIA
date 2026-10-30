import * as React from "react"
import { LockIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CheckResult } from "@/hooks/use-health-check"
import type { Endpoint } from "@/lib/openapi"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"
import { MethodBadge, VerdictBadge } from "./badges"

/** Searchable list of every operation, grouped by tag, with its last health-check verdict. */
export function EndpointList({ endpoints, results, selectedId, onSelect }: {
  endpoints: Endpoint[]
  results: Record<string, CheckResult>
  selectedId: string | null
  onSelect: (e: Endpoint) => void
}) {
  const [q, setQ] = React.useState("")
  const [brokenOnly, setBrokenOnly] = React.useState(false)
  const groups = React.useMemo(() => {
    const needle = q.trim().toLowerCase()
    const map = new Map<string, Endpoint[]>()
    for (const e of endpoints) {
      if (needle && !`${e.method} ${e.path} ${e.summary} ${e.tag}`.toLowerCase().includes(needle)) continue
      if (brokenOnly && results[e.id]?.verdict !== "broken") continue
      map.set(e.tag, [...(map.get(e.tag) ?? []), e])
    }
    return [...map.entries()]
  }, [endpoints, results, q, brokenOnly])

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="bg-background pl-8" placeholder={t("dev.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex gap-1.5">
        <Button size="xs" variant={brokenOnly ? "outline" : "default"} onClick={() => setBrokenOnly(false)}>{t("dev.filter.all")}</Button>
        <Button size="xs" variant={brokenOnly ? "destructive" : "outline"} onClick={() => setBrokenOnly(true)}>{t("dev.filter.broken")}</Button>
      </div>
      <div className="space-y-4 overflow-y-auto lg:max-h-[calc(100svh-15rem)] lg:pr-1">
        {groups.map(([tag, list]) => (
          <section key={tag} className="space-y-1">
            <h3 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{tag}</h3>
            <ul className="space-y-1">
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(e)}
                    className={cn("flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:bg-muted/60", selectedId === e.id && "border-primary/40 bg-primary/5")}
                  >
                    <MethodBadge method={e.method} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-mono text-xs break-all">
                        {e.path}
                        {e.secured && <LockIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">{e.summary}</span>
                    </span>
                    {results[e.id] && <VerdictBadge verdict={results[e.id].verdict} />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("dev.monitor.empty")}</p>}
      </div>
    </div>
  )
}
