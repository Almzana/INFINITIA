// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const HTML_TAGS = /<[^>]*>/g

/** Trim, drop control characters and strip HTML tags from free text. */
export function cleanText(value: string): string {
  return value.replace(CONTROL_CHARS, "").replace(HTML_TAGS, "").trim()
}

export function cleanOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value
  const cleaned = cleanText(value)
  return cleaned === "" ? null : cleaned
}

export const cleanEmail = (value: string) => value.trim().toLowerCase()
