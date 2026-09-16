import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Users, CheckCircle2, Clock, Search, Stethoscope, Play, Settings, Activity,
  LayoutDashboard, MonitorPlay, Building2, Calendar, Sparkles, ChevronRight,
  Pause, Loader2, ArrowRight
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { queueService } from "@/services/queueService"
import { motion, AnimatePresence } from "framer-motion"
import { useQueueHub } from "@/hooks/useQueueHub"
import { usePermissions } from "@/hooks/usePermissions"
import { PageLoader } from "@/components/ui/PageLoader"
import toast from "react-hot-toast"

function formatTime12H(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${formattedHours}:${minutes} ${ampm}`;
}

function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return '';
  let diffMinutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hrs`;
  return `${mins} mins`;
}

export default function QueueOverview({ selectedBranchId, onManage }: any) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [processingSessions, setProcessingSessions] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const connection = useQueueHub(selectedBranchId === 'org' ? null : selectedBranchId)

  useEffect(() => {
    if (connection) {
      const handleUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['queueStats', selectedBranchId] })
        queryClient.invalidateQueries({ queryKey: ['activeQueue'] })
      }
      const handleEnd = () => {
        queryClient.invalidateQueries({ queryKey: ['queueStats', selectedBranchId] })
        queryClient.removeQueries({ queryKey: ['activeQueue'] })
      }

      connection.on('TokenUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      connection.on('QueueStarted', handleUpdate)

      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
        connection.off('QueueStarted', handleUpdate)
      }
    }
  }, [connection, queryClient, selectedBranchId])

  const { data: doctors, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['queue-doctors', selectedBranchId],
    queryFn: () => queueService.getDoctors(selectedBranchId),
    enabled: !!selectedBranchId && selectedBranchId !== 'org'
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => queueService.getBranches(),
    enabled: !!selectedBranchId && selectedBranchId !== 'org'
  })

  const { data: stats } = useQuery({
    queryKey: ['queueStats', selectedBranchId],
    queryFn: () => queueService.getStats(selectedBranchId),
    enabled: !!selectedBranchId && selectedBranchId !== 'org',
    refetchInterval: 15000
  })

  const currentBranch = branches?.find((b: any) => b.id === selectedBranchId)
  const currentBranchName = currentBranch?.name || 'Main Clinic'

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const handleStartSession = async (doctor: any, session: any) => {
    const sessionKey = `${doctor.id}_${session.id}`
    setProcessingSessions(prev => new Set(prev).add(sessionKey))
    try {
      const response = await queueService.initializeQueue(doctor.id, session.id)
      const queueId = response?.id || response?.queueId || (typeof response === 'string' ? response : null)
      if (queueId) {
        queryClient.removeQueries({ queryKey: ['queueDetails', queueId] })
        queryClient.removeQueries({ queryKey: ['activeQueue'] })
        onManage(doctor, session, queueId)
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['queueStats'] }), 500)
        toast.success(`OPD session started for ${doctor.name}`)
      }
    } catch (err: any) {
      console.error("Failed to start session:", err)
      toast.error(err?.response?.data?.message || "Failed to start session. Please try again.")
    } finally {
      setProcessingSessions(prev => {
        const next = new Set(prev)
        next.delete(sessionKey)
        return next
      })
    }
  }

  const filteredDoctors = doctors?.filter((d: any) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.specialization && d.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  const statCards = [
    {
      label: "Total Patients",
      value: stats?.totalPatientsToday || 0,
      sublabel: "Today's Volume",
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      pillBg: "bg-indigo-50 text-indigo-700 border-indigo-100"
    },
    {
      label: "Waiting",
      value: stats?.waitingPatients || 0,
      sublabel: "In Waiting Area",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      pillBg: "bg-amber-50 text-amber-700 border-amber-100"
    },
    {
      label: "Completed",
      value: stats?.completedPatients || 0,
      sublabel: "Consultations Done",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      pillBg: "bg-emerald-50 text-emerald-700 border-emerald-100"
    },
    {
      label: "Avg Wait Time",
      value: `${stats?.avgWaitTimeMinutes || 0}m`,
      sublabel: "Live Turnaround",
      icon: Activity,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
      pillBg: "bg-sky-50 text-sky-700 border-sky-100"
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col h-full min-h-0 space-y-6"
    >
      {/* 1. Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-sm shrink-0">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Queue</span>
              <span className="text-indigo-600">Dashboard</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-0.5">
              Monitor and manage real-time doctor OPD queues and patient flow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start xl:self-auto flex-wrap">
          {/* Today's Date Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-md border border-slate-200 shadow-sm text-xs font-bold text-slate-600">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>{todayFormatted}</span>
          </div>

          {/* Active Clinic Branch */}
          {selectedBranchId && selectedBranchId !== 'org' && (
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-md border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>{currentBranchName}</span>
            </div>
          )}

          {/* Open TV View Button */}
          {selectedBranchId && selectedBranchId !== 'org' && (
            <a
              href={`/tv/${selectedBranchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-indigo-700 rounded-md text-xs sm:text-sm font-bold transition-all border border-indigo-200 shadow-sm hover:border-indigo-300"
              title="Open Queue TV Display in a new tab"
            >
              <MonitorPlay className="w-4 h-4 text-indigo-600" />
              <span>Open TV View</span>
            </a>
          )}
        </div>
      </div>

      {selectedBranchId === 'org' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 border-dashed rounded-lg shadow-sm text-center p-8"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-lg flex items-center justify-center mb-5 text-indigo-600 shadow-sm">
            <Building2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Queue Dashboard</h2>
          <p className="text-slate-500 max-w-md mb-6 text-sm leading-relaxed">
            You currently don't have an active clinic branch selected. To get started with monitoring queues and live OPD sessions, please select or create a clinic branch.
          </p>
          <a
            href="/branches"
            className="btn-primary px-6 py-3 text-sm shadow-md hover:shadow-lg transition-all"
          >
            Manage Branches
          </a>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 space-y-6">
          {/* 2. Key Metrics Stat Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 shrink-0">
            {statCards.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="saas-card p-4 sm:p-5 rounded-lg border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`w-11 h-11 rounded-md ${stat.bg} ${stat.color} flex items-center justify-center border ${stat.border} shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${stat.pillBg}`}>
                    {stat.sublabel}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {stat.value}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 3. Main Operational Grid: Doctor Sessions (8 cols) + Companion Hub (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
            
            {/* Left Column: Doctor Sessions List (8 cols) */}
            <div className="lg:col-span-8 flex flex-col min-h-0 space-y-4">
              <div className="saas-card rounded-lg border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                
                {/* Section Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Doctor Sessions & Live Shifts</h3>
                      <p className="text-xs text-slate-500 font-medium">Real-time doctor queue tracking, shifts & chamber status</p>
                    </div>
                  </div>

                  {/* Search Filter */}
                  <div className="relative group min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search doctor or specialty..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Doctor Cards Container */}
                <div className="p-4 sm:p-6 bg-slate-50/40 flex-1 overflow-y-auto custom-scrollbar min-h-[350px]">
                  {isLoadingDoctors ? (
                    <PageLoader message="Loading doctor shifts..." minHeight="min-h-[30vh]" />
                  ) : filteredDoctors.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white border border-slate-200 text-slate-300 rounded-lg flex items-center justify-center mb-3 shadow-xs">
                        <Search className="w-7 h-7" />
                      </div>
                      <h4 className="text-slate-800 font-bold text-sm mb-1">No doctors found</h4>
                      <p className="text-slate-500 text-xs max-w-xs">
                        {searchQuery ? "Try adjusting your search query." : "No doctors are registered for this clinic branch."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {filteredDoctors.map((doc: any, index: number) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2, delay: index * 0.04 }}
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

            {/* Right Column: Operational Hub & TV Screen Launcher (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              
              {/* Waiting Room TV Display Launcher Card */}
              {selectedBranchId && selectedBranchId !== 'org' && (
                <div className="saas-card p-5 rounded-lg bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white border-none shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-md bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 border border-white/10 shadow-xs">
                        <MonitorPlay className="w-5 h-5" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live TV Stream Ready
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-white tracking-tight">Waiting Room TV Display</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
                        Syncs live token calling, chamber numbers, and audio chime alerts for waiting patients in real-time.
                      </p>
                    </div>

                    <a
                      href={`/tv/${selectedBranchId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-md transition-all shadow-md flex items-center justify-center gap-2 group block text-center"
                    >
                      <span>Open Public TV Display</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              )}

              {/* Queue Flow Guide */}
              <div className="saas-card p-5 rounded-lg space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queue Flow Guide</h4>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-100">Live Workflow</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <p className="leading-snug"><strong>Start OPD Shift</strong> to launch live queue tracking and token generation.</p>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <p className="leading-snug">Doctor marks <strong>Arrival</strong> from Doctor Desk to open consultation calling.</p>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <p className="leading-snug">Called tokens flash on <strong>Waiting Room TV</strong> with audio announcements.</p>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-md bg-slate-50 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <p className="leading-snug">Doctor completes visit to auto-sync <strong>Billing & Invoices</strong>.</p>
                  </div>
                </div>
              </div>

              {/* Fast Navigation Shortcuts */}
              <div className="saas-card p-5 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workstation Shortcuts</h4>
                
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/doctor-desk')}
                    className="w-full p-2.5 rounded-md hover:bg-slate-50 text-left border border-slate-100 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Doctor Desk Workstation</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => navigate('/patients')}
                    className="w-full p-2.5 rounded-md hover:bg-slate-50 text-left border border-slate-100 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Patient Directory</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => navigate('/sessions')}
                    className="w-full p-2.5 rounded-md hover:bg-slate-50 text-left border border-slate-100 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Manage OPD Sessions</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </motion.div>
  )
}

function DoctorCard({ doctor, selectedBranchId, processingSessions, onStart, onManage }: any) {
  const { data: sessions } = useQuery({
    queryKey: ['queue-sessions', doctor.id, selectedBranchId],
    queryFn: () => queueService.getSessions(doctor.id, selectedBranchId)
  })

  const today = new Date().getDay()
  const todaysSessions = sessions?.filter((s: any) => s.isDaily || s.dayOfWeek === today) || []

  const doctorNameFormatted = doctor.name.toLowerCase().startsWith('dr') ? doctor.name : `Dr. ${doctor.name}`
  const initials = doctor.name
    .replace(/^dr\.?\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'DR'

  return (
    <div className="group relative bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Accent Top Strip */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />

      {/* Doctor Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-br from-white via-indigo-50/15 to-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-md bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              {initials}
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate group-hover:text-indigo-600 transition-colors">
                {doctorNameFormatted}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-indigo-700 bg-indigo-50 text-[11px] font-bold border border-indigo-100">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {doctor.specialization || "General Physician"}
                </span>
                {doctor.qualification && (
                  <span className="text-slate-500 text-[11px] font-medium bg-slate-100 px-1.5 py-0.5 rounded-sm">
                    {doctor.qualification}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-sm text-[11px] font-bold shrink-0">
            {todaysSessions.length} {todaysSessions.length === 1 ? 'Shift' : 'Shifts'}
          </span>
        </div>
      </div>

      {/* Shifts List */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col bg-slate-50/40 space-y-3">
        {todaysSessions.length === 0 ? (
          <div className="text-xs font-semibold text-slate-400 py-6 bg-white rounded-md text-center border border-dashed border-slate-200">
            No active shifts scheduled today
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
  )
}

function SessionItem({ doctor, session, processingSessions, onStart, onManage }: any) {
  const { can } = usePermissions()
  const { data: activeQueue, isLoading } = useQuery({
    queryKey: ['activeQueue', doctor.id, session.id],
    queryFn: () => queueService.getActiveQueueBySession(doctor.id, session.id),
    enabled: !!session.id,
    refetchInterval: 5000
  })

  const sessionKey = `${doctor.id}_${session.id}`
  const isProcessing = processingSessions.has(sessionKey) || isLoading

  const isLive = !!(activeQueue && activeQueue.id)
  const displayQueueId = activeQueue?.id

  const durationStr = calculateDuration(session.startTime, session.endTime)

  return (
    <div className={`p-4 rounded-md border transition-all ${
      isLive
        ? 'border-indigo-200 bg-white shadow-xs'
        : 'border-slate-200/80 bg-white hover:border-slate-300'
    }`}>
      <div className="space-y-3">
        
        {/* Session Name, Time & Live Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock className={`w-3.5 h-3.5 shrink-0 ${isLive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                {session.sessionName}
              </h5>
            </div>
            
            <div className="flex items-center gap-2 mt-1 ml-5 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">
                {formatTime12H(session.startTime)} — {formatTime12H(session.endTime)}
              </span>
              {durationStr && (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-sm">
                  {durationStr}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {isLive ? (
            activeQueue.status === 2 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                <Pause className="w-3 h-3 text-amber-600" />
                Paused
              </span>
            ) : activeQueue.status === 1 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live OPD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Arrival Pending
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
              Scheduled
            </span>
          )}
        </div>

        {/* Live Metrics Mini Bar (If Session is Live) */}
        {isLive && (
          <div className="bg-slate-50 rounded-md p-2.5 border border-slate-100 space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-white rounded-sm py-1 px-1.5 border border-slate-100 shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-slate-400">Current</p>
                <p className="text-sm font-black text-indigo-600 leading-tight">
                  {activeQueue.currentTokenNumber > 0 ? `#${activeQueue.currentTokenNumber}` : '—'}
                </p>
              </div>
              <div className="bg-white rounded-sm py-1 px-1.5 border border-slate-100 shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-slate-400">Waiting</p>
                <p className="text-sm font-black text-amber-600 leading-tight">{activeQueue.waitingCount}</p>
              </div>
              <div className="bg-white rounded-sm py-1 px-1.5 border border-slate-100 shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-slate-400">Done</p>
                <p className="text-sm font-black text-emerald-600 leading-tight">{activeQueue.completedCount}</p>
              </div>
            </div>

            {activeQueue.currentPatientName && activeQueue.currentPatientName !== "No one" && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 px-1 pt-1 border-t border-slate-200/60 truncate">
                <Activity className="w-3 h-3 text-emerald-500 shrink-0 animate-pulse" />
                <span className="text-slate-400 font-normal">Consulting:</span>
                <span className="truncate font-bold text-slate-800">{activeQueue.currentPatientName}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {isLive ? (
          can('Queue.View') && (
            <button
              onClick={() => onManage(doctor, session, displayQueueId)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-sm transition-all hover:shadow-md active:scale-98"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage Live Queue</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          )
        ) : (
          can('Queue.View') && (
            <button
              onClick={() => onStart(doctor, session)}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-bold rounded-md shadow-2xs transition-all hover:border-indigo-300 active:scale-98 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Start OPD Shift</span>
                </>
              )}
            </button>
          )
        )}

      </div>
    </div>
  )
}
