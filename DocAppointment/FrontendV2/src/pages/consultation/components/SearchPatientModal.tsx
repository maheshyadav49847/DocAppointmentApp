import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Search, X, User, Phone, Loader2, Plus } from "lucide-react"
import { motion } from "framer-motion"
import PatientProfileDrawer from "@/pages/patients/components/PatientProfileDrawer"

interface SearchPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPatient: (patientId: string, patientName: string) => void
}

export default function SearchPatientModal({ isOpen, onClose, onSelectPatient }: SearchPatientModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const { data: results, isLoading } = useQuery({
    queryKey: ['patientsSearch', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { data: [] }
      const r = await api.get(`/patients?page=1&limit=5&search=${searchTerm}`)
      return r.data
    },
    enabled: searchTerm.length >= 2
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Consult Another Patient</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-4">
            Search for an existing patient to consult under the same token.
          </p>

          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone or Patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-medium outline-none transition-all"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
            {isLoading && searchTerm.length >= 2 ? (
              <div className="flex items-center justify-center py-12 text-indigo-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : searchTerm.length < 2 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Type at least 2 characters to search.
              </div>
            ) : results?.data?.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No patients found matching "{searchTerm}".
              </div>
            ) : (
              <div className="space-y-2">
                {results?.data?.map((patient: any) => (
                  <button
                    key={patient.id}
                    onClick={() => onSelectPatient(patient.id, patient.name)}
                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 flex items-center justify-center font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-indigo-700">{patient.name}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {patient.phone || "No Phone"}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> {patient.patientCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Don't see the patient in the list?</p>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Patient
            </button>
          </div>
        </div>
      </motion.div>

      <PatientProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        editingPatient={null}
        onSaved={(patient) => {
          setIsDrawerOpen(false)
          onSelectPatient(patient.id, patient.name)
        }}
      />
    </div>
  )
}
