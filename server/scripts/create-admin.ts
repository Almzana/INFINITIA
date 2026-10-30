// Create the first executive account on a real (production) database — no demo data, no shared password.
//   node scripts/create-admin.ts <username> <email> "<display name>"
// In Docker: docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api node scripts/create-admin.ts ...
// A random temporary password is printed once; the account must replace it at the first sign-in.
import { randomBytes } from "node:crypto"
import { hashPassword } from "../src/auth/password.ts"
import { createPool } from "../src/db.ts"

const url = process.env.DATABASE_URL
if (!url) throw new Error("Missing required env var DATABASE_URL")

const [username, email, ...nameParts] = process.argv.slice(2)
const name = nameParts.join(" ").trim()
if (!/^[a-z0-9._-]{2,32}$/.test(username ?? "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "") || !name || name.length > 120) {
  console.error('usage: create-admin.ts <username a-z0-9._- 2-32> <email> "<display name>"')
  process.exit(2)
}

// 16 random characters with at least one letter and one digit (the password policy)
const temp = `${randomBytes(12).toString("base64url").replace(/[-_]/g, "x")}a7`

const pool = createPool(url)
try {
  const { rowCount } = await pool.query(
    `INSERT INTO users (username, email, name, role, department, password_hash, must_change_password)
     VALUES ($1, lower($2), $3, 'executive', 'ฝ่ายบริหาร', $4, true) ON CONFLICT DO NOTHING`,
    [username, email, name, await hashPassword(temp)],
  )
  if (!rowCount) {
    console.error(`An account with username "${username}" or email "${email}" already exists; nothing changed`)
    process.exitCode = 1
  } else {
    console.log(`Created executive "${username}".`)
    console.log(`Temporary password (shown once, must be changed at first sign-in): ${temp}`)
  }
} finally {
  await pool.end()
}
