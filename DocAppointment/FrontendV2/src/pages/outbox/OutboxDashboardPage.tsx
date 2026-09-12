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
  Building2,
  Calendar as CalendarIcon,
  RefreshCw,
  X,
  Eye,
  Zap
} from 'lucide-react';
import { outboxService } from '@/services/outboxService';
import type { OutboxMessageItem } from '@/services/outboxService';
import { branchService } from '@/services/branchService';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';

export default function OutboxDashboardPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { user, activeBranchId } = useAuthStore();
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || '';
  const isMultiBranch = role === 'orgadmin' || role === 'superadmin';

  // Filters State
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId || 'all');
  const [channelFilter, setChannelFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<Date>(() => new Date());
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

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

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getMyBranches(),
    enabled: isMultiBranch
  });
  const myBranches = branchesData || [];

  // Fetch Outbox Messages
  const { data: reportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['outboxMessages', selectedBranch, channelFilter, statusFilter, searchQuery, startDate, endDate, page],
    queryFn: () =>
      outboxService.getMessages({
        branchId: selectedBranch,
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Failed':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'DeadLetter':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 100) return <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">OTP / Critical (100)</span>;
    if (priority >= 50) return <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">Live Alert (50)</span>;
    if (priority >= 20) return <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Token / Bill (20)</span>;
    if (priority >= 10) return <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">Prescription (10)</span>;
    return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">Bulk / Review ({priority})</span>;
  };

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <Inbox className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Outbox</span>
              <span className="text-indigo-600">Delivery Hub</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Track real-time background message dispatch across Telegram, WhatsApp, SMS & Email
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoRefresh ? 'fill-emerald-500' : ''}`} />
            Auto-Sync {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition border border-slate-200 shadow-sm"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-indigo-500" /> Total Outbox
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1">All queues</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending / Queue
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
          <div className="text-[10px] text-amber-500 font-semibold mt-1">In background worker</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Delivered / Sent
          </div>
          <div className="text-2xl font-black text-emerald-600">{sentCount}</div>
          <div className="text-[10px] text-emerald-500 font-semibold mt-1">Confirmed delivery</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> Retry Backoff
          </div>
          <div className="text-2xl font-black text-rose-600">{failedCount}</div>
          <div className="text-[10px] text-rose-500 font-semibold mt-1">Scheduled next retry</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Dead Letter
          </div>
          <div className="text-2xl font-black text-red-700">{deadLetterCount}</div>
          <div className="text-[10px] text-red-500 font-semibold mt-1">Max retries crossed</div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Branch */}
          {isMultiBranch && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Clinic Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="all">All Clinics</option>
                {myBranches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel Filter */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Dispatch Channel
            </label>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none"
            >
              <option value="All">All Channels</option>
              <option value="Telegram">Telegram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="Email">Email</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Delivery Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending (Queue)</option>
              <option value="Processing">Processing</option>
              <option value="Sent">Sent (Success)</option>
              <option value="Failed">Failed (Retrying)</option>
              <option value="DeadLetter">DeadLetter (Exhausted)</option>
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" /> Date Range
            </label>
            <select
              value={datePreset}
              onChange={(e: any) => {
                setDatePreset(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Live Search */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" /> Search Recipient / File
            </label>
            <input
              type="text"
              placeholder="ChatId, Phone, Patient name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">Start:</span>
              <DatePicker
                selected={customStart}
                onChange={(d: Date | null) => d && setCustomStart(d)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">End:</span>
              <DatePicker
                selected={customEnd}
                onChange={(d: Date | null) => d && setCustomEnd(d)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Outbox Messages Table */}
      <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <PageLoader message="Loading Outbox Messages..." minHeight="min-h-[400px]" />
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 mx-auto mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Outbox Messages Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Any prescriptions, OTPs, or notifications dispatched by doctors and the system will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Queue ID & Patient</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-3 py-3">Type & Priority</th>
                  <th className="px-3 py-3">Recipient</th>
                  <th className="px-3 py-3">Document / Payload</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Retries</th>
                  <th className="px-3 py-3">Enqueued At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {m.patientName || 'System Notification'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {m.tokenNumber ? `Token #${m.tokenNumber} • ` : ''}
                        {m.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-black text-slate-700 uppercase tracking-wider text-[10px]">
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{m.messageType}</div>
                      <div className="mt-0.5">{getPriorityLabel(m.priority)}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-700 font-medium">
                      {m.recipient}
                    </td>
                    <td className="px-3 py-3">
                      {m.hasFile ? (
                        <div className="flex items-center gap-1 text-indigo-600 font-semibold text-[11px]">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[140px]" title={m.fileName || 'Document'}>
                            {m.fileName || 'Prescription.pdf'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Text message</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(m.status)}`}>
                        ● {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-bold ${m.retryCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {m.retryCount} / {m.maxRetries}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">
                      <div>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectItem(m)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition"
                          title="Inspect full audit"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(m.status === 'Failed' || m.status === 'DeadLetter' || m.status === 'Pending') && can('Outbox.Retry') && (
                          <button
                            onClick={() => retryMutation.mutate(m.id)}
                            disabled={retryMutation.isPending}
                            className={`p-1.5 rounded-lg transition ${
                              m.status === 'Pending'
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            }`}
                            title={m.status === 'Pending' ? "Dispatch Now (Re-trigger worker)" : "Retry Dispatch Immediately"}
                          >
                            {m.status === 'Pending' ? (
                              <Send className="w-3.5 h-3.5" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
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

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Outbox Message Audit</h3>
                <p className="text-xs font-mono text-slate-400">ID: {inspectItem.id}</p>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                <div>Channel: <strong className="text-slate-900 uppercase font-black">{inspectItem.channel}</strong></div>
                <div>Message Type: <strong className="text-slate-900">{inspectItem.messageType}</strong></div>
                <div>Priority Level: <strong className="text-slate-900">{inspectItem.priority}</strong></div>
                <div>Recipient: <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono">{inspectItem.recipient}</code></div>
                <div>Clinic Branch: <strong className="text-slate-900">{inspectItem.branchName}</strong></div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Current Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(inspectItem.status)}`}>
                    {inspectItem.status}
                  </span>
                </div>
                <div>Enqueued At: <strong>{new Date(inspectItem.createdAt).toLocaleString()}</strong></div>
                <div>Processed At: <strong>{inspectItem.processedAtUtc ? new Date(inspectItem.processedAtUtc).toLocaleString() : 'Not processed yet'}</strong></div>
                <div>Next Scheduled Retry: <strong>{inspectItem.nextRetryAtUtc ? new Date(inspectItem.nextRetryAtUtc).toLocaleString() : 'N/A'}</strong></div>
                <div>Retry Count: <strong>{inspectItem.retryCount} of {inspectItem.maxRetries}</strong></div>
              </div>

              {inspectItem.errorMessage && (
                <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-200 text-rose-700 space-y-1">
                  <div className="font-bold uppercase text-[10px]">Error Detail:</div>
                  <div className="font-mono break-all">{inspectItem.errorMessage}</div>
                </div>
              )}

              {inspectItem.messageBody && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Message Caption / Content:</div>
                  <div className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/60 break-words">
                    {inspectItem.messageBody}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              {(inspectItem.status === 'Failed' || inspectItem.status === 'DeadLetter' || inspectItem.status === 'Pending') ? (
                <button
                  onClick={() => {
                    retryMutation.mutate(inspectItem.id);
                    setInspectItem(null);
                  }}
                  className={`px-4 py-2 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                    inspectItem.status === 'Pending'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
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
                className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
