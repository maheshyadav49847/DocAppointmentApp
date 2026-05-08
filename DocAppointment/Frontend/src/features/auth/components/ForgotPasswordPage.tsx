import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { notify } from '../../../stores/notificationStore';
import { Mail, Lock, ShieldCheck, KeyRound, ArrowLeft, Send, CheckCircle2, Timer } from 'lucide-react';

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

  const handleRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Background Decorative Glows */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'var(--accent-glow)', filter: 'blur(100px)', opacity: 0.2 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'rgba(16, 185, 129, 0.3)', filter: 'blur(100px)', opacity: 0.1 }}></div>

      <div className="glass-card" style={{ width: '450px', padding: '40px', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          background: 'var(--accent-glow)', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 8px 20px rgba(56, 189, 248, 0.2)'
        }}>
          {step === 'request' ? <KeyRound size={32} color="var(--accent-color)" /> : <ShieldCheck size={32} color="#34d399" />}
        </div>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '10px', color: 'white', fontWeight: 800 }}>
          {step === 'request' ? 'Forgot Password?' : 'Reset Password'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {step === 'request' 
            ? "Enter your email or phone number. We'll automatically send the OTP to your registered device." 
            : `Enter the 6-digit OTP sent to your ${identifier.includes('@') ? 'email' : 'mobile'}.`}
        </p>

        {step === 'request' ? (
          <form onSubmit={handleRequest} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Mail size={16} /> Email or Phone Number
              </label>
              <input
                type="text"
                required
                className="modern-input"
                placeholder="admin@hospital.com or +91..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white',
                  transition: 'all 0.3s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px',
                fontSize: '1rem',
                fontWeight: 700
              }}
            >
              {loading ? 'Sending OTP...' : <><Send size={18} /> Request OTP</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <ShieldCheck size={16} /> Enter OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                className="modern-input"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white',
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  letterSpacing: '5px',
                  fontWeight: 800
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Lock size={16} /> New Password
              </label>
              <input
                type="password"
                required
                className="modern-input"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
              {countdown > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Timer size={14} className="spin-slow" /> Resend OTP in {countdown}s
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => handleRequest()} 
                  disabled={loading}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--accent-color)', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px'
                  }}
                >
                  Didn't receive code? Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                width: '100%', 
                padding: '14px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px',
                background: 'linear-gradient(to right, #10b981, #059669)',
                border: 'none'
              }}
            >
              {loading ? 'Updating...' : <><CheckCircle2 size={18} /> Reset Password</>}
            </button>
          </form>
        )}

        <div style={{ marginTop: '25px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
          <Link to="/login" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--text-secondary)', 
            textDecoration: 'none', 
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={16} /> Back to Staff Login
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modern-input:focus {
          outline: none;
          border-color: var(--accent-color) !important;
          background: rgba(255,255,255,0.05) !important;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.1);
        }
        .spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default ForgotPasswordPage;
