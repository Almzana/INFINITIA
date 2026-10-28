import * as React from "react"

// Minimal replacement for next-themes (which injects a <script> React 19 warns about in an SPA).
type Theme = "light" | "dark" | "system"
const THEME_KEY = "hr-portal-theme"

const ThemeContext = React.createContext<{
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (t: string) => void
} | null>(null)

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === "light" || t === "dark" || t === "system") return t
  } catch {
    /* storage unavailable */
  }
  return "light"
}

const media = () => window.matchMedia("(prefers-color-scheme: dark)")

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readTheme)
  const [systemDark, setSystemDark] = React.useState(() => media().matches)

  React.useEffect(() => {
    const m = media()
    const onChange = () => setSystemDark(m.matches)
    m.addEventListener("change", onChange)
    return () => m.removeEventListener("change", onChange)
  }, [])

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme

  React.useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = React.useCallback((t: string) => {
    const next = (["light", "dark", "system"].includes(t) ? t : "light") as Theme
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }, [])

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
