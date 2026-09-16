import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Clock, PlusCircle, Edit, Trash2, AlertCircle, X, Save, Activity,
  User, Building2, Users, FileText, Stethoscope, Sparkles, CheckCircle2, ChevronRight, Hash, Repeat
} from "lucide-react"

import { sessionService } from "@/services/sessionService"
import { useAuthStore } from "@/store/authStore"
import { toast } from "react-hot-toast"
import { FieldError } from "@/components/ui/FieldError"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { PageLoader } from "@/components/ui/PageLoader"
import { usePermissions } from "@/hooks/usePermissions"

function formatTime12H(timeStr?: string): string {
  if (!timeStr) return '--:--'
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  if (isNaN(hours)) return timeStr
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`
  return `${formattedHours}:${minutes} ${ampm}`
}

function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (isNaN(sh) || isNaN(eh)) return ''
  let diffMinutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))
  if (diffMinutes < 0) diffMinutes += 24 * 60
  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours} hrs`
  return `${mins} mins`
}

export default function SessionsPage() {
  const { user, activeBranchId } = useAuthStore()
  const { can } = usePermissions()
  const globalBranchId = user?.branchId
  const orgId = user?.orgId
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const isMultiBranchDoctor = role === 'doctor';
  const queryClient = useQueryClient()
  const selectedBranchId = (role === 'orgadmin' || isMultiBranchDoctor) ? (activeBranchId || '') : (globalBranchId || '');

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)
  const [isDailyForm, setIsDailyForm] = useState(true)
  const [startTimeVal, setStartTimeVal] = useState('09:00')
  const [endTimeVal, setEndTimeVal] = useState('13:00')
  const [capacityVal, setCapacityVal] = useState('30')
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)

  const liveDuration = calculateDuration(startTimeVal, endTimeVal)

  const handleOpenAdd = () => {
    setEditingSession(null)
    setIsDailyForm(true)
    setStartTimeVal('09:00')
    setEndTimeVal('13:00')
    setCapacityVal('30')
    setApiError(null)
    setValidationErrors({})
    setIsDrawerOpen(true)
  }

  const handleOpenEdit = (session: any) => {
    setEditingSession(session)
    setIsDailyForm(session.isDaily)
    setStartTimeVal(session.startTime?.substring(0, 5) || '09:00')
    setEndTimeVal(session.endTime?.substring(0, 5) || '13:00')
    setCapacityVal(String(session.defaultCapacity || 30))
    setApiError(null)
    setValidationErrors({})
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingSession(null)
    setApiError(null)
    setValidationErrors({})
  }

  const { data: doctors } = useQuery({
    queryKey: ['sessions-doctors', orgId, selectedBranchId],
    queryFn: () => sessionService.getDoctors(selectedBranchId),
    enabled: !!selectedBranchId && !!orgId
  })

  // Auto-select doctor if only one exists or doctor logs in
  useEffect(() => {
    if (doctors && doctors.length > 0 && !selectedDoctorId) {
      if (user?.doctorId && doctors.some((d: any) => d.id === user.doctorId)) {
        setSelectedDoctorId(user.doctorId)
      } else {
        setSelectedDoctorId(doctors[0].id)
      }
    }
  }, [doctors, selectedDoctorId, user])

  const selectedDoctorObj = doctors?.find((d: any) => d.id === selectedDoctorId)

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
      queryClient.invalidateQueries({ queryKey: ['queue-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['doctorSessions'] })
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
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedDoctorId, selectedBranchId] })
      queryClient.invalidateQueries({ queryKey: ['queue-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['doctorSessions'] })
      toast.success("Shift deleted successfully")
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)
    setValidationErrors({})
    const formData = new FormData(e.currentTarget)
    const isDaily = formData.get('isDaily') !== null ? formData.get('isDaily') === 'true' : isDailyForm
    const dayOfWeek = parseInt(formData.get('dayOfWeek') as string || '1')

    const startTimeStr = formData.get('startTime') as string
    const endTimeStr = formData.get('endTime') as string
    const capacityStr = formData.get('defaultCapacity') as string
    const capacityNum = parseInt(capacityStr)

    const errors: Record<string, string[]> = {}
    if (!formData.get('sessionName')) errors.SessionName = ["Session Name is required."]
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
        setValidationErrors({ Session: ["Doctor already has specific day sessions. Please delete them before creating a daily session."] })
        return
      }
      mutation.mutate({ ...dataTemplate, dayOfWeek: 0 })
    } else {
      if (otherSessions.some((s: any) => s.isDaily)) {
        setValidationErrors({ Session: ["Doctor already has a daily session. Please delete it before creating specific day sessions."] })
        return
      }
      if (otherSessions.some((s: any) => s.dayOfWeek === dayOfWeek)) {
        setValidationErrors({ Session: [`Doctor already has a session on ${days[dayOfWeek]}.`] })
        return
      }
      mutation.mutate({ ...dataTemplate, dayOfWeek })
    }
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  // Metrics for selected doctor
  const totalCapacity = sessions?.reduce((sum: number, s: any) => sum + (s.defaultCapacity || 0), 0) || 0
  const dailyCount = sessions?.filter((s: any) => s.isDaily).length || 0
  const specificCount = sessions?.filter((s: any) => !s.isDaily).length || 0

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3 rounded text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Manage</span>
              <span className="text-indigo-600">Sessions</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Configure daily OPD hours, token limits, and recurring weekly doctor rosters.
            </p>
          </div>
        </div>

        {/* Doctor Summary Pill */}
        {selectedDoctorObj && (
          <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded border border-slate-200/80 shadow-2xs self-start lg:self-auto">
            <div className="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
              {selectedDoctorObj.name?.charAt(0) || 'D'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Dr. {selectedDoctorObj.name.replace(/^Dr\.?\s*/i, '')}</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {sessions?.length || 0} active {sessions?.length === 1 ? 'shift' : 'shifts'} configured
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="saas-card rounded overflow-hidden flex flex-col flex-1 min-h-0 border border-slate-200/80 shadow-sm bg-white">
        {/* Toolbar Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 sm:max-w-xs group">
              <Stethoscope className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={!selectedBranchId}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/90 rounded text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs transition-all cursor-pointer"
              >
                <option value="">Select Doctor Schedule...</option>
                {doctors?.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>Dr. {doc.name.replace(/^Dr\.?\s*/i, '')}</option>
                ))}
              </select>
            </div>

            {selectedDoctorId && sessions && sessions.length > 0 && (
              <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-500 bg-white border border-slate-200/70 px-3 py-1.5 rounded shadow-2xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500"></span>
                  {dailyCount > 0 ? `${dailyCount} Daily` : ''}
                  {dailyCount > 0 && specificCount > 0 ? ' • ' : ''}
                  {specificCount > 0 ? `${specificCount} Specific` : ''}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-indigo-600 font-bold">Total Cap: {totalCapacity}</span>
              </div>
            )}
          </div>

          {can('Sessions.Add') && (
            <button
              onClick={handleOpenAdd}
              disabled={!selectedDoctorId}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-9 rounded text-xs sm:text-sm font-bold transition-all shadow-xs shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <PlusCircle className="w-4 h-4" /> <span>Add OPD Shift</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/40">
          {!selectedBranchId ? (
            <div className="flex flex-col items-center justify-center h-80 text-center">
              <div className="w-14 h-14 bg-white border border-slate-200 rounded flex items-center justify-center mb-4 shadow-xs text-slate-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800">No Clinic Branch Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Please select a clinic branch from the top header switcher to view schedules.</p>
            </div>
          ) : !selectedDoctorId ? (
            <div className="flex flex-col items-center justify-center h-80 text-center">
              <div className="w-14 h-14 bg-white border border-slate-200 rounded flex items-center justify-center mb-4 shadow-xs text-indigo-600 ring-4 ring-indigo-50/50">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900">Select Doctor Schedule</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">Choose a doctor profile from the toolbar dropdown above to manage active shift timings.</p>
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading OPD schedules..." minHeight="h-80" />
          ) : error ? (
            <div className="p-3.5 bg-rose-50 text-rose-700 rounded flex items-center gap-3 border border-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-xs font-bold">Failed to load doctor shifts. Please verify network connectivity and retry.</p>
            </div>
          ) : sessions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center max-w-md mx-auto py-8">
              <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded flex items-center justify-center mb-4 shadow-2xs">
                <Calendar className="w-7 h-7" />
              </div>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-sm mb-2 uppercase tracking-wide">
                No Schedules
              </span>
              <h3 className="text-base font-black text-slate-900">No Shifts Configured Yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5 font-medium leading-relaxed">
                This doctor does not have any active OPD slots. Add a daily or specific day shift to open appointments and live queue operations.
              </p>
              {can('Sessions.Add') && (
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded transition-all shadow-xs shadow-indigo-100 flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Create First OPD Shift
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sessions.map((session: any) => {
                const duration = calculateDuration(session.startTime, session.endTime)

                return (
                  <motion.div 
                    key={session.id} 
                    whileHover={{ y: -2 }}
                    className="group relative bg-white rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Accent Strip */}
                    <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-indigo-600" />

                    {/* Header Section */}
                    <div className="p-4 border-b border-slate-100/90 bg-gradient-to-b from-white to-slate-50/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-base shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-sm leading-snug truncate group-hover:text-indigo-600 transition-colors">
                              {session.sessionName}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              {session.isDaily ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-emerald-700 bg-emerald-50 text-[10px] font-extrabold border border-emerald-200 uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-xs bg-emerald-500"></span> Daily OPD
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-indigo-700 bg-indigo-50 text-[10px] font-extrabold border border-indigo-200 uppercase tracking-wider">
                                  {days[session.dayOfWeek]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="p-4 bg-white space-y-3 flex-1">
                      <div className="bg-slate-50/80 border border-slate-100 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>{formatTime12H(session.startTime)} — {formatTime12H(session.endTime)}</span>
                          </div>
                          {duration && (
                            <span className="text-[10px] font-extrabold text-slate-500 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200/80 shadow-2xs">
                              {duration}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 font-medium">
                          <span className="text-slate-500 text-[11px] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Token Limit:
                          </span>
                          <span className="font-extrabold text-slate-800 text-xs">
                            {session.defaultCapacity} Patients
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-2.5 px-4 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2">
                      {can('Sessions.Edit') && (
                        <button
                          onClick={() => handleOpenEdit(session)}
                          className="flex-1 h-8 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/80 hover:border-indigo-300 rounded-md shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-98"
                        >
                          <Edit className="w-3.5 h-3.5 text-indigo-600" /> <span>Edit</span>
                        </button>
                      )}
                      {can('Sessions.Delete') && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete shift "${session.sessionName}"?`)) {
                              deleteMutation.mutate(session.id)
                            }
                          }}
                          className="flex-1 h-8 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/80 hover:border-rose-300 rounded-md shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-98"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" /> <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
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
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200/80"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                    {editingSession ? <Edit className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      {editingSession ? 'Edit' : 'Create'} <span className="text-indigo-600">OPD Shift</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {editingSession ? 'Modify working hours and token allocation.' : 'Define schedule & capacity for patient tokens.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Doctor Context Banner */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/80 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Assigned Doctor</div>
                    <div className="text-xs font-bold text-slate-900 truncate">{selectedDoctorObj?.name || 'Selected Doctor'}</div>
                  </div>
                  {selectedDoctorObj?.specialization && (
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-xs border border-slate-200/80 shrink-0">
                      {selectedDoctorObj.specialization}
                    </span>
                  )}
                </div>

                <form noValidate autoComplete="off" id="session-form" onSubmit={handleSubmit} className="space-y-4">
                  <ApiErrorAlert error={apiError} />
                  <FieldError errors={validationErrors} field="Session" />

                  {/* Recurrence Mode Segmented Control */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                        <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Recurrence Schedule</span>
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-xs border border-indigo-100">
                        {isDailyForm ? 'Repeats Daily' : 'Weekly Slot'}
                      </span>
                    </div>
                    <input type="hidden" name="isDaily" value={String(isDailyForm)} />
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-indigo-50/60 rounded-md border border-indigo-100/90">
                      <button
                        type="button"
                        onClick={() => setIsDailyForm(true)}
                        className={`py-2 px-3 text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-2 ${
                          isDailyForm 
                            ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200/80' 
                            : 'text-indigo-800/70 hover:text-indigo-950 hover:bg-white/50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDailyForm ? 'bg-emerald-500' : 'bg-indigo-300'}`} />
                        Daily (All Days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDailyForm(false)}
                        className={`py-2 px-3 text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-2 ${
                          !isDailyForm 
                            ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200/80' 
                            : 'text-indigo-800/70 hover:text-indigo-950 hover:bg-white/50'
                        }`}
                      >
                        <Calendar className={`w-3.5 h-3.5 ${!isDailyForm ? 'text-indigo-600' : 'text-indigo-400'}`} />
                        Specific Day
                      </button>
                    </div>
                  </div>

                  {/* Shift Form Fields */}
                  <div className="space-y-3.5">
                    {/* Shift Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Shift Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <input 
                          required 
                          autoComplete="off" 
                          name="sessionName" 
                          defaultValue={editingSession?.sessionName} 
                          className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 shadow-2xs" 
                          placeholder="e.g. Morning OPD / Evening Shift" 
                        />
                      </div>
                      <FieldError errors={validationErrors} field="SessionName" />
                    </div>

                    {/* Start and End Times with Live Duration */}
                    <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Shift Timings
                        </span>
                        {liveDuration && (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-xs border border-indigo-100">
                            Duration: {liveDuration}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Start Time <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            required 
                            autoComplete="off" 
                            type="time" 
                            name="startTime" 
                            value={startTimeVal}
                            onChange={(e) => setStartTimeVal(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-bold bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-slate-800 shadow-2xs" 
                          />
                          <FieldError errors={validationErrors} field="StartTime" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            End Time <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            required 
                            autoComplete="off" 
                            type="time" 
                            name="endTime" 
                            value={endTimeVal}
                            onChange={(e) => setEndTimeVal(e.target.value)}
                            className="w-full h-9 px-3 text-xs font-bold bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-slate-800 shadow-2xs" 
                          />
                          <FieldError errors={validationErrors} field="EndTime" />
                        </div>
                      </div>
                    </div>

                    {/* Token Capacity with Presets */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Max Token Capacity <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-slate-500">Per Shift Limit</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <input 
                          required 
                          autoComplete="off" 
                          type="number" 
                          min="1" 
                          name="defaultCapacity" 
                          value={capacityVal}
                          onChange={(e) => setCapacityVal(e.target.value)}
                          className="w-full h-9 pl-9 pr-3 text-xs font-bold bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-slate-800 shadow-2xs" 
                          placeholder="30" 
                        />
                      </div>
                      {/* Presets */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
                        {['15', '25', '30', '40', '50'].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setCapacityVal(num)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-xs transition-all ${
                              capacityVal === num
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200/60'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <FieldError errors={validationErrors} field="DefaultCapacity" />
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">Maximum patient tokens issued per OPD shift.</p>
                    </div>

                    {/* Specific Day Selector */}
                    {!isDailyForm && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-1"
                      >
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Day of Week</span> <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select 
                            name="dayOfWeek" 
                            defaultValue={editingSession?.dayOfWeek || 1} 
                            className="w-full h-9 px-3 pr-8 text-xs font-bold bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-slate-800 shadow-2xs cursor-pointer appearance-none"
                          >
                            {days.map((day, idx) => (
                              <option key={idx} value={idx} className="text-xs font-semibold">
                                {day}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                            <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                          </div>
                        </div>
                        <FieldError errors={validationErrors} field="DayOfWeek" />
                      </motion.div>
                    )}
                  </div>
                </form>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/80 hover:border-rose-300 rounded-md shadow-2xs transition-all flex items-center gap-1.5 active:scale-98"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  form="session-form"
                  disabled={mutation.isPending}
                  className="px-4.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-md shadow-xs shadow-indigo-100 transition-all flex items-center gap-2"
                >
                  {mutation.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingSession ? 'Save Changes' : 'Create Shift'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
