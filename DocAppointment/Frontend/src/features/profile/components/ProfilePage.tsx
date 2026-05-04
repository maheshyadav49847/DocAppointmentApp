import React from 'react';
import { User, Mail, Shield, Building, KeyRound, MapPin } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';

const ProfilePage: React.FC = () => {
  const { email, role, orgId, branchId } = useAuthStore();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '20px', 
          background: 'var(--accent-glow)', border: '2px solid var(--accent-color)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: 'var(--accent-color)', fontSize: '2.5rem', fontWeight: 900 
        }}>
          {email?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            background: 'linear-gradient(to right, #fff, var(--accent-color))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            My Profile
          </h1>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage your personal account details and access level.</p>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
          <User size={22} color="var(--accent-color)" /> Account Information
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span data-tooltip="Primary login email" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={16} /> Email Address
            </span>
            <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '1rem', fontWeight: 500 }}>
              {email}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span data-tooltip="Your system permissions" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> Access Role
            </span>
            <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {role === 'SuperAdmin' ? (
                 <span style={{ color: 'var(--danger)', fontWeight: 800, background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '5px' }}>SuperAdmin</span>
              ) : (
                 <span style={{ color: 'var(--accent-color)', fontWeight: 800, background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '5px' }}>{role}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
          <Building size={22} color="var(--accent-color)" /> Organization Context
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div 
            data-tooltip="System-wide hospital identifier"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Building size={24} color="var(--text-secondary)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ORGANIZATION ID</p>
                  <p style={{ margin: '3px 0 0 0', fontFamily: 'monospace', fontSize: '1.05rem' }}>{orgId || 'N/A'}</p>
                </div>
             </div>
          </div>

          <div 
            data-tooltip="Current location identifier"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <MapPin size={24} color="var(--text-secondary)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>BRANCH ID</p>
                  <p style={{ margin: '3px 0 0 0', fontFamily: 'monospace', fontSize: '1.05rem' }}>{branchId || 'N/A'}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ borderLeft: '4px solid var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
            <KeyRound size={24} color="var(--text-secondary)" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Password Management</h4>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>To change your password, please contact your organization administrator or use the forgot password flow.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProfilePage;
