import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  ArrowLeft, RotateCcw, Power, Users, CheckCircle2, 
  Clock, AlertCircle, SkipForward, MessageSquare, 
  Play, Search, PlusCircle, Edit, UserCircle, Stethoscope, Phone, Settings, Activity, X, MonitorPlay, Share2, Pause, Star
} from "lucide-react"
// Removed unused import
import { queueService } from "@/services/queueService"
import { useQueueHub } from "@/hooks/useQueueHub"
import { useAuthStore } from "@/store/authStore"
import { useQueryClient } from "@tanstack/react-query"
import ManualBookingModal from "./ManualBookingModal"
import EndSessionModal from "./EndSessionModal"
import { motion, AnimatePresence } from "framer-motion"
import { usePermissions } from "@/hooks/usePermissions"

function LiveTimer({ startedAt }: { startedAt: string | null }) {
  const [elapsed, setElapsed] = useState(0)
  
  useEffect(() => {
    if (!startedAt) return;
    
    // Initial calculate
    setElapsed(Math.max(0, Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000)));

    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return null;

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full font-mono text-sm font-bold border border-rose-100 mt-4 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
      {mins}:{secs}
    </div>
  )
}

export default function QueueManager({ sessionData, onBack }: any) {
  const { doctor, session, queueId } = sessionData
  const { user, activeBranchId } = useAuthStore()
  const { can } = usePermissions()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'waiting' | 'completed' | 'skipped'>('waiting')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<any>(null)

  const { data: queue, refetch: refetchQueue, isFetching } = useQuery({
    queryKey: ['queueDetails', queueId],
    queryFn: () => queueService.getQueueDetails(queueId),
    refetchInterval: 3000, // Poll every 3 seconds as a fallback to SignalR
  })

  // Fallback: If SignalR misses the event, this polling will catch the status change
  useEffect(() => {
    if (!isFetching && queue && (queue.status === 3 || queue.status === 4)) {
      console.log("[QueueManager] Polling detected queue status ended:", queue.status);
      queryClient.removeQueries({ queryKey: ['activeQueue'] })
      queryClient.invalidateQueries({ queryKey: ['queueStats'] })
      onBack()
      setTimeout(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.has('mode')) {
           window.location.href = window.location.pathname;
        }
      }, 500);
    }
  }, [queue, onBack, queryClient])

  const targetBranchId = queue?.branchId || session?.branchId || doctor?.branchId || user?.branchId || activeBranchId
  const branchId = targetBranchId === 'org' ? null : targetBranchId

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId)
  })

  // SignalR Hook
  const connection = useQueueHub(branchId)
  useEffect(() => {
    if (connection) {
      const handleUpdate = (data: any) => {
        const incomingQueueId = String(data.queueId || data.QueueId || "").toLowerCase()
        const currentQueueId = String(queueId || "").toLowerCase()
        console.log(`[QueueManager] TokenUpdated received. Incoming QueueId: ${incomingQueueId}, Current QueueId: ${currentQueueId}`)
        
        if (incomingQueueId === currentQueueId) {
          console.log("[QueueManager] Queue IDs match, refetching tokens...")
          refetchQueue()
          refetchTokens()
        }
      }
      const handleEnd = (data: any) => {
        const incomingQueueId = String(data.queueId || data.QueueId || "").toLowerCase()
        console.log(`[QueueManager] QueueEnded received. Incoming: ${incomingQueueId}, Current: ${queueId}`)
        if (incomingQueueId === String(queueId || "").toLowerCase()) {
          console.log("[QueueManager] Queue IDs match, navigating back to overview...")
          queryClient.removeQueries({ queryKey: ['activeQueue'] })
          queryClient.invalidateQueries({ queryKey: ['queueStats'] })
          onBack()
          setTimeout(() => {
            const url = new URL(window.location.href);
            if (url.searchParams.has('mode')) {
               window.location.href = window.location.pathname;
            }
          }, 500);
        }
      }
      const handleDoctorArrived = (data: any) => {
        const incomingQueueId = String(data.queueId || data.QueueId || "").toLowerCase()
        const currentQueueId = String(queueId || "").toLowerCase()
        if (incomingQueueId === currentQueueId) {
          refetchQueue()
        }
      }
      connection.on('TokenUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      connection.on('DoctorArrived', handleDoctorArrived)
      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
        connection.off('DoctorArrived', handleDoctorArrived)
      }
    }
  }, [connection, queueId, refetchQueue, refetchTokens, onBack])

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const pauseMutation = useMutation({
    mutationFn: ({ duration, reason }: { duration: number, reason: string }) => queueService.pauseQueue(queueId, duration, reason),
    onSuccess: () => { refetchQueue(); refetchTokens(); setIsPauseModalOpen(false); }
  })

  const resumeMutation = useMutation({
    mutationFn: () => queueService.resumeQueue(queueId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const togglePriorityMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.togglePriority(tokenId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const markArrivedMutation = useMutation({
    mutationFn: () => queueService.markArrived(queueId),
    onSuccess: () => refetchQueue()
  })

  const skipMutation = useMutation({
    mutationFn: () => queueService.skipToken(queueId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const completeMutation = useMutation({
    mutationFn: () => queueService.completeToken(queueId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const requeueMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.requeueToken(tokenId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const updateTokenMutation = useMutation({
    mutationFn: (data: any) => queueService.updateToken(editingToken.id, data),
    onSuccess: () => {
      refetchQueue()
      refetchTokens()
      setEditingToken(null)
    }
  })

  const [cancelingToken, setCancelingToken] = useState<any>(null)
  const cancelTokenMutation = useMutation({
    mutationFn: ({ id, deletePatient }: { id: string, deletePatient: boolean }) => queueService.deleteToken(id, deletePatient),
    onSuccess: () => {
      refetchQueue()
      refetchTokens()
      setCancelingToken(null)
    }
  })

  const endQueueMutation = useMutation({
    mutationFn: (data?: { action?: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string }) => queueService.endQueue(queueId, data),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['queueDetails', queueId] })
      queryClient.removeQueries({ queryKey: ['upcomingTokens', queueId] })
      queryClient.removeQueries({ queryKey: ['activeQueue'] })
      queryClient.invalidateQueries({ queryKey: ['queueStats'] })
      setIsEndSessionModalOpen(false)
      onBack()
    }
  })

  const handleEndSession = () => {
    if (queue && (queue.waitingCount > 0 || queue.skippedCount > 0)) {
      setIsEndSessionModalOpen(true)
    } else {
      if (window.confirm("Are you sure you want to end this session?")) {
        endQueueMutation.mutate(undefined)
      }
    }
  }

  const confirmEndSession = (action: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string) => {
    endQueueMutation.mutate({ action, targetSessionId: targetSessionId || undefined })
  }

  if (!queue) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-slate-500 font-medium animate-pulse">Initializing Dashboard...</p>
    </div>
  )

  const isDoctorArrived = queue.status === 1 || queue.status === 2
  const hasActivePatient = queue.currentTokenNumber > 0 && queue.currentPatientName !== "No one"

  // Advanced Stats
  const totalTokens = (queue.waitingCount || 0) + (queue.completedCount || 0) + (queue.skippedCount || 0) + (hasActivePatient ? 1 : 0);
  const elapsedMinutes = queue.startedAt ? Math.max(0, (new Date().getTime() - new Date(queue.startedAt).getTime()) / 60000) : 0;
  const avgMinutes = queue.completedCount > 0 ? Math.round(elapsedMinutes / queue.completedCount) : 5; // default 5 min
  const etcMinutes = (queue.waitingCount || 0) * avgMinutes;
  const etcTime = new Date(new Date().getTime() + etcMinutes * 60000);
  const etcString = queue.waitingCount === 0 ? '--' : etcTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Top Navigation & Status Bar */}
      <div className="saas-card p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <button onClick={onBack} className="p-2.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200/60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-8 bg-slate-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {queue.doctorName || doctor?.name}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold rounded flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Live
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {queue.sessionName || session?.sessionName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {branchId && (
            <a
              href={`/tv/${branchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 h-[42px] rounded-lg text-sm font-bold transition-colors border border-indigo-200 shadow-sm"
              title="Open Queue TV Display"
            >
              <MonitorPlay className="w-4 h-4" />
              <span className="hidden sm:inline">Open TV</span>
            </a>
          )}
          <button 
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 h-[42px] rounded-lg text-sm font-bold transition-colors border border-slate-200 shadow-sm"
            title="Share Live Tracking Link"
          >
            <Share2 className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Share Link</span>
          </button>
          <button 
            onClick={() => { refetchQueue(); refetchTokens() }} 
            className="flex items-center justify-center w-[42px] h-[42px] bg-white text-slate-500 rounded-lg border border-slate-200/60 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          {can('Queue.EndSession') && queue.status === 2 ? (
            <button 
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 h-[42px] rounded-lg text-sm font-bold transition-colors border border-amber-200 shadow-sm"
              title="Resume Session"
            >
              {resumeMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline">Resume</span>
            </button>
          ) : can('Queue.EndSession') && queue.status !== 2 && (
            <button 
              onClick={() => setIsPauseModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 h-[42px] rounded-lg text-sm font-bold transition-colors border border-slate-200 shadow-sm"
              title="Pause Session"
            >
              <Pause className="w-4 h-4" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          )}

          {can('Queue.EndSession') && (
            <button 
              onClick={handleEndSession}
              disabled={endQueueMutation.isPending}
              className="btn-danger h-[42px]"
            >
              <Power className="w-4 h-4" /> <span className="hidden sm:inline">End Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Token Display & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Current Token */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="saas-card overflow-hidden relative flex-1 min-h-[320px]">
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Now Serving</span>
            </div>

            <div className="absolute top-6 right-6 flex items-center gap-4 text-right hidden sm:flex">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pacing</p>
                <p className="text-sm font-black text-slate-700">{avgMinutes} min/pat</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tokens</p>
                <p className="text-sm font-black text-slate-700">{totalTokens}</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Finish</p>
                <p className="text-sm font-black text-slate-700">{etcString}</p>
              </div>
            </div>

            {/* Session Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000" 
                style={{ width: `${totalTokens > 0 ? ((queue.completedCount || 0) / totalTokens) * 100 : 0}%` }}
              ></div>
            </div>

            {queue.status === 2 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50/90 z-20 backdrop-blur-sm">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-amber-500">
                  <Pause className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Session Paused</h2>
                <p className="text-slate-500 mt-2 font-medium max-w-sm text-center">
                  {queue.pauseReason || "The doctor is currently on a short break."}
                </p>
                {queue.pausedUntil && (
                  <p className="text-amber-600 font-bold mt-4 bg-amber-100 px-4 py-2 rounded-full text-sm">
                    Resuming at {new Date(queue.pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ) : (!hasActivePatient) && queue.waitingCount === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-slate-200">
                  <Users className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Queue is Empty</h2>
                <p className="text-slate-500 mt-2 font-medium">Add patients to begin consultation.</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={queue.currentTokenNumber}
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex flex-col items-center"
                  >
                    <div className="text-[140px] leading-none font-black text-slate-900 tracking-tighter mb-4 drop-shadow-sm">
                      {queue.currentTokenNumber || '--'}
                    </div>
                    
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-full">
                      <div className="w-8 h-8 bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-full flex items-center justify-center shadow-sm">
                        <UserCircle className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-bold text-indigo-900">
                        {queue.currentPatientName || 'Waiting for next...'}
                      </span>
                    </div>
                    
                    {hasActivePatient && queue.currentTokenCalledAt && (
                      <LiveTimer startedAt={queue.currentTokenCalledAt} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>


        </div>

        {/* Right Col: Controls */}
        <div className="lg:col-span-5 xl:col-span-4 saas-card p-6 flex flex-col h-full relative overflow-hidden">

          
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" /> Queue Controls
          </h3>

          <div className="flex flex-col gap-4 flex-1">
            {(!hasActivePatient) ? (
              can('Queue.CallNext') ? (
                <button
                  onClick={() => callNextMutation.mutate()}
                  disabled={callNextMutation.isPending || !isDoctorArrived || queue.waitingCount === 0 || queue.status === 2}
                  className="w-full py-6 bg-transparent border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  {callNextMutation.isPending ? (
                    <Activity className="w-8 h-8 animate-spin relative z-10" />
                  ) : (
                    <Play className="w-8 h-8 relative z-10 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-xl font-bold relative z-10">Call Next Patient</span>
                  {upcomingTokens?.find((t: any) => t.status === 0) && (
                    <span className="text-sm font-medium text-indigo-400 relative z-10">
                      Up Next: #{upcomingTokens.find((t: any) => t.status === 0).tokenNumber} - {upcomingTokens.find((t: any) => t.status === 0).patientName}
                    </span>
                  )}
                </button>
              ) : null
            ) : (
              <div className="flex flex-col gap-3">

                {can('Queue.CompleteToken') && (
                  <button
                    onClick={() => completeMutation.mutate()}
                    disabled={completeMutation.isPending}
                    className="w-full py-4 bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 group"
                  >
                    {completeMutation.isPending ? (
                      <Activity className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="font-bold">Finish Visit</span>
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-2">
              {can('Queue.SkipToken') && (
                <button
                  onClick={() => skipMutation.mutate()}
                  disabled={skipMutation.isPending || !hasActivePatient}
                  className="py-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <SkipForward className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  </div>
                  Skip Turn
                </button>
              )}
              
              {can('Queue.SendAlert') && (
                <button
                  disabled={!hasActivePatient}
                  className="py-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <MessageSquare className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  </div>
                  WhatsApp Alert
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            {can('Queue.MarkDoctorArrived') && (
              <button
                onClick={() => markArrivedMutation.mutate()}
                disabled={isDoctorArrived || markArrivedMutation.isPending}
                className={`w-full py-4 rounded-lg flex items-center justify-center gap-3 font-bold transition-all border-2 ${
                  isDoctorArrived 
                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-default' 
                    : 'bg-transparent border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {isDoctorArrived ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
                    Doctor Present
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-5 h-5" /> Mark Doctor Arrival
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Patient List Section */}
      <div className="saas-card overflow-hidden">
        {/* Custom Segmented Control Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex p-1 bg-slate-200/50 rounded-xl relative w-full sm:w-auto">
            {(['waiting', 'completed', 'skipped'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-lg capitalize transition-colors z-10 ${
                  activeTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                {tab === 'waiting' ? `Waiting (${queue.waitingCount || 0})` :
                 tab === 'completed' ? `Served (${queue.completedCount || 0})` :
                 `Skipped (${queue.skippedCount || 0})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
            {can('Queue.AddPatient') && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-primary"
              >
                <PlusCircle className="w-4 h-4" /> Add Patient
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white text-[11px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">Token Details</th>
                <th className="px-6 py-5">Contact Info</th>
                <th className="px-6 py-5">Arrival Time</th>
                <th className="px-6 py-5">Wait Duration</th>
                {activeTab === 'waiting' && <th className="px-6 py-5">Est. Turn</th>}
                <th className="px-6 py-5">Status</th>
                {activeTab !== 'completed' && <th className="px-6 py-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/80 bg-slate-50/20">
              {(() => {
                const filtered = upcomingTokens?.filter((t: any) => {
                  const matchesSearch = t.patientName.toLowerCase().includes(search.toLowerCase()) || 
                                        t.tokenNumber.toString().includes(search)
                  if (!matchesSearch) return false
                  if (activeTab === 'waiting') return t.status === 0
                  if (activeTab === 'completed') return t.status === 2
                  if (activeTab === 'skipped') return t.status === 3
                  return false
                })

                if (!filtered || filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-6 py-24 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-300 mb-4">
                          <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-slate-800 font-bold mb-1">No patients found</h3>
                        <p className="text-slate-500 text-sm">There are no patients in the '{activeTab}' list.</p>
                      </td>
                    </tr>
                  )
                }

                return filtered.map((t: any) => (
                  <motion.tr 
                    key={t.id} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="hover:bg-white transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl font-black flex items-center justify-center border ${t.isPriority ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                          {t.tokenNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{t.patientName}</p>
                            {t.isPriority && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" title="Priority Patient" />}
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">#{t.id.substring(0,8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {t.patientPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                         const waitMins = Math.floor((new Date().getTime() - new Date(t.createdAt).getTime()) / 60000);
                         const isLongWait = waitMins >= 60 && t.status === 0;
                         if (t.status === 2) return <span className="text-slate-400 text-xs font-medium">Finished</span>;
                         return (
                           <div className={`flex items-center gap-2 text-sm font-bold ${isLongWait ? 'text-rose-600' : 'text-slate-600'}`}>
                             {waitMins} mins
                             {isLongWait && <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" title="Waiting for more than 1 hour" />}
                           </div>
                         );
                      })()}
                    </td>
                    {activeTab === 'waiting' && (
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {(() => {
                           const position = filtered.indexOf(t) + 1;
                           const etaMins = position * avgMinutes;
                           const etaTime = new Date(new Date().getTime() + etaMins * 60000);
                           return (
                             <div className="flex items-center gap-1.5">
                               <Clock className="w-3.5 h-3.5 text-indigo-400" />
                               {etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </div>
                           )
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {t.status === 0 && <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-200/60 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending</span>}
                      {t.status === 2 && <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-200/60 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Served</span>}
                      {t.status === 3 && <span className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-200/60 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Skipped</span>}
                    </td>
                    {activeTab !== 'completed' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.status === 3 && can('Queue.RestoreToken') && (
                            <button onClick={() => requeueMutation.mutate(t.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 font-medium text-sm flex items-center gap-1" title="Requeue">
                              <RotateCcw className="w-4 h-4" /> Restore
                            </button>
                          )}
                          {t.status === 0 && can('Queue.CallNext') && (
                            <button 
                              onClick={() => togglePriorityMutation.mutate(t.id)} 
                              className={`p-2 rounded-lg transition-colors border border-transparent flex items-center gap-1 ${t.isPriority ? 'text-amber-500 hover:bg-amber-50 hover:border-amber-200' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 hover:border-slate-200'}`} 
                              title={t.isPriority ? "Remove Priority" : "Mark as Priority"}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          {t.status !== 2 && (
                            <>
                              {can('Queue.EditPatient') && (
                                <button onClick={() => setEditingToken(t)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Edit Patient">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {can('Queue.CancelToken') && (
                                <button onClick={() => setCancelingToken(t)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200" title="Cancel Token">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <ManualBookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        queueId={queueId}
        branchId={branchId}
        onSuccess={() => { refetchQueue(); refetchTokens() }}
      />

      <AnimatePresence>
        {editingToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingToken(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200/50"
            >
              <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Edit Token #{editingToken.tokenNumber}</h3>
                <button onClick={() => setEditingToken(null)} className="text-slate-400 hover:text-slate-600 rounded-full p-1"><X className="w-4 h-4"/></button>
              </div>
              <form noValidate 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  updateTokenMutation.mutate({
                    patientName: (form.elements.namedItem('patientName') as HTMLInputElement).value,
                    patientPhone: (form.elements.namedItem('patientPhone') as HTMLInputElement).value
                  });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Patient Name</label>
                  <input name="patientName" defaultValue={editingToken.patientName} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Phone Number</label>
                  <input name="patientPhone" defaultValue={editingToken.patientPhone} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingToken(null)} className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" disabled={updateTokenMutation.isPending} className="flex-[2] btn-primary">
                    {updateTokenMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelingToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancelingToken(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200/50"
            >
              <div className="px-6 py-4 border-b flex justify-between items-center bg-rose-50 text-rose-800">
                <h3 className="font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Cancel Token</h3>
                <button onClick={() => setCancelingToken(null)} className="text-rose-400 hover:text-rose-600 rounded-full p-1"><X className="w-4 h-4"/></button>
              </div>
              <form noValidate 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const deletePatient = (form.elements.namedItem('deletePatient') as HTMLInputElement)?.checked || false;
                  cancelTokenMutation.mutate({ id: cancelingToken.id, deletePatient });
                }}
                className="p-6 space-y-4"
              >
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Are you sure you want to cancel token <b>#{cancelingToken.tokenNumber}</b> for <b>{cancelingToken.patientName}</b>?
                </p>

                {can('Queue.CancelOfflinePatient') && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mt-4">
                    <input 
                      type="checkbox" 
                      id="deletePatient" 
                      name="deletePatient" 
                      className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="deletePatient" className="text-xs text-slate-600 font-medium cursor-pointer">
                      Also delete this offline patient record permanently (Only works if patient has no past medical history).
                    </label>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setCancelingToken(null)} className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">Go Back</button>
                  <button type="submit" disabled={cancelTokenMutation.isPending} className="flex-[2] btn-danger">
                    {cancelTokenMutation.isPending ? "Canceling..." : "Yes, Cancel It"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* End Session Modal */}
      {queue && (
        <EndSessionModal
          isOpen={isEndSessionModalOpen}
          onClose={() => setIsEndSessionModalOpen(false)}
          onConfirm={confirmEndSession}
          doctorId={queue.doctorId}
          branchId={branchId}
          currentSessionId={queue.sessionId}
          waitingCount={queue.waitingCount}
          skippedCount={queue.skippedCount}
          isPending={endQueueMutation.isPending}
        />
      )}
      {/* Pause Queue Modal */}
      <AnimatePresence>
        {isPauseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPauseModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200/50"
            >
              <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Pause className="w-5 h-5 text-amber-500"/> Pause Session</h3>
                <button onClick={() => setIsPauseModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1"><X className="w-4 h-4"/></button>
              </div>
              <form noValidate 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const duration = parseInt((form.elements.namedItem('duration') as HTMLInputElement).value);
                  const reason = (form.elements.namedItem('reason') as HTMLInputElement).value;
                  pauseMutation.mutate({ duration, reason });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Pause Duration (Minutes)</label>
                  <input type="number" name="duration" defaultValue={15} min={1} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-amber-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Reason (Optional)</label>
                  <input type="text" name="reason" placeholder="e.g. Doctor on a short break" defaultValue="Doctor on a short break" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-amber-500 transition-all" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsPauseModalOpen(false)} className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" disabled={pauseMutation.isPending} className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-sm">
                    {pauseMutation.isPending ? "Pausing..." : "Confirm Pause"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Live Tracking Link Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQrModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200/50 p-8 flex flex-col items-center text-center"
            >
              <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1"><X className="w-5 h-5"/></button>
              
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Share2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Live Tracking</h3>
              <p className="text-slate-500 text-sm mb-6">Patients can scan this QR code or visit the link below to track the queue live from their mobile devices.</p>
              
              {/* Dummy QR Code Image */}
              <div className="bg-white p-2 border-2 border-slate-200 rounded-xl mb-6">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/track/${queueId}`)}`} alt="Tracking QR Code" className="w-[180px] h-[180px]" />
              </div>
              
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-left">Tracking URL</label>
                <div className="flex gap-2">
                  <input readOnly value={`${window.location.origin}/track/${queueId}`} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600" />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${queueId}`); alert("Copied to clipboard!"); }}
                    className="px-4 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}
