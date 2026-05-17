import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, RefreshCw, Calendar, Pause, Play, Pencil } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { recurringApi } from "../api/recurringApi"
import { transactionsApi } from "../../transactions/api/transactionsApi"
import { accountsApi } from "../../accounts/api/accountsApi"
import toast from "react-hot-toast"

function relativeDate(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return { label: "Today", cls: "text-orange-500 font-medium" }
  if (diff === 1) return { label: "Tomorrow", cls: "text-blue-500" }
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: "text-red-500 font-medium" }
  return { label: `in ${diff}d`, cls: "text-gray-400" }
}

const FREQ_COLORS = {
  daily:   "bg-red-100 text-red-600",
  weekly:  "bg-orange-100 text-orange-600",
  monthly: "bg-blue-100 text-blue-600",
  yearly:  "bg-purple-100 text-purple-600",
}

const EMPTY_FORM = {
  type: "expense", account_id: "", category_id: "",
  amount: "", frequency: "monthly",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "", notes: "",
}

export default function RecurringPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const c = user?.currency || ""
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editRule, setEditRule] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["recurring"],
    queryFn: () => recurringApi.list().then(r => r.data),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list().then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => transactionsApi.categories().then(r => r.data),
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]))
  const filteredCats = categories.filter(c => c.type === "both" || c.type === form.type)

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data) => recurringApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] })
      toast.success("Recurring rule created")
      setModal(false)
      setForm(EMPTY_FORM)
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }) => recurringApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] })
      toast.success("Rule updated")
      setEditRule(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to update"),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, is_active }) => recurringApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => recurringApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring"] })
      toast.success("Rule removed")
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      amount: parseFloat(form.amount),
      end_date: form.end_date || null,
    }
    create(data)
  }

  const handleEdit = (rule) => {
    setEditRule(rule)
    setEditForm({
      type: rule.type,
      account_id: rule.account_id,
      category_id: rule.category_id,
      amount: String(rule.amount),
      frequency: rule.frequency,
      start_date: rule.start_date,
      end_date: rule.end_date || "",
      notes: rule.notes || "",
    })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    update({ id: editRule.id, data: { ...editForm, amount: parseFloat(editForm.amount), end_date: editForm.end_date || null } })
  }

  const activeRules   = rules.filter(r => r.is_active)
  const inactiveRules = rules.filter(r => !r.is_active)

  const monthlyTotal = activeRules.reduce((s, r) => {
    const amt = parseFloat(r.amount)
    if (r.frequency === "monthly") return s + amt
    if (r.frequency === "weekly")  return s + (amt * 4.33)
    if (r.frequency === "daily")   return s + (amt * 30)
    if (r.frequency === "yearly")  return s + (amt / 12)
    return s
  }, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <p className="text-blue-100 text-xs mb-1">Active Rules</p>
          <p className="text-2xl font-bold">{activeRules.length}</p>
        </div>
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
          <p className="text-green-100 text-xs mb-1">Est. Monthly</p>
          <p className="text-2xl font-bold">{c} {monthlyTotal.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl p-4 text-white">
          <p className="text-gray-300 text-xs mb-1">Paused Rules</p>
          <p className="text-2xl font-bold">{inactiveRules.length}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recurring Rules</h2>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <RefreshCw size={40} className="mx-auto mb-3 opacity-30" />
          No recurring rules yet. Add one to automate your transactions.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(r => {
            const cat = catMap[r.category_id] || {}
            const acc = accMap[r.account_id] || {}
            return (
              <div key={r.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 transition-opacity ${
                  r.is_active
                    ? "border-gray-100 dark:border-gray-700"
                    : "border-gray-100 dark:border-gray-700 opacity-60"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gray-100 dark:bg-gray-700 shrink-0">
                      {cat.icon || "💸"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{cat.name || "Unknown"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQ_COLORS[r.frequency]}`}>
                          {r.frequency}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}>
                          {r.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <p className="text-xs text-gray-400">{acc.name || "Unknown account"}</p>
                        {(() => {
                          const rel = relativeDate(r.next_run_date)
                          return (
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar size={11} className="text-gray-400" />
                              <span className="text-gray-400">Next:</span>
                              <span className={rel.cls}>{rel.label}</span>
                              <span className="text-gray-300">({r.next_run_date})</span>
                            </div>
                          )
                        })()}
                        {r.notes && <p className="text-xs text-gray-400 truncate max-w-[10rem]">{r.notes}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className={`text-sm font-bold whitespace-nowrap ${
                      r.type === "income" ? "text-green-600" : "text-red-500"
                    }`}>
                      {r.type === "income" ? "+" : "-"}{c} {parseFloat(r.amount).toFixed(2)}
                    </p>
                    <button
                      onClick={() => handleEdit(r)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => toggle({ id: r.id, is_active: !r.is_active })}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={r.is_active ? "Pause" : "Resume"}>
                      {r.is_active ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button
                      onClick={() => { if (window.confirm("Remove this rule?")) remove(r.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Add Recurring Rule</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              <div className="flex gap-2">
                {["income", "expense"].map(type => (
                  <button key={type} type="button"
                    onClick={() => setForm(f => ({ ...f, type }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      form.type === type
                        ? type === "income" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <input type="number" step="0.01" placeholder="Amount" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />

              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {filteredCats.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>

              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date (optional)</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>

              <input type="text" placeholder="Notes (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {isPending ? "Saving…" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRule !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Edit Recurring Rule</h2>
              <button onClick={() => setEditRule(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-4 space-y-3">
              <div className="flex gap-2">
                {["income", "expense"].map(type => (
                  <button key={type} type="button"
                    onClick={() => setEditForm(f => ({ ...f, type }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      editForm.type === type
                        ? type === "income" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <input type="number" step="0.01" placeholder="Amount" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />

              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.account_id} onChange={e => setEditForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.category_id} onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {categories.filter(cat => cat.type === "both" || cat.type === editForm.type).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>

              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.frequency} onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date (optional)</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>

              <input type="text" placeholder="Notes (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditRule(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {isUpdating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
