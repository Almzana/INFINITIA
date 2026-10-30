import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>

const N = 16384
const R = 8
const P = 1
const KEYLEN = 64

/** Format: scrypt$N$r$p$<salt b64>$<hash b64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEYLEN, { N, r: R, p: P })
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$")
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$")
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, "base64")
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) })
  return timingSafeEqual(actual, expected)
}

// Verified against when the email is unknown, so response time doesn't reveal which emails exist.
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"))

/**
 * Rules for a password a person chooses: 8–128 characters, at least one letter and one digit,
 * and not containing their username or the local part of their email. Returns an error code or null.
 */
export function passwordProblem(password: string, user: { username: string; email: string }): string | null {
  if (password.length < 8 || password.length > 128) return "length"
  if (!/[A-Za-z\u0E00-\u0E7F]/.test(password) || !/\d/.test(password)) return "letters_digits"
  const lower = password.toLowerCase()
  const local = user.email.split("@")[0].toLowerCase()
  if ((user.username.length >= 3 && lower.includes(user.username.toLowerCase())) || (local.length >= 3 && lower.includes(local))) return "personal"
  return null
}
