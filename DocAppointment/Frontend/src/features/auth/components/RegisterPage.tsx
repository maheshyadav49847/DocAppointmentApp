import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { notify } from '../../../stores/notificationStore';
import { 
  Building2, Mail, Lock as LockIcon, Globe, ArrowRight, CheckCircle2, 
  Stethoscope, ShieldCheck, Zap, Phone
} from 'lucide-react';

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
    <div className="login-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Left Side: Branding/Marketing */}
      <div className="login-brand-side" style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'var(--accent-glow)', filter: 'blur(150px)', opacity: 0.2 }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
            <div style={{ background: 'var(--accent-color)', padding: '12px', borderRadius: '15px', color: 'black' }}>
              <Stethoscope size={32} strokeWidth={2.5} />
            </div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>CodeX <span style={{ color: 'var(--accent-color)' }}>DocApp</span></h1>
          </div>

          <h2 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '25px' }}>
            Digitize your hospital in <span style={{ color: 'var(--accent-color)' }}>minutes.</span>
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: 1.6, marginBottom: '40px' }}>
            The most advanced queue management and analytics platform for modern healthcare providers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FeatureItem icon={<Zap size={20} />} text="AI-Powered Queue Estimates" />
            <FeatureItem icon={<ShieldCheck size={20} />} text="End-to-End Secure Data" />
            <FeatureItem icon={<Building2 size={20} />} text="Multi-Branch Management" />
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="login-form-side" style={{ 
        width: '100%', 
        maxWidth: '600px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '60px',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(10px)',
        borderLeft: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 10px' }}>Create Organization</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Enter your details to get started with CodeX.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {formError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--danger)', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '0.9rem',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                textAlign: 'center'
              }}>
                {formError}
              </div>
            )}
            <div className="input-group">
              <label data-tooltip="The legal name of your healthcare facility" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Building2 size={16} /> Organization Name
              </label>
              <input 
                name="orgName"
                type="text" 
                placeholder="e.g. LifeCare Hospital" 
                required 
                value={formData.orgName}
                onChange={handleChange}
                style={{ borderColor: errors.orgName ? 'var(--danger)' : undefined }}
              />
              {errors.orgName && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px' }}>{errors.orgName}</p>}
            </div>

            <div className="input-group">
              <label data-tooltip="A unique identifier for your hospital's portal (e.g. city-hospital)" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Globe size={16} /> Unique URL Slug
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  name="orgSlug"
                  type="text" 
                  placeholder="e.g. lifecare-hospital" 
                  required 
                  value={formData.orgSlug}
                  onChange={handleChange}
                  style={{ paddingRight: '120px', borderColor: errors.orgSlug ? 'var(--danger)' : undefined }}
                />
                <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                  .docapp.live
                </span>
              </div>
              {errors.orgSlug && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px' }}>{errors.orgSlug}</p>}
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Used for your hospital's public booking page.</p>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 0' }}></div>

            <div className="input-group">
              <label data-tooltip="Primary administrative email address" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Mail size={16} /> Admin Email
              </label>
              <input 
                name="adminEmail"
                type="email" 
                placeholder="admin@yourhospital.com" 
                required 
                value={formData.adminEmail}
                onChange={handleChange}
                style={{ borderColor: errors.adminEmail ? 'var(--danger)' : undefined }}
              />
              {errors.adminEmail && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px' }}>{errors.adminEmail}</p>}
            </div>

            <div className="input-group">
              <label data-tooltip="WhatsApp number for administrative alerts and resets" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Phone size={16} /> Admin WhatsApp Number
              </label>
              <input 
                name="adminPhoneNumber"
                type="tel" 
                placeholder="+91 98765 43210" 
                required 
                value={formData.adminPhoneNumber}
                onChange={handleChange}
                style={{ borderColor: errors.adminPhoneNumber ? 'var(--danger)' : undefined }}
              />
              {errors.adminPhoneNumber && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px' }}>{errors.adminPhoneNumber}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="input-group">
                <label data-tooltip="Create a strong password (min 8 characters)" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <LockIcon size={16} /> Password
                </label>
                <input 
                  name="adminPassword"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={formData.adminPassword}
                  onChange={handleChange}
                  style={{ borderColor: errors.adminPassword ? 'var(--danger)' : undefined }}
                />
                {errors.adminPassword && <p style={{ color: 'var(--danger)', fontSize: '0.65rem', marginTop: '5px', lineHeight: '1.2' }}>{errors.adminPassword}</p>}
              </div>
              <div className="input-group">
                <label data-tooltip="Re-type password for verification" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} /> Confirm
                </label>
                <input 
                  name="confirmPassword"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{ borderColor: errors.confirmPassword ? 'var(--danger)' : undefined }}
                />
                {errors.confirmPassword && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px' }}>{errors.confirmPassword}</p>}
              </div>
            </div>

            <button 
              data-tooltip="Launch your digital hospital portal"
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ 
                marginTop: '10px', 
                height: '55px', 
                fontSize: '1.1rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {loading ? 'Creating Account...' : 'Register Organization'} 
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 700, textDecoration: 'none' }}>Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
    <div style={{ color: 'var(--accent-color)', display: 'flex' }}>{icon}</div>
    <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{text}</span>
  </div>
);

export default RegisterPage;
