import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { loginSchema } from "../validation/authSchemas"
import { authApi } from "../api/authApi"
import { useAuthStore } from "../../../store/authStore"

export default function LoginPage() {
  const [error, setError] = useState("")
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    setError("")
    try {
      const { data: tokens } = await authApi.login(data)
      setTokens(tokens.access_token, tokens.refresh_token)
      const { data: me } = await authApi.getMe()
      setUser(me)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Login failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="text-center mb-6">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Spendwise</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input {...register("email")} type="email" placeholder="Email"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register("password")} type="password" placeholder="Password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm mt-3">
          <Link to="/forgot-password" className="text-gray-400 hover:text-primary-600 text-xs">Forgot password?</Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-4">
          No account? <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}