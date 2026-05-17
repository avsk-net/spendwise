import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Download, Upload, Bookmark, X, Star } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { transactionsApi } from "../api/transactionsApi"
import { templatesApi } from "../api/templatesApi"
import toast from "react-hot-toast"

const EMPTY_FORM = {
  type: "expense", account_id: "", category_id: "", to_account_id: "",
  amount: "", date: new Date().toISOString().split("T")[0],
  notes: "", tags: "",
}

const PRESETS_KEY = "sw_filter_presets"
const loadPresets = () => { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]") } catch { return [] } }

export default function TransactionsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const c = user?.currency || ""

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState({ page: 1, limit: 20 })
  const [presets, setPresets] = useState(loadPresets)
  const [exporting, setExporting] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmBulk, setConfirmBulk] = useState(false)

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

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templatesApi.list().then(r => r.data),
  })

  const { data: tags = [] } = useQuery({
    queryKey: ["transaction-tags"],
    queryFn: () => transactionsApi.tags().then(r => r.data),
  })

  const catMap = Object.fromEntries(categories.map(cat => [cat.id, cat]))
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]))
  const filteredCats = categories.filter(cat => cat.type === "both" || cat.type === form.type)

  const hasFilters = filters.type || filters.account_id || filters.category_id || filters.date_from || filters.date_to || filters.search || filters.tag
  const clearFilters = () => setFilters({ page: 1, limit: 20 })

  const handleImport = async (e) => {
    e.preventDefault()
    if (!importFile) return
    setImporting(true)
    try {
      const res = await transactionsApi.importCsv(importFile)
      setImportResult(res.data)
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      toast.success(`Imported ${res.data.imported} transactions`)
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const savePreset = () => {
    const name = window.prompt("Name this filter view:")
    if (!name?.trim()) return
    const updated = [...presets.filter(p => p.name !== name.trim()), { name: name.trim(), filters }]
    setPresets(updated)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
    toast.success(`Saved "${name.trim()}"`)
  }

  const deletePreset = (name) => {
    const updated = presets.filter(p => p.name !== name)
    setPresets(updated)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const exportFilters = Object.fromEntries(
        Object.entries(filters).filter(([k]) => k !== "page" && k !== "limit")
      )
      const res = await transactionsApi.exportCsv(exportFilters)
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Exported successfully")
    } catch {
      toast.error("Export failed")
    } finally {
      setExporting(false)
    }
  }

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

  const { mutate: saveTemplate, isPending: savingTemplate } = useMutation({
    mutationFn: (data) => templatesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] })
      toast.success("Template saved")
    },
    onError: () => toast.error("Failed to save template"),
  })

  const handleSaveAsTemplate = () => {
    const name = window.prompt("Template name:")
    if (!name?.trim()) return
    saveTemplate({
      name: name.trim(),
      type: form.type,
      category_id: form.category_id || undefined,
      account_id: form.account_id || undefined,
      amount: form.amount ? parseFloat(form.amount) : undefined,
      notes: form.notes || undefined,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    })
  }

  const applyTemplate = (tmpl) => {
    setForm(f => ({
      ...f,
      type: tmpl.type,
      category_id: tmpl.category_id || "",
      account_id: tmpl.account_id || f.account_id,
      amount: tmpl.amount != null ? String(tmpl.amount) : f.amount,
      notes: tmpl.notes || f.notes,
      tags: (tmpl.tags || []).join(", "),
    }))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await transactionsApi.bulkDelete([...selectedIds])
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      setSelectedIds(new Set())
      toast.success(`Deleted ${selectedIds.size} transactions`)
    } catch {
      toast.error("Bulk delete failed")
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === txns.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(txns.map(t => t.id)))
    }
  }

  const openCreate = () => { setForm(EMPTY_FORM); setModal("create") }
  const openEdit = (t) => {
    setForm({
      type: t.type, account_id: t.account_id, category_id: t.category_id || "",
      to_account_id: t.to_account_id || "",
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
      category_id: form.type === "transfer" ? undefined : form.category_id || undefined,
      to_account_id: form.type === "transfer" ? (form.to_account_id || undefined) : undefined,
    }
    if (modal === "create") create(data)
    else update({ id: modal, data })
  }

  const selectCls = "border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
  const inputCls = "border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"

  return (
    <div className="space-y-3">

      {/* Filter + action bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 space-y-2">
        {/* Search row */}
        <input
          type="text"
          placeholder="Search notes or tags…"
          className={`w-full ${inputCls}`}
          value={filters.search || ""}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
        />

        {/* Row 1: dropdowns + export + add */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <select className={selectCls}
              value={filters.type || ""}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value || undefined, page: 1 }))}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
              <option value="refund">Refund</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <select className={selectCls}
              value={filters.account_id || ""}
              onChange={e => setFilters(f => ({ ...f, account_id: e.target.value || undefined, page: 1 }))}>
              <option value="">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className={selectCls}
              value={filters.category_id || ""}
              onChange={e => setFilters(f => ({ ...f, category_id: e.target.value || undefined, page: 1 }))}>
              <option value="">All categories</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setImportModal(true); setImportResult(null); setImportFile(null) }}
              className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-3 py-2 rounded-xl transition-colors">
              <Upload size={14} />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-3 py-2 rounded-xl disabled:opacity-60 transition-colors">
              <Download size={14} />
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export CSV"}</span>
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
              <Plus size={15} />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Row 2: date range + save/clear */}
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" className={inputCls}
            value={filters.date_from || ""}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || undefined, page: 1 }))} />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" className={inputCls}
            value={filters.date_to || ""}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value || undefined, page: 1 }))} />
          {hasFilters && (
            <>
              <button onClick={savePreset}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg px-2.5 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                <Bookmark size={12} /> Save view
              </button>
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
                <X size={12} /> Clear
              </button>
            </>
          )}
        </div>

        {/* Tag pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400 self-center">Tags:</span>
            {tags.map(tag => (
              <button key={tag}
                onClick={() => setFilters(f => ({ ...f, tag: f.tag === tag ? undefined : tag, page: 1 }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filters.tag === tag
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:text-primary-600"
                }`}>
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Saved presets */}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400 self-center">Saved:</span>
            {presets.map(p => (
              <div key={p.name} className="flex items-center gap-0.5">
                <button onClick={() => setFilters({ ...p.filters, page: 1 })}
                  className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-gray-600 dark:text-gray-300 hover:text-primary-700 rounded-lg transition-colors">
                  {p.name}
                </button>
                <button onClick={() => deletePreset(p.name)} title="Delete preset"
                  className="text-gray-300 hover:text-red-400 p-0.5 rounded transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl px-4 py-2.5">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 items-center">
            {confirmBulk ? (
              <>
                <span className="text-xs text-gray-600 dark:text-gray-300">Delete {selectedIds.size} transaction(s)?</span>
                <button onClick={() => { setConfirmBulk(false); handleBulkDelete() }}
                  className="text-xs font-medium bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Confirm
                </button>
                <button onClick={() => setConfirmBulk(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                  Cancel
                </button>
              </>
            ) : null}
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">
              Clear
            </button>
            <button onClick={() => setConfirmBulk(true)} disabled={bulkDeleting}
              className="flex items-center gap-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors">
              <Trash2 size={13} />{bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Loading / empty */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : txns.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No transactions match the current filters.
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {txns.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{catMap[t.category_id]?.icon || "💸"}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {catMap[t.category_id]?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {t.date} · {accMap[t.account_id]?.name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-sm font-bold ${
                      t.type === "income" || t.type === "refund" ? "text-green-600"
                      : t.type === "transfer" ? "text-blue-500"
                      : t.type === "adjustment" ? "text-purple-500"
                      : "text-red-500"
                    }`}>
                      {t.type === "income" || t.type === "refund" ? "+" : t.type === "transfer" || t.type === "adjustment" ? "" : "-"}
                      {c} {parseFloat(t.amount).toFixed(2)}
                    </span>
                    <button onClick={() => openEdit(t)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    {confirmDeleteId === t.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { remove(t.id); setConfirmDeleteId(null) }}
                          className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                          Delete
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 text-xs transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {t.notes && <p className="text-xs text-gray-400 mt-2 ml-10 truncate">{t.notes}</p>}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" className="rounded"
                        checked={txns.length > 0 && selectedIds.size === txns.length}
                        onChange={toggleSelectAll} />
                    </th>
                    {["Date","Category","Account","Type","Amount","Notes",""].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {txns.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 w-8">
                        <input type="checkbox" className="rounded"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span>{catMap[t.category_id]?.icon}</span>
                          <span className="text-gray-700 dark:text-gray-200">{catMap[t.category_id]?.name || "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{accMap[t.account_id]?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === "income"     ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : t.type === "expense"  ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : t.type === "transfer" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : t.type === "refund"   ? "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                          : "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                        }`}>{t.type}</span>
                      </td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${
                        t.type === "income" || t.type === "refund" ? "text-green-600"
                        : t.type === "transfer" ? "text-blue-500"
                        : t.type === "adjustment" ? "text-purple-500"
                        : "text-red-500"
                      }`}>
                        {t.type === "income" || t.type === "refund" ? "+" : t.type === "transfer" || t.type === "adjustment" ? "" : "-"}
                        {c} {parseFloat(t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-32 truncate">{t.notes || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(t)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          {confirmDeleteId === t.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { remove(t.id); setConfirmDeleteId(null) }}
                                className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                                Delete
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 text-xs transition-colors">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(t.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{txns.length} shown</span>
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

      {/* Import CSV modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">Import CSV</h2>
              <button onClick={() => setImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {!importResult ? (
                <form onSubmit={handleImport} className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    CSV must have columns: <span className="font-mono">date, amount, type, account_id, notes (optional), tags (optional)</span>
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    required
                    className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/20 dark:file:text-primary-400"
                    onChange={e => setImportFile(e.target.files[0] || null)}
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setImportModal(false)}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={importing || !importFile}
                      className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                      {importing ? "Importing…" : "Import"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-green-600">Imported {importResult.imported} transactions</p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div>
                      <p className="text-xs text-red-500 font-medium mb-1">Errors ({importResult.errors.length}):</p>
                      <ul className="text-xs text-red-400 space-y-0.5 max-h-40 overflow-y-auto">
                        {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => setImportModal(false)}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-white">
                {modal === "create" ? "Add Transaction" : "Edit Transaction"}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              {templates.length > 0 && modal === "create" && (
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-500"
                  defaultValue=""
                  onChange={e => { if (e.target.value) applyTemplate(templates.find(t => t.id === e.target.value)) }}>
                  <option value="">Use a template…</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {[
                  { key: "income",     color: "bg-green-500 border-green-500" },
                  { key: "expense",    color: "bg-red-500 border-red-500" },
                  { key: "transfer",   color: "bg-blue-500 border-blue-500" },
                  { key: "refund",     color: "bg-orange-500 border-orange-500" },
                  { key: "adjustment", color: "bg-purple-500 border-purple-500" },
                ].map(({ key, color }) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.type === key
                        ? `${color} text-white`
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {form.type === "adjustment" ? "Amount (negative to reduce)" : "Amount"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <select required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {form.type === "transfer" && (
                <select required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.to_account_id || ""}
                  onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))}>
                  <option value="">Select destination account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
              {form.type !== "transfer" && (
                <select required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {filteredCats.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              )}
              <input type="date" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <input type="text" placeholder="Notes (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <input type="text" placeholder="Tags: food, travel (comma separated)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              {modal === "create" && (
                <button type="button" onClick={handleSaveAsTemplate} disabled={savingTemplate}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-60 transition-colors">
                  <Star size={12} /> Save as template
                </button>
              )}
              <div className="flex gap-3 pt-1">
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
