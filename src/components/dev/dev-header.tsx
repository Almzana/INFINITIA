import { Link } from "react-router-dom"
import { ArrowLeftIcon, BookOpenIcon, TerminalSquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { roleLabel, type User } from "@/lib/auth"
import { t } from "@/i18n"

/** Title bar: who the requests run as, links to Swagger and back to the app. */
export function DevHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TerminalSquareIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold">{t("dev.title")}</h1>
          <p className="truncate text-xs text-muted-foreground">{t("dev.signedInAs", { name: user.name, role: roleLabel[user.role] })}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/docs" target="_blank" rel="noreferrer">
            <BookOpenIcon /> {t("dev.swagger")}
          </a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeftIcon /> <span className="hidden sm:inline">{t("dev.backToApp")}</span>
          </Link>
        </Button>
      </div>
    </header>
  )
}
