import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Clock, Plus, Edit, Trash2, AlertCircle, X, Save, Activity,
  User, Building2, Users, FileText
} from "lucide-react"

import { sessionService } from "@/services/sessionService"
import { useAuthStore } from "@/store/authStore"
import { toast } from "react-hot-toast"
import { FieldError } from "@/components/ui/FieldError"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { usePermissions } from "@/hooks/usePermissions"

export default function SessionsPage() {
  const { user, activeBranchId, setActiveBranchId } = useAuthStore()
  const { can } = usePermissions()
  const globalBranchId = user?.branchId
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const isMultiBranchDoctor = role === 'doctor';
  const queryClient = useQueryClient()
  const selectedBranchId = (role === 'orgadmin' || isMultiBranchDoctor) ? (activeBranchId || '') : (globalBranchId || '');
  const setSelectedBranchId = setActiveBranchId
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)
  const [isDailyForm, setIsDailyForm] = useState(true)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)

  const { data: branches } = useQuery({
    queryKey: ['sessions-branches', orgId],
    queryFn: () => sessionService.getBranches(),
    enabled: !!orgId
  })

  const { data: doctors } = useQuery({
    queryKey: ['sessions-doctors', orgId, selectedBranchId],
    queryFn: () => sessionService.getDoctors(selectedBranchId),
    enabled: !!selectedBranchId && !!orgId
  })

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions', selectedDoctorId, selectedBranchId],
    queryFn: () => sessionService.getSessions(selectedDoctorId, selectedBranchId),
    enabled: !!selectedDoctorId && !!selectedBranchId
  })

  const mutation = useMutation({
    mutationFn: async (data: any | any[]) => {
      const payloads = Array.isArray(data) ? data : [data]

      const promises = payloads.map(payloadData => {
        const payload = {
          ...payloadData,
          doctorId: selectedDoctorId,
          branchId: selectedBranchId,
          startTime: payloadData.startTime.length === 5 ? payloadData.startTime + ":00" : payloadData.startTime,
          endTime: payloadData.endTime.length === 5 ? payloadData.endTime + ":00" : payloadData.endTime
        }
        if (editingSession) {
          return sessionService.updateSession(editingSession.id, { ...payload, id: editingSession.id })
        } else {
          return sessionService.createSession(payload)
        }
      })

      await Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedDoctorId, selectedBranchId] })
      setIsDrawerOpen(false)
      setEditingSession(null)
      setApiError(null)
      setValidationErrors({})
      toast.success("Sessions saved successfully!")
    },
    onError: (error: any) => {
      setApiError(error)
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors)
      } else if (error.response?.data?.extensions?.errors) {
        setValidationErrors(error.response.data.extensions.errors)
      }
      const msg = error.response?.data?.message || error.message || "Failed to save session."
      toast.error(msg)
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
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)
    const isDaily = formData.get('isDaily') === 'true'
    const dayOfWeek = parseInt(formData.get('dayOfWeek') as string || '1')

    const startTimeStr = formData.get('startTime') as string
    const endTimeStr = formData.get('endTime') as string
    const capacityStr = formData.get('defaultCapacity') as string
    const capacityNum = parseInt(capacityStr)

    // Manual validation for time fields to use the custom messaging feature instead of browser tooltips
    const errors: Record<string, string[]> = {}
    if (!startTimeStr) errors.StartTime = ["Start time is required."]
    if (!endTimeStr) errors.EndTime = ["End time is required."]

    if (!capacityStr || isNaN(capacityNum) || capacityNum <= 0) {
      errors.DefaultCapacity = ["Capacity must be greater than 0."]
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const dataTemplate = {
      sessionName: formData.get('sessionName') as string,
      isDaily,
      startTime: startTimeStr,
      endTime: endTimeStr,
      defaultCapacity: capacityNum
    }

    const otherSessions = sessions?.filter((s: any) => s.id !== editingSession?.id) || []

    if (isDaily) {
      if (otherSessions.some((s: any) => !s.isDaily)) {
        toast.error("Doctor already has specific day sessions. Please delete them before creating a daily session.")
        return
      }
      mutation.mutate({ ...dataTemplate, dayOfWeek: 0 })
    } else {
      if (otherSessions.some((s: any) => s.isDaily)) {
        toast.error("Doctor already has a daily session. Please delete it before creating specific day sessions.")
        return
      }
      if (otherSessions.some((s: any) => s.dayOfWeek === dayOfWeek)) {
        toast.error(`Doctor already has a session on ${days[dayOfWeek]}.`)
        return
      }
      mutation.mutate({ ...dataTemplate, dayOfWeek })
    }
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 mb-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Sessions</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Configure daily working hours and weekly schedules for professionals.</p>
          </div>
        </div>

      </div>
      {/* Main Container */}
      <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="relative flex-1 sm:w-64 lg:w-80 group">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={!selectedBranchId}
              className="saas-input w-full appearance-none" style={{ paddingLeft: "2.5rem" }}
            >
              <option value="">Select Professional...</option>
              {doctors?.map((doc: any) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>

          {can('Sessions.Add') && (
            <button
              onClick={() => { setEditingSession(null); setIsDailyForm(true); setIsDrawerOpen(true); }}
              disabled={!selectedDoctorId}
              className="btn-primary shrink-0 px-3 sm:px-5"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Shift</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
          {!selectedBranchId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Facility Selected</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Please select a facility from the top right dropdown to view schedules.</p>
            </div>
          ) : !selectedDoctorId ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Doctor Selected</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Choose a professional from the toolbar to manage their working shifts.</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-500">Loading schedules...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">Failed to load sessions. Please try again.</p>
            </div>
          ) : sessions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Shifts Scheduled</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">This professional has no active shifts. Click 'Add Shift' to create one.</p>
              {can('Sessions.Add') && (
                <button
                  onClick={() => { setEditingSession(null); setIsDailyForm(true); setIsDrawerOpen(true); }}
                  className="btn-primary"
                >
                  Create First Shift
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {sessions.map((session: any) => (
                <div key={session.id} className="group relative bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Header Section */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>

                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform shrink-0">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{session.sessionName}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-indigo-700 bg-indigo-50 text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50">
                              <Calendar className="w-3 h-3" />
                              {session.isDaily ? 'EVERY DAY' : days[session.dayOfWeek].toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-4 flex-1 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0"><Clock className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hours</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-violet-50 text-violet-600 shrink-0"><Users className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Capacity</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{session.defaultCapacity} Tokens</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 mt-auto">
                    {can('Sessions.Edit') && (
                      <button
                        onClick={() => { setEditingSession(session); setIsDailyForm(session.isDaily); setIsDrawerOpen(true); }}
                        className="flex-1 btn-secondary text-xs px-3 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                    )}
                    {can('Sessions.Delete') && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this shift?')) {
                            deleteMutation.mutate(session.id)
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
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
              onClick={() => { setIsDrawerOpen(false); setEditingSession(null); setApiError(null); setValidationErrors({}); }}
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
                  onClick={() => { setIsDrawerOpen(false); setEditingSession(null); setApiError(null); setValidationErrors({}); }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form noValidate id="session-form" onSubmit={handleSubmit} className="space-y-6">
                  <ApiErrorAlert error={apiError} />
                  {/* Recurrence Toggle */}
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                    <label className="cursor-pointer">
                      <input type="radio" name="isDaily" value="true" checked={isDailyForm} onChange={() => setIsDailyForm(true)} className="peer sr-only" />
                      <div className="text-center py-2 text-sm font-medium text-slate-500 rounded-lg transition-all peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm">
                        Daily
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="isDaily" value="false" checked={!isDailyForm} onChange={() => setIsDailyForm(false)} className="peer sr-only" />
                      <div className="text-center py-2 text-sm font-medium text-slate-500 rounded-lg transition-all peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm">
                        Specific Day
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <FileText className="w-4 h-4 text-blue-500" /> Session Name
                      </label>
                      <input name="sessionName" defaultValue={editingSession?.sessionName} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. Morning OPD" />
                      <FieldError errors={validationErrors} field="SessionName" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Clock className="w-4 h-4 text-green-500" /> Start Time
                        </label>
                        <input type="time" name="startTime" defaultValue={editingSession?.startTime?.substring(0, 5) || '09:00'} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        <FieldError errors={validationErrors} field="StartTime" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                          <Clock className="w-4 h-4 text-rose-500" /> End Time
                        </label>
                        <input type="time" name="endTime" defaultValue={editingSession?.endTime?.substring(0, 5) || '13:00'} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        <FieldError errors={validationErrors} field="EndTime" />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-1">
                        <Users className="w-4 h-4 text-purple-500" /> Max Token Capacity
                      </label>
                      <input type="number" name="defaultCapacity" defaultValue={editingSession?.defaultCapacity || 30} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                      <FieldError errors={validationErrors} field="DefaultCapacity" />
                      <p className="text-xs text-slate-500 mt-1">Maximum number of patients allowed per session.</p>
                    </div>

                    {!isDailyForm && (
                      <div className="day-selector-container animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                          <Calendar className="w-4 h-4 text-indigo-500" /> Day of Week
                        </label>
                        <select name="dayOfWeek" defaultValue={editingSession?.dayOfWeek || 1} className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                          {days.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                        </select>
                        <FieldError errors={validationErrors} field="DayOfWeek" />
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); setEditingSession(null); setApiError(null); setValidationErrors({}); }}
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
