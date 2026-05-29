import React from 'react';
import { User, Mail, Shield, Building, KeyRound, MapPin } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import PageHeader from '../../../components/UI/PageHeader';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { email, role } = useAuthStore();

  return (
    <div className="profile-container">
      
      <PageHeader 
        title="My" 
        accentTitle="Profile" 
        subtitle="Manage your personal account details and access level."
        icon={<div className="profile-header-icon">{email?.[0]?.toUpperCase()}</div>}
      />

      <div className="glass-card">
        <h3 className="profile-card-title">
          <User size={22} color="var(--accent-color)" /> Account Information
        </h3>
        
        <div className="profile-grid">
          <div className="profile-field-group">
            <span data-tooltip="Primary login email" className="profile-field-label">
              <Mail size={16} /> Email Address
            </span>
            <div className="profile-field-value">
              {email}
            </div>
          </div>

          <div className="profile-field-group">
            <span data-tooltip="Your system permissions" className="profile-field-label">
              <Shield size={16} /> Access Role
            </span>
            <div className="profile-field-value profile-field-value-flex">
              {role === 'SuperAdmin' ? (
                 <span className="profile-role-superadmin">SuperAdmin</span>
              ) : (
                 <span className="profile-role-normal">{role}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h3 className="profile-card-title">
          <Building size={22} color="var(--accent-color)" /> Organization Context
        </h3>
        
        <div className="profile-org-grid">
          <div 
            data-tooltip="System-wide hospital identifier"
            className="profile-org-item">
             <div className="profile-org-item-content">
                <Building size={24} color="var(--text-secondary)" />
                <div>
                  <p className="profile-org-label">INSTITUTION</p>
                  <p className="profile-org-value">Registered Hospital</p>
                </div>
             </div>
          </div>

          <div 
            data-tooltip="Current location identifier"
            className="profile-org-item">
             <div className="profile-org-item-content">
                <MapPin size={24} color="var(--text-secondary)" />
                <div>
                  <p className="profile-org-label">LOCATION</p>
                  <p className="profile-org-value">Active Branch</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="glass-card profile-security-card">
        <div className="profile-security-content">
          <div className="profile-security-icon-box">
            <KeyRound size={24} color="var(--text-secondary)" />
          </div>
          <div>
            <h4 className="profile-security-title">Password Management</h4>
            <p className="profile-security-desc">To change your password, please contact your organization administrator or use the forgot password flow.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProfilePage;
