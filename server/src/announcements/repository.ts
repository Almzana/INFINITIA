import type { Pool } from "../db.ts"

export type Category = "ทั่วไป" | "HR" | "IT" | "กิจกรรม"

export interface AnnouncementInput {
  title: string
  body: string
  category: Category
  pinned: boolean
}

const COLUMNS = `id, title, body, category, pinned, author_name AS author, date`

// API field -> column; only these can appear in an UPDATE
const PATCH_COLUMNS: Record<keyof AnnouncementInput, string> = { title: "title", body: "body", category: "category", pinned: "pinned" }

export function createAnnouncementRepository(pool: Pool) {
  return {
    /** Pinned first, newest first (served by announcements_feed_idx); one query incl. total. */
    async list(opts: { category?: Category; page: number; pageSize: number }) {
      const params: unknown[] = []
      const where = opts.category ? `WHERE category = $${params.push(opts.category)}` : ""
      params.push(opts.pageSize, (opts.page - 1) * opts.pageSize)
      const { rows } = await pool.query(
        `SELECT ${COLUMNS}, count(*) OVER() AS total FROM announcements ${where}
          ORDER BY pinned DESC, date DESC, created_at DESC
          LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      const total = rows.length ? Number(rows[0].total) : 0
      return { items: rows.map(({ total: _t, ...a }) => a), total }
    },

    async create(input: AnnouncementInput, author: { userId: string; name: string }) {
      const { rows } = await pool.query(
        `INSERT INTO announcements (title, body, category, pinned, author_user_id, author_name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
        [input.title, input.body, input.category, input.pinned, author.userId, author.name],
      )
      return rows[0]
    },

    async update(id: string, patch: Partial<AnnouncementInput>) {
      const keys = (Object.keys(PATCH_COLUMNS) as (keyof AnnouncementInput)[]).filter((k) => patch[k] !== undefined)
      const { rows } = await pool.query(
        `UPDATE announcements SET ${[...keys.map((k, i) => `${PATCH_COLUMNS[k]} = $${i + 1}`), "updated_at = now()"].join(", ")}
          WHERE id = $${keys.length + 1} RETURNING ${COLUMNS}`,
        [...keys.map((k) => patch[k]), id],
      )
      return rows[0] ?? null
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("DELETE FROM announcements WHERE id = $1", [id])
      return (rowCount ?? 0) > 0
    },
  }
}

export type AnnouncementRepository = ReturnType<typeof createAnnouncementRepository>
