import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import QueueDashboard from './features/queue/components/QueueDashboard';
import DoctorsList from './features/doctors/components/DoctorsList';
import SessionsList from './features/sessions/components/SessionsList';
import ProfilePage from './features/profile/components/ProfilePage';
import StaffList from './features/staff/components/StaffList';
import AnalyticsPage from './features/analytics/components/AnalyticsPage';
import BranchesPage from './features/settings/components/BranchesPage';
import LoginPage from './features/auth/components/LoginPage';
import RegisterPage from './features/auth/components/RegisterPage';
import ForgotPasswordPage from './features/auth/components/ForgotPasswordPage';
import WhatsAppSettings from './features/whatsapp/components/WhatsAppSettings';
import { useAuthStore } from './stores/authStore';

function App() {
  const email = useAuthStore((state) => state.email);
  const logout = useAuthStore((state) => state.logout);

  // Inactivity Logout (15 minutes)
  useEffect(() => {
    if (!email) return;

    let timeout: any;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        alert('You have been logged out due to inactivity.');
      }, 15 * 60 * 1000); // 15 mins
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      clearTimeout(timeout);
    };
  }, [email, logout]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!email ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!email ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!email ? <ForgotPasswordPage /> : <Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={
          email ? (
            <DashboardLayout>
              <QueueDashboard />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/analytics" element={
          email ? (
            <DashboardLayout>
              <AnalyticsPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/branches" element={
          email ? (
            <DashboardLayout>
              <BranchesPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/doctors" element={
          email ? (
            <DashboardLayout>
              <DoctorsList />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/sessions" element={
          email ? (
            <DashboardLayout>
              <SessionsList />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/profile" element={
          email ? (
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />
        
        <Route path="/staff" element={
          email ? (
            <DashboardLayout>
              <StaffList />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/whatsapp-settings" element={
          email ? (
            <DashboardLayout>
              <WhatsAppSettings />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/" element={<Navigate to={email ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
