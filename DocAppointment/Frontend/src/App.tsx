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
import { useAuthStore } from './stores/authStore';

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={
          token ? (
            <DashboardLayout>
              <QueueDashboard />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/analytics" element={
          token ? (
            <DashboardLayout>
              <AnalyticsPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/branches" element={
          token ? (
            <DashboardLayout>
              <BranchesPage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/doctors" element={
          token ? (
            <DashboardLayout>
              <DoctorsList />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/sessions" element={
          token ? (
            <DashboardLayout>
              <SessionsList />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/profile" element={
          token ? (
            <DashboardLayout>
              <ProfilePage />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />
        
        <Route path="/staff" element={
          token ? (
            <DashboardLayout>
              <StaffList />
            </DashboardLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
