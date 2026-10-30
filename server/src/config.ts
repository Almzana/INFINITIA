function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var ${name}`)
  return value
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  logLevel: process.env.LOG_LEVEL ?? "info",
  // Swagger UI at /api/docs: always in development; in production only when API_DOCS=true
  docs: process.env.API_DOCS === "true" || (process.env.API_DOCS !== "false" && process.env.NODE_ENV !== "production"),
  session: {
    ttlMs: Number(process.env.SESSION_TTL_HOURS ?? 24 * 7) * 60 * 60 * 1000,
    idleMs: Number(process.env.SESSION_IDLE_HOURS ?? 12) * 60 * 60 * 1000,
    // Set COOKIE_SECURE=true when served over HTTPS
    secureCookie: process.env.COOKIE_SECURE === "true",
  },
}
