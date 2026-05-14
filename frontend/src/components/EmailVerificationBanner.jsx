import { useState } from "react"
import { MailWarning, X } from "lucide-react"
import { authApi } from "../features/auth/api/authApi"
import toast from "react-hot-toast"

export default function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await authApi.resendVerification()
      toast.success("Verification email sent — check your inbox")
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 text-sm">
      <MailWarning size={16} className="text-amber-600 shrink-0" />
      <span className="text-amber-800 flex-1">
        Your email address is not verified.{" "}
        <button
          onClick={handleResend}
          disabled={sending}
          className="font-medium underline underline-offset-2 disabled:opacity-60 hover:text-amber-900"
        >
          {sending ? "Sending…" : "Resend verification email"}
        </button>
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700">
        <X size={15} />
      </button>
    </div>
  )
}
