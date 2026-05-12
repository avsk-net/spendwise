import { create } from "zustand"

export const useNotifStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifs) => set({
    notifications: notifs,
    unreadCount: notifs.filter((n) => !n.is_read).length,
  }),
  clearUnread: () => set({ unreadCount: 0 }),
}))