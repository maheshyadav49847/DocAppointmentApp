import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  X, 
  CalendarOff, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Building2, 
  Stethoscope, 
  UserCheck, 
  Bell, 
  FileText,
  Send,
  Sparkles,
  CalendarDays
} from "lucide-react"
import toast from "react-hot-toast"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { leaveService, type ApplyLeaveRequest, type LeaveRecordDto } from "@/services/leaveService"
import { doctorService } from "@/services/doctorService"
import { staffService } from "@/services/staffService"
import { branchService } from "@/services/branchService"
import { sessionService } from "@/services/sessionService"
import { useAuthStore } from "@/store/authStore"
import { ApiErrorAlert } from "@/components/ui/ApiErrorAlert"
import { FieldError } from "@/components/ui/FieldError"

const fmt = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (s: string) => {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

interface ApplyLeaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialDoctorId?: string
  initialStaffId?: string
  initialBranchId?: string
  initialStartDate?: string
  leaveToEdit?: LeaveRecordDto | null
}

export default function ApplyLeaveModal({
  isOpen,
  onClose,
  onSuccess,
  initialDoctorId,
  initialStaffId,
  initialBranchId,
  initialStartDate,
  leaveToEdit
}: ApplyLeaveModalProps) {
  const queryClient = useQueryClient()
  const { user, token } = useAuthStore()

  const isAdmin = user?.role === 'OrgAdmin' || user?.role === 'BranchAdmin' || user?.role === 'SuperAdmin'
  const isDoctorUser = !!user?.doctorId
  const isStaffUser = !isAdmin && !isDoctorUser

  // Resolve current staff user ID
  const currentUserId = useMemo(() => {
    if (user?.id) return user.id
    if (!token) return ""
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub || ""
    } catch {
      return ""
    }
  }, [user?.id, token])

  // Form State
  const defaultTargetType: 'doctor' | 'staff' = isDoctorUser ? 'doctor' : (isAdmin ? 'doctor' : 'staff')
  const [targetType, setTargetType] = useState<'doctor' | 'staff'>(defaultTargetType)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId || (isDoctorUser ? (user?.doctorId || "") : ""))
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || (isStaffUser ? currentUserId : ""))
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId || user?.branchId || "")
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [leaveType, setLeaveType] = useState<0 | 1>(0) // 0: Planned, 1: Unplanned / Emergency

  const todayStr = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState<string>(todayStr)
  const [endDate, setEndDate] = useState<string>(todayStr)
  const [reason, setReason] = useState<string>("")
  const [publicNotice, setPublicNotice] = useState<string>("")
  const [notifyPatients, setNotifyPatients] = useState<boolean>(true)

  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<any>(null)

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.getBranches(),
    enabled: isOpen
  })

  // Fetch doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => doctorService.getOrganizationDoctors(),
    enabled: isOpen && (targetType === 'doctor' || isAdmin)
  })

  // Fetch staff
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list', user?.orgId, selectedBranchId],
    queryFn: () => staffService.getStaff(user?.orgId || "", selectedBranchId || null),
    enabled: isOpen && isAdmin && targetType === 'staff'
  })

  // Fetch doctor sessions if doctor selected
  const { data: sessions = [] } = useQuery({
    queryKey: ['doctor-sessions', selectedDoctorId, selectedBranchId],
    queryFn: () => sessionService.getSessions(selectedDoctorId, selectedBranchId || undefined),
    enabled: isOpen && targetType === 'doctor' && !!selectedDoctorId
  })

  const isEditMode = !!leaveToEdit

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      setApiError(null)

      if (leaveToEdit) {
        // Edit mode initialization
        const isDoc = !!leaveToEdit.doctorId
        setTargetType(isDoc ? 'doctor' : 'staff')
        setSelectedDoctorId(leaveToEdit.doctorId || "")
        setSelectedStaffId(leaveToEdit.staffId || "")
        setSelectedBranchId(leaveToEdit.branchId || "")
        setSelectedSessionId(leaveToEdit.sessionId || "")
        setLeaveType(leaveToEdit.leaveType as 0 | 1)
        setStartDate(leaveToEdit.startDate)
        setEndDate(leaveToEdit.endDate)
        setReason(leaveToEdit.reason || "")
        setPublicNotice(leaveToEdit.publicNotice || "")
        setNotifyPatients(leaveToEdit.notifyPatients ?? true)
      } else {
        if (initialDoctorId) {
          setTargetType('doctor')
          setSelectedDoctorId(initialDoctorId)
        } else if (initialStaffId) {
          setTargetType('staff')
          setSelectedStaffId(initialStaffId)
        } else if (isDoctorUser) {
          setTargetType('doctor')
          setSelectedDoctorId(user?.doctorId || "")
        } else if (isStaffUser) {
          setTargetType('staff')
          setSelectedStaffId(currentUserId)
        } else {
          setTargetType('doctor')
        }

        if (initialBranchId) {
          setSelectedBranchId(initialBranchId)
        } else if (user?.branchId) {
          setSelectedBranchId(user.branchId)
        }

        if (initialStartDate) {
          setStartDate(initialStartDate)
          setEndDate(initialStartDate)
        } else {
          const today = new Date().toISOString().split('T')[0]
          setStartDate(today)
          setEndDate(today)
        }

        setSelectedSessionId("")
        setReason("")
        setPublicNotice("")
        setLeaveType(0)
        setNotifyPatients(true)
      }
    }
  }, [isOpen, leaveToEdit, initialDoctorId, initialStaffId, initialBranchId, initialStartDate, isDoctorUser, isStaffUser, currentUserId, user?.doctorId, user?.branchId])

  // Auto-fill template public notice when doctor & leave type change (only in create mode)
  useEffect(() => {
    if (isEditMode) return
    if (targetType === 'doctor') {
      const doc = doctors.find((d: any) => d.id === selectedDoctorId)
      const docName = doc ? `Dr. ${doc.name}` : "The Doctor"
      if (leaveType === 1) {
        setPublicNotice(`${docName} is unavailable today due to an urgent emergency. All appointments have been suspended. We deeply apologize for the inconvenience.`)
      } else {
        setPublicNotice(`${docName} will be on scheduled leave from ${startDate} to ${endDate}. OPD consultations will resume after leave completion.`)
      }
    } else {
      setPublicNotice("")
    }
  }, [isEditMode, targetType, selectedDoctorId, leaveType, startDate, endDate, doctors])

  const applyMutation = useMutation({
    mutationFn: (payload: ApplyLeaveRequest) => leaveService.applyLeave(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      queryClient.invalidateQueries({ queryKey: ['doctor-availability'] })
      toast.success(data.message || "Leave applied successfully.")
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      setApiError(err)
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors)
      } else if (err.response?.data?.message) {
        setValidationErrors({ general: [err.response.data.message] })
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ApplyLeaveRequest) => leaveService.updateLeave(leaveToEdit!.id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      queryClient.invalidateQueries({ queryKey: ['doctor-availability'] })
      toast.success(data.message || "Leave request updated successfully.")
      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      setApiError(err)
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors)
      } else if (err.response?.data?.message) {
        setValidationErrors({ general: [err.response.data.message] })
      }
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    setApiError(null)

    const errors: Record<string, string[]> = {}
    const effectiveStaffId = targetType === 'staff' ? (selectedStaffId || currentUserId) : undefined

    if (targetType === 'doctor' && !selectedDoctorId) {
      errors.DoctorId = ["Please select a doctor."]
    }
    if (targetType === 'staff' && !effectiveStaffId) {
      errors.StaffId = ["Please select a staff member."]
    }
    if (!startDate) {
      errors.StartDate = ["Start date is required."]
    }
    if (!endDate) {
      errors.EndDate = ["End date is required."]
    }
    if (startDate && endDate && startDate > endDate) {
      errors.EndDate = ["End date cannot be earlier than start date."]
    }
    if (!reason.trim()) {
      errors.Reason = ["Reason for leave is required."]
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const payload: ApplyLeaveRequest = {
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
      branchId: selectedBranchId ? selectedBranchId : undefined,
      sessionId: targetType === 'doctor' && selectedSessionId ? selectedSessionId : undefined,
      publicNotice: targetType === 'doctor' && publicNotice.trim() ? publicNotice.trim() : undefined,
      notifyPatients: targetType === 'doctor' ? (leaveType === 1 ? true : notifyPatients) : false,
      doctorId: targetType === 'doctor' ? selectedDoctorId : undefined,
      staffId: targetType === 'staff' ? effectiveStaffId : undefined
    }

    if (isEditMode) {
      updateMutation.mutate(payload)
    } else {
      applyMutation.mutate(payload)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 border ${
              leaveType === 1 
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
            }`}>
              {leaveType === 1 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : targetType === 'staff' ? (
                <UserCheck className="w-5 h-5" />
              ) : (
                <CalendarOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {isEditMode
                  ? (targetType === 'staff' ? "Edit Staff Leave Request" : "Edit Doctor Leave Request")
                  : (targetType === 'staff' 
                      ? (isStaffUser ? "My Leave Application" : "Staff Member Leave Application")
                      : "Doctor Leave / OPD Suspension")}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEditMode
                  ? "Update leave dates, session, or reasons before approval."
                  : (targetType === 'staff'
                      ? (leaveType === 1 
                          ? "Emergency personal leave request" 
                          : "Advance scheduled leave request for Admin approval")
                      : (leaveType === 1 
                          ? "Emergency unscheduled leave with instant token cancellation" 
                          : "Planned advance leave with patient public notices"))}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 [scrollbar-width:thin]">
          <ApiErrorAlert error={apiError} />
          {validationErrors.general && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-700">
              {validationErrors.general[0]}
            </div>
          )}

          {/* Leave Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Leave Classification <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLeaveType(0)}
                className={`p-2.5 sm:p-3 rounded-md border text-left transition-all flex items-start gap-2.5 ${
                  leaveType === 0 
                    ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/30' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${leaveType === 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <div className={`text-xs sm:text-sm font-bold ${leaveType === 0 ? 'text-indigo-900' : 'text-slate-900'}`}>
                    Planned Leave
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {targetType === 'staff' 
                      ? "Advance planned time-off request."
                      : "Advance schedule blocking. Patient booking prevented ahead of time."}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLeaveType(1)}
                className={`p-2.5 sm:p-3 rounded-md border text-left transition-all flex items-start gap-2.5 ${
                  leaveType === 1 
                    ? 'border-rose-600 bg-rose-50/70 ring-1 ring-rose-500/30' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${leaveType === 1 ? 'text-rose-600' : 'text-slate-400'}`} />
                <div>
                  <div className={`text-xs sm:text-sm font-bold ${leaveType === 1 ? 'text-rose-900' : 'text-slate-900'}`}>
                    Emergency / Unplanned
                  </div>
                  <div className="text-[11px] text-rose-600/90 mt-0.5 font-medium line-clamp-2">
                    {targetType === 'staff'
                      ? "Urgent unscheduled emergency leave."
                      : "Immediate OPD stop. Auto-cancels today's tokens & notifies patients."}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* User Type Switcher (Only If Admin) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target User Category
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('doctor')}
                  className={`h-9 px-3.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                    targetType === 'doctor'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('staff')}
                  className={`h-9 px-3.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                    targetType === 'staff'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Staff Member
                </button>
              </div>
            </div>
          )}

          {/* User Dropdown & Branch Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {targetType === 'doctor' ? (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                  Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={isDoctorUser && !isAdmin}
                  className="saas-input h-10 w-full px-3 text-xs bg-white text-slate-900 rounded-md border border-slate-200 focus:border-indigo-500 disabled:bg-slate-100"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization || "General"})
                    </option>
                  ))}
                </select>
                <FieldError errors={validationErrors} field="DoctorId" />
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Staff Member <span className="text-rose-500">*</span>
                </label>
                {isAdmin ? (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="saas-input h-10 w-full px-3 text-xs bg-white text-slate-900 rounded-md border border-slate-200 focus:border-indigo-500"
                  >
                    <option value="">Select Staff...</option>
                    {staffList.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.role || "Staff"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-10 w-full px-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="truncate">{user?.name || user?.email}</span>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-200 shrink-0 ml-2">
                      {user?.role || "Staff"}
                    </span>
                  </div>
                )}
                <FieldError errors={validationErrors} field="StaffId" />
              </div>
            )}

            {/* Branch */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Branch Location
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value)
                  setSelectedSessionId("")
                }}
                className="saas-input h-10 w-full px-3 text-xs bg-white text-slate-900 rounded-md border border-slate-200 focus:border-indigo-500"
              >
                <option value="">All Branches (Clinic-wide)</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session / Shift Selection (Doctors only) */}
          {targetType === 'doctor' && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                OPD Session Scope
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="saas-input h-10 w-full px-3 text-xs bg-white text-slate-900 rounded-md border border-slate-200 focus:border-indigo-500"
              >
                <option value="">Full Day (All Scheduled Sessions)</option>
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.sessionName || "Session"} ({s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range - Billing & Invoice style DatePickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative w-full">
                <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <DatePicker
                  selected={startDate ? parseDate(startDate) : new Date()}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const val = fmt(date)
                      setStartDate(val)
                      if (val > endDate) setEndDate(val)
                    }
                  }}
                  dateFormat="dd MMM yyyy"
                  showMonthDropdown
                  showYearDropdown
                  todayButton="Today"
                  dropdownMode="select"
                  portalId="root-portal"
                  showDisabledMonthNavigation
                  minDate={leaveType === 0 ? new Date() : undefined}
                  className="h-10 w-full !pl-10 pr-3 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-xs transition-all"
                />
              </div>
              <FieldError errors={validationErrors} field="StartDate" />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                End Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative w-full">
                <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <DatePicker
                  selected={endDate ? parseDate(endDate) : new Date()}
                  onChange={(date: Date | null) => {
                    if (date) setEndDate(fmt(date))
                  }}
                  dateFormat="dd MMM yyyy"
                  showMonthDropdown
                  showYearDropdown
                  todayButton="Today"
                  dropdownMode="select"
                  portalId="root-portal"
                  showDisabledMonthNavigation
                  minDate={startDate ? parseDate(startDate) : (leaveType === 0 ? new Date() : undefined)}
                  className="h-10 w-full !pl-10 pr-3 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-xs transition-all"
                />
              </div>
              <FieldError errors={validationErrors} field="EndDate" />
            </div>
          </div>

          {/* Internal Reason */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              {targetType === 'staff' ? "Reason for Leave" : "Internal Reason (Clinic / HR Records)"} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical emergency, Family function, Conference, Health checkup..."
              className="saas-input w-full p-2.5 text-xs rounded-md border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <FieldError errors={validationErrors} field="Reason" />
          </div>

          {/* Patient Public Notice (Only for doctors) */}
          {targetType === 'doctor' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Public Notice to Patients (Public Booking Portal & Bots)
                </label>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded-sm">Visible to patients</span>
              </div>
              <textarea
                rows={2}
                value={publicNotice}
                onChange={(e) => setPublicNotice(e.target.value)}
                placeholder="Notice displayed on Telegram, WhatsApp, and Queue screens..."
                className="w-full p-2 text-xs bg-white rounded-md border border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-slate-800"
              />
            </div>
          )}

          {/* Patient Notification Setting */}
          {targetType === 'doctor' && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-start gap-2.5">
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  id="notifyPatients"
                  checked={leaveType === 1 ? true : notifyPatients}
                  disabled={leaveType === 1}
                  onChange={(e) => setNotifyPatients(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 disabled:opacity-75"
                />
              </div>
              <label htmlFor="notifyPatients" className="text-xs text-slate-700 font-medium cursor-pointer">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-600" />
                  Notify Affected Patients via Outbox (WhatsApp & Telegram)
                </span>
                {leaveType === 1 ? (
                  <span className="text-rose-600 text-[11px] font-semibold block mt-0.5">
                    Mandatory for Emergency Leave: Outbox messages will automatically be dispatched with high priority (100).
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Sends cancellation alerts to any active tokens booked during this leave window.
                  </span>
                )}
              </label>
            </div>
          )}
        </form>

        {/* Footer Buttons - Clean & Always Visible */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={applyMutation.isPending || updateMutation.isPending}
            className="btn-cancel h-10 px-4 flex items-center text-xs font-semibold"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={applyMutation.isPending || updateMutation.isPending}
            className={`h-10 px-5 rounded-md text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all ${
              leaveType === 1 
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                : 'btn-primary'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isEditMode
              ? (updateMutation.isPending ? "Updating..." : "Save Changes")
              : (applyMutation.isPending 
                  ? "Submitting..." 
                  : leaveType === 1 
                    ? (targetType === 'staff' ? "Submit Emergency Leave" : "Confirm Emergency Leave") 
                    : (targetType === 'staff' ? "Submit Leave Request" : "Submit Leave Application"))}
          </button>
        </div>
      </div>
    </div>
  )
}
