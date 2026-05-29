import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { authService } from '../../../services/authService';
import { LogIn, ShieldCheck, Mail, Lock } from 'lucide-react';
import './auth.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{email?: string, password?: string}>({});

  const validate = () => {
    const errors: {email?: string, password?: string} = {};
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!validate()) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });
      setAuth(response); // response should contain token, email, role, orgId, branchId
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Background Decorative Glows */}
      <div className="auth-bg-glow-1"></div>
      <div className="auth-bg-glow-2"></div>

      <div className="glass-card auth-card">
        <div className="auth-icon-box">
          <ShieldCheck size={32} color="var(--accent-color)" />
        </div>

        <h1 className="auth-title">Staff Login</h1>
        <p className="auth-subtitle">Enter your credentials to access the dashboard.</p>

        {error && (
          <div className="auth-error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-form-group">
            <label data-tooltip="Enter your registered hospital email" className="auth-label">
              <Mail size={16} /> Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
              placeholder="admin@hospital.com"
              required 
              className={fieldErrors.email ? "input-error" : ""}
            />
            {fieldErrors.email && <p className="auth-error-text">{fieldErrors.email}</p>}
          </div>

          <div className="auth-form-group-last">
            <label data-tooltip="Your secure account password" className="auth-label">
              <Lock size={16} /> Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
              placeholder="••••••••"
              required 
              className={fieldErrors.password ? "input-error" : ""}
            />
            {fieldErrors.password && <p className="auth-error-text">{fieldErrors.password}</p>}
            <div className="auth-forgot-password">
              <Link to="/forgot-password" className="auth-forgot-password-link">Forgot password?</Link>
            </div>
          </div>

          <button 
            data-tooltip="Access your hospital administrative portal"
            type="submit" 
            disabled={loading}
            className="btn-primary auth-submit-btn" 
          >
            {loading ? 'Authenticating...' : <><LogIn size={20} /> Sign In</>}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/register" className="auth-footer-link">Sign up your hospital</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

