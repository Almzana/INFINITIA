import { BRAND, BrandMark, Wordmark } from "@/components/shared/brand"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Full-screen, centred card for screens outside the app shell (change / forgot / reset password). */
export function AuthShell({ title, description, children }: {
  title?: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-page p-4 sm:p-10">
      <div className="flex flex-col items-center gap-3">
        <BrandMark className="size-11 rounded-xl text-sm" />
        <Wordmark className="text-sm" />
      </div>
      <Card className="w-full max-w-md">
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle className="text-xl">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
      </Card>
      <p className="text-xs tracking-wide text-muted-foreground">© 2026 {BRAND.name} · {BRAND.domain}</p>
    </div>
  )
}
