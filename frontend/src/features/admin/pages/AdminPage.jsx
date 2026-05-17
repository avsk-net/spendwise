import { useState, useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Users, Activity, TrendingUp, ShieldCheck,
  Search, Trash2, LogOut, Edit2, Check, X,
  ChevronLeft, ChevronRight, MailCheck, KeyRound,
  Clock, UserCheck, BarChart2, Wifi, Bell,
  AlertTriangle, CreditCard, PieChart, FileText,
  RefreshCw, Filter, Send,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import toast from "react-hot-toast"
import { adminApi } from "../api/adminApi"

// ── helpers ──────────────────────────────────────────────────────────────────

function adminAvatarUrl(url) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `/api/v1/media/${url.replace(/^\/media\//, "")}`
}

function countryFlag(code) {
  if (!code || code.length !== 2) return ""
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

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
  if (mins < 5) return "bg-green-500 animate-pulse"
  if (mins < 15) return "bg-green-500"
  if (mins < 60 * 24) return "bg-yellow-400"
  return "bg-gray-300"
}

function onlineLabel(lastActive) {
  if (!lastActive) return null
  const mins = (Date.now() - new Date(lastActive).getTime()) / 60000
  if (mins < 5) return { text: "Online now", cls: "text-green-600 dark:text-green-400" }
  if (mins < 15) return { text: "Recently active", cls: "text-yellow-600 dark:text-yellow-400" }
  return null
}

function actionBadge(action) {
  const map = {
    "auth.login":           ["bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", "Login"],
    "auth.logout":          ["bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300", "Logout"],
    "auth.login_failed":    ["bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", "Failed Login"],
    "auth.register":        ["bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", "Register"],
    "auth.password_change": ["bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", "Pwd Change"],
    "transaction.create":   ["bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", "Txn Create"],
    "transaction.delete":   ["bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", "Txn Delete"],
    "transaction.update":   ["bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400", "Txn Update"],
    "budget.create":        ["bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400", "Budget"],
    "data.export":          ["bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400", "Export"],
  }
  const [cls, label] = map[action] ?? ["bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", action.split(".").pop()]
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}>{label}</span>
}

function fmt(n, currency) {
  return `${currency} ${Number(n).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, pulse }) {
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
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]} ${pulse ? "animate-pulse" : ""}`}>
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

