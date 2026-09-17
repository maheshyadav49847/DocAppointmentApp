import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Inbox,
  Send,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar as CalendarIcon,
  CalendarDays,
  RefreshCw,
  X,
  Eye,
  Zap,
  Phone,
  Radio
} from 'lucide-react';
import { format } from 'date-fns';
import { outboxService } from '@/services/outboxService';
import type { OutboxMessageItem } from '@/services/outboxService';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '@/components/ui/PageLoader';
import { DataTablePagination } from '@/components/ui/DataTablePagination';
import toast from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';

export default function OutboxDashboardPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { activeBranchId } = useAuthStore();

  // Filters State
  const [channelFilter, setChannelFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<Date>(() => new Date());
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selected message for inspect modal
  const [inspectItem, setInspectItem] = useState<OutboxMessageItem | null>(null);

  // Auto Refresh Interval
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

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

  // Fetch Outbox Messages
  const { data: reportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['outboxMessages', activeBranchId, channelFilter, statusFilter, searchQuery, startDate, endDate, page, pageSize],
    queryFn: () =>
      outboxService.getMessages({
        branchId: activeBranchId || undefined,
        channel: channelFilter,
        status: statusFilter,
        search: searchQuery,
        startDate,
        endDate,
        page,
        pageSize
      }),
    refetchInterval: autoRefresh ? 4000 : false // Auto-poll every 4s to track live background progress
  });

  // Requeue / Retry mutation
  const retryMutation = useMutation({
    mutationFn: (id: string) => outboxService.retryMessage(id),
    onSuccess: () => {
      toast.success('Message requeued in Outbox for immediate dispatch!');
      queryClient.invalidateQueries({ queryKey: ['outboxMessages'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to retry message.');
    }
  });

  const items = reportData?.items || [];
  const totalCount = reportData?.totalCount || 0;
  const pendingCount = reportData?.pendingCount || 0;
  const sentCount = reportData?.sentCount || 0;
  const failedCount = reportData?.failedCount || 0;
  const deadLetterCount = reportData?.deadLetterCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'Processing':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 animate-pulse';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Failed':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'DeadLetter':
        return 'bg-red-50 text-red-700 border-red-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/80';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Sent': return 'bg-emerald-500';
      case 'Processing': return 'bg-blue-500';
      case 'Pending': return 'bg-amber-500';
      case 'Failed': return 'bg-rose-500';
      case 'DeadLetter': return 'bg-red-600';
      default: return 'bg-slate-400';
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case 'telegram':
        return 'bg-sky-50 text-sky-700 border-sky-200/80';
      case 'whatsapp':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'sms':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'email':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/80';
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 100) return <span className="px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">OTP / Critical (100)</span>;
    if (priority >= 50) return <span className="px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">Live Alert (50)</span>;
    if (priority >= 20) return <span className="px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">Token / Bill (20)</span>;
    if (priority >= 10) return <span className="px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">Prescription (10)</span>;
    return <span className="px-1.5 py-0.5 rounded-sm bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px]">Bulk / Review ({priority})</span>;
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Outbox</span>
              <span className="text-indigo-600">Hub</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                Worker Engine
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Track real-time background message dispatch across Telegram, WhatsApp, SMS & Email
            </p>
          </div>
        </div>

        {/* Action Controls - Uniform h-9 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-9 px-3 rounded-md border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoRefresh ? 'fill-emerald-500 text-emerald-600' : 'text-slate-400'}`} />
            <span>Auto-Sync {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>
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

      {/* 2. KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Outbox</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{totalCount}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">All queues</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending / Queue</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">{pendingCount}</h3>
            <p className="text-[10px] sm:text-[11px] text-amber-600/80 font-medium mt-0.5">In background worker</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered / Sent</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{sentCount}</h3>
            <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">Confirmed delivery</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retry Backoff</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">{failedCount}</h3>
            <p className="text-[10px] sm:text-[11px] text-rose-600/80 font-medium mt-0.5">Scheduled retry</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-red-700" />
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dead Letter</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-red-700 mt-0.5">{deadLetterCount}</h3>
            <p className="text-[10px] sm:text-[11px] text-red-600/80 font-medium mt-0.5">Max retries crossed</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main SaaS Card with Embedded Top Toolbar, Table, and Standard Pagination */}
      <div className="saas-card overflow-hidden">
        {/* Embedded Top Toolbar Header - Strict Uniform h-9 Controls */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-2.5">
            {/* Filters Row: Channel, Status, Date Preset, Custom Pickers, PageSize (Strict Uniform h-9) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Channel Filter */}
              <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
                <Radio className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <select
                  value={channelFilter}
                  onChange={(e) => {
                    setChannelFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  title="Filter by channel"
                >
                  <option value="All">All Channels</option>
                  <option value="Telegram">Telegram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  title="Filter by status"
                >
                  <option value="All">All Statuses ({totalCount})</option>
                  <option value="Pending">Pending ({pendingCount})</option>
                  <option value="Processing">Processing</option>
                  <option value="Sent">Sent / Delivered ({sentCount})</option>
                  <option value="Failed">Failed / Retry ({failedCount})</option>
                  <option value="DeadLetter">Dead Letter ({deadLetterCount})</option>
                </select>
              </div>

              {/* Date Preset Filter */}
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

            {/* Search Input with SKILL-mandated paddingLeft: 2.5rem clearance */}
            <div className="relative flex-1 sm:w-64 md:w-64 lg:w-72 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
              <input
                type="search"
                placeholder="Search Chat ID, Phone, Patient..."
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

        {/* Outbox Messages Table / Content Container */}
        {isLoading ? (
          <PageLoader message="Loading Outbox Messages..." minHeight="min-h-[350px]" />
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No Outbox Messages Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Any prescriptions, OTPs, or notifications dispatched by doctors and the system will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Queue ID & Patient</th>
                  <th className="px-3 py-3.5">Channel</th>
                  <th className="px-3 py-3.5">Type & Priority</th>
                  <th className="px-3 py-3.5">Recipient</th>
                  <th className="px-3 py-3.5">Document / Payload</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Retries</th>
                  <th className="px-3 py-3.5">Enqueued At</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900 text-xs">
                        {m.patientName || 'System Notification'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">
                        {m.tokenNumber ? `Token #${m.tokenNumber} • ` : ''}
                        {m.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${getChannelBadge(m.channel)}`}>
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="font-bold text-slate-800 text-xs">{m.messageType}</div>
                      <div className="mt-1">{getPriorityLabel(m.priority)}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      {m.patientPhone ? (
                        <div>
                          <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 whitespace-nowrap">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{m.patientPhone}</span>
                          </div>
                          {m.channel?.toLowerCase() === 'telegram' && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5" title={`Telegram Chat ID: ${m.recipient}`}>
                              <Send className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                              <span>ID: {m.recipient}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-slate-700 font-semibold">
                          {m.recipient}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {m.hasFile ? (
                        <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[140px]" title={m.fileName || 'Document'}>
                            {m.fileName || 'Prescription.pdf'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic font-medium">Text message</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border shadow-2xs ${getStatusBadge(m.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(m.status)}`} />
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`font-bold text-xs ${m.retryCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {m.retryCount} / {m.maxRetries}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                      <div className="font-semibold text-slate-800">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{format(new Date(m.createdAt), 'dd MMM yyyy')}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectItem(m)}
                          className="w-8 h-8 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 text-slate-400 flex items-center justify-center shadow-2xs transition-all"
                          title="Inspect full audit"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(m.status === 'Failed' || m.status === 'DeadLetter' || m.status === 'Pending') && can('Outbox.Retry') && (
                          <button
                            onClick={() => retryMutation.mutate(m.id)}
                            disabled={retryMutation.isPending}
                            className={`px-2.5 py-1.5 rounded-md border text-xs font-bold transition-all shadow-2xs flex items-center gap-1 ${
                              m.status === 'Pending'
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                            title={m.status === 'Pending' ? "Dispatch Now (Re-trigger worker)" : "Retry Dispatch Immediately"}
                          >
                            {m.status === 'Pending' ? (
                              <>
                                <Send className="w-3 h-3" />
                                <span className="hidden xl:inline">Dispatch</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3 h-3" />
                                <span className="hidden xl:inline">Retry</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Standardized Pagination */}
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-2xs">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Outbox Message Audit</h3>
                  <p className="text-xs font-mono text-slate-400">ID: {inspectItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Destination & Target</div>
                <div>Channel: <strong className="text-slate-900 uppercase font-black">{inspectItem.channel}</strong></div>
                <div>Patient: <strong className="text-slate-900">{inspectItem.patientName || 'N/A'}</strong></div>
                {inspectItem.patientPhone && (
                  <div>Patient Phone: <strong className="text-slate-900">{inspectItem.patientPhone}</strong></div>
                )}
                <div>Message Type: <strong className="text-slate-900">{inspectItem.messageType}</strong></div>
                <div>Priority Level: <strong className="text-slate-900">{inspectItem.priority}</strong></div>
                <div>
                  Recipient Target: <code className="bg-slate-200/60 px-1 py-0.5 rounded-xs font-mono">{inspectItem.recipient}</code>
                  {inspectItem.channel?.toLowerCase() === 'telegram' && (
                    <span className="text-[10px] text-slate-500 ml-1.5">(Telegram Chat ID)</span>
                  )}
                </div>
                <div>Clinic Branch: <strong className="text-slate-900">{inspectItem.branchName}</strong></div>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Dispatch Lifecycle</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border shadow-2xs ${getStatusBadge(inspectItem.status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(inspectItem.status)}`} />
                    {inspectItem.status}
                  </span>
                </div>
                <div>Enqueued At: <strong className="text-slate-800">{new Date(inspectItem.createdAt).toLocaleString()}</strong></div>
                <div>Processed At: <strong className="text-slate-800">{inspectItem.processedAtUtc ? new Date(inspectItem.processedAtUtc).toLocaleString() : 'Not processed yet'}</strong></div>
                <div>Next Scheduled Retry: <strong className="text-slate-800">{inspectItem.nextRetryAtUtc ? new Date(inspectItem.nextRetryAtUtc).toLocaleString() : 'N/A'}</strong></div>
                <div>Retry Count: <strong className="text-slate-800">{inspectItem.retryCount} of {inspectItem.maxRetries}</strong></div>
              </div>

              {inspectItem.errorMessage && (
                <div className="bg-rose-50 p-3.5 rounded-md border border-rose-200 text-rose-700 space-y-1">
                  <div className="font-bold uppercase text-[10px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Error Detail:
                  </div>
                  <div className="font-mono break-all text-xs">{inspectItem.errorMessage}</div>
                </div>
              )}

              {inspectItem.messageBody && (
                <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Message Caption / Content:</div>
                  <div className="text-slate-800 bg-white p-2.5 rounded-md border border-slate-200/60 break-words font-medium">
                    {inspectItem.messageBody}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              {(inspectItem.status === 'Failed' || inspectItem.status === 'DeadLetter' || inspectItem.status === 'Pending') ? (
                <button
                  onClick={() => {
                    retryMutation.mutate(inspectItem.id);
                    setInspectItem(null);
                  }}
                  className={`btn-primary ${
                    inspectItem.status === 'Pending'
                      ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                      : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                  }`}
                >
                  {inspectItem.status === 'Pending' ? (
                    <>
                      <Send className="w-3.5 h-3.5" /> Dispatch Now
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" /> Requeue Now
                    </>
                  )}
                </button>
              ) : <div />}

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
