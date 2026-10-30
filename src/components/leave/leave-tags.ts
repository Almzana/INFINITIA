import type { TagType } from "@/components/shared/tag"
import type { LeaveStatus, LeaveType } from "@/data/mock"

export const statusTag: Record<LeaveStatus, TagType> = { pending: "warning", approved: "success", rejected: "danger" }
export const typeTag: Record<LeaveType, TagType> = { sick: "danger", vacation: "primary", personal: "warning", maternity: "success" }
