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
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <WsListener />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
