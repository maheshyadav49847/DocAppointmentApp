import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Clock, Plus, Edit, Trash2, AlertCircle, X, Save, Activity,
  User, Building2, Users, FileText
} from "lucide-react"

import { doctorService } from "@/services/doctorService"
import { sessionService } from "@/services/sessionService"
import { branchService } from "@/services/branchService"
import { useAuthStore } from "@/store/authStore"

export default function SessionsPage() {
  const { user, activeBranchId, setActiveBranchId } = useAuthStore()
  const globalBranchId = user?.branchId
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''

  const queryClient = useQueryClient()

  const selectedBranchId = activeBranchId || globalBranchId || ''
  const setSelectedBranchId = setActiveBranchId
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)

  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors', selectedBranchId],
    queryFn: () => doctorService.getBranchDoctors(selectedBranchId),
    enabled: !!selectedBranchId
  })

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions', selectedDoctorId, selectedBranchId],
    queryFn: () => sessionService.getSessions(selectedDoctorId, selectedBranchId),
    enabled: !!selectedDoctorId && !!selectedBranchId
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        doctorId: selectedDoctorId,
        branchId: selectedBranchId,
        startTime: data.startTime.length === 5 ? data.startTime + ":00" : data.startTime,
        endTime: data.endTime.length === 5 ? data.endTime + ":00" : data.endTime
      }
      if (editingSession) {
        await sessionService.updateSession(editingSession.id, payload)
      } else {
        await sessionService.createSession(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedDoctorId, selectedBranchId] })
      setIsDrawerOpen(false)
      setEditingSession(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedDoctorId, selectedBranchId] })
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const isDaily = formData.get('isDaily') === 'true'
    const data = {
      sessionName: formData.get('sessionName') as string,
      dayOfWeek: parseInt(formData.get('dayOfWeek') as string || '1'),
      isDaily,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      defaultCapacity: parseInt(formData.get('defaultCapacity') as string)
    }
    mutation.mutate(data)
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 rounded-2xl text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Session</span>
              <span className="text-indigo-600">Master</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Configure doctor availability and appointment slots.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full pr-1 flex items-center justify-end gap-1"><Building2 className="w-3 h-3 text-indigo-400" /> Branch Location</label>
          <select
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value)
              setSelectedDoctorId('')
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm transition-all hover:border-amber-300"
          >
            <option value="" disabled>Select Facility</option>
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Container */}
      <div className="saas-card overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={!selectedBranchId}
                className="bg-white border border-slate-200 text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm w-full disabled:opacity-50"
              >
                <option value="">Select Professional...</option>
                {doctors?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => { setEditingSession(null); setIsDrawerOpen(true); }}
            disabled={!selectedDoctorId}
            className="btn-primary w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Shift
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 bg-slate-50/30">
          {!selectedBranchId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Facility Selected</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Please select a facility from the top right dropdown to view schedules.</p>
            </div>
          ) : !selectedDoctorId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Doctor Selected</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Choose a professional from the toolbar to manage their working shifts.</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Activity className="w-8 h-8 text-amber-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-500">Loading schedules...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">Failed to load sessions. Please try again.</p>
            </div>
          ) : sessions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-amber-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Shifts Scheduled</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">This professional has no active shifts. Click 'Add Shift' to create one.</p>
              <button
                onClick={() => { setEditingSession(null); setIsDrawerOpen(true); }}
                className="btn-primary"
              >
                Create First Shift
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session: any) => (
                <div key={session.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="font-bold text-slate-900">{session.sessionName}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {session.isDaily ? 'EVERY DAY' : days[session.dayOfWeek].toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingSession(session); setIsDrawerOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {['orgadmin', 'branchadmin', 'superadmin'].includes(role) && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this shift?')) {
                              deleteMutation.mutate(session.id)
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Hours</p>
                      <p className="text-sm font-semibold text-slate-900">{session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Capacity</p>
                      <p className="text-sm font-semibold text-slate-900">{session.defaultCapacity} <span className="text-xs text-slate-500 font-normal">Tokens</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Drawer for Add/Edit Session */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsDrawerOpen(false); setEditingSession(null); }}
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
                    {editingSession ? <Edit className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <span className="text-slate-900">{editingSession ? 'Edit' : 'Add '}</span>
                      <span className="text-indigo-600">{editingSession ? '' : 'New'} Shift</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{editingSession ? 'Update working hours.' : 'Create a new working schedule.'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsDrawerOpen(false); setEditingSession(null); }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="session-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Recurrence Toggle */}
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                    <label className="cursor-pointer">
                      <input type="radio" name="isDaily" value="true" defaultChecked={editingSession ? editingSession.isDaily : true} className="peer sr-only" />
                      <div className="text-center py-2 text-sm font-medium text-slate-500 rounded-lg transition-all peer-checked:bg-white peer-checked:text-amber-600 peer-checked:shadow-sm">
                        Daily
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="isDaily" value="false" defaultChecked={editingSession ? !editingSession.isDaily : false} className="peer sr-only" />
                      <div className="text-center py-2 text-sm font-medium text-slate-500 rounded-lg transition-all peer-checked:bg-white peer-checked:text-amber-600 peer-checked:shadow-sm">
                        Specific Day
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <FileText className="w-4 h-4 text-blue-500" /> Session Name
                      </label>
                      <input required name="sessionName" defaultValue={editingSession?.sessionName} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" placeholder="e.g. Morning OPD" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Clock className="w-4 h-4 text-green-500" /> Start Time
                        </label>
                        <input required type="time" name="startTime" defaultValue={editingSession?.startTime?.substring(0, 5) || '09:00'} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Clock className="w-4 h-4 text-rose-500" /> End Time
                        </label>
                        <input required type="time" name="endTime" defaultValue={editingSession?.endTime?.substring(0, 5) || '13:00'} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Users className="w-4 h-4 text-purple-500" /> Max Token Capacity
                      </label>
                      <input required type="number" name="defaultCapacity" defaultValue={editingSession?.defaultCapacity || 30} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                      <p className="text-xs text-slate-500 mt-1">Maximum number of patients allowed per session.</p>
                    </div>

                    <div className="day-selector-container">
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Calendar className="w-4 h-4 text-orange-500" /> Day of Week (If not daily)
                      </label>
                      <select name="dayOfWeek" defaultValue={editingSession?.dayOfWeek || 1} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all">
                        {days.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); setEditingSession(null); }}
                  className="btn-danger"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  type="submit"
                  form="session-form"
                  disabled={mutation.isPending}
                  className="btn-primary"
                >
                  {mutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingSession ? 'Save Changes' : 'Create Shift'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
