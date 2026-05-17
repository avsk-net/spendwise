import { Link } from "react-router-dom"
import { TrendingUp, Home, ArrowLeft } from "lucide-react"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <TrendingUp size={36} className="text-primary-600" />
        </div>
        <h1 className="text-7xl font-black text-gray-200 dark:text-gray-700 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Page not found</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm font-medium transition-colors">
            <ArrowLeft size={15} /> Go Back
          </button>
          <Link to="/dashboard"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Home size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
