import apiClient from "../../../lib/axios"
export const transactionsApi = {
  list:           (params) => apiClient.get("/transactions", { params }),
  create:         (data)   => apiClient.post("/transactions", data),
  update:         (id, data) => apiClient.patch(`/transactions/${id}`, data),
  delete:         (id)     => apiClient.delete(`/transactions/${id}`),
  categories:     ()       => apiClient.get("/categories"),
  createCategory: (data)   => apiClient.post("/categories", data),
}
