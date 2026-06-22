import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { X, UserPlus, Phone, User, Activity, MapPin, Ticket, AlertTriangle, Printer } from "lucide-react"
import { queueService } from "@/services/queueService"
import { patientService } from "@/services/patientService"
import { motion, AnimatePresence } from "framer-motion"

export default function ManualBookingModal({ isOpen, onClose, queueId, branchId, onSuccess }: any) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")

  const [activeField, setActiveField] = useState<"name" | "phone" | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [successToken, setSuccessToken] = useState<any>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeField === "name") setDebouncedSearch(name)
      else if (activeField === "phone") setDebouncedSearch(phone)
      else setDebouncedSearch("")
    }, 300)
    return () => clearTimeout(timer)
  }, [name, phone, activeField])

  const { data: searchResults } = useQuery({
    queryKey: ['patients-search', branchId, debouncedSearch],
    queryFn: () => patientService.getPatients(branchId, 1, 5, debouncedSearch),
    enabled: debouncedSearch.length >= 2 && activeField !== null,
    staleTime: 1000 * 60
  })

  const handleSelectPatient = (patient: any) => {
    setSelectedPatientId(patient.id)
    setName(patient.name)
    setPhone(patient.phone)
    setActiveField(null)
  }

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      try {
        queueService.checkWhatsAppNumber(branchId, phone).catch(() => {})
      } catch (err) {
        console.warn("WhatsApp check failed/skipped")
      }

      return queueService.createToken({
        queueId,
        patientId: selectedPatientId,
        patientName: name.trim(),
        patientPhone: phone,
        source: 2 // Manual source
      })
    },
    onSuccess: (data) => {
      setSuccessToken(data)
      setName("")
      setPhone("")
      setError("")
      setSelectedPatientId(null)
      onSuccess()
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
    if (phone && !/^\d{10}$/.test(phone)) {
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
            className="bg-white rounded-lg shadow-2xl shadow-indigo-900/10 w-full max-w-md overflow-visible relative z-10 border border-slate-200/50"
          >

            
            {!successToken ? (
              <>
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

            <form noValidate onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className={`mb-6 p-4 text-sm border rounded-xl flex items-start gap-2 ${error.toLowerCase().includes('already') || error.toLowerCase().includes('registered to') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                  {error.toLowerCase().includes('already') || error.toLowerCase().includes('registered to') ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  ) : (
                    <Activity className="w-5 h-5 shrink-0" />
                  )}
                  <p className="font-medium mt-0.5">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="relative z-20">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Patient Name</label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => { setName(e.target.value); setSelectedPatientId(null); }}
                      onFocus={() => setActiveField("name")}
                      onBlur={() => setTimeout(() => setActiveField(null), 200)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      required
                      autoComplete="off"
                    />
                    {activeField === "name" && searchResults?.data && searchResults.data.length > 0 && (
                      <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-2 z-50">
                        {searchResults.data.map((patient: any) => (
                           <div 
                             key={patient.id} 
                             onMouseDown={(e) => { e.preventDefault(); handleSelectPatient(patient); }}
                             className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex flex-col transition-colors border-b border-slate-50 last:border-0"
                           >
                             <span className="font-bold text-sm text-slate-800">{patient.name}</span>
                             <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                               <Phone className="w-3 h-3" /> {patient.phone} 
                               {patient.address && <><span className="mx-1">•</span><MapPin className="w-3 h-3" /> {patient.address}</>}
                             </span>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">WhatsApp Number <span className="text-zinc-400 font-normal ml-1">Opt</span></label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setSelectedPatientId(null); }}
                      onFocus={() => setActiveField("phone")}
                      onBlur={() => setTimeout(() => setActiveField(null), 200)}
                      placeholder="10-digit number"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      autoComplete="off"
                    />
                    {activeField === "phone" && searchResults?.data && searchResults.data.length > 0 && (
                      <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-2 z-50">
                        {searchResults.data.map((patient: any) => (
                           <div 
                             key={patient.id} 
                             onMouseDown={(e) => { e.preventDefault(); handleSelectPatient(patient); }}
                             className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex flex-col transition-colors border-b border-slate-50 last:border-0"
                           >
                             <span className="font-bold text-sm text-slate-800">{patient.name}</span>
                             <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                               <Phone className="w-3 h-3" /> {patient.phone} 
                               {patient.address && <><span className="mx-1">•</span><MapPin className="w-3 h-3" /> {patient.address}</>}
                             </span>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 ml-1 font-medium">Used for sending queue updates and alerts.</p>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 btn-danger"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createTokenMutation.isPending}
                  className="flex-[2] btn-primary"
                >
                  {createTokenMutation.isPending ? (
                    <><Activity className="w-4 h-4 animate-spin" /> Generating Token...</>
                  ) : (
                    <><Ticket className="w-4 h-4" /> Generate Token</>
                  )}
                </button>
              </div>
            </form>
            </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <Ticket className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Token #{successToken.tokenNumber || successToken.TokenNumber} Generated!</h2>
                <p className="text-slate-500 mb-8">
                  Estimated wait time: <span className="font-bold text-slate-700">{successToken.estimatedWaitMinutes || successToken.EstimatedWaitMinutes} mins</span>
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setSuccessToken(null);
                      onClose();
                    }}
                    className="flex-1 btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

