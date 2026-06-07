import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { 
  ArrowLeft, RotateCcw, Power, Users, CheckCircle2, 
  Clock, AlertCircle, SkipForward, MessageSquare, 
  Play, Search, PlusCircle, Edit, UserCircle, Stethoscope, Phone, Settings, Activity
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { queueService } from "@/services/queueService"
import { useQueueHub } from "@/hooks/useQueueHub"
import { useAuthStore } from "@/store/authStore"
import ManualBookingModal from "./ManualBookingModal"
import { motion, AnimatePresence } from "framer-motion"

export default function QueueManager({ sessionData, onBack }: any) {
  const { doctor, session, queueId } = sessionData
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const branchId = user?.branchId

  const [activeTab, setActiveTab] = useState<'waiting' | 'completed' | 'skipped'>('waiting')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: queue, refetch: refetchQueue } = useQuery({
    queryKey: ['queueDetails', queueId],
    queryFn: () => queueService.getQueueDetails(queueId)
  })

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId)
  })

  // SignalR Hook
  const connection = useQueueHub(branchId)
  useEffect(() => {
    if (connection) {
      const handleUpdate = (data: any) => {
        const incomingQueueId = data.queueId || data.QueueId
        if (incomingQueueId === queueId) {
          refetchQueue()
          refetchTokens()
        }
      }
      const handleEnd = (data: any) => {
        const incomingQueueId = data.queueId || data.QueueId
        if (incomingQueueId === queueId) {
          onBack()
        }
      }
      connection.on('TokenUpdated', handleUpdate)
      connection.on('QueueEnded', handleEnd)
      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleEnd)
      }
    }
  }, [connection, queueId, refetchQueue, refetchTokens, onBack])

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
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

  const endQueueMutation = useMutation({
    mutationFn: () => queueService.endQueue(queueId),
    onSuccess: () => {
      const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}')
      Object.keys(startedSessions).forEach(key => {
        if (startedSessions[key] === queueId) delete startedSessions[key]
      })
      sessionStorage.setItem('started_sessions', JSON.stringify(startedSessions))
      onBack()
    }
  })

  const handleEndSession = () => {
    if (window.confirm("Are you sure you want to end this session?")) {
      endQueueMutation.mutate()
    }
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

  const isDoctorArrived = queue.status === 1
  const hasActivePatient = queue.currentTokenNumber > 0 && queue.currentPatientName !== "No one"

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Top Navigation & Status Bar */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <button onClick={onBack} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/60">
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
          <button 
            onClick={() => { refetchQueue(); refetchTokens() }} 
            className="p-2.5 bg-white text-slate-500 rounded-xl border border-slate-200/60 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleEndSession}
            disabled={endQueueMutation.isPending}
            className="btn-danger"
          >
            <Power className="w-4 h-4" /> End Session
          </button>
        </div>
      </div>

      {/* Main Grid: Token Display & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Current Token */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden relative flex-1 min-h-[320px]">
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Now Serving</span>
            </div>

            {(!hasActivePatient) && queue.waitingCount === 0 ? (
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
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Users className="w-6 h-6" /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{queue.waitingCount || 0}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waiting</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{queue.completedCount || 0}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Served</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><AlertCircle className="w-6 h-6" /></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{queue.skippedCount || 0}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skipped</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Controls */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" /> Queue Controls
          </h3>

          <div className="flex flex-col gap-4 flex-1">
            {(!hasActivePatient) ? (
              <button
                onClick={() => callNextMutation.mutate()}
                disabled={callNextMutation.isPending || !isDoctorArrived || queue.waitingCount === 0}
                className="w-full py-6 bg-transparent border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {callNextMutation.isPending ? (
                  <Activity className="w-8 h-8 animate-spin relative z-10" />
                ) : (
                  <Play className="w-8 h-8 relative z-10 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-xl font-bold relative z-10">Call Next Patient</span>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate(`/consult/${queue.currentPatientId}`)}
                  className="w-full py-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group"
                >
                  <Stethoscope className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">Open Consultation Workspace</span>
                </button>
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="w-full py-4 bg-transparent border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 group"
                >
                  {completeMutation.isPending ? (
                    <Activity className="w-6 h-6 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-bold">Finish Visit</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                onClick={() => skipMutation.mutate()}
                disabled={skipMutation.isPending || !hasActivePatient}
                className="py-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <SkipForward className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                </div>
                Skip Turn
              </button>
              
              <button
                disabled={!hasActivePatient}
                className="py-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <MessageSquare className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                </div>
                WhatsApp Alert
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => markArrivedMutation.mutate()}
              disabled={isDoctorArrived || markArrivedMutation.isPending}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border-2 ${
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
          </div>
        </div>
      </div>

      {/* Patient List Section */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
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
                {tab}
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
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              <PlusCircle className="w-4 h-4" /> Add Patient
            </button>
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
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center border border-indigo-100">
                          {t.tokenNumber}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{t.patientName}</p>
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
                      {t.status === 0 && <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-200/60 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending</span>}
                      {t.status === 2 && <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-200/60 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Served</span>}
                      {t.status === 3 && <span className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-200/60 inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Skipped</span>}
                    </td>
                    {activeTab !== 'completed' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.status === 3 && (
                            <button onClick={() => requeueMutation.mutate(t.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 font-medium text-sm flex items-center gap-1" title="Requeue">
                              <RotateCcw className="w-4 h-4" /> Restore
                            </button>
                          )}
                          {t.status !== 2 && (
                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Edit Patient">
                              <Edit className="w-4 h-4" />
                            </button>
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
    </motion.div>
  )
}
