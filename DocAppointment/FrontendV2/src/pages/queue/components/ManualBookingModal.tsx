import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { X, UserPlus, Phone, User, Activity } from "lucide-react"
import { queueService } from "@/services/queueService"
import { motion, AnimatePresence } from "framer-motion"

export default function ManualBookingModal({ isOpen, onClose, queueId, branchId, onSuccess }: any) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      // 1. Optional check WhatsApp bridge
      try {
        await queueService.checkWhatsAppNumber(branchId, phone)
      } catch (err) {
        console.warn("WhatsApp check failed/skipped")
      }

      // 2. Create Token
      return queueService.createToken({
        queueId,
        patientName: name.trim(),
        patientPhone: phone,
        source: 2 // Manual source
      })
    },
    onSuccess: () => {
      setName("")
      setPhone("")
      setError("")
      onSuccess()
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || "Failed to book patient")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters")
      return
    }
    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number")
      return
    }
    setError("")
    createTokenMutation.mutate()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-3xl shadow-2xl shadow-indigo-900/10 w-full max-w-md overflow-hidden relative z-10 border border-slate-200/50"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                Book Walk-in Patient
              </h2>
              <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-sm border border-rose-100 rounded-xl flex items-start gap-2">
                  <Activity className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Patient Name</label>
                  <div className="relative group">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">WhatsApp Number</label>
                  <div className="relative group">
                    <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 ml-1 font-medium">Used for sending queue updates and alerts.</p>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-transparent border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createTokenMutation.isPending}
                  className="flex-[2] py-3 px-4 bg-transparent border border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createTokenMutation.isPending && <Activity className="w-5 h-5 animate-spin" />}
                  {createTokenMutation.isPending ? "Generating Token..." : "Generate Token"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
