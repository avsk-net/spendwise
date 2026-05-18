import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Wallet, CreditCard, Smartphone, Building2, Coins, Pencil, ExternalLink, TrendingUp } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useAuthStore } from "../../../store/authStore"
import { accountsApi } from "../api/accountsApi"
import toast from "react-hot-toast"

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const monthLabel = (ym) => {
  const mm = parseInt(ym.slice(5), 10)
  return MONTH_NAMES[mm - 1] || ym
}

const TYPE_ICONS = {
  cash: Coins,
  bank: Building2,
  credit_card: CreditCard,
  mobile_banking: Smartphone,
  other: Wallet,
}

const TYPE_COLORS = {
  cash:           "from-yellow-400 to-yellow-500",
  bank:           "from-blue-500 to-blue-600",
  credit_card:    "from-purple-500 to-purple-600",
  mobile_banking: "from-green-500 to-green-600",
  other:          "from-gray-500 to-gray-600",
}

const EMPTY_FORM = { name: "", type: "bank", balance: "0" }

export default function AccountsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const c = user?.currency || ""
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editAccount, setEditAccount] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", type: "bank", balance: "0" })

  const [selectedAccountId, setSelectedAccountId] = useState(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list().then(r => r.data),
  })

  const resolvedAccountId = selectedAccountId ?? accounts[0]?.id ?? null

  const { data: balanceHistoryData = [] } = useQuery({
    queryKey: ["balance-history", resolvedAccountId],
    queryFn: () => accountsApi.balanceHistory(resolvedAccountId).then(r => r.data),
    enabled: !!resolvedAccountId,
  })

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data) => accountsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Account created")
      setModal(false)
      setForm(EMPTY_FORM)
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: update, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }) => accountsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Account updated")
      setEditAccount(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to update"),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => accountsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] })
      toast.success("Account removed")
    },
  })

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    create({ ...form, balance: parseFloat(form.balance) })
  }

  const handleEdit = (account) => {
    setEditAccount(account)
    setEditForm({ name: account.name, type: account.type, balance: String(account.balance) })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    update({ id: editAccount.id, data: { ...editForm, balance: parseFloat(editForm.balance) } })
  }

  return (
    <div className="space-y-6">
      {/* Total balance banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        <p className="text-gray-400 text-sm mb-1">Total Balance Across All Accounts</p>
        <p className="text-3xl font-bold">
          {c} {totalBalance.toLocaleString("en", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-gray-400 text-sm mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your Accounts</h2>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Account cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No accounts yet. Add your first account to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => {
            const Icon = TYPE_ICONS[a.type] || Wallet
            const gradient = TYPE_COLORS[a.type] || TYPE_COLORS.other
            const bal = parseFloat(a.balance || 0)
            return (
              <div key={a.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className={`bg-gradient-to-r ${gradient} p-4 flex justify-between items-start`}>
                  <div className="bg-white/20 rounded-xl p-2">
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(a)}
                      className="text-white/60 hover:text-white transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Remove ${a.name}?`)) remove(a.id) }}
                      className="text-white/60 hover:text-white transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedAccountId(a.id)}>
                  <p className="font-semibold text-gray-800 dark:text-white">{a.name}</p>
                  <p className="text-xs text-gray-400 capitalize mb-3">{a.type.replace("_", " ")}</p>
                  <p className={`text-xl font-bold ${bal >= 0 ? "text-gray-900 dark:text-white" : "text-red-500"}`}>
                    {c} {bal.toLocaleString("en", { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/transactions?account_id=${a.id}`) }}
                    className="flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-primary-500 transition-colors">
                    <ExternalLink size={11} />
                    View Transactions
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Balance History */}
      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Balance History</h3>
            </div>
            <select
              className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={resolvedAccountId || ""}
              onChange={e => setSelectedAccountId(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          {balanceHistoryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No history data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={balanceHistoryData.map(d => ({ ...d, month: monthLabel(d.month) }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={60}
                  tickFormatter={v => `${c}${v.toLocaleString("en", { maximumFractionDigits: 0 })}`} />
                <Tooltip
                  formatter={(value) => [`${c} ${parseFloat(value).toFixed(2)}`, "Balance"]}
                  contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="balance" stroke="#6366f1" fill="url(#balanceGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Add Account</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              <input type="text" placeholder="Account name (e.g. bKash, BRAC Bank)" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="credit_card">Credit Card</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="other">Other</option>
              </select>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Opening Balance</label>
                <input type="number" step="0.01" placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {isPending ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editAccount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Edit Account</h2>
              <button onClick={() => setEditAccount(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-4 space-y-3">
              <input type="text" placeholder="Account name (e.g. bKash, BRAC Bank)" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />

              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="credit_card">Credit Card</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="other">Other</option>
              </select>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Balance</label>
                <input type="number" step="0.01" placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={editForm.balance} onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditAccount(null)}
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
