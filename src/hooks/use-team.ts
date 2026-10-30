import * as React from "react"
import { useAuth } from "@/lib/auth"
import { type TeamMember, teamApi } from "@/lib/team-api"

/** The signed-in user's team (direct reports). A Leader is anyone with at least one member. */
export function useTeam() {
  const email = useAuth().user?.email
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [isLeader, setIsLeader] = React.useState(false)

  const reload = React.useCallback(async () => {
    if (!email) return
    try {
      const res = await teamApi.mine()
      setMembers(res.members)
      setIsLeader(res.isLeader)
    } catch {
      /* not critical: the dashboard simply hides team features */
    }
  }, [email])

  React.useEffect(() => {
    void reload()
  }, [reload])

  return { members, isLeader, reload }
}
