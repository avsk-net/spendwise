import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light"
        document.documentElement.classList.toggle("dark", next === "dark")
        set({ theme: next })
      },
      initTheme: () => {
        document.documentElement.classList.toggle("dark", get().theme === "dark")
      },
    }),
    { name: "spendwise-theme" }
  )
)