function UserDetailPanel({ userId, onClose, onUpdated }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState("overview")
  const [geoMap, setGeoMap] = useState({})
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyMsg, setNotifyMsg] = useState("")

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => adminApi.userDetail(userId).then(r => r.data),
    enabled: !!userId,
    refetchInterval: 15_000,
  })

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin-user-logs", userId],
    queryFn: () => adminApi.userLogs(userId, 100).then(r => r.data),
    enabled: !!userId && tab === "activity",
  })

  const { mutate: toggleVerified } = useMutation({
    mutationFn: (val) => adminApi.updateUser(userId, { is_email_verified: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-detail", userId] })
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      onUpdated?.()
      toast.success("Email verification updated")
    },
    onError: () => toast.error("Failed"),
  })

  const { mutate: toggleActive } = useMutation({
    mutationFn: (val) => adminApi.updateUser(userId, { is_active: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-detail", userId] })
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      onUpdated?.()
      toast.success("Account status updated")
    },
    onError: () => toast.error("Failed"),
  })

  const { mutate: sendNotify, isPending: notifying } = useMutation({
    mutationFn: () => adminApi.notify(userId, notifyMsg),
    onSuccess: () => {
      toast.success("Notification sent")
      setNotifyOpen(false)
      setNotifyMsg("")
    },
    onError: () => toast.error("Failed to send"),
  })

  useEffect(() => {
    if (!detail?.recent_logins?.length) return
    const ips = [...new Set(detail.recent_logins.map(l => l.ip).filter(Boolean))]
    Promise.all(
      ips.map(ip =>
        fetch(`https://ipwho.is/${ip}`)
          .then(r => r.json())
          .then(d => (d.success ? [ip, d] : null))
          .catch(() => null)
      )
    ).then(results => {
      const map = {}
      results.forEach(r => { if (r) map[r[0]] = r[1] })
      setGeoMap(map)
    })
  }, [detail])

  const tabCls = (active) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-primary-600 text-primary-600 dark:text-primary-400"
        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
    }`

  const net = detail ? detail.total_income - detail.total_expense : 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
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
          <>
            {/* Profile strip */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xl shrink-0 overflow-hidden">
                  {adminAvatarUrl(detail.avatar_url)
                    ? <img src={adminAvatarUrl(detail.avatar_url)} alt="" className="w-full h-full object-cover" />
                    : detail.username?.[0]?.toUpperCase()
                  }
                  <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${activityDot(detail.last_active_at)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 dark:text-white text-lg">{detail.username}</p>
                    {onlineLabel(detail.last_active_at) && (
                      <span className={`text-xs font-medium ${onlineLabel(detail.last_active_at).cls}`}>
                        {onlineLabel(detail.last_active_at).text}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{detail.email}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {detail.is_superadmin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium flex items-center gap-1">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                    <button
                      onClick={() => toggleActive(!detail.is_active)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                        detail.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-red-100 hover:text-red-600"
                          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-green-100 hover:text-green-700"
                      }`}
                      title="Click to toggle">
                      {detail.is_active ? "Active" : "Suspended"}
                    </button>
                    <button
                      onClick={() => toggleVerified(!detail.is_email_verified)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        detail.is_email_verified
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-gray-100 hover:text-gray-500"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600"
                      }`}
                      title="Click to toggle">
                      <MailCheck size={10} /> {detail.is_email_verified ? "Verified" : "Unverified"}
                    </button>
                    {detail.totp_enabled && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 font-medium flex items-center gap-1">
                        <KeyRound size={10} /> 2FA
                      </span>
                    )}
                    {detail.failed_login_count > 5 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium flex items-center gap-1">
                        <AlertTriangle size={10} /> {detail.failed_login_count} failed logins
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setNotifyOpen(true)}
                  className="p-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 transition-colors shrink-0"
                  title="Send notification">
                  <Bell size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0">
              <button className={tabCls(tab === "overview")} onClick={() => setTab("overview")}>Overview</button>
              <button className={tabCls(tab === "activity")} onClick={() => setTab("activity")}>Activity</button>
              <button className={tabCls(tab === "finance")} onClick={() => setTab("finance")}>Finance</button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {tab === "overview" && (
                <>
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Currency", value: detail.currency },
                      { label: "Total Logins", value: detail.login_count },
                      { label: "Active Sessions", value: detail.session_count },
                      { label: "Failed Logins", value: detail.failed_login_count },
                      { label: "Joined", value: new Date(detail.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) },
                      { label: "Last Active", value: timeAgo(detail.last_active_at) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className="font-semibold text-gray-800 dark:text-white text-sm">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent logins with geo */}
                  {detail.recent_logins.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recent Logins</h3>
                      <div className="space-y-2">
                        {detail.recent_logins.map((login, i) => {
                          const geo = geoMap[login.ip]
                          return (
                            <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-300">{timeAgo(login.at)}</span>
                                <span className="text-gray-400 font-mono">{login.ip || "—"}</span>
                              </div>
                              {geo ? (
                                <p className="text-gray-500 dark:text-gray-400">
                                  {countryFlag(geo.country_code)} {geo.city && `${geo.city}, `}{geo.country}
                                  {geo.org && <span className="text-gray-400"> · {geo.org.replace(/^AS\d+\s*/, "")}</span>}
                                </p>
                              ) : login.ip && login.ip !== "127.0.0.1" ? (
                                <p className="text-gray-400 italic">Looking up location…</p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "activity" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Full Activity Log</h3>
                    <button onClick={() => qc.invalidateQueries({ queryKey: ["admin-user-logs", userId] })}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  {logsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : logs.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">No activity recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2.5 text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5">
                          <div className="shrink-0 mt-0.5">{actionBadge(log.action)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400 truncate">{timeAgo(log.created_at)}</span>
                              {log.ip_address && <span className="text-gray-400 font-mono shrink-0">{log.ip_address}</span>}
                            </div>
                            {log.resource_type && (
                              <p className="text-gray-400 mt-0.5">{log.resource_type}{log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ""}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "finance" && (
                <div className="space-y-4">
                  {/* Income / Expense / Net */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                      <p className="font-bold text-green-600 text-sm">{fmt(detail.total_income, detail.currency)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Expense</p>
                      <p className="font-bold text-red-600 text-sm">{fmt(detail.total_expense, detail.currency)}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${net >= 0 ? "bg-primary-50 dark:bg-primary-900/20" : "bg-orange-50 dark:bg-orange-900/20"}`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net</p>
                      <p className={`font-bold text-sm ${net >= 0 ? "text-primary-600" : "text-orange-600"}`}>{fmt(net, detail.currency)}</p>
                    </div>
                  </div>

                  {/* Usage counts */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: FileText, label: "Transactions", value: detail.transaction_count, color: "text-purple-600" },
                      { icon: CreditCard, label: "Accounts", value: detail.account_count, color: "text-blue-600" },
                      { icon: PieChart, label: "Budgets Set", value: detail.budget_count, color: "text-teal-600" },
                      { icon: Activity, label: "Login Count", value: detail.login_count, color: "text-indigo-600" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex items-center gap-3">
                        <Icon size={16} className={`shrink-0 ${color}`} />
                        <div>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="font-semibold text-gray-800 dark:text-white">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notify modal */}
            {notifyOpen && (
              <div className="absolute inset-0 z-10 flex items-end bg-black/30">
                <div className="w-full bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Send System Notification</h3>
                    <button onClick={() => setNotifyOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Message to send to this user…"
                    value={notifyMsg}
                    onChange={e => setNotifyMsg(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setNotifyOpen(false)}
                      className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={() => sendNotify()}
                      disabled={!notifyMsg.trim() || notifying}
                      className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                      <Send size={13} /> {notifying ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
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
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
              {adminAvatarUrl(user.avatar_url)
                ? <img src={adminAvatarUrl(user.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover" />
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
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {user.is_email_verified
            ? <MailCheck size={12} className="text-blue-500" title="Email verified" />
            : <MailCheck size={12} className="text-gray-300" title="Email not verified" />
          }
          {user.totp_enabled && <KeyRound size={12} className="text-purple-500" title="2FA enabled" />}
        </div>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <select value={form.is_active ? "true" : "false"}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.value === "true" }))}
            className="text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1 focus:outline-none">
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            user.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {user.is_active ? "Active" : "Suspended"}
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
              <span className="text-xs text-gray-500 dark:text-gray-400">{confirmType === "delete" ? "Delete?" : "Logout?"}</span>
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
  const [filterStatus, setFilterStatus] = useState("all")   // all | active | suspended
  const [filterVerified, setFilterVerified] = useState("all") // all | verified | unverified
  const [showFilters, setShowFilters] = useState(false)
  const searchTimeout = useRef(null)
  const limit = 20

  const handleSearch = (v) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const { data: stats, dataUpdatedAt } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats().then(r => r.data),
    refetchInterval: 10_000,
  })

  const { data: growth = [] } = useQuery({
    queryKey: ["admin-growth"],
    queryFn: () => adminApi.growth(12).then(r => r.data),
  })

  const { data: activity = [] } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => adminApi.activity(50).then(r => r.data),
    refetchInterval: 10_000,
  })

  const { data: users = [], isFetching } = useQuery({
    queryKey: ["admin-users", page, search, filterStatus, filterVerified],
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

  // Client-side filter (server only filters by search text; status/verified filter locally)
  const filteredUsers = users.filter(u => {
    if (filterStatus === "active" && !u.is_active) return false
    if (filterStatus === "suspended" && u.is_active) return false
    if (filterVerified === "verified" && !u.is_email_verified) return false
    if (filterVerified === "unverified" && u.is_email_verified) return false
    return true
  })

  const total = stats?.total_users ?? 0
  const verifiedPct = total > 0 ? Math.round((stats?.verified_users ?? 0) / total * 100) : 0
  const twofaPct = total > 0 ? Math.round((stats?.two_fa_users ?? 0) / total * 100) : 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Last updated {dataUpdatedAt ? timeAgo(new Date(dataUpdatedAt).toISOString()) : "…"}
          </p>
        </div>
        <button onClick={() => qc.invalidateQueries()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users}      label="Total Users"       value={stats?.total_users}          color="blue"   />
        <StatCard icon={Wifi}       label="Online Now"        value={stats?.online_now}           color="green"  pulse={!!stats?.online_now} />
        <StatCard icon={Activity}   label="Active Sessions"   value={stats?.active_sessions}      color="teal"   />
        <StatCard icon={AlertTriangle} label="Failed Logins (24h)" value={stats?.failed_logins_24h}  color="red" />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={UserCheck}  label="Signups (7d)"      value={stats?.signups_last_7_days}  color="purple" />
        <StatCard icon={TrendingUp} label="Signups (30d)"     value={stats?.signups_last_30_days} color="orange" />
        <StatCard icon={MailCheck}  label="Email Verified"    value={stats?.verified_users} sub={`${verifiedPct}% of users`} color="blue" />
        <StatCard icon={KeyRound}   label="2FA Enabled"       value={stats?.two_fa_users}   sub={`${twofaPct}% of users`}   color="purple" />
      </div>

      {/* Stats row 3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileText}   label="Total Transactions" value={stats?.total_transactions}  color="indigo" />
        <StatCard icon={PieChart}   label="Total Budgets"      value={stats?.total_budgets}        color="teal"   />
        <StatCard icon={Activity}   label="Active Today"       value={stats?.active_today}         color="green"  />
        <StatCard icon={TrendingUp} label="Active (7 days)"    value={stats?.active_7_days}        color="orange" />
      </div>

      {/* Growth chart + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
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
                <Tooltip formatter={(v) => [v, "New users"]} labelFormatter={(w) => `Week of ${w}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="New users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Live Activity</h2>
            <span className="ml-auto text-xs text-gray-400">auto-refresh 10s</span>
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Users</h2>
            <span className="text-xs text-gray-400">Click row → details</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                showFilters ? "bg-primary-50 dark:bg-primary-900/20 border-primary-300 text-primary-600" : "border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              <Filter size={12} /> Filters
            </button>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Search name or email…"
                onChange={e => handleSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
              />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Status:</span>
              {["all", "active", "suspended"].map(v => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    filterStatus === v
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Email:</span>
              {["all", "verified", "unverified"].map(v => (
                <button key={v} onClick={() => setFilterVerified(v)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    filterVerified === v
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Active</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
              ) : filteredUsers.map(u => (
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
          <p className="text-xs text-gray-400">Page {page} · {filteredUsers.length} shown</p>
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

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
        />
      )}
    </div>
  )
}
