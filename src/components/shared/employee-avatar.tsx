import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { t } from "@/i18n"
import { initials } from "@/lib/format"
import { photoUrl } from "@/lib/photo"
import { cn } from "@/lib/utils"

export type AvatarPerson = { id: string; firstName: string; lastName: string; photoVersion?: number | null }

/** Profile photo when there is one, otherwise initials. Pass `name` for people without a record. */
export function EmployeeAvatar({ person, name, className, fallbackClassName }: {
  person?: AvatarPerson | null
  name?: string
  className?: string
  fallbackClassName?: string
}) {
  const [first = "", last = ""] = person ? [person.firstName, person.lastName] : (name ?? "").split(" ")
  const src = person ? photoUrl(person.id, person.photoVersion) : undefined
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={t("photo.alt", { name: `${first} ${last}`.trim() })} className="object-cover" />}
      <AvatarFallback className={cn("bg-primary/10 text-primary", fallbackClassName)}>{first || last ? initials(first, last) : "?"}</AvatarFallback>
    </Avatar>
  )
}
