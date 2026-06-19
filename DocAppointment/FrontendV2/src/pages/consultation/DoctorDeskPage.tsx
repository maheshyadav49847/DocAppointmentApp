import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Users, Activity, CheckCircle2,
  Loader2, Bell, Play, MonitorPlay, Power, RotateCcw, AlertCircle, ChevronDown, ChevronUp, Building2, Stethoscope
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { queueService } from "@/services/queueService"
import { sessionService } from "@/services/sessionService"
import { branchService } from "@/services/branchService"
import { useQueueHub } from "@/hooks/useQueueHub"
import ConsultationPage from "./ConsultationPage"
import EndSessionModal from "../queue/components/EndSessionModal"
import { motion, AnimatePresence } from "framer-motion"

export default function DoctorDeskPage() {
  const { user, activeBranchId } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: activeQueue, isLoading: isQueueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['doctorActiveQueue', user?.doctorId],
    queryFn: () => queueService.getActiveQueue(user?.doctorId || ""),
    enabled: !!user?.doctorId
  })

  const { data: branches } = useQuery({
    queryKey: ['branches', user?.orgId],
    queryFn: () => branchService.getBranches(user?.orgId!),
    enabled: !!user?.orgId && !activeQueue
  })

  const [isQueueExpanded, setIsQueueExpanded] = useState(false)

  const queueId = activeQueue?.id

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId),
    enabled: !!queueId
  })

  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['doctorSessions', user?.doctorId],
    queryFn: () => sessionService.getSessions(user?.doctorId || ""),
    enabled: !activeQueue && !!user?.doctorId && !isQueueLoading
  })

  const initializeQueueMutation = useMutation({
    mutationFn: (sessionId: string) => queueService.initializeQueue(user?.doctorId || "", sessionId),
    onSuccess: () => {
      refetchQueue()
    }
  })

  // SignalR
  const branchId = activeBranchId || user?.branchId || "org"
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
        }
      }

      const handleStart = () => {
        queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] })
      }

      connection.on('TokenUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      connection.on('QueueStarted', handleStart)

      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
        connection.off('QueueStarted', handleStart)
      }
    }
  }, [connection, queueId, refetchQueue, refetchTokens])

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const [sidebarTab, setSidebarTab] = useState<'pending' | 'skipped'>('pending')

  const completeMutation = useMutation({
    mutationFn: () => queueService.completeToken(queueId),
    onSuccess: () => {
      refetchQueue();
      refetchTokens();
      // Optional: Show a toast here
    }
  })

  const requeueMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.requeueToken(tokenId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false)

  const endSessionMutation = useMutation({
    mutationFn: (data?: { action?: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string }) =>
      queueService.endQueue(queueId, data),
    onSuccess: () => {
      setIsEndSessionModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] })
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
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Desk...</p>
      </div>
    )
  }

  if (!activeQueue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl p-10 max-w-3xl w-full text-center relative overflow-hidden"
        >
          {/* Background decorative blob */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100/50">
            <MonitorPlay className="w-10 h-10 text-indigo-600" />
          </div>

          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Ready to Start?</h2>
          <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto">
            You don't have an active consultation queue right now. Select a session below to begin.
          </p>

          <div className="text-left relative z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-1">Your Assigned Sessions</h3>

            {isSessionsLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-indigo-500 bg-slate-50 rounded-2xl border border-slate-100">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-medium">Loading your sessions...</span>
              </div>
            ) : sessions?.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {sessions.map((session: any) => (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    key={session.id}
                    className="bg-white group border-2 border-slate-100 hover:border-indigo-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between"
                  >
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <Activity className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-xl group-hover:text-indigo-700 transition-colors line-clamp-1">{session.sessionName || 'Consultation Session'}</h3>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-semibold">
                          {session.startTime} - {session.endTime}
                        </span>
                        {branches?.find((b: any) => b.id === session.branchId)?.name && (
                          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-indigo-100">
                            <Building2 className="w-4 h-4" />
                            {branches.find((b: any) => b.id === session.branchId).name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => initializeQueueMutation.mutate(session.id)}
                      disabled={initializeQueueMutation.isPending}
                      className="w-full bg-transparent border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 text-indigo-700 py-3 rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {initializeQueueMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Start Session
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-amber-50 text-amber-800 p-8 rounded-2xl border border-amber-200 text-center flex flex-col items-center">
                <Bell className="w-10 h-10 mb-3 text-amber-500 opacity-80" />
                <p className="font-bold text-lg">You don't have any sessions assigned today.</p>
                <p className="text-sm opacity-80 mt-1 max-w-sm">Please ask the administrator to schedule a session for you to start receiving patients.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  const hasCurrentPatient = activeQueue.currentTokenNumber > 0 && activeQueue.currentPatientName !== "No one"
  const pendingTokens = upcomingTokens?.filter((t: any) => t.status === 0) || []
  const skippedTokens = upcomingTokens?.filter((t: any) => t.status === 3) || []

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] space-y-4">
      {/* Page Header (Outside the Card) */}
      <div className="shrink-0 px-2 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">My</span>
              <span className="text-indigo-600">Desk</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Manage your active queue and consultations.
            </p>
          </div>
        </div>

        {activeQueue?.branchName && (
          <div className="flex flex-col gap-1.5 sm:ml-auto">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full pr-1 flex items-center sm:justify-end gap-1">
              <Building2 className="w-3 h-3 text-indigo-400" /> Branch Location
            </label>
            <select
              disabled
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all hover:border-indigo-300 disabled:opacity-80 disabled:bg-slate-50 min-w-[200px]"
            >
              <option>{activeQueue.branchName}</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Card (Exactly as it was) */}
      <div className="flex-1 flex flex-col bg-slate-50/50 rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">

        {/* Top Bar inside the Card (Only actions now) */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-end shrink-0 shadow-sm gap-4 z-20">
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleEndSession}
              disabled={endSessionMutation.isPending}
              className="flex items-center gap-2 bg-transparent hover:bg-rose-50 text-rose-600 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-rose-200"
              title="End current session"
            >
              {endSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              <span className="hidden sm:inline">End Session</span>
            </button>
            <a
              href={`/tv/${branchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-transparent hover:bg-slate-50 text-slate-700 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-200"
              title="Open Queue TV Display in a new tab"
            >
              <MonitorPlay className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">TV View</span>
            </a>
            <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="flex flex-col items-center justify-center min-w-[60px]">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Waiting</span>
                <span className="text-xl font-black text-indigo-700 leading-none">{activeQueue.waitingCount}</span>
              </div>
              <div className="w-px h-8 bg-indigo-200"></div>
              <div className="flex flex-col items-center justify-center min-w-[60px]">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Done</span>
                <span className="text-xl font-black text-emerald-700 leading-none">{activeQueue.completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left Side: Active EMR or Call Next Prompt */}
          <div className="flex-1 flex flex-col overflow-y-auto relative min-h-0">
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
                  <button
                    onClick={() => callNextMutation.mutate()}
                    disabled={callNextMutation.isPending || pendingTokens.length === 0}
                    className="bg-transparent border-2 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-sm flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                  >
                    {callNextMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Users className="w-6 h-6" />}
                    Call Next Patient
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="emr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  {activeQueue.currentPatientId ? (
                    <ConsultationPage patientId={activeQueue.currentPatientId} isEmbedded={true} />
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

          {/* Right Side: Up Next Sidebar */}
          <div className={`w-full lg:w-80 min-h-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${isQueueExpanded ? "h-[50vh] lg:h-auto" : "h-auto lg:h-auto"}`}>

            {/* Current Patient Status Bar (if any) */}
            {hasCurrentPatient && (
              <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0">
                <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Current Patient</div>
                <div className="font-bold text-lg text-slate-800 truncate mb-4">{activeQueue.currentPatientName} <span className="text-sm font-medium text-slate-500 ml-1">#{activeQueue.currentTokenNumber}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => completeMutation.mutate()}
                    disabled={completeMutation.isPending}
                    className="bg-transparent border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {completeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Complete
                  </button>
                  <button
                    onClick={() => callNextMutation.mutate()}
                    disabled={callNextMutation.isPending || pendingTokens.length === 0}
                    className="bg-transparent border border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {callNextMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    Call Next
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Collapse Toggle */}
            <div
              className="lg:hidden flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50 cursor-pointer"
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
            >
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Queue ({pendingTokens.length} waiting)
              </span>
              <button className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
                {isQueueExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>

            <div className={`flex-col flex-1 overflow-hidden ${!isQueueExpanded ? "hidden lg:flex" : "flex"}`}>
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
                        <button
                          onClick={() => requeueMutation.mutate(token.id)}
                          disabled={requeueMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 p-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-sm border border-indigo-100 transition-all absolute right-3"
                          title="Restore to queue"
                        >
                          {requeueMutation.isPending && requeueMutation.variables === token.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
      {/* End Session Modal */}
      {activeQueue && (
        <EndSessionModal
          isOpen={isEndSessionModalOpen}
          onClose={() => setIsEndSessionModalOpen(false)}
          onConfirm={confirmEndSession}
          doctorId={activeQueue.doctorId || user?.doctorId || ""}
          branchId={branchId}
          currentSessionId={activeQueue.sessionId}
          waitingCount={activeQueue.waitingCount}
          skippedCount={activeQueue.skippedCount || 0}
          isPending={endSessionMutation.isPending}
        />
      )}
    </div>
  )
}
