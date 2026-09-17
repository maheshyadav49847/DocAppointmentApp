import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Users, Activity, CheckCircle2,
  Loader2, Bell, Play, Pause, MonitorPlay, Power, RotateCcw, AlertCircle, X, Building2, Stethoscope, Clock, Smartphone, Send, Phone,
  Calendar, Sparkles, ArrowRight, ChevronRight, Coffee, Star
} from "lucide-react"
import toast from "react-hot-toast"
import { useAuthStore } from "@/store/authStore"
import { usePermissions } from "@/hooks/usePermissions"
import { queueService } from "@/services/queueService"
import { sessionService } from "@/services/sessionService"
import { useQueueHub } from "@/hooks/useQueueHub"
import ConsultationPage from "./ConsultationPage"
import EndSessionModal from "../queue/components/EndSessionModal"
import PauseSessionModal from "../queue/components/PauseSessionModal"
import { motion, AnimatePresence } from "framer-motion"
import { PageLoader } from "@/components/ui/PageLoader"
import { useNavigate } from "react-router-dom"
import { MaskedPhone } from "@/components/ui/MaskedPhone"

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

export default function DoctorDeskPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { can } = usePermissions()
  const activeBranchId = useAuthStore(state => state.activeBranchId)
  const queryClient = useQueryClient()

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("")

  const { data: allDoctors } = useQuery({
    queryKey: ['doctordesk-org-doctors', activeBranchId],
    queryFn: () => queueService.getDoctors(activeBranchId || "org"),
    enabled: !!user?.orgId
  })

  // Check if current user.doctorId exists in active doctors list
  const isUserDoctorValid = Boolean(user?.doctorId && allDoctors?.some((d: any) => d.id === user.doctorId))
  const defaultDoctorId = isUserDoctorValid
    ? (user?.doctorId || "")
    : (allDoctors && allDoctors.length > 0 ? allDoctors[0].id : (user?.doctorId || ""))

  const effectiveDoctorId = selectedDoctorId || defaultDoctorId

  // Auto-heal stale doctor ID in auth store
  useEffect(() => {
    if (allDoctors && allDoctors.length > 0 && user) {
      if (!isUserDoctorValid && allDoctors[0]?.id && user.doctorId !== allDoctors[0].id) {
        useAuthStore.getState().setDoctor(allDoctors[0].id)
      }
    }
  }, [allDoctors, isUserDoctorValid, user])

  const { data: activeQueue, isLoading: isQueueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['doctorActiveQueue', effectiveDoctorId],
    queryFn: () => queueService.getActiveQueue(effectiveDoctorId),
    enabled: !!effectiveDoctorId
  })

  const { data: branches } = useQuery({
    queryKey: ['doctordesk-branches', user?.orgId],
    queryFn: () => queueService.getBranches(),
    enabled: !!user?.orgId && !activeQueue
  })

  const [isQueueExpanded, setIsQueueExpanded] = useState(false)
  const [overridePatientId, setOverridePatientId] = useState<string | null>(null)

  const queueId = activeQueue?.id

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId),
    enabled: !!queueId,
    refetchInterval: 3000,
  })

  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['doctorSessions', effectiveDoctorId],
    queryFn: () => sessionService.getSessions(effectiveDoctorId),
    enabled: !activeQueue && !!effectiveDoctorId && !isQueueLoading
  })

  const initializeQueueMutation = useMutation({
    mutationFn: (sessionId: string) => queueService.initializeQueue(effectiveDoctorId, sessionId),
    onSuccess: (_, sessionId) => {
      const startedSession = sessions?.find((s: any) => s.id === sessionId)
      if (startedSession?.branchId) {
        useAuthStore.getState().setActiveBranchId(startedSession.branchId)
      }
      refetchQueue()
    }
  })

  // Sync activeQueue's branch to global state
  useEffect(() => {
    if (activeQueue?.branchId && activeQueue.branchId !== activeBranchId) {
      useAuthStore.getState().setActiveBranchId(activeQueue.branchId)
    }
  }, [activeQueue?.branchId, activeBranchId])

  // SignalR
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const isMultiBranchDoctor = role === 'doctor';
  const branchId = (role === 'orgadmin' || isMultiBranchDoctor) ? (activeBranchId || "org") : (user?.branchId || "org");
  const connection = useQueueHub(branchId)

  useEffect(() => {
    if (connection) {
      const handleUpdate = (data: any) => {
        const incomingQueueId = String(data?.queueId || data?.QueueId || "").toLowerCase()
        const currentQueueId = String(queueId || "").toLowerCase()
        if (!queueId || !incomingQueueId || incomingQueueId === currentQueueId) {
          refetchQueue()
          if (queueId) refetchTokens()
        }
      }

      const handleEnd = (data: any) => {
        const incomingQueueId = String(data.queueId || data.QueueId || "").toLowerCase()
        if (incomingQueueId === String(queueId || "").toLowerCase()) {
          queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] })
          queryClient.removeQueries({ queryKey: ['activeQueue'] })
        }
      }

      const handleStart = () => {
        queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] })
      }

      const handleDoctorArrived = (data: any) => {
        const incomingQueueId = String(data.queueId || data.QueueId || "").toLowerCase()
        const currentQueueId = String(queueId || "").toLowerCase()
        if (!queueId || incomingQueueId === currentQueueId) {
          refetchQueue()
        }
      }

      connection.on('TokenUpdated', handleUpdate)
      connection.on('TokenCreated', handleUpdate)
      connection.on('InvoiceUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      connection.on('QueueStarted', handleStart)
      connection.on('DoctorArrived', handleDoctorArrived)

      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('TokenCreated', handleUpdate)
        connection.off('InvoiceUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
        connection.off('QueueStarted', handleStart)
        connection.off('DoctorArrived', handleDoctorArrived)
      }
    }
  }, [connection, queueId, refetchQueue, refetchTokens, queryClient])

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
    onSuccess: () => { setOverridePatientId(null); refetchQueue(); refetchTokens() }
  })

  const [sidebarTab, setSidebarTab] = useState<'pending' | 'skipped'>('pending')

  const completeMutation = useMutation({
    mutationFn: () => queueService.completeToken(queueId),
    onSuccess: () => {
      setOverridePatientId(null);
      refetchQueue();
      refetchTokens();
      // Optional: Show a toast here
    }
  })

  const requeueMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.requeueToken(tokenId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const markArrivedMutation = useMutation({
    mutationFn: () => queueService.markArrived(queueId),
    onSuccess: () => refetchQueue()
  })

  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false)

  const pauseMutation = useMutation({
    mutationFn: ({ duration, reason }: { duration: number; reason: string }) =>
      queueService.pauseQueue(queueId, duration, reason),
    onSuccess: () => {
      setIsPauseModalOpen(false)
      refetchQueue()
      refetchTokens()
      toast.success("Consultation session paused")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to pause session")
    }
  })

  const resumeMutation = useMutation({
    mutationFn: () => queueService.resumeQueue(queueId),
    onSuccess: () => {
      refetchQueue()
      refetchTokens()
      toast.success("Consultation session resumed")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to resume session")
    }
  })

  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false)

  const endSessionMutation = useMutation({
    mutationFn: (data?: { action?: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string }) =>
      queueService.endQueue(queueId, data),
    onSuccess: () => {
      setIsEndSessionModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] })
      queryClient.removeQueries({ queryKey: ['activeQueue'] })
      queryClient.invalidateQueries({ queryKey: ['doctorSessions'] })
    }
  })

  const handleEndSession = () => {
    if (activeQueue && (activeQueue.waitingCount > 0 || activeQueue.skippedCount > 0)) {
      setIsEndSessionModalOpen(true)
    } else {
      if (window.confirm("Are you sure you want to end this session?")) {
        endSessionMutation.mutate(undefined)
      }
    }
  }

  const confirmEndSession = (action: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string) => {
    endSessionMutation.mutate({ action, targetSessionId: targetSessionId || undefined })
  }

  if (isQueueLoading) {
    return <PageLoader message="Loading Desk..." minHeight="h-[80vh]" />
  }

  const currentDoctor = allDoctors?.find((d: any) => d.id === effectiveDoctorId)
  const doctorDisplayName = currentDoctor?.name
    ? (currentDoctor.name.toLowerCase().startsWith('dr') ? currentDoctor.name : `Dr. ${currentDoctor.name}`)
    : (user?.name ? (user.name.toLowerCase().startsWith('dr') ? user.name : `Dr. ${user.name}`) : 'Doctor')

  const activeBranchObj = branches?.find((b: any) => b.id === (activeQueue?.branchId || activeBranchId)) || branches?.[0]
  const activeBranchName = activeQueue?.branchName || activeBranchObj?.name || 'Main Clinic'

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  if (!activeQueue) {
    const filteredSessions = (activeBranchId && sessions?.some((s: any) => s.branchId === activeBranchId))
      ? sessions.filter((s: any) => s.branchId === activeBranchId)
      : (sessions || [])

    return (
      <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
        {/* 1. Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative z-10 flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
              <MonitorPlay className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <span className="text-slate-900">Doctor</span>
                <span className="text-indigo-600">Desk</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Consultation Workstation & Live Token Queue Controller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto flex-wrap">
            {/* Today's Date Pill */}
            <div className="h-9 flex items-center gap-2 bg-white px-3 rounded-md border border-slate-200/90 shadow-2xs text-xs font-bold text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{todayFormatted}</span>
            </div>

            {/* Doctor Switcher for OrgAdmin */}
            {allDoctors && allDoctors.length > 1 && (role === 'orgadmin' || !user?.doctorId) && (
              <div className="h-9 flex items-center gap-2 bg-white px-3 rounded-md border border-slate-200/90 shadow-2xs shrink-0">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doctor:</span>
                <select
                  value={effectiveDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {allDoctors.map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 2. Doctor Workstation Welcome Hero Banner */}
        <div className="saas-card p-4 sm:p-5 rounded-lg relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/25 to-white border-slate-200/90 shadow-xs shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            {/* Left: Doctor Profile & Status */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                    Welcome back, {doctorDisplayName}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ready for OPD
                  </span>
                </div>
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-xs font-semibold">
                  {currentDoctor?.specialization && (
                    <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-sm border border-indigo-100">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      {currentDoctor.specialization}
                    </span>
                  )}
                  {currentDoctor?.qualification && (
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                      {currentDoctor.qualification}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {activeBranchName}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Stats Pills */}
            <div className="flex items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded px-4 py-2 text-center min-w-[100px] shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Slots</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{filteredSessions.length}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded px-4 py-2 text-center min-w-[110px] shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Clinic</p>
                <p className="text-xs font-bold text-indigo-600 mt-1 truncate max-w-[120px]">{activeBranchName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Workspace: Sessions (Left 8 cols) + Guide & Hub (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
          
          {/* Left Column: Sessions List (8 cols) */}
          <div className="lg:col-span-8 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Scheduled OPD Sessions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an OPD session below to launch live queue tracking and begin patient consultations.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded">
                {filteredSessions.length} {filteredSessions.length === 1 ? 'Slot' : 'Slots'}
              </span>
            </div>

            {isSessionsLoading ? (
              <div className="saas-card p-12 flex flex-col items-center justify-center gap-3 text-indigo-600 rounded">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-semibold text-sm">Loading assigned OPD schedules...</span>
              </div>
            ) : filteredSessions?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSessions.map((session: any) => {
                  const branchItem = branches?.find((b: any) => b.id === session.branchId);
                  const durationStr = calculateDuration(session.startTime, session.endTime);

                  return (
                    <motion.div
                      key={session.id}
                      whileHover={{ y: -2 }}
                      className="saas-card p-4 rounded flex flex-col justify-between border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      {/* Top Accent Strip */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div>
                        {/* Top Row: Icon + Schedule Badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                            <Activity className="w-5 h-5" />
                          </div>
                          {session.isDaily ? (
                            <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Daily OPD
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-sm text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {DAY_NAMES[session.dayOfWeek] || 'Specific Day'}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {session.sessionName || 'OPD Consultation'}
                        </h4>

                        {/* Timing & Metrics Box */}
                        <div className="bg-slate-50/80 border border-slate-100 rounded p-3 my-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span>{formatTime12H(session.startTime)} — {formatTime12H(session.endTime)}</span>
                            </div>
                            {durationStr && (
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200">
                                {durationStr}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {branchItem?.name || activeBranchName}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              Limit: {session.defaultCapacity || 30}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Start Session Button */}
                      <button
                        onClick={() => initializeQueueMutation.mutate(session.id)}
                        disabled={initializeQueueMutation.isPending}
                        className="btn-primary w-full py-2.5 rounded font-bold flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md transition-all text-sm mt-1"
                      >
                        {initializeQueueMutation.isPending && initializeQueueMutation.variables === session.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Initializing Queue...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Start OPD Session</span>
                            <ArrowRight className="w-4 h-4 ml-0.5 opacity-70 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="saas-card p-10 rounded border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-900 mb-1.5">No Active Sessions Configured</h3>
                <p className="text-slate-500 mb-6 font-medium text-sm max-w-md">
                  No OPD session timing is linked to this doctor profile. Configure consultation hours to start calling patients.
                </p>
                {(role === 'orgadmin' || can('Sessions.View')) && (
                  <button
                    onClick={() => navigate('/sessions')}
                    className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Manage Sessions & Timings</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Workstation Quick Hub & Guidelines (4 cols) */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            {/* Guide Card */}
            <div className="saas-card p-4 rounded space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Workstation Quick Guide</h4>
                  <p className="text-[11px] text-slate-400">Essential workflow tips</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-xs bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-emerald-100">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Launch Your Session</p>
                    <p className="text-[11px] text-slate-500">Click "Start OPD Session" on your desired schedule slot to open the queue.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-xs bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-indigo-100">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Mark Presence</p>
                    <p className="text-[11px] text-slate-500">Hit "Mark Arrival" to notify reception and active tokens that you're seated.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-xs bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-amber-100">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Pause for Breaks</p>
                    <p className="text-[11px] text-slate-500">Need tea or lunch? Pause the session with 1 click; waiting patients will be updated automatically.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-xs bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-rose-100">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Live TV & EMR Sync</p>
                    <p className="text-[11px] text-slate-500">Prescription writing, patient vitals, and waiting room TV screen sync live in real-time.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Shortcuts Card */}
            <div className="saas-card p-4 rounded space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desk Shortcuts</h4>
              
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/patients')}
                  className="w-full p-2.5 rounded hover:bg-slate-50 text-left border border-slate-100 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Patient Directory</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                <a
                  href={`/tv/${branchId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-2.5 rounded hover:bg-slate-50 text-left border border-slate-100 transition-all flex items-center justify-between group block"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <MonitorPlay className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Open Waiting Room TV</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </a>

                {(role === 'orgadmin' || can('Sessions.View')) && (
                  <button
                    onClick={() => navigate('/sessions')}
                    className="w-full p-2.5 rounded hover:bg-slate-50 text-left border border-slate-100 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Manage OPD Sessions</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    )
  }

  const hasCurrentPatient = activeQueue.currentTokenNumber > 0 && activeQueue.currentPatientName !== "No one"
  const pendingTokens = upcomingTokens?.filter((t: any) => t.status === 0) || []
  const skippedTokens = upcomingTokens?.filter((t: any) => t.status === 3) || []
  const nextPatient = pendingTokens[0]

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6 flex flex-col flex-1 min-h-0">
      {/* Page Header (Outside the Card) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <MonitorPlay className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Doctor</span>
              <span className="text-indigo-600">Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Live OPD Consultation Workstation & Patient Queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Today's Date Pill */}
          <div className="h-9 flex items-center gap-2 bg-white px-3 rounded-md border border-slate-200/90 shadow-2xs text-xs font-bold text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{todayFormatted}</span>
          </div>

          {/* Doctor Pill */}
          <div className="h-9 flex items-center gap-2 bg-white px-3 rounded-md border border-slate-200/90 shadow-2xs text-xs font-bold text-slate-700">
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
            <span>{doctorDisplayName}</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="saas-card overflow-hidden flex-1 flex flex-col min-h-[520px]">

        {/* Top Bar inside the Card */}
        <div className="bg-white border-b border-slate-200 p-2.5 sm:p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 shrink-0 shadow-xs z-20">
          
          {/* LEFT SIDE: Session Info & Status */}
          {activeQueue && (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600 shrink-0 shadow-xs">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate">
                    {activeQueue.sessionName}
                  </h3>
                  {activeQueue.status === 2 ? (
                    <span className="px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-sm flex items-center gap-1 uppercase tracking-wider shrink-0">
                      <Pause className="w-3 h-3 text-amber-600" /> Paused
                    </span>
                  ) : activeQueue.status === 1 ? (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-sm flex items-center gap-1.5 uppercase tracking-wider shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live OPD
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-sm flex items-center gap-1.5 uppercase tracking-wider shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span> Check-in Required
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {activeBranchName}
                  </span>
                  <span>•</span>
                  <span>{doctorDisplayName}</span>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT SIDE: Action Buttons & Counters (All Uniform h-9 Height!) */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-2.5 w-full lg:w-auto">
            
            {/* Action Buttons Group */}
            <div className="flex items-center gap-2 flex-wrap ml-auto lg:ml-0">
              
              {/* Mark Arrival Button */}
              {can('DoctorDesk.MarkDoctorArrived') && (
                activeQueue.status === 1 || activeQueue.status === 2 ? (
                  <div className="h-9 flex items-center gap-1.5 px-3 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Doctor Arrived</span>
                  </div>
                ) : (
                  <button
                    onClick={() => markArrivedMutation.mutate()}
                    disabled={markArrivedMutation.isPending}
                    className="btn-primary h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm shadow-indigo-200 hover:shadow-indigo-300"
                    title="Mark Arrival & Open Consultations"
                  >
                    {markArrivedMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
                    <span>Mark Arrival</span>
                  </button>
                )
              )}

              {/* Pause / Resume Session Button */}
              {(can('DoctorDesk.EndSession') || can('Queue.EndSession')) && (
                activeQueue.status === 2 ? (
                  <button
                    onClick={() => resumeMutation.mutate()}
                    disabled={resumeMutation.isPending}
                    className="h-9 px-3 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-all flex items-center gap-1.5 shrink-0"
                    title="Resume consultation session"
                  >
                    {resumeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsPauseModalOpen(true)}
                    disabled={activeQueue.status !== 1}
                    className="h-9 px-3 rounded-md text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                    title={activeQueue.status !== 1 ? "Mark arrival first to pause" : "Pause consultation session"}
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pause</span>
                  </button>
                )
              )}

              {/* Queue Drawer Quick Toggle */}
              <button
                onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                className="btn-secondary h-9 px-3 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
                title="Toggle Patient Queue List"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Queue</span>
                <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200/80 text-indigo-700 rounded-sm text-[10px] font-black leading-none">
                  {pendingTokens.length}
                </span>
              </button>

              {/* TV View */}
              <a
                href={`/tv/${branchId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary h-9 px-3 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
                title="Open Queue TV Display in a new tab"
              >
                <MonitorPlay className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">TV View</span>
              </a>

              {/* End Session */}
              {can('DoctorDesk.EndSession') && (
                <button
                  onClick={handleEndSession}
                  disabled={endSessionMutation.isPending}
                  className="btn-cancel h-9 px-3 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
                  title="End current session"
                >
                  {endSessionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">End Session</span>
                </button>
              )}
            </div>

            {/* Counters Pill */}
            <div className="h-9 px-3 bg-slate-50 border border-slate-200/90 rounded-md flex items-center gap-3 shrink-0 shadow-2xs">
              <div className="flex flex-col items-center justify-center min-w-[38px] sm:min-w-[44px]">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Waiting</span>
                <span className="text-xs sm:text-sm font-black text-indigo-600 leading-tight mt-0.5">{activeQueue.waitingCount}</span>
              </div>
              <div className="w-px h-5 bg-slate-200"></div>
              <div className="flex flex-col items-center justify-center min-w-[38px] sm:min-w-[44px]">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Done</span>
                <span className="text-xs sm:text-sm font-black text-emerald-600 leading-tight mt-0.5">{activeQueue.completedCount}</span>
              </div>
              {activeQueue.skippedCount > 0 && (
                <>
                  <div className="w-px h-5 bg-slate-200"></div>
                  <div className="flex flex-col items-center justify-center min-w-[38px] sm:min-w-[44px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Skipped</span>
                    <span className="text-xs sm:text-sm font-black text-rose-500 leading-tight mt-0.5">{activeQueue.skippedCount}</span>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Paused Alert Banner */}
        {activeQueue && activeQueue.status === 2 && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-900 z-10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Pause className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-wrap">
                  <span>Session is Paused</span>
                  {activeQueue.pauseReason && (
                    <span className="font-medium text-amber-700 truncate max-w-xs sm:max-w-md">({activeQueue.pauseReason})</span>
                  )}
                </p>
                {activeQueue.pausedUntil && (
                  <p className="text-[11px] text-amber-700">
                    Estimated resume at ~{new Date(activeQueue.pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              {resumeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Resume Session</span>
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden min-h-0 relative">

          {/* Floating Button for Queue */}
          {!isQueueExpanded && (
            <button
              onClick={() => setIsQueueExpanded(true)}
              className="group fixed right-0 top-[150px] h-[48px] min-w-[44px] bg-white/90 backdrop-blur-sm text-indigo-600 shadow-[-4px_4px_12px_rgba(0,0,0,0.05)] z-40 flex items-center justify-center border border-r-0 border-b-0 border-slate-200 rounded-tl transition-all active:scale-95 px-2.5 hover:bg-white"
            >
              <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:opacity-100 group-hover:pr-2 transition-all duration-300 whitespace-nowrap text-xs font-bold">Queue</span>
              <Users className="w-5 h-5 shrink-0" />
            </button>
          )}

          {/* Queue Sidebar Backdrop */}
          {isQueueExpanded && (
            <div 
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setIsQueueExpanded(false)}
            />
          )}

          {/* RIGHT SIDE: Queue Sidebar (Floating Overlay) */}
          <div className={`bg-white flex flex-col shrink-0 fixed inset-y-0 right-0 w-[90vw] sm:w-[380px] max-w-[400px] z-50 border-l border-slate-200/80 shadow-2xl transition-all duration-300 ease-out transform ${isQueueExpanded ? "translate-x-0" : "translate-x-full"}`}>

            {/* Aesthetic Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Patient Queue
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-sm text-[10px] font-extrabold">
                      {pendingTokens.length} waiting
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Real-time session roster</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQueueExpanded(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-col flex-1 overflow-hidden flex bg-slate-50/40">
              {/* Current Patient Hero Card (if any) */}
              {hasCurrentPatient && (
                <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-b border-indigo-100/80 shrink-0 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-sm flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-xs bg-emerald-500 animate-pulse"></span> Now Consulting
                    </span>
                    <span className="text-xs font-mono font-black text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-xs shadow-2xs">
                      #{activeQueue.currentTokenNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                      {activeQueue.currentPatientName?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-900 text-base truncate leading-tight">
                        {activeQueue.currentPatientName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Token #{activeQueue.currentTokenNumber} • In Chamber
                      </p>
                    </div>
                  </div>

                  {/* Action Controls for Current Patient */}
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-indigo-100/60">
                    {can('DoctorDesk.CompleteToken') && (
                      <button
                        onClick={() => completeMutation.mutate()}
                        disabled={completeMutation.isPending}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-xs shadow-emerald-100 disabled:opacity-50 group"
                      >
                        {completeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        )}
                        <span>Complete & Next Patient</span>
                      </button>
                    )}
                    {can('DoctorDesk.CallNext') && (
                      <button
                        onClick={() => callNextMutation.mutate()}
                        disabled={callNextMutation.isPending || pendingTokens.length === 0 || activeQueue.status !== 1}
                        className="w-full py-1.5 px-3 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-2xs"
                      >
                        {callNextMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Users className="w-4 h-4 text-indigo-600" />
                        )}
                        <span>Call Next Waiting</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Segmented Control Tabs */}
              <div className="p-2.5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex bg-slate-100 p-1 rounded w-full relative">
                  <button
                    onClick={() => setSidebarTab('pending')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all relative z-10 ${
                      sidebarTab === 'pending' ? 'text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {sidebarTab === 'pending' && (
                      <motion.div 
                        layoutId="sidebarTab" 
                        className="absolute inset-0 bg-white rounded shadow-xs" 
                        style={{ zIndex: -1 }} 
                      />
                    )}
                    Up Next ({pendingTokens.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('skipped')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all relative z-10 ${
                      sidebarTab === 'skipped' ? 'text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {sidebarTab === 'skipped' && (
                      <motion.div 
                        layoutId="sidebarTab" 
                        className="absolute inset-0 bg-white rounded shadow-xs" 
                        style={{ zIndex: -1 }} 
                      />
                    )}
                    Skipped ({skippedTokens.length})
                  </button>
                </div>
              </div>

              {/* Patient List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sidebarTab === 'pending' ? (
                  pendingTokens.length === 0 ? (
                    <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">No Waiting Patients</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">All queued tokens have been consulted.</p>
                    </div>
                  ) : (
                    pendingTokens.map((token: any, idx: number) => (
                      <div 
                        key={token.id} 
                        className="bg-white border border-slate-200/80 hover:border-indigo-300 p-2.5 rounded flex items-center gap-3 relative overflow-hidden group shadow-2xs hover:shadow-xs transition-all"
                      >
                        {/* Token Badge */}
                        <div className={`w-9 h-9 rounded font-black text-sm flex items-center justify-center border shrink-0 ${
                          token.isPriority ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {token.tokenNumber}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-slate-900 text-xs truncate">{token.patientName}</p>
                            {token.isPriority && (
                              <span title="Priority Patient">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              {token.source === 0 ? <Smartphone className="w-3 h-3 text-emerald-500" /> :
                               token.source === 3 ? <Send className="w-3 h-3 text-sky-500" /> :
                               <Phone className="w-3 h-3 text-slate-400" />}
                              <MaskedPhone phone={token.patientPhone} emptyText="Walk-in" textClassName="text-[11px] text-slate-600 font-semibold" />
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 text-[10px]">#{idx + 1} in line</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  skippedTokens.length === 0 ? (
                    <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">No Skipped Patients</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">No tokens were bypassed in this shift.</p>
                    </div>
                  ) : (
                    skippedTokens.map((token: any) => (
                      <div 
                        key={token.id} 
                        className="bg-rose-50/50 border border-rose-100 p-2.5 rounded flex items-center gap-3 relative overflow-hidden group shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div className="w-9 h-9 rounded bg-white border border-rose-200 flex items-center justify-center font-black text-sm text-rose-700 shrink-0 shadow-2xs">
                          {token.tokenNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-900 text-xs truncate">{token.patientName}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 font-medium">
                            {token.source === 0 ? <Smartphone className="w-3 h-3 text-emerald-500" /> :
                             token.source === 3 ? <Send className="w-3 h-3 text-sky-500" /> :
                             <Phone className="w-3 h-3 text-slate-400" />}
                            <MaskedPhone phone={token.patientPhone} emptyText="No Phone" textClassName="text-[11px] text-slate-600 font-semibold" />
                          </div>
                        </div>
                        {can('DoctorDesk.RestoreToken') && (
                          <button
                            onClick={() => requeueMutation.mutate(token.id)}
                            disabled={requeueMutation.isPending}
                            className="p-1.5 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded shadow-2xs border border-slate-200 transition-all"
                            title="Restore patient back to queue"
                          >
                            {requeueMutation.isPending && requeueMutation.variables === token.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* MAIN AREA: Active EMR or Call Next Prompt */}
          <div className="flex-1 flex flex-col overflow-y-auto relative min-h-0 bg-slate-50/50 p-3 sm:p-5">
            <AnimatePresence mode="wait">
              {!hasCurrentPatient ? (
                <motion.div
                  key="empty-stage"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full max-w-xl mx-auto my-auto flex flex-col items-center justify-center py-2"
                >
                  {/* CASE 1: Doctor Arrival Required */}
                  {activeQueue.status !== 1 && activeQueue.status !== 2 ? (
                    <div className="saas-card w-full p-4 sm:p-5 text-center relative overflow-hidden border-slate-200/90 shadow-sm bg-white">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />

                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-indigo-200/60 relative">
                        <Stethoscope className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-ping" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 mb-2">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        Chamber Ready • Arrival Required
                      </span>

                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-1">
                        Welcome, {doctorDisplayName}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-3.5 leading-relaxed">
                        Your session <strong className="text-slate-800 font-semibold">{activeQueue.sessionName}</strong> is active at <strong className="text-slate-800 font-semibold">{activeBranchName}</strong>. Please confirm your arrival to alert reception, sync waiting room screens, and start calling patients.
                      </p>

                      {can('DoctorDesk.MarkDoctorArrived') && (
                        <div className="flex items-center justify-center mb-3.5">
                          <button
                            onClick={() => markArrivedMutation.mutate()}
                            disabled={markArrivedMutation.isPending}
                            className="btn-primary h-10 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                          >
                            {markArrivedMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Marking Arrival...</span>
                              </>
                            ) : (
                              <>
                                <Stethoscope className="w-4 h-4" />
                                <span>Mark Arrival & Open Consultations</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* 3 System Highlights */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 text-left">
                        <div className="bg-slate-50/80 rounded-lg p-2 sm:p-2.5 border border-slate-200/60 flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                            <Bell className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Alerts Reception</p>
                            <p className="text-[11px] text-slate-500 leading-tight">Staff sees you are seated & ready.</p>
                          </div>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2 sm:p-2.5 border border-slate-200/60 flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                            <MonitorPlay className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Syncs Waiting TV</p>
                            <p className="text-[11px] text-slate-500 leading-tight">Displays 'Consulting Now' status.</p>
                          </div>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2 sm:p-2.5 border border-slate-200/60 flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Activates Queue</p>
                            <p className="text-[11px] text-slate-500 leading-tight">Call tokens in sequence live.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : activeQueue.status === 2 ? (
                    /* CASE 2: Session Paused */
                    <div className="saas-card w-full max-w-lg p-4 sm:p-5 text-center relative overflow-hidden border-amber-200/90 shadow-sm bg-white">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
                      <div className="w-11 h-11 rounded-lg bg-amber-500 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-amber-200/60">
                        <Pause className="w-5 h-5" />
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                        Consultation Paused
                      </span>

                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-1">
                        Session is on a Break
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-1.5">
                        {activeQueue.pauseReason ? (
                          <span>Reason: <strong>{activeQueue.pauseReason}</strong></span>
                        ) : (
                          <span>Doctor stepped out for a brief break.</span>
                        )}
                      </p>
                      {activeQueue.pausedUntil && (
                        <p className="text-xs font-semibold text-amber-700 mb-3">
                          Estimated return at ~{new Date(activeQueue.pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
                        <button
                          onClick={() => resumeMutation.mutate()}
                          disabled={resumeMutation.isPending}
                          className="btn-primary h-10 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                        >
                          {resumeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          <span>Resume Consultations</span>
                        </button>
                        
                        {can('DoctorDesk.EndSession') && (
                          <button
                            onClick={handleEndSession}
                            disabled={endSessionMutation.isPending}
                            className="btn-cancel h-10 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5"
                          >
                            <Power className="w-4 h-4" />
                            <span>End Session</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : pendingTokens.length > 0 && nextPatient ? (
                    /* CASE 3: Doctor Arrived & Patients Waiting */
                    <div className="saas-card w-full max-w-lg p-4 sm:p-5 text-center relative overflow-hidden border-slate-200/90 shadow-sm bg-white">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 mb-2.5">
                        <Users className="w-3 h-3 text-indigo-600" />
                        <span>Up Next in Line • {pendingTokens.length} Patient{pendingTokens.length > 1 ? 's' : ''} Waiting</span>
                      </div>

                      {/* Next Patient Card */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 sm:p-3.5 my-2 max-w-md mx-auto flex items-center gap-3 text-left shadow-2xs hover:border-indigo-200 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                          #{nextPatient.tokenNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                              {nextPatient.patientName}
                            </h3>
                            {nextPatient.source === 0 ? (
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                                <Smartphone className="w-3 h-3 text-emerald-500" /> WhatsApp
                              </span>
                            ) : nextPatient.source === 3 ? (
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1 shrink-0">
                                <Send className="w-3 h-3 text-sky-500" /> Telegram
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 shrink-0">
                                <Phone className="w-3 h-3 text-slate-400" /> Walk-in
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              Phone: <MaskedPhone phone={nextPatient.patientPhone} emptyText="Not provided" textClassName="text-xs font-semibold text-slate-700" />
                            </span>
                            {nextPatient.isPriority && (
                              <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xs text-[10px] font-bold">
                                Priority
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Main Call Action */}
                      {can('DoctorDesk.CallNext') && (
                        <div className="mt-3 mb-3">
                          <button
                            onClick={() => callNextMutation.mutate()}
                            disabled={callNextMutation.isPending}
                            className="btn-primary h-10 px-6 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 mx-auto shadow-sm"
                          >
                            {callNextMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Calling Token #{nextPatient.tokenNumber}...</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4" />
                                <span>Call Patient #{nextPatient.tokenNumber}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Secondary Options */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setIsQueueExpanded(true)}
                          className="btn-secondary h-8 px-3 text-xs font-bold flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View Full Queue ({pendingTokens.length})</span>
                        </button>

                        <button
                          onClick={() => setIsPauseModalOpen(true)}
                          className="h-8 px-3 rounded-md text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 shadow-2xs transition-colors flex items-center gap-1.5"
                        >
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>Take a Break</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* CASE 4: Doctor Arrived & Queue Clear */
                    <div className="saas-card w-full max-w-lg p-4 sm:p-5 text-center relative overflow-hidden border-slate-200/90 shadow-sm bg-white">
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
                      <div className="w-11 h-11 rounded-lg bg-emerald-500 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-emerald-200/60">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Queue is Clear
                      </span>

                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-1">
                        All Caught Up!
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-3.5 leading-relaxed">
                        There are currently no patients waiting in the queue for <strong className="text-slate-800 font-semibold">{activeQueue.sessionName}</strong>. New walk-in registrations and online bookings will appear here live.
                      </p>

                      {/* 2 Quick Action Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setIsPauseModalOpen(true)}
                          className="btn-secondary h-9 px-4 text-xs font-bold text-amber-700 hover:bg-amber-50/70 border-amber-200 flex items-center gap-1.5"
                        >
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>Take a Break</span>
                        </button>

                        <button
                          onClick={handleEndSession}
                          disabled={endSessionMutation.isPending}
                          className="btn-cancel h-9 px-4 text-xs font-bold flex items-center gap-1.5"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>End Session</span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="emr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  {activeQueue.currentPatientId || overridePatientId ? (
                    <ConsultationPage
                      patientId={overridePatientId || activeQueue.currentPatientId}
                      isEmbedded={true}
                      activeTokenId={activeQueue.currentTokenId}
                      branchId={activeQueue?.branchId}
                      isQueueExpanded={isQueueExpanded}
                      onHistoryOpen={() => setIsQueueExpanded(false)}
                      onConsultationSaved={() => {
                        queryClient.invalidateQueries({ queryKey: ["clinicalVisits"] });
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full p-8 text-center">
                      <p className="text-slate-500">
                        Patient is called, but no valid patient ID was found. (Walk-in without record)
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* End Session Modal */}
      {activeQueue && (
        <EndSessionModal
          isOpen={isEndSessionModalOpen}
          onClose={() => setIsEndSessionModalOpen(false)}
          onConfirm={confirmEndSession}
          doctorId={activeQueue.doctorId || effectiveDoctorId}
          branchId={branchId}
          currentSessionId={activeQueue.sessionId}
          waitingCount={activeQueue.waitingCount}
          skippedCount={activeQueue.skippedCount || 0}
          isPending={endSessionMutation.isPending}
        />
      )}

      {/* Pause Session Modal */}
      {activeQueue && (
        <PauseSessionModal
          isOpen={isPauseModalOpen}
          onClose={() => setIsPauseModalOpen(false)}
          onConfirm={(duration, reason) => pauseMutation.mutate({ duration, reason })}
          isPending={pauseMutation.isPending}
          doctorName={activeQueue.doctorName}
        />
      )}
    </div>
  )
}
