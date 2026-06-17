import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Users, Activity, CheckCircle2, 
  Loader2, Bell, Play, MonitorPlay
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { queueService } from "@/services/queueService"
import { sessionService } from "@/services/sessionService"
import { useQueueHub } from "@/hooks/useQueueHub"
import ConsultationPage from "./ConsultationPage"
import { motion, AnimatePresence } from "framer-motion"

export default function DoctorDeskPage() {
  const { user, activeBranchId } = useAuthStore()
  const queryClient = useQueryClient()
  
  const { data: activeQueue, isLoading: isQueueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['doctorActiveQueue', user?.doctorId],
    queryFn: () => queueService.getActiveQueue(user?.doctorId || ""),
    enabled: !!user?.doctorId
  })

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

      connection.on('TokenUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      
      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
      }
    }
  }, [connection, queueId, refetchQueue, refetchTokens])

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
    onSuccess: () => { refetchQueue(); refetchTokens() }
  })

  const completeMutation = useMutation({
    mutationFn: () => queueService.completeToken(queueId),
    onSuccess: () => { 
      refetchQueue(); 
      refetchTokens();
      // Optional: Show a toast here
    }
  })

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
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
          <Activity className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700">No Active Session</h2>
        <p className="text-slate-500 text-center max-w-md mb-6">
          You don't have any active queue right now. You can start one of your assigned sessions below.
        </p>

        {isSessionsLoading ? (
          <div className="flex items-center gap-2 text-indigo-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading your sessions...</span>
          </div>
        ) : sessions?.length > 0 ? (
          <div className="grid gap-4 w-full max-w-md">
            {sessions.map((session: any) => (
              <div key={session.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{session.sessionName || 'Consultation Session'}</h3>
                  <p className="text-sm text-slate-500">{session.startTime} - {session.endTime}</p>
                </div>
                <button
                  onClick={() => initializeQueueMutation.mutate(session.id)}
                  disabled={initializeQueueMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {initializeQueueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Start
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm max-w-md text-center">
            You don't have any sessions assigned. Please ask the administrator to assign sessions to you.
          </div>
        )}
      </div>
    )
  }

  const hasCurrentPatient = activeQueue.currentTokenNumber > 0 && activeQueue.currentPatientName !== "No one"
  const pendingTokens = upcomingTokens?.filter((t: any) => t.status === 0) || []

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Top Bar for Doctor Desk */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            My Consultation Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your active queue and consultations</p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/tv/${branchId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-200"
            title="Open Queue TV Display in a new tab"
          >
            <MonitorPlay className="w-4 h-4 text-indigo-500" />
            Open TV View
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Active EMR or Call Next Prompt */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
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
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-6 h-6" />
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
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          
          {/* Current Patient Status Bar (if any) */}
          {hasCurrentPatient && (
            <div className="p-4 bg-indigo-600 text-white shrink-0">
              <div className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Current Patient</div>
              <div className="font-bold text-lg truncate mb-4">{activeQueue.currentPatientName} (Token #{activeQueue.currentTokenNumber})</div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>
                <button 
                  onClick={() => callNextMutation.mutate()}
                  disabled={callNextMutation.isPending || pendingTokens.length === 0}
                  className="bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Call Next
                </button>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Up Next
            </h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingTokens.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pendingTokens.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-100 mb-2" />
                No pending patients
              </div>
            ) : (
              pendingTokens.map((token: any) => (
                <div key={token.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-3 relative overflow-hidden group">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 shadow-sm">
                    {token.tokenNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{token.patientName}</p>
                    <p className="text-xs text-slate-500 truncate">{token.patientPhone || 'No Phone'}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
