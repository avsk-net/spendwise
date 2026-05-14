import apiClient from "../../../lib/axios"
export const transactionsApi = {
  list:           (params) => apiClient.get("/transactions", { params }),
  exportCsv:      (params) => apiClient.get("/transactions/export/csv", { params, responseType: "blob" }),
  create:         (data)   => apiClient.post("/transactions", data),
  update:         (id, data) => apiClient.patch(`/transactions/${id}`, data),
  delete:         (id)     => apiClient.delete(`/transactions/${id}`),
  categories:     ()       => apiClient.get("/categories"),
  createCategory: (data)   => apiClient.post("/categories", data),
}
