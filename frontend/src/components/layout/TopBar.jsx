import { Bell, Sun, Moon, Menu, Search } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useThemeStore } from "../../store/themeStore"
import { useNotifStore } from "../../store/notifStore"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationsApi } from "../../features/notifications/api/notificationsApi"
import { transactionsApi } from "../../features/transactions/api/transactionsApi"
import { useEffect, useState, useRef } from "react"
import { useAuthStore } from "../../store/authStore"

const TITLES = {
  "/dashboard":    "Dashboard",
  "/transactions": "Transactions",
  "/accounts":     "Accounts",
  "/budgets":      "Budgets",
  "/recurring":    "Recurring",
  "/saving-goals": "Goals",
  "/reports":      "Reports",
  "/settings":     "Settings",
  "/notepad":      "Notepad",
  "/categories":   "Categories",
  "/debts":        "Debts",
}

export default function TopBar({ onMenuClick }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const { notifications, unreadCount, setNotifications, clearUnread } = useNotifStore()
  const { user } = useAuthStore()
  const c = user?.currency || ""
  const [showNotifs, setShowNotifs] = useState(false)
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)

  const { data: searchResults = [] } = useQuery({
    queryKey: ["global-search", searchQuery],
    queryFn: () => transactionsApi.list({ search: searchQuery, limit: 5 }).then(r => r.data),
    enabled: searchQuery.length >= 2,
  })

  // Click-outside to close search dropdown
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

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
        <h1 className="text-base font-semibold text-gray-800 dark:text-white truncate hidden sm:block">
          {TITLES[pathname] || "Spendwise"}
        </h1>

        {/* Global search */}
        <div ref={searchRef} className="relative ml-2">
          <div className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 rounded-xl px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 w-44 sm:w-52 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search transactions…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
              onFocus={() => setShowSearch(true)}
              onKeyDown={e => { if (e.key === "Escape") { setSearchQuery(""); setShowSearch(false) } }}
              className="bg-transparent text-xs text-gray-700 dark:text-gray-200 outline-none w-full placeholder-gray-400"
            />
          </div>

          {showSearch && searchQuery.length >= 2 && (
            <div className="absolute left-0 top-10 w-72 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-3">No results found</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                  {searchResults.map(t => (
                    <li key={t.id}
                      onClick={() => { setSearchQuery(""); setShowSearch(false); navigate("/transactions") }}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                          {t.notes || t.date}
                        </p>
                        <p className="text-xs text-gray-400">{t.date}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          t.type === "income"   ? "bg-green-100 text-green-700"
                          : t.type === "expense" ? "bg-red-100 text-red-600"
                          : t.type === "transfer" ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                        }`}>{t.type}</span>
                        <span className={`text-xs font-semibold ${
                          t.type === "income" || t.type === "refund" ? "text-green-600"
                          : t.type === "transfer" ? "text-blue-500"
                          : "text-red-500"
                        }`}>
                          {c} {parseFloat(t.amount).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
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
