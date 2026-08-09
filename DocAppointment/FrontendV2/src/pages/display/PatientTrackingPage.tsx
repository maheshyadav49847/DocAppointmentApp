import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useQueueHub } from "@/hooks/useQueueHub"
import { queueService } from "@/services/queueService"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Clock, MapPin, Users, HeartPulse, ShieldCheck, AlertCircle, Pause } from "lucide-react"

export default function PatientTrackingPage() {
  const { queueId } = useParams()
  const navigate = useNavigate()

  const { data: queue, refetch, isError, isLoading } = useQuery({
    queryKey: ['patientTracking', queueId],
    queryFn: () => queueService.getQueueDetails(queueId as string),
    enabled: !!queueId,
    refetchInterval: 5000 // Poll every 5 seconds as fallback
  })

  const connection = useQueueHub(queue?.branchId || "org")
  useEffect(() => {
    if (connection) {
      const handleUpdate = (data: any) => {
        if (String(data.queueId || data.QueueId || "").toLowerCase() === queueId?.toLowerCase()) {
          refetch()
        }
      }
      connection.on('TokenUpdated', handleUpdate)
      connection.on('DoctorArrived', handleUpdate)
      connection.on('QueueEnded', handleUpdate)
      connection.on('QueueStarted', handleUpdate)
      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('DoctorArrived', handleUpdate)
        connection.off('QueueEnded', handleUpdate)
        connection.off('QueueStarted', handleUpdate)
      }
    }
  }, [connection, queueId, refetch])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading Live Tracking...</p>
      </div>
    )
  }

  if (isError || !queue) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Queue Not Found</h2>
        <p className="text-slate-500 max-w-sm mb-8">The session you are looking for does not exist or has ended.</p>
      </div>
    )
  }

  const isDoctorArrived = queue.status === 1
  const hasActivePatient = queue.currentTokenNumber > 0 && queue.currentPatientName !== "No one"
  const isPaused = queue.status === 2

  const avgMinutes = queue.completedCount > 0 && queue.startedAt 
    ? Math.round(Math.max(0, (new Date().getTime() - new Date(queue.startedAt).getTime()) / 60000) / queue.completedCount) 
    : 5;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Live Tracking</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{queue.sessionName || "Consultation"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Live</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Doctor Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-black">
            {queue.doctorName?.charAt(0) || "D"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{queue.doctorName}</h2>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1 font-medium">
              <MapPin className="w-4 h-4" /> Consultation Room
            </div>
          </div>
        </div>

        {/* Status Area */}
        <div className="relative">
          {isPaused ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-amber-50 rounded-3xl p-8 border border-amber-200 shadow-sm text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pause className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-amber-800 tracking-tight mb-2">Doctor on Break</h2>
              <p className="text-amber-700/80 font-medium text-sm">
                {queue.pauseReason || "The session is temporarily paused."}
              </p>
              {queue.pausedUntil && (
                <div className="mt-6 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-amber-200 shadow-sm text-amber-600 font-bold text-sm">
                  <Clock className="w-4 h-4" /> Resumes at {new Date(queue.pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </motion.div>
          ) : !hasActivePatient ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Waiting to start</h3>
              <p className="text-sm text-slate-500 font-medium">No patient is currently being served.</p>
            </div>
          ) : (
            <motion.div
              key={queue.currentTokenNumber}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              
              <div className="flex items-center justify-center gap-2 mb-6 text-indigo-100 font-bold text-xs uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Now Serving
              </div>

              <div className="text-[7rem] leading-none font-black tracking-tighter drop-shadow-md mb-6">
                {queue.currentTokenNumber}
              </div>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 inline-block w-full max-w-[280px]">
                <p className="font-bold text-lg truncate drop-shadow-sm">{queue.currentPatientName}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Users className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-3xl font-black text-slate-800 mb-1 tabular-nums tracking-tight">{queue.waitingCount ?? 0}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waiting</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Clock className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-3xl font-black text-slate-800 mb-1 tabular-nums tracking-tight">~{avgMinutes}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min/Patient</p>
          </div>
        </div>

        {/* Your Info Card placeholder */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
          <p className="text-sm font-medium text-slate-500 mb-4">Want to track your own position?</p>
          <div className="flex justify-center gap-2">
             <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold border border-slate-200 shadow-inner">
               1
             </div>
             <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold border border-slate-200 shadow-inner">
               2
             </div>
             <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold border border-slate-200 shadow-inner">
               3
             </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Check your SMS or WhatsApp receipt for your token number.</p>
        </div>

      </main>
    </div>
  )
}
