import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pause, Clock, MessageSquare, X, Loader2 } from "lucide-react"

interface PauseSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (duration: number, reason: string) => void
  isPending?: boolean
  doctorName?: string
}

const DURATION_PRESETS = [10, 15, 20, 30, 45, 60]
const REASON_PRESETS = [
  "Doctor on a short break",
  "Tea / Coffee Break",
  "Lunch Break",
  "Emergency / Urgent Procedure",
  "Case Discussion"
]

export default function PauseSessionModal({
  isOpen,
  onClose,
  onConfirm,
  isPending = false,
  doctorName
}: PauseSessionModalProps) {
  const [duration, setDuration] = useState<number>(15)
  const [reason, setReason] = useState<string>("Doctor on a short break")

  if (!isOpen) return null

  const calculateResumeTime = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + (duration || 0))
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!duration || duration < 1) return
    onConfirm(duration, reason.trim() || "Doctor on a short break")
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Pause className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Pause Consultation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doctorName ? `Dr. ${doctorName}'s session` : 'Temporarily hold patient calls'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
            {/* Duration Section */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Pause Duration (Minutes)
                </span>
                <span className="text-[11px] font-semibold text-amber-600 normal-case">
                  Resuming at ~{calculateResumeTime()}
                </span>
              </label>

              {/* Quick Duration Chips */}
              <div className="grid grid-cols-6 gap-1.5">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-1.5 text-xs font-bold rounded-sm border transition-all ${
                      duration === d
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>

              <input
                type="number"
                min={1}
                max={240}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="saas-input font-bold text-slate-800"
                placeholder="Custom minutes"
                required
              />
            </div>

            {/* Reason Section */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Reason (Sent to Patients)
              </label>

              {/* Quick Reason Chips */}
              <div className="flex flex-wrap gap-1.5">
                {REASON_PRESETS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-sm border transition-all ${
                      reason === r
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Doctor on a short break"
                className="saas-input text-sm"
              />
              <p className="text-[11px] text-slate-400">
                Patients in queue and waiting room TV display will be informed of this reason.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary !bg-amber-500 hover:!bg-amber-600 !border-amber-500 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pausing Session...</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Confirm Pause ({duration}m)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
