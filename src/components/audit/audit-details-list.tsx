import { t } from "@/i18n"
import { fieldLabel } from "./audit-labels"
import { formatValue } from "./audit-summary"

const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const isChangePair = (v: unknown): v is [unknown, unknown] => Array.isArray(v) && v.length === 2

/** Every detail as a definition list; `changes` maps expand to before → after, deeper values fall back to JSON. */
export function AuditDetailsList({ details }: { details: Record<string, unknown> | null | undefined }) {
  const entries = isPlainObject(details) ? Object.entries(details) : []
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{t("audit.sheet.noDetails")}</p>

  return (
    <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-2 text-sm">
      {entries.flatMap(([key, value]) => {
        if (key === "changes" && isPlainObject(value)) {
          return Object.entries(value).map(([field, pair]) => (
            <Item key={`changes.${field}`} label={fieldLabel(field)}>
              {isChangePair(pair) ? `${formatValue(pair[0])} → ${formatValue(pair[1])}` : formatValue(pair)}
            </Item>
          ))
        }
        return [
          <Item key={key} label={fieldLabel(key)}>
            {isPlainObject(value) ? (
              <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
            ) : (
              formatValue(value)
            )}
          </Item>,
        ]
      })}
    </dl>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="break-words text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}
