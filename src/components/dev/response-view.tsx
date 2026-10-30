import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RawResponse } from "@/lib/dev-api"
import { verdictOf } from "@/lib/dev-api"
import { t } from "@/i18n"
import { StatusCode, VerdictBadge } from "./badges"

/** Status, timing, size and the (pretty-printed) body of the last response. */
export function ResponseView({ response }: { response: RawResponse | null }) {
  const [copied, setCopied] = React.useState(false)
  if (!response) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("dev.runner.noResponse")}</p>

  const copy = () => {
    void navigator.clipboard?.writeText(response.body).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-3 py-2 text-xs">
        <StatusCode status={response.status} />
        <VerdictBadge verdict={verdictOf(response.status)} />
        <span className="font-mono text-muted-foreground">{response.ms} ms</span>
        <span className="font-mono text-muted-foreground">{response.size} B</span>
        <span className="truncate font-mono text-muted-foreground">{response.contentType}</span>
        <Button variant="ghost" size="xs" className="ml-auto" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? t("dev.runner.copied") : t("dev.runner.copy")}
        </Button>
      </div>
      <pre className="max-h-[28rem] overflow-auto bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
        {response.status === 0 ? `${t("dev.runner.network")}\n\n${response.body}` : response.body || "(empty)"}
      </pre>
    </div>
  )
}
