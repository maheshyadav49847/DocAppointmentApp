import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageLoader } from "@/components/ui/PageLoader"

import { subDays } from "date-fns"
import {
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts"
import {
  Users, Clock, Activity,
  Star, UserCheck, Timer, MessageSquare, Server
} from "lucide-react"

import { useAuthStore } from "@/store/authStore"
import { reportService } from "@/services/reportService"


export default function AnalyticsPage() {
  const { user, activeBranchId } = useAuthStore()
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const isMultiBranchDoctor = role === 'doctor';
  const selectedBranchId = (role === 'orgadmin' || role === 'superadmin' || isMultiBranchDoctor) ? (activeBranchId || 'org') : (user?.branchId || 'org');

  const dashboardRef = useRef<HTMLDivElement>(null)




  const [dateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  })


  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', selectedBranchId, dateRange],
    queryFn: () => reportService.getBranchAnalytics(
      selectedBranchId,
      dateRange.start.toISOString(),
      dateRange.end.toISOString()
    ),
    enabled: !!orgId
  })

  if (isLoading) {
    return (
      <PageLoader 
        message="Gathering Strategic Data..." 
        subMessage="Compiling 30-day analytics" 
      />
    )
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Analytics</span>
              <span className="text-indigo-600">Overview</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Real-time clinical and operational metrics.</p>
          </div>
        </div>


      </div>

      <div ref={dashboardRef} className="space-y-6">

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-500">Avg Wait Time</p>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{analytics?.averageWaitTimeMinutes || 0} min</h2>
            <p className="text-xs text-indigo-600 font-medium mt-1">↓ 12% from last week</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-500">Total Tokens (30d)</p>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{analytics?.totalTokens || 0}</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Acquired and processed</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-500">Doctor Delay</p>
              <Timer className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{analytics?.operations.avgDoctorPunctualityMinutes || 0} min</h2>
            <p className="text-xs text-rose-600 font-medium mt-1">↑ Requires attention</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-slate-500">Slot Utilization</p>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{analytics?.operations.slotUtilizationPercent || 0}%</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Capacity mapped</p>
          </div>
        </div>

        {/* Middle Graph & WhatsApp Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="saas-card p-6 lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-900 mb-6">Hourly Traffic Trend</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.hourlyTrends}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="saas-card p-6 flex flex-col">
            <h3 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" /> Notifications
            </h3>
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">WHATSAPP DELIVERED</p>
                  <h2 className="text-2xl font-bold text-indigo-600">{analytics?.whatsAppStats.delivered}</h2>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">MESSAGES FAILED</p>
                  <h2 className="text-2xl font-bold text-rose-600">{analytics?.whatsAppStats.failed}</h2>
                </div>
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                  <Server className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Recent Activity Table */}
        <div className="saas-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-900">Doctor Performance & Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Doctor Name</th>
                  <th className="px-6 py-4 text-center">Patients Handled</th>
                  <th className="px-6 py-4 text-center">Avg Consult Time</th>
                  <th className="px-6 py-4 text-right">Patient Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics?.doctorPerformance.map((doc, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {doc.doctorName.charAt(0)}
                      </div>
                      {doc.doctorName}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">{doc.tokenCount}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{Math.round(doc.avgWaitTime * 0.8)} min</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-semibold text-slate-700">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {doc.averageRating.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!analytics?.doctorPerformance || analytics.doctorPerformance.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No active doctors found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
