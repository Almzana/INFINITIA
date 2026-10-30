import { Tag, type TagType } from "@/components/shared/tag"
import type { Verdict } from "@/lib/dev-api"
import type { HttpMethod } from "@/lib/openapi"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"

const methodStyle: Record<HttpMethod, string> = {
  GET: "bg-info/15 text-info",
  POST: "bg-success/15 text-success",
  PUT: "bg-warning/15 text-warning",
  PATCH: "bg-primary/15 text-primary",
  DELETE: "bg-destructive/15 text-destructive",
}

/** HTTP method chip, fixed width so paths line up. */
export function MethodBadge({ method, className }: { method: HttpMethod; className?: string }) {
  return <span className={cn("inline-flex w-14 shrink-0 justify-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold", methodStyle[method], className)}>{method}</span>
}

const verdictTag: Record<Verdict, TagType> = { ok: "success", denied: "warning", invalid: "info", broken: "danger" }

/** Result of calling a route: verdict plus the HTTP status (0 = no answer). */
export function VerdictBadge({ verdict, status }: { verdict: Verdict; status?: number }) {
  return (
    <Tag type={verdictTag[verdict]} dot>
      {t(`dev.verdict.${verdict}`)}
      {status !== undefined && <span className="font-mono opacity-80">{status || "ERR"}</span>}
    </Tag>
  )
}

/** HTTP status coloured by class. */
export function StatusCode({ status }: { status: number }) {
  const tone = status === 0 || status >= 500 ? "text-destructive" : status >= 400 ? "text-warning" : "text-success"
  return <span className={cn("font-mono font-semibold tabular-nums", tone)}>{status || "ERR"}</span>
}
