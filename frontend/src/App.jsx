import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense, useEffect } from "react"
import { useAuthStore } from "./store/authStore"
import { useThemeStore } from "./store/themeStore"
import ErrorBoundary from "./components/ErrorBoundary"
import CookieBanner from "./components/CookieBanner"
import DashboardLayout from "./layouts/DashboardLayout"
import LoginPage from "./features/auth/pages/LoginPage"
import RegisterPage from "./features/auth/pages/RegisterPage"
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage"
import ResetPasswordPage from "./features/auth/pages/ResetPasswordPage"
import VerifyEmailPage from "./features/auth/pages/VerifyEmailPage"

const DashboardPage    = lazy(() => import("./features/dashboard/pages/DashboardPage"))
const TransactionsPage = lazy(() => import("./features/transactions/pages/TransactionsPage"))
const AccountsPage     = lazy(() => import("./features/accounts/pages/AccountsPage"))
const BudgetsPage      = lazy(() => import("./features/budgets/pages/BudgetsPage"))
const ReportsPage      = lazy(() => import("./features/reports/pages/ReportsPage"))
const RecurringPage    = lazy(() => import("./features/recurring/pages/RecurringPage"))
const SettingsPage     = lazy(() => import("./features/settings/pages/SettingsPage"))
const SavingGoalsPage  = lazy(() => import("./features/saving-goals/pages/SavingGoalsPage"))
const DebtPage         = lazy(() => import("./features/debts/pages/DebtPage"))
const CategoriesPage   = lazy(() => import("./features/categories/pages/CategoriesPage"))
const NotepadPage      = lazy(() => import("./features/notepad/pages/NotepadPage"))
const AdminPage        = lazy(() => import("./features/admin/pages/AdminPage"))
const NotFoundPage     = lazy(() => import("./pages/NotFoundPage"))
const PrivacyPage      = lazy(() => import("./features/legal/PrivacyPage"))
const TermsPage        = lazy(() => import("./features/legal/TermsPage"))

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.is_superadmin) return <Navigate to="/dashboard" replace />
  return children
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const initTheme = useThemeStore((s) => s.initTheme)
  useEffect(() => { initTheme() }, [initTheme])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/privacy" element={<Suspense fallback={<Spinner />}><PrivacyPage /></Suspense>} />
          <Route path="/terms"   element={<Suspense fallback={<Spinner />}><TermsPage /></Suspense>} />
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
            <Route path="/saving-goals" element={<Suspense fallback={<Spinner />}><SavingGoalsPage /></Suspense>} />
            <Route path="/categories" element={<Suspense fallback={<Spinner />}><CategoriesPage /></Suspense>} />
            <Route path="/debts"      element={<Suspense fallback={<Spinner />}><DebtPage /></Suspense>} />
            <Route path="/notepad"    element={<Suspense fallback={<Spinner />}><NotepadPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<Spinner />}><SettingsPage /></Suspense>} />
          </Route>
          <Route path="/admin" element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }>
            <Route index element={<Suspense fallback={<Spinner />}><AdminPage /></Suspense>} />
          </Route>
          <Route path="*" element={<Suspense fallback={<Spinner />}><NotFoundPage /></Suspense>} />
        </Routes>
      </BrowserRouter>
      <CookieBanner />
    </ErrorBoundary>
  )
}