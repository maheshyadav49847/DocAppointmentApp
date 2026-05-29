import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, ChevronRight, Home, User, ChevronDown, Stethoscope, Menu, X, UserCog, BarChart3, Building2, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { branchService } from '../services/branchService';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from '../components/NotificationBell';
import ToastContainer from '../components/ToastContainer';
import './DashboardLayout.css';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, email, branchId } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchService.getBranch(branchId || ''),
    enabled: !!branchId
  });

  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'OrgAdmin' || role === 'BranchAdmin' || role === 'SuperAdmin';

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard", visible: true },
    { icon: <BarChart3 size={20} />, label: "Reports", path: "/analytics", visible: isAdmin },
    { icon: <Building2 size={20} />, label: "Branches", path: "/branches", visible: role === 'OrgAdmin' || role === 'SuperAdmin' },
    { icon: <Users size={20} />, label: "Doctors", path: "/doctors", visible: isAdmin },
    { icon: <User size={20} />, label: "Patients", path: "/patients", visible: true },
    { icon: <Calendar size={20} />, label: "Sessions", path: "/sessions", visible: isAdmin },
    { icon: <UserCog size={20} />, label: "Staff", path: "/staff", visible: isAdmin },
    { icon: <MessageSquare size={20} />, label: "WhatsApp", path: "/whatsapp-settings", visible: role === 'OrgAdmin' || role === 'SuperAdmin' },
  ].filter(item => item.visible);

  return (
    <div className="dashboard-layout-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay mobile-only" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`main-sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Branding Section */}
        <div className="branding-section">
          <div className="branding-content">
            <div className="branding-icon">
              <Stethoscope size={22} color="white" />
            </div>
            <div>
              <h1 className="logo-text">
                Doc<span className="logo-accent">Appointment</span>
              </h1>
              <span className="branch-name desktop-only">
                {branch?.name || 'Loading...'}
              </span>
            </div>
          </div>
          <button 
            className="mobile-only btn-close-sidebar" 
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="nav-section">
          <p className="nav-heading">Main Menu</p>
          <nav className="nav-list">
            {navItems.map((item) => (
              <NavItem 
                key={item.path}
                icon={item.icon} 
                label={item.label} 
                active={location.pathname === item.path} 
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content-layout">
        <header className="top-header">
          <div className="header-left">
            <button 
              className="mobile-only btn-open-sidebar" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb-capsule">
              <div 
                data-tooltip="Return to Dashboard"
                className="breadcrumb-item active" 
                onClick={() => navigate('/dashboard')}
              >
                <Home size={12} /> <span>Home</span>
              </div>
              {location.pathname.split('/').filter(p => p).map((path, index, arr) => {
                const isLast = index === arr.length - 1;
                let label = path.charAt(0).toUpperCase() + path.slice(1);
                if (path === 'analytics') label = 'Reports';
                
                let Icon = LayoutDashboard;
                if (path === 'doctors') Icon = Users;
                if (path === 'sessions') Icon = Calendar;
                if (path === 'settings') Icon = Settings;
                if (path === 'staff') Icon = UserCog;
                if (path === 'profile') Icon = User;
                if (path === 'analytics') Icon = BarChart3;
                if (path === 'branches') Icon = Building2;

                return (
                  <React.Fragment key={path}>
                    <ChevronRight size={10} className="breadcrumb-separator" />
                    <div className={`breadcrumb-item ${isLast ? 'inactive' : 'active'}`}>
                      <Icon size={12} />
                      <span>{label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div className="header-right">
            <div className="account-info">
              <p className="account-info-label">ACCOUNT</p>
              <p className="account-info-email">{email}</p>
            </div>
            <div className="header-profile-container">
              <NotificationBell />
              
              <div 
                data-tooltip="Account Settings"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`profile-trigger ${isProfileOpen ? 'active' : 'inactive'}`}
              >
                <div className="profile-avatar">
                  {email?.[0].toUpperCase()}
                </div>
                <ChevronDown size={14} className={`profile-chevron ${isProfileOpen ? 'rotated' : ''}`} />
              </div>

              {isProfileOpen && (
                <>
                  <div 
                    onClick={() => setIsProfileOpen(false)}
                    className="profile-overlay"
                  />
                  <div className="glass-card profile-menu">
                    <div className="profile-menu-header">
                      <p className="profile-menu-label">SIGNED IN AS</p>
                      <p className="profile-menu-email">{email}</p>
                    </div>
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/profile'); }}
                      className="profile-menu-btn"
                    >
                      <User size={16} /> My Profile
                    </button>
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/branches'); }}
                      className="profile-menu-btn"
                    >
                      <Building2 size={16} /> Manage Branches
                    </button>
                    
                    <div className="profile-menu-divider" />
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); logout(); }}
                      className="profile-menu-btn danger"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <div className="main-content-area">
          {children}
        </div>
        <ToastContainer />
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <div 
      data-tooltip={label}
      onClick={onClick}
      className={`nav-item ${active ? 'active' : 'inactive'}`}
    >
      {icon}
      <span className="nav-item-label">{label}</span>
    </div>
);

export default DashboardLayout;
