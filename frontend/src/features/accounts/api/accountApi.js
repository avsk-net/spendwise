import apiClient from "../../../lib/axios"
export const accountsApi = {
  list:   ()         => apiClient.get("/accounts"),
  create: (data)     => apiClient.post("/accounts", data),
  update: (id, data) => apiClient.patch(`/accounts/${id}`, data),
  delete: (id)       => apiClient.delete(`/accounts/${id}`),
}