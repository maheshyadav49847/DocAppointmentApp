import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Users, CheckCircle2, Clock, AlertCircle, Search, Stethoscope, Play, Settings, Activity, Building2, LayoutDashboard } from "lucide-react"
import { branchService } from "@/services/branchService"
import { doctorService } from "@/services/doctorService"
import { queueService } from "@/services/queueService"
import { sessionService } from "@/services/sessionService"
import { useAuthStore } from "@/store/authStore"
import { motion, AnimatePresence } from "framer-motion"

export default function QueueOverview({ selectedBranchId, setSelectedBranchId, onManage }: any) {
  const { user } = useAuthStore()
  const orgId = user?.orgId
  const [searchQuery, setSearchQuery] = useState("")
  const [processingSessions, setProcessingSessions] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId!),
    enabled: !!orgId
  })

  const { data: doctors, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctors', selectedBranchId],
    queryFn: () => doctorService.getBranchDoctors(selectedBranchId),
    enabled: !!selectedBranchId && selectedBranchId !== 'org'
  })

  const { data: stats } = useQuery({
    queryKey: ['queueStats', selectedBranchId],
    queryFn: () => queueService.getStats(selectedBranchId),
    enabled: !!selectedBranchId && selectedBranchId !== 'org',
    refetchInterval: 30000
  })

  const handleStartSession = async (doctor: any, session: any) => {
    const sessionKey = `${doctor.id}_${session.id}`
    setProcessingSessions(prev => new Set(prev).add(sessionKey))
    try {
      const response = await queueService.initializeQueue(doctor.id, session.id)
      const queueId = response?.id || response?.queueId || (typeof response === 'string' ? response : null)
      if (queueId) {
        const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}')
        startedSessions[sessionKey] = queueId
        sessionStorage.setItem('started_sessions', JSON.stringify(startedSessions))

        onManage(doctor, session, queueId)
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['queueStats'] }), 500)
      }
    } catch (err) {
      console.error("Failed to start session:", err)
      alert("Failed to start session. Please try again.")
    } finally {
      setProcessingSessions(prev => {
        const next = new Set(prev)
        next.delete(sessionKey)
        return next
      })
    }
  }

  const filteredDoctors = doctors?.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.specialization && d.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  const statCards = [
    { label: "Total Patients", value: stats?.totalPatientsToday || 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-100", border: "border-indigo-200" },
    { label: "Completed", value: stats?.completedPatients || 0, icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-100", border: "border-indigo-200" },
    { label: "Skipped", value: stats?.skippedPatients || 0, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-100", border: "border-rose-200" },
    { label: "Avg Wait Time", value: `${stats?.avgWaitTimeMinutes || 0}m`, icon: Clock, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Queue</span>
              <span className="text-indigo-600">Dashboard</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Monitor and manage doctor sessions in real-time.</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-1.5 sm:items-end">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full pr-1 flex items-center justify-end gap-1"><Building2 className="w-3 h-3 text-indigo-400" /> Branch Location</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all hover:border-indigo-300"
          >
            <option value="org" disabled>Select Facility</option>
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedBranchId === 'org' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200/60 border-dashed rounded-3xl shadow-sm"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-500 shadow-inner">
            <Activity className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Facility Selected</h2>
          <p className="text-slate-500 text-center max-w-sm">Please select a hospital branch from the dropdown above to view live statistics and active doctor sessions.</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center border ${stat.border}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                </div>
                <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full ${stat.bg} blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500`}></div>
              </motion.div>
            ))}
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Doctor Sessions</h3>
                  <p className="text-sm text-slate-500 font-medium">Manage active queues and shifts</p>
                </div>
              </div>
              <div className="relative group">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search doctors..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50/30">
              {isLoadingDoctors ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-slate-500 font-medium animate-pulse">Loading doctors...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-slate-800 font-semibold mb-1">No doctors found</h3>
                  <p className="text-slate-500 text-sm">Try adjusting your search query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {filteredDoctors.map((doc: any, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <DoctorCard
                          doctor={doc}
                          selectedBranchId={selectedBranchId}
                          processingSessions={processingSessions}
                          onStart={handleStartSession}
                          onManage={onManage}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function DoctorCard({ doctor, selectedBranchId, processingSessions, onStart, onManage }: any) {
  const { data: sessions } = useQuery({
    queryKey: ['sessions', doctor.id, selectedBranchId],
    queryFn: () => sessionService.getSessions(doctor.id, selectedBranchId)
  })

  const today = new Date().getDay()
  const todaysSessions = sessions?.filter((s: any) => s.isDaily || s.dayOfWeek === today) || []

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col h-full`}>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-slate-100 text-slate-600`}>
              {doctor.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 leading-tight">{doctor.name}</h4>
              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 mt-1 inline-block">
                {doctor.specialization || "General"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {todaysSessions.length === 0 ? (
            <div className="text-sm font-medium text-slate-400 py-4 bg-slate-50/50 rounded-xl text-center border border-dashed border-slate-200">
              No shifts scheduled today
            </div>
          ) : (
            todaysSessions.map((sess: any) => (
              <SessionItem 
                key={sess.id} 
                doctor={doctor} 
                session={sess} 
                processingSessions={processingSessions} 
                onStart={onStart} 
                onManage={onManage} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SessionItem({ doctor, session, processingSessions, onStart, onManage }: any) {
  const { data: activeQueue } = useQuery({
    queryKey: ['activeQueue', doctor.id, session.id],
    queryFn: () => queueService.getActiveQueueBySession(doctor.id, session.id),
    enabled: !!session.id,
    refetchInterval: 5000
  })

  const sessionKey = `${doctor.id}_${session.id}`
  const isProcessing = processingSessions.has(sessionKey)

  const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}')
  const fallbackQueueId = startedSessions[sessionKey]

  const isLive = !!fallbackQueueId || (!!activeQueue && !!activeQueue.id)
  const displayQueueId = activeQueue?.id || fallbackQueueId

  return (
    <div className={`p-4 rounded-xl border transition-colors ${isLive ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-3.5 h-3.5 ${isLive ? 'text-indigo-500' : 'text-slate-400'}`} />
              <p className="text-xs font-bold text-slate-700">{session.sessionName}</p>
            </div>
            <p className="text-xs text-slate-500 font-medium ml-5">{session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}</p>
          </div>
          {isLive && (
            <span className="flex h-3 w-3 relative mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          )}
        </div>

        {isLive ? (
          <button
            onClick={() => onManage(doctor, session, displayQueueId)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent border border-indigo-600 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Settings className="w-4 h-4" /> Manage Session
          </button>
        ) : (
          <button
            onClick={() => onStart(doctor, session)}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {isProcessing ? <Activity className="w-4 h-4 animate-spin text-indigo-500" /> : <Play className="w-4 h-4 text-indigo-500" />}
            {isProcessing ? "Starting..." : "Start Session"}
          </button>
        )}
      </div>
    </div>
  )
}
