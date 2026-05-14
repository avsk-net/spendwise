import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { authApi } from "../api/authApi"
import { useAuthStore } from "../../../store/authStore"

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""
  const { user, setUser } = useAuthStore()

  const [status, setStatus] = useState(() => token ? "loading" : "error")
  const [message, setMessage] = useState(() => token ? "" : "No verification token provided.")

  useEffect(() => {
    if (!token) return
    authApi.verifyEmail(token)
      .then(() => {
        setStatus("success")
        if (user) setUser({ ...user, is_email_verified: true })
      })
      .catch((err) => {
        setStatus("error")
        setMessage(err.response?.data?.message || "Verification link is invalid or has expired.")
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center space-y-4">
        <span className="text-3xl">💰</span>

        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Email verified!</h2>
            <p className="text-sm text-gray-500">Your email address has been confirmed.</p>
            <Link
              to="/dashboard"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verification failed</h2>
            <p className="text-sm text-gray-500">{message}</p>
            <Link to="/login" className="block text-primary-600 text-sm hover:underline">Sign in</Link>
          </>
        )}
      </div>
    </div>
  )
}
