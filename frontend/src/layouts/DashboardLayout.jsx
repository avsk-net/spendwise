import { useState } from "react"
import { Outlet } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import Sidebar from "../components/layout/Sidebar"
import TopBar from "../components/layout/TopBar"
import { useWebSocket } from "../hooks/useWebSocket"
import { useNotifStore } from "../store/notifStore"

function WsListener() {
  const addNotification = useNotifStore((s) => s.addNotification)
  const queryClient = useQueryClient()

  useWebSocket((msg) => {
    if (msg.type === "notification") {
      addNotification(msg.data)
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }
  })

  return null
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <WsListener />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
