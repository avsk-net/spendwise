import apiClient from "../../../lib/axios"

export const authApi = {
  register:           (data) => apiClient.post("/auth/register", data),
  login:              (data) => apiClient.post("/auth/login", data),
  logout:             (refreshToken) => apiClient.post("/auth/logout", { refresh_token: refreshToken }),
  getMe:              () => apiClient.get("/users/me"),
  forgotPassword:     (email) => apiClient.post("/auth/forgot-password", { email }),
  resetPassword:      (token, new_password) => apiClient.post("/auth/reset-password", { token, new_password }),
  verifyEmail:        (token) => apiClient.post("/auth/verify-email", { token }),
  resendVerification: () => apiClient.post("/auth/resend-verification"),
}