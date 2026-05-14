import apiClient from "../../../lib/axios"

export const debtsApi = {
  list:           ()                => apiClient.get("/debts"),
  create:         (data)            => apiClient.post("/debts", data),
  update:         (id, data)        => apiClient.patch(`/debts/${id}`, data),
  delete:         (id)              => apiClient.delete(`/debts/${id}`),
  addPayment:     (id, data)        => apiClient.post(`/debts/${id}/payments`, data),
  deletePayment:  (id, paymentId)   => apiClient.delete(`/debts/${id}/payments/${paymentId}`),
}
