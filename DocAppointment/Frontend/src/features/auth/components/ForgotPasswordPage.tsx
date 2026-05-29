import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { notify } from '../../../stores/notificationStore';
import { Mail, Lock, ShieldCheck, KeyRound, ArrowLeft, Send, CheckCircle2, Timer } from 'lucide-react';
import './auth.css';

const ForgotPasswordPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // Handle Countdown Timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateRequest = () => {
    const newErrors: Record<string, string> = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Email or Phone is required';
    } else {
      const isEmail = identifier.includes('@');
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        newErrors.identifier = 'Invalid email format';
      } else if (!isEmail) {
        const cleanPhone = identifier.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
          newErrors.identifier = 'Enter a valid 10-15 digit phone number';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateReset = () => {
    const newErrors: Record<string, string> = {};
    if (otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits';
    }
    
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    
    if (newPassword.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      newErrors.newPassword = 'Password must be 8+ chars with Uppercase, Lowercase, Number and Special character.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    if (!validateRequest()) return;
    if (countdown > 0 && step === 'reset') return; // Prevent spamming resend

    setLoading(true);
    
    // Auto-detect method
    const isEmail = identifier.includes('@');
    const method = isEmail ? 'Email' : 'Phone';

    try {
      await authService.forgotPassword(identifier, method);
      const deliveryMsg = isEmail 
        ? 'OTP sent to your email.' 
        : 'OTP sent to your WhatsApp and SMS.';
      
      notify.success(step === 'reset' ? 'OTP Resent' : 'OTP Sent', deliveryMsg);
      setStep('reset');
      setCountdown(60); // Start 60s countdown for resend
    } catch (err: any) {
      notify.danger('Error', err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateReset()) return;

    setLoading(true);
    try {
      await authService.resetPassword(identifier, otp, newPassword);
      notify.success('Success', 'Password has been reset successfully. You can now login.');
      navigate('/login');
    } catch (err: any) {
      notify.danger('Reset Failed', err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container relative-container">
      {/* Background Decorative Glows */}
      <div className="auth-bg-glow-1"></div>
      <div className="auth-bg-glow-2"></div>

      <div className="glass-card forgot-password-card">
        <div className="forgot-password-icon-box">
          {step === 'request' ? <KeyRound size={32} color="var(--accent-color)" /> : <ShieldCheck size={32} color="#34d399" />}
        </div>

        <h1 className="forgot-password-title">
          {step === 'request' ? 'Forgot Password?' : 'Reset Password'}
        </h1>
        <p className="forgot-password-subtitle">
          {step === 'request' 
            ? "Enter your email or phone number. We'll automatically send the OTP to your registered device." 
            : `Enter the 6-digit OTP sent to your ${identifier.includes('@') ? 'email' : 'mobile'}.`}
        </p>

        {step === 'request' ? (
          <form onSubmit={handleRequest} noValidate className="forgot-password-form">
            <div className="forgot-password-form-group">
              <label className="forgot-password-label">
                <Mail size={16} /> Email or Phone Number
              </label>
              <input
                type="text"
                required
                placeholder="admin@hospital.com or +91..."
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setErrors(prev => ({ ...prev, identifier: '' })); }}
                className={`modern-input forgot-password-input ${errors.identifier ? 'input-error' : ''}`}
              />
              {errors.identifier && <p className="auth-error-text mt-8">{errors.identifier}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary forgot-password-submit-btn"
            >
              {loading ? 'Sending OTP...' : <><Send size={18} /> Request OTP</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} noValidate className="forgot-password-form">
            <div className="forgot-password-form-group-sm">
              <label className="forgot-password-label">
                <ShieldCheck size={16} /> Enter OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                className={`modern-input forgot-password-input forgot-password-otp-input ${errors.otp ? 'input-error' : ''}`}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setErrors(prev => ({ ...prev, otp: '' })); }}
              />
              {errors.otp && <p className="auth-error-text mt-8 text-center">{errors.otp}</p>}
            </div>

            <div className="forgot-password-form-group-sm">
              <label className="forgot-password-label">
                <Lock size={16} /> New Password
              </label>
              <input
                type="password"
                required
                className={`modern-input forgot-password-input ${errors.newPassword ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: '' })); }}
              />
              {errors.newPassword && <p className="auth-error-text mt-8">{errors.newPassword}</p>}
            </div>

            <div className="forgot-password-resend-container">
              {countdown > 0 ? (
                <div className="forgot-password-timer">
                  <Timer size={14} className="spin-slow" /> Resend OTP in {countdown}s
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => handleRequest()} 
                  disabled={loading}
                  className="forgot-password-resend-btn"
                >
                  Didn't receive code? Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary forgot-password-submit-btn forgot-password-reset-btn"
            >
              {loading ? 'Updating...' : <><CheckCircle2 size={18} /> Reset Password</>}
            </button>
          </form>
        )}

        <div className="forgot-password-footer">
          <Link to="/login" className="forgot-password-back-link">
            <ArrowLeft size={16} /> Back to Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

