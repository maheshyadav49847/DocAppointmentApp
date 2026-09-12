import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Route,
  Calendar as CalendarIcon,
  Search,
  Clock,
  Stethoscope,
  ReceiptIndianRupee,
  Star,
  CheckCircle2,
  Eye,
  RefreshCw,
  Phone,
  Ticket,
  Building2,
  X
} from 'lucide-react';
import { reportService } from '@/services/reportService';
import { branchService } from '@/services/branchService';
import { doctorService } from '@/services/doctorService';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '@/components/ui/PageLoader';

export default function PatientLifecyclePage() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const { user, activeBranchId } = useAuthStore();
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || '';
  const isMultiBranch = role === 'orgadmin' || role === 'superadmin';

  // Filters State
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId || 'all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<Date>(() => new Date());
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState<string>(urlSearch);
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

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

  // Branches & Doctors query
  const { data: myBranches = [] } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchService.getMyBranches(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['org-doctors'],
    queryFn: () => doctorService.getOrganizationDoctors(),
  });

  // Main Lifecycle Report Query
  const { data: lifecycleData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['patient-lifecycle', selectedBranch, selectedDoctor, startDate, endDate, searchQuery, stageFilter, page],
    queryFn: () =>
      reportService.getPatientLifecycleReport({
        startDate,
        endDate,
        branchId: selectedBranch,
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Billed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Consulted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'InConsultation':
        return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
      case 'Waiting':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'telegram':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'whatsapp':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <Route className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Patient Journey &</span>
              <span className="text-indigo-600">Lifecycle</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                End-to-End Audit
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Track booking, live queue, doctor consultation, prescription delivery, and billing in one unified timeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Branch Filter */}
          {isMultiBranch && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Branch / Clinic
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Branches</option>
                {myBranches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Doctor Filter */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> Doctor
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Doctors</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization || 'Consultant'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Date Selection
            </label>
            <select
              value={datePreset}
              onChange={(e: any) => {
                setDatePreset(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Search Patient / Token / Bill #
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name, Phone, CX-123456..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Custom Date Pickers Row if selected */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">From:</span>
              <DatePicker
                selected={customStart}
                onChange={(d: Date | null) => d && setCustomStart(d)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">To:</span>
              <DatePicker
                selected={customEnd}
                onChange={(d: Date | null) => d && setCustomEnd(d)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
        )}

        {/* Quick Lifecycle Stage Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Stage:</span>
          {['All', 'Waiting', 'InConsultation', 'Consulted', 'Billed', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStageFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                stageFilter === st
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st === 'All' ? 'All Visits' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      {lifecycleData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Booked</div>
            <div className="text-xl font-black text-slate-900 mt-1">{lifecycleData.totalBooked || 0}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consulted</div>
            <div className="text-xl font-black text-indigo-600 mt-1">{lifecycleData.totalConsulted || 0}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoices Generated</div>
            <div className="text-xl font-black text-blue-600 mt-1">{lifecycleData.totalBilled || 0}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</div>
            <div className="text-xl font-black text-emerald-600 mt-1">₹{lifecycleData.totalRevenue?.toLocaleString('en-IN') || 0}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</div>
            <div className="text-xl font-black text-rose-600 mt-1">{lifecycleData.totalCancelled || 0}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Matched Visits</div>
            <div className="text-xl font-black text-slate-700 mt-1">{totalCount}</div>
          </div>
        </div>
      )}

      {/* Main Lifecycle Timeline List */}
      <div className="space-y-4">
        {isLoading ? (
          <PageLoader message="Loading patient lifecycle records..." />
        ) : items.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Route className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Patient Visits Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try changing the date range, branch, or stage filter.</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div
              key={item.tokenId}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Card Header: Patient Identity & Global Status */}
              <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                    {item.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{item.patientName}</span>
                      <span className="text-xs text-slate-400 font-mono font-semibold">({item.patientCode})</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getSourceBadge(item.bookingSource)}`}>
                        {item.bookingSource}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {item.phone && (
                        <span className="flex items-center gap-1 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" /> {item.phone}
                        </span>
                      )}
                      {item.gender && (
                        <span className="font-medium">
                          {item.gender} {item.age ? `• ${item.age} yrs` : ''}
                        </span>
                      )}
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Building2 className="w-3 h-3 text-slate-400" /> {item.branchName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${getStageColor(item.currentStage)}`}>
                    ● {item.currentStage}
                  </span>
                  <button
                    onClick={() => setInspectItem(item)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200"
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
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Ticket className="w-3.5 h-3.5 text-indigo-500" /> 1. Booking
                        </span>
                        <span className="font-black text-indigo-600 text-sm">#{item.tokenNumber}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">{item.tokenReferenceId}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        🕒 {new Date(item.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-2 truncate">
                      {item.sessionName}
                    </div>
                  </div>

                  {/* Step 2: Queue / Calling */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      item.calledAt ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> 2. Queue Wait
                        </span>
                        {item.calledAt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.waitDurationMinutes > 0 ? `${item.waitDurationMinutes} mins wait` : 'Called / Waiting'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {item.calledAt ? `Called at ${new Date(item.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In Queue'}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-2 truncate">
                      Doctor: {item.doctorName}
                    </div>
                  </div>

                  {/* Step 3: Consultation */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      item.hasConsultation ? 'bg-indigo-50/40 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-500" /> 3. Consultation
                        </span>
                        {item.hasConsultation && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate" title={item.diagnosis || 'Consulted'}>
                        {item.diagnosis || (item.hasConsultation ? 'Prescription Done' : 'Pending Consult')}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {item.medicinesPrescribedCount > 0 ? `💊 ${item.medicinesPrescribedCount} Medicines` : 'No meds'}
                      </div>
                      {item.hasOutboxDispatch && (
                        <div className="mt-1.5 flex items-center gap-1">
                          {item.outboxStatus === 'Sent' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ {item.outboxChannel || 'TG'} Sent
                            </span>
                          )}
                          {(item.outboxStatus === 'Pending' || item.outboxStatus === 'Processing') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              ⏳ Outbox Queue
                            </span>
                          )}
                          {(item.outboxStatus === 'Failed' || item.outboxStatus === 'DeadLetter') && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              ⚠ Delivery Failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-2 truncate">
                      {item.followUpDate ? `Follow up: ${new Date(item.followUpDate).toLocaleDateString()}` : 'No follow-up set'}
                    </div>
                  </div>

                  {/* Step 4: Billing */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      item.hasInvoice ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <ReceiptIndianRupee className="w-3.5 h-3.5 text-blue-500" /> 4. Billing
                        </span>
                        {item.invoiceStatus === 'Paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.hasInvoice ? `₹${item.totalAmount}` : 'Unbilled'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Status: <strong className={item.invoiceStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>{item.invoiceStatus}</strong>
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-2 truncate">
                      {item.invoiceNumber || 'No invoice #'}
                    </div>
                  </div>

                  {/* Step 5: Rating / Review */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      item.hasRating ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 5. Feedback
                        </span>
                        {item.hasRating && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        {item.ratingScore ? (
                          <>
                            <span className="text-amber-600">★ {item.ratingScore}/5</span>
                            <span className="text-slate-400 font-normal">rating</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-normal">Pending / Skipped</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 truncate" title={item.ratingComment || ''}>
                        {item.ratingComment ? `"${item.ratingComment}"` : 'No comments'}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-2">
                      Patient Experience
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination Bar */}
        {totalCount > pageSize && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount} visits
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Item Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                  {inspectItem.patientName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{inspectItem.patientName}</h3>
                  <p className="text-xs text-slate-400 font-medium">Ref: {inspectItem.tokenReferenceId} • Token #{inspectItem.tokenNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Details Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Booking Audit</div>
                <div>Source: <strong className="text-slate-800">{inspectItem.bookingSource}</strong></div>
                <div>Booked At: <strong className="text-slate-800">{new Date(inspectItem.bookedAt).toLocaleString()}</strong></div>
                <div>Branch: <strong className="text-slate-800">{inspectItem.branchName}</strong></div>
                <div>Assigned Doctor: <strong className="text-slate-800">{inspectItem.doctorName}</strong></div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Queue Performance</div>
                <div>Wait Duration: <strong className="text-slate-800">{inspectItem.waitDurationMinutes} mins</strong></div>
                <div>Consult Duration: <strong className="text-slate-800">{inspectItem.consultDurationMinutes} mins</strong></div>
                <div>Called At: <strong className="text-slate-800">{inspectItem.calledAt ? new Date(inspectItem.calledAt).toLocaleString() : 'N/A'}</strong></div>
                <div>Completed At: <strong className="text-slate-800">{inspectItem.completedAt ? new Date(inspectItem.completedAt).toLocaleString() : 'N/A'}</strong></div>
              </div>

              {inspectItem.hasConsultation && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">3. Clinical Records</div>
                  <div>Diagnosis: <strong className="text-slate-800">{inspectItem.diagnosis || 'None'}</strong></div>
                  <div>Symptoms: <strong className="text-slate-800">{inspectItem.symptoms || 'None'}</strong></div>
                  <div>Medicines Count: <strong className="text-slate-800">{inspectItem.medicinesPrescribedCount}</strong></div>
                </div>
              )}

              {/* Outbox Background Dispatch Audit */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">4. Outbox Prescription Delivery</div>
                  {inspectItem.hasOutboxDispatch && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      inspectItem.outboxStatus === 'Sent' ? 'bg-emerald-100 text-emerald-800' :
                      inspectItem.outboxStatus === 'Failed' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {inspectItem.outboxStatus}
                    </span>
                  )}
                </div>
                {inspectItem.hasOutboxDispatch ? (
                  <>
                    <div>Channel: <strong className="text-slate-800">{inspectItem.outboxChannel}</strong></div>
                    <div>Outbox ID: <code className="text-[10px] bg-slate-200/60 px-1 py-0.5 rounded font-mono text-slate-700">{inspectItem.outboxId}</code></div>
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
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
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
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
