import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { loginSchema } from "../validation/authSchemas"
import { authApi } from "../api/authApi"
import { useAuthStore } from "../../../store/authStore"
import { ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState("")
  const [step, setStep] = useState("credentials")
  const [mfaToken, setMfaToken] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    setError("")
    try {
      const { data: response } = await authApi.login(data)
      if (response.requires_2fa) {
        setMfaToken(response.mfa_token)
        setStep("otp")
      } else {
        setTokens(response.access_token, response.refresh_token)
        const { data: me } = await authApi.getMe()
        setUser(me)
        navigate("/dashboard")
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed")
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setVerifying(true)
    try {
      const { data: tokens } = await authApi.verify2fa({ mfa_token: mfaToken, code: otpCode })
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: me } = await authApi.getMe()
      setUser(me)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Spendwise</h1>
          {step === "credentials"
            ? <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your account</p>
            : <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Enter your 2FA code</p>
          }
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        {step === "credentials" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input {...register("email")} type="email" placeholder="Email"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <input {...register("password")} type="password" placeholder="Password"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} className="text-primary-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <button type="submit" disabled={verifying || otpCode.length < 6}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors">
              {verifying ? "Verifying…" : "Verify"}
            </button>
            <button type="button" onClick={() => { setStep("credentials"); setError(""); setOtpCode("") }}
              className="w-full text-gray-400 hover:text-gray-600 text-sm py-1 transition-colors">
              ← Back to login
            </button>
          </form>
        )}

        {step === "credentials" && (
          <>
            <p className="text-center text-sm mt-3">
              <Link to="/forgot-password" className="text-gray-400 hover:text-primary-600 text-xs">Forgot password?</Link>
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              No account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
            </p>
            <p className="text-center text-xs text-gray-400 mt-4">
              <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
              {" · "}
              <Link to="/terms" className="hover:underline">Terms of Service</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
