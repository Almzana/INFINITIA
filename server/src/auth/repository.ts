import { createHash, randomBytes } from "node:crypto"
import { type Pool, withTx } from "../db.ts"

export type Role = "executive" | "hr" | "staff"

export interface AuthUser {
  id: string
  username: string
  email: string
  name: string
  role: Role
  department: string
  employeeId: string | null
  /** Set after HR creates the account or sets a password: the user must choose their own */
  mustChangePassword: boolean
  /** May open the Developer Console (independent of role) */
  isDeveloper: boolean
}

// employeeId: the user's own employee record (null for accounts without one)
const USER_COLUMNS = `u.id, u.username, u.email, u.name, u.role, u.department, u.must_change_password AS "mustChangePassword",
  u.is_developer AS "isDeveloper",
  (SELECT e.id FROM employees e WHERE e.user_id = u.id) AS "employeeId"`
// Accounts of employees marked "resigned" can neither log in nor keep using a session
const ACTIVE = `NOT EXISTS (SELECT 1 FROM employees r WHERE r.user_id = u.id AND r.status = 'resigned')`

const sha256 = (token: string) => createHash("sha256").update(token).digest("hex")

/** idleMs: a session not used for this long stops working (default 12 hours). */
export function createAuthRepository(pool: Pool, idleMs = 12 * 60 * 60 * 1000) {
  return {
    /** Accepts either a username or an email (usernames cannot contain "@"). */
    async findByLogin(login: string) {
      const { rows } = await pool.query<AuthUser & { passwordHash: string }>(
        `SELECT ${USER_COLUMNS}, u.password_hash AS "passwordHash" FROM users u WHERE (u.email = $1 OR u.username = $1) AND ${ACTIVE}`,
        [login],
      )
      return rows[0] ?? null
    },

    /** Creates a session and returns the raw token (only its hash is stored). Also prunes this user's expired sessions. */
    async createSession(userId: string, ttlMs: number) {
      const token = randomBytes(32).toString("base64url")
      await pool.query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId])
      await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
        sha256(token),
        userId,
        new Date(Date.now() + ttlMs),
      ])
      return token
    },

    /**
     * Session -> user in a single join; null when missing, expired, or idle longer than idleMs.
     * last_used_at is refreshed at most every 5 minutes to avoid a write on every request.
     */
    async findUserBySession(token: string) {
      const hash = sha256(token)
      const { rows } = await pool.query<AuthUser & { stale: boolean }>(
        `SELECT ${USER_COLUMNS}, s.last_used_at < now() - interval '5 minutes' AS stale
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now()
            AND s.last_used_at > now() - make_interval(secs => $2) AND ${ACTIVE}`,
        [hash, idleMs / 1000],
      )
      if (!rows[0]) return null
      const { stale, ...user } = rows[0]
      if (stale) await pool.query("UPDATE sessions SET last_used_at = now() WHERE token_hash = $1", [hash])
      return user
    },

    async deleteSession(token: string) {
      await pool.query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)])
    },

    /** Self-service fields only; null-safe partial update. */
    async updateOwnProfile(employeeId: string, patch: { nickname?: string; phone?: string }) {
      const { rows } = await pool.query<{ nickname: string; phone: string }>(
        `UPDATE employees SET nickname = COALESCE($2, nickname), phone = COALESCE($3, phone), updated_at = now()
          WHERE id = $1 RETURNING nickname, phone`,
        [employeeId, patch.nickname ?? null, patch.phone ?? null],
      )
      return rows[0] ?? null
    },

    async passwordHashOf(userId: string) {
      const { rows } = await pool.query<{ h: string }>("SELECT password_hash AS h FROM users WHERE id = $1", [userId])
      return rows[0]?.h ?? null
    },

    /**
     * Set the user's own new password: clears the must-change flag and signs out every other session
     * (keepToken = the current session, which stays signed in).
     */
    async setOwnPassword(userId: string, passwordHash: string, keepToken: string | null) {
      return withTx(pool, async (db) => {
        await db.query("UPDATE users SET password_hash = $2, must_change_password = false, updated_at = now() WHERE id = $1", [userId, passwordHash])
        await db.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash IS DISTINCT FROM $2", [userId, keepToken ? sha256(keepToken) : null])
      })
    },

    /** One-time reset link token (raw token returned; only its hash is stored). Older unused links stop working. */
    async createResetToken(userId: string, ttlMs: number) {
      const token = randomBytes(32).toString("base64url")
      await withTx(pool, async (db) => {
        await db.query("DELETE FROM password_resets WHERE user_id = $1", [userId])
        await db.query("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, new Date(Date.now() + ttlMs)])
      })
      return token
    },

    /** Consume a reset token and set the password; signs out all sessions. Returns the user id, or null if invalid. */
    async resetWithToken(token: string, passwordHash: string) {
      return withTx(pool, async (db) => {
        const { rows } = await db.query<{ user_id: string }>(
          `UPDATE password_resets SET used_at = now()
            WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
            RETURNING user_id`,
          [sha256(token)],
        )
        const userId = rows[0]?.user_id
        if (!userId) return null
        await db.query("UPDATE users SET password_hash = $2, must_change_password = false, updated_at = now() WHERE id = $1", [userId, passwordHash])
        await db.query("DELETE FROM sessions WHERE user_id = $1", [userId])
        await db.query("DELETE FROM password_resets WHERE user_id = $1 AND token_hash <> $2", [userId, sha256(token)])
        return userId
      })
    },
  }
}

export type AuthRepository = ReturnType<typeof createAuthRepository>
