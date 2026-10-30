import { Card, CardContent } from "@/components/ui/card"
import type { CheckResult } from "@/hooks/use-health-check"
import type { useRequestRunner } from "@/hooks/use-request-runner"
import type { Endpoint } from "@/lib/openapi"
import { t } from "@/i18n"
import { EndpointList } from "./endpoint-list"
import { ResponseView } from "./response-view"
import { RunnerForm } from "./runner-form"
import { RunnerHistory } from "./runner-history"

/** List on the left, request runner and response on the right (stacked on small screens). */
export function EndpointsTab({ endpoints, results, runner }: { endpoints: Endpoint[]; results: Record<string, CheckResult>; runner: ReturnType<typeof useRequestRunner> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card className="py-4">
        <CardContent className="px-4">
          <EndpointList endpoints={endpoints} results={results} selectedId={runner.endpoint?.id ?? null} onSelect={runner.select} />
        </CardContent>
      </Card>
      <Card className="py-4">
        <CardContent className="space-y-5 px-4">
          {runner.endpoint ? (
            <>
              <RunnerForm
                endpoint={runner.endpoint}
                url={runner.url}
                values={runner.values}
                onValue={runner.setValue}
                body={runner.body}
                onBody={runner.setBody}
                bodyError={runner.bodyError}
                missing={runner.missing}
                sending={runner.sending}
                onSend={() => void runner.send()}
              />
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">{t("dev.runner.response")}</h3>
                <ResponseView response={runner.response} />
              </section>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("dev.runner.pick")}</p>
          )}
          <RunnerHistory items={runner.history} onClear={runner.clearHistory} />
        </CardContent>
      </Card>
    </div>
  )
}
