import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "../../../store/authStore"
import { reportsApi } from "../api/reportsApi"
import { Download } from "lucide-react"
import toast from "react-hot-toast"
import {
  ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts"

const COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#14b8a6","#a855f7"]

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const c = user?.currency || ""
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const [dateFrom, setDateFrom] = useState(`${today.getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(todayStr)
  const [month, setMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  )
  const year = new Date(dateFrom).getFullYear()

  const [activeTab, setActiveTab] = useState("overview")
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  )

  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const res = await reportsApi.exportPdf({ date_from: dateFrom, date_to: dateTo })
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `spendwise_report_${dateFrom}_${dateTo}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Report exported")
    } catch {
      toast.error("Export failed")
    } finally {
      setExportingPdf(false)
    }
  }

  const { data: summary } = useQuery({
    queryKey: ["rep-summary", dateFrom, dateTo],
    queryFn: () => reportsApi.summary({ date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  const { data: monthly = [] } = useQuery({
    queryKey: ["rep-monthly", dateFrom, dateTo],
    queryFn: () => reportsApi.monthly({ year }).then(r => r.data),
  })

  const { data: pie = [] } = useQuery({
    queryKey: ["rep-pie", dateFrom, dateTo],
    queryFn: () => reportsApi.byCategory({ date_from: dateFrom, date_to: dateTo }).then(r => r.data),
  })

  const { data: daily = [] } = useQuery({
    queryKey: ["rep-daily", month],
    queryFn: () => reportsApi.daily({ month }).then(r => r.data),
  })

  const { data: trend = [] } = useQuery({
    queryKey: ["rep-trend"],
    queryFn: () => reportsApi.trend(6).then(r => r.data),
  })

  const { data: bva = [] } = useQuery({
    queryKey: ["budget-vs-actual", selectedMonth],
    queryFn: () => reportsApi.budgetVsActual(selectedMonth).then(r => r.data),
    enabled: activeTab === "budget-vs-actual",
  })

  const income  = parseFloat(summary?.total_income  || 0)
  const expense = parseFloat(summary?.total_expense || 0)
  const net     = parseFloat(summary?.net || 0)
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : 0

  const monthlyChartData = monthly.map(m => ({
    month: m.month,
    Income:  parseFloat(m.income),
    Expense: parseFloat(m.expense),
    Net: parseFloat(m.income) - parseFloat(m.expense),
  }))

  const pieData = pie.slice(0, 8).map(p => ({
    name:  p.category_name,
    value: parseFloat(p.total),
    icon:  p.icon,
  }))

  const dailyData = daily.map(d => ({
    date:    d.date.slice(5),
    Income:  parseFloat(d.income),
    Expense: parseFloat(d.expense),
  }))

  const trendData = trend.map(t => ({
    month:   t.month,
    Income:  parseFloat(t.income),
    Expense: parseFloat(t.expense),
  }))

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      label: d.toLocaleString("default", { month: "long" }),
    }
  })

  const bvaMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    }
  })

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "budget-vs-actual", label: "Budget vs Actual" },
  ]

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "budget-vs-actual" && (
        <div className="space-y-6">
          {/* Month picker */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Month:</label>
            <select
              className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}>
              {bvaMonthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {bva.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
              <p className="text-sm text-gray-400">
                No budgets set for this month.{" "}
                <a href="/budgets" className="text-primary-600 hover:underline">Go to Budgets to create one.</a>
              </p>
            </div>
          ) : (
            <Card title={`Budget vs Actual — ${bvaMonthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}`}>
              <div className="space-y-5">
                {bva.map((row, i) => {
                  const budget = parseFloat(row.budget || 0)
                  const actual = parseFloat(row.actual || 0)
                  const remaining = budget - actual
                  const pctUsed = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0
                  const overBudget = actual > budget
                  const barColor = pctUsed >= 100 ? "bg-red-500" : pctUsed >= 80 ? "bg-yellow-400" : "bg-green-500"
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{row.icon}</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{row.category_name}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-sm">
                          <span className="text-gray-400">{c} {budget.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                          <span className={overBudget ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>
                            {c} {actual.toLocaleString("en", { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-xs ${remaining < 0 ? "text-red-400" : "text-gray-400"}`}>
                            {remaining < 0
                              ? `-${c} ${Math.abs(remaining).toLocaleString("en", { minimumFractionDigits: 2 })} over`
                              : `${c} ${remaining.toLocaleString("en", { minimumFractionDigits: 2 })} left`
                            }
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pctUsed}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 text-right">{budget > 0 ? `${((actual / budget) * 100).toFixed(1)}% used` : "—"}</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "overview" && <>
      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-500">From:</label>
        <input type="date" className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <label className="text-sm text-gray-500">To:</label>
        <input type="date" className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <div className="flex gap-2 ml-auto">
          {[
            { label: "This month", from: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`, to: todayStr },
            { label: "This year", from: `${today.getFullYear()}-01-01`, to: todayStr },
            { label: "Last year", from: `${today.getFullYear()-1}-01-01`, to: `${today.getFullYear()-1}-12-31` },
          ].map(({ label, from, to }) => (
            <button key={label} onClick={() => { setDateFrom(from); setDateTo(to) }}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium transition-colors">
              {label}
            </button>
          ))}
          <button onClick={handleExportPdf} disabled={exportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-medium disabled:opacity-60 transition-colors">
            <Download size={13} />
            {exportingPdf ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Income",   value: income,  color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Total Expense",  value: expense, color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Net Savings",    value: net,     color: net >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Savings Rate",   value: null,    color: parseFloat(savingsRate) >= 20 ? "text-green-600" : "text-orange-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-4`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>
              {s.value !== null
                ? `${c} ${s.value.toLocaleString("en", { minimumFractionDigits: 2 })}`
                : `${savingsRate}%`
              }
            </p>
          </div>
        ))}
      </div>

      {/* Monthly overview */}
      <Card title={`Monthly Income vs Expense — ${dateFrom} to ${dateTo}`}>
        {monthlyChartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => [`${c} ${parseFloat(v).toFixed(2)}`, name]} />
              <Legend />
              <Bar dataKey="Income"  fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Net" stroke="#6366f1" strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} name="Net Savings" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by category */}
        <Card title={`Spending by Category — ${dateFrom} to ${dateTo}`}>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${c} ${parseFloat(v).toFixed(2)}`} />
                <Legend formatter={(value, entry) => `${entry.payload.icon || ""} ${value}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 6-month trend */}
        <Card title="6-Month Income vs Expense Trend">
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => [`${c} ${parseFloat(v).toFixed(2)}`, name]} />
                <Legend />
                <Line type="monotone" dataKey="Income" stroke="#22c55e"
                  strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Expense" stroke="#ef4444"
                  strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Daily breakdown */}
      <Card title="Daily Breakdown">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs text-gray-500">Month:</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={month}
            onChange={e => setMonth(e.target.value)}>
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {dailyData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data for this month</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${c} ${parseFloat(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Income"  fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expense" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Category breakdown table */}
      {pie.length > 0 && (
        <Card title={`Category Breakdown — ${dateFrom} to ${dateTo}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="text-left py-2">Category</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {pie.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2.5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{p.icon} {p.category_name}</span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-700 dark:text-gray-200">
                      {c} {parseFloat(p.total).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-gray-400">
                      {parseFloat(p.percent).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </>}
    </div>
  )
}