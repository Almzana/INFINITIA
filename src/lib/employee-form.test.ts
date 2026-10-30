import { describe, expect, it } from "vitest"
import type { Employee } from "@/data/mock"
import { t } from "@/i18n/core"
import {
  type AccountFormValues,
  type EmployeeFormValues,
  nextEmployeeCode,
  serverFieldErrors,
  toFormValues,
  toInput,
  validateAccount,
  validateEmployee,
} from "@/lib/employee-form"

const valid: EmployeeFormValues = {
  code: "EMP1001",
  firstName: "Somchai",
  lastName: "Jaidee",
  nickname: "Chai",
  email: "somchai@example.com",
  phone: "+66 (81) 234-5678",
  department: "ฝ่ายบุคคล",
  position: "HR Officer",
  status: "active",
  startDate: "2024-01-15",
  salary: 30000,
  birthDate: "",
  address: "",
  emergencyName: "",
  emergencyPhone: "",
  managerId: "",
}

describe("validateEmployee()", () => {
  it("accepts a valid form", () => {
    expect(validateEmployee(valid)).toEqual({})
  })

  it.each([
    ["code", "code", { code: "EMP 1" }],
    ["code", "code", { code: "A".repeat(21) }],
    ["firstName", "firstName", { firstName: "   " }],
    ["lastName", "lastName", { lastName: "" }],
    ["email", "email", { email: "not-an-email" }],
    ["phone", "phone", { phone: "081-abc" }],
    ["emergencyPhone", "phone", { emergencyPhone: "call me" }],
    ["department", "department", { department: "" }],
    ["position", "position", { position: " " }],
    ["startDate", "startDate", { startDate: "" }],
    ["salary", "salary", { salary: -1 }],
    ["salary", "salary", { salary: 1.5 }],
  ] as const)("flags %s", (field, messageKey, patch) => {
    const errors = validateEmployee({ ...valid, ...patch })
    expect(Object.keys(errors)).toEqual([field])
    expect(errors[field]).toBe(t(`employees.error.${messageKey}`))
  })
})

describe("validateAccount()", () => {
  const account: AccountFormValues = { username: "somchai.j", password: "longenough1", confirm: "longenough1", role: "staff" }

  it("accepts a valid account", () => {
    expect(validateAccount(account, true)).toEqual({})
  })

  it("checks the username only when it is required", () => {
    const bad = { ...account, username: "a" }
    expect(Object.keys(validateAccount(bad, true))).toEqual(["username"])
    expect(validateAccount(bad, false)).toEqual({})
    expect(Object.keys(validateAccount({ ...account, username: "has space" }, true))).toEqual(["username"])
  })

  it("requires 8+ characters and a matching confirmation", () => {
    expect(Object.keys(validateAccount({ ...account, password: "short", confirm: "short" }, false))).toEqual(["password"])
    expect(Object.keys(validateAccount({ ...account, confirm: "different1" }, false))).toEqual(["confirm"])
  })
})

describe("toInput()", () => {
  it("normalises code/email and turns empty optionals into null", () => {
    const input = toInput({ ...valid, code: " emp1001 ", email: " Somchai@Example.COM ", address: "  ", emergencyName: " Mom ", managerId: "" })
    expect(input.code).toBe("EMP1001")
    expect(input.email).toBe("somchai@example.com")
    expect(input.birthDate).toBeNull()
    expect(input.address).toBeNull()
    expect(input.emergencyName).toBe("Mom")
    expect(input.emergencyPhone).toBeNull()
    expect(input.managerId).toBeNull()
  })

  it("keeps a chosen leader and birth date", () => {
    const input = toInput({ ...valid, managerId: "E42", birthDate: "1990-05-01" })
    expect(input.managerId).toBe("E42")
    expect(input.birthDate).toBe("1990-05-01")
  })
})

describe("toFormValues() / nextEmployeeCode()", () => {
  it("fills defaults for a new employee", () => {
    const v = toFormValues(null, "EMP2000")
    expect(v.code).toBe("EMP2000")
    expect(v.status).toBe("probation")
    expect(v.managerId).toBe("")
    expect(v.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("maps nulls of an existing employee to empty strings", () => {
    const e = { ...valid, id: "E1", birthDate: null, address: null, managerId: null } as unknown as Employee
    const v = toFormValues(e, "unused")
    expect(v.code).toBe("EMP1001")
    expect(v.birthDate).toBe("")
    expect(v.address).toBe("")
    expect(v.managerId).toBe("")
  })

  it("picks the next code after the highest one", () => {
    const list = [{ code: "EMP1005" }, { code: "EMP1012" }, { code: "X" }] as Employee[]
    expect(nextEmployeeCode(list)).toBe("EMP1013")
    expect(nextEmployeeCode([])).toBe("EMP1001")
  })
})

describe("serverFieldErrors()", () => {
  it("maps API conflict details to form fields", () => {
    const errors = serverFieldErrors([{ field: "username" }, { field: "/account/username" }, { field: "/email" }, { field: "unknown" }, {}])
    expect(errors).toEqual({ username: t("employees.error.usernameTaken"), email: t("employees.error.emailTaken") })
    expect(serverFieldErrors(undefined)).toEqual({})
  })
})
