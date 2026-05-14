import { Bell, Sun, Moon, Menu } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useThemeStore } from "../../store/themeStore"
import { useNotifStore } from "../../store/notifStore"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationsApi } from "../../features/notifications/api/notificationsApi"
import { useEffect, useState } from "react"

const TITLES = {
  "/dashboard":    "Dashboard",
  "/transactions": "Transactions",
  "/accounts":     "Accounts",
  "/budgets":      "Budgets",
  "/recurring":    "Recurring",
  "/saving-goals": "Goals",
  "/reports":      "Reports",
  "/settings":     "Settings",
}

export default function TopBar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { notifications, unreadCount, setNotifications, clearUnread } = useNotifStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (data) setNotifications(data)
  }, [data])

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead()
    clearUnread()
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
    setShowNotifs(false)
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden shrink-0"
          aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-800 dark:text-white truncate">
          {TITLES[pathname] || "Spendwise"}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button onClick={toggleTheme}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="relative">
          <button onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-screen max-w-xs sm:w-80 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="font-medium text-sm text-gray-800 dark:text-white">Notifications</span>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead}
                      className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)}
                    className="text-gray-400 text-xs hover:text-gray-600">
                    Close
                  </button>
                </div>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                {notifications.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-gray-400">All clear 🎉</li>
                )}
                {notifications.map((n) => (
                  <li key={n.id}
                    className={`px-4 py-3 text-sm ${n.is_read ? "text-gray-400" : "text-gray-800 dark:text-white font-medium"}`}>
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
