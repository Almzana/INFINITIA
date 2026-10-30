// Shared setup for the API integration tests (node:test).
// Uses a separate database (hrportal_test by default) that is migrated and seeded on first use.
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { runner } from "node-pg-migrate"
import type { FastifyInstance } from "fastify"
import type { Pool } from "../src/db.ts"

// Keep the app from sending real mail and from printing reset links as warnings
delete process.env.SMTP_HOST
process.env.NODE_ENV = "test"

/** Password of the seeded demo accounts in the test database only. */
export const TEST_PASSWORD = "Test-Only-Demo-9481"

const serverDir = fileURLToPath(new URL("..", import.meta.url))

function postgresPassword() {
  if (process.env.POSTGRES_PASSWORD) return process.env.POSTGRES_PASSWORD
  const envFile = fileURLToPath(new URL("../../.env", import.meta.url))
  if (!existsSync(envFile)) return ""
  const line = readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("POSTGRES_PASSWORD="))
  return line ? line.slice("POSTGRES_PASSWORD=".length).trim() : ""
}

export const databaseUrl =
  process.env.TEST_DATABASE_URL ?? `postgres://hrportal:${encodeURIComponent(postgresPassword())}@127.0.0.1:5433/hrportal_test`

// Tests delete and rewrite rows: refuse to run against anything that is not clearly a test database
const dbName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1))
if (!dbName.endsWith("_test")) {
  throw new Error(`Refusing to run tests against database "${dbName}": its name must end with _test`)
}

async function migrateAndSeed() {
  await runner({
    databaseUrl,
    dir: `${serverDir}migrations`,
    direction: "up",
    migrationsTable: "pgmigrations",
    count: Infinity,
    log: () => {},
  })
  const seed = spawnSync(process.execPath, ["scripts/seed.ts"], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, SEED_DEMO_PASSWORD: TEST_PASSWORD, SEED_ALWAYS: "true" },
    encoding: "utf8",
  })
  if (seed.status !== 0) throw new Error(`seed failed:\n${seed.stdout}\n${seed.stderr}`)
}

export interface Res<T = any> {
  status: number
  body: T
  headers: Record<string, unknown>
  raw: string
}

export interface InjectOptions {
  cookie?: string
  json?: unknown
  payload?: string | Buffer
  headers?: Record<string, string>
}

export interface Ctx {
  app: FastifyInstance
  pool: Pool
  inject: <T = any>(method: string, url: string, opts?: InjectOptions) => Promise<Res<T>>
  /** Signs in (each call from a fresh client IP, so the per-IP login limit never trips) and returns the cookie. */
  login: (login: string, password?: string) => Promise<string>
  /** One cached session per demo user for this test file. */
  as: (username: "admin" | "hr" | "staff" | "dev") => Promise<string>
  employeeIdOf: (username: string) => Promise<string>
  close: () => Promise<void>
}

let ipCounter = 0
const nextIp = () => {
  ipCounter++
  return `10.${(process.pid >> 8) & 255}.${Math.floor(ipCounter / 250) % 250}.${(ipCounter % 250) + 1}`
}

