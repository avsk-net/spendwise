import apiClient from "../../../lib/axios"

export const authApi = {
  register: (data) => apiClient.post("/auth/register", data),
  login:    (data) => apiClient.post("/auth/login", data),
  logout:   (refreshToken) => apiClient.post("/auth/logout", { refresh_token: refreshToken }),
  getMe:    () => apiClient.get("/users/me"),
}