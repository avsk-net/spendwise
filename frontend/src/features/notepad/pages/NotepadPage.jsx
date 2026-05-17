import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Pin } from "lucide-react"
import { notepadApi } from "../api/notepadApi"
import toast from "react-hot-toast"

const COLORS = [
  "#fef9c3", "#bbf7d0", "#bfdbfe", "#fecaca",
  "#e9d5ff", "#fed7aa", "#ccfbf1", "#f1f5f9",
]

function ColorDot({ color, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={`w-5 h-5 rounded-full border-2 transition-all ${selected ? "border-gray-700 scale-110" : "border-transparent hover:border-gray-400"}`}
    />
  )
}

export default function NotepadPage() {
  const qc = useQueryClient()

  const [quickOpen, setQuickOpen] = useState(false)
  const [quickForm, setQuickForm] = useState({ title: "", content: "", color: COLORS[0], is_pinned: false })
  const quickRef = useRef(null)

  const [editNote, setEditNote] = useState(null)
  const [editForm, setEditForm] = useState({ title: "", content: "", color: COLORS[0], is_pinned: false })

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notepad"],
    queryFn: () => notepadApi.list().then(r => r.data),
  })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (data) => notepadApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notepad"] })
      setQuickForm({ title: "", content: "", color: COLORS[0], is_pinned: false })
      setQuickOpen(false)
      toast.success("Note created")
    },
    onError: () => toast.error("Failed to create note"),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }) => notepadApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notepad"] })
      setEditNote(null)
      toast.success("Note updated")
    },
    onError: () => toast.error("Failed to update note"),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => notepadApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notepad"] })
      toast.success("Note deleted")
    },
  })

  const { mutate: togglePin } = useMutation({
    mutationFn: ({ id, is_pinned }) => notepadApi.update(id, { is_pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad"] }),
  })

  // Close quick-entry on click outside
  useEffect(() => {
    function handleClick(e) {
      if (quickRef.current && !quickRef.current.contains(e.target)) {
        setQuickOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleQuickSave = (e) => {
    e.preventDefault()
    if (!quickForm.content.trim()) return
    create(quickForm)
  }

  const handleQuickKeyDown = (e) => {
    if (e.key === "Escape") setQuickOpen(false)
  }

  const openEdit = (note) => {
    setEditNote(note)
    setEditForm({
      title: note.title || "",
      content: note.content,
      color: note.color || COLORS[0],
      is_pinned: note.is_pinned,
    })
  }

  const handleEditSave = (e) => {
    e.preventDefault()
    update({ id: editNote.id, data: editForm })
  }

  const pinned = notes.filter(n => n.is_pinned)
  const unpinned = notes.filter(n => !n.is_pinned)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Notepad</h2>
        <button
          onClick={() => setQuickOpen(true)}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus size={15} /> New Note
        </button>
      </div>

      {/* Quick-entry area */}
      <div ref={quickRef}>
        {!quickOpen ? (
          <div
            onClick={() => setQuickOpen(true)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm text-gray-400 cursor-pointer shadow-sm hover:shadow-md transition-shadow">
            Take a note…
          </div>
        ) : (
          <form onSubmit={handleQuickSave} onKeyDown={handleQuickKeyDown}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl px-5 py-4 shadow-md space-y-3">
            <input
              type="text"
              placeholder="Title (optional)"
              value={quickForm.title}
              onChange={e => setQuickForm(f => ({ ...f, title: e.target.value }))}
              className="w-full text-sm font-medium bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400"
            />
            <textarea
              placeholder="Take a note…"
              rows={3}
              autoFocus
              value={quickForm.content}
              onChange={e => setQuickForm(f => ({ ...f, content: e.target.value }))}
              className="w-full text-sm bg-transparent outline-none resize-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {COLORS.map(col => (
                  <ColorDot key={col} color={col} selected={quickForm.color === col}
                    onClick={() => setQuickForm(f => ({ ...f, color: col }))} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={quickForm.is_pinned}
                    onChange={e => setQuickForm(f => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                  Pin
                </label>
                <button type="button" onClick={() => setQuickOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  Discard
                </button>
                <button type="submit" disabled={creating || !quickForm.content.trim()}
                  className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                  Save
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notes.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No notes yet. Click &apos;+ New Note&apos; to start.
        </div>
      )}

      {/* Pinned notes */}
      {pinned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pinned</p>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {pinned.map(note => (
              <NoteCard key={note.id} note={note} onEdit={openEdit}
                onDelete={remove} onTogglePin={togglePin} />
            ))}
          </div>
        </div>
      )}

      {/* Other notes */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Others</p>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {unpinned.map(note => (
              <NoteCard key={note.id} note={note} onEdit={openEdit}
                onDelete={remove} onTogglePin={togglePin} />
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md"
            style={{ backgroundColor: editForm.color }}>
            <div className="flex justify-between items-center px-5 py-4">
              <span className="text-sm font-semibold text-gray-700">Edit Note</span>
              <button onClick={() => setEditNote(null)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleEditSave} className="px-5 pb-5 space-y-3">
              <input
                type="text"
                placeholder="Title (optional)"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="w-full text-sm font-medium bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2 outline-none text-gray-800 placeholder-gray-500"
              />
              <textarea
                required
                rows={5}
                value={editForm.content}
                onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                className="w-full text-sm bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2 outline-none resize-none text-gray-700"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLORS.map(col => (
                  <ColorDot key={col} color={col} selected={editForm.color === col}
                    onClick={() => setEditForm(f => ({ ...f, color: col }))} />
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={editForm.is_pinned}
                  onChange={e => setEditForm(f => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                Pin this note
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditNote(null)}
                  className="flex-1 py-2.5 bg-white/60 hover:bg-white/80 rounded-xl text-sm text-gray-600 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={updating}
                  className="flex-1 py-2.5 bg-gray-800/80 hover:bg-gray-800 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {updating ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const [hover, setHover] = useState(false)
  const truncated = note.content.length > 150 ? note.content.slice(0, 150) + "…" : note.content

  return (
    <div
      className="break-inside-avoid rounded-2xl p-4 shadow-sm border border-black/5 cursor-pointer relative group transition-shadow hover:shadow-md"
      style={{ backgroundColor: note.color || "#fef9c3" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onEdit(note)}>

      {note.is_pinned && (
        <span className="absolute top-2 right-2 text-gray-500 opacity-60">
          <Pin size={13} />
        </span>
      )}

      {note.title && (
        <p className="font-semibold text-sm text-gray-800 mb-1 pr-5">{note.title}</p>
      )}
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{truncated}</p>

      {hover && (
        <div className="absolute bottom-2 right-2 flex gap-1"
          onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onTogglePin({ id: note.id, is_pinned: !note.is_pinned })}
            title={note.is_pinned ? "Unpin" : "Pin"}
            className="p-1.5 rounded-lg bg-white/60 hover:bg-white/90 text-gray-500 hover:text-gray-700 transition-colors">
            <Pin size={13} />
          </button>
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-lg bg-white/60 hover:bg-white/90 text-gray-500 hover:text-gray-700 transition-colors">
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { if (window.confirm("Delete this note?")) onDelete(note.id) }}
            className="p-1.5 rounded-lg bg-white/60 hover:bg-white/90 text-gray-500 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
