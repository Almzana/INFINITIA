import { type Client, type Pool, withTx } from "../db.ts"

export interface MeetingInput {
  roomId: string
  title: string
  date: string
  start: string
  end: string
  agenda: string | null
  minutes: string | null
  attendeeIds: string[]
}

/** Who is asking: decides involvesMe / canEdit in the same query. */
export interface Viewer {
  userId: string
  privileged: boolean
}

// API field -> column for the scalar fields a PATCH may change
const COLUMNS: Record<Exclude<keyof MeetingInput, "attendeeIds">, string> = {
  roomId: "room_id",
  title: "title",
  date: "date",
  start: "start_time",
  end: "end_time",
  agenda: "agenda",
  minutes: "minutes",
}

/**
 * One query for a page of meetings: attendees are aggregated per row (index on meeting_attendees PK),
 * so there is no per-meeting round trip. $1 = viewer user id, $2 = viewer is HR/executive.
 */
const SELECT = `
  SELECT m.id, m.room_id AS "roomId", m.title, m.agenda, m.minutes, m.date,
         to_char(m.start_time, 'HH24:MI') AS start, to_char(m.end_time, 'HH24:MI') AS "end",
         COALESCE(u.name, m.organizer_name) AS owner, m.organizer_user_id AS "organizerUserId",
         COALESCE(att.ids, '{}') AS "attendeeIds",
         (m.organizer_user_id = $1 OR COALESCE(att.has_viewer, false)) AS "involvesMe",
         (m.organizer_user_id = $1 OR $2::boolean) AS "canEdit"
    FROM meetings m
    LEFT JOIN users u ON u.id = m.organizer_user_id
    LEFT JOIN LATERAL (
      SELECT array_agg(a.employee_id ORDER BY a.employee_id) AS ids, bool_or(e.user_id = $1) AS has_viewer
        FROM meeting_attendees a JOIN employees e ON e.id = a.employee_id
       WHERE a.meeting_id = m.id
    ) att ON true`

async function findOne(db: Client | Pool, id: string, v: Viewer) {
  const { rows } = await db.query(`${SELECT} WHERE m.id = $3`, [v.userId, v.privileged, id])
  return rows[0] ?? null
}

async function setAttendees(db: Client, meetingId: string, ids: string[]) {
  await db.query("DELETE FROM meeting_attendees WHERE meeting_id = $1", [meetingId])
  if (ids.length) {
    await db.query("INSERT INTO meeting_attendees (meeting_id, employee_id) SELECT $1, unnest($2::text[])", [meetingId, ids])
  }
}

export function createMeetingRepository(pool: Pool) {
  return {
    /** Title, slot and attendees of one meeting (for notifications before/after a change). */
    async summary(id: string) {
      const { rows } = await pool.query<{ title: string; date: string; start: string; end: string; roomId: string; attendeeIds: string[] }>(
        `SELECT m.title, m.date, to_char(m.start_time, 'HH24:MI') AS start, to_char(m.end_time, 'HH24:MI') AS "end", m.room_id AS "roomId",
                COALESCE(array_agg(a.employee_id) FILTER (WHERE a.employee_id IS NOT NULL), '{}') AS "attendeeIds"
           FROM meetings m LEFT JOIN meeting_attendees a ON a.meeting_id = m.id
          WHERE m.id = $1 GROUP BY m.id`,
        [id],
      )
      return rows[0] ?? null
    },

    async listRooms() {
      const { rows } = await pool.query("SELECT id, name, capacity, floor, facilities FROM rooms ORDER BY id")
      return rows
    },

    async list(from: string, to: string, v: Viewer) {
      const { rows } = await pool.query(`${SELECT} WHERE m.date BETWEEN $3 AND $4 ORDER BY m.date, m.start_time`, [v.userId, v.privileged, from, to])
      return rows
    },

    async create(input: Omit<MeetingInput, "minutes">, organizer: { userId: string; name: string }, v: Viewer) {
      return withTx(pool, async (db) => {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO meetings (room_id, title, date, start_time, end_time, agenda, organizer_user_id, organizer_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [input.roomId, input.title, input.date, input.start, input.end, input.agenda, organizer.userId, organizer.name],
        )
        await setAttendees(db, rows[0].id, input.attendeeIds)
        return findOne(db, rows[0].id, v)
      })
    },

    /** Returns "not_found" / "forbidden" instead of throwing, so the route picks the status code. */
    async update(id: string, patch: Partial<MeetingInput>, v: Viewer) {
      return withTx(pool, async (db) => {
        const { rows } = await db.query<{ organizer_user_id: string | null }>("SELECT organizer_user_id FROM meetings WHERE id = $1 FOR UPDATE", [id])
        if (!rows[0]) return "not_found" as const
        if (!v.privileged && rows[0].organizer_user_id !== v.userId) return "forbidden" as const

        const keys = (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).filter((k) => patch[k] !== undefined)
        if (keys.length) {
          await db.query(
            `UPDATE meetings SET ${keys.map((k, i) => `${COLUMNS[k]} = $${i + 1}`).join(", ")}, updated_at = now() WHERE id = $${keys.length + 1}`,
            [...keys.map((k) => patch[k]), id],
          )
        }
        if (patch.attendeeIds) await setAttendees(db, id, patch.attendeeIds)
        return findOne(db, id, v)
      })
    },

    async remove(id: string, v: Viewer) {
      const { rows } = await pool.query<{ organizer_user_id: string | null }>("SELECT organizer_user_id FROM meetings WHERE id = $1", [id])
      if (!rows[0]) return "not_found" as const
      if (!v.privileged && rows[0].organizer_user_id !== v.userId) return "forbidden" as const
      await pool.query("DELETE FROM meetings WHERE id = $1", [id])
      return "deleted" as const
    },
  }
}

export type MeetingRepository = ReturnType<typeof createMeetingRepository>
