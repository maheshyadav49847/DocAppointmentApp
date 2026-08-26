import { useAuthStore } from "@/store/authStore"
import { usePermissions } from "@/hooks/usePermissions"
import { Shield, User, Activity } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { can } = usePermissions()

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Organization</span>
              <span className="text-indigo-600">Settings</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage personal profile.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can('Settings.ManageWhatsapp') && (
            <a 
              href={`${import.meta.env.VITE_API_URL || "/api/v1.0"}/system/logs/download`} 
              target="_blank" 
              rel="noreferrer"
              className="btn-secondary flex items-center gap-2"
            >
              <Activity className="w-4 h-4" /> Download Logs
            </a>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-6 max-w-2xl space-y-6">
        <div className="saas-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" /> Account Information
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Email Address</p>
                <p className="text-lg font-medium text-slate-900">{user?.email}</p>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
              <Shield className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Security Info</p>
                <p className="text-sm text-amber-700/80 mt-1">
                  For security reasons, passwords can only be changed via the "Forgot Password" flow on the login screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
