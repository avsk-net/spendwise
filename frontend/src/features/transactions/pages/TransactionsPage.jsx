import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { transactionsApi } from "../api/transactionsApi"
import toast from "react-hot-toast"

const EMPTY_FORM = {
  type: "expense", account_id: "", category_id: "",
  amount: "", date: new Date().toISOString().split("T")[0],
  notes: "", tags: "",
}

export default function TransactionsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const c = user?.currency || ""
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState({ page: 1, limit: 20 })

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => transactionsApi.list(filters).then(r => r.data),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => import("../../accounts/api/accountsApi").then(m => m.accountsApi.list().then(r => r.data)),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => transactionsApi.categories().then(r => r.data),
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]))

  const filteredCats = categories.filter(c =>
    c.type === "both" || c.type === form.type
  )

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (data) => transactionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["summary"] })
      toast.success("Transaction added")
      setModal(null)
      setForm(EMPTY_FORM)
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }) => transactionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Transaction updated")
      setModal(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => transactionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Deleted")
    },
  })

  const openCreate = () => { setForm(EMPTY_FORM); setModal("create") }
  const openEdit = (t) => {
    setForm({
      type: t.type, account_id: t.account_id, category_id: t.category_id,
      amount: t.amount, date: t.date, notes: t.notes || "",
      tags: (t.tags || []).join(", "),
    })
    setModal(t.id)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      amount: parseFloat(form.amount),
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    }
    if (modal === "create") create(data)
    else update({ id: modal, data })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            onChange={e => setFilters(f => ({ ...f, type: e.target.value || undefined, page: 1 }))}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            onChange={e => setFilters(f => ({ ...f, account_id: e.target.value || undefined, page: 1 }))}>
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No transactions yet. Add your first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                {["Date","Category","Account","Type","Amount","Notes",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {txns.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span>{catMap[t.category_id]?.icon}</span>
                      <span className="text-gray-700 dark:text-gray-200">{catMap[t.category_id]?.name || "—"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{accMap[t.account_id]?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>{t.type}</span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "-"}{c} {parseFloat(t.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-32 truncate">{t.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(t)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (window.confirm("Delete this transaction?")) remove(t.id) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{txns.length} transactions</span>
        <div className="flex gap-2">
          <button disabled={filters.page === 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
            Previous
          </button>
          <button disabled={txns.length < filters.limit}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">
                {modal === "create" ? "Add Transaction" : "Edit Transaction"}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              {/* Type toggle */}
              <div className="flex gap-2">
                {["income","expense"].map(type => (
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
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>

              <input type="date" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />

              <input type="text" placeholder="Notes (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

              <input type="text" placeholder="Tags: food, travel (comma separated)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating || updating}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {creating || updating ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}