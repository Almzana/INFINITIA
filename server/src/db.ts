import pg from "pg"

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Dates (avoids timezone shifts)
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v)
// bigint money columns (THB) stay far below 2^53, so plain numbers are safe
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v))

export function createPool(connectionString: string) {
  const pool = new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 })
  // An idle client dropped by Postgres (restart, pg_terminate_backend, network) emits "error" on the
  // pool; without a listener Node treats it as uncaught and the whole API exits. The pool replaces
  // the client by itself, so logging is enough.
  pool.on("error", (err) => console.error(JSON.stringify({ level: 50, time: Date.now(), msg: "idle database client error", err: err.message })))
  return pool
}

export type Pool = pg.Pool
export type Client = pg.PoolClient

/** Runs fn inside a transaction; rolls back on any error. */
export async function withTx<T>(pool: Pool, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
