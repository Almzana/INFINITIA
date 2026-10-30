import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { type Ctx, createUser, removeEmployees, setup, type TempUser } from "./helpers.ts"

let ctx: Ctx
let other: TempUser
// A far-future day nobody else books; leftovers from an aborted run are cleared first
const DAY = "2031-03-04"
const TITLE = "TEST meeting"

const clear = () => ctx.pool.query("DELETE FROM meetings WHERE date = $1 AND title LIKE 'TEST %'", [DAY])

before(async () => {
  ctx = await setup()
  await clear()
  other = await createUser(ctx)
})
after(async () => {
  await clear()
  await removeEmployees(ctx, [other.employeeId])
  await ctx.close()
})

const book = async (cookie: string, body: Record<string, unknown>) =>
  ctx.inject("POST", "/api/meetings", { cookie, json: { roomId: "r1", title: TITLE, date: DAY, ...body } })

describe("meetings", () => {
  test("rooms are listed", async () => {
    const res = await ctx.inject("GET", "/api/rooms", { cookie: await ctx.as("staff") })
    assert.equal(res.status, 200)
    assert.ok(res.body.data.some((r: { id: string }) => r.id === "r1"))
  })

  test("overlapping booking of the same room is 409 ROOM_TAKEN", async () => {
    const first = await book(await ctx.as("staff"), { start: "10:00", end: "11:00" })
    assert.equal(first.status, 201)
    assert.equal(first.body.canEdit, true)

    const clash = await book(await ctx.as("hr"), { start: "10:30", end: "11:30" })
    assert.equal(clash.status, 409)
    assert.equal(clash.body.error.code, "ROOM_TAKEN")

    // Back-to-back and other rooms are fine
    assert.equal((await book(await ctx.as("hr"), { start: "11:00", end: "11:30" })).status, 201)
    assert.equal((await book(await ctx.as("hr"), { roomId: "r2", start: "10:30", end: "11:30" })).status, 201)

    // Moving a meeting onto a taken slot is refused too
    const later = await book(await ctx.as("staff"), { start: "13:00", end: "14:00" })
    const move = await ctx.inject("PATCH", `/api/meetings/${later.body.id}`, { cookie: await ctx.as("staff"), json: { start: "10:15", end: "10:45" } })
    assert.equal(move.status, 409)
    assert.equal(move.body.error.code, "ROOM_TAKEN")
  })

  test("end must be after start; unknown room is 400", async () => {
    const res = await book(await ctx.as("staff"), { start: "15:00", end: "15:00" })
    assert.equal(res.status, 400)
    const room = await book(await ctx.as("staff"), { roomId: "nope", start: "16:00", end: "17:00" })
    assert.equal(room.status, 400)
  })

  test("staff cannot edit or delete someone else's meeting; HR can edit", async () => {
    const mine = await book(await ctx.as("staff"), { start: "08:00", end: "08:30" })
    assert.equal(mine.status, 201)
    const id = mine.body.id

    const list = await ctx.inject("GET", `/api/meetings?from=${DAY}&to=${DAY}`, { cookie: other.cookie })
    const seen = list.body.data.find((m: { id: string }) => m.id === id)
    assert.equal(seen.canEdit, false)

    const edit = await ctx.inject("PATCH", `/api/meetings/${id}`, { cookie: other.cookie, json: { title: "Hijacked" } })
    assert.equal(edit.status, 403)
    assert.equal((await ctx.inject("DELETE", `/api/meetings/${id}`, { cookie: other.cookie })).status, 403)

    const hr = await ctx.inject("PATCH", `/api/meetings/${id}`, { cookie: await ctx.as("hr"), json: { minutes: "TEST notes\nline 2" } })
    assert.equal(hr.status, 200)
    assert.equal(hr.body.minutes, "TEST notes\nline 2")

    assert.equal((await ctx.inject("DELETE", `/api/meetings/${id}`, { cookie: await ctx.as("staff") })).status, 204)
    assert.equal((await ctx.inject("DELETE", `/api/meetings/${id}`, { cookie: await ctx.as("staff") })).status, 404)
  })

  test("attendees see the meeting as involving them", async () => {
    const res = await book(await ctx.as("staff"), { roomId: "r3", start: "09:00", end: "09:30", attendeeIds: [other.employeeId] })
    assert.equal(res.status, 201)
    const list = await ctx.inject("GET", `/api/meetings?from=${DAY}&to=${DAY}`, { cookie: other.cookie })
    assert.equal(list.body.data.find((m: { id: string }) => m.id === res.body.id).involvesMe, true)
  })

  test("listing range is limited", async () => {
    const res = await ctx.inject("GET", "/api/meetings?from=2031-01-01&to=2031-12-31", { cookie: await ctx.as("staff") })
    assert.equal(res.status, 400)
  })
})
