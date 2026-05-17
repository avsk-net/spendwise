import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useAuthStore } from "../../../store/authStore"
import { accountsApi } from "../../accounts/api/accountsApi"
import { reportsApi } from "../../reports/api/reportsApi"
import { budgetsApi } from "../../budgets/api/budgetsApi"
import { transactionsApi } from "../../transactions/api/transactionsApi"
import { transactionsApi as txApi } from "../../transactions/api/transactionsApi"
import ChartWrapper from "../../../components/charts/ChartWrapper"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from "recharts"
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

const COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const c = user?.currency || ""
  const today = new Date()
  const [onboardDismissed, setOnboardDismissed] = useState(false)
  const [onboardStep, setOnboardStep] = useState(1)
  const monthStart = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`
  const todayStr = today.toISOString().split("T")[0]
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list().then(r => r.data),
  })

  const { data: summary } = useQuery({
    queryKey: ["summary", monthStart],
    queryFn: () => reportsApi.summary({ date_from: monthStart, date_to: todayStr }).then(r => r.data),
  })

  const { data: daily = [], isLoading: dailyLoading } = useQuery({
    queryKey: ["daily", monthStart],
    queryFn: () => reportsApi.daily({ month: monthStart }).then(r => r.data),
  })

  const { data: pie = [], isLoading: pieLoading } = useQuery({
    queryKey: ["pie", monthStart],
    queryFn: () => reportsApi.byCategory({ date_from: monthStart, date_to: todayStr }).then(r => r.data),
  })

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", monthStart],
    queryFn: () => budgetsApi.list(monthStart).then(r => r.data),
  })

  const { data: recent = [], isLoading: recentLoading } = useQuery({
    queryKey: ["transactions", "recent"],
    queryFn: () => transactionsApi.list({ page: 1, limit: 8 }).then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => txApi.categories().then(r => r.data),
  })

  const { data: netWorth } = useQuery({
    queryKey: ["net-worth"],
    queryFn: () => import("../../reports/api/reportsApi").then(m => m.reportsApi.netWorth().then(r => r.data)),
  })

  const showOnboarding = !onboardDismissed && !accountsLoading && !recentLoading
    && accounts.length === 0 && recent.length === 0

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0)
  const income  = parseFloat(summary?.total_income  || 0)
  const expense = parseFloat(summary?.total_expense || 0)
  const net     = parseFloat(summary?.net || 0)

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const dailyChartData = daily.map(d => ({
    date: d.date.slice(5),
    income: parseFloat(d.income),
    expense: parseFloat(d.expense),
  }))

  const pieChartData = pie.slice(0, 6).map(p => ({
    name: p.category_name,
    value: parseFloat(p.total),
  }))

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Total Balance" value={`${c} ${totalBalance.toLocaleString("en", {minimumFractionDigits:2})}`}
          icon={<Wallet size={20} />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard
          label="Income (month)" value={`${c} ${income.toLocaleString("en", {minimumFractionDigits:2})}`}
          icon={<TrendingUp size={20} />} color="bg-gradient-to-br from-green-500 to-green-600" />
        <StatCard
          label="Expense (month)" value={`${c} ${expense.toLocaleString("en", {minimumFractionDigits:2})}`}
          icon={<TrendingDown size={20} />} color="bg-gradient-to-br from-red-500 to-red-600" />
        <StatCard
          label="Net (month)" value={`${c} ${net.toLocaleString("en", {minimumFractionDigits:2})}`}
          icon={<Activity size={20} />}
          color={net >= 0 ? "bg-gradient-to-br from-primary-500 to-primary-600" : "bg-gradient-to-br from-orange-500 to-orange-600"} />
      </div>

      {/* Net Worth */}
      {netWorth && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Net Worth</p>
              <p className="text-2xl font-bold mt-1">
                {c} {parseFloat(netWorth.net_worth).toLocaleString("en", {minimumFractionDigits: 2})}
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-right">
                <p className="text-white/60 text-xs">Assets</p>
                <p className="font-semibold text-green-300">
                  {c} {parseFloat(netWorth.total_assets).toLocaleString("en", {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Liabilities</p>
                <p className="font-semibold text-red-300">
                  {c} {parseFloat(netWorth.total_liabilities).toLocaleString("en", {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWrapper title="Daily Income vs Expense" loading={dailyLoading} empty={dailyChartData.length === 0}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyChartData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize:10}} />
              <YAxis tick={{fontSize:10}} />
              <Tooltip formatter={(v) => `${c} ${v.toFixed(2)}`} />
              <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expense" fill="#f87171" radius={[4,4,0,0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Spending by Category" loading={pieLoading} empty={pieChartData.length === 0}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {pieChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${c} ${parseFloat(v).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Accounts</h3>
            <Link to="/accounts" className="text-xs text-primary-600 hover:underline">Manage</Link>
          </div>
          {accounts.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No accounts yet</p>}
          <div className="space-y-3">
            {accounts.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{a.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{a.type.replace("_"," ")}</p>
                </div>
                <p className={`text-sm font-bold ${parseFloat(a.balance) >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {c} {parseFloat(a.balance).toLocaleString("en",{minimumFractionDigits:2})}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Budget Usage</h3>
            <Link to="/budgets" className="text-xs text-primary-600 hover:underline">Manage</Link>
          </div>
          {budgets.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No budgets set</p>}
          <div className="space-y-4">
            {budgets.slice(0,5).map(b => {
              const cat = catMap[b.category_id] || {}
              const pct = Math.min(b.percent || 0, 100)
              const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-400" : "bg-primary-500"
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{cat.icon} {cat.name || "Category"}</span>
                    <span className="text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className={`h-full ${color} transition-all duration-500`} style={{width:`${pct}%`}} />
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-gray-400">
                    <span>Spent: {c} {parseFloat(b.spent||0).toFixed(0)}</span>
                    <span>Limit: {c} {parseFloat(b.amount).toFixed(0)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No transactions yet</p>}
          <div className="space-y-2">
            {recent.map(t => {
              const cat = catMap[t.category_id] || {}
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon || "💸"}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{cat.name || "Unknown"}</p>
                      <p className="text-xs text-gray-400">{t.date}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-500" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "-"}{c} {parseFloat(t.amount).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Onboarding wizard */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setOnboardDismissed(true)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>

            {onboardStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Welcome to SpendWise 👋</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Let&apos;s get you set up in 3 quick steps so you can start tracking your finances.
                </p>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setOnboardDismissed(true)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    Skip for now
                  </button>
                  <button onClick={() => setOnboardStep(2)}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Get Started →
                  </button>
                </div>
              </div>
            )}

            {onboardStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step 1 of 2</p>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Add your first account</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Accounts represent your bank accounts, wallets, or cash. Every transaction needs an account.
                </p>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setOnboardStep(1)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                  <button onClick={() => { setOnboardDismissed(true); navigate("/accounts") }}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Go to Accounts →
                  </button>
                </div>
              </div>
            )}

            {onboardStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step 2 of 2</p>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Log your first transaction</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Record income, expenses, and transfers between accounts.
                </p>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setOnboardStep(2)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                  <button onClick={() => { setOnboardDismissed(true); navigate("/transactions") }}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Go to Transactions →
                  </button>
                </div>
                <button onClick={() => setOnboardDismissed(true)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`${color} rounded-2xl p-4 md:p-5 text-white shadow-lg`}>
      <div className="flex justify-between items-start mb-2 md:mb-3">
        <p className="text-white/70 text-xs font-medium uppercase tracking-wide leading-tight">{label}</p>
        <div className="opacity-80 shrink-0 ml-1">{icon}</div>
      </div>
      <p className="text-base md:text-xl font-bold leading-tight break-all">{value}</p>
    </div>
  )
}