import { Outlet } from "react-router-dom"
import Sidebar from "../components/layout/Sidebar"
import TopBar from "../components/layout/TopBar"

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
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