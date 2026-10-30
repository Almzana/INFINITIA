// Tiny i18n: Thai (default) and English.
//
// Dictionaries live in ./locales/<namespace>.ts and are discovered automatically. Each file exports
//   export const th = { title: "การลา", days: "{n} วัน" }
//   export const en: Record<keyof typeof th, string> = { title: "Leave", days: "{n} days" }
// and is addressed as t("<namespace>.<key>", { n: 3 }).
//
// t() is a plain function (usable in hooks, toasts and label maps). Switching language remounts the
// app below LanguageProvider, so every t() call re-runs with the new language.

export type Lang = "th" | "en"
type Dict = Record<string, string>

const modules = import.meta.glob<{ th: Dict; en: Dict }>("./locales/*.ts", { eager: true })
const dictionaries: Record<Lang, Record<string, Dict>> = { th: {}, en: {} }
for (const [path, mod] of Object.entries(modules)) {
  const ns = path.replace(/^.*\/(.+)\.ts$/, "$1")
  dictionaries.th[ns] = mod.th
  dictionaries.en[ns] = mod.en
}

export const LANG_KEY = "hr-portal-lang"

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === "th" || saved === "en") return saved
  } catch {
    /* storage unavailable */
  }
  return "th"
}

let current: Lang = initialLang()

export const getLang = () => current
/** Internal: set by LanguageProvider before its children render. */
export const setCurrentLang = (lang: Lang) => {
  current = lang
}

/** Translate "namespace.key", filling {placeholders}. Falls back to Thai, then to the key itself. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dot = key.indexOf(".")
  const ns = key.slice(0, dot)
  const k = key.slice(dot + 1)
  const text = dictionaries[current][ns]?.[k] ?? dictionaries.th[ns]?.[k]
  if (text === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text
}

/**
 * A Record<K, string> whose values are translated on every read, so existing code like
 * `leaveTypeLabel[l.type]` keeps working and follows the current language.
 */
export function labelMap<K extends string>(prefix: string, keys: readonly K[]): Record<K, string> {
  const map = {} as Record<K, string>
  for (const k of keys) Object.defineProperty(map, k, { enumerable: true, get: () => t(`${prefix}.${k}`) })
  return map
}

/**
 * Department names are stored in Thai in the database; show them in the current language.
 * Unknown names (added later) are shown as stored.
 */
export function deptLabel(name: string): string {
  if (current === "th") return name
  return dictionaries.en.dept?.[name] ?? name
}
