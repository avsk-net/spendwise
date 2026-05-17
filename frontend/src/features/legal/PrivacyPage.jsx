import { Link } from "react-router-dom"
import { ArrowLeft, Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
              <p className="text-sm text-gray-400">Last updated: May 2026</p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly, including your email address, username, and financial data you enter into SpendWise (transactions, accounts, budgets, goals).</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">2. How We Use Your Information</h2>
              <p>Your data is used solely to provide the SpendWise service. We do not sell, share, or disclose your personal or financial information to third parties. Financial data is used only to display your reports and analytics.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">3. Data Storage &amp; Security</h2>
              <p>All data is stored in encrypted databases. Passwords are hashed using bcrypt. We use HTTPS for all data transmission. You can delete your account and all associated data at any time from Settings.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">4. Cookies</h2>
              <p>SpendWise uses essential cookies for authentication (JWT tokens stored in browser storage) and user preferences (theme, language). No advertising or tracking cookies are used.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">5. Your Rights</h2>
              <p>You have the right to access, correct, export, or delete your data at any time. Use the Settings page to manage your account and data. To request a full data export, contact us.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">6. Contact</h2>
              <p>For privacy concerns or data requests, contact us at the email on the SpendWise platform.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
