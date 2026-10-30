import { AppError } from "../errors.ts"
import { cleanEmail, cleanOptionalText, cleanText } from "../tasks/sanitize.ts"
import type { EmployeeInput } from "./types.ts"

const REQUIRED_TEXT = ["code", "firstName", "lastName", "department", "position"] as const
const OPTIONAL_TEXT = ["address", "emergencyName"] as const
const PLAIN_TEXT = ["nickname", "phone"] as const

/** Cleans every string field; fields absent from the input stay absent (for PATCH). */
export function sanitizeEmployee<T extends Partial<EmployeeInput>>(input: T): T {
  const out: Partial<EmployeeInput> = { ...input }
  for (const k of REQUIRED_TEXT) {
    if (out[k] === undefined) continue
    const v = cleanText(out[k])
    if (!v) throw new AppError(400, "VALIDATION_ERROR", `${k} must not be empty`, [{ field: k }])
    out[k] = k === "code" ? v.toUpperCase() : v
  }
  for (const k of PLAIN_TEXT) if (out[k] !== undefined) out[k] = cleanText(out[k])
  for (const k of OPTIONAL_TEXT) if (out[k] !== undefined) out[k] = cleanOptionalText(out[k]) ?? null
  if (out.emergencyPhone !== undefined) out.emergencyPhone = cleanOptionalText(out.emergencyPhone) ?? null
  if (out.email !== undefined) out.email = cleanEmail(out.email)
  return out as T
}

export const cleanUsername = (u: string) => u.trim().toLowerCase()
