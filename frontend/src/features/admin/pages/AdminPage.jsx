import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Users, Activity, TrendingUp, ShieldCheck,
  Search, Trash2, LogOut, Edit2, Check, X, ChevronLeft, ChevronRight,
} from "lucide-react"
import toast from "react-hot-toast"
import { adminApi } from "../api/adminApi"

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue:   "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    green:  "bg-green-50 dark:bg-green-900/20 text-green-600",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600",
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value ?? "—"}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function EditableRow({ user, onSave, onDelete, onForceLogout }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: user.username, is_active: user.is_active })

  const save = () => { onSave(user.id, form); setEditing(false) }

  return (
    <tr className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <span className="text-primary-600 text-xs font-bold">{user.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div>
            {editing
              ? <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 w-28" />
              : <p className="text-sm font-medium text-gray-800 dark:text-white">{user.username}</p>
            }
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{user.currency}</td>
      <td className="px-4 py-3">
        {editing
          ? (
            <select value={form.is_active ? "true" : "false"}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.value === "true" }))}
              className="text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1 focus:outline-none">
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {user.is_active ? "Active" : "Disabled"}
            </span>
          )
        }
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(user.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          {editing ? (
            <>
              <button onClick={save} title="Save"
                className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors">
                <Check size={13} />
              </button>
              <button onClick={() => setEditing(false)} title="Cancel"
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              {!user.is_superadmin && (
                <>
                  <button onClick={() => setEditing(true)} title="Edit"
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => { if (window.confirm(`Force logout ${user.username}?`)) onForceLogout(user.id) }}
                    title="Force logout"
                    className="p-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-400 hover:text-orange-500 transition-colors">
                    <LogOut size={13} />
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete user ${user.username}? This is permanent.`)) onDelete(user.id) }}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              {user.is_superadmin && (
                <span className="flex items-center gap-1 text-xs text-indigo-500">
                  <ShieldCheck size={12} /> Admin
                </span>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function AdminPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: users = [], isFetching } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => adminApi.listUsers({ page, limit, search }).then(r => r.data),
  })

  const { mutate: updateUser } = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("User updated") },
    onError: () => toast.error("Update failed"),
  })

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); toast.success("User deleted") },
    onError: () => toast.error("Delete failed"),
  })

  const { mutate: forceLogout } = useMutation({
    mutationFn: (id) => adminApi.forceLogout(id),
    onSuccess: () => toast.success("User logged out"),
    onError: () => toast.error("Failed"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Panel</h1>
        <p className="text-sm text-gray-400 mt-0.5">User management and platform overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Users"        value={stats?.total_users}          color="blue"   />
        <StatCard icon={Activity}   label="Active Sessions"    value={stats?.active_sessions}      color="green"  />
        <StatCard icon={TrendingUp} label="Signups (7 days)"   value={stats?.signups_last_7_days}  color="purple" />
        <StatCard icon={TrendingUp} label="Signups (30 days)"  value={stats?.signups_last_30_days} color="orange" />
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Users</h2>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search by name or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
              ) : users.map(u => (
                <EditableRow key={u.id} user={u}
                  onSave={(id, data) => updateUser({ id, data })}
                  onDelete={deleteUser}
                  onForceLogout={forceLogout}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">Page {page}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={users.length < limit}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
