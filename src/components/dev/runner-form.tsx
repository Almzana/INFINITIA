import { LoaderIcon, SendIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Endpoint, Param } from "@/lib/openapi"
import { t } from "@/i18n"
import { MethodBadge } from "./badges"

function ParamFields({ title, params, values, onChange }: { title: string; params: Param[]; values: Record<string, string>; onChange: (n: string, v: string) => void }) {
  if (!params.length) return null
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-semibold text-muted-foreground">{title}</legend>
      {params.map((p) => (
        <label key={p.name} className="grid items-center gap-1 sm:grid-cols-[9rem_1fr] sm:gap-3">
          <span className="font-mono text-xs">
            {p.name}
            {p.required && <span className="ml-1 text-destructive" title={t("dev.runner.required")}>*</span>}
          </span>
          <Input
            className="h-8 font-mono text-xs"
            value={values[p.name] ?? ""}
            placeholder={p.schema.enum ? p.schema.enum.join(" | ") : String(p.schema.type ?? "")}
            onChange={(e) => onChange(p.name, e.target.value)}
          />
        </label>
      ))}
    </fieldset>
  )
}

/** URL preview, parameter inputs, JSON body editor and the send button for one operation. */
export function RunnerForm({ endpoint, url, values, onValue, body, onBody, bodyError, missing, sending, onSend }: {
  endpoint: Endpoint
  url: string
  values: Record<string, string>
  onValue: (n: string, v: string) => void
  body: string
  onBody: (v: string) => void
  bodyError: string | null
  missing: string[]
  sending: boolean
  onSend: () => void
}) {
  const json = endpoint.bodyType?.includes("json")
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSend()
      }}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <MethodBadge method={endpoint.method} />
          <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
        </div>
        {endpoint.summary && <p className="text-sm text-muted-foreground">{endpoint.summary}</p>}
      </div>
      <ParamFields title={t("dev.runner.path")} params={endpoint.params.filter((p) => p.in === "path")} values={values} onChange={onValue} />
      <ParamFields title={t("dev.runner.query")} params={endpoint.params.filter((p) => p.in === "query")} values={values} onChange={onValue} />
      {endpoint.bodyType &&
        (json ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{t("dev.runner.body")}</p>
            <Textarea className="min-h-40 font-mono text-xs" spellCheck={false} value={body} onChange={(e) => onBody(e.target.value)} aria-invalid={!!bodyError} />
            {bodyError && <p className="text-xs text-destructive">{bodyError}</p>}
          </div>
        ) : (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{t("dev.runner.binary", { type: endpoint.bodyType })}</p>
        ))}
      {endpoint.method !== "GET" && (
        <p className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          <TriangleAlertIcon className="size-4 shrink-0" /> {t("dev.runner.writes")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={sending || missing.length > 0 || (!!endpoint.bodyType && !json)}>
          {sending ? <LoaderIcon className="animate-spin" /> : <SendIcon />} {sending ? t("dev.runner.sending") : t("dev.runner.send")}
        </Button>
        {missing.length > 0 && <span className="text-xs text-muted-foreground">{t("dev.runner.missing", { names: missing.join(", ") })}</span>}
      </div>
    </form>
  )
}
