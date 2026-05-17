import apiClient from "../../../lib/axios"
export const notepadApi = {
  list:   ()          => apiClient.get("/notepad"),
  create: (data)      => apiClient.post("/notepad", data),
  update: (id, data)  => apiClient.patch(`/notepad/${id}`, data),
  delete: (id)        => apiClient.delete(`/notepad/${id}`),
}
