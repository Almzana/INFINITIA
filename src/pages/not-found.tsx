import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n"

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("shared.notFound.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("shared.notFound.description")}</p>
      </div>
      <Button asChild>
        <Link to="/">{t("shared.notFound.backHome")}</Link>
      </Button>
    </div>
  )
}
