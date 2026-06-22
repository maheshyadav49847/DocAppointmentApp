import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useQueueHub } from "@/hooks/useQueueHub"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Stethoscope } from "lucide-react"
import { BrandLogo } from "@/components/BrandLogo"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1.0"

export default function TvDisplayPage() {
  const { branchId } = useParams()

  const { data: queues, refetch } = useQuery({
    queryKey: ['tvQueues', branchId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/Queue/branch/${branchId}/active`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!branchId,
    refetchInterval: 15000
  })

  const connection = useQueueHub(branchId || "org")

  useEffect(() => {
    if (connection) {
      const handleUpdate = () => refetch()
      connection.on('TokenUpdated', handleUpdate)
      connection.on('QueueEnded', handleUpdate)
      return () => {
        connection.off('TokenUpdated', handleUpdate)
        connection.off('QueueEnded', handleUpdate)
      }
    }
  }, [connection, refetch])

  if (!branchId) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-8">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 max-w-md w-full text-center border border-slate-100">
          <Activity className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-slate-800 mb-2">TV Setup</h1>
          <p className="text-slate-500 mb-6 text-lg">Please provide a valid branch ID.</p>
        </div>
      </div>
    )
  }

  const activeQueues = queues || []
  const isSingle = activeQueues.length === 1
  const isEmpty = activeQueues.length === 0

  return (
    <div className="h-screen w-screen bg-[#f8fafc] text-slate-900 overflow-hidden flex flex-col selection:bg-indigo-100" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Global Header */}
      <header className="px-10 py-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          {/* Responsive BrandLogo */}
          <div className="md:hidden">
            <BrandLogo theme="light" size="sm" />
          </div>
          <div className="hidden md:block lg:hidden">
            <BrandLogo theme="light" size="md" />
          </div>
          <div className="hidden lg:block xl:hidden">
            <BrandLogo theme="light" size="lg" />
          </div>
          <div className="hidden xl:block">
            <BrandLogo theme="light" size="xl" />
          </div>
          <div className="w-[2px] h-10 bg-slate-200 rounded-full hidden sm:block"></div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Token Display</h1>
            <p className="text-slate-500 text-sm font-medium tracking-wide">Please wait for your turn</p>
          </div>
        </div>
        <LiveClock />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden px-8 pb-8 flex flex-col">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-100/40"
            >
              <div className="w-40 h-40 rounded-full bg-slate-50 border-4 border-slate-100 flex items-center justify-center mb-8 shadow-inner">
                <Stethoscope className="w-20 h-20 text-slate-300" />
              </div>
              <h2 className="text-5xl font-black text-slate-300 mb-4 tracking-tight">No Active Queues</h2>
              <p className="text-slate-400 text-2xl font-medium">Consultation will begin shortly</p>
            </motion.div>
          ) : isSingle ? (
            <SingleDoctorView queue={activeQueues[0]} key="single" />
          ) : (
            <MultiDoctorView queues={activeQueues} key="multi" />
          )}
        </AnimatePresence>
      </main>

    </div>
  )
}

/* ─── Single Doctor: Ultra Premium Layout ─── */
function SingleDoctorView({ queue }: { queue: any }) {
  const hasCurrent = queue.currentTokenNumber > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full w-full flex flex-col bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.1)] overflow-hidden relative"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

      {/* Doctor Header */}
      <div className="px-12 py-10 flex items-center justify-between border-b border-slate-100 bg-white/60 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-lg shadow-indigo-200">
            {queue.doctorName?.charAt(0) || "D"}
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-800 tracking-tight">{queue.doctorName}</h2>
            <p className="text-indigo-500 text-lg font-bold uppercase tracking-[0.2em] mt-1.5">Consultation Room</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <StatCard label="Waiting" value={queue.waitingCount ?? 0} color="slate" />
          <StatCard label="Done" value={queue.completedCount ?? 0} color="emerald" />
          <StatCard label="Skipped" value={queue.skippedCount ?? 0} color="rose" />
        </div>
      </div>

      {/* Giant Token Display */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        {hasCurrent ? (
          <motion.div
            key={queue.currentTokenNumber}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 100 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-slate-400 uppercase tracking-[0.4em] text-2xl font-bold">Now Serving</p>
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
              <div className="relative text-[20rem] font-black leading-none text-indigo-600 tracking-tighter drop-shadow-sm tabular-nums">
                {queue.currentTokenNumber}
              </div>
            </div>

            <div className="mt-8 bg-slate-50 border border-slate-100 rounded-lg px-12 py-4 shadow-sm">
              <p className="text-4xl font-bold text-slate-700 tracking-tight">{queue.currentPatientName}</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="text-[12rem] font-black text-slate-100 mb-4 leading-none">—</div>
            <p className="text-3xl text-slate-400 font-bold uppercase tracking-widest">Waiting to start</p>
          </div>
        )}
      </div>

      {/* Upcoming Tokens Strip */}
      <div className="px-12 py-8 bg-slate-50/80 border-t border-slate-100 flex items-center gap-8 z-10 backdrop-blur-sm">
        <div className="shrink-0 flex items-center gap-4">
          <div className="w-2.5 h-12 rounded-full bg-indigo-400"></div>
          <p className="text-slate-500 uppercase tracking-[0.25em] text-xl font-black">Up Next</p>
        </div>
        <div className="flex gap-4 flex-wrap flex-1 ml-4">
          {queue.upcomingTokens && queue.upcomingTokens.length > 0 ? (
            queue.upcomingTokens.map((t: number, i: number) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border-2 border-slate-200 text-slate-800 px-8 py-4 rounded-lg text-4xl font-black tabular-nums shadow-sm"
              >
                {t}
              </motion.div>
            ))
          ) : (
            <span className="text-slate-400 text-xl font-medium italic">No patients waiting in queue</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Multi Doctor: Premium Grid ─── */
function MultiDoctorView({ queues }: { queues: any[] }) {
  const cols = queues.length <= 2 ? 'grid-cols-2' :
               queues.length <= 3 ? 'grid-cols-3' :
               queues.length <= 4 ? 'grid-cols-2 grid-rows-2' :
               'grid-cols-3 grid-rows-2'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`h-full grid ${cols} gap-6`}
    >
      {queues.map((q: any) => (
        <DoctorCard key={q.id} queue={q} />
      ))}
    </motion.div>
  )
}

/* ─── Doctor Card ─── */
function DoctorCard({ queue }: { queue: any }) {
  const hasCurrent = queue.currentTokenNumber > 0

  return (
    <motion.div
      layout
      className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col shadow-[0_10px_40px_-10px_rgba(79,70,229,0.08)] relative"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between z-10 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-indigo-50 flex items-center justify-center text-2xl font-black text-indigo-600 shrink-0">
            {queue.doctorName?.charAt(0) || "D"}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 truncate">{queue.doctorName}</h2>
            <p className="text-indigo-500 text-xs font-bold uppercase tracking-widest mt-0.5">Consult Room</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0 items-end">
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-amber-400"></span>
             <span className="text-slate-600 font-bold text-sm">{queue.waitingCount ?? 0} waiting</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
             <span className="text-slate-600 font-bold text-sm">{queue.completedCount ?? 0} done</span>
           </div>
        </div>
      </div>

      {/* Token Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
        <p className="text-slate-400 uppercase tracking-[0.3em] text-sm font-bold mb-4">Now Serving</p>
        {hasCurrent ? (
          <motion.div
            key={queue.currentTokenNumber}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="flex flex-col items-center"
          >
            <div className="text-[9rem] font-black text-indigo-600 leading-none tabular-nums tracking-tighter drop-shadow-sm">
              {queue.currentTokenNumber}
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-6 py-2 mt-6">
              <p className="text-2xl font-bold text-slate-700 truncate max-w-full">{queue.currentPatientName}</p>
            </div>
          </motion.div>
        ) : (
          <div className="text-8xl font-black text-slate-100 py-6">—</div>
        )}
      </div>

      {/* Upcoming */}
      <div className="px-8 pb-6 pt-5 bg-slate-50/50 border-t border-slate-100 z-10">
        <p className="text-slate-400 uppercase tracking-widest text-[11px] font-bold mb-3">Up Next</p>
        <div className="flex gap-3 flex-wrap">
          {queue.upcomingTokens?.length > 0 ? (
            queue.upcomingTokens.slice(0, 5).map((t: number) => (
              <span key={t} className="bg-white text-slate-700 border-2 border-slate-100 px-5 py-2 rounded-xl text-xl font-black tabular-nums shadow-sm">
                {t}
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-sm font-medium italic">Empty queue</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Massive Stat Card for Single View ─── */
function StatCard({ label, value, color }: { label: string; value: number; color: 'slate' | 'emerald' | 'rose' }) {
  const colorMap = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
  }
  
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg px-8 py-5 text-center flex flex-col justify-center min-w-[140px]">
      <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className={`text-7xl font-black tabular-nums leading-none ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

/* ─── Live Clock ─── */
function LiveClock() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  useEffect(() => {
    const interval = setInterval(() => {
      document.getElementById('tv-clock')?.setAttribute('data-tick', Date.now().toString())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div id="tv-clock" className="text-right flex flex-col items-end">
      <div className="text-3xl font-black text-slate-800 tabular-nums tracking-tight">{timeStr}</div>
      <div className="text-sm text-slate-500 font-semibold uppercase tracking-widest mt-1">{dateStr}</div>
    </div>
  )
}
