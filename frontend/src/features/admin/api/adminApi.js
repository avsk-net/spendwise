import apiClient from "../../../lib/axios"

export const adminApi = {
  stats:      () => apiClient.get("/admin/stats"),
  growth:     (weeks = 12) => apiClient.get("/admin/growth", { params: { weeks } }),
  activity:   (limit = 50) => apiClient.get("/admin/activity", { params: { limit } }),
  listUsers:  (params) => apiClient.get("/admin/users", { params }),
  userDetail: (id) => apiClient.get(`/admin/users/${id}/detail`),
  updateUser: (id, data) => apiClient.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  forceLogout:(id) => apiClient.post(`/admin/users/${id}/force-logout`),
}
