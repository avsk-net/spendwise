import apiClient from "../../../lib/axios"
export const recurringApi = {
  list:   ()         => apiClient.get("/recurring"),
  create: (data)     => apiClient.post("/recurring", data),
  update: (id, data) => apiClient.patch(`/recurring/${id}`, data),
  delete: (id)       => apiClient.delete(`/recurring/${id}`),
}
