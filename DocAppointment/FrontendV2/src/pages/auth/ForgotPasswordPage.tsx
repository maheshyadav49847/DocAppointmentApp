import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/services/authService"
import { 
  Mail, Lock, ShieldCheck, KeyRound, 
  ArrowLeft, Send, CheckCircle2, Timer, AlertCircle 
} from "lucide-react"

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("")
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  // Handle Countdown Timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateRequest = () => {
    const newErrors: Record<string, string> = {}
    if (!identifier.trim()) {
      newErrors.identifier = 'Email or Phone is required'
    } else {
      const isEmail = identifier.includes('@')
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        newErrors.identifier = 'Invalid email format'
      } else if (!isEmail) {
        const cleanPhone = identifier.replace(/\D/g, '')
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          newErrors.identifier = 'Enter a valid 10-15 digit phone number'
        }
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateReset = () => {
    const newErrors: Record<string, string> = {}
    if (otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits'
    }
    
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNumber = /\d/.test(newPassword)
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
    
    if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      newErrors.newPassword = 'Password must be 8+ chars with Uppercase, Lowercase, Number and Special character.'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrors({})
    setApiError(null)
    if (!validateRequest()) return
    if (countdown > 0 && step === 'reset') return

    setLoading(true)
    
    const isEmail = identifier.includes('@')
    const method = isEmail ? 'Email' : 'Phone'

    try {
      await authService.forgotPassword(identifier, method)
      setStep('reset')
      setCountdown(60) // Start 60s countdown for resend
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to request password reset')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setApiError(null)
    if (!validateReset()) return

    setLoading(true)
    try {
      await authService.resetPassword(identifier, otp, newPassword)
      navigate('/login', { state: { message: 'Password has been reset successfully. You can now login.' } })
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          {step === 'request' ? <KeyRound className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {step === 'request' ? 'Forgot Password?' : 'Reset Password'}
        </h1>
        <p className="text-slate-500 max-w-sm mx-auto">
          {step === 'request' 
            ? "Enter your email or phone number. We'll automatically send the OTP to your registered device." 
            : `Enter the 6-digit OTP sent to your ${identifier.includes('@') ? 'email' : 'mobile'}.`}
        </p>
      </div>

      {apiError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{apiError}</p>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" /> Email or Phone Number
            </label>
            <input
              type="text"
              required
              placeholder="admin@hospital.com or +91..."
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setErrors(prev => ({ ...prev, identifier: '' })) }}
              className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 outline-none transition-all ${
                errors.identifier 
                  ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500' 
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {errors.identifier && <p className="text-sm text-rose-600 mt-2">{errors.identifier}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-3 text-base"
          >
            {loading ? 'Sending OTP...' : <><Send className="w-5 h-5" /> Request OTP</>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Enter OTP
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => { setOtp(e.target.value); setErrors(prev => ({ ...prev, otp: '' })) }}
              className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 outline-none transition-all text-center tracking-[0.5em] text-lg font-bold ${
                errors.otp 
                  ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500' 
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {errors.otp && <p className="text-sm text-rose-600 mt-2 text-center">{errors.otp}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" /> New Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: '' })) }}
              className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 outline-none transition-all ${
                errors.newPassword 
                  ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500' 
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {errors.newPassword && <p className="text-sm text-rose-600 mt-2">{errors.newPassword}</p>}
          </div>

          <div className="flex justify-center">
            {countdown > 0 ? (
              <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Timer className="w-4 h-4" /> Resend OTP in {countdown}s
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => handleRequest()} 
                disabled={loading}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Didn't receive code? Resend OTP
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-3 text-base"
          >
            {loading ? 'Updating...' : <><CheckCircle2 className="w-5 h-5" /> Reset Password</>}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Staff Login
        </Link>
      </div>
    </div>
  )
}
