import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { notify } from '../../../stores/notificationStore';
import { 
  Building2, Mail, Lock as LockIcon, Globe, ArrowRight, CheckCircle2, 
  Stethoscope, ShieldCheck, Zap, Phone
} from 'lucide-react';
import './auth.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    orgName: '',
    orgSlug: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminPhoneNumber: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setErrors(prev => ({ ...prev, [name]: '' }));
    setFormError('');
    
    if (name === 'orgSlug') {
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const { orgName, orgSlug, adminEmail, adminPassword, confirmPassword, adminPhoneNumber } = formData;
    const newErrors: Record<string, string> = {};
    
    if (orgName.trim().length < 3) {
      newErrors.orgName = 'Organization name should be at least 3 characters.';
    }

    if (!orgSlug || orgSlug.length < 3) {
      newErrors.orgSlug = 'Slug must be at least 3 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address.';
    }

    const cleanPhone = adminPhoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      newErrors.adminPhoneNumber = 'Enter a valid 10-15 digit WhatsApp number.';
    }

    if (adminPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Confirm password does not match.';
    }

    const hasUpper = /[A-Z]/.test(adminPassword);
    const hasLower = /[a-z]/.test(adminPassword);
    const hasNumber = /\d/.test(adminPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(adminPassword);

    if (adminPassword.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      newErrors.adminPassword = 'Password must be 8+ chars with Uppercase, Lowercase, Number and Special character.';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      setFormError('Please fix the errors below.');
      notify.danger('Validation Error', 'Check the highlighted fields.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError('');
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authService.registerOrg({
        orgName: formData.orgName,
        orgSlug: formData.orgSlug,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminPhoneNumber: formData.adminPhoneNumber
      });
      
      notify.success('Registration Successful', 'Your organization has been registered.');
      navigate('/login');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Something went wrong. Try a different slug.';
      setFormError(msg);
      notify.danger('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container register-layout">
      {/* Left Side: Branding/Marketing */}
      <div className="login-brand-side register-brand-side">
        <div className="register-bg-glow"></div>
        
        <div className="register-brand-content">
          <div className="register-logo-container">
            <div className="register-logo-icon">
              <Stethoscope size={32} strokeWidth={2.5} />
            </div>
            <h1 className="register-logo-text">CodeX <span className="logo-accent">DocApp</span></h1>
          </div>

          <h2 className="register-hero-title">
            Digitize your hospital in <span className="logo-accent">minutes.</span>
          </h2>
          <p className="register-hero-subtitle">
            The most advanced queue management and analytics platform for modern healthcare providers.
          </p>

          <div className="register-features-list">
            <FeatureItem icon={<Zap size={20} />} text="AI-Powered Queue Estimates" />
            <FeatureItem icon={<ShieldCheck size={20} />} text="End-to-End Secure Data" />
            <FeatureItem icon={<Building2 size={20} />} text="Multi-Branch Management" />
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="login-form-side register-form-side">
        <div className="register-form-container">
          <div className="register-form-header">
            <h3 className="register-form-title">Create Organization</h3>
            <p className="register-form-subtitle">Enter your details to get started with CodeX.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="register-form">
            {formError && (
              <div className="register-error-box">
                {formError}
              </div>
            )}
            <div className="input-group">
              <label data-tooltip="The legal name of your healthcare facility" className="auth-label">
                <Building2 size={16} /> Organization Name
              </label>
              <input 
                name="orgName"
                type="text" 
                placeholder="e.g. LifeCare Hospital" 
                required 
                value={formData.orgName}
                onChange={handleChange}
                className={errors.orgName ? "input-error" : ""}
              />
              {errors.orgName && <p className="auth-error-text">{errors.orgName}</p>}
            </div>

            <div className="input-group">
              <label data-tooltip="A unique identifier for your hospital's portal (e.g. city-hospital)" className="auth-label">
                <Globe size={16} /> Unique URL Slug
              </label>
              <div className="relative-container">
                <input 
                  name="orgSlug"
                  type="text" 
                  placeholder="e.g. lifecare-hospital" 
                  required 
                  value={formData.orgSlug}
                  onChange={handleChange}
                  className={`slug-input ${errors.orgSlug ? 'input-error' : ''}`}
                />
                <span className="register-slug-suffix">
                  .docapp.live
                </span>
              </div>
              {errors.orgSlug && <p className="auth-error-text">{errors.orgSlug}</p>}
              <p className="register-input-hint">Used for your hospital's public booking page.</p>
            </div>

            <div className="register-divider"></div>

            <div className="input-group">
              <label data-tooltip="Primary administrative email address" className="auth-label">
                <Mail size={16} /> Admin Email
              </label>
              <input 
                name="adminEmail"
                type="email" 
                placeholder="admin@yourhospital.com" 
                required 
                value={formData.adminEmail}
                onChange={handleChange}
                className={errors.adminEmail ? "input-error" : ""}
              />
              {errors.adminEmail && <p className="auth-error-text">{errors.adminEmail}</p>}
            </div>

            <div className="input-group">
              <label data-tooltip="WhatsApp number for administrative alerts and resets" className="auth-label">
                <Phone size={16} /> Admin WhatsApp Number
              </label>
              <input 
                name="adminPhoneNumber"
                type="tel" 
                placeholder="+91 98765 43210" 
                required 
                value={formData.adminPhoneNumber}
                onChange={handleChange}
                className={errors.adminPhoneNumber ? "input-error" : ""}
              />
              {errors.adminPhoneNumber && <p className="auth-error-text">{errors.adminPhoneNumber}</p>}
            </div>

            <div className="register-grid-2">
              <div className="input-group">
                <label data-tooltip="Create a strong password (min 8 characters)" className="auth-label">
                  <LockIcon size={16} /> Password
                </label>
                <input 
                  name="adminPassword"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className={errors.adminPassword ? "input-error" : ""}
                />
                {errors.adminPassword && <p className="auth-error-text small-error">{errors.adminPassword}</p>}
              </div>
              <div className="input-group">
                <label data-tooltip="Re-type password for verification" className="auth-label">
                  <CheckCircle2 size={16} /> Confirm
                </label>
                <input 
                  name="confirmPassword"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "input-error" : ""}
                />
                {errors.confirmPassword && <p className="auth-error-text">{errors.confirmPassword}</p>}
              </div>
            </div>

            <button 
              data-tooltip="Launch your digital hospital portal"
              type="submit" 
              className="btn-primary register-submit-btn" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register Organization'} 
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <p className="register-login-link-container">
            Already have an account? <Link to="/login" className="register-login-link">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="register-feature-item">
    <div className="register-feature-icon">{icon}</div>
    <span className="register-feature-text">{text}</span>
  </div>
);

export default RegisterPage;

