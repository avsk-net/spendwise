import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, PiggyBank, CheckCircle2 } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { savingGoalsApi } from "../api/savingGoalsApi"
import toast from "react-hot-toast"

const EMPTY_FORM = { name: "", icon: "🎯", target_amount: "", deadline: "", notes: "" }

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function SavingGoalsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const c = user?.currency || ""

  const [goalModal, setGoalModal]           = useState(false)
  const [editTarget, setEditTarget]         = useState(null)   // goal being edited
  const [contributeTarget, setContributeTarget] = useState(null)
  const [form, setForm]                     = useState(EMPTY_FORM)
  const [contributeAmount, setContributeAmount] = useState("")

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["saving-goals"],
    queryFn: () => savingGoalsApi.list().then((r) => r.data),
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data) =>
      editTarget ? savingGoalsApi.update(editTarget.id, data) : savingGoalsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saving-goals"] })
      toast.success(editTarget ? "Goal updated" : "Goal created")
      closeGoalModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: addFunds, isPending: contributing } = useMutation({
    mutationFn: ({ id, amount }) => savingGoalsApi.contribute(id, amount),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["saving-goals"] })
      const updated = res.data
      if (updated.is_completed) toast.success("🎉 Goal reached!")
      else toast.success("Funds added")
      setContributeTarget(null)
      setContributeAmount("")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => savingGoalsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saving-goals"] })
      toast.success("Goal deleted")
    },
  })

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setGoalModal(true)
  }

  function openEdit(goal) {
    setEditTarget(goal)
    setForm({
      name:          goal.name,
      icon:          goal.icon || "🎯",
      target_amount: goal.target_amount,
      deadline:      goal.deadline || "",
      notes:         goal.notes || "",
    })
    setGoalModal(true)
  }

  function closeGoalModal() {
    setGoalModal(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  function handleGoalSubmit(e) {
    e.preventDefault()
    save({
      name:          form.name,
      icon:          form.icon || null,
      target_amount: parseFloat(form.target_amount),
      deadline:      form.deadline || null,
      notes:         form.notes || null,
    })
  }

  function handleContribute(e) {
    e.preventDefault()
    addFunds({ id: contributeTarget.id, amount: parseFloat(contributeAmount) })
  }

  const totalSaved  = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const totalTarget = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0)
  const activeGoals = goals.filter((g) => !g.is_completed)
  const doneGoals   = goals.filter((g) => g.is_completed)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Saving Goals</h2>
          {goals.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {c} {totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2 })} saved
              of {c} {totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })} total target
            </p>
          )}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && goals.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <PiggyBank size={48} className="mx-auto mb-4 opacity-25" />
          <p className="text-sm">No saving goals yet.</p>
          <p className="text-xs mt-1">Create one to start tracking progress toward something you want.</p>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={c}
              onEdit={() => openEdit(goal)}
              onDelete={() => { if (window.confirm("Delete this goal?")) remove(goal.id) }}
              onContribute={() => { setContributeTarget(goal); setContributeAmount("") }}
            />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {doneGoals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <CheckCircle2 size={15} /> Completed
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doneGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currency={c}
                onEdit={() => openEdit(goal)}
                onDelete={() => { if (window.confirm("Delete this goal?")) remove(goal.id) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Goal create/edit modal */}
      {goalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">
                {editTarget ? "Edit Goal" : "New Saving Goal"}
              </h2>
              <button onClick={closeGoalModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleGoalSubmit} className="px-6 py-4 space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="🎯"
                  maxLength={4}
                  className="w-16 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Goal name (e.g. New Laptop)"
                  required
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <input
                type="number"
                step="0.01"
                placeholder={`Target amount (${c})`}
                required
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                value={form.target_amount}
                onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))}
              />

              <div>
                <label className="block text-xs text-gray-400 mb-1">Target date (optional)</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>

              <textarea
                placeholder="Notes (optional)"
                rows={2}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none dark:bg-gray-700 dark:text-white"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeGoalModal}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute modal */}
      {contributeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Add Funds</h2>
              <button onClick={() => setContributeTarget(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 pt-4 pb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {contributeTarget.icon} {contributeTarget.name}
              </p>
              <p className="text-xs text-gray-400">
                {c} {parseFloat(contributeTarget.remaining).toFixed(2)} remaining to reach your goal
              </p>
            </div>
            <form onSubmit={handleContribute} className="px-6 pb-5 space-y-3">
              <input
                type="number"
                step="0.01"
                placeholder={`Amount (${c})`}
                required
                autoFocus
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setContributeTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={contributing}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {contributing ? "Adding…" : "Add Funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, currency: c, onEdit, onDelete, onContribute }) {
  const pct      = goal.percent ?? 0
  const saved    = parseFloat(goal.current_amount)
  const target   = parseFloat(goal.target_amount)
  const remaining = parseFloat(goal.remaining ?? 0)
  const days     = daysUntil(goal.deadline)

  const barColor = goal.is_completed
    ? "bg-green-500"
    : pct >= 80
    ? "bg-primary-500"
    : "bg-primary-400"

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border shadow-sm transition-all ${
      goal.is_completed
        ? "border-green-200 dark:border-green-800"
        : "border-gray-100 dark:border-gray-700"
    }`}>
      {/* Card header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{goal.icon || "🎯"}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{goal.name}</p>
            {goal.is_completed ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 size={11} /> Goal reached!
              </span>
            ) : goal.deadline ? (
              <p className={`text-xs ${days !== null && days < 0 ? "text-red-400" : "text-gray-400"}`}>
                {days === null ? "" : days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days left`}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button onClick={onEdit}
            className="p-1.5 text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{pct.toFixed(0)}% saved</span>
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {c} {saved.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {c} {target.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="flex justify-between items-center">
        {!goal.is_completed ? (
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {c} {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span> to go
          </p>
        ) : (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Completed 🎉</p>
        )}
        {!goal.is_completed && onContribute && (
          <button onClick={onContribute}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={12} /> Add Funds
          </button>
        )}
      </div>

      {/* Notes */}
      {goal.notes && (
        <p className="mt-3 text-xs text-gray-400 italic border-t border-gray-50 dark:border-gray-700 pt-3">
          {goal.notes}
        </p>
      )}
    </div>
  )
}