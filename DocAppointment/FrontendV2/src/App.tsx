import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import AuthLayout from "./layouts/AuthLayout"
import DashboardLayout from "./layouts/DashboardLayout"
import LoginPage from "./pages/auth/LoginPage"
import RegisterPage from "./pages/auth/RegisterPage"
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage"
import QueueDashboardPage from "./pages/queue/QueueDashboardPage"
import AnalyticsPage from "./pages/analytics/AnalyticsPage"
import ChatbotAnalyticsPage from "./pages/analytics/ChatbotAnalyticsPage"
import DoctorsPage from "./pages/doctors/DoctorsPage"
import PatientsPage from "./pages/patients/PatientsPage"
import ConsultationPage from "./pages/consultation/ConsultationPage"
import DoctorDeskPage from "./pages/consultation/DoctorDeskPage"
import SessionsPage from "./pages/sessions/SessionsPage"
import SettingsPage from "./pages/settings/SettingsPage"
import PharmacyPage from "./pages/pharmacy/PharmacyPage"
import BranchesPage from "./pages/branches/BranchesPage"
import StaffPage from "./pages/staff/StaffPage"
import AuditLogsPage from "./pages/audit-logs/AuditLogsPage"
import TvDisplayPage from "./pages/display/TvDisplayPage"
import PatientTrackingPage from "./pages/display/PatientTrackingPage"
import RolesPermissionsPage from "./pages/settings/RolesPermissionsPage"
import { useAuthStore } from "./store/authStore"

import { usePermissions } from "./hooks/usePermissions"

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

function PermissionRoute({ children, permissions }: { children: React.ReactNode, permissions: string[] }) {
  const { canAny } = usePermissions()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (permissions.length > 0 && !canAny(permissions)) return <Navigate to="/" replace />
  return <>{children}</>
}

function HomeRoute() {
  const role = useAuthStore((state) => state.user?.role?.toLowerCase().replace(/\s/g, '') || "");
  const { canAny } = usePermissions();

  if (role === 'doctor') {
    if (canAny(["DoctorDesk.View"])) return <Navigate to="/doctor-desk" replace />;
    return <Navigate to="/settings" replace />;
  }

  if (canAny(["Queue.View"])) return <Navigate to="/queue" replace />;
  
  return <Navigate to="/settings" replace />;
}

import { useAppHub } from "./hooks/useAppHub"

function App() {
  useAppHub();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
        </Route>

        <Route path="/tv/:branchId" element={<TvDisplayPage />} />
        <Route path="/track/:queueId" element={<PatientTrackingPage />} />

        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/queue" element={<PermissionRoute permissions={["Queue.View"]}><QueueDashboardPage /></PermissionRoute>} />
          <Route path="/doctor-desk" element={<PermissionRoute permissions={["DoctorDesk.View"]}><DoctorDeskPage /></PermissionRoute>} />
          <Route path="/analytics" element={<PermissionRoute permissions={["Analytics.View"]}><AnalyticsPage /></PermissionRoute>} />
          <Route path="/analytics/chatbot" element={<PermissionRoute permissions={["Analytics.View"]}><ChatbotAnalyticsPage /></PermissionRoute>} />
          <Route path="/doctors" element={<PermissionRoute permissions={["Doctors.View"]}><DoctorsPage /></PermissionRoute>} />
          <Route path="/patients" element={<PermissionRoute permissions={["Patients.View"]}><PatientsPage /></PermissionRoute>} />
          <Route path="/consult/:patientId" element={<PermissionRoute permissions={["Patients.ViewHistory"]}><ConsultationPage /></PermissionRoute>} />
          <Route path="/sessions" element={<PermissionRoute permissions={["Sessions.View"]}><SessionsPage /></PermissionRoute>} />
          <Route path="/branches" element={<PermissionRoute permissions={["Branches.View"]}><BranchesPage /></PermissionRoute>} />
          <Route path="/staff" element={<PermissionRoute permissions={["Staff.View"]}><StaffPage /></PermissionRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/roles" element={<PermissionRoute permissions={["Settings.ManageRoles"]}><RolesPermissionsPage /></PermissionRoute>} />
          <Route path="/pharmacy" element={<PermissionRoute permissions={["Pharmacy.View"]}><PharmacyPage /></PermissionRoute>} />
          <Route path="/audit-logs" element={<PermissionRoute permissions={["Settings.View"]}><AuditLogsPage /></PermissionRoute>} />
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
