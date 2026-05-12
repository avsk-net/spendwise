import { useEffect } from "react"
import { useThemeStore } from "../store/themeStore"

export function ThemeProvider({ children }) {
  const { initTheme } = useThemeStore()
  useEffect(() => { initTheme() }, [])
  return <>{children}</>
}