import { TodoCard } from "@/components/tasks/todo-card"
import { useTeam } from "@/hooks/use-team"
import { MyMeetingsCard } from "./my-meetings-card"
import { TeamCard } from "./team-card"

/**
 * Personal block on every dashboard: my to-dos and upcoming meetings, plus — for Leaders —
 * my team with their workload. Stacks on mobile.
 */
export function MyWorkSection() {
  const { members, isLeader, reload } = useTeam()

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <TodoCard className="lg:col-span-2" members={members} onAssigned={() => void reload()} />
        <MyMeetingsCard />
      </div>
      {isLeader && <TeamCard members={members} />}
    </>
  )
}
