import apiClient from "../../../lib/axios"
export const budgetsApi = {
  list:   (month)    => apiClient.get("/budgets", { params: { month } }),
  create: (data)     => apiClient.post("/budgets", data),
  update: (id, data) => apiClient.patch(`/budgets/${id}`, data),
  delete: (id)       => apiClient.delete(`/budgets/${id}`),
}
