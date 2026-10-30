// JSON schemas validated by Fastify (Ajv) before any handler runs.

const date = { type: "string", format: "date" } as const
const time = { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" } as const
const id = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const
const title = { type: "string", minLength: 1, maxLength: 200 } as const
const agenda = { type: ["string", "null"], maxLength: 4000 } as const
const minutes = { type: ["string", "null"], maxLength: 20000 } as const
const attendeeIds = { type: "array", items: id, maxItems: 100, uniqueItems: true } as const

const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const meeting = {
  type: "object",
  properties: {
    id: { type: "string" },
    roomId: { type: "string" },
    title: { type: "string" },
    agenda: { type: ["string", "null"] },
    minutes: { type: ["string", "null"] },
    date: { type: "string" },
    start: { type: "string" },
    end: { type: "string" },
    owner: { type: "string" },
    organizerUserId: { type: ["string", "null"] },
    attendeeIds: { type: "array", items: { type: "string" } },
    involvesMe: { type: "boolean" },
    canEdit: { type: "boolean" },
  },
} as const

const idParams = { type: "object", properties: { id }, required: ["id"], additionalProperties: false } as const

export const listRoomsSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              capacity: { type: "integer" },
              floor: { type: "integer" },
              facilities: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
} as const

export const listMeetingsSchema = {
  querystring: {
    type: "object",
    properties: { from: date, to: date },
    required: ["from", "to"],
    additionalProperties: false,
  },
  response: { 200: { type: "object", properties: { data: { type: "array", items: meeting } } } },
} as const

export const createMeetingSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: { roomId: id, title, date, start: time, end: time, agenda, attendeeIds },
    required: ["roomId", "title", "date", "start", "end"],
    additionalProperties: false,
  },
  response: { 201: meeting },
} as const

export const updateMeetingSchema = {
  headers: jsonHeaders,
  params: idParams,
  body: {
    type: "object",
    properties: { roomId: id, title, date, start: time, end: time, agenda, minutes, attendeeIds },
    minProperties: 1,
    additionalProperties: false,
  },
  response: { 200: meeting },
} as const

export const deleteMeetingSchema = { params: idParams } as const
