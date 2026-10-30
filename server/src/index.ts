import { buildApp } from "./app.ts"
import { config } from "./config.ts"
import { createPool } from "./db.ts"

const pool = createPool(config.databaseUrl)
const app = await buildApp(pool, config.session, config.logLevel, { docs: config.docs })

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down")
  await app.close()
  await pool.end()
  process.exit(0)
}
process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

try {
  await app.listen({ port: config.port, host: config.host })
} catch (err) {
  app.log.error({ err }, "failed to start")
  await pool.end()
  process.exit(1)
}
