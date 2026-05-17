import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Users, Activity, TrendingUp, ShieldCheck,
  Search, Trash2, LogOut, Edit2, Check, X,
  ChevronLeft, ChevronRight, MailCheck, KeyRound,
  Clock, UserCheck, BarChart2, Wifi,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import toast from "react-hot-toast"
import { adminApi } from "../api/adminApi"

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
}

function activityDot(lastActive) {
  if (!lastActive) return "bg-gray-300"
  const mins = (Date.now() - new Date(lastActive).getTime()) / 60000
  if (mins < 15) return "bg-green-500"
  if (mins < 60 * 24) return "bg-yellow-400"
  return "bg-gray-300"
}

function actionBadge(action) {
  const map = {
    "auth.login":        ["bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", "Login"],
    "auth.logout":       ["bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300", "Logout"],
    "auth.login_failed": ["bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", "Login Failed"],
    "auth.register":     ["bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", "Register"],
    "auth.password_change": ["bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", "Pwd Change"],
    "transaction.create": ["bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", "Txn Create"],
    "transaction.delete": ["bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", "Txn Delete"],
    "data.export":       ["bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400", "Export"],
  }
  const [cls, label] = map[action] ?? ["bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", action.split(".").pop()]
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue:   "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    green:  "bg-green-50 dark:bg-green-900/20 text-green-600",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600",
    teal:   "bg-teal-50 dark:bg-teal-900/20 text-teal-600",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600",
    red:    "bg-red-50 dark:bg-red-900/20 text-red-600",
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-800 dark:text-white leading-none">{value ?? "—"}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-300 dark:text-gray-500 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ── UserDetailPanel ───────────────────────────────────────────────────────────

function UserDetailPanel({ userId, onClose }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => adminApi.userDetail(userId).then(r => r.data),
    enabled: !!userId,
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="font-semibold text-gray-800 dark:text-white">User Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {isLoading || !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xl shrink-0">
                {detail.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white text-lg">{detail.username}</p>
                <p className="text-sm text-gray-400">{detail.email}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {detail.is_superadmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium flex items-center gap-1">
                      <ShieldCheck size={10} /> Admin
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${detail.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {detail.is_active ? "Active" : "Disabled"}
                  </span>
                  {detail.is_email_verified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium flex items-center gap-1">
                      <MailCheck size={10} /> Verified
                    </span>
                  )}
                  {detail.totp_enabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 font-medium flex items-center gap-1">
                      <KeyRound size={10} /> 2FA
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Currency", value: detail.currency },
                { label: "Total Logins", value: detail.login_count },
                { label: "Active Sessions", value: detail.session_count },
                { label: "Member Since", value: new Date(detail.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Last active */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${activityDot(detail.last_active_at)}`} />
              <div>
                <p className="text-xs text-gray-400">Last Active</p>
                <p className="font-medium text-gray-800 dark:text-white text-sm">
                  {detail.last_active_at
                    ? `${timeAgo(detail.last_active_at)} · ${new Date(detail.last_active_at).toLocaleString("en")}`
                    : "Never"}
                </p>
              </div>
            </div>

            {/* Recent logins */}
            {detail.recent_logins.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Recent Logins
                </h3>
                <div className="space-y-2">
                  {detail.recent_logins.map((login, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <span className="text-gray-600 dark:text-gray-300">{timeAgo(login.at)}</span>
                      <span className="text-gray-400 font-mono">{login.ip || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── EditableRow ───────────────────────────────────────────────────────────────

function EditableRow({ user, onSave, onDelete, onForceLogout, onViewDetail }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: user.username, is_active: user.is_active })
  const [confirmType, setConfirmType] = useState(null)

  const save = () => { onSave(user.id, form); setEditing(false) }

  return (
    <tr
      className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
      onClick={() => !editing && !confirmType && onViewDetail(user.id)}
    >
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                : <span className="text-primary-600 text-xs font-bold">{user.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${activityDot(user.last_active_at)}`} />
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
        {editing ? (
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
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${activityDot(user.last_active_at)}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(user.last_active_at)}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(user.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 justify-end">
          {editing ? (
            <>
              <button onClick={save} className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors"><Check size={13} /></button>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"><X size={13} /></button>
            </>
          ) : confirmType ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {confirmType === "delete" ? "Delete?" : "Logout?"}
              </span>
              <button
                onClick={() => { confirmType === "delete" ? onDelete(user.id) : onForceLogout(user.id); setConfirmType(null) }}
                className="px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                Yes
              </button>
              <button onClick={() => setConfirmType(null)}
                className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs transition-colors">
                No
              </button>
            </div>
          ) : !user.is_superadmin ? (
            <>
              <button onClick={() => setEditing(true)} title="Edit" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"><Edit2 size={13} /></button>
              <button onClick={() => setConfirmType("logout")} title="Force logout" className="p-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-400 hover:text-orange-500 transition-colors"><LogOut size={13} /></button>
              <button onClick={() => setConfirmType("delete")} title="Delete" className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs text-indigo-500"><ShieldCheck size={12} /> Admin</span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Main AdminPage ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const limit = 20

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: growth = [] } = useQuery({
    queryKey: ["admin-growth"],
    queryFn: () => adminApi.growth(12).then(r => r.data),
  })

  const { data: activity = [] } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => adminApi.activity(50).then(r => r.data),
    refetchInterval: 15_000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      qc.invalidateQueries({ queryKey: ["admin-stats"] })
      toast.success("User deleted")
    },
    onError: () => toast.error("Delete failed"),
  })

  const { mutate: forceLogout } = useMutation({
    mutationFn: (id) => adminApi.forceLogout(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-stats"] }); toast.success("User logged out") },
    onError: () => toast.error("Failed"),
  })

  const total = stats?.total_users ?? 0
  const verifiedPct = total > 0 ? Math.round((stats?.verified_users ?? 0) / total * 100) : 0
  const twofaPct = total > 0 ? Math.round((stats?.two_fa_users ?? 0) / total * 100) : 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform overview and user management</p>
      </div>

      {/* Stats — 4 cols on md, 8 on lg */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users}     label="Total Users"        value={stats?.total_users}           color="blue"   />
        <StatCard icon={Wifi}      label="Active Sessions"    value={stats?.active_sessions}       color="green"  />
        <StatCard icon={Activity}  label="Active Today"       value={stats?.active_today}          color="teal"   />
        <StatCard icon={TrendingUp}label="Active (7 days)"    value={stats?.active_7_days}         color="indigo" />
        <StatCard icon={UserCheck} label="Signups (7d)"       value={stats?.signups_last_7_days}   color="purple" />
        <StatCard icon={TrendingUp}label="Signups (30d)"      value={stats?.signups_last_30_days}  color="orange" />
        <StatCard icon={MailCheck} label="Email Verified"     value={stats?.verified_users}  sub={`${verifiedPct}% of users`}  color="blue"  />
        <StatCard icon={KeyRound}  label="2FA Enabled"        value={stats?.two_fa_users}    sub={`${twofaPct}% of users`}     color="purple"/>
      </div>

      {/* Growth chart + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Growth chart */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">User Growth (12 weeks)</h2>
          </div>
          {growth.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={growth} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} tickFormatter={w => w.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, "New users"]}
                  labelFormatter={(w) => `Week of ${w}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="New users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Recent Activity</h2>
          </div>
          <div className="space-y-2.5 overflow-y-auto flex-1 max-h-52">
            {activity.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No activity yet</p>
            ) : activity.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5">{actionBadge(a.action)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 dark:text-gray-200 truncate">{a.username || a.email || "Unknown"}</p>
                  <p className="text-xs text-gray-400">{timeAgo(a.created_at)} · {a.ip_address || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Users</h2>
            <span className="text-xs text-gray-400 ml-1">Click a row to view details</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search name or email…"
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
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
              ) : users.map(u => (
                <EditableRow key={u.id} user={u}
                  onSave={(id, data) => updateUser({ id, data })}
                  onDelete={deleteUser}
                  onForceLogout={forceLogout}
                  onViewDetail={setSelectedUserId}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400">Page {page} · {users.length} shown</p>
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

      {/* User detail slide-over */}
      {selectedUserId && (
        <UserDetailPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  )
}
