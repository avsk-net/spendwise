import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { User, Lock, Bell, Trash2, CheckCircle } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import apiClient from "../../../lib/axios"

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    username: user?.username || "",
    email_reports_enabled: user?.email_reports_enabled || false,
  })

  const [pw, setPw] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })

  const [pwError, setPwError] = useState("")

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: (data) => apiClient.patch("/users/me", data),
    onSuccess: ({ data }) => {
      setUser(data)
      toast.success("Profile updated")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: savePw, isPending: savingPw } = useMutation({
    mutationFn: (data) => apiClient.patch("/users/me/password", data),
    onSuccess: () => {
      setPw({ current_password: "", new_password: "", confirm_password: "" })
      setPwError("")
      toast.success("Password changed")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: () => apiClient.delete("/users/me"),
    onSuccess: () => {
      logout()
      navigate("/login")
      toast.success("Account deleted")
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  })

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPwError("")
    if (pw.new_password !== pw.confirm_password) {
      setPwError("New passwords do not match")
      return
    }
    if (pw.new_password.length < 8) {
      setPwError("Password must be at least 8 characters")
      return
    }
    savePw({ current_password: pw.current_password, new_password: pw.new_password })
  }

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete your account and ALL your data. This cannot be undone."
    )
    if (confirmed) deleteAccount()
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <User size={16} className="text-primary-600" />
          </div>
          <h2 className="font-semibold text-gray-800 dark:text-white">Profile</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-white">{user?.username}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Currency: <span className="font-medium text-gray-600 dark:text-gray-300">{user?.currency}</span>
                <span className="ml-2 text-gray-300">·</span>
                <span className="ml-2 text-gray-400">Currency cannot be changed after signup</span>
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Username</label>
            <input type="text"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={profile.username}
              onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" className="sr-only"
                checked={profile.email_reports_enabled}
                onChange={e => setProfile(p => ({ ...p, email_reports_enabled: e.target.checked }))} />
              <div className={`w-10 h-6 rounded-full transition-colors ${
                profile.email_reports_enabled ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-600"
              }`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  profile.email_reports_enabled ? "translate-x-5" : "translate-x-1"
                }`} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Monthly email reports</p>
              <p className="text-xs text-gray-400">Receive a spending summary every month</p>
            </div>
          </label>

          <button
            onClick={() => saveProfile(profile)}
            disabled={savingProfile}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            {savingProfile ? "Saving…" : <><CheckCircle size={15} /> Save Profile</>}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Lock size={16} className="text-blue-600" />
          </div>
          <h2 className="font-semibold text-gray-800 dark:text-white">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-3">
          {pwError && (
            <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{pwError}</p>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Current Password</label>
            <input type="password"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={pw.current_password}
              onChange={e => setPw(p => ({ ...p, current_password: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">New Password</label>
            <input type="password"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={pw.new_password}
              onChange={e => setPw(p => ({ ...p, new_password: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-medium">Confirm New Password</label>
            <input type="password"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={pw.confirm_password}
              onChange={e => setPw(p => ({ ...p, confirm_password: e.target.value }))} />
          </div>
          <button type="submit" disabled={savingPw}
            className="flex items-center gap-2 bg-gray-900 dark:bg-gray-600 hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            {savingPw ? "Changing…" : <><Lock size={15} /> Change Password</>}
          </button>
        </form>
      </div>

      {/* Notifications info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
            <Bell size={16} className="text-yellow-600" />
          </div>
          <h2 className="font-semibold text-gray-800 dark:text-white">Notifications</h2>
        </div>
        <div className="px-6 py-5 space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>🟡 <strong className="text-gray-700 dark:text-gray-200">Budget warning</strong> — triggered when you reach 80% of a category budget</p>
          <p>🔴 <strong className="text-gray-700 dark:text-gray-200">Budget exceeded</strong> — triggered when you exceed 100% of a budget</p>
          <p className="text-xs text-gray-400 pt-1">Notifications appear in the bell icon in the top bar.</p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 dark:border-red-900/30">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <Trash2 size={16} className="text-red-500" />
          </div>
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Permanently delete your account and all associated data including transactions, accounts, budgets, and categories. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            {deleting ? "Deleting…" : <><Trash2 size={15} /> Delete My Account</>}
          </button>
        </div>
      </div>
    </div>
  )
}