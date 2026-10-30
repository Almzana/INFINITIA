// JSON schemas validated by Fastify (Ajv) before any handler runs.

const title = { type: "string", minLength: 1, maxLength: 200 } as const
const description = { type: ["string", "null"], maxLength: 2000 } as const
const dueDate = { type: ["string", "null"], format: "date" } as const
const priority = { type: "string", enum: ["low", "medium", "high"] } as const
const status = { type: "string", enum: ["todo", "done"] } as const
const projectId = { type: ["string", "null"], maxLength: 64, pattern: "^[A-Za-z0-9_-]*$" } as const
const employeeId = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const

// Writes must be JSON; other headers are allowed through untouched.
const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const idParams = {
  type: "object",
  properties: { id: { type: "string", format: "uuid" } },
  required: ["id"],
  additionalProperties: false,
} as const

const task = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    description: { type: ["string", "null"] },
    assigneeEmail: { type: "string" },
    dueDate: { type: ["string", "null"] },
    priority: { type: "string" },
    status: { type: "string" },
    projectId: { type: ["string", "null"] },
    assignedByUserId: { type: ["string", "null"] },
    assignedByName: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const

export const listTasksSchema = {
  querystring: {
    type: "object",
    properties: {
      // A team member's tasks (leader / executive only); omitted = my own
      employeeId,
      status,
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: task },
        meta: {
          type: "object",
          properties: { page: { type: "integer" }, pageSize: { type: "integer" }, total: { type: "integer" } },
        },
      },
    },
  },
} as const

export const createTaskSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    // Default assignee is the signed-in user; assigneeEmployeeId = assign to a team member (leader / executive)
    properties: { title, description, dueDate, priority, projectId, assigneeEmployeeId: employeeId },
    required: ["title"],
    additionalProperties: false,
  },
  response: { 201: task },
} as const

export const updateTaskSchema = {
  headers: jsonHeaders,
  params: idParams,
  body: {
    type: "object",
    properties: { title, description, dueDate, priority, status, projectId },
    minProperties: 1,
    additionalProperties: false,
  },
  response: { 200: task },
} as const

export const deleteTaskSchema = { params: idParams } as const
