// Grant, revoke or list Developer Console access.
//   npm run developer -- list
//   npm run developer -- grant <username>
//   npm run developer -- revoke <username>
// In Docker: docker compose exec api node scripts/developer.ts grant <username>
import { createPool } from "../src/db.ts"

const url = process.env.DATABASE_URL
if (!url) throw new Error("Missing required env var DATABASE_URL")

const [action, username] = process.argv.slice(2)
const USERNAME = /^[a-z0-9._-]{2,32}$/

if (!["list", "grant", "revoke"].includes(action ?? "") || (action !== "list" && !USERNAME.test(username ?? ""))) {
  console.error("usage: developer.ts list | grant <username> | revoke <username>")
  process.exit(2)
}

const pool = createPool(url)
try {
  if (action === "list") {
    const { rows } = await pool.query<{ username: string; name: string; role: string }>(
      "SELECT username, name, role FROM users WHERE is_developer ORDER BY username",
    )
    if (rows.length === 0) console.log("no developer accounts")
    for (const r of rows) console.log(`${r.username.padEnd(20)} ${r.role.padEnd(10)} ${r.name}`)
  } else {
    const { rowCount } = await pool.query("UPDATE users SET is_developer = $2 WHERE username = $1", [username, action === "grant"])
    if (!rowCount) {
      console.error(`no account with username "${username}"`)
      process.exitCode = 1
    } else {
      console.log(`${action === "grant" ? "granted" : "revoked"} Developer Console access for ${username}`)
    }
  }
} finally {
  await pool.end()
}
