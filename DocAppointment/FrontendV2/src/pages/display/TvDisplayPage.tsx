import { useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useQueueHub } from "@/hooks/useQueueHub"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, MonitorPlay, Stethoscope } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <MonitorPlay className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Setup TV Display</h1>
          <p className="text-slate-500 mb-6">Please provide a valid branch ID in the URL.</p>
        </div>
      </div>
    )
  }

  const activeQueues = queues || []
  const isSingle = activeQueues.length === 1
  const isEmpty = activeQueues.length === 0

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between shrink-0 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Token Display</h1>
            <p className="text-slate-400 text-sm font-medium">Please wait for your token number</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <div className="w-32 h-32 rounded-full bg-slate-800/50 border-2 border-slate-700 flex items-center justify-center mb-8">
                <Stethoscope className="w-16 h-16 text-slate-600" />
              </div>
              <h2 className="text-4xl font-bold text-slate-400 mb-3">No Active Queues</h2>
              <p className="text-slate-500 text-xl">Consultation will begin shortly</p>
            </motion.div>
          ) : isSingle ? (
            <SingleDoctorView queue={activeQueues[0]} key="single" />
          ) : (
            <MultiDoctorView queues={activeQueues} key="multi" />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-8 py-3 text-center border-t border-white/5 bg-black/20 shrink-0">
        <span className="text-slate-500 text-sm font-medium">Powered by <span className="text-indigo-400 font-bold">MyQCare</span> • Modern Healthcare Management</span>
      </footer>
    </div>
  )
}

/* ─── Single Doctor: Full-screen hero layout ─── */
function SingleDoctorView({ queue }: { queue: any }) {
  const hasCurrent = queue.currentTokenNumber > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      {/* Doctor Name Bar + Stats */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
            {queue.doctorName?.charAt(0) || "D"}
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">{queue.doctorName}</h2>
            <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest">Consultation Room</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-2.5 text-center">
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Waiting</p>
            <p className="text-3xl font-black text-amber-400 tabular-nums leading-none mt-1">{queue.waitingCount ?? 0}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-2.5 text-center">
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Done</p>
            <p className="text-3xl font-black text-emerald-400 tabular-nums leading-none mt-1">{queue.completedCount ?? 0}</p>
          </div>
          {(queue.skippedCount ?? 0) > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-2.5 text-center">
              <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wider">Skipped</p>
              <p className="text-3xl font-black text-rose-400 tabular-nums leading-none mt-1">{queue.skippedCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Giant Token Display */}
      <div className="flex-1 flex items-center justify-center">
        {hasCurrent ? (
          <motion.div
            key={queue.currentTokenNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 100 }}
            className="flex flex-col items-center"
          >
            <p className="text-slate-400 uppercase tracking-[0.3em] text-xl font-bold mb-4">Now Serving</p>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[80px] rounded-full"></div>
              <div className="relative text-[14rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-500 drop-shadow-2xl tabular-nums">
                {queue.currentTokenNumber}
              </div>
            </div>
            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl px-8 py-3">
              <p className="text-2xl font-bold text-white">{queue.currentPatientName}</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="text-8xl font-black text-slate-700 mb-4">—</div>
            <p className="text-2xl text-slate-500 font-medium">Waiting to start</p>
          </div>
        )}
      </div>

      {/* Upcoming Tokens Strip */}
      <UpcomingStrip tokens={queue.upcomingTokens} />
    </motion.div>
  )
}

/* ─── Multi Doctor: Grid layout ─── */
function MultiDoctorView({ queues }: { queues: any[] }) {
  const cols = queues.length <= 2 ? 'grid-cols-2' :
               queues.length <= 3 ? 'grid-cols-3' :
               queues.length <= 4 ? 'grid-cols-2 grid-rows-2' :
               'grid-cols-3 grid-rows-2'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`h-full grid ${cols} gap-5`}
    >
      {queues.map((q: any) => (
        <DoctorCard key={q.id} queue={q} />
      ))}
    </motion.div>
  )
}

/* ─── Doctor Card (used in multi-doctor grid) ─── */
function DoctorCard({ queue }: { queue: any }) {
  const hasCurrent = queue.currentTokenNumber > 0

  return (
    <motion.div
      layout
      className="bg-gradient-to-b from-slate-800/80 to-slate-800/40 rounded-3xl border border-white/5 overflow-hidden flex flex-col backdrop-blur-sm"
    >
      {/* Doctor Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black text-white shrink-0">
          {queue.doctorName?.charAt(0) || "D"}
        </div>
        <h2 className="text-lg font-bold text-white truncate flex-1">{queue.doctorName}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-amber-400/20 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold">
            {queue.waitingCount ?? 0} waiting
          </span>
          <span className="bg-emerald-400/20 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-bold">
            {queue.completedCount ?? 0} done
          </span>
          {(queue.skippedCount ?? 0) > 0 && (
            <span className="bg-rose-400/20 text-rose-300 px-2.5 py-1 rounded-lg text-xs font-bold">
              {queue.skippedCount} skip
            </span>
          )}
        </div>
      </div>

      {/* Token Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-slate-500 uppercase tracking-[0.2em] text-xs font-bold mb-2">Now Serving</p>
        {hasCurrent ? (
          <motion.div
            key={queue.currentTokenNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="flex flex-col items-center"
          >
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-500 leading-none tabular-nums">
              {queue.currentTokenNumber}
            </div>
            <p className="text-lg font-bold text-white/80 mt-3 truncate max-w-full">{queue.currentPatientName}</p>
          </motion.div>
        ) : (
          <div className="text-5xl font-black text-slate-700">—</div>
        )}
      </div>

      {/* Upcoming */}
      <div className="px-5 pb-4 pt-2 border-t border-white/5">
        <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mb-2">Up Next</p>
        <div className="flex gap-2 flex-wrap">
          {queue.upcomingTokens?.length > 0 ? (
            queue.upcomingTokens.slice(0, 5).map((t: number) => (
              <span key={t} className="bg-slate-700/60 border border-slate-600/50 text-white px-3 py-1 rounded-lg text-sm font-bold tabular-nums">
                {t}
              </span>
            ))
          ) : (
            <span className="text-slate-600 text-xs italic">No patients waiting</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Upcoming Tokens Strip (bottom bar for single-doctor view) ─── */
function UpcomingStrip({ tokens }: { tokens?: number[] }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-5 flex items-center gap-6 shrink-0">
      <div className="shrink-0">
        <p className="text-slate-400 uppercase tracking-widest text-xs font-bold">Up Next</p>
      </div>
      <div className="w-px h-8 bg-white/10"></div>
      <div className="flex gap-3 flex-wrap flex-1">
        {tokens && tokens.length > 0 ? (
          tokens.map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-800 border border-slate-700 text-white px-5 py-2.5 rounded-xl text-xl font-black tabular-nums min-w-[3.5rem] text-center"
            >
              {t}
            </motion.span>
          ))
        ) : (
          <span className="text-slate-500 text-base italic">No patients waiting in queue</span>
        )}
      </div>
    </div>
  )
}

/* ─── Live Clock ─── */
function LiveClock() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  // Re-render every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render by accessing DOM
      document.getElementById('tv-clock')?.setAttribute('data-tick', Date.now().toString())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div id="tv-clock" className="text-right">
      <div className="text-2xl font-black text-white tabular-nums">{timeStr}</div>
      <div className="text-sm text-slate-400 font-medium">{dateStr}</div>
    </div>
  )
}
