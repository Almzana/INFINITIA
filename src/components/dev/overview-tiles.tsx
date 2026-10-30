import { ActivityIcon, CheckCircle2Icon, CpuIcon, DatabaseIcon, GaugeIcon, ListIcon, TimerIcon, XCircleIcon } from "lucide-react"
import type { DevStats } from "@/lib/dev-api"
import { t } from "@/i18n"
import { StatTile } from "./stat-tile"

const uptime = (s: number) => (s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`)

/** Headline numbers: endpoints, health-check results, latency, database and server. */
export function OverviewTiles({ total, checked, ok, broken, avgMs, stats }: { total: number; checked: boolean; ok: number; broken: number; avgMs: number; stats: DevStats | null }) {
  const dash = "—"
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <StatTile icon={ListIcon} label={t("dev.tile.endpoints")} value={total} tone="info" />
      <StatTile icon={CheckCircle2Icon} label={t("dev.tile.healthy")} value={checked ? ok : dash} tone={checked ? "good" : "neutral"} />
      <StatTile icon={XCircleIcon} label={t("dev.tile.broken")} value={checked ? broken : dash} tone={checked && broken > 0 ? "bad" : checked ? "good" : "neutral"} />
      <StatTile icon={GaugeIcon} label={t("dev.tile.latency")} value={checked ? `${avgMs} ms` : dash} />
      <StatTile icon={DatabaseIcon} label={t("dev.tile.db")} value={stats ? (stats.db.ok ? "OK" : "DOWN") : dash} hint={stats ? `${stats.db.ms} ms` : undefined} tone={!stats ? "neutral" : stats.db.ok ? "good" : "bad"} />
      <StatTile icon={TimerIcon} label={t("dev.tile.uptime")} value={stats ? uptime(stats.server.uptimeSec) : dash} hint={stats ? `Node ${stats.server.node}` : undefined} />
      <StatTile icon={stats ? CpuIcon : ActivityIcon} label={t("dev.tile.memory")} value={stats ? `${stats.server.rssMb} MB` : dash} hint={stats ? `heap ${stats.server.heapUsedMb} MB · ${stats.server.env}` : undefined} />
    </div>
  )
}
