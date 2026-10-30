import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import type { Sort, SortKey } from "@/hooks/use-employees-list"
import { cn } from "@/lib/utils"

export function SortHeader({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: Sort; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort?.key === k
  const Icon = !active ? ArrowUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead className={className}>
      <button onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-primary")}>
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  )
}
