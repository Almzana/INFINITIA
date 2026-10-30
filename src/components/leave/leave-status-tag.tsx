import { Tag } from "@/components/shared/tag"
import { type LeaveRequest, leaveStatusLabel } from "@/data/mock"
import { t } from "@/i18n"
import { statusTag } from "./leave-tags"

/** Status of a request; pending ones say whose turn it is (Leader or HR). */
export function LeaveStatusTag({ leave }: { leave: Pick<LeaveRequest, "status" | "stage"> }) {
  if (leave.status === "pending" && leave.stage) {
    return (
      <Tag type={leave.stage === "leader" ? "info" : "warning"} dot>
        {t(`leave.stage.${leave.stage}`)}
      </Tag>
    )
  }
  return (
    <Tag type={statusTag[leave.status]} dot>
      {leaveStatusLabel[leave.status]}
    </Tag>
  )
}
