import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { authApi } from "../api/authApi"
import { useAuthStore } from "../store/authStore"

export function useLogin() {
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ data }) => {
      setTokens(data.access_token, data.refresh_token)
      const { data: me } = await authApi.getMe()
      setUser(me)
      navigate("/dashboard")
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Login failed")
    },
  })
}

export function useRegister() {
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ data }) => {
      setTokens(data.access_token, data.refresh_token)
      const { data: me } = await authApi.getMe()
      setUser(me)
      navigate("/dashboard")
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Registration failed")
    },
  })
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authApi.logout(refreshToken),
    onSettled: () => {
      logout()
      navigate("/login")
    },
  })
}