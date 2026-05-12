import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema } from "../validation/authSchemas"
import { useLogin } from "../hooks/useAuth"
import { Link } from "react-router-dom"

export function LoginForm() {
  const { mutate: login, isPending } = useLogin()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  return (
    <div className="bg-surface rounded-2xl shadow p-8">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome back</h1>
      <p className="text-text-secondary text-sm mb-6">Sign in to your account</p>

      <form onSubmit={handleSubmit(login)} className="space-y-4">
        <div>
          <input
            {...register("email")}
            type="email"
            placeholder="Email"
            className="w-full border border-border rounded-lg px-4 py-2.5 text-sm bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Password"
            className="w-full border border-border rounded-lg px-4 py-2.5 text-sm bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-6">
        No account?{" "}
        <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
      </p>
    </div>
  )
}