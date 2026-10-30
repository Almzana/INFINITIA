import * as React from "react"
import { LANG_KEY, type Lang, getLang, setCurrentLang } from "./core"

const LangContext = React.createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null)

/**
 * Holds the UI language. Changing it remounts everything below (component state resets, the data
 * store above it is kept), so all t() calls render in the new language.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(getLang)
  // Set before children render so t() already sees the new language
  setCurrentLang(lang)

  React.useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = React.useCallback((l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* storage unavailable: still switch for this visit */
    }
    setLangState(l)
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <React.Fragment key={lang}>{children}</React.Fragment>
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = React.useContext(LangContext)
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider")
  return ctx
}
