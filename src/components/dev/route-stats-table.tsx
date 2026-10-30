import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RouteStat } from "@/lib/dev-api"
import type { HttpMethod } from "@/lib/openapi"
import { cn } from "@/lib/utils"
import { t } from "@/i18n"
import { MethodBadge, StatusCode } from "./badges"

/** Calls, errors and latency per route pattern; routes with 5xx are listed first and tinted. */
export function RouteStatsTable({ routes }: { routes: RouteStat[] }) {
  if (!routes.length) return <p className="py-6 text-center text-sm text-muted-foreground">{t("dev.monitor.empty")}</p>
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead>{t("dev.col.route")}</TableHead>
            <TableHead className="text-right">{t("dev.col.calls")}</TableHead>
            <TableHead className="text-right">{t("dev.col.5xx")}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">{t("dev.col.4xx")}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">{t("dev.col.avg")}</TableHead>
            <TableHead className="hidden text-right md:table-cell">{t("dev.col.max")}</TableHead>
            <TableHead className="text-right">{t("dev.col.last")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((r) => {
            const [method, path] = r.route.split(" ")
            return (
              <TableRow key={r.route} className={cn(r.serverErrors > 0 && "bg-destructive/5")}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <MethodBadge method={method as HttpMethod} />
                    <code className="text-xs break-all whitespace-normal">{path}</code>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                <TableCell className={cn("text-right tabular-nums", r.serverErrors > 0 && "font-semibold text-destructive")}>{r.serverErrors}</TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{r.clientErrors}</TableCell>
                <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">{r.avgMs} ms</TableCell>
                <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">{r.maxMs} ms</TableCell>
                <TableCell className="text-right"><StatusCode status={r.lastStatus} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
