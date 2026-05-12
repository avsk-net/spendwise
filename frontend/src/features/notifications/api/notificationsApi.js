import apiClient from "../../../lib/axios"
export const notificationsApi = {
  list:        ()   => apiClient.get("/notifications"),
  markRead:    (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: ()   => apiClient.patch("/notifications/read-all"),
}
