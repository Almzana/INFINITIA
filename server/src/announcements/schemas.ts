// JSON schemas validated by Fastify (Ajv) before any handler runs.

const id = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const
const title = { type: "string", minLength: 1, maxLength: 200 } as const
const body = { type: "string", minLength: 1, maxLength: 10000 } as const
const category = { type: "string", enum: ["ทั่วไป", "HR", "IT", "กิจกรรม"] } as const

const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const announcement = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    body: { type: "string" },
    category: { type: "string" },
    pinned: { type: "boolean" },
    author: { type: "string" },
    date: { type: "string" },
  },
} as const

const idParams = { type: "object", properties: { id }, required: ["id"], additionalProperties: false } as const

export const listAnnouncementsSchema = {
  querystring: {
    type: "object",
    properties: {
      category,
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: announcement },
        meta: { type: "object", properties: { page: { type: "integer" }, pageSize: { type: "integer" }, total: { type: "integer" } } },
      },
    },
  },
} as const

export const createAnnouncementSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: { title, body, category, pinned: { type: "boolean" } },
    required: ["title", "body"],
    additionalProperties: false,
  },
  response: { 201: announcement },
} as const

export const updateAnnouncementSchema = {
  headers: jsonHeaders,
  params: idParams,
  body: {
    type: "object",
    properties: { title, body, category, pinned: { type: "boolean" } },
    minProperties: 1,
    additionalProperties: false,
  },
  response: { 200: announcement },
} as const

export const deleteAnnouncementSchema = { params: idParams } as const
