import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, ChevronRight, Home, User, ChevronDown, Stethoscope, Menu, X, UserCog, BarChart3, Building2, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { branchService } from '../services/branchService';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from '../components/NotificationBell';
import ToastContainer from '../components/ToastContainer';

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

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <BarChart3 size={20} />, label: "Reports", path: "/analytics" },
    { icon: <Building2 size={20} />, label: "Branches", path: "/branches" },
    { icon: <Users size={20} />, label: "Doctors", path: "/doctors" },
    { icon: <Calendar size={20} />, label: "Sessions", path: "/sessions" },
    { icon: <UserCog size={20} />, label: "Staff", path: "/staff" },
    { icon: <MessageSquare size={20} />, label: "WhatsApp", path: "/whatsapp-settings" },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020617', color: 'white', position: 'relative', overflowX: 'hidden' }}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay mobile-only" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{ 
        width: '270px', 
        background: '#020617', 
        borderRight: '1px solid #1e293b', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1000,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }} className="main-sidebar">
        {/* Branding Section */}
        <div style={{ padding: '30px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, var(--accent-color) 0%, #0ea5e9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)'
            }}>
              <Stethoscope size={22} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1 }} className="logo-text">
                Doc<span style={{ color: 'var(--accent-color)' }}>Appointment</span>
              </h1>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-color)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }} className="desktop-only">
                {branch?.name || 'Loading...'}
              </span>
            </div>
          </div>
          <button 
            className="mobile-only" 
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Section */}
        <div style={{ flex: 1, padding: '0 15px' }}>
          <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '15px', paddingLeft: '10px', textTransform: 'uppercase' }}>
            Main Menu
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        marginLeft: '270px', /* Default desktop margin */
        width: 'calc(100% - 270px)',
        transition: 'all 0.3s ease'
      }} className="main-content-layout">
        <header style={{ 
          height: '70px', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 20px', 
          background: 'rgba(15, 23, 42, 0.5)', 
          backdropFilter: 'blur(20px)', 
          position: 'sticky', 
          top: 0, 
          zIndex: 100 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              className="mobile-only" 
              onClick={() => setIsSidebarOpen(true)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu size={20} />
            </button>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '8px 15px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: '50px', 
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }} className="breadcrumb-capsule">
              <div 
                data-tooltip="Return to Dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', cursor: 'pointer', transition: 'all 0.2s', opacity: 0.8 }} 
                onClick={() => navigate('/dashboard')}
                className="breadcrumb-item"
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
                    <ChevronRight size={10} style={{ opacity: 0.3 }} />
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      color: isLast ? 'white' : 'var(--accent-color)', 
                      cursor: isLast ? 'default' : 'pointer',
                      opacity: isLast ? 1 : 0.8,
                    }}>
                      <Icon size={12} />
                      <span>{label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
            <div style={{ textAlign: 'right', display: 'none' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ACCOUNT</p>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
              <NotificationBell />
              
              <div 
                data-tooltip="Account Settings"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px', borderRadius: '15px', transition: 'all 0.2s', background: isProfileOpen ? 'rgba(255,255,255,0.05)' : 'transparent' }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--accent-glow)', border: '1px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1rem' }}>
                  {email?.[0].toUpperCase()}
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }} />
              </div>

              {isProfileOpen && (
                <>
                  <div 
                    onClick={() => setIsProfileOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                  />
                  <div className="glass-card" style={{ 
                    position: 'absolute', top: '100%', right: 0, marginTop: '10px', width: '220px', 
                    padding: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px',
                    animation: 'fadeIn 0.2s ease-out', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '5px' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SIGNED IN AS</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>
                    </div>
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/profile'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '10px 15px', borderRadius: '8px', transition: 'all 0.2s', textAlign: 'left', fontSize: '0.9rem' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)', e.currentTarget.style.color = 'white')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none', e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      <User size={16} /> My Profile
                    </button>
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); navigate('/branches'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '10px 15px', borderRadius: '8px', transition: 'all 0.2s', textAlign: 'left', fontSize: '0.9rem' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)', e.currentTarget.style.color = 'white')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none', e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      <Building2 size={16} /> Manage Branches
                    </button>
                    
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '5px 0' }} />
                    
                    <button 
                      onClick={() => { setIsProfileOpen(false); logout(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '10px 15px', borderRadius: '8px', transition: 'all 0.2s', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <div style={{ flex: 1, padding: '40px', background: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.05), transparent)', overflowY: 'auto' }}>
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
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '12px 16px', 
        borderRadius: '10px', 
        cursor: 'pointer',
        background: active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
        color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
        transition: 'all 0.2s'
      }}>
      {icon}
      <span style={{ fontWeight: 500 }}>{label}</span>
    </div>
);

export default DashboardLayout;
