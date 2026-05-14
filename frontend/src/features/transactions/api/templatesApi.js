import apiClient from "../../../lib/axios"

export const templatesApi = {
  list:   ()       => apiClient.get("/templates"),
  create: (data)   => apiClient.post("/templates", data),
  delete: (id)     => apiClient.delete(`/templates/${id}`),
}
