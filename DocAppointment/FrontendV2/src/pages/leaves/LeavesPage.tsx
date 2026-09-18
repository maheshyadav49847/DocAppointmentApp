import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  CalendarOff, 
  PlusCircle, 
  Search, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  LayoutGrid, 
  List,
  Stethoscope, 
  UserCheck, 
  Sparkles,
  CalendarDays,
  X,
  AlertOctagon,
  Pencil
} from "lucide-react"
import toast from "react-hot-toast"
import { leaveService, type LeaveRecordDto, type LeaveType, type LeaveStatus } from "@/services/leaveService"
import { branchService } from "@/services/branchService"
import { useAuthStore } from "@/store/authStore"
import { DataTablePagination } from "@/components/ui/DataTablePagination"
import { PageLoader } from "@/components/ui/PageLoader"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import ApplyLeaveModal from "@/components/leaves/ApplyLeaveModal"
import ApproveLeaveModal from "@/components/leaves/ApproveLeaveModal"
import RejectLeaveModal from "@/components/leaves/RejectLeaveModal"
import LeaveCalendarView from "@/components/leaves/LeaveCalendarView"
import MaskedEmail from "@/components/ui/MaskedEmail"

const fmtDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function LeavesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const isAdmin = user?.role === 'OrgAdmin' || user?.role === 'BranchAdmin' || user?.role === 'SuperAdmin'

  // Modal States
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [editingLeave, setEditingLeave] = useState<LeaveRecordDto | null>(null)
  const [calendarApplyDate, setCalendarApplyDate] = useState<string | undefined>(undefined)
  const [approvingLeave, setApprovingLeave] = useState<LeaveRecordDto | null>(null)
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRecordDto | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>('grid')

  // Date Range Filters (Matching Billing & Invoices)
  const [dateRange, setDateRange] = useState<string>("all")
  const [customStart, setCustomStart] = useState<Date>(() => new Date())
  const [customEnd, setCustomEnd] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d
  })

  // Pagination
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(12)

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.getBranches()
  })

  // Fetch leaves
  const { data: leaves = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leaves', selectedBranchId, search],
    queryFn: () => leaveService.getLeaves({
      branchId: selectedBranchId || undefined,
      search: search.trim() || undefined
    })
  })

  // Date range calculation (Matching Billing & Invoices pattern)
  const { filterStartDate, filterEndDate } = useMemo(() => {
    if (dateRange === 'all') return { filterStartDate: null, filterEndDate: null }
    const now = new Date()
    if (dateRange === 'today') {
      const s = fmtDate(now)
      return { filterStartDate: s, filterEndDate: s }
    }
    if (dateRange === 'tomorrow') {
      const tom = new Date(now)
      tom.setDate(tom.getDate() + 1)
      const s = fmtDate(tom)
      return { filterStartDate: s, filterEndDate: s }
    }
    if (dateRange === 'this_week') {
      const curr = new Date(now)
      const first = curr.getDate() - curr.getDay()
      const startOfWeek = new Date(curr.setDate(first))
      const endOfWeek = new Date(curr.setDate(first + 6))
      return { filterStartDate: fmtDate(startOfWeek), filterEndDate: fmtDate(endOfWeek) }
    }
    if (dateRange === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { filterStartDate: fmtDate(startOfMonth), filterEndDate: fmtDate(endOfMonth) }
    }
    if (dateRange === 'custom') {
      return {
        filterStartDate: customStart ? fmtDate(customStart) : null,
        filterEndDate: customEnd ? fmtDate(customEnd) : null
      }
    }
    return { filterStartDate: null, filterEndDate: null }
  }, [dateRange, customStart, customEnd])

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave: LeaveRecordDto) => {
      if (statusFilter !== "ALL" && leave.status.toString() !== statusFilter) {
        return false
      }
      if (typeFilter !== "ALL" && leave.leaveType.toString() !== typeFilter) {
        return false
      }
      if (filterStartDate && filterEndDate) {
        if (leave.startDate > filterEndDate || leave.endDate < filterStartDate) {
          return false
        }
      }
      return true
    })
  }, [leaves, statusFilter, typeFilter, filterStartDate, filterEndDate])

  // Pagination slicing
  const pageCount = Math.ceil(filteredLeaves.length / pageSize) || 1
  const paginatedLeaves = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredLeaves.slice(start, start + pageSize)
  }, [filteredLeaves, pageIndex, pageSize])

  // Cancel leave mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveService.cancelLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      toast.success("Leave cancelled successfully.")
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to cancel leave.")
    }
  })

  // Quick stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 0).length,
      approved: leaves.filter(l => l.status === 1).length,
      rejected: leaves.filter(l => l.status === 2).length,
      cancelled: leaves.filter(l => l.status === 3).length,
      activeToday: leaves.filter(l => l.status === 1 && l.startDate <= todayStr && l.endDate >= todayStr).length,
      emergency: leaves.filter(l => l.leaveType === 1).length
    }
  }, [leaves])

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 0:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" />
            Pending Approval
          </span>
        )
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Approved
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            Rejected
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <RotateCcw className="w-3 h-3 text-slate-400" />
            Cancelled
          </span>
        )
    }
  }

  const getTypeBadge = (type: LeaveType) => {
    if (type === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-extrabold bg-rose-100/80 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Emergency / Unplanned
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <CalendarDays className="w-3 h-3 text-indigo-500" />
        Planned Leave
      </span>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header - Styled like BranchesPage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <CalendarOff className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Leave</span>
              <span className="text-indigo-600">Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Staff attendance, doctor OPD suspensions & emergency patient notifications.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => {
              setEditingLeave(null)
              setIsApplyModalOpen(true)
            }}
            className="btn-primary h-9 px-3 sm:px-3.5 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Apply Leave / Suspension</span>
          </button>
        </div>
      </div>

      {/* Stats / Metric Strip - Styled with Top Gradient Lines like BranchesPage */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Records */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Records</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{stats.total}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">All applications</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarOff className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">{stats.pending}</h3>
            <p className="text-[10px] sm:text-[11px] text-amber-700/80 font-medium mt-0.5">Awaiting Admin action</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Active Today */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Today</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.activeToday}</h3>
            <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">Currently on leave</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Emergency Suspensions */}
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Emergency Leaves</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">{stats.emergency}</h3>
            <p className="text-[10px] sm:text-[11px] text-rose-700/80 font-medium mt-0.5">Unplanned OPD stops</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main SaaS Card with Toolbar and Content - Identical Architecture to BranchesPage */}
      <div className="saas-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left Side: View Mode Toggle, Status Filter, Type Filter, Branch Filter & Rows Per Page */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full md:w-auto order-2 md:order-1">
            {/* View Mode Toggle - Exactly identical to BranchesPage UI */}
            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-xs shrink-0 h-9">
              <button
                onClick={() => setViewMode('grid')}
                className={`h-full px-2.5 rounded-sm transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`h-full px-2.5 rounded-sm transition-all flex items-center justify-center ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`h-full px-2.5 rounded-sm transition-all flex items-center justify-center ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Monthly Calendar View"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPageIndex(0)
              }}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Filter by status"
            >
              <option value="ALL">All Statuses ({stats.total})</option>
              <option value="0">Pending ({stats.pending})</option>
              <option value="1">Approved ({stats.approved})</option>
              <option value="2">Rejected ({stats.rejected})</option>
              <option value="3">Cancelled ({stats.cancelled})</option>
            </select>

            {/* Leave Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPageIndex(0)
              }}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Filter by leave type"
            >
              <option value="ALL">All Types</option>
              <option value="0">Planned Leave</option>
              <option value="1">Emergency / Unplanned</option>
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value)
                setPageIndex(0)
              }}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Filter by branch"
            >
              <option value="">All Branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Date Range Selector - Matching Billing & Invoices */}
            <div className="flex items-center bg-white border border-slate-200 rounded-md px-2.5 h-9 shadow-xs shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value)
                  setPageIndex(0)
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                title="Filter by date range"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range Pickers (Exact Same as BillingDashboardPage) */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={customStart}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setCustomStart(date)
                        setPageIndex(0)
                      }
                    }}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    todayButton="Today"
                    dropdownMode="select"
                    portalId="root-portal"
                    showDisabledMonthNavigation
                    className="!pl-8.5 pr-2.5 h-9 w-32 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                    maxDate={customEnd}
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">to</span>
                <div className="relative">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={customEnd}
                    onChange={(date: Date | null) => {
                      if (date) {
                        setCustomEnd(date)
                        setPageIndex(0)
                      }
                    }}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    todayButton="Today"
                    dropdownMode="select"
                    portalId="root-portal"
                    showDisabledMonthNavigation
                    className="!pl-8.5 pr-2.5 h-9 w-32 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                    minDate={customStart}
                  />
                </div>
              </div>
            )}

            {/* Rows Per Page */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPageIndex(0)
              }}
              className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs transition-all"
              title="Rows per page"
            >
              {[12, 24, 48, 96].map(size => (
                <option key={size} value={size}>Show {size}</option>
              ))}
            </select>
          </div>

          {/* Right Side: Search Input with Magnifier & Clear Button (Exact Same h-9 Height) */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full md:w-auto order-1 md:order-2">
            <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="search"
                placeholder="Search leaves, doctor, reason..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPageIndex(0)
                }}
                className="saas-input h-9 w-full text-xs"
                style={{ paddingLeft: "2.3rem", paddingRight: search ? "2rem" : "0.75rem" }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card or Table Content Area */}
        <div className="p-3 sm:p-4 bg-slate-50/50">
          {isError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-rose-200 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 mb-3">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Failed to Load Leaves</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {(error as any)?.response?.data?.message || (error as any)?.message || 'Unable to connect to the server. Please try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs rounded-md border border-indigo-200 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading leave applications..." minHeight="min-h-[25vh]" />
          ) : viewMode === 'calendar' ? (
            /* Interactive Monthly Calendar View */
            <LeaveCalendarView
              leaves={filteredLeaves}
              onApplyLeave={(dateStr) => {
                setEditingLeave(null)
                setCalendarApplyDate(dateStr)
                setIsApplyModalOpen(true)
              }}
              onEditLeave={(leave) => {
                setEditingLeave(leave)
                setIsApplyModalOpen(true)
              }}
              onApproveLeave={(leave) => setApprovingLeave(leave)}
              onRejectLeave={(leave) => setRejectingLeave(leave)}
              onCancelLeave={(id) => cancelMutation.mutate(id)}
              isAdmin={isAdmin}
              currentUserDoctorId={user?.doctorId}
              currentUserEmail={user?.email}
              currentUserId={user?.id}
            />
          ) : filteredLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-lg border border-dashed border-slate-200 p-8 shadow-xs">
              <div className="w-12 h-12 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-200 mb-3">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Leave Records Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {search || statusFilter !== 'ALL' || typeFilter !== 'ALL' || selectedBranchId
                  ? "No leave applications match your search query or filter criteria. Try adjusting filters."
                  : "No leave records or OPD suspensions have been submitted yet. Click 'Apply Leave' to schedule."}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View with Standardized Aesthetics */
            <div className="overflow-x-auto overflow-y-hidden bg-white rounded-lg border border-slate-200 shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Entity / Practitioner</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Classification</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Leave Window</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Location & Shift</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Reason / Patient Notice</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedLeaves.map((leave: LeaveRecordDto) => {
                    const isDoctor = !!leave.doctorId
                    const isSelf = (user?.doctorId && user.doctorId === leave.doctorId) || 
                                   (user?.email && leave.staffEmail === user.email) ||
                                   (user?.id && (leave.appliedByStaffId === user.id || leave.staffId === user.id))
                    const canApprove = isAdmin && leave.status === 0
                    const canEdit = (isAdmin || isSelf) && leave.status === 0
                    const canCancel = (isAdmin || isSelf) && (leave.status === 0 || leave.status === 1)

                    return (
                      <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                              isDoctor ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-teal-50 text-teal-600 border-teal-200'
                            }`}>
                              {isDoctor ? <Stethoscope className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">
                                {leave.doctorName ? `Dr. ${leave.doctorName}` : (leave.staffName || "Staff Member")}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {leave.doctorSpecialization || (leave.staffEmail ? <MaskedEmail email={leave.staffEmail} /> : "Staff Member")}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getTypeBadge(leave.leaveType)}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}
                          </div>
                          {leave.affectedTokensCount > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 block mt-0.5">
                              {leave.affectedTokensCount} cancelled tokens
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-700 block">{leave.branchName}</span>
                          <span className="text-[11px] text-indigo-600 font-bold">{leave.sessionName}</span>
                        </td>

                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="truncate text-slate-700 font-medium" title={leave.reason}>
                            {leave.reason}
                          </p>
                          {leave.publicNotice && (
                            <p className="truncate text-[11px] text-amber-700 font-medium mt-0.5" title={leave.publicNotice}>
                              Notice: {leave.publicNotice}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getStatusBadge(leave.status)}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingLeave(leave)
                                  setIsApplyModalOpen(true)
                                }}
                                title="Edit Leave Request"
                                className="h-8 px-2.5 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-2xs flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                            )}

                            {canApprove && (
                              <>
                                <button
                                  onClick={() => setApprovingLeave(leave)}
                                  title="Approve Leave"
                                  className="h-8 px-2.5 rounded-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs flex items-center gap-1 transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectingLeave(leave)}
                                  title="Reject Leave"
                                  className="h-8 px-2.5 rounded-md text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs flex items-center gap-1 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}

                            {canCancel && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to cancel this leave?")) {
                                    cancelMutation.mutate(leave.id)
                                  }
                                }}
                                disabled={cancelMutation.isPending}
                                title="Cancel Leave"
                                className="h-8 px-2.5 rounded-md text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid Cards View - Enhanced with Top Gradient Accents like BranchesPage */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {paginatedLeaves.map((leave: LeaveRecordDto) => {
                const isDoctor = !!leave.doctorId
                const isSelf = (user?.doctorId && user.doctorId === leave.doctorId) || 
                               (user?.email && leave.staffEmail === user.email) ||
                               (user?.id && (leave.appliedByStaffId === user.id || leave.staffId === user.id))
                const canApprove = isAdmin && leave.status === 0
                const canEdit = (isAdmin || isSelf) && leave.status === 0
                const canCancel = (isAdmin || isSelf) && (leave.status === 0 || leave.status === 1)

                // Top Accent Line gradient determination
                let topGradient = "bg-slate-200 group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-indigo-500"
                if (leave.leaveType === 1) {
                  topGradient = "bg-gradient-to-r from-rose-500 to-pink-500"
                } else if (leave.status === 1) {
                  topGradient = "bg-gradient-to-r from-emerald-500 to-teal-500"
                } else if (leave.status === 0) {
                  topGradient = "bg-gradient-to-r from-amber-400 to-orange-400"
                }

                return (
                  <div 
                    key={leave.id}
                    className="bg-white rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-indigo-200/90 hover:-translate-y-0.5 transition-all duration-300 flex flex-col group relative overflow-hidden"
                  >
                    {/* Top Accent Line like BranchesPage */}
                    <div className={`h-1 w-full transition-all duration-300 ${topGradient}`} />

                    {/* Card Header Section */}
                    <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 border ${
                            isDoctor 
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                              : 'bg-teal-50 text-teal-600 border-teal-200'
                          }`}>
                            {isDoctor ? <Stethoscope className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {leave.doctorName ? `Dr. ${leave.doctorName}` : (leave.staffName || "Staff Member")}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {leave.doctorSpecialization || (leave.staffEmail ? <MaskedEmail email={leave.staffEmail} /> : "Staff Member")}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(leave.status)}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 sm:p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {/* Classification & Branch Row */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          {getTypeBadge(leave.leaveType)}
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {leave.branchName}
                          </span>
                        </div>

                        {/* Dates Banner with Calendar Icon & Session */}
                        <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200/80 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100">
                              {leave.sessionName}
                            </span>
                          </div>

                          {/* Affected tokens warning if emergency */}
                          {leave.affectedTokensCount > 0 && (
                            <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1 pt-1 border-t border-slate-200/60">
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              <span>{leave.affectedTokensCount} patient {leave.affectedTokensCount === 1 ? 'appointment' : 'appointments'} cancelled</span>
                            </div>
                          )}
                        </div>

                        {/* Internal Reason */}
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">
                            Reason:
                          </span>
                          <p className="line-clamp-2 italic text-slate-600 bg-slate-50/60 p-2 rounded-sm border border-slate-100 text-[11px]">
                            "{leave.reason}"
                          </p>
                        </div>

                        {/* Public Notice to Patients if present */}
                        {leave.publicNotice && (
                          <div className="p-2 bg-amber-50/80 rounded-md border border-amber-200 text-xs text-amber-900">
                            <span className="font-bold flex items-center gap-1 text-[10px] text-amber-800 uppercase tracking-wider mb-0.5">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Public Patient Notice:
                            </span>
                            <p className="text-[11px] font-medium leading-relaxed">
                              {leave.publicNotice}
                            </p>
                          </div>
                        )}

                        {/* Rejection Note if rejected */}
                        {leave.status === 2 && leave.rejectionReason && (
                          <div className="p-2 bg-rose-50 rounded-md border border-rose-200 text-xs text-rose-800">
                            <span className="font-bold text-[10px] block uppercase tracking-wider">Rejection Rationale:</span>
                            <p className="text-[11px] mt-0.5">{leave.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer Metadata & Action Buttons */}
                      <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="text-[10px] text-slate-400 font-medium">
                          By {leave.appliedByName}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingLeave(leave)
                                setIsApplyModalOpen(true)
                              }}
                              title="Edit Leave Request"
                              className="h-8 px-2.5 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-2xs flex items-center gap-1 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                          )}

                          {canApprove && (
                            <>
                              <button
                                onClick={() => setApprovingLeave(leave)}
                                className="h-8 px-2.5 rounded-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs flex items-center gap-1 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingLeave(leave)}
                                className="h-8 px-2.5 rounded-md text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs flex items-center gap-1 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {canCancel && (
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this leave?")) {
                                  cancelMutation.mutate(leave.id)
                                }
                              }}
                              disabled={cancelMutation.isPending}
                              className="h-8 px-2.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Standardized DataTablePagination Component */}
          {viewMode !== 'calendar' && filteredLeaves.length > 0 && (
            <div className="mt-3.5">
              <DataTablePagination
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={filteredLeaves.length}
                pageCount={pageCount}
                canPreviousPage={pageIndex > 0}
                canNextPage={pageIndex < pageCount - 1}
                onPageChange={setPageIndex}
                onPreviousPage={() => setPageIndex(p => Math.max(p - 1, 0))}
                onNextPage={() => setPageIndex(p => Math.min(p + 1, pageCount - 1))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => {
          setIsApplyModalOpen(false)
          setCalendarApplyDate(undefined)
          setEditingLeave(null)
        }}
        initialStartDate={calendarApplyDate}
        leaveToEdit={editingLeave}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leaves'] })
          setCalendarApplyDate(undefined)
          setEditingLeave(null)
        }}
      />

      <ApproveLeaveModal
        leave={approvingLeave}
        onClose={() => setApprovingLeave(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leaves'] })
        }}
      />

      <RejectLeaveModal
        leave={rejectingLeave}
        onClose={() => setRejectingLeave(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leaves'] })
        }}
      />
    </div>
  )
}
