import apiClient from "../../../lib/axios"

export const savingGoalsApi = {
  list:       ()              => apiClient.get("/saving-goals"),
  create:     (data)          => apiClient.post("/saving-goals", data),
  update:     (id, data)      => apiClient.patch(`/saving-goals/${id}`, data),
  contribute: (id, amount)    => apiClient.post(`/saving-goals/${id}/contribute`, { amount }),
  delete:     (id)            => apiClient.delete(`/saving-goals/${id}`),
}
