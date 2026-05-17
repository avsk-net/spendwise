import { useState } from "react"
import { Cookie } from "lucide-react"

const CONSENT_KEY = "sw_cookie_consent"

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(CONSENT_KEY))

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted")
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
          <Cookie size={20} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800 dark:text-white mb-0.5">We use cookies</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            SpendWise uses essential cookies for authentication and preferences.
            By continuing, you agree to our{" "}
            <a href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</a>{" "}
            and{" "}
            <a href="/terms" className="text-primary-600 hover:underline">Terms of Service</a>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button onClick={decline}
            className="flex-1 sm:flex-none text-xs text-gray-500 hover:text-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 px-4 py-2 rounded-xl transition-colors">
            Decline
          </button>
          <button onClick={accept}
            className="flex-1 sm:flex-none text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors">
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
