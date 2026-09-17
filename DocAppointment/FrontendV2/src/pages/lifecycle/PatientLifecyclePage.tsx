import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Route,
  Calendar as CalendarIcon,
  CalendarDays,
  Search,
  Clock,
  Stethoscope,
  ReceiptIndianRupee,
  Star,
  CheckCircle2,
  Eye,
  RefreshCw,
  Ticket,
  Building2,
  X,
  Users,
  Ban,
  Pill,
  Send,
  AlertTriangle
} from 'lucide-react';
import { reportService } from '@/services/reportService';
import { doctorService } from '@/services/doctorService';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '@/components/ui/PageLoader';
import { DataTablePagination } from '@/components/ui/DataTablePagination';
import { MaskedPhone } from '@/components/ui/MaskedPhone';

export default function PatientLifecyclePage() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const { activeBranchId } = useAuthStore();

  // Filters State
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<Date>(() => new Date());
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState<string>(urlSearch);
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selected item modal for detailed audit inspection
  const [inspectItem, setInspectItem] = useState<any | null>(null);

  // Compute ISO Dates based on preset
  const { startDate, endDate } = useMemo(() => {
    let s = new Date();
    let e = new Date();

    if (datePreset === 'today') {
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
    } else if (datePreset === 'yesterday') {
      s.setDate(s.getDate() - 1);
      s.setHours(0, 0, 0, 0);
      e.setDate(e.getDate() - 1);
      e.setHours(23, 59, 59, 999);
    } else if (datePreset === 'week') {
      s.setDate(s.getDate() - 7);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
    } else if (datePreset === 'month') {
      s.setDate(s.getDate() - 30);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
    } else if (datePreset === 'custom') {
      s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
    }

    return { startDate: s.toISOString(), endDate: e.toISOString() };
  }, [datePreset, customStart, customEnd]);

  // Doctors query (filtered by active branch if selected)
  const { data: doctors = [] } = useQuery({
    queryKey: ['org-doctors', activeBranchId],
    queryFn: () => (activeBranchId && activeBranchId !== 'org' && activeBranchId !== 'all')
      ? doctorService.getBranchDoctors(activeBranchId)
      : doctorService.getOrganizationDoctors(),
  });

  // Main Lifecycle Report Query
  const { data: lifecycleData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['patient-lifecycle', activeBranchId, selectedDoctor, startDate, endDate, searchQuery, stageFilter, page, pageSize],
    queryFn: () =>
      reportService.getPatientLifecycleReport({
        startDate,
        endDate,
        branchId: activeBranchId || undefined,
        doctorId: selectedDoctor,
        search: searchQuery,
        stage: stageFilter,
        page,
        pageSize,
      }),
  });

  const items = lifecycleData?.items || [];
  const totalCount = lifecycleData?.TotalCount || lifecycleData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'Billed':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'Consulted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      case 'InConsultation':
        return 'bg-purple-50 text-purple-700 border-purple-200/80 animate-pulse';
      case 'Waiting':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/80';
    }
  };

  const getStageDotColor = (stage: string) => {
    switch (stage) {
      case 'Completed': return 'bg-emerald-500';
      case 'Billed': return 'bg-blue-500';
      case 'Consulted': return 'bg-indigo-500';
      case 'InConsultation': return 'bg-purple-500';
      case 'Waiting': return 'bg-amber-500';
      case 'Cancelled': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const getStageAccentColor = (stage: string) => {
    switch (stage) {
      case 'Completed': return 'from-emerald-500 to-teal-500';
      case 'Billed': return 'from-blue-500 to-indigo-500';
      case 'Consulted': return 'from-indigo-500 to-blue-500';
      case 'InConsultation': return 'from-purple-500 to-pink-500';
      case 'Waiting': return 'from-amber-400 to-orange-500';
      case 'Cancelled': return 'from-rose-500 to-pink-600';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'telegram':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'whatsapp':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <Route className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Patient</span>
              <span className="text-indigo-600">Journey</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                End-to-End Audit
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Track booking, live queue, doctor consultation, prescription delivery, and billing in one unified timeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary h-9 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics Summary Strip */}
      {lifecycleData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Booked</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{lifecycleData.totalBooked || 0}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">All visits</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consulted</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-600 mt-0.5">{lifecycleData.totalConsulted || 0}</h3>
              <p className="text-[10px] sm:text-[11px] text-indigo-600/80 font-medium mt-0.5">Visits completed</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoices Gen</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-0.5">{lifecycleData.totalBilled || 0}</h3>
              <p className="text-[10px] sm:text-[11px] text-blue-600/80 font-medium mt-0.5">Billed tokens</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ReceiptIndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">₹{lifecycleData.totalRevenue?.toLocaleString('en-IN') || 0}</h3>
              <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">Settled invoices</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ReceiptIndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">{lifecycleData.totalCancelled || 0}</h3>
              <p className="text-[10px] sm:text-[11px] text-rose-600/80 font-medium mt-0.5">No-show / revoked</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Ban className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600" />
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Matched Visits</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-0.5">{totalCount}</h3>
              <p className="text-[10px] sm:text-[11px] text-purple-600/80 font-medium mt-0.5">Filtered results</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Journey Container with Unified Toolbar */}
      <div className="saas-card overflow-hidden">
        {/* Unified Top Toolbar Header - Strict Uniform h-9 Controls */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-2.5">
            {/* Filters Row: Doctor, Stage, Date Range, Custom Pickers, PageSize (Strict Uniform h-9) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Doctor Filter */}
              <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <select
                  value={selectedDoctor}
                  onChange={(e) => {
                    setSelectedDoctor(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  title="Filter by doctor"
                >
                  <option value="all">All Doctors</option>
                  {doctors.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization || 'Consultant'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Filter */}
              <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
                <Route className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <select
                  value={stageFilter}
                  onChange={(e) => {
                    setStageFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  title="Filter by stage"
                >
                  <option value="All">All Stages</option>
                  <option value="Waiting">Waiting</option>
                  <option value="InConsultation">In Consultation</option>
                  <option value="Consulted">Consulted</option>
                  <option value="Billed">Billed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Range Selector */}
              <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <select
                  value={datePreset}
                  onChange={(e: any) => {
                    setDatePreset(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  title="Filter by date preset"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Pickers */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <DatePicker
                      selected={customStart}
                      onChange={(d: Date | null) => d && setCustomStart(d)}
                      dateFormat="dd MMM yyyy"
                      showMonthDropdown
                      showYearDropdown
                      todayButton="Today"
                      dropdownMode="select"
                      portalId="root-portal"
                      showDisabledMonthNavigation
                      className="pl-8 pr-2.5 h-9 w-32 bg-white border border-slate-200/90 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
                      maxDate={customEnd}
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-bold">to</span>
                  <div className="relative">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <DatePicker
                      selected={customEnd}
                      onChange={(d: Date | null) => d && setCustomEnd(d)}
                      dateFormat="dd MMM yyyy"
                      showMonthDropdown
                      showYearDropdown
                      todayButton="Today"
                      dropdownMode="select"
                      portalId="root-portal"
                      showDisabledMonthNavigation
                      className="pl-8 pr-2.5 h-9 w-32 bg-white border border-slate-200/90 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
                      minDate={customStart}
                    />
                  </div>
                </div>
              )}

              {/* Rows Per Page */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 bg-white border border-slate-200/90 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-2xs transition-all"
                title="Rows per page"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    Show {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box with SKILL paddingLeft: 2.5rem clearance */}
            <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
              <input
                type="search"
                placeholder="Search Patient, Phone, CX-123456..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="saas-input h-9 w-full text-xs pr-8"
                style={{ paddingLeft: "2.5rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Journey Content */}
        <div className="p-3 sm:p-4 bg-slate-50/40">
          <div className="space-y-3.5">
        {isLoading ? (
          <PageLoader message="Loading patient lifecycle records..." />
        ) : items.length === 0 ? (
          <div className="saas-card p-12 text-center">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Route className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No Patient Visits Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Try changing the date selection, branch, or stage filter.</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div
              key={item.tokenId}
              className="saas-card overflow-hidden hover:border-indigo-200 transition-all duration-200"
            >
              {/* Subtle top accent line indicating stage */}
              <div className={`h-0.5 bg-gradient-to-r ${getStageAccentColor(item.currentStage)}`} />

              {/* Card Header: Patient Identity & Global Status */}
              <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-2xs shrink-0">
                    {item.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-extrabold text-slate-900">{item.patientName}</span>
                      <span className="text-xs text-slate-500 font-mono font-semibold">({item.patientCode})</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${getSourceBadge(item.bookingSource)}`}>
                        {item.bookingSource}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-0.5 font-medium">
                      {item.phone && (
                        <MaskedPhone
                          phone={item.phone}
                          showIcon
                          textClassName="text-xs text-slate-600 font-semibold"
                        />
                      )}
                      {item.gender && (
                        <span>
                          {item.gender} {item.age ? `• ${item.age} yrs` : ''}
                        </span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Building2 className="w-3 h-3 text-slate-400" /> {item.branchName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-sm border shadow-2xs inline-flex items-center gap-1.5 ${getStageColor(item.currentStage)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStageDotColor(item.currentStage)}`} />
                    {item.currentStage}
                  </span>
                  <button
                    onClick={() => setInspectItem(item)}
                    className="w-8 h-8 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 text-slate-400 flex items-center justify-center shadow-2xs transition-all"
                    title="Audit Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 5-Step Progressive Horizontal Stepper */}
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Step 1: Booking */}
                  <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-200/50">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Ticket className="w-3.5 h-3.5 text-indigo-600" /> 1. Booking
                        </span>
                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xs px-1.5 py-0.5 text-xs">#{item.tokenNumber}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800 tracking-wide">{item.tokenReferenceId}</div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(item.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-2 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200/60 w-fit truncate">
                      {item.sessionName}
                    </div>
                  </div>

                  {/* Step 2: Queue / Calling */}
                  <div
                    className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                      item.calledAt ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300' : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-200/50">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> 2. Queue Wait
                        </span>
                        {item.calledAt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.waitDurationMinutes > 0 ? `${item.waitDurationMinutes} mins wait` : 'Called / Waiting'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        {item.calledAt ? `Called at ${new Date(item.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In Queue'}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 mt-2 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200/60 w-fit truncate">
                      Dr. {item.doctorName}
                    </div>
                  </div>

                  {/* Step 3: Consultation */}
                  <div
                    className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                      item.hasConsultation ? 'bg-indigo-50/40 border-indigo-200/80 hover:border-indigo-300' : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-200/50">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> 3. Consultation
                        </span>
                        {item.hasConsultation && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate" title={item.diagnosis || 'Consulted'}>
                        {item.diagnosis || (item.hasConsultation ? 'Prescription Done' : 'Pending Consult')}
                      </div>
                      <div className="mt-1">
                        {item.medicinesPrescribedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100/70 border border-indigo-200/60 px-1.5 py-0.5 rounded-xs">
                            <Pill className="w-3 h-3 text-indigo-600" /> {item.medicinesPrescribedCount} Medicines
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">No meds</span>
                        )}
                      </div>
                      {item.hasOutboxDispatch && (
                        <div className="mt-1.5 flex items-center gap-1">
                          {item.outboxStatus === 'Sent' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Send className="w-2.5 h-2.5" /> {item.outboxChannel || 'TG'} Sent
                            </span>
                          )}
                          {(item.outboxStatus === 'Pending' || item.outboxStatus === 'Processing') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              <Clock className="w-2.5 h-2.5" /> Outbox Queue
                            </span>
                          )}
                          {(item.outboxStatus === 'Failed' || item.outboxStatus === 'DeadLetter') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" /> Delivery Failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-2 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200/60 w-fit truncate">
                      {item.followUpDate ? `Follow up: ${new Date(item.followUpDate).toLocaleDateString()}` : 'No follow-up set'}
                    </div>
                  </div>

                  {/* Step 4: Billing */}
                  <div
                    className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                      item.hasInvoice ? 'bg-blue-50/40 border-blue-200/80 hover:border-blue-300' : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-200/50">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <ReceiptIndianRupee className="w-3.5 h-3.5 text-blue-600" /> 4. Billing
                        </span>
                        {item.invoiceStatus === 'Paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {item.hasInvoice ? `₹${item.totalAmount}` : 'Unbilled'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        Status: <strong className={item.invoiceStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>{item.invoiceStatus || 'Pending'}</strong>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-500 mt-2 bg-white px-1.5 py-0.5 rounded-xs border border-slate-200/60 w-fit truncate">
                      {item.invoiceNumber || 'No invoice #'}
                    </div>
                  </div>

                  {/* Step 5: Rating / Review */}
                  <div
                    className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                      item.hasRating ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300' : 'bg-slate-50/50 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-200/50">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 5. Feedback
                        </span>
                        {item.hasRating && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        {item.ratingScore ? (
                          <>
                            <span className="text-amber-600 font-extrabold">★ {item.ratingScore}/5</span>
                            <span className="text-slate-400 font-normal">rating</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">Pending / Skipped</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 truncate italic font-medium" title={item.ratingComment || ''}>
                        {item.ratingComment ? `"${item.ratingComment}"` : 'No comments'}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-2">
                      Patient Experience
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

          </div>
        </div>

        {/* Standardized Pagination as footer of Main SaaS Card */}
        {totalCount > 0 && (
          <DataTablePagination
            pageIndex={page - 1}
            pageSize={pageSize}
            totalCount={totalCount}
            pageCount={totalPages}
            canPreviousPage={page > 1}
            canNextPage={page < totalPages}
            onPageChange={(newIdx) => setPage(newIdx + 1)}
          />
        )}
      </div>
      {/* Inspect Item Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-2xs">
                  {inspectItem.patientName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{inspectItem.patientName}</h3>
                  <p className="text-xs text-slate-500 font-medium">Ref: {inspectItem.tokenReferenceId} • Token #{inspectItem.tokenNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audit Details Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Booking Audit</div>
                <div>Source: <strong className="text-slate-800">{inspectItem.bookingSource}</strong></div>
                <div>Booked At: <strong className="text-slate-800">{new Date(inspectItem.bookedAt).toLocaleString()}</strong></div>
                <div>Branch: <strong className="text-slate-800">{inspectItem.branchName}</strong></div>
                <div>Assigned Doctor: <strong className="text-slate-800">{inspectItem.doctorName}</strong></div>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Queue Performance</div>
                <div>Wait Duration: <strong className="text-slate-800">{inspectItem.waitDurationMinutes} mins</strong></div>
                <div>Consult Duration: <strong className="text-slate-800">{inspectItem.consultDurationMinutes} mins</strong></div>
                <div>Called At: <strong className="text-slate-800">{inspectItem.calledAt ? new Date(inspectItem.calledAt).toLocaleString() : 'N/A'}</strong></div>
                <div>Completed At: <strong className="text-slate-800">{inspectItem.completedAt ? new Date(inspectItem.completedAt).toLocaleString() : 'N/A'}</strong></div>
              </div>

              {inspectItem.hasConsultation && (
                <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">3. Clinical Records</div>
                  <div>Diagnosis: <strong className="text-slate-800">{inspectItem.diagnosis || 'None'}</strong></div>
                  <div>Symptoms: <strong className="text-slate-800">{inspectItem.symptoms || 'None'}</strong></div>
                  <div>Medicines Count: <strong className="text-slate-800">{inspectItem.medicinesPrescribedCount}</strong></div>
                </div>
              )}

              {/* Outbox Background Dispatch Audit */}
              <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">4. Outbox Prescription Delivery</div>
                  {inspectItem.hasOutboxDispatch && (
                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-black uppercase ${
                      inspectItem.outboxStatus === 'Sent' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      inspectItem.outboxStatus === 'Failed' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {inspectItem.outboxStatus}
                    </span>
                  )}
                </div>
                {inspectItem.hasOutboxDispatch ? (
                  <>
                    <div>Channel: <strong className="text-slate-800">{inspectItem.outboxChannel}</strong></div>
                    <div>Outbox ID: <code className="text-[10px] bg-slate-200/60 px-1 py-0.5 rounded-xs font-mono text-slate-700">{inspectItem.outboxId}</code></div>
                    <div>Delivered At: <strong className="text-slate-800">{inspectItem.outboxDeliveredAt ? new Date(inspectItem.outboxDeliveredAt).toLocaleString() : 'Processing / In Queue'}</strong></div>
                    {inspectItem.outboxRetryCount > 0 && (
                      <div>Retries: <strong className="text-amber-700">{inspectItem.outboxRetryCount} attempts</strong></div>
                    )}
                    {inspectItem.outboxErrorMessage && (
                      <div className="text-rose-600">Error: <strong>{inspectItem.outboxErrorMessage}</strong></div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-400 italic">No prescription dispatch queued or patient contact not on Telegram/WhatsApp.</div>
                )}
              </div>

              {inspectItem.hasInvoice && (
                <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">5. Financial Settlement</div>
                  <div>Invoice Number: <strong className="text-slate-800">{inspectItem.invoiceNumber}</strong></div>
                  <div>Total Billed: <strong className="text-slate-800">₹{inspectItem.totalAmount}</strong></div>
                  <div>Amount Paid: <strong className="text-emerald-700">₹{inspectItem.paidAmount}</strong></div>
                  <div>Payment Mode: <strong className="text-slate-800">{inspectItem.paymentMode || 'N/A'}</strong></div>
                  <div>Invoice Status: <strong className="text-slate-800">{inspectItem.invoiceStatus}</strong></div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectItem(null)}
                className="btn-cancel"
              >
                <X className="w-4 h-4" /> Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
