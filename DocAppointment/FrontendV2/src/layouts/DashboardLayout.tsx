import { useState, useRef, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, Users, Stethoscope, Pill, Clock, Settings, Menu, LogOut, Bell, Search, Activity, X, Building2, UserCog, ClipboardList, Key } from "lucide-react"
import toast from "react-hot-toast"

import { BrandLogo } from "@/components/BrandLogo"
import { useAuthStore } from "@/store/authStore"
import { authService } from "@/services/authService"
import { cn } from "@/lib/utils"
import { useNotificationStore } from "@/store/notificationStore"
import { initializeSignalR, stopSignalR } from "@/lib/signalr"

const navigation = [
  { name: "Queue (Live)", href: "/", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { name: "Branches", href: "/branches", icon: Building2 },
  { name: "Doctors", href: "/doctors", icon: Stethoscope },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Sessions", href: "/sessions", icon: Clock },
  { name: "Staff", href: "/staff", icon: UserCog },
  { name: "Pharmacy", href: "/pharmacy", icon: Pill },
  { name: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const { user, token, activeBranchId, clearAuth } = useAuthStore()
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const branchId = activeBranchId || user?.branchId;
    if (token && branchId) {
      fetchNotifications(branchId);
      initializeSignalR(token, branchId);
    }
    return () => {
      stopSignalR();
    }
  }, [token, activeBranchId, user?.branchId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
          <BrandLogo theme="light" size="sm" showSubtitle={false} />
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
            // Hide administrative menus from Doctors
            if (user?.role === "Doctor" && !["Queue (Live)", "Analytics", "Patients", "Pharmacy"].includes(item.name)) {
              return null;
            }

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
                {item.name === "Queue (Live)" && user?.role === "Doctor" ? "My Desk" : item.name}

                {item.name === "Queue (Live)" && user?.role !== "Doctor" && (
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
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                )}
              </button>

              {/* Dropdown */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { const bId = activeBranchId || user?.branchId; if (bId) markAllAsRead(bId); }} className="text-xs text-indigo-600 font-medium hover:text-indigo-700">Mark all read</button>
                      <button onClick={clearAll} className="text-xs text-slate-400 font-medium hover:text-slate-600">Clear</button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={cn("px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3", !n.isRead ? "bg-indigo-50/30" : "")}
                        >
                          <div className={cn("w-2 h-2 mt-1.5 rounded-full shrink-0", !n.isRead ? "bg-indigo-500" : "bg-transparent")} />
                          <div>
                            <p className={cn("text-sm", !n.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block w-px h-5 bg-slate-200" />

            {/* Profile Section */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                  <p className="text-[11px] text-slate-500 capitalize leading-tight">{user?.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-semibold text-indigo-700 text-sm border border-indigo-200 shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); setChangePasswordOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                  >
                    <Key className="w-4 h-4" /> Change Password
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {changePasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-500" />
                    Change Password
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">Update your account password securely.</p>
                </div>
                <button onClick={() => setChangePasswordOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const oldPassword = formData.get('oldPassword') as string
                const newPassword = formData.get('newPassword') as string
                const confirmNewPassword = formData.get('confirmNewPassword') as string

                if (newPassword !== confirmNewPassword) {
                  toast.error("New passwords do not match")
                  return
                }

                try {
                  setIsChangingPassword(true)
                  await authService.changePassword({ oldPassword, newPassword, confirmNewPassword })
                  toast.success("Password changed successfully")
                  setChangePasswordOpen(false)
                } catch (error: any) {
                  const errorMsg = error.response?.data?.errors?.OldPassword?.[0] || error.response?.data?.message || "Failed to change password"
                  toast.error(errorMsg)
                } finally {
                  setIsChangingPassword(false)
                }
              }}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Old Password</label>
                    <input
                      type="password"
                      name="oldPassword"
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmNewPassword"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 border-t flex justify-end gap-3">
                  <button type="button" onClick={() => setChangePasswordOpen(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={isChangingPassword} className="btn-primary text-sm">
                    {isChangingPassword ? 'Saving...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
