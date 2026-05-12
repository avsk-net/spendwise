import axios from "axios"
import { API_BASE_URL } from "../config"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem("spendwise-auth")
  if (raw) {
    const parsed = JSON.parse(raw)
    const token = parsed?.state?.accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const raw = localStorage.getItem("spendwise-auth")
      const refreshToken = raw ? JSON.parse(raw)?.state?.refreshToken : null
      if (!refreshToken) {
        window.location.href = "/login"
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const stored = JSON.parse(localStorage.getItem("spendwise-auth"))
        stored.state.accessToken = data.access_token
        localStorage.setItem("spendwise-auth", JSON.stringify(stored))
        original.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(original)
      } catch {
        localStorage.removeItem("spendwise-auth")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient