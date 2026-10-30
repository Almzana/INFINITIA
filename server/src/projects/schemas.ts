// JSON schemas validated by Fastify (Ajv) before any handler runs.

const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const projectId = { type: "string", pattern: "^[A-Z]{2}[0-9]{3,6}$" } as const
const childId = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const
const phase = { type: "string", enum: ["concept", "schematic", "design-dev", "construction-docs", "permit", "construction", "handover"] } as const
const baht = { type: "integer", minimum: -10_000_000_000, maximum: 10_000_000_000 } as const

export const listProjectsSchema = {} as const

export const getProjectSchema = {
  params: { type: "object", properties: { id: projectId }, required: ["id"], additionalProperties: false },
} as const

export const createProjectSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 200 },
      type: { type: "string", enum: ["design-build", "architecture", "interior", "construction"] },
      location: { type: "string", maxLength: 120 },
      areaSqm: { type: "integer", minimum: 0, maximum: 10_000_000 },
      value: { type: "integer", minimum: 1, maximum: 10_000_000_000 },
      cost: { type: "integer", minimum: 0, maximum: 10_000_000_000 },
      start: { type: "string", format: "date" },
      end: { type: "string", format: "date" },
      manager: { type: "string", minLength: 1, maxLength: 120 },
    },
    required: ["name", "type", "value", "cost", "start", "end", "manager"],
    additionalProperties: false,
  },
} as const

export const setPhaseSchema = {
  headers: jsonHeaders,
  params: { type: "object", properties: { id: projectId, phase }, required: ["id", "phase"], additionalProperties: false },
  body: {
    type: "object",
    properties: { progress: { type: "integer", minimum: 0, maximum: 100 } },
    required: ["progress"],
    additionalProperties: false,
  },
} as const

export const setInstallmentSchema = {
  headers: jsonHeaders,
  params: { type: "object", properties: { id: projectId, installmentId: childId }, required: ["id", "installmentId"], additionalProperties: false },
  body: {
    type: "object",
    properties: { status: { type: "string", enum: ["pending", "invoiced", "paid"] } },
    required: ["status"],
    additionalProperties: false,
  },
} as const

export const addChangeOrderSchema = {
  headers: jsonHeaders,
  params: getProjectSchema.params,
  body: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      description: { type: "string", maxLength: 2000 },
      amount: baht,
      costImpact: baht,
      daysImpact: { type: "integer", minimum: -3650, maximum: 3650 },
      requestedBy: { type: "string", enum: ["ลูกค้า", "บริษัท"] },
    },
    required: ["title", "amount", "requestedBy"],
    additionalProperties: false,
  },
} as const

export const decideChangeOrderSchema = {
  headers: jsonHeaders,
  params: { type: "object", properties: { id: projectId, coId: childId }, required: ["id", "coId"], additionalProperties: false },
  body: {
    type: "object",
    properties: { status: { type: "string", enum: ["approved", "rejected"] } },
    required: ["status"],
    additionalProperties: false,
  },
} as const

export const memberSchema = {
  params: {
    type: "object",
    properties: { id: projectId, employeeId: { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } },
    required: ["id", "employeeId"],
    additionalProperties: false,
  },
} as const
