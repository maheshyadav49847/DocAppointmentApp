import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Edit, X, User, Calendar, Droplet, Ruler, Phone, Mail, MapPin, HeartPulse, UserPlus, Activity, Save, Download } from "lucide-react"

import { patientService, type Patient } from "@/services/patientService"
import { useAuthStore } from "@/store/authStore"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import PhoneInput from "@/components/PhoneInput"
import { api } from "@/lib/axios"
import toast from "react-hot-toast"

interface PatientProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  editingPatient: Patient | null
  selectedBranch?: string | null
  onSaved?: (patient: Patient) => void
}

export default function PatientProfileDrawer({ isOpen, onClose, editingPatient, selectedBranch, onSaved }: PatientProfileDrawerProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadChats = async () => {
    if (!editingPatient) return;
    try {
      setIsDownloading(true);
      const response = await api.get(`/whatsapp/messages/${editingPatient.id}/download`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `WhatsApp_Chat_${editingPatient.name.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      toast.error("Failed to download chat history");
    } finally {
      setIsDownloading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      return await patientService.createPatient(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient'] })
      if (onSaved) onSaved(data)
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      return await patientService.updatePatientProfile(editingPatient!.id, { ...data, id: editingPatient!.id })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient'] })
      if (onSaved) onSaved(data)
      onClose()
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || undefined,
      age: formData.get('age') as string,
      gender: formData.get('gender') as string,
      maritalStatus: formData.get('maritalStatus') as string,
      bloodGroup: formData.get('bloodGroup') as string,
      email: (formData.get('email') as string) || undefined,
      address: formData.get('address') as string,
      preExistingConditions: formData.get('preExistingConditions') as string,
      height: parseInt(formData.get('height') as string) || 0,
      emergencyContactName: formData.get('emergencyContactName') as string,
      emergencyContactPhone: formData.get('emergencyContactPhone') as string,
      organizationId: user?.orgId!,
      branchId: (!selectedBranch || selectedBranch === 'all' ? undefined : selectedBranch) as string | undefined
    }
    if (editingPatient) {
      updateMutation.mutate(data)
    } else {
      mutation.mutate(data)
    }
  }

  const isPending = mutation.isPending || updateMutation.isPending

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-sm">
                  {editingPatient ? <Edit className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <span className="text-slate-900">{editingPatient ? 'Edit' : 'Register'}</span>
                    <span className="text-indigo-600">{editingPatient ? 'Patient Record' : 'New Patient'}</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{editingPatient ? 'Update patient clinical and contact details.' : 'Enter details to create a new patient record.'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingPatient && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownloadChats();
                    }}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                    title="Download WhatsApp Chats"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{isDownloading ? "Downloading..." : "Chats"}</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form noValidate autoComplete="off" id="patient-form" onSubmit={handleSubmit} className="space-y-6">
                <ApiErrorAlert error={editingPatient ? updateMutation.error : mutation.error} />

                {/* Section 1: Personal Info */}
                <div>
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <User className="w-4 h-4 text-blue-500" /> Full Name
                      </label>
                      <input autoComplete="off" defaultValue={editingPatient?.name} name="name" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. John Doe" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Calendar className="w-4 h-4 text-orange-500" /> Age
                        </label>
                        <input autoComplete="off" defaultValue={editingPatient?.age || ''} type="number" name="age" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. 30" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Users className="w-4 h-4 text-pink-500" /> Gender
                        </label>
                        <select defaultValue={editingPatient?.gender} name="gender" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`}>
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Droplet className="w-4 h-4 text-red-500" /> Blood Group
                        </label>
                        <select defaultValue={editingPatient?.bloodGroup} name="bloodGroup" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`}>
                          <option value="">Select</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Users className="w-4 h-4 text-orange-500" /> Marital Status
                        </label>
                        <select defaultValue={editingPatient?.maritalStatus} name="maritalStatus" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`}>
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Ruler className="w-4 h-4 text-teal-500" /> Height (cm) <span className="text-zinc-400 font-normal ml-1">Opt</span>
                        </label>
                        <input autoComplete="off" defaultValue={editingPatient?.height || ''} type="number" name="height" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. 175" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Details */}
                <div>
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Contact Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Phone className="w-4 h-4 text-green-500" /> Phone Number
                        </label>
                        <PhoneInput
                          name="phone"
                          dialCodeName="phoneDialCode"
                          defaultValue={editingPatient?.phone}
                          defaultDialCode={editingPatient?.phoneDialCode}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Mail className="w-4 h-4 text-indigo-500" /> Email <span className="text-zinc-400 font-normal ml-1">Opt</span>
                        </label>
                        <input autoComplete="off" defaultValue={editingPatient?.email} type="email" name="email" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="pt@example.com" />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <MapPin className="w-4 h-4 text-rose-500" /> Address <span className="text-zinc-400 font-normal ml-1">Opt</span>
                      </label>
                      <textarea autoComplete="off" defaultValue={editingPatient?.address} name="address" rows={2} className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none bg-white`} placeholder="Enter full address"></textarea>
                    </div>
                  </div>
                </div>

                {/* Section 3: Clinical & Emergency */}
                <div>
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 pb-2 border-b border-zinc-100">Clinical & Emergency</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <HeartPulse className="w-4 h-4 text-rose-500" /> Pre-existing Conditions <span className="text-zinc-400 font-normal ml-1">Opt</span>
                      </label>
                      <input autoComplete="off" defaultValue={editingPatient?.preExistingConditions} name="preExistingConditions" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="e.g. Diabetes, Hypertension" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <UserPlus className="w-4 h-4 text-emerald-500" /> Emerg. Contact <span className="text-zinc-400 font-normal ml-1">Opt</span>
                        </label>
                        <input autoComplete="off" defaultValue={editingPatient?.emergencyContactName} name="emergencyContactName" className={`w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white`} placeholder="Relative's Name" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Phone className="w-4 h-4 text-red-500" /> Emerg. Phone <span className="text-zinc-400 font-normal ml-1">Opt</span>
                        </label>
                        <PhoneInput
                          name="emergencyContactPhone"
                          dialCodeName="emergencyContactPhoneDialCode"
                          defaultValue={editingPatient?.emergencyContactPhone}
                          defaultDialCode={editingPatient?.emergencyContactPhoneDialCode}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-danger"
              >
                <X className="w-4 h-4" /> {editingPatient ? 'Close' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="patient-form"
                disabled={isPending}
                className="btn-primary"
              >
                {isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingPatient ? 'Save Changes' : 'Register Patient'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
