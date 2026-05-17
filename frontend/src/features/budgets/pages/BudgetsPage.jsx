import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Target } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { budgetsApi } from "../api/budgetsApi"
import { transactionsApi } from "../../transactions/api/transactionsApi"
import toast from "react-hot-toast"

export default function BudgetsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const c = user?.currency || ""
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  )
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ category_id: "", amount: "", rollover: false })
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", selectedMonth],
    queryFn: () => budgetsApi.list(selectedMonth).then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => transactionsApi.categories().then(r => r.data),
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const expenseCategories = categories.filter(c => c.type === "expense" || c.type === "both")
  const usedCategoryIds = new Set(budgets.map(b => b.category_id))
  const availableCategories = expenseCategories.filter(c => !usedCategoryIds.has(c.id))

  const totalBudget  = budgets.reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  const totalSpent   = budgets.reduce((s, b) => s + parseFloat(b.spent || 0), 0)
  const overallPct   = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data) => budgetsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] })
      toast.success("Budget set")
      setModal(false)
      setForm({ category_id: "", amount: "", rollover: false })
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => budgetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] })
      toast.success("Budget removed")
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    create({ ...form, amount: parseFloat(form.amount), rollover: form.rollover, month: selectedMonth })
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <select
          className="w-full sm:w-auto border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}>
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button onClick={() => setModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> Set Budget
        </button>
      </div>

      {/* Overall summary */}
      {budgets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Overall Budget</p>
              <p className="text-xs text-gray-400">
                {c} {totalSpent.toFixed(0)} spent of {c} {totalBudget.toFixed(0)}
              </p>
            </div>
            <span className={`text-sm font-bold ${overallPct >= 100 ? "text-red-500" : overallPct >= 80 ? "text-yellow-500" : "text-green-500"}`}>
              {overallPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallPct >= 100 ? "bg-red-500" : overallPct >= 80 ? "bg-yellow-400" : "bg-primary-500"
              }`}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          No budgets set for this month. Add one to start tracking.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            const cat    = catMap[b.category_id] || {}
            const pct    = Math.min(b.percent || 0, 100)
            const spent  = parseFloat(b.spent || 0)
            const amount = parseFloat(b.amount)
            const left   = amount - spent
            const color  = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-400" : "bg-primary-500"
            const textColor = pct >= 100 ? "text-red-500" : pct >= 80 ? "text-yellow-500" : "text-primary-600"

            return (
              <div key={b.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white text-sm">{cat.name}</p>
                      <p className="text-xs text-gray-400">
                        {left >= 0 ? `${c} ${left.toFixed(0)} remaining` : `${c} ${Math.abs(left).toFixed(0)} over budget`}
                      </p>
                      {b.rollover_amount > 0 && (
                        <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                          +{c} {parseFloat(b.rollover_amount).toFixed(2)} rollover
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${textColor}`}>{pct.toFixed(0)}%</span>
                    {confirmRemoveId === b.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { remove(b.id); setConfirmRemoveId(null) }}
                          className="px-2 py-0.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                          Remove
                        </button>
                        <button onClick={() => setConfirmRemoveId(null)}
                          className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRemoveId(b.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden mb-3">
                  <div className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }} />
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                  <span>Spent: <span className="font-medium text-gray-600 dark:text-gray-300">{c} {spent.toFixed(2)}</span></span>
                  <span>Limit: <span className="font-medium text-gray-600 dark:text-gray-300">{c} {amount.toFixed(2)}</span></span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Set Budget</h2>
              <button onClick={() => { setModal(false); setForm({ category_id: "", amount: "", rollover: false }) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              {availableCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  All expense categories already have budgets this month.
                </p>
              ) : (
                <>
                  <select required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Select category</option>
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>

                  <input type="number" step="0.01" placeholder="Monthly limit" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />

                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.rollover} onChange={e => setForm(f => ({ ...f, rollover: e.target.checked }))} className="rounded" />
                    Roll over unused amount to next month
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setModal(false); setForm({ category_id: "", amount: "", rollover: false }) }}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isPending}
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                      {isPending ? "Saving…" : "Set Budget"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}