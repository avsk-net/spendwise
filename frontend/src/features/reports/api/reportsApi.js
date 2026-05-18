import apiClient from "../../../lib/axios"
export const reportsApi = {
  summary:    (params) => apiClient.get("/reports/summary", { params }),
  byCategory: (params) => apiClient.get("/reports/by-category", { params }),
  daily:      (params) => apiClient.get("/reports/daily", { params }),
  monthly:    (params) => apiClient.get("/reports/monthly", { params }),
  trend:      (months) => apiClient.get("/reports/trend", { params: { months } }),
  netWorth:   () => apiClient.get("/reports/net-worth"),
  exportPdf:  (params) => apiClient.get("/reports/export/pdf", { params, responseType: "blob" }),
  insights:   () => apiClient.get("/reports/insights"),
  budgetVsActual: (month) => apiClient.get("/reports/budget-vs-actual", { params: { month } }),
  byWeekday:      (params) => apiClient.get("/reports/by-weekday", { params }),
}
