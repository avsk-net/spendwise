import { create } from "zustand"

export const useNotifStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifs) => set({
    notifications: notifs,
    unreadCount: notifs.filter((n) => !n.is_read).length,
  }),
  addNotification: (notif) => set((state) => ({
    notifications: [notif, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),
  clearUnread: () => set({ unreadCount: 0 }),
}))
