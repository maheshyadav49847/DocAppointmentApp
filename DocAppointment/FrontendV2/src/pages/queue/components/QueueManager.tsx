import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  CreditCard, Printer,
  User, Save, ArrowLeft, RotateCcw, Power, Users, CheckCircle2, ReceiptIndianRupee, 
  Clock, AlertCircle, SkipForward, MessageSquare, 
  Play, Search, PlusCircle, SquarePen, UserCircle, Stethoscope, Phone, Settings, Activity, X, MonitorPlay, Share2, Pause, Star, Smartphone, Send, UserCheck
} from "lucide-react"
// Removed unused import
import { queueService } from "@/services/queueService"
import { branchService } from "@/services/branchService"
import { useQueueHub } from "@/hooks/useQueueHub"
import { useAuthStore } from "@/store/authStore"
import { useQueryClient } from "@tanstack/react-query"
import ManualBookingModal from "./ManualBookingModal"
import EndSessionModal from "./EndSessionModal"
import PauseSessionModal from "./PauseSessionModal"
import QuickInvoiceModal from "./QuickInvoiceModal"
import RecordPaymentModal from './RecordPaymentModal';

import { motion, AnimatePresence } from "framer-motion"
import { usePermissions } from "@/hooks/usePermissions"
import PhoneInput from "@/components/PhoneInput"

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

  const [activeTab, setActiveTab] = useState<'waiting' | 'completed' | 'skipped' | 'cancelled'>('waiting')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<any>(null)
  const [paymentToken, setPaymentToken] = useState<any>(null);


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
  const organizationId = user?.orgId

  const { data: myBranches = [] } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchService.getMyBranches(),
    enabled: !!user
  })
  const activeBranch = myBranches.find((b: any) => b.id === targetBranchId || b.id === activeBranchId)

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId),
    refetchInterval: 3000, // Poll every 3 seconds alongside queueDetails
  })

  // SignalR Hook
  const connection = useQueueHub(branchId)
  useEffect(() => {
    if (connection) {
      const handleUpdate = (data: any) => {
        const incomingQueueId = String(data?.queueId || data?.QueueId || "").toLowerCase()
        const currentQueueId = String(queueId || "").toLowerCase()
        console.log(`[QueueManager] Event received. Incoming QueueId: ${incomingQueueId}, Current QueueId: ${currentQueueId}`, data)
        
        if (!incomingQueueId || incomingQueueId === currentQueueId) {
          console.log("[QueueManager] Refetching queue and tokens...")
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
      connection.on('TokenCreated', handleUpdate)
      connection.on('InvoiceUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      connection.on('DoctorArrived', handleDoctorArrived)
      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('TokenCreated', handleUpdate)
        connection.off('InvoiceUpdated', handleUpdate)
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
  const [billingToken, setBillingToken] = useState<any>(null)
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
      <div className="saas-card p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/30">
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-white text-slate-600 rounded hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-200/80 shadow-xs group"
            title="Return to Queue Overview"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="w-9 h-9 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-indigo-50 flex-shrink-0">
            {((queue.doctorName || doctor?.name || 'Dr').replace(/^Dr\.?\s*/i, ''))[0]?.toUpperCase() || 'D'}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {queue.doctorName || doctor?.name}
              </h2>
              {queue.status === 2 ? (
                <span className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold rounded-sm flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-xs bg-amber-500"></span> Paused
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-sm flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 animate-pulse"></span> Live Session
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-xs font-medium">
                <Clock className="w-3 h-3" /> {queue.sessionName || session?.sessionName || 'OPD Session'}
              </span>
              <span className="text-slate-300">•</span>
              <span>Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 flex-wrap">
          {branchId && (
            <a
              href={`/tv/${branchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 h-[38px] rounded text-xs font-bold transition-all border border-indigo-200/80 shadow-2xs hover:shadow-xs"
              title="Open Queue TV Display in new tab"
            >
              <MonitorPlay className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Waiting Room TV</span>
            </a>
          )}
          
          <button 
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 h-[38px] rounded text-xs font-bold transition-all border border-slate-200 shadow-2xs hover:shadow-xs"
            title="Share Live Tracking Link / QR Code"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Share QR</span>
          </button>
          
          <button 
            onClick={() => { refetchQueue(); refetchTokens() }} 
            className="flex items-center justify-center w-[38px] h-[38px] bg-white text-slate-500 rounded border border-slate-200 hover:bg-slate-50 hover:text-slate-800 shadow-2xs transition-colors"
            title="Sync Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          {can('Queue.EndSession') && queue.status === 2 ? (
            <button 
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-[38px] rounded text-xs font-bold transition-all shadow-sm shadow-emerald-200"
              title="Resume Consultation"
            >
              {resumeMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>Resume Session</span>
            </button>
          ) : can('Queue.EndSession') && queue.status !== 2 && (
            <button 
              onClick={() => setIsPauseModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 px-3.5 h-[38px] rounded text-xs font-bold transition-all border border-amber-200 shadow-2xs hover:shadow-xs"
              title="Pause Consultation"
            >
              <Pause className="w-4 h-4 text-amber-600" />
              <span>Pause</span>
            </button>
          )}

          {can('Queue.EndSession') && (
            <button 
              onClick={handleEndSession}
              disabled={endQueueMutation.isPending}
              className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 h-[38px] rounded text-xs font-bold transition-all border border-rose-200 shadow-2xs"
              title="Close and wrap up session"
            >
              <Power className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">End Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Token Display & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Current Token Card */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="saas-card overflow-hidden relative flex-1 min-h-[350px] bg-gradient-to-br from-white via-white to-indigo-50/20 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            {/* Top Bar inside Card */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Now Serving Chamber</span>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Pacing</p>
                  <p className="text-xs font-black text-slate-700">{avgMinutes} min/patient</p>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tokens</p>
                  <p className="text-xs font-black text-indigo-600">{totalTokens}</p>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Completion</p>
                  <p className="text-xs font-black text-slate-700">{etcString}</p>
                </div>
              </div>
            </div>

            {/* Session Progress Bar */}
            <div className="h-1 bg-slate-100 w-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000" 
                style={{ width: `${totalTokens > 0 ? ((queue.completedCount || 0) / totalTokens) * 100 : 0}%` }}
              ></div>
            </div>

            {/* Central Stage */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              {queue.status === 2 ? (
                <div className="flex flex-col items-center justify-center text-center max-w-md py-6">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shadow-xs mb-4 ring-8 ring-amber-50">
                    <Pause className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-sm mb-2 uppercase tracking-wide">
                    Consultations On Hold
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Session is Temporarily Paused</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    {queue.pauseReason || "The doctor has stepped away for a short procedure or break."}
                  </p>
                  {queue.pausedUntil && (
                    <div className="text-amber-700 font-bold mt-3 bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 rounded-sm text-xs flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Expected resume at {new Date(queue.pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ) : (!hasActivePatient) && queue.waitingCount === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mb-3">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Queue is Clear</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs font-medium">All registered patients have been attended to or no new bookings yet.</p>
                  {can('Queue.AddPatient') && (
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-md transition-all flex items-center gap-2 shadow-2xs"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Walk-in Patient
                    </button>
                  )}
                </div>
              ) : (!hasActivePatient) ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3 ring-8 ring-indigo-50/50">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-sm mb-2 uppercase tracking-wide">
                    Chamber Ready
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">No Patient In Consultation</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">
                    Doctor is ready. Tap <strong className="text-indigo-600">Call Next Patient</strong> from the controls to summon the next queued token.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={queue.currentTokenNumber}
                    initial={{ y: 15, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -15, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="flex flex-col items-center text-center my-auto"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-sm flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> In Consultation
                      </span>
                    </div>

                    <div className="text-[100px] sm:text-[120px] leading-none font-black text-slate-900 tracking-tighter drop-shadow-sm my-1">
                      {queue.currentTokenNumber || '--'}
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-50/80 border border-indigo-100 rounded-md shadow-2xs mt-1">
                      <UserCircle className="w-5 h-5 text-indigo-600" />
                      <span className="text-base font-bold text-indigo-950">
                        {queue.currentPatientName || 'Patient In Consultation'}
                      </span>
                    </div>
                    
                    {hasActivePatient && queue.currentTokenCalledAt && (
                      <div className="mt-3">
                        <LiveTimer startedAt={queue.currentTokenCalledAt} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Bottom Card Footer */}
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Waiting: {queue.waitingCount || 0}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed: {queue.completedCount || 0}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span> Skipped: {queue.skippedCount || 0}
                </span>
              </div>
              <div className="hidden sm:block text-slate-400 font-medium">
                Real-time Sync Active
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Controls */}
        <div className="lg:col-span-5 xl:col-span-4 saas-card p-6 flex flex-col justify-between relative overflow-hidden border border-slate-200/80 shadow-sm bg-white">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <Settings className="w-4 h-4 text-indigo-600" /> Queue Action Center
              </h3>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                Controls
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              {(!hasActivePatient) ? (
                can('Queue.CallNext') ? (
                  <button
                    onClick={() => callNextMutation.mutate()}
                    disabled={callNextMutation.isPending || !isDoctorArrived || queue.waitingCount === 0 || queue.status === 2}
                    className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded flex flex-col items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      {callNextMutation.isPending ? (
                        <Activity className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-base font-black tracking-tight">Call Next Patient</span>
                    </div>
                    {upcomingTokens?.find((t: any) => t.status === 0) ? (
                      <span className="text-xs font-semibold text-indigo-100 bg-white/10 px-3 py-0.5 rounded-sm">
                        Up Next: #{upcomingTokens.find((t: any) => t.status === 0).tokenNumber} • {upcomingTokens.find((t: any) => t.status === 0).patientName}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-indigo-200">
                        {queue.waitingCount === 0 ? "No patients waiting" : "Ready to call next in line"}
                      </span>
                    )}
                  </button>
                ) : null
              ) : (
                <div className="flex flex-col gap-2">
                  {can('Queue.CompleteToken') && (
                    <button
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-100 disabled:opacity-50 font-black text-sm group"
                    >
                      {completeMutation.isPending ? (
                        <Activity className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      )}
                      <span>Finish & Complete Visit</span>
                    </button>
                  )}
                </div>
              )}

              {/* Secondary Actions: Skip & WhatsApp Alert */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                {can('Queue.SkipToken') && (
                  <button
                    onClick={() => skipMutation.mutate()}
                    disabled={skipMutation.isPending || !hasActivePatient}
                    className="p-3 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200/80 text-slate-700 hover:text-rose-700 rounded flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none group shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded bg-white group-hover:bg-rose-100 flex items-center justify-center transition-colors shadow-2xs">
                      <SkipForward className="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-colors" />
                    </div>
                    <span>Skip Turn</span>
                  </button>
                )}
                
                {can('Queue.SendAlert') && (
                  <button
                    disabled={!hasActivePatient}
                    className="p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/80 text-slate-700 hover:text-emerald-700 rounded flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none group shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded bg-white group-hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-2xs">
                      <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <span>WhatsApp Alert</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Doctor Presence Card / Status */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            {can('Queue.MarkDoctorArrived') && (
              isDoctorArrived ? (
                <div className="w-full p-3 bg-emerald-50 border border-emerald-200/80 rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">Doctor Present & In Chamber</p>
                      <p className="text-[11px] text-emerald-700 font-medium">Session unlocked for calling</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-xs bg-emerald-500"></span>
                </div>
              ) : (
                <button
                  onClick={() => markArrivedMutation.mutate()}
                  disabled={markArrivedMutation.isPending}
                  className="w-full py-3 px-4 rounded flex items-center justify-center gap-2.5 font-bold text-xs transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm shadow-amber-100"
                >
                  <Stethoscope className="w-4 h-4 animate-pulse" />
                  <span>Mark Doctor Arrival</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Patient List Section */}
      <div className="saas-card overflow-hidden border border-slate-200/80 shadow-sm bg-white rounded">
        {/* Custom Segmented Control Header */}
        <div className="p-3.5 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex p-1 bg-slate-200/60 rounded relative w-full sm:w-auto">
            {(['waiting', 'completed', 'skipped', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-xs capitalize transition-all z-10 ${
                  activeTab === tab ? 'text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white rounded-xs shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                {tab === 'waiting' ? `Waiting (${(queue.waitingCount || 0) + (hasActivePatient ? 1 : 0)})` :
                 tab === 'completed' ? `Served (${queue.completedCount || 0})` :
                 tab === 'skipped' ? `Skipped (${queue.skippedCount || 0})` :
                 `Cancelled (${queue.cancelledCount || 0})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeTab} list...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
            {can('Queue.AddPatient') && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 h-[36px] rounded text-xs font-bold transition-all shadow-2xs shadow-indigo-100"
              >
                <PlusCircle className="w-4 h-4" /> Add Patient
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase font-black tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Token Details</th>
                <th className="px-6 py-3.5">Contact Info</th>
                <th className="px-6 py-3.5">Booking Time</th>
                <th className="px-6 py-3.5">Wait Duration</th>
                {activeTab === 'waiting' && <th className="px-6 py-3.5">Est. Turn</th>}
                <th className="px-6 py-3.5">Status</th>
                {activeTab !== 'cancelled' && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(() => {
                const filtered = upcomingTokens?.filter((t: any) => {
                  const matchesSearch = t.patientName.toLowerCase().includes(search.toLowerCase()) || 
                                        t.tokenNumber.toString().includes(search)
                  if (!matchesSearch) return false
                  if (activeTab === 'waiting') return t.status === 0 || t.status === 1
                  if (activeTab === 'completed') return t.status === 2
                  if (activeTab === 'skipped') return t.status === 3
                  if (activeTab === 'cancelled') return t.status === 4
                  return false
                })

                if (!filtered || filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-100 text-slate-400 mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-0.5">No patients in this view</h4>
                        <p className="text-slate-500 text-xs">There are currently no records under the '{activeTab}' filter.</p>
                      </td>
                    </tr>
                  )
                }

                return filtered.map((t: any) => (
                  <motion.tr 
                    key={t.id} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded font-black text-sm flex items-center justify-center border shadow-2xs ${t.isPriority ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          {t.tokenNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 text-xs">{t.patientName}</p>
                            {t.isPriority && <span title="Priority Patient"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /></span>}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 inline-block rounded-xs font-mono">CX-{t.id.substring(0,6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                        {t.source === 0 ? <span title="WhatsApp Booking"><Smartphone className="w-3.5 h-3.5 text-emerald-500" /></span> :
                         t.source === 3 ? <span title="Telegram Booking"><Send className="w-3.5 h-3.5 text-sky-500" /></span> :
                         <span title="Walk-in/Phone Booking"><Phone className="w-3.5 h-3.5 text-slate-400" /></span>}
                        <span>{t.patientPhone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                     <td className="px-6 py-3.5">
                      {(() => {
                         if (t.status === 1) return <span className="text-emerald-700 text-xs font-bold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> In Consultation</span>;
                         if (t.status === 2) return <span className="text-slate-400 text-xs font-medium">Finished</span>;
                         if (t.status === 4) return <span className="text-slate-400 text-xs font-medium">Cancelled</span>;
                         const waitMins = Math.floor((new Date().getTime() - new Date(t.createdAt).getTime()) / 60000);
                         const isLongWait = waitMins >= 60 && t.status === 0;
                         return (
                           <div className={`flex items-center gap-1.5 text-xs font-bold ${isLongWait ? 'text-rose-600' : 'text-slate-600'}`}>
                             <span>{waitMins} mins</span>
                             {isLongWait && <span title="Waiting for more than 1 hour"><AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" /></span>}
                           </div>
                         );
                      })()}
                    </td>
                    {activeTab === 'waiting' && (
                      <td className="px-6 py-3.5 text-slate-600 font-medium">
                        {(() => {
                           if (t.status === 1) {
                             return (
                               <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                 Current
                               </span>
                             );
                           }
                           const position = filtered.filter((item: any) => item.status === 0).indexOf(t) + 1;
                           const etaMins = position * avgMinutes;
                           const etaTime = new Date(new Date().getTime() + etaMins * 60000);
                           return (
                             <div className="flex items-center gap-1.5 text-xs">
                               <Clock className="w-3.5 h-3.5 text-indigo-400" />
                               <span>{etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                           )
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-3.5">
                      {t.status === 0 && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending</span>}
                      {t.status === 1 && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Serving</span>}
                      {t.status === 2 && <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-full border border-indigo-200 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Served</span>}
                      {t.status === 3 && <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-full border border-rose-200 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Skipped</span>}
                      {t.status === 4 && <span className="px-2.5 py-0.5 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-full border border-slate-200 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Cancelled</span>}
                    </td>
                    {activeTab !== 'cancelled' && (
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 1 && can('Queue.CompleteToken') && (
                            <button 
                              onClick={() => completeMutation.mutate()} 
                              disabled={completeMutation.isPending}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs" 
                              title="Finish Visit"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Finish
                            </button>
                          )}
                          {t.status === 3 && can('Queue.RestoreToken') && (
                            <button onClick={() => requeueMutation.mutate(t.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 text-xs font-bold flex items-center gap-1" title="Restore Token">
                              <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                          )}
                          {t.status === 0 && can('Queue.CallNext') && (
                            <button 
                              onClick={() => togglePriorityMutation.mutate(t.id)} 
                              className={`p-1.5 rounded-lg transition-colors border ${t.isPriority ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50 border-slate-200'}`} 
                              title={t.isPriority ? "Remove Priority" : "Mark as Priority"}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {t.status === 2 && !t.invoiceId && (
                            <button onClick={() => setBillingToken(t)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200" title="Generate Invoice">
                              <ReceiptIndianRupee className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {t.status === 2 && t.invoiceId && (t.invoiceStatus === 0 || t.invoiceStatus === 1) && (
                            <button onClick={() => setPaymentToken(t)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200" title="Record Payment">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {t.status === 2 && t.invoiceId && t.invoiceStatus === 2 && (
                            <button 
                              onClick={() => {
                                import('@/utils/printHelper').then(m => m.handlePrintInvoice(t.invoiceId, organizationId, activeBranch));
                              }} 
                              className="px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 flex items-center gap-1 font-bold text-xs shadow-2xs" 
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Print</span>
                            </button>
                          )}
                          {t.status !== 2 && (
                            <>
                              {can('Queue.EditPatient') && (
                                <button onClick={() => setEditingToken(t)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200" title="Edit Patient">
                                  <SquarePen className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {can('Queue.CancelToken') && (
                                <button onClick={() => setCancelingToken(t)} className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200" title="Cancel Token">
                                  <X className="w-3.5 h-3.5" />
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

      <QuickInvoiceModal 
        isOpen={!!billingToken} 
        onClose={() => { setBillingToken(null); refetchTokens(); refetchQueue(); }} 
        onSuccess={() => { refetchTokens(); refetchQueue(); }}
        billingToken={billingToken} 
      />

      {paymentToken && (
        <RecordPaymentModal 
          invoiceId={paymentToken.invoiceId}
          patientName={paymentToken.patientName}
          onClose={() => { setPaymentToken(null); refetchTokens(); refetchQueue(); }}
          onPrint={(invId) => { 
            setPaymentToken(null); 
            refetchTokens();
            refetchQueue();
            import('@/utils/printHelper').then(m => m.handlePrintInvoice(invId, organizationId, activeBranch)); 
          }}
        />
      )}

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
              className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200"
            >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <SquarePen className="w-4 h-4" />
                    </div>
                    Edit Token #{editingToken.tokenNumber}
                  </h2>
                  <button 
                    onClick={() => setEditingToken(null)} 
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              <form noValidate autoComplete="off" 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  updateTokenMutation.mutate({
                    patientName: (form.elements.namedItem('patientName') as HTMLInputElement).value,
                    patientPhone: (form.elements.namedItem('patientPhone') as HTMLInputElement).value,
                    patientPhoneDialCode: (form.elements.namedItem('patientPhoneDialCode') as HTMLInputElement).value
                  });
                }}
                className="p-6 space-y-4"
              >
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5 ml-1">
                      <User className="w-4 h-4 text-blue-500" /> Patient Name
                    </label>
                    <input autoComplete="off" name="patientName" defaultValue={editingToken.patientName} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5 ml-1">
                      <Phone className="w-4 h-4 text-green-500" /> Phone Number
                    </label>
                    <PhoneInput 
                      name="patientPhone" 
                      dialCodeName="patientPhoneDialCode"
                      defaultValue={editingToken.patientPhone}
                      defaultDialCode={editingToken.patientPhoneDialCode || '+91'}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setEditingToken(null)} className="flex-1 btn-cancel py-2.5 px-4">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button type="submit" disabled={updateTokenMutation.isPending} className="flex-[2] btn-primary flex items-center justify-center gap-2">
                      {updateTokenMutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
              className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200"
            >
              <div className="px-6 py-4 border-b flex justify-between items-center bg-rose-50 text-rose-800">
                <h3 className="font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Cancel Token</h3>
                <button onClick={() => setCancelingToken(null)} className="text-rose-400 hover:text-rose-600 rounded p-1"><X className="w-4 h-4"/></button>
              </div>
              <form noValidate autoComplete="off" 
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
                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded mt-4">
                    <input autoComplete="off" 
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
                  <button type="button" onClick={() => setCancelingToken(null)} className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded font-bold hover:bg-slate-200 transition-all">Go Back</button>
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
      {/* Pause Session Modal */}
      <PauseSessionModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onConfirm={(duration, reason) => pauseMutation.mutate({ duration, reason })}
        isPending={pauseMutation.isPending}
        doctorName={doctor?.name}
      />

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
              className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden relative z-10 border border-slate-200 p-8 flex flex-col items-center text-center"
            >
              <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded p-1"><X className="w-5 h-5"/></button>
              
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center mb-4">
                <Share2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Live Tracking</h3>
              <p className="text-slate-500 text-sm mb-6">Patients can scan this QR code or visit the link below to track the queue live from their mobile devices.</p>
              
              {/* Dummy QR Code Image */}
              <div className="bg-white p-2 border-2 border-slate-200 rounded mb-6">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/track/${queueId}`)}`} alt="Tracking QR Code" className="w-[180px] h-[180px]" />
              </div>
              
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-left">Tracking URL</label>
                <div className="flex gap-2">
                  <input autoComplete="off" readOnly value={`${window.location.origin}/track/${queueId}`} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600" />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${queueId}`); alert("Copied to clipboard!"); }}
                    className="px-4 bg-indigo-50 text-indigo-600 rounded text-sm font-bold hover:bg-indigo-100 transition-colors"
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
