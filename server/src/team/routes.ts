import type { FastifyInstance, preHandlerHookHandler } from "fastify"
import { currentUser } from "../auth/guard.ts"
import type { TeamRepository } from "./repository.ts"

const teamSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        isLeader: { type: "boolean" },
        members: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              nickname: { type: "string" },
              position: { type: "string" },
              email: { type: "string" },
              photoVersion: { type: ["integer", "null"] },
              hasAccount: { type: "boolean" },
              openTasks: { type: "integer" },
              overdueTasks: { type: "integer" },
            },
          },
        },
      },
    },
  },
} as const

/** GET /api/team — the signed-in user's direct reports. Having any makes them a Leader. */
export function teamRoutes(repo: TeamRepository, authenticate: preHandlerHookHandler) {
  return async (app: FastifyInstance) => {
    app.addHook("preHandler", authenticate)
    app.get("/team", { schema: teamSchema }, async (req) => {
      const members = await repo.members(currentUser(req).id)
      return { isLeader: members.length > 0, members }
    })
  }
}
