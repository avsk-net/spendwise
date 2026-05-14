import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { registerSchema } from "../validation/authSchemas"
import { authApi } from "../api/authApi"
import { useAuthStore } from "../../../store/authStore"
import { CURRENCIES } from "../../../constants"

export default function RegisterPage() {
  const [error, setError] = useState("")
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { currency: "BDT" },
  })

  const onSubmit = async (data) => {
    setError("")
    try {
      const { data: tokens } = await authApi.register(data)
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: me } = await authApi.getMe()
      setUser(me)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Start tracking your finances</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input {...register("email")} type="email" placeholder="Email"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register("username")} type="text" placeholder="Username"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <input {...register("password")} type="password" placeholder="Password (min 8 chars)"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <select {...register("currency")}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors">
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">
          We'll send a verification email after you sign up.
        </p>
        <p className="text-center text-sm text-gray-500 mt-3">
          Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}