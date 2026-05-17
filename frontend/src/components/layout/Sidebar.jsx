import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target,
  RefreshCw, BarChart2, Settings, LogOut, TrendingUp, PiggyBank, X,
  Tag, CreditCard, NotebookText
} from "lucide-react"
import { useAuthStore } from "../../store/authStore"
import { authApi } from "../../features/auth/api/authApi"

const NAV = [
  { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/accounts",     label: "Accounts",     icon: Wallet },
  { to: "/categories",   label: "Categories",   icon: Tag },
  { to: "/budgets",      label: "Budgets",      icon: Target },
  { to: "/recurring",    label: "Recurring",    icon: RefreshCw },
  { to: "/saving-goals", label: "Goals",        icon: PiggyBank },
  { to: "/debts",        label: "Debts",        icon: CreditCard },
  { to: "/notepad",      label: "Notepad",      icon: NotebookText },
  { to: "/reports",      label: "Reports",      icon: BarChart2 },
  { to: "/settings",     label: "Settings",     icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { user, refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken) } catch { /* ignore logout errors */ }
    logout()
    navigate("/login")
  }

  const handleNavClick = () => {
    // Close sidebar on mobile when a nav item is tapped
    if (onClose) onClose()
  }

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-64
      bg-gray-900 flex flex-col py-5 px-3 shrink-0
      transform transition-transform duration-300 ease-in-out
      ${open ? "translate-x-0" : "-translate-x-full"}
      md:relative md:translate-x-0 md:w-60
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">Spendwise</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors md:hidden"
          aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }>
            <Icon size={17} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary-400 text-sm font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            <p className="text-gray-500 text-xs truncate">{user?.currency}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-xl text-sm transition-colors">
          <LogOut size={16} className="shrink-0" /> Logout
        </button>
      </div>
    </aside>
  )
}