export async function setup(): Promise<Ctx> {
  await migrateAndSeed()
  const { createPool } = await import("../src/db.ts")
  const { buildApp } = await import("../src/app.ts")
  const { hashPassword } = await import("../src/auth/password.ts")
  const pool = createPool(databaseUrl)
  // Earlier runs may have left demo accounts in another state; put them back
  await pool.query(
    "UPDATE users SET password_hash = $1, must_change_password = false WHERE username IN ('admin', 'hr', 'staff')",
    [await hashPassword(TEST_PASSWORD)],
  )
  const app = await buildApp(pool, { ttlMs: 3_600_000, idleMs: 3_600_000, secureCookie: false }, "silent", { docs: true })
  await app.ready()

  const inject: Ctx["inject"] = async (method, url, opts = {}) => {
    const headers: Record<string, string> = { ...opts.headers }
    if (opts.cookie) headers.cookie = opts.cookie
    let payload = opts.payload
    if (opts.json !== undefined) {
      headers["content-type"] ??= "application/json"
      payload = JSON.stringify(opts.json)
    }
    const res = await app.inject({ method: method as "GET", url, headers, payload })
    let body: unknown = undefined
    if (String(res.headers["content-type"] ?? "").startsWith("application/json")) body = res.json()
    return { status: res.statusCode, body: body as any, headers: res.headers, raw: res.body }
  }

  const login: Ctx["login"] = async (name, password = TEST_PASSWORD) => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
      payload: JSON.stringify({ login: name, password }),
    })
    if (res.statusCode !== 200) throw new Error(`login ${name} failed: ${res.statusCode} ${res.body}`)
    const sid = res.cookies.find((c) => c.name === "sid")
    if (!sid) throw new Error("no session cookie")
    return `sid=${sid.value}`
  }

  const cache = new Map<string, Promise<string>>()
  const as: Ctx["as"] = (username) => {
    if (!cache.has(username)) cache.set(username, login(username))
    return cache.get(username)!
  }

  const employeeIdOf = async (username: string) => {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT e.id FROM employees e JOIN users u ON u.id = e.user_id WHERE u.username = $1",
      [username],
    )
    if (!rows[0]) throw new Error(`no employee for ${username}`)
    return rows[0].id
  }

  return {
    app,
    pool,
    inject,
    login,
    as,
    employeeIdOf,
    close: async () => {
      await app.close()
      await pool.end()
    },
  }
}

export { nextIp }

let uniq = 0
/** Short unique suffix for codes, usernames and emails created by a test. */
export const unique = () => `${Date.now().toString(36)}${process.pid.toString(36)}${(uniq++).toString(36)}`.slice(-10)

export interface TempUser {
  employeeId: string
  userId: string
  username: string
  email: string
  password: string
  cookie: string
}

/**
 * Creates an employee with a login account through the API (as admin) and signs in.
 * The must-change-password flag is cleared in the database unless keepPending is set.
 */
export async function createUser(
  ctx: Ctx,
  opts: { role?: "staff" | "hr" | "executive"; managerId?: string | null; keepPending?: boolean; salary?: number } = {},
): Promise<TempUser> {
  const u = unique()
  const username = `t${u}`.toLowerCase()
  const email = `${username}@test.invalid`
  const password = `Pw-${u}-123x`
  const res = await ctx.inject("POST", "/api/employees", {
    cookie: await ctx.as("admin"),
    json: {
      code: `T${u}`.toUpperCase(),
      firstName: "Test",
      lastName: u,
      email,
      department: "Test Dept",
      position: "Tester",
      startDate: "2024-01-01",
      salary: opts.salary ?? 30000,
      managerId: opts.managerId ?? null,
      account: { username, password, role: opts.role ?? "staff" },
    },
  })
  if (res.status !== 201) throw new Error(`create employee failed: ${res.status} ${res.raw}`)
  const { rows } = await ctx.pool.query<{ user_id: string }>("SELECT user_id FROM employees WHERE id = $1", [res.body.id])
  const userId = rows[0].user_id
  if (!opts.keepPending) await ctx.pool.query("UPDATE users SET must_change_password = false WHERE id = $1", [userId])
  const cookie = await ctx.login(username, password)
  return { employeeId: res.body.id, userId, username, email, password, cookie }
}

/** Removes employees (and their accounts, tasks, leaves, photos) created by a test. */
export async function removeEmployees(ctx: Ctx, ids: string[]) {
  if (!ids.length) return
  await ctx.pool.query("DELETE FROM tasks WHERE assignee_email IN (SELECT email FROM employees WHERE id = ANY($1))", [ids])
  await ctx.pool.query("DELETE FROM users WHERE id IN (SELECT user_id FROM employees WHERE id = ANY($1) AND user_id IS NOT NULL)", [ids])
  await ctx.pool.query("DELETE FROM employees WHERE id = ANY($1)", [ids])
}

/** A minimal valid PNG header (the API only checks the signature). */
export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])
