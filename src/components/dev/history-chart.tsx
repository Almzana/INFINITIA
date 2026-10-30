import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { HistoryPoint } from "@/lib/dev-api"
import { t } from "@/i18n"

/** Requests per hour split into OK / 4xx / 5xx, for the last 24 hours or 7 days (stored history). */
export function HistoryChart({ points, hours, onHours, totals }: {
  points: HistoryPoint[]
  hours: 24 | 168
  onHours: (h: 24 | 168) => void
  totals: { count: number; serverErrors: number; clientErrors: number }
}) {
  const config = {
    ok: { label: t("dev.history.ok"), color: "var(--chart-2)" },
    clientErrors: { label: "4xx", color: "var(--chart-3)" },
    serverErrors: { label: "5xx", color: "var(--destructive)" },
  } satisfies ChartConfig
  const data = points.map((p) => {
    const d = new Date(p.bucket)
    const label = hours === 24 ? `${String(d.getHours()).padStart(2, "0")}:00` : `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}h`
    return { label, ok: p.count - p.serverErrors - p.clientErrors, clientErrors: p.clientErrors, serverErrors: p.serverErrors }
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{t("dev.history.title")}</CardTitle>
          <CardDescription>{t("dev.history.summary", { count: totals.count, e5: totals.serverErrors, e4: totals.clientErrors })}</CardDescription>
        </div>
        <div className="flex gap-1">
          {([24, 168] as const).map((h) => (
            <Button key={h} size="xs" variant={hours === h ? "default" : "outline"} onClick={() => onHours(h)}>
              {t(h === 24 ? "dev.history.day" : "dev.history.week")}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56 w-full">
          <BarChart data={data} margin={{ left: -24 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" />
            <Bar dataKey="clientErrors" stackId="a" fill="var(--color-clientErrors)" />
            <Bar dataKey="serverErrors" stackId="a" fill="var(--color-serverErrors)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
