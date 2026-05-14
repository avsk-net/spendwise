import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { authApi } from "../api/authApi"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-red-500 font-medium">Invalid reset link.</p>
          <Link to="/forgot-password" className="block mt-4 text-primary-600 text-sm hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate("/login"), 3000)
    } catch (err) {
      setError(err.response?.data?.message || "Reset link is invalid or has expired")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-800 font-medium">Password reset successfully!</p>
          <p className="text-sm text-gray-500">Redirecting to sign in…</p>
          <Link to="/login" className="block text-primary-600 text-sm hover:underline">Sign in now</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Set new password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              required
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  )
}
