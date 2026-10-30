import { toast } from "sonner"
import type { Project } from "@/data/projects"
import { t } from "@/i18n"
import { useTeam } from "@/hooks/use-team"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { type NewChangeOrderInput, type NewProjectInput, projectsApi } from "@/lib/projects-api"
import { useStore } from "@/lib/store"

const fail = (err: unknown) => {
  if (err instanceof ApiError && err.status === 403) toast.error(t("common.noPermission"))
  else if (err instanceof ApiError && err.status === 400) toast.error(t("projects.invalidData"), { description: err.message })
  else toast.error(t("common.saveFailed"))
  return null
}

/**
 * Project writes through the API (which applies the billing rules), plus what this user may do:
 * canCreate = executives and Leaders; canEditProject = executives, or the Leader who created that project
 * (phase progress, change orders);
 * canFinance = executives (installment status, approving change orders).
 */
export function useProjectActions() {
  const { dispatch } = useStore()
  const user = useAuth().user
  const role = user?.role
  const { isLeader } = useTeam()
  const upsert = (project: Project) => dispatch({ type: "project/upsert", project })

  const run = async <T,>(fn: () => Promise<T>, onOk: (r: T) => void) => {
    try {
      const r = await fn()
      onOk(r)
      return r
    } catch (err) {
      return fail(err)
    }
  }

  return {
    /** Create projects: executives and Leaders */
    canCreate: role === "executive" || (role === "staff" && isLeader),
    /** Change an existing project: executives, or the Leader who created it */
    canEditProject: (p: Project | undefined) =>
      !!p && (role === "executive" || (role === "staff" && isLeader && !!user?.id && p.createdByUserId === user.id)),
    canFinance: role === "executive",

    create: (input: NewProjectInput) => run(() => projectsApi.create(input), upsert),

    addMember: (p: Project, employeeId: string) => run(() => projectsApi.addMember(p.id, employeeId), upsert),
    removeMember: (p: Project, employeeId: string) => run(() => projectsApi.removeMember(p.id, employeeId), upsert),

    setPhase: (p: Project, key: Project["phases"][number]["key"], progress: number) =>
      run(
        () => projectsApi.setPhase(p.id, key, progress),
        (r) => {
          upsert(r.project)
          toast.success(t("projects.plan.progressUpdated", { n: progress }), { description: r.billed.length ? t("projects.plan.autoBilled", { items: r.billed.join(", ") }) : undefined })
        },
      ),

    setInstallment: (p: Project, installmentId: string, status: Project["installments"][number]["status"]) =>
      run(() => projectsApi.setInstallment(p.id, installmentId, status), upsert),

    addChangeOrder: (p: Project, input: NewChangeOrderInput) => run(() => projectsApi.addChangeOrder(p.id, input), upsert),

    decideChangeOrder: (p: Project, coId: string, status: "approved" | "rejected") =>
      run(() => projectsApi.decideChangeOrder(p.id, coId, status), upsert),
  }
}
