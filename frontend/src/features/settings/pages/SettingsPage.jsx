import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Camera, CheckCircle, Copy, Lock, Mail, Monitor,
  Settings2, ShieldAlert, ShieldCheck, Trash2, User, X,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import apiClient from "../../../lib/axios"
import { useAuthStore } from "../../../store/authStore"
import { authApi } from "../../auth/api/authApi"

const TABS = [
  { id: "profile",     label: "Profile",     icon: User },
  { id: "security",    label: "Security",    icon: Lock },
  { id: "preferences", label: "Preferences", icon: Settings2 },
]

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium">{label}</label>
      <input
        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        {...props}
      />
    </div>
  )
}

function Card({ children, danger }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border ${
      danger ? "border-red-100 dark:border-red-900/30" : "border-gray-100 dark:border-gray-700"
    }`}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, label, danger, children }) {
  const color = danger ? "text-red-500" : "text-primary-600"
  const bg = danger ? "bg-red-100 dark:bg-red-900/30" : "bg-primary-100 dark:bg-primary-900/30"
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b ${
      danger ? "border-red-100 dark:border-red-900/30" : "border-gray-100 dark:border-gray-700"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
        <h2 className={`font-semibold ${danger ? "text-red-600" : "text-gray-800 dark:text-white"}`}>{label}</h2>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState("profile")
  const fileRef = useRef(null)
  const [setupData, setSetupData] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [totpCode, setTotpCode] = useState("")

  const [profile, setProfile] = useState({ username: user?.username || "" })
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm_password: "" })
  const [pwError, setPwError] = useState("")

  const avatarUrl = user?.avatar_url
    ? user.avatar_url.startsWith("http")
      ? user.avatar_url
      : `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/media/${user.avatar_url.replace(/^\/media\//, "")}`
    : null

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: (data) => apiClient.patch("/users/me", data),
    onSuccess: ({ data }) => { setUser(data); toast.success("Profile saved") },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useMutation({
    mutationFn: (file) => {
      const fd = new FormData(); fd.append("file", file)
      return apiClient.post("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } })
    },
    onSuccess: ({ data }) => { setUser(data); toast.success("Avatar updated") },
    onError: (e) => toast.error(e.response?.data?.message || "Upload failed"),
  })

  const { mutate: removeAvatar } = useMutation({
    mutationFn: () => apiClient.delete("/users/me/avatar"),
    onSuccess: ({ data }) => { setUser(data); toast.success("Avatar removed") },
  })

  const { mutate: savePw, isPending: savingPw } = useMutation({
    mutationFn: (data) => apiClient.patch("/users/me/password", data),
    onSuccess: () => { setPw({ current_password: "", new_password: "", confirm_password: "" }); setPwError(""); toast.success("Password changed") },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: resendVerification, isPending: resending } = useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: () => toast.success("Verification email sent"),
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiClient.get("/auth/sessions").then(r => r.data),
  })

  const { mutate: revokeSession } = useMutation({
    mutationFn: (id) => apiClient.delete(`/auth/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Session revoked") },
  })

  const { mutate: revokeAllSessions } = useMutation({
    mutationFn: () => apiClient.delete("/auth/sessions"),
    onSuccess: () => { toast.success("All sessions revoked"); logout(); navigate("/login") },
  })

  const { mutate: initSetup2fa, isPending: settingUp2fa } = useMutation({
    mutationFn: () => apiClient.post("/users/me/2fa/setup"),
    onSuccess: async ({ data }) => {
      setSetupData(data)
      try {
        const QRCode = await import("qrcode")
        const url = await QRCode.default.toDataURL(data.provisioning_uri)
        setQrCodeUrl(url)
      } catch {
        setQrCodeUrl(null)
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: enable2fa, isPending: enabling2fa } = useMutation({
    mutationFn: (data) => apiClient.post("/users/me/2fa/enable", data),
    onSuccess: ({ data }) => {
      setUser(data)
      setSetupData(null)
      setQrCodeUrl(null)
      setTotpCode("")
      toast.success("2FA enabled successfully")
      qc.invalidateQueries({ queryKey: ["me"] })
    },
    onError: (e) => toast.error(e.response?.data?.message || "Invalid code"),
  })

  const { mutate: disable2fa, isPending: disabling2fa } = useMutation({
    mutationFn: () => apiClient.delete("/users/me/2fa"),
    onSuccess: ({ data }) => {
      setUser(data)
      toast.success("2FA disabled")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: () => apiClient.delete("/users/me"),
    onSuccess: () => { logout(); navigate("/login"); toast.success("Account deleted") },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const handlePwSubmit = (e) => {
    e.preventDefault(); setPwError("")
    if (pw.new_password !== pw.confirm_password) { setPwError("Passwords do not match"); return }
    if (pw.new_password.length < 8) { setPwError("Minimum 8 characters"); return }
    savePw({ current_password: pw.current_password, new_password: pw.new_password })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === id
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <>
          <Card>
            <CardHeader icon={User} label="Profile" />
            <div className="px-6 py-5 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      : <span className="text-white text-2xl font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera size={18} className="text-white" />
                  </button>
                  {avatarUrl && (
                    <button
                      onClick={() => removeAvatar()}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white text-lg">{user?.username}</p>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Hover the avatar to change or remove it</p>
                </div>
              </div>

              {/* Email verification */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                user?.is_email_verified
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              }`}>
                <div className="flex items-center gap-2">
                  {user?.is_email_verified
                    ? <ShieldCheck size={16} className="text-green-600" />
                    : <ShieldAlert size={16} className="text-amber-600" />}
                  <span className={`text-sm font-medium ${user?.is_email_verified ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {user?.is_email_verified ? "Email verified" : "Email not verified"}
                  </span>
                </div>
                {!user?.is_email_verified && (
                  <button onClick={() => resendVerification()} disabled={resending}
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-60">
                    <Mail size={13} />{resending ? "Sending…" : "Resend"}
                  </button>
                )}
              </div>

              <Input label="Username" value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium">Email</label>
                <input disabled value={user?.email || ""}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-xl px-4 py-2.5 text-sm bg-gray-50 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email changes are not supported yet</p>
              </div>

              <button onClick={() => saveProfile(profile)} disabled={savingProfile}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                {savingProfile ? "Saving…" : <><CheckCircle size={15} /> Save Profile</>}
              </button>
            </div>
          </Card>

          <Card danger>
            <CardHeader icon={Trash2} label="Danger Zone" danger />
            <div className="px-6 py-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Permanently delete your account and all data. This cannot be undone.
              </p>
              <button onClick={() => { if (window.confirm("Delete your account? This cannot be undone.")) deleteAccount() }}
                disabled={deleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                {deleting ? "Deleting…" : <><Trash2 size={15} /> Delete My Account</>}
              </button>
            </div>
          </Card>
        </>
      )}

      {/* ── Security tab ── */}
      {tab === "security" && (
        <>
          <Card>
            <CardHeader icon={Lock} label="Change Password" />
            <form onSubmit={handlePwSubmit} className="px-6 py-5 space-y-3">
              {pwError && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{pwError}</p>}
              <Input label="Current Password" type="password" value={pw.current_password}
                onChange={e => setPw(p => ({ ...p, current_password: e.target.value }))} />
              <Input label="New Password" type="password" value={pw.new_password}
                onChange={e => setPw(p => ({ ...p, new_password: e.target.value }))} />
              <Input label="Confirm New Password" type="password" value={pw.confirm_password}
                onChange={e => setPw(p => ({ ...p, confirm_password: e.target.value }))} />
              <button type="submit" disabled={savingPw}
                className="flex items-center gap-2 bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                {savingPw ? "Changing…" : <><Lock size={15} /> Change Password</>}
              </button>
            </form>
          </Card>

          <Card>
            <CardHeader icon={Monitor} label="Active Sessions">
              {sessions.length > 1 && (
                <button
                  onClick={() => { if (window.confirm("Revoke all sessions? You will be logged out.")) revokeAllSessions() }}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors">
                  Revoke all
                </button>
              )}
            </CardHeader>
            <div className="px-6 py-4">
              {sessions.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">No active sessions</p>
                : (
                  <div className="space-y-2">
                    {sessions.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Session {i + 1}
                            {i === 0 && <span className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">current</span>}
                          </p>
                          <p className="text-xs text-gray-400">
                            Started {new Date(s.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            {" · "}Expires {new Date(s.expires_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <button onClick={() => revokeSession(s.id)}
                          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 dark:border-gray-600 hover:border-red-300 px-2.5 py-1 rounded-lg transition-colors">
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </Card>

          {/* ── 2FA Card ── */}
          <Card>
            <CardHeader icon={ShieldCheck} label="Two-Factor Authentication" />
            <div className="px-6 py-5">
              {user?.totp_enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <ShieldCheck size={18} className="text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">2FA is enabled</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Your account is protected with TOTP authentication</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (window.confirm("Disable 2FA? Your account will be less secure.")) disable2fa() }}
                    disabled={disabling2fa}
                    className="flex items-center gap-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                    {disabling2fa ? "Disabling…" : "Disable 2FA"}
                  </button>
                </div>
              ) : setupData ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), or enter the secret key manually.
                  </p>
                  {qrCodeUrl && (
                    <div className="flex justify-center">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 border border-gray-200 dark:border-gray-600 rounded-xl p-2 bg-white" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Secret Key (manual entry)</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono px-3 py-2 rounded-lg break-all">{setupData.secret}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(setupData.secret); toast.success("Copied!") }}
                        className="shrink-0 p-2 text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Verification Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={() => enable2fa({ code: totpCode, secret: setupData.secret })}
                        disabled={enabling2fa || totpCode.length < 6}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                        {enabling2fa ? "Enabling…" : "Enable"}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setSetupData(null); setQrCodeUrl(null); setTotpCode("") }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add an extra layer of security to your account using a time-based one-time password (TOTP) app.
                  </p>
                  <button
                    onClick={() => initSetup2fa()}
                    disabled={settingUp2fa}
                    className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                    <ShieldCheck size={15} />
                    {settingUp2fa ? "Loading…" : "Set up 2FA"}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── Preferences tab ── */}
      {tab === "preferences" && (
        <Card>
          <CardHeader icon={Settings2} label="Preferences" />
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium">Default Currency</label>
              <input disabled value={user?.currency || ""}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-xl px-4 py-2.5 text-sm bg-gray-50 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Currency is set at signup and cannot be changed</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notifications</p>
              <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                <p>🟡 <strong className="text-gray-700 dark:text-gray-200">Budget warning</strong> — at 80% of a category budget</p>
                <p>🔴 <strong className="text-gray-700 dark:text-gray-200">Budget exceeded</strong> — over 100% of a budget</p>
                <p className="text-xs text-gray-400 pt-1">Notifications appear in the bell icon in the top bar.</p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only"
                  checked={user?.email_reports_enabled || false}
                  onChange={e => saveProfile({ email_reports_enabled: e.target.checked })} />
                <div className={`w-10 h-6 rounded-full transition-colors ${user?.email_reports_enabled ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${user?.email_reports_enabled ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Monthly email reports</p>
                <p className="text-xs text-gray-400">Receive a spending summary every month</p>
              </div>
            </label>
          </div>
        </Card>
      )}
    </div>
  )
}
