import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Lock, Tag } from "lucide-react"
import { categoriesApi } from "../api/categoriesApi"
import toast from "react-hot-toast"

const PRESET_COLORS = [
  "#ef4444","#f97316","#f59e0b","#22c55e",
  "#14b8a6","#3b82f6","#6366f1","#8b5cf6",
  "#ec4899","#64748b","#78716c","#0ea5e9",
]

const EMPTY_CAT = { name: "", type: "expense", icon: "", color: "", parent_id: "" }
const EMPTY_RULE = { keyword: "", category_id: "", priority: "0" }

const inputCls = "w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
const selectCls = "border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"

function CategoryModal({ category, parentId, categories, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(
    category
      ? {
          name: category.name || "",
          type: category.type || "expense",
          icon: category.icon || "",
          color: category.color || "",
          parent_id: category.parent_id || "",
        }
      : { ...EMPTY_CAT, parent_id: parentId || "" }
  )

  const eligibleParents = categories.filter(c => !c.parent_id && (!category || c.id !== category.id))

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-manage"] })
      toast.success("Category created")
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: (data) => categoriesApi.update(category.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-manage"] })
      toast.success("Category updated")
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      name: form.name,
      type: form.type,
      icon: form.icon || undefined,
      color: form.color || undefined,
      parent_id: form.parent_id || undefined,
    }
    if (category) update(data)
    else create(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            {category ? "Edit Category" : "New Category"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <input
            type="text"
            placeholder="Category name"
            required
            className={inputCls}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <select
            className={inputCls}
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="both">Both</option>
          </select>
          <input
            type="text"
            placeholder="Icon emoji (e.g. 💰)"
            className={inputCls}
            value={form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
          />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Color</p>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-primary-500" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <select
            className={inputCls}
            value={form.parent_id}
            onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
            <option value="">No parent (top-level)</option>
            {eligibleParents.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
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

function ConfirmDeleteBtn({ onConfirm }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => { onConfirm(); setConfirming(false) }}
          className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs transition-colors">
          No
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
      <Trash2 size={13} />
    </button>
  )
}

function CategoryRow({ cat, subcats, onEdit, onDelete, onAddSub }) {
  const [expanded, setExpanded] = useState(false)
  const isSystem = cat.is_system

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl">
        <div
          className="w-5 h-5 rounded-full shrink-0"
          style={{ backgroundColor: cat.color || "#64748b" }}
        />
        <span className="text-lg shrink-0">{cat.icon || "📁"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-white">{cat.name}</span>
            {isSystem && <Lock size={12} className="text-gray-400 shrink-0" />}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              cat.type === "income" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              : cat.type === "expense" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}>{cat.type}</span>
          </div>
          {subcats.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-0.5 mt-0.5">
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {subcats.length} subcategories
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isSystem && (
            <>
              <button
                onClick={() => onAddSub(cat)}
                className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-primary-600 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-300 transition-colors">
                + Sub
              </button>
              <button
                onClick={() => onEdit(cat)}
                className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors">
                <Pencil size={13} />
              </button>
              <ConfirmDeleteBtn onConfirm={() => onDelete(cat.id)} />
            </>
          )}
        </div>
      </div>
      {expanded && subcats.map(sub => (
        <div key={sub.id} className="ml-8 flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: sub.color || "#64748b" }} />
          <span className="text-base shrink-0">{sub.icon || "📄"}</span>
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{sub.name}</span>
          {!sub.is_system && (
            <div className="flex gap-1">
              <button onClick={() => onEdit(sub)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors">
                <Pencil size={13} />
              </button>
              <ConfirmDeleteBtn onConfirm={() => onDelete(sub.id)} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CategoriesTab({ categories, onEdit, onAddSub, onDelete }) {
  const groups = { Income: [], Expense: [], Both: [] }
  const parents = categories.filter(c => !c.parent_id)
  const childMap = {}
  categories.filter(c => c.parent_id).forEach(c => {
    if (!childMap[c.parent_id]) childMap[c.parent_id] = []
    childMap[c.parent_id].push(c)
  })

  parents.forEach(p => {
    const label = p.type === "income" ? "Income" : p.type === "expense" ? "Expense" : "Both"
    groups[label].push(p)
  })

  if (Object.values(groups).every(g => g.length === 0)) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        <Tag size={40} className="mx-auto mb-3 opacity-30" />
        No categories yet. Click &ldquo;+ New Category&rdquo; to add one.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([label, cats]) => cats.length === 0 ? null : (
        <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {cats.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                subcats={childMap[cat.id] || []}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddSub={onAddSub}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function RulesTab({ categories }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY_RULE })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["categorization-rules"],
    queryFn: () => categoriesApi.listRules().then(r => r.data),
  })

  const { mutate: createRule, isPending: creating } = useMutation({
    mutationFn: (data) => categoriesApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorization-rules"] })
      toast.success("Rule added")
      setForm({ ...EMPTY_RULE })
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: updateRule } = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.updateRule(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorization-rules"] })
      toast.success("Rule updated")
      setEditingId(null)
      setEditForm(null)
    },
    onError: () => toast.error("Failed to update"),
  })

  const { mutate: deleteRule } = useMutation({
    mutationFn: (id) => categoriesApi.deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorization-rules"] })
      toast.success("Rule deleted")
    },
    onError: () => toast.error("Failed to delete"),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    createRule({
      keyword: form.keyword,
      category_id: form.category_id,
      priority: parseInt(form.priority, 10) || 0,
    })
  }

  const startEdit = (rule) => {
    setEditingId(rule.id)
    setEditForm({
      keyword: rule.keyword,
      category_id: rule.category_id,
      priority: String(rule.priority ?? 0),
      is_active: rule.is_active !== false,
    })
  }

  const saveEdit = () => {
    updateRule({
      id: editingId,
      data: {
        keyword: editForm.keyword,
        category_id: editForm.category_id,
        priority: parseInt(editForm.priority, 10) || 0,
        is_active: editForm.is_active,
      },
    })
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Add Rule</p>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
          <input
            type="text"
            placeholder="Keyword"
            required
            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-36"
            value={form.keyword}
            onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
          />
          <select
            required
            className={selectCls}
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Priority"
            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-24"
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          />
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 transition-colors">
            <Plus size={14} /> Add
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Tag size={36} className="mx-auto mb-3 opacity-30" />
          No rules yet. Rules auto-categorize transactions based on keywords in notes.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-50 dark:divide-gray-700/50">
          {rules.map(rule => {
            const cat = catMap[rule.category_id]
            const isEditing = editingId === rule.id
            return (
              <div key={rule.id} className="px-4 py-3">
                {isEditing ? (
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      type="text"
                      className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-36"
                      value={editForm.keyword}
                      onChange={e => setEditForm(f => ({ ...f, keyword: e.target.value }))}
                    />
                    <select
                      className={selectCls}
                      value={editForm.category_id}
                      onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-20"
                      value={editForm.priority}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    />
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                      />
                      Active
                    </label>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg transition-colors">
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditForm(null) }}
                      className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full font-mono">
                      {rule.keyword}
                    </span>
                    <span className="text-gray-400 text-xs">→</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {cat?.icon} {cat?.name || rule.category_id}
                    </span>
                    <span className="text-xs text-gray-400">priority: {rule.priority ?? 0}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active !== false ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-400"}`}>
                      {rule.is_active !== false ? "active" : "inactive"}
                    </span>
                    <div className="flex gap-1 ml-auto">
                      <button
                        onClick={() => startEdit(rule)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <ConfirmDeleteBtn onConfirm={() => deleteRule(rule.id)} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState("categories")
  const [modal, setModal] = useState(null)
  const [editCat, setEditCat] = useState(null)
  const [subParentId, setSubParentId] = useState(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-manage"],
    queryFn: () => categoriesApi.list().then(r => r.data),
  })

  const { mutate: deleteCat } = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-manage"] })
      toast.success("Category deleted")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Cannot delete category"),
  })

  const openCreate = () => { setEditCat(null); setSubParentId(null); setModal("cat") }
  const openEdit = (cat) => { setEditCat(cat); setSubParentId(null); setModal("cat") }
  const openAddSub = (parent) => { setEditCat(null); setSubParentId(parent.id); setModal("cat") }

  const tabCls = (active) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-primary-600 text-primary-600 dark:text-primary-400"
        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
    }`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Categories</h1>
        {tab === "categories" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Plus size={15} /> New Category
          </button>
        )}
      </div>

      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
        <button className={tabCls(tab === "categories")} onClick={() => setTab("categories")}>Categories</button>
        <button className={tabCls(tab === "rules")} onClick={() => setTab("rules")}>Auto-Rules</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "categories" ? (
        <CategoriesTab
          categories={categories}
          onEdit={openEdit}
          onAddSub={openAddSub}
          onDelete={(id) => deleteCat(id)}
        />
      ) : (
        <RulesTab categories={categories} />
      )}

      {modal === "cat" && (
        <CategoryModal
          category={editCat}
          parentId={subParentId}
          categories={categories}
          onClose={() => { setModal(null); setEditCat(null); setSubParentId(null) }}
        />
      )}
    </div>
  )
}
