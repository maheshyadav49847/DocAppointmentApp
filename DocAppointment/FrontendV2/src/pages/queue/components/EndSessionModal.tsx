import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, X, Power, ArrowRightLeft, Ban } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { sessionService } from "@/services/sessionService"

interface EndSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (action: 'CancelRemaining' | 'TransferRemaining', targetSessionId?: string) => void
  doctorId: string
  branchId: string
  currentSessionId: string
  waitingCount: number
  skippedCount: number
  isPending: boolean
}

export default function EndSessionModal({ 
  isOpen, onClose, onConfirm, doctorId, branchId, currentSessionId, waitingCount, skippedCount, isPending 
}: EndSessionModalProps) {
  
  const [action, setAction] = useState<'CancelRemaining' | 'TransferRemaining'>('CancelRemaining')
  const [targetSessionId, setTargetSessionId] = useState<string>('')

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', doctorId, branchId],
    queryFn: () => sessionService.getSessions(doctorId, branchId),
    enabled: isOpen && action === 'TransferRemaining'
  })

  // Filter out current session
  const availableSessions = sessions.filter((s: any) => s.id !== currentSessionId)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (action === 'TransferRemaining' && !targetSessionId) {
      alert("Please select a target session.")
      return
    }
    onConfirm(action, targetSessionId)
  }

  const totalRemaining = waitingCount + skippedCount

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Power className="w-5 h-5 text-rose-500" />
              End Session
            </h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">There are {totalRemaining} remaining patients.</p>
                <p>Waiting: {waitingCount} | Skipped: {skippedCount}</p>
                <p className="mt-2 text-amber-700">What would you like to do with them?</p>
              </div>
            </div>

            <div className="space-y-3">
              <label 
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  action === 'CancelRemaining' 
                    ? 'border-rose-500 bg-rose-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input 
                  type="radio" 
                  name="action" 
                  value="CancelRemaining" 
                  checked={action === 'CancelRemaining'} 
                  onChange={() => setAction('CancelRemaining')}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-500" /> Cancel Remaining
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Mark them as cancelled and automatically send an apology message on WhatsApp.
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  action === 'TransferRemaining' 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input 
                  type="radio" 
                  name="action" 
                  value="TransferRemaining" 
                  checked={action === 'TransferRemaining'} 
                  onChange={() => setAction('TransferRemaining')}
                  className="mt-1"
                />
                <div className="w-full">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-500" /> Transfer to Session
                  </div>
                  <p className="text-sm text-slate-500 mt-1 mb-3">
                    Transfer them to another session. They will be notified via WhatsApp with a new token number.
                  </p>
                  
                  {action === 'TransferRemaining' && (
                    <select 
                      className="form-select w-full"
                      value={targetSessionId}
                      onChange={(e) => setTargetSessionId(e.target.value)}
                    >
                      <option value="">-- Select Target Session --</option>
                      {availableSessions.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.sessionName} ({s.startTime.slice(0,5)} - {s.endTime.slice(0,5)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={isPending || (action === 'TransferRemaining' && !targetSessionId)}
              className="btn-danger px-6 py-2.5 rounded-xl shadow-sm"
            >
              {isPending ? 'Ending...' : 'End Session'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
