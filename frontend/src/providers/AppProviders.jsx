import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Toaster } from "react-hot-toast"
import { queryClient } from "../lib/queryClient"
import { useEffect } from "react"
import { useThemeStore } from "../store/themeStore"

function ThemeInit() {
  const { initTheme } = useThemeStore()
  useEffect(() => { initTheme() }, [])
  return null
}

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInit />
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}