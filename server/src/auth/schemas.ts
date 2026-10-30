const user = {
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    department: { type: "string" },
    employeeId: { type: ["string", "null"] },
    mustChangePassword: { type: "boolean" },
    isDeveloper: { type: "boolean" },
  },
} as const

const jsonHeaders = {
  type: "object",
  properties: { "content-type": { type: "string", pattern: "^application/json" } },
  required: ["content-type"],
} as const

const newPassword = { type: "string", minLength: 8, maxLength: 128 } as const

export const loginSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: {
      // Username or email
      login: { type: "string", minLength: 1, maxLength: 254 },
      password: { type: "string", minLength: 1, maxLength: 200 },
    },
    required: ["login", "password"],
    additionalProperties: false,
  },
  response: { 200: { type: "object", properties: { user } } },
} as const

export const meSchema = {
  response: { 200: { type: "object", properties: { user } } },
} as const

export const changePasswordSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: { currentPassword: { type: "string", minLength: 1, maxLength: 200 }, newPassword },
    required: ["currentPassword", "newPassword"],
    additionalProperties: false,
  },
} as const

export const forgotSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: { login: { type: "string", minLength: 1, maxLength: 254 } },
    required: ["login"],
    additionalProperties: false,
  },
} as const

export const resetSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: { token: { type: "string", minLength: 20, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" }, newPassword },
    required: ["token", "newPassword"],
    additionalProperties: false,
  },
} as const

export const profileSchema = {
  headers: jsonHeaders,
  body: {
    type: "object",
    properties: {
      nickname: { type: "string", maxLength: 40 },
      phone: { type: "string", maxLength: 30, pattern: "^[0-9+()\\-\\s]*$" },
    },
    minProperties: 1,
    additionalProperties: false,
  },
} as const
