import apiClient from "../../../lib/axios"
export const reportsApi = {
  summary:    (params) => apiClient.get("/reports/summary", { params }),
  byCategory: (params) => apiClient.get("/reports/by-category", { params }),
  daily:      (params) => apiClient.get("/reports/daily", { params }),
  monthly:    (params) => apiClient.get("/reports/monthly", { params }),
  trend:      (months) => apiClient.get("/reports/trend", { params: { months } }),
}
