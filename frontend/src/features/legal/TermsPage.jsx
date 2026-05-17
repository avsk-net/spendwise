import { Link } from "react-router-dom"
import { ArrowLeft, FileText } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
              <p className="text-sm text-gray-400">Last updated: May 2026</p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">1. Acceptance of Terms</h2>
              <p>By using SpendWise, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">2. Service Description</h2>
              <p>SpendWise is a personal finance tracking application. It is provided for personal, non-commercial use. The service is provided "as is" without warranties of any kind.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">3. User Responsibilities</h2>
              <p>You are responsible for maintaining the security of your account credentials. You agree not to share your account with others or use the service for illegal purposes. You are responsible for the accuracy of your financial data.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">4. Data &amp; Privacy</h2>
              <p>Your use of SpendWise is also governed by our Privacy Policy. We take reasonable measures to protect your data but cannot guarantee absolute security.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">5. Limitation of Liability</h2>
              <p>SpendWise is a financial tracking tool, not a financial advisor. We are not liable for financial decisions made based on the data displayed. The service is provided as-is without any express or implied warranties.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">6. Account Termination</h2>
              <p>You may delete your account at any time from Settings. We reserve the right to suspend accounts that violate these terms.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">7. Changes to Terms</h2>
              <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
