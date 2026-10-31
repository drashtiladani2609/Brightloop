"use client"

import * as React from "react"

type Theme = "light" | "dark"
const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {}
})

export const useTheme = () => React.useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("light")

  React.useEffect(() => {
    const stored = (localStorage.getItem("brightloop-theme") as Theme | null) ?? "light"
    apply(stored)
    setThemeState(stored)
  }, [])

  function apply(next: Theme) {
    const root = document.documentElement
    root.classList.toggle("dark", next === "dark")
    root.style.colorScheme = next
  }

  const setTheme = React.useCallback((next: Theme) => {
    localStorage.setItem("brightloop-theme", next)
    apply(next)
    setThemeState(next)
  }, [])

  const toggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
}
