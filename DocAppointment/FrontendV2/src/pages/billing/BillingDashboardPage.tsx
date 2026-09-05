import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/axios';
import { PageLoader } from '@/components/ui/PageLoader';
import { Plus, Printer, CheckCircle, Search, X, FileText, ReceiptIndianRupee, Trash2, CreditCard, User, Activity, Download, CalendarDays, Clock, History } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { billingService, type ServiceItem } from '@/services/billingService';
import QuickInvoiceModal from '../queue/components/QuickInvoiceModal';
import toast from 'react-hot-toast';
import { branchService } from '@/services/branchService';

export default function BillingDashboardPage() {
  const { user, activeBranchId } = useAuthStore();
  const organizationId = user?.orgId || '';
  const branchId = activeBranchId || '';
  const queryClient = useQueryClient();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

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

  const [searchParams] = useSearchParams();
  const [historySearch, setHistorySearch] = useState('');
  const [pendingStartDate, setPendingStartDate] = useState<Date>(() => new Date());
  const [pendingEndDate, setPendingEndDate] = useState<Date>(() => new Date());
  const [historyStartDate, setHistoryStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [historyEndDate, setHistoryEndDate] = useState<Date>(() => new Date());
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [billingToken, setBillingToken] = useState<any | null>(null);

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
      const fullInv = await billingService.getInvoiceById(inv.id, organizationId);
      toast.dismiss(loadingToast);
      import('@/utils/printHelper').then(m => m.handlePrintInvoice(inv.id, organizationId, activeBranch));
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load invoice details');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6 p-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Billing &</span>
              <span className="text-indigo-600">Invoices</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage patient bills, generate invoices, and record payments.</p>
          </div>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
          <button 
            className={`px-5 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab('pending')}
          >
            <span className="relative flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Bills
              {pendingTotalCount > 0 && (
                <span className="absolute -top-1 -right-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              )}
            </span>
          </button>
          <button 
            className={`px-5 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Pending Bills
              <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 ml-2">
                {pendingTotalCount} Pending
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={pendingStartDate}
                    onChange={(date: Date | null) => date && setPendingStartDate(date)}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    todayButton="Today"
                    dropdownMode="select"
                    className="pl-9 pr-3 py-2 w-36 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    maxDate={pendingEndDate}
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">to</span>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={pendingEndDate}
                    onChange={(date: Date | null) => date && setPendingEndDate(date)}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    todayButton="Today"
                    dropdownMode="select"
                    className="pl-9 pr-3 py-2 w-36 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    minDate={pendingStartDate}
                    maxDate={new Date()}
                  />
                </div>
              </div>
              <select 
                value={pendingPageSize}
                onChange={(e) => { setPendingPageSize(Number(e.target.value)); setPendingPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search pending bills..."
                  value={pendingSearch}
                  onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1); }}
                  className="pl-9 pr-4 py-2 w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-auto flex-1 bg-white p-4 sm:p-6">
            <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm w-full min-w-max overflow-hidden">
              <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Token Ref ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Patient Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Doctor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Completed At</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoadingPendingBills ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center mb-2"><PageLoader /></div>
                      Loading pending bills...
                    </td>
                  </tr>
                ) : !pendingBills || pendingBills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500 font-medium">
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
                        {new Date(bill.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pending Bills Pagination Controls */}
          {pendingTotalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <div className="text-sm text-slate-500">
                Showing <span className="font-bold text-slate-700">{(pendingPage - 1) * pendingPageSize + 1}</span> to <span className="font-bold text-slate-700">{Math.min(pendingPage * pendingPageSize, pendingTotalCount)}</span> of <span className="font-bold text-slate-700">{pendingTotalCount}</span> entries
              </div>
              <div className="flex gap-1.5">
                <button 
                  disabled={pendingPage === 1}
                  onClick={() => setPendingPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-slate-200 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                >
                  Prev
                </button>
                {(() => {
                  const maxVisible = 5;
                  let startPage = Math.max(1, pendingPage - Math.floor(maxVisible / 2));
                  let endPage = startPage + maxVisible - 1;
                  
                  if (endPage > pendingTotalPages) {
                    endPage = pendingTotalPages;
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setPendingPage(pageNum)}
                      className={`min-w-[32px] px-2 py-1 border rounded text-sm font-bold transition-colors ${
                        pendingPage === pageNum 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}
                <button 
                  disabled={pendingPage === pendingTotalPages || pendingTotalPages === 0}
                  onClick={() => setPendingPage(p => Math.min(pendingTotalPages, p + 1))}
                  className="px-3 py-1 border border-slate-200 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="saas-card overflow-hidden flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Invoice History
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={historyStartDate}
                    onChange={(date: Date | null) => date && setHistoryStartDate(date)}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    todayButton="Today"
                    dropdownMode="select"
                    className="pl-9 pr-3 py-2 w-36 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    maxDate={historyEndDate}
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">to</span>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={historyEndDate}
                    onChange={(date: Date | null) => date && setHistoryEndDate(date)}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    todayButton="Today"
                    dropdownMode="select"
                    className="pl-9 pr-3 py-2 w-36 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                    minDate={historyStartDate}
                    maxDate={new Date()}
                  />
                </div>
              </div>
              <select 
                value={historyPageSize}
                onChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search invoices..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="overflow-auto flex-1 bg-white p-4 sm:p-6">
            <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm w-full min-w-max overflow-hidden">
              <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Invoice #</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Token Ref ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Patient Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Doctor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Booking Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payment Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoadingInvoices ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center mb-2"><PageLoader /></div>
                      Loading history...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-medium">No invoices found.</td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inv.tokenReferenceId ? (
                          <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                            {inv.tokenReferenceId}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{inv.patientName}</td>
                      <td className="px-6 py-4 text-slate-600">{inv.doctorName || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {inv.bookingDate ? new Date(inv.bookingDate).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {inv.paymentDate ? new Date(inv.paymentDate).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider ${
                          inv.status === 2 ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 1 ? 'bg-amber-100 text-amber-700' :
                          inv.status === 3 ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {inv.status === 2 ? 'Paid' : inv.status === 1 ? 'Partial' : inv.status === 3 ? 'Cancelled' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">₹{inv.totalAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => handlePrint(inv)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-lg">
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 mt-auto">
              <div className="text-sm text-slate-500">
                Showing <span className="font-bold text-slate-700">{(historyPage - 1) * historyPageSize + 1}</span> to <span className="font-bold text-slate-700">{Math.min(historyPage * historyPageSize, totalCount)}</span> of <span className="font-bold text-slate-700">{totalCount}</span> entries
              </div>
              <div className="flex gap-1.5">
                <button 
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-slate-200 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                >
                  Prev
                </button>
                {(() => {
                  const maxVisible = 5;
                  let startPage = Math.max(1, historyPage - Math.floor(maxVisible / 2));
                  let endPage = startPage + maxVisible - 1;
                  
                  if (endPage > totalPages) {
                    endPage = totalPages;
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setHistoryPage(pageNum)}
                      className={`min-w-[32px] px-2 py-1 border rounded text-sm font-bold transition-colors ${
                        historyPage === pageNum 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}
                <button 
                  disabled={historyPage === totalPages || totalPages === 0}
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border border-slate-200 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
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

    </div>
  );
}
