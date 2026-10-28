import { format, parseISO } from "date-fns"
import { th } from "date-fns/locale"

export function formatDate(iso: string, pattern = "d MMM yyyy") {
  const d = parseISO(iso)
  // Buddhist era year, as commonly used in Thai organisations
  return format(d, pattern, { locale: th }).replace(/\d{4}/, (y) => String(Number(y) + 543))
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n)
}

// Thai leading vowels (เ แ โ ใ ไ) come before the consonant, so skip them for initials
const firstLetter = (s: string) => s.replace(/^[เ-ไ]/, "").charAt(0)

export function initials(first: string, last = "") {
  return (firstLetter(first) + firstLetter(last)).trim()
}

/** Compact THB in millions, e.g. ฿128.5 ล้าน */
export function formatMillion(n: number, digits = 1) {
  return `฿${(n / 1_000_000).toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ล้าน`
}

export function formatPercent(ratio: number, digits = 1) {
  return `${(ratio * 100).toFixed(digits)}%`
}
