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

/** Today's date as yyyy-MM-dd in local time */
export function todayISO() {
  return format(new Date(), "yyyy-MM-dd")
}

/** Download text as a UTF-8 CSV that Excel opens with Thai characters intact. */
export function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  // Revoking synchronously can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
