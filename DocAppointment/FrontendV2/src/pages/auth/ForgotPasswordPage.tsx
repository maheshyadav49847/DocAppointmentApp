import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/services/authService"
import { 
  Mail, Lock, ShieldCheck, 
  ArrowLeft, Send, CheckCircle2, Timer, AlertCircle 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
      <div className="mb-8 flex flex-col items-start">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          {step === 'request' ? <>Forgot <span className="text-indigo-600">Password?</span></> : <>Reset <span className="text-indigo-600">Password</span></>}
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          {step === 'request' 
            ? "Enter your email or phone number. We'll send an OTP to your device." 
            : `Enter the 6-digit OTP sent to your ${identifier.includes('@') ? 'email' : 'mobile'}.`}
        </p>
      </div>

      {apiError && (
        <div className="bg-red-50/50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 mb-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {apiError}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-indigo-600" />
              Email or Phone Number
            </Label>
            <Input
              type="text"
              required
              placeholder="admin@example.com or +91..."
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setErrors(prev => ({ ...prev, identifier: '' })) }}
              className={`bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300 ${
                errors.identifier ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {errors.identifier && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.identifier}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            variant="outline"
            className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl h-12 text-base mt-4 font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-indigo-600/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending OTP...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Request OTP <Send className="w-5 h-5" />
              </span>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Enter OTP
            </Label>
            <Input
              type="text"
              required
              maxLength={6}
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => { setOtp(e.target.value); setErrors(prev => ({ ...prev, otp: '' })) }}
              className={`bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300 text-center tracking-[0.5em] text-lg font-bold ${
                errors.otp ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {errors.otp && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center justify-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.otp}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-700 font-semibold text-sm flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-600" />
              New Password
            </Label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: '' })) }}
              className={`bg-slate-50/50 border-slate-200 text-slate-900 h-12 px-4 rounded-xl placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 focus-visible:bg-white transition-all hover:border-slate-300 ${
                errors.newPassword ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
                 {errors.newPassword}
              </p>
            )}
          </div>

          <div className="flex justify-center my-2">
            {countdown > 0 ? (
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Timer className="w-4 h-4" /> Resend OTP in {countdown}s
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => handleRequest()} 
                disabled={loading}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Didn't receive code? Resend OTP
              </button>
            )}
          </div>

          <Button 
            type="submit" 
            variant="outline"
            className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl h-12 text-base mt-4 font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-indigo-600/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Reset Password <CheckCircle2 className="w-5 h-5" />
              </span>
            )}
          </Button>
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
