import { useState } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  Pill, 
  Clock, 
  Settings, 
  Menu, 
  LogOut,
  Bell,
  Search,
  MessageSquare,
  Activity,
  X,
  Building2,
  UserCog
} from "lucide-react"

import { useAuthStore } from "@/store/authStore"
import { authService } from "@/services/authService"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Queue (Live)", href: "/", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { name: "Branches", href: "/branches", icon: Building2 },
  { name: "Doctors", href: "/doctors", icon: Stethoscope },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Sessions", href: "/sessions", icon: Clock },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Pharmacy", href: "/pharmacy", icon: Pill },
  { name: "Settings", href: "/settings", icon: Settings },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch (e) {
      console.error("Logout failed", e)
    } finally {
      clearAuth()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
        />
      )}

      {/* Minimalist Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span className="text-base font-semibold tracking-tight text-slate-900">CodeX Health</span>
          </div>
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute right-4 md:hidden p-1 text-slate-500 hover:bg-slate-100 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 border-l-[4px] border-indigo-600" 
                    : "text-slate-500 hover:bg-indigo-50/80 hover:text-indigo-700 border-l-[4px] border-transparent"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-indigo-400")} />
                {item.name}
                
                {item.name === "Queue (Live)" && (
                  <span className="ml-auto bg-rose-100 text-rose-600 py-0.5 px-2 rounded-sm text-[10px] font-bold uppercase tracking-wider">
                    Live
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden md:ml-64">
        
        {/* Minimalist Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
            >
              <Menu className="w-4 h-4" />
            </button>
            
            {/* Search Bar */}
            <div className="hidden md:flex relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-300 focus:ring-0 rounded-md text-sm font-medium transition-all outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Header Right Content (Profile & Actions) */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button className="relative p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
            </button>

            {/* Vertical Divider */}
            <div className="hidden sm:block w-px h-5 bg-slate-200" />

            {/* Profile Section */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                <p className="text-[11px] text-slate-500 capitalize leading-tight">{user?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-semibold text-indigo-700 text-sm border border-indigo-200 shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button 
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors sm:ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
