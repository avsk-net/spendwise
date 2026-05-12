import { Bell, Sun, Moon, Search } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useThemeStore } from "../../store/themeStore"
import { useNotifStore } from "../../store/notifStore"
import { useQuery } from "@tanstack/react-query"
import { notificationsApi } from "../../features/notifications/api/notificationsApi"
import { useEffect, useState } from "react"

const TITLES = {
  "/dashboard":    "Dashboard",
  "/transactions": "Transactions",
  "/accounts":     "Accounts",
  "/budgets":      "Budgets",
  "/recurring":    "Recurring",
  "/reports":      "Reports",
  "/settings":     "Settings",
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { unreadCount, setNotifications } = useNotifStore()
  const [showNotifs, setShowNotifs] = useState(false)

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 60000,
  })

  useEffect(() => {
    if (data) setNotifications(data)
  }, [data])

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-800 dark:text-white">
        {TITLES[pathname] || "Spendwise"}
      </h1>

      <div className="flex items-center gap-3">
        <button onClick={toggleTheme}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="relative">
          <button onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-80 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="font-medium text-sm text-gray-800 dark:text-white">Notifications</span>
                <button onClick={() => setShowNotifs(false)} className="text-gray-400 text-xs hover:text-gray-600">Close</button>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                {(!data || data.length === 0) && (
                  <li className="px-4 py-8 text-center text-sm text-gray-400">All clear 🎉</li>
                )}
                {data?.map((n) => (
                  <li key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? "text-gray-400" : "text-gray-800 dark:text-white font-medium"}`}>
                    <span className="mr-2">
                      {n.type === "budget_exceeded" ? "🔴" : n.type === "budget_warning" ? "🟡" : "ℹ️"}
                    </span>
                    {n.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
