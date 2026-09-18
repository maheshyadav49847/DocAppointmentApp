import { useState, useMemo } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Stethoscope, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  X, 
  Plus, 
  RotateCcw,
  Sparkles,
  Pencil
} from "lucide-react"
import type { LeaveRecordDto } from "@/services/leaveService"

interface LeaveCalendarViewProps {
  leaves: LeaveRecordDto[]
  onApplyLeave?: (dateStr?: string) => void
  onApproveLeave?: (leave: LeaveRecordDto) => void
  onRejectLeave?: (leave: LeaveRecordDto) => void
  onCancelLeave?: (leaveId: string) => void
  onEditLeave?: (leave: LeaveRecordDto) => void
  isAdmin: boolean
  currentUserDoctorId?: string
  currentUserEmail?: string
  currentUserId?: string
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const toYMD = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function LeaveCalendarView({
  leaves,
  onApplyLeave,
  onApproveLeave,
  onRejectLeave,
  onCancelLeave,
  onEditLeave,
  isAdmin,
  currentUserDoctorId,
  currentUserEmail,
  currentUserId
}: LeaveCalendarViewProps) {
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => toYMD(today), [today])

  // Current view month & year
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  // Day detail modal state
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: Array<{
      date: Date
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isToday: boolean
    }> = []

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i)
      days.push({
        date: d,
        dateStr: toYMD(d),
        dayNum: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: toYMD(d) === todayStr
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      const dateStr = toYMD(dateObj)
      days.push({
        date: dateObj,
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      })
    }

    // Next month leading days to complete grid rows
    const totalCells = Math.ceil(days.length / 7) * 7
    const remaining = totalCells - days.length
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d)
      days.push({
        date: dateObj,
        dateStr: toYMD(dateObj),
        dayNum: d,
        isCurrentMonth: false,
        isToday: toYMD(dateObj) === todayStr
      })
    }

    return days
  }, [year, month, todayStr])

  // Map leaves by date for fast O(1) lookup
  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveRecordDto[]>()

    // Only active or pending leaves (filter out rejected/cancelled from calendar grid)
    const validLeaves = leaves.filter(l => l.status !== 2 && l.status !== 3)

    for (const leave of validLeaves) {
      const start = new Date(leave.startDate.split('T')[0])
      const end = new Date(leave.endDate.split('T')[0])

      // Iterate through leave date range
      const curr = new Date(start)
      while (curr <= end) {
        const key = toYMD(curr)
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(leave)
        curr.setDate(curr.getDate() + 1)
      }
    }

    return map
  }, [leaves])

  // Leaves active in current viewed month
  const monthStats = useMemo(() => {
    const monthStart = toYMD(new Date(year, month, 1))
    const monthEnd = toYMD(new Date(year, month + 1, 0))

    const activeInMonth = leaves.filter(l => 
      l.status !== 2 && l.status !== 3 &&
      l.startDate.split('T')[0] <= monthEnd && 
      l.endDate.split('T')[0] >= monthStart
    )

    return {
      totalLeaves: activeInMonth.length,
      doctorLeaves: activeInMonth.filter(l => !!l.doctorId).length,
      staffLeaves: activeInMonth.filter(l => !l.doctorId).length,
      emergencyLeaves: activeInMonth.filter(l => l.leaveType === 1).length
    }
  }, [leaves, year, month])

  // Leaves on selected day for modal detail
  const selectedDayLeaves = useMemo(() => {
    if (!selectedDayStr) return []
    return leaves.filter(l => 
      l.startDate.split('T')[0] <= selectedDayStr && 
      l.endDate.split('T')[0] >= selectedDayStr
    )
  }, [leaves, selectedDayStr])

  return (
    <div className="space-y-3">
      {/* Calendar Header Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Month Title & Navigation */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-xs"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="h-8 px-3 rounded-md text-xs font-bold text-slate-700 hover:bg-white transition-all shadow-xs"
              title="Jump to Current Month"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-xs"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {MONTH_NAMES[month]} <span className="text-indigo-600">{year}</span>
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {monthStats.totalLeaves} on Leave
            </span>
          </div>
        </div>

        {/* Right: Legend Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50/80 border border-indigo-200 text-indigo-700">
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
            <span>Doctor Planned</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50/80 border border-rose-200 text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Emergency / Unplanned</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50/80 border border-amber-200 text-amber-800">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Staff Leave</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Approval</span>
          </div>
        </div>
      </div>

      {/* Main Month Calendar Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-bold text-xs text-slate-600">
          {DAYS_OF_WEEK.map((dayName, idx) => (
            <div 
              key={dayName} 
              className={`py-2.5 uppercase tracking-wider text-[11px] ${
                idx === 0 || idx === 6 ? 'text-rose-500 font-extrabold' : 'text-slate-600'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/30">
          {calendarDays.map((cell) => {
            const dayLeaves = leavesByDate.get(cell.dateStr) || []
            const hasLeaves = dayLeaves.length > 0
            const isToday = cell.isToday

            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedDayStr(cell.dateStr)}
                className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  !cell.isCurrentMonth 
                    ? 'bg-slate-50/60 opacity-40 hover:opacity-75' 
                    : 'bg-white hover:bg-indigo-50/30'
                } ${isToday ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20' : ''}`}
              >
                {/* Date Number Row */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-md ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {hasLeaves && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
                      {dayLeaves.length}
                    </span>
                  )}
                </div>

                {/* Day Leaves Badges (Max 3, then +N more) */}
                <div className="mt-1 flex-1 flex flex-col gap-1 overflow-hidden">
                  {dayLeaves.slice(0, 3).map((leave) => {
                    const isDoctor = !!leave.doctorId
                    const isEmergency = leave.leaveType === 1
                    const isPending = leave.status === 0

                    let badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200"
                    if (isEmergency) {
                      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200"
                    } else if (!isDoctor) {
                      badgeStyle = "bg-amber-50 text-amber-800 border-amber-200"
                    }

                    return (
                      <div
                        key={leave.id}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border truncate flex items-center gap-1 shadow-2xs ${badgeStyle} ${
                          isPending ? 'border-dashed' : ''
                        }`}
                        title={`${isDoctor ? `Dr. ${leave.doctorName}` : leave.staffName} (${leave.reason})`}
                      >
                        {isDoctor ? (
                          <Stethoscope className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <UserCheck className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {isDoctor ? `Dr. ${leave.doctorName?.split(' ')[0]}` : leave.staffName?.split(' ')[0]}
                        </span>
                        {isPending && <Clock className="w-2 h-2 text-amber-500 shrink-0 ml-auto" />}
                      </div>
                    )
                  })}

                  {dayLeaves.length > 3 && (
                    <div className="text-[10px] font-extrabold text-slate-500 text-center py-0.5 bg-slate-100/80 rounded-sm">
                      +{dayLeaves.length - 3} more
                    </div>
                  )}
                </div>

                {/* Subtle Add indicator on hover */}
                <div className="text-right mt-1 opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700">View &rarr;</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Detail Modal */}
      {selectedDayStr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedDayStr(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Leaves on {new Date(selectedDayStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' })}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedDayLeaves.length} active leave / suspension record(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayStr(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200/80 hover:text-slate-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 [scrollbar-width:thin]">
              {selectedDayLeaves.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-slate-800">Everyone is Available</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    No doctor or staff member is scheduled on leave on this date.
                  </p>
                  <button
                    onClick={() => {
                      const date = selectedDayStr
                      setSelectedDayStr(null)
                      onApplyLeave?.(date)
                    }}
                    className="mt-3.5 btn-primary h-9 px-3.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply Leave for this Date</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayLeaves.map((leave) => {
                    const isDoctor = !!leave.doctorId
                    const isSelf = (currentUserDoctorId && currentUserDoctorId === leave.doctorId) || 
                                   (currentUserEmail && leave.staffEmail === currentUserEmail) ||
                                   (currentUserId && (leave.appliedByStaffId === currentUserId || leave.staffId === currentUserId))
                    const canApprove = isAdmin && leave.status === 0
                    const canEdit = (isAdmin || isSelf) && leave.status === 0
                    const canCancel = (isAdmin || isSelf) && (leave.status === 0 || leave.status === 1)

                    return (
                      <div
                        key={leave.id}
                        className={`p-3.5 rounded-lg border bg-white shadow-xs space-y-2.5 transition-all ${
                          leave.leaveType === 1 
                            ? 'border-rose-200 bg-rose-50/20' 
                            : isDoctor 
                            ? 'border-indigo-100 hover:border-indigo-200' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Top Info */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                              isDoctor ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isDoctor ? <Stethoscope className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                {isDoctor ? `Dr. ${leave.doctorName}` : leave.staffName}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {isDoctor ? (leave.doctorSpecialization || "General Physician") : (leave.staffEmail || "Staff Member")}
                                {leave.branchName && ` • ${leave.branchName}`}
                              </p>
                            </div>
                          </div>

                          {/* Status & Type Badge */}
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                              leave.leaveType === 1 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {leave.leaveType === 1 ? "Emergency Leave" : "Planned Leave"}
                            </span>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${
                              leave.status === 1 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : leave.status === 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {leave.status === 1 ? "Approved" : leave.status === 0 ? "Pending" : "Rejected"}
                            </span>
                          </div>
                        </div>

                        {/* Leave Window & Shift */}
                        <div className="p-2 bg-slate-50 rounded-md text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 border border-slate-100">
                          <div className="flex items-center gap-1.5 font-medium">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(leave.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              {" - "}
                              {new Date(leave.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {leave.sessionName && (
                            <div className="flex items-center gap-1.5 font-medium text-indigo-600">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{leave.sessionName}</span>
                            </div>
                          )}
                        </div>

                        {/* Reason */}
                        <div className="text-xs text-slate-700">
                          <span className="font-bold text-slate-800">Reason: </span>
                          <span className="text-slate-600">{leave.reason}</span>
                        </div>

                        {/* Public Notice (if Doctor) */}
                        {leave.publicNotice && (
                          <div className="p-2 bg-amber-50/70 border border-amber-200/80 rounded-md text-[11px] text-amber-800 flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Public Notice: </span>
                              <span>{leave.publicNotice}</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {(canEdit || canApprove || canCancel) && (
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end gap-2">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setSelectedDayStr(null)
                                  onEditLeave?.(leave)
                                }}
                                className="h-7 px-2.5 rounded-md text-xs font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition-colors flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                            )}
                            {canApprove && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedDayStr(null)
                                    onRejectLeave?.(leave)
                                  }}
                                  className="h-7 px-2.5 rounded-md text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedDayStr(null)
                                    onApproveLeave?.(leave)
                                  }}
                                  className="h-7 px-3 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                >
                                  Approve
                                </button>
                              </>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to cancel this leave application?")) {
                                    onCancelLeave?.(leave.id)
                                  }
                                }}
                                className="h-7 px-2.5 rounded-md text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Cancel Leave
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDayStr(null)}
                className="btn-secondary h-9 px-3 text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const date = selectedDayStr
                  setSelectedDayStr(null)
                  onApplyLeave?.(date)
                }}
                className="btn-primary h-9 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Apply Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
