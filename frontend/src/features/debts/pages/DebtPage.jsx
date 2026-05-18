import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { debtsApi } from "../api/debtsApi"
import toast from "react-hot-toast"

const EMPTY_DEBT = {
  counterparty: "", type: "borrowed", principal: "", interest_rate: "",
  due_date: "", notes: "",
}

const EMPTY_PAYMENT = {
  amount: "", date: new Date().toISOString().split("T")[0], notes: "",
}

const inputCls = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function DebtModal({ debt, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(
    debt
      ? {
          counterparty: debt.counterparty || "",
          type: debt.type || "borrowed",
          principal: debt.principal || "",
          interest_rate: debt.interest_rate || "",
          due_date: debt.due_date || "",
          notes: debt.notes || "",
          status: debt.status || "active",
        }
      : { ...EMPTY_DEBT }
  )

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (data) => debtsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] })
      toast.success("Debt added")
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: (data) => debtsApi.update(debt.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] })
      toast.success("Debt updated")
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      principal: parseFloat(form.principal),
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : undefined,
      due_date: form.due_date || undefined,
      notes: form.notes || undefined,
    }
    if (!debt) {
      // eslint-disable-next-line no-unused-vars
      const { status: _s, ...rest } = data
      create(rest)
    } else {
      update(data)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            {debt ? "Edit Debt" : "New Debt"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <input
            type="text"
            placeholder="Counterparty name (e.g. John, Bank)"
            required
            className={inputCls}
            value={form.counterparty}
            onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))}
          />
          <div className="flex gap-2">
            {["borrowed", "lent"].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  form.type === t
                    ? t === "borrowed"
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                }`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Principal amount"
            required
            className={inputCls}
            value={form.principal}
            onChange={e => setForm(f => ({ ...f, principal: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Interest Rate % (optional, e.g. 0)"
            className={inputCls}
            value={form.interest_rate}
            onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
          />
          <input
            type="date"
            className={inputCls}
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
          <textarea
            placeholder="Notes (optional)"
            rows={2}
            className={inputCls}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          {debt && (
            <select
              className={inputCls}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="forgiven">Forgiven</option>
            </select>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || updating}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
              {creating || updating ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PaymentModal({ debt, onClose }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const c = user?.currency || ""
  const [form, setForm] = useState({ ...EMPTY_PAYMENT })
  const [confirmPaymentId, setConfirmPaymentId] = useState(null)

  const { mutate: addPayment, isPending } = useMutation({
    mutationFn: (data) => debtsApi.addPayment(debt.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] })
      toast.success("Payment recorded")
      setForm({ ...EMPTY_PAYMENT })
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: deletePayment } = useMutation({
    mutationFn: (paymentId) => debtsApi.deletePayment(debt.id, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] })
      toast.success("Payment removed")
    },
    onError: () => toast.error("Failed to remove payment"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    addPayment({
      amount: parseFloat(form.amount),
      date: form.date,
      notes: form.notes || undefined,
    })
  }

  const payments = debt.payments || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            Payments — {debt.counterparty}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3 border-b border-gray-100 dark:border-gray-700">
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Payment amount"
            required
            className={inputCls}
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
          <input
            type="date"
            required
            className={inputCls}
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            className={inputCls}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
            {isPending ? "Adding…" : "Add Payment"}
          </button>
        </form>
        <div className="px-6 py-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment History</p>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No payments yet</p>
          ) : (
            payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {c} {parseFloat(p.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.date).toLocaleDateString()}{p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                {confirmPaymentId === p.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Remove?</span>
                    <button onClick={() => { deletePayment(p.id); setConfirmPaymentId(null) }}
                      className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors">Yes</button>
                    <button onClick={() => setConfirmPaymentId(null)}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmPaymentId(p.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DebtCard({ debt, c, onEdit, onAddPayment, onMarkPaid, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const principal = parseFloat(debt.principal || 0)
  const paid = parseFloat(debt.paid_amount || 0)
  const remaining = principal - paid
  const pct = principal > 0 ? Math.min((paid / principal) * 100, 100) : 0
  const isBorrowed = debt.type === "borrowed"

  const today = new Date().toISOString().split("T")[0]
  const isOverdue = debt.due_date && debt.due_date < today && debt.status === "active"

  const statusBadge = {
    active: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    forgiven: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  }[debt.status] || "bg-gray-100 text-gray-500"

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-3 h-3 rounded-full shrink-0 ${isBorrowed ? "bg-red-400" : "bg-blue-400"}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                {debt.counterparty}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isBorrowed ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"}`}>
                {isBorrowed ? "Borrowed" : "Lent"}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>
                {debt.status}
              </span>
            </div>
            {debt.due_date && (
              <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {isOverdue ? "Overdue: " : "Due: "}
                {new Date(debt.due_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <p className="text-base font-bold text-gray-800 dark:text-white shrink-0">
          {c} {principal.toFixed(2)}
        </p>
      </div>

      <div className="mb-2">
        <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Paid: {c} {paid.toFixed(2)} / {c} {remaining.toFixed(2)} remaining
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAddPayment(debt)}
          className="flex items-center gap-1 px-3 py-1.5 border border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
          <Plus size={12} /> Add Payment
        </button>
        {debt.status === "active" && (
          <button
            onClick={() => onMarkPaid(debt)}
            className="px-3 py-1.5 border border-green-400 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
            Mark Paid
          </button>
        )}
        <button
          onClick={() => onEdit(debt)}
          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
          <Pencil size={14} />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Delete debt?</span>
            <button onClick={() => { onDelete(debt.id); setConfirmDelete(false) }}
              className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors">Yes</button>
            <button onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors">No</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function DebtPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const c = user?.currency || ""

  const [modal, setModal] = useState(null)
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [editDebt, setEditDebt] = useState(null)
  const [paymentDebt, setPaymentDebt] = useState(null)

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => debtsApi.list().then(r => r.data),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => debtsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] })
      toast.success("Debt deleted")
    },
    onError: () => toast.error("Failed to delete"),
  })

  const { mutate: markPaid } = useMutation({
    mutationFn: (debt) => debtsApi.update(debt.id, { status: "paid" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] })
      toast.success("Marked as paid")
    },
    onError: () => toast.error("Failed"),
  })

  const borrowed = debts.filter(d => d.type === "borrowed" && d.status === "active")
  const lent = debts.filter(d => d.type === "lent" && d.status === "active")
  const totalOwed = borrowed.reduce((s, d) => s + (parseFloat(d.principal || 0) - parseFloat(d.paid_amount || 0)), 0)
  const totalOwedToMe = lent.reduce((s, d) => s + (parseFloat(d.principal || 0) - parseFloat(d.paid_amount || 0)), 0)
  const net = totalOwedToMe - totalOwed

  const filtered = debts.filter(d => {
    const typeOk = typeFilter === "all" || d.type === typeFilter
    const statusOk = statusFilter === "all" || d.status === statusFilter
    return typeOk && statusOk
  })

  const tabCls = (active) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-primary-600 text-white"
        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
    }`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Debt Tracker</h1>
        <button
          onClick={() => { setEditDebt(null); setModal("create") }}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={15} /> New Debt
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total I Owe"
          value={`${c} ${totalOwed.toFixed(2)}`}
          color="text-red-500"
        />
        <SummaryCard
          label="Total Owed to Me"
          value={`${c} ${totalOwedToMe.toFixed(2)}`}
          color="text-blue-500"
        />
        <SummaryCard
          label="Net Position"
          value={`${net >= 0 ? "+" : ""}${c} ${net.toFixed(2)}`}
          color={net >= 0 ? "text-green-500" : "text-red-500"}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {["all", "borrowed", "lent"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={tabCls(typeFilter === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {["all", "active", "paid", "forgiven"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={tabCls(statusFilter === s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          {debts.length === 0 ? "No debts tracked yet. Add one to get started." : "No debts match the current filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              c={c}
              onEdit={(d) => { setEditDebt(d); setModal("edit") }}
              onAddPayment={(d) => setPaymentDebt(d)}
              onMarkPaid={(d) => markPaid(d)}
              onDelete={(id) => remove(id)}
            />
          ))}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <DebtModal
          debt={modal === "edit" ? editDebt : null}
          onClose={() => { setModal(null); setEditDebt(null) }}
        />
      )}

      {paymentDebt && (
        <PaymentModal
          debt={paymentDebt}
          onClose={() => setPaymentDebt(null)}
        />
      )}
    </div>
  )
}
