import apiClient from "../../../lib/axios"

export const adminApi = {
  stats: () => apiClient.get("/admin/stats"),
  listUsers: (params) => apiClient.get("/admin/users", { params }),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  forceLogout: (id) => apiClient.post(`/admin/users/${id}/force-logout`),
}
