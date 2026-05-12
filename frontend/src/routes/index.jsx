import { createBrowserRouter } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import AuthLayout from "../layouts/AuthLayout"
import ProtectedRoute from "./ProtectedRoute"
import ErrorBoundary from "../components/ErrorBoundary"

// Auth feature
import { LoginPage, RegisterPage } from "../features/auth"

// App features — lazy-loaded for performance
import { lazy, Suspense } from "react"
const DashboardPage    = lazy(() => import("../features/dashboard/pages/DashboardPage"))
const TransactionsPage = lazy(() => import("../features/transactions/pages/TransactionsPage"))
const AccountsPage     = lazy(() => import("../features/accounts/pages/AccountsPage"))
const BudgetsPage      = lazy(() => import("../features/budgets/pages/BudgetsPage"))
const RecurringPage    = lazy(() => import("../features/recurring/pages/RecurringPage"))
const ReportsPage      = lazy(() => import("../features/reports/pages/ReportsPage"))
const SettingsPage     = lazy(() => import("../features/settings/pages/SettingsPage"))

const Fallback = () => <div className="p-6 text-text-secondary text-sm">Loading…</div>

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout><LoginPage /></AuthLayout>,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    element: <AuthLayout><LoginPage /></AuthLayout>,
  },
  {
    path: "/register",
    element: <AuthLayout><RegisterPage /></AuthLayout>,
  },
  {
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    errorElement: <ErrorBoundary />,
    children: [
      { path: "/dashboard",    element: <Suspense fallback={<Fallback />}><DashboardPage /></Suspense> },
      { path: "/transactions", element: <Suspense fallback={<Fallback />}><TransactionsPage /></Suspense> },
      { path: "/accounts",     element: <Suspense fallback={<Fallback />}><AccountsPage /></Suspense> },
      { path: "/budgets",      element: <Suspense fallback={<Fallback />}><BudgetsPage /></Suspense> },
      { path: "/recurring",    element: <Suspense fallback={<Fallback />}><RecurringPage /></Suspense> },
      { path: "/reports",      element: <Suspense fallback={<Fallback />}><ReportsPage /></Suspense> },
      { path: "/settings",     element: <Suspense fallback={<Fallback />}><SettingsPage /></Suspense> },
    ],
  },
])