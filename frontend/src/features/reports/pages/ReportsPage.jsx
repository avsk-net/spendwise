import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "../../../store/authStore"
import { reportsApi } from "../api/reportsApi"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
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
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  )
  const yearStart = `${year}-01-01`
  const yearEnd   = `${year}-12-31`

  const { data: summary } = useQuery({
    queryKey: ["rep-summary", year],
    queryFn: () => reportsApi.summary({ date_from: yearStart, date_to: yearEnd }).then(r => r.data),
  })

  const { data: monthly = [] } = useQuery({
    queryKey: ["rep-monthly", year],
    queryFn: () => reportsApi.monthly({ year }).then(r => r.data),
  })

  const { data: pie = [] } = useQuery({
    queryKey: ["rep-pie", year],
    queryFn: () => reportsApi.byCategory({ date_from: yearStart, date_to: yearEnd }).then(r => r.data),
  })

  const { data: daily = [] } = useQuery({
    queryKey: ["rep-daily", month],
    queryFn: () => reportsApi.daily({ month }).then(r => r.data),
  })

  const { data: trend = [] } = useQuery({
    queryKey: ["rep-trend"],
    queryFn: () => reportsApi.trend(6).then(r => r.data),
  })

  const income  = parseFloat(summary?.total_income  || 0)
  const expense = parseFloat(summary?.total_expense || 0)
  const net     = parseFloat(summary?.net || 0)
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : 0

  const monthlyChartData = monthly.map(m => ({
    month: m.month,
    Income:  parseFloat(m.income),
    Expense: parseFloat(m.expense),
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
    Expense: parseFloat(t.expense),
  }))

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      label: d.toLocaleString("default", { month: "long" }),
    }
  })

  const yearOptions = [today.getFullYear() - 1, today.getFullYear()]

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500">Year:</label>
        <div className="flex gap-2">
          {yearOptions.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                year === y
                  ? "bg-primary-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {y}
            </button>
          ))}
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
      <Card title={`Monthly Income vs Expense — ${year}`}>
        {monthlyChartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${c} ${parseFloat(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Income"  fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by category */}
        <Card title={`Spending by Category — ${year}`}>
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

        {/* 6-month spending trend */}
        <Card title="6-Month Spending Trend">
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${c} ${parseFloat(v).toFixed(2)}`} />
                <Line type="monotone" dataKey="Expense" stroke="#ef4444"
                  strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
        <Card title={`Category Breakdown — ${year}`}>
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
    </div>
  )
}