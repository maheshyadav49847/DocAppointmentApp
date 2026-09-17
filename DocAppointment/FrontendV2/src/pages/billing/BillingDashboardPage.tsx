import { useState, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/axios';
import { PageLoader } from '@/components/ui/PageLoader';
import { Printer, CheckCircle, Search, FileText, ReceiptIndianRupee, User, Download, CalendarDays, Clock, History, CreditCard, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { billingService } from '@/services/billingService';
import { DataTablePagination } from '@/components/ui/DataTablePagination';
import QuickInvoiceModal from '../queue/components/QuickInvoiceModal';
import RecordPaymentModal from '../queue/components/RecordPaymentModal';
import toast from 'react-hot-toast';
import { branchService } from '@/services/branchService';
import { usePermissions } from '@/hooks/usePermissions';

export default function BillingDashboardPage() {
  const { can } = usePermissions();
  const { user, activeBranchId } = useAuthStore();
  const organizationId = user?.orgId || '';
  const branchId = activeBranchId || '';
  const queryClient = useQueryClient();
  const fmt = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleExportCSV = async () => {
    if (!branchId) return;
    try {
      const params = new URLSearchParams();
      params.append('organizationId', organizationId);
      params.append('branchId', branchId);
      params.append('startDate', `${fmt(historyStartDate)}T00:00:00Z`);
      params.append('endDate', `${fmt(historyEndDate)}T23:59:59Z`);
      if (historySearch) {
        params.append('search', historySearch);
      }
      const res = await api.get(`/billing/invoices/export?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV exported successfully!');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };
  const { data: myBranches = [] } = useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchService.getMyBranches(),
  });
  const activeBranch = myBranches.find(b => b.id === branchId);


  const [historySearch, setHistorySearch] = useState('');
  const [pendingDateRange, setPendingDateRange] = useState<string>('today');
  const [pendingCustomStart, setPendingCustomStart] = useState<Date>(() => new Date());
  const [pendingCustomEnd, setPendingCustomEnd] = useState<Date>(() => new Date());
  const [historyDateRange, setHistoryDateRange] = useState<string>('this_month');
  const [historyCustomStart, setHistoryCustomStart] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; });
  const [historyCustomEnd, setHistoryCustomEnd] = useState<Date>(() => new Date());
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);

  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [billingToken, setBillingToken] = useState<any | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);

  const { startDate: pendingStartDate, endDate: pendingEndDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    if (pendingDateRange === 'today') start.setHours(0,0,0,0);
    else if (pendingDateRange === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0,0,0,0); }
    else if (pendingDateRange === 'this_week') { start.setDate(start.getDate() - 7); }
    else if (pendingDateRange === 'this_month') { start.setDate(start.getDate() - 30); }
    else if (pendingDateRange === 'custom') {
      return { startDate: pendingCustomStart, endDate: pendingCustomEnd };
    }
    return { startDate: start, endDate: end };
  }, [pendingDateRange, pendingCustomStart, pendingCustomEnd]);

  const { startDate: historyStartDate, endDate: historyEndDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    if (historyDateRange === 'today') start.setHours(0,0,0,0);
    else if (historyDateRange === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0,0,0,0); }
    else if (historyDateRange === 'this_week') { start.setDate(start.getDate() - 7); }
    else if (historyDateRange === 'this_month') { start.setDate(start.getDate() - 30); }
    else if (historyDateRange === 'custom') {
      return { startDate: historyCustomStart, endDate: historyCustomEnd };
    }
    return { startDate: start, endDate: end };
  }, [historyDateRange, historyCustomStart, historyCustomEnd]);


  // Fetch Pending Bills
  const { data: pendingBillsData, isLoading: isLoadingPendingBills } = useQuery({
    queryKey: ['pending-bills', branchId, pendingSearch, pendingPage, pendingPageSize, pendingStartDate, pendingEndDate],
    queryFn: async () => {
      let url = `/billing/pending-bills?branchId=${branchId}&page=${pendingPage}&pageSize=${pendingPageSize}&startDate=${fmt(pendingStartDate)}T00:00:00Z&endDate=${fmt(pendingEndDate)}T23:59:59Z`;
      if (pendingSearch) url += `&search=${encodeURIComponent(pendingSearch)}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!branchId && activeTab === 'pending'
  });
  const pendingBills = pendingBillsData?.items || [];
  const pendingTotalPages = pendingBillsData?.totalPages || 1;
  const pendingTotalCount = pendingBillsData?.totalCount || 0;

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices', branchId, historySearch, historyPage, historyPageSize, historyStartDate, historyEndDate],
    queryFn: async () => {
      let url = `/billing/invoices?organizationId=${organizationId}&branchId=${branchId}&startDate=${fmt(historyStartDate)}T00:00:00Z&endDate=${fmt(historyEndDate)}T23:59:59Z&page=${historyPage}&pageSize=${historyPageSize}`;
      if (historySearch) url += `&search=${encodeURIComponent(historySearch)}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!branchId && activeTab === 'history'
  });
  const invoices = invoicesData?.items || [];
  const totalPages = invoicesData?.totalPages || 1;
  const totalCount = invoicesData?.totalCount || 0;


  const handlePrint = async (inv: any) => {
    const loadingToast = toast.loading('Fetching invoice details...');
    try {
      await billingService.getInvoiceById(inv.id, organizationId);
      toast.dismiss(loadingToast);
      import('@/utils/printHelper').then(m => m.handlePrintInvoice(inv.id, organizationId, activeBranch));
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load invoice details');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Billing &</span>
              <span className="text-indigo-600">Invoices</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Manage patient bills, generate invoices, and record payments.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-xs shrink-0 h-9">
          <button 
            className={`h-full px-3 text-xs font-semibold rounded-sm transition-all flex items-center gap-1.5 ${activeTab === 'pending' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Bills</span>
            {pendingTotalCount > 0 && (
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse ml-0.5"></span>
            )}
          </button>
          <button 
            className={`h-full px-3 text-xs font-semibold rounded-sm transition-all flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab('history')}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="saas-card overflow-hidden">
          {/* Toolbar */}
          <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                Pending Bills
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
                  {pendingTotalCount} Pending
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="flex items-center bg-white border border-slate-200 rounded-md px-2.5 h-9 shadow-xs shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <select
                  value={pendingDateRange}
                  onChange={(e) => { setPendingDateRange(e.target.value); setPendingPage(1); }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {pendingDateRange === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <DatePicker
                      selected={pendingCustomStart}
                      onChange={(date: Date | null) => { if(date) { setPendingCustomStart(date); setPendingPage(1); } }}
                      dateFormat="dd MMM yyyy"
                      showMonthDropdown
                      showYearDropdown
                      todayButton="Today"
                      dropdownMode="select"
                      portalId="root-portal"
                      showDisabledMonthNavigation
                      className="pl-8 pr-2.5 h-9 w-32 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                      maxDate={pendingCustomEnd}
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-bold">to</span>
                  <div className="relative">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <DatePicker
                      selected={pendingCustomEnd}
                      onChange={(date: Date | null) => { if(date) { setPendingCustomEnd(date); setPendingPage(1); } }}
                      dateFormat="dd MMM yyyy"
                      showMonthDropdown
                      showYearDropdown
                      todayButton="Today"
                      dropdownMode="select"
                      portalId="root-portal"
                      showDisabledMonthNavigation
                      className="pl-8 pr-2.5 h-9 w-32 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                      minDate={pendingCustomStart}
                      maxDate={new Date()}
                    />
                  </div>
                </div>
              )}

              <select 
                value={pendingPageSize}
                onChange={(e) => { setPendingPageSize(Number(e.target.value)); setPendingPage(1); }}
                className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>

              <div className="relative flex-1 sm:w-64 group">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Search pending bills..."
                  value={pendingSearch}
                  onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1); }}
                  className="saas-input h-9 w-full text-xs"
                  style={{ paddingLeft: "2.35rem", paddingRight: pendingSearch ? "2rem" : "0.75rem" }}
                />
                {pendingSearch && (
                  <button
                    onClick={() => { setPendingSearch(''); setPendingPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Token Ref ID</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Patient Name</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Doctor</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Booking Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Consulted At</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoadingPendingBills ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center mb-2"><PageLoader /></div>
                      Loading pending bills...
                    </td>
                  </tr>
                ) : !pendingBills || pendingBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-medium">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mb-4 border-4 border-emerald-100">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700 mb-1">All clear!</h3>
                      <p>There are no pending bills right now.</p>
                    </td>
                  </tr>
                ) : (
                  pendingBills.map((bill: any) => (
                    <tr key={bill.tokenId} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                          {bill.tokenReferenceId}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{bill.patientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" /> {bill.doctorName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                          {new Date(bill.bookedAt || bill.completedAt).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                          {new Date(bill.completedAt).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {can('Billing.CreateInvoice') && (
                          <button
                            onClick={() => {
                              setBillingToken({
                                id: bill.tokenId,
                                patientId: bill.patientId,
                                patientName: bill.patientName,
                                queue: { doctorId: bill.doctorId }
                              });
                            }}
                            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-sm text-sm inline-flex items-center gap-1.5"
                          >
                            <ReceiptIndianRupee className="w-4 h-4" />
                            Generate Bill
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Standardized Pagination */}
          {pendingTotalCount > 0 && (
            <DataTablePagination
              pageIndex={pendingPage - 1}
              pageSize={pendingPageSize}
              totalCount={pendingTotalCount}
              pageCount={pendingTotalPages}
              canPreviousPage={pendingPage > 1}
              canNextPage={pendingPage < pendingTotalPages}
              onPageChange={(newIdx) => setPendingPage(newIdx + 1)}
            />
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="saas-card overflow-hidden">
          {/* Toolbar */}
          <div className="p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                Invoice History
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="flex items-center bg-white border border-slate-200 rounded-md px-2.5 h-9 shadow-xs shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <select
                  value={historyDateRange}
                  onChange={(e) => { setHistoryDateRange(e.target.value); setHistoryPage(1); }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {historyDateRange === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <DatePicker
                      selected={historyCustomStart}
                      onChange={(date: Date | null) => { if(date) { setHistoryCustomStart(date); setHistoryPage(1); } }}
                      dateFormat="dd MMM yyyy"
                      showMonthDropdown
                      showYearDropdown
                      todayButton="Today"
                      dropdownMode="select"
                      portalId="root-portal"
                      showDisabledMonthNavigation
                      className="pl-8 pr-2.5 h-9 w-32 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                      maxDate={historyCustomEnd}
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-bold">to</span>
                  <div className="relative">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <DatePicker
                      selected={historyCustomEnd}
                      onChange={(date: Date | null) => { if(date) { setHistoryCustomEnd(date); setHistoryPage(1); } }}
                      dateFormat="dd MMM yyyy"
                      showMonthDropdown
                      showYearDropdown
                      todayButton="Today"
                      dropdownMode="select"
                      portalId="root-portal"
                      showDisabledMonthNavigation
                      className="pl-8 pr-2.5 h-9 w-32 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                      minDate={historyCustomStart}
                      maxDate={new Date()}
                    />
                  </div>
                </div>
              )}

              <select 
                value={historyPageSize}
                onChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1); }}
                className="h-9 bg-white border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>

              <div className="relative flex-1 sm:w-64 group">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Search invoices..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="saas-input h-9 w-full text-xs"
                  style={{ paddingLeft: "2.35rem", paddingRight: historySearch ? "2rem" : "0.75rem" }}
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {can('Billing.Export') && (
                <button
                  onClick={handleExportCSV}
                  className="btn-secondary h-9 px-3 text-xs font-bold shrink-0 flex items-center gap-1.5"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Token Ref ID</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Patient Name</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Doctor</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Booking Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment Date</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoadingInvoices ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex justify-center mb-2"><PageLoader /></div>
                      Loading history...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 font-medium text-sm">No invoices found.</td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-indigo-600 text-xs">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inv.tokenReferenceId ? (
                          <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm text-xs">
                            {inv.tokenReferenceId}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-semibold text-xs">{inv.patientName}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{inv.doctorName || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {inv.bookingDate ? new Date(inv.bookingDate).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {inv.paymentDate ? new Date(inv.paymentDate).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-wider border ${
                          inv.status === 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          inv.status === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          inv.status === 3 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {inv.status === 2 ? 'Paid' : inv.status === 1 ? 'Partial' : inv.status === 3 ? 'Cancelled' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900 text-xs">₹{inv.totalAmount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end items-center gap-1">
                          {inv.status !== 2 && inv.status !== 3 && can('Billing.RecordPayment') && (
                            <button 
                              onClick={() => setPaymentInvoice(inv)} 
                              className="h-7 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-md flex items-center gap-1 font-bold text-xs transition-colors shadow-2xs"
                            >
                              <CreditCard className="w-3 h-3" /> Pay
                            </button>
                          )}
                          <button 
                            onClick={() => handlePrint(inv)} 
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-200 shadow-2xs transition-all"
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Standardized Pagination */}
          {totalCount > 0 && (
            <DataTablePagination
              pageIndex={historyPage - 1}
              pageSize={historyPageSize}
              totalCount={totalCount}
              pageCount={totalPages}
              canPreviousPage={historyPage > 1}
              canNextPage={historyPage < totalPages}
              onPageChange={(newIdx) => setHistoryPage(newIdx + 1)}
            />
          )}
        </div>
      )}

      {/* Reusing QuickInvoiceModal for generating bill */}
      {billingToken && (
        <QuickInvoiceModal
          isOpen={!!billingToken}
          onClose={() => {
            setBillingToken(null);
            queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
          billingToken={billingToken}
        />
      )}

          {paymentInvoice && (
        <RecordPaymentModal
          invoiceId={paymentInvoice.id}
          patientName={paymentInvoice.patientName}
          onClose={() => setPaymentInvoice(null)}
          onPrint={(invId: string) => {
            handlePrint({ id: invId });
          }}
        />
      )}
    </div>
  );
}
