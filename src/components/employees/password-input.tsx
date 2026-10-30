import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { t } from "@/i18n"

/** Password field with a show/hide toggle. */
export function PasswordInput({ id, value, onChange, invalid, autoComplete = "new-password", placeholder }: {
  id: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  autoComplete?: string
  placeholder?: string
}) {
  const [show, setShow] = React.useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-9"
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? t("employees.account.hidePassword") : t("employees.account.showPassword")}
      >
        {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  )
}
