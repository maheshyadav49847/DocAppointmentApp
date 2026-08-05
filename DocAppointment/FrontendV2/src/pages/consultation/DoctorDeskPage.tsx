import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Users, Activity, CheckCircle2,
  Loader2, Bell, Play, MonitorPlay, Power, RotateCcw, AlertCircle, X, Building2, Stethoscope, Clock
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { usePermissions } from "@/hooks/usePermissions"
import { queueService } from "@/services/queueService"
import { sessionService } from "@/services/sessionService"
import { useQueueHub } from "@/hooks/useQueueHub"
import ConsultationPage from "./ConsultationPage"
import EndSessionModal from "../queue/components/EndSessionModal"
import SearchPatientModal from "./components/SearchPatientModal"
import { motion, AnimatePresence } from "framer-motion"
import { PageLoader } from "@/components/ui/PageLoader"

export default function DoctorDeskPage() {
  const { user } = useAuthStore()
  const { can } = usePermissions()
  const activeBranchId = useAuthStore(state => state.activeBranchId)
  const queryClient = useQueryClient()

  const { data: allDoctors } = useQuery({
    queryKey: ['doctordesk-org-doctors', activeBranchId],
    queryFn: () => queueService.getDoctors(activeBranchId || "org"),
    enabled: !user?.doctorId
  })

  const effectiveDoctorId = user?.doctorId || (allDoctors && allDoctors.length > 0 ? allDoctors[0].id : "");

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
  const [isSearchPatientModalOpen, setIsSearchPatientModalOpen] = useState(false)
  const [overridePatientId, setOverridePatientId] = useState<string | null>(null)

  const queueId = activeQueue?.id

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId),
    enabled: !!queueId
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
        const incomingQueueId = String(data.queueId || data.QueueId || "").toLowerCase()
        const currentQueueId = String(queueId || "").toLowerCase()
        if (!queueId || incomingQueueId === currentQueueId) {
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
      connection.on('QueueEnded', handleEnd)
      connection.on('QueueStarted', handleStart)
      connection.on('DoctorArrived', handleDoctorArrived)

      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
        connection.off('QueueStarted', handleStart)
        connection.off('DoctorArrived', handleDoctorArrived)
      }
    }
  }, [connection, queueId, refetchQueue, refetchTokens])

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

  const quickStartMutation = useMutation({
    mutationFn: () => queueService.quickStart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] })
      queryClient.removeQueries({ queryKey: ['activeQueue'] })
      queryClient.invalidateQueries({ queryKey: ['queue-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['doctorSessions'] })
      refetchQueue()
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

  if (!activeQueue) {
    const uniqueBranchIds = Array.from(new Set(sessions?.map((s: any) => s.branchId) || []))
    const filterBranches = branches?.filter((b: any) => uniqueBranchIds.includes(b.id)) || []
    
    const actualDeskBranch = (activeBranchId && filterBranches.some((b: any) => b.id === activeBranchId))
      ? activeBranchId
      : (filterBranches.length > 0 ? filterBranches[0].id : '')

    const filteredSessions = sessions?.filter((s: any) => s.branchId === actualDeskBranch) || []

    return (
      <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 mb-6 shrink-0">
          <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
            <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
              <MonitorPlay className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
                <span className="text-slate-900">Doctor</span>
                <span className="text-indigo-600">Desk</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Ready to start? Select a session below to begin your consultation queue.</p>
            </div>
          </div>


        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 pl-1">Your Assigned Sessions</h3>

          {isSessionsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-indigo-500 bg-slate-50 rounded-xl border border-slate-100">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium">Loading your sessions...</span>
            </div>
          ) : filteredSessions?.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSessions.map((session: any) => (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  key={session.id}
                  className="bg-white group border border-slate-200 rounded-2xl p-6 shadow-sm transition-all text-left flex flex-col justify-between"
                >
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 border border-indigo-100/50">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors line-clamp-1">{session.sessionName || 'Consultation Session'}</h3>
                    <div className="mt-3 flex flex-col gap-2">
                      <span className="inline-flex items-center gap-2 text-slate-600 text-sm font-semibold">
                        <MonitorPlay className="w-4 h-4 text-slate-400" /> {session.startTime} - {session.endTime}
                      </span>
                      {branches?.find((b: any) => b.id === session.branchId)?.name && (
                        <span className="inline-flex items-center gap-2 text-indigo-700 text-sm font-semibold">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          {branches?.find((b: any) => b.id === session.branchId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => initializeQueueMutation.mutate(session.id)}
                    disabled={initializeQueueMutation.isPending}
                    className="w-full bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {initializeQueueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-indigo-600" />}
                    Start Session
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center flex flex-col items-center max-w-lg shadow-sm">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Play className="w-8 h-8 ml-1" />
              </div>
              <h3 className="font-extrabold text-2xl text-slate-900 mb-2">Start Consulting</h3>
              <p className="text-slate-500 mb-6 font-medium text-sm">
                No active session found for today. Click below to instantly create a walk-in session and start your queue.
              </p>
              <button
                onClick={() => quickStartMutation.mutate()}
                disabled={quickStartMutation.isPending}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {quickStartMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                Quick Start Walk-in Session
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const hasCurrentPatient = activeQueue.currentTokenNumber > 0 && activeQueue.currentPatientName !== "No one"
  const pendingTokens = upcomingTokens?.filter((t: any) => t.status === 0) || []
  const skippedTokens = upcomingTokens?.filter((t: any) => t.status === 3) || []

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-6rem)] space-y-4 pb-10 lg:pb-0">
      {/* Page Header (Outside the Card) */}
      <div className="shrink-0 px-2 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <MonitorPlay className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">My</span>
              <span className="text-indigo-600">Desk</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Manage your active queue and consultations.
            </p>
          </div>
        </div>

      </div>

      {/* Main Card (Exactly as it was) */}
      <div className="flex-1 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200 shadow-sm overflow-visible lg:overflow-hidden min-h-0">

        {/* Top Bar inside the Card */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm gap-3 sm:gap-4 z-20">
          
          {/* LEFT SIDE: Session Info */}
          {activeQueue && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight flex items-center gap-2 flex-wrap">
                  <span className="truncate">{activeQueue.sessionName}</span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold rounded flex items-center gap-1 uppercase tracking-wider shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                  </span>
                </h3>
              </div>
            </div>
          )}

          {/* RIGHT SIDE: Actions */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              {can('DoctorDesk.MarkDoctorArrived') && (
                <button
                  onClick={() => markArrivedMutation.mutate()}
                  disabled={activeQueue.status === 1 || markArrivedMutation.isPending}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors border ${
                    activeQueue.status === 1
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default'
                      : 'bg-transparent hover:bg-indigo-50 text-indigo-600 border-indigo-200'
                  } w-auto`}
                  title={activeQueue.status === 1 ? "Doctor is present" : "Mark Arrival"}
                >
                  {activeQueue.status === 1 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Arrived</span>
                    </>
                  ) : (
                    <>
                      {markArrivedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4 sm:w-4 sm:h-4" />}
                      <span className="hidden sm:inline">Mark Arrival</span>
                    </>
                  )}
                </button>
              )}
              {can('DoctorDesk.EndSession') && (
                <button
                  onClick={handleEndSession}
                  disabled={endSessionMutation.isPending}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 bg-transparent hover:bg-rose-50 text-rose-600 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors border border-rose-200 w-10 sm:w-auto"
                  title="End current session"
                >
                  {endSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4 sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">End Session</span>
                </button>
              )}
              <a
                href={`/tv/${branchId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-transparent hover:bg-slate-50 text-slate-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors border border-slate-200 w-10 sm:w-auto"
                title="Open Queue TV Display in a new tab"
              >
                <MonitorPlay className="w-4 h-4 sm:w-4 sm:h-4 text-indigo-500" />
                <span className="hidden sm:inline">TV View</span>
              </a>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 px-3 sm:px-4 py-1 sm:py-2 rounded-xl flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-center">
              <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px]">
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5 sm:mb-1">Waiting</span>
                <span className="text-lg sm:text-xl font-black text-indigo-700 leading-none">{activeQueue.waitingCount}</span>
              </div>
              <div className="w-px h-6 sm:h-8 bg-indigo-200"></div>
              <div className="flex flex-col items-center justify-center min-w-[50px] sm:min-w-[60px]">
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5 sm:mb-1">Done</span>
                <span className="text-lg sm:text-xl font-black text-emerald-700 leading-none">{activeQueue.completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden min-h-0 relative">

          {/* Floating Button for Queue */}
          {!isQueueExpanded && (
            <button
              onClick={() => setIsQueueExpanded(true)}
              className="group fixed right-0 top-[150px] h-[48px] min-w-[44px] bg-white/90 backdrop-blur-sm text-indigo-600 shadow-[-4px_4px_12px_rgba(0,0,0,0.05)] z-40 flex items-center justify-center border border-r-0 border-b-0 border-slate-200 rounded-tl-xl transition-all active:scale-95 px-2.5 hover:bg-white"
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
          <div className={`bg-white flex flex-col shrink-0 fixed inset-y-0 right-0 w-[85vw] max-w-[350px] z-50 border-l border-slate-200 transition-all duration-300 ease-out transform ${isQueueExpanded ? "translate-x-0 shadow-[-20px_0_40px_rgba(0,0,0,0.2)]" : "translate-x-full shadow-none"}`}>

            {/* Collapse Toggle */}
            <div
              className={`flex items-center p-3 border-b border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors justify-between`}
              onClick={() => setIsQueueExpanded(false)}
              title="Collapse Queue"
            >
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Queue ({pendingTokens.length} waiting)
              </span>
              <button className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex-col flex-1 overflow-hidden flex`}>
              {/* Current Patient Status Bar (if any) */}
              {hasCurrentPatient && (
                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0">
                  <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Current Patient</div>
                  <div className="font-bold text-lg text-slate-800 truncate mb-4">{activeQueue.currentPatientName} <span className="text-sm font-medium text-slate-500 ml-1">#{activeQueue.currentTokenNumber}</span></div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setIsSearchPatientModalOpen(true)}
                      className="bg-transparent border border-sky-200 hover:border-sky-500 hover:bg-sky-50 text-sky-700 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Consult Another (Same Token)
                    </button>
                    {can('DoctorDesk.CompleteToken') && (
                      <button
                        onClick={() => completeMutation.mutate()}
                        disabled={completeMutation.isPending}
                        className="bg-transparent border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {completeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Complete & Next Token
                      </button>
                    )}
                    {can('DoctorDesk.CallNext') && (
                      <button
                        onClick={() => callNextMutation.mutate()}
                        disabled={callNextMutation.isPending || pendingTokens.length === 0 || activeQueue.status !== 1}
                        className="bg-transparent border border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {callNextMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                        Call Next Waiting
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="p-2 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex bg-slate-200/50 rounded-lg p-1 w-full relative">
                  <button
                    onClick={() => setSidebarTab('pending')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors relative z-10 ${sidebarTab === 'pending' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {sidebarTab === 'pending' && <motion.div layoutId="sidebarTab" className="absolute inset-0 bg-white shadow-sm rounded-md" style={{ zIndex: -1 }} />}
                    Up Next ({pendingTokens.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('skipped')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors relative z-10 ${sidebarTab === 'skipped' ? 'text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {sidebarTab === 'skipped' && <motion.div layoutId="sidebarTab" className="absolute inset-0 bg-white shadow-sm rounded-md" style={{ zIndex: -1 }} />}
                    Skipped ({skippedTokens.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sidebarTab === 'pending' ? (
                  pendingTokens.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-100 mb-2" />
                      No pending patients
                    </div>
                  ) : (
                    pendingTokens.map((token: any) => (
                      <div key={token.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-3 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 shadow-sm">
                          {token.tokenNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{token.patientName}</p>
                          <p className="text-xs text-slate-500 truncate">{token.patientPhone || 'No Phone'}</p>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  skippedTokens.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 text-slate-200 mb-2" />
                      No skipped patients
                    </div>
                  ) : (
                    skippedTokens.map((token: any) => (
                      <div key={token.id} className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-3 relative overflow-hidden group">
                        <div className="w-10 h-10 rounded-full bg-white border border-rose-200 flex items-center justify-center font-bold text-rose-700 shrink-0 shadow-sm">
                          {token.tokenNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm truncate">{token.patientName}</p>
                          <p className="text-xs text-slate-500 truncate">{token.patientPhone || 'No Phone'}</p>
                        </div>
                        {can('DoctorDesk.RestoreToken') && (
                          <button
                            onClick={() => requeueMutation.mutate(token.id)}
                            disabled={requeueMutation.isPending}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-sm border border-indigo-100 transition-all absolute right-3"
                            title="Restore to queue"
                          >
                            {requeueMutation.isPending && requeueMutation.variables === token.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
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
          <div className="flex-1 flex flex-col overflow-y-auto relative min-h-0 bg-slate-50">
            <AnimatePresence mode="wait">
              {!hasCurrentPatient ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 border-8 border-indigo-100/50">
                    <Bell className="w-10 h-10 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready for your next patient?</h2>
                  <p className="text-slate-500 mb-8 max-w-sm">
                    You have {activeQueue.waitingCount} patients waiting in your queue right now.
                  </p>
                  {can('DoctorDesk.CallNext') && (
                    <button
                      onClick={() => callNextMutation.mutate()}
                      disabled={callNextMutation.isPending || pendingTokens.length === 0 || activeQueue.status !== 1}
                      className="bg-transparent border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 px-8 py-4 rounded-lg font-bold text-lg shadow-sm flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                    >
                      {callNextMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Users className="w-6 h-6" />}
                      Call Next Patient
                    </button>
                  )}
                  {activeQueue.status !== 1 && (
                    <p className="mt-4 text-sm font-bold text-amber-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Please mark your arrival first</p>
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
                      isQueueExpanded={isQueueExpanded}
                      onHistoryOpen={() => setIsQueueExpanded(false)}
                      onConsultationSaved={() => {
                        if (activeQueue.currentTokenId && activeQueue.status === 1) {
                          completeMutation.mutate();
                          setTimeout(() => {
                            if (pendingTokens.length > 0) {
                              callNextMutation.mutate();
                            }
                          }, 1000);
                        }
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

      {/* Search Patient Modal */}
      <SearchPatientModal
        isOpen={isSearchPatientModalOpen}
        onClose={() => setIsSearchPatientModalOpen(false)}
        onSelectPatient={(id) => {
          setOverridePatientId(id)
          setIsSearchPatientModalOpen(false)
        }}
      />
    </div>
  )
}
