import apiClient from "../../../lib/axios"

export const categoriesApi = {
  list:    ()       => apiClient.get("/categories"),
  create:  (data)   => apiClient.post("/categories", data),
  update:  (id, d)  => apiClient.patch(`/categories/${id}`, d),
  delete:  (id)     => apiClient.delete(`/categories/${id}`),
  listRules:    ()       => apiClient.get("/categorization-rules"),
  createRule:   (data)   => apiClient.post("/categorization-rules", data),
  updateRule:   (id, d)  => apiClient.patch(`/categorization-rules/${id}`, d),
  deleteRule:   (id)     => apiClient.delete(`/categorization-rules/${id}`),
  suggest:      (text)   => apiClient.post("/categorization-rules/suggest", { text }),
}
