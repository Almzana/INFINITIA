// JSON schemas validated by Fastify (Ajv) before any handler runs.

const text = (max: number, min = 0) => ({ type: "string", minLength: min, maxLength: max }) as const
const optionalText = (max: number) => ({ type: ["string", "null"], maxLength: max }) as const
const phone = { type: "string", maxLength: 30, pattern: "^[0-9+()\\-\\s]*$" } as const
const optionalPhone = { type: ["string", "null"], maxLength: 30, pattern: "^[0-9+()\\-\\s]*$" } as const
const date = { type: "string", format: "date" } as const
const optionalDate = { type: ["string", "null"], format: "date" } as const
const status = { type: "string", enum: ["active", "probation", "leave", "resigned"] } as const
const role = { type: "string", enum: ["executive", "hr", "staff"] } as const
const username = { type: "string", pattern: "^[A-Za-z0-9._-]{2,32}$" } as const
const password = { type: "string", minLength: 8, maxLength: 128 } as const
const id = { type: "string", minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9-]+$" } as const

const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const employeeFields = {
  code: { type: "string", minLength: 1, maxLength: 20, pattern: "^[A-Za-z0-9-]+$" },
  firstName: text(80, 1),
  lastName: text(80, 1),
  nickname: text(40),
  email: { type: "string", format: "email", maxLength: 254 },
  phone,
  department: text(120, 1),
  position: text(120, 1),
  status,
  startDate: date,
  salary: { type: "integer", minimum: 0, maximum: 10_000_000 },
  birthDate: optionalDate,
  address: optionalText(500),
  emergencyName: optionalText(120),
  emergencyPhone: optionalPhone,
  // Team leader (another employee); null = no leader
  managerId: { type: ["string", "null"], maxLength: 64, pattern: "^[A-Za-z0-9-]+$" },
} as const

/** Sensitive fields (salary, personal details, account) are only present for HR / executives. */
const employee = {
  type: "object",
  properties: {
    id: { type: "string" },
    code: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    nickname: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    department: { type: "string" },
    position: { type: "string" },
    status: { type: "string" },
    startDate: { type: "string" },
    managerId: { type: ["string", "null"] },
    photoVersion: { type: ["integer", "null"] },
    salary: { type: "integer" },
    birthDate: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    emergencyName: { type: ["string", "null"] },
    emergencyPhone: { type: ["string", "null"] },
    username: { type: ["string", "null"] },
    role: { type: ["string", "null"] },
  },
} as const

const idParams = { type: "object", properties: { id }, required: ["id"], additionalProperties: false } as const

export const listEmployeesSchema = {
  querystring: {
    type: "object",
    properties: {
      q: text(100),
      department: text(120),
      status,
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 500, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: employee },
        meta: { type: "object", properties: { page: { type: "integer" }, pageSize: { type: "integer" }, total: { type: "integer" } } },
      },
    },
  },
} as const

export const createEmployeeSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: {
      ...employeeFields,
      account: {
        type: "object",
        properties: { username, password, role },
        required: ["username", "password"],
        additionalProperties: false,
      },
    },
    required: ["code", "firstName", "lastName", "email", "department", "position", "startDate", "account"],
    additionalProperties: false,
  },
  response: { 201: employee },
} as const

export const updateEmployeeSchema = {
  headers: jsonHeaders,
  params: idParams,
  body: { type: "object", properties: employeeFields, minProperties: 1, additionalProperties: false },
  response: { 200: employee },
} as const

export const deleteEmployeesSchema = {
  querystring: {
    type: "object",
    properties: { ids: { type: "array", items: id, minItems: 1, maxItems: 100, uniqueItems: true } },
    required: ["ids"],
    additionalProperties: false,
  },
  response: { 200: { type: "object", properties: { deleted: { type: "integer" } } } },
} as const

/** Create or update the login account. username is required only when the employee has no account yet. */
export const setAccountSchema = {
  headers: jsonHeaders,
  params: idParams,
  body: {
    type: "object",
    properties: { username, password, role },
    required: ["password"],
    additionalProperties: false,
  },
  response: { 200: employee },
} as const
