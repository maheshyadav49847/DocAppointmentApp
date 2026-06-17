import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import AuthLayout from "./layouts/AuthLayout"
import DashboardLayout from "./layouts/DashboardLayout"
import LoginPage from "./pages/auth/LoginPage"
import RegisterPage from "./pages/auth/RegisterPage"
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage"
import QueueDashboardPage from "./pages/queue/QueueDashboardPage"
import AnalyticsPage from "./pages/analytics/AnalyticsPage"
import DoctorsPage from "./pages/doctors/DoctorsPage"
import PatientsPage from "./pages/patients/PatientsPage"
import ConsultationPage from "./pages/consultation/ConsultationPage"
import SessionsPage from "./pages/sessions/SessionsPage"
import SettingsPage from "./pages/settings/SettingsPage"
import PharmacyPage from "./pages/pharmacy/PharmacyPage"
import BranchesPage from "./pages/branches/BranchesPage"
import StaffPage from "./pages/staff/StaffPage"
import AuditLogsPage from "./pages/audit-logs/AuditLogsPage"
import { useAuthStore } from "./store/authStore"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  if (user?.role === "Doctor") return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
        </Route>

        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<QueueDashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/doctors" element={<AdminOnlyRoute><DoctorsPage /></AdminOnlyRoute>} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/consult/:patientId" element={<ConsultationPage />} />
          <Route path="/sessions" element={<AdminOnlyRoute><SessionsPage /></AdminOnlyRoute>} />
          <Route path="/branches" element={<AdminOnlyRoute><BranchesPage /></AdminOnlyRoute>} />
          <Route path="/staff" element={<AdminOnlyRoute><StaffPage /></AdminOnlyRoute>} />
          <Route path="/settings" element={<AdminOnlyRoute><SettingsPage /></AdminOnlyRoute>} />
          <Route path="/pharmacy" element={<PharmacyPage />} />
          <Route path="/audit-logs" element={<AdminOnlyRoute><AuditLogsPage /></AdminOnlyRoute>} />
          {/* We will add other routes here in later phases */}
        </Route>

        {/* Default route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}

export default App
