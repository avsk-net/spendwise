import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import { useAuthStore } from "./store/authStore"
import ErrorBoundary from "./components/ErrorBoundary"
import DashboardLayout from "./layouts/DashboardLayout"
import LoginPage from "./features/auth/pages/LoginPage"
import RegisterPage from "./features/auth/pages/RegisterPage"

const DashboardPage    = lazy(() => import("./features/dashboard/pages/DashboardPage"))
const TransactionsPage = lazy(() => import("./features/transactions/pages/TransactionsPage"))
const AccountsPage     = lazy(() => import("./features/accounts/pages/AccountsPage"))
const BudgetsPage      = lazy(() => import("./features/budgets/pages/BudgetsPage"))
const ReportsPage      = lazy(() => import("./features/reports/pages/ReportsPage"))
const RecurringPage    = lazy(() => import("./features/recurring/pages/RecurringPage"))
const SettingsPage     = lazy(() => import("./features/settings/pages/SettingsPage"))

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Suspense fallback={<Spinner />}><DashboardPage /></Suspense>} />
            <Route path="/transactions" element={<Suspense fallback={<Spinner />}><TransactionsPage /></Suspense>} />
            <Route path="/accounts" element={<Suspense fallback={<Spinner />}><AccountsPage /></Suspense>} />
            <Route path="/budgets" element={<Suspense fallback={<Spinner />}><BudgetsPage /></Suspense>} />
            <Route path="/reports" element={<Suspense fallback={<Spinner />}><ReportsPage /></Suspense>} />
            <Route path="/recurring" element={<Suspense fallback={<Spinner />}><RecurringPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<Spinner />}><SettingsPage /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}