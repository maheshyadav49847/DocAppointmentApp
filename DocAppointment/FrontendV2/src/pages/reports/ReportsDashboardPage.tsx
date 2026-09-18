import { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { 
  BarChart3, 
  Wallet, 
  Users, 
  Activity, 
  Package, 
  Calendar as CalendarIcon,
  Download,
  UserCircle,
  IndianRupee,
  FileText,
  TrendingUp,
  CreditCard,
  Building,
  Clock, 
  CheckCircle, 
  XCircle, 
  CalendarDays,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';
import { doctorService } from '@/services/doctorService';
import { useAuthStore } from '@/store/authStore';
import { DataTablePagination } from '@/components/ui/DataTablePagination';

export default function ReportsDashboardPage() {
  const [activeCategory, setActiveCategory] = useState('financial');
  const [activeReport, setActiveReport] = useState('dcr');
  
  // Filters
  const [dateRange, setDateRange] = useState('today');
  const { activeBranchId } = useAuthStore();
  const selectedBranch = activeBranchId || 'all';
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [customStart, setCustomStart] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; });
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());

  // Doctor Availability filters & pagination
  const [docSearch, setDocSearch] = useState('');
  const [docPageIndex, setDocPageIndex] = useState(0);

  // Leave Summary filters & pagination
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveRoleFilter, setLeaveRoleFilter] = useState('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [leavePageIndex, setLeavePageIndex] = useState(0);

  const categories = [
    { id: 'financial', label: 'Financial & Revenue', icon: Wallet },
    { id: 'operational', label: 'Operational & Queue', icon: Activity },
    { id: 'clinical', label: 'Clinical & Patients', icon: Users },
    { id: 'inventory', label: 'Pharmacy & Inventory', icon: Package }
  ];


  const operationalReports = [
    { id: 'footfall', label: 'Patient Footfall Analysis' },
    { id: 'appointment_summary', label: 'Appointment Summary' },
    { id: 'queue_performance', label: 'Queue & Wait Time' },
    { id: 'staff_productivity', label: 'Staff Productivity' },
    { id: 'doctor_availability', label: 'Doctor Availability & OPD Reliability' },
    { id: 'leave_summary', label: 'Staff & Doctor Leave Summary' },
  ];

  const clinicalReports = [
    { id: 'diagnosis_summary', label: 'Diagnosis & Treatment Summary' },
    { id: 'patient_demographics', label: 'Patient Demographics' },
    { id: 'new_vs_returning', label: 'New vs Returning Patients' },
    { id: 'referral_tracking', label: 'Referral Source Tracking' },
  ];

  const inventoryReports = [
    { id: 'stock_summary', label: 'Stock Summary' },
    { id: 'consumption_report', label: 'Medicine Consumption' },
    { id: 'expiry_alert', label: 'Expiry Alert Report' },
    { id: 'purchase_history', label: 'Purchase & Reorder History' },
  ];
  const financialReports = [
    { id: 'dcr', label: 'Daily Collection Report (DCR)' },
    { id: 'doctor_revenue', label: 'Doctor-wise Revenue' },
    { id: 'service_revenue', label: 'Service/Department Revenue' },
    { id: 'outstanding', label: 'Outstanding Dues & Receivables' },
  ];

  // Global Filters
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors'], queryFn: doctorService.getOrganizationDoctors });

  const { startDate, endDate } = useMemo(() => {
    const end = new Date().toISOString();
    let start = new Date();
    if (dateRange === 'today') start.setHours(0,0,0,0);
    else if (dateRange === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0,0,0,0); }
    else if (dateRange === 'this_week') { start.setDate(start.getDate() - 7); }
    else if (dateRange === 'this_month') { start.setDate(start.getDate() - 30); }
    else if (dateRange === 'custom') {
      const s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    return { startDate: start.toISOString(), endDate: end };
  }, [dateRange, customStart, customEnd]);

  const { data: dcrData, isLoading: dcrLoading } = useQuery({
    queryKey: ['report-dcr', selectedBranch, startDate, endDate],
    queryFn: () => reportService.getDailyCollection(selectedBranch, startDate, endDate),
    enabled: activeReport === 'dcr'
  });

  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ['report-doc', selectedBranch, selectedDoctor, startDate, endDate],
    queryFn: () => reportService.getDoctorRevenue(selectedBranch, selectedDoctor, startDate, endDate),
    enabled: activeReport === 'doctor_revenue'
  });

  const { data: svcData, isLoading: svcLoading } = useQuery({
    queryKey: ['report-svc', selectedBranch, startDate, endDate],
    queryFn: () => reportService.getServiceRevenue(selectedBranch, startDate, endDate),
    enabled: activeReport === 'service_revenue'
  });

  const { data: duesData, isLoading: duesLoading } = useQuery({
    queryKey: ['report-dues', selectedBranch],
    queryFn: () => reportService.getOutstandingDues(selectedBranch),
    enabled: activeReport === 'outstanding'
  });


  // Operational Queries
  const { data: footfallData, isLoading: footfallLoading } = useQuery({
    queryKey: ['report', 'footfall', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getFootfallAnalysisReport({ startDate, endDate, branchId: selectedBranch }),
    enabled: activeCategory === 'operational' && activeReport === 'footfall'
  });

  const { data: apptData, isLoading: apptLoading } = useQuery({
    queryKey: ['report', 'appointment_summary', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getAppointmentSummaryReport({ startDate, endDate, branchId: selectedBranch, doctorId: selectedDoctor }),
    enabled: activeCategory === 'operational' && activeReport === 'appointment_summary'
  });

  const { data: waitData, isLoading: waitLoading } = useQuery({
    queryKey: ['report', 'queue_wait_time', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getQueueWaitTimeReport({ startDate, endDate, branchId: selectedBranch, doctorId: selectedDoctor }),
    enabled: activeCategory === 'operational' && activeReport === 'queue_performance'
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['report', 'staff_productivity', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getStaffProductivityReport({ startDate, endDate, branchId: selectedBranch }),
    enabled: activeCategory === 'operational' && activeReport === 'staff_productivity'
  });

  const { data: docAvailabilityData, isLoading: docAvailabilityLoading } = useQuery({
    queryKey: ['report', 'doctor_availability', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getDoctorAvailabilityReport({ startDate, endDate, branchId: selectedBranch, doctorId: selectedDoctor }),
    enabled: activeCategory === 'operational' && activeReport === 'doctor_availability'
  });

  const { data: leaveSummaryData, isLoading: leaveSummaryLoading } = useQuery({
    queryKey: ['report', 'leave_summary', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getLeaveSummaryReport({ startDate, endDate, branchId: selectedBranch, doctorId: selectedDoctor }),
    enabled: activeCategory === 'operational' && activeReport === 'leave_summary'
  });

  // Clinical Queries
  const { data: diagData, isLoading: diagLoading } = useQuery({
    queryKey: ['report', 'diagnosis_summary', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getDiagnosisSummaryReport({ startDate, endDate, branchId: selectedBranch, doctorId: selectedDoctor }),
    enabled: activeCategory === 'clinical' && activeReport === 'diagnosis_summary'
  });

  const { data: demoData, isLoading: demoLoading } = useQuery({
    queryKey: ['report', 'patient_demographics', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getPatientDemographicsReport({ startDate, endDate }),
    enabled: activeCategory === 'clinical' && activeReport === 'patient_demographics'
  });

  const { data: retData, isLoading: retLoading } = useQuery({
    queryKey: ['report', 'new_vs_returning', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getNewVsReturningReport({ startDate, endDate, branchId: selectedBranch }),
    enabled: activeCategory === 'clinical' && activeReport === 'new_vs_returning'
  });

  const { data: refData, isLoading: refLoading } = useQuery({
    queryKey: ['report', 'referral_tracking', startDate, endDate, selectedBranch, selectedDoctor],
    queryFn: () => reportService.getReferralTrackingReport({ startDate, endDate, branchId: selectedBranch }),
    enabled: activeCategory === 'clinical' && activeReport === 'referral_tracking'
  });

  const handleExport = () => {
    let dataToExport: any[] = [];
    let filename = `${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    if (activeReport === 'dcr' && dcrData?.detailedRows) dataToExport = dcrData.detailedRows;
    else if (activeReport === 'doctor_revenue' && docData?.detailedRows) dataToExport = docData.detailedRows;
    else if (activeReport === 'service_revenue' && svcData?.detailedRows) dataToExport = svcData.detailedRows;
    else if (activeReport === 'outstanding' && duesData?.detailedRows) dataToExport = duesData.detailedRows;
    else if (activeReport === 'doctor_availability' && docAvailabilityData?.detailedRows) dataToExport = docAvailabilityData.detailedRows;
    else if (activeReport === 'leave_summary' && leaveSummaryData?.detailedRows) dataToExport = leaveSummaryData.detailedRows;
    else if (activeReport === 'staff_productivity' && staffData?.detailedRows) dataToExport = staffData.detailedRows;
    else if (activeReport === 'footfall' && footfallData?.detailedRows) dataToExport = footfallData.detailedRows;
    else if (activeReport === 'appointment_summary' && apptData?.detailedRows) dataToExport = apptData.detailedRows;
    else if (activeReport === 'queue_performance' && waitData?.detailedRows) dataToExport = waitData.detailedRows;
    
    if (dataToExport.length === 0) return;
    
    // Convert to CSV
    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Reports</span>
              <span className="text-indigo-600">Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Analytics, operational summaries, and financial intelligence for your clinic
            </p>
          </div>
        </div>

        {/* Global Filters Toolbar - Uniform h-9 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <DatePicker
                  selected={customStart}
                  onChange={(date: Date | null) => date && setCustomStart(date)}
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
                  onChange={(date: Date | null) => date && setCustomEnd(date)}
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

          <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
            <UserCircle className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <select 
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Doctors</option>
              {(doctors as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <button 
            onClick={handleExport} 
            className="btn-secondary h-9 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs" 
            title="Export current report to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div className="saas-card p-1.5 flex flex-wrap items-center gap-1.5 bg-white border border-slate-200/90 shadow-2xs">
        {categories.map(category => {
          const Icon = category.icon;
          const isActiveCategory = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id);
                const firstMap: Record<string, string> = { financial: 'dcr', operational: 'footfall', clinical: 'diagnosis_summary', inventory: 'stock_summary' };
                setActiveReport(firstMap[category.id] || 'dcr');
              }}
              className={`h-9 px-3 sm:px-4 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                isActiveCategory 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActiveCategory ? 'text-white' : 'text-slate-400'}`} />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-report Selection Pills */}
      {(() => {
        const reportMap: Record<string, {id: string; label: string}[]> = {
          financial: financialReports,
          operational: operationalReports,
          clinical: clinicalReports,
          inventory: inventoryReports,
        };
        const reports = reportMap[activeCategory];
        if (!reports || reports.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-2">
            {reports.map(report => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`h-9 px-3.5 rounded-md text-xs transition-all shadow-2xs flex items-center gap-1.5 ${
                  activeReport === report.id
                    ? 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200/90'
                    : 'bg-white text-slate-600 font-semibold border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{report.label}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Main Content Area */}
      <div className="space-y-3.5">
           {activeReport === 'dcr' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Daily Collection Report</h2>
                {dcrLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Collection</p><h3 className="text-2xl font-bold text-slate-900">₹{dcrData?.totalCollection || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Wallet className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Cash</p><h3 className="text-2xl font-bold text-slate-900">₹{dcrData?.cashCollection || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Building className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">UPI / Online</p><h3 className="text-2xl font-bold text-slate-900">₹{(dcrData?.upiCollection || 0) + (dcrData?.onlineCollection || 0)}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Card</p><h3 className="text-2xl font-bold text-slate-900">₹{dcrData?.cardCollection || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Transaction Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Invoice</th>
                              <th className="px-4 py-2.5">Patient</th>
                              <th className="px-4 py-2.5">Mode</th>
                              <th className="px-4 py-2.5">Txn ID</th>
                              <th className="px-4 py-2.5 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dcrData?.detailedRows?.map((row: any) => (
                              <tr key={row.paymentId + Math.random().toString()} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.paymentDate).toLocaleString()}</td>
                                <td className="px-4 py-3 font-medium text-indigo-600">{row.invoiceNumber}</td>
                                <td className="px-4 py-3">{row.patientName}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{row.paymentMode}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{row.transactionId || '-'}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">₹{row.amount}</td>
                              </tr>
                            ))}
                            {(!dcrData?.detailedRows || dcrData.detailedRows.length === 0) && (
                              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No transactions found for this period.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'doctor_revenue' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Doctor Revenue Report</h2>
                {docLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Billing</p><h3 className="text-2xl font-bold text-slate-900">₹{docData?.totalRevenueGenerated || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Revenue Collected</p><h3 className="text-2xl font-bold text-slate-900">₹{docData?.totalRevenueCollected || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Discounts Given</p><h3 className="text-2xl font-bold text-slate-900">₹{docData?.totalDiscountsGiven || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Doctor Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Doctor</th>
                              <th className="px-4 py-2.5">Patient</th>
                              <th className="px-4 py-2.5">Invoice</th>
                              <th className="px-4 py-2.5">Status</th>
                              <th className="px-4 py-2.5 text-right">Total</th>
                              <th className="px-4 py-2.5 text-right">Paid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docData?.detailedRows?.map((row: any) => (
                              <tr key={row.invoiceId + Math.random().toString()} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-bold text-slate-800">{row.doctorName}</td>
                                <td className="px-4 py-3">{row.patientName}</td>
                                <td className="px-4 py-3 font-medium text-indigo-600">{row.invoiceNumber}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.status === 'Paid' ? 'bg-green-100 text-green-700' : row.status === 'Unpaid' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">₹{row.totalAmount}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">₹{row.paidAmount}</td>
                              </tr>
                            ))}
                            {(!docData?.detailedRows || docData.detailedRows.length === 0) && (
                              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'service_revenue' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Service & Department Revenue</h2>
                {svcLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Service Revenue</p><h3 className="text-2xl font-bold text-slate-900">₹{svcData?.totalServiceRevenue || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Package className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Services Performed</p><h3 className="text-2xl font-bold text-slate-900">{svcData?.totalServicesPerformed || 0}</h3></div>
                      </div>
                    </div>
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Service Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Service Name</th>
                              <th className="px-4 py-2.5">Category</th>
                              <th className="px-4 py-2.5 text-right">Quantity</th>
                              <th className="px-4 py-2.5 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {svcData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.serviceName}</td>
                                <td className="px-4 py-3"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{row.category}</span></td>
                                <td className="px-4 py-3 text-right font-medium">{row.totalQuantity}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">₹{row.totalRevenue}</td>
                              </tr>
                            ))}
                            {(!svcData?.detailedRows || svcData.detailedRows.length === 0) && (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'outstanding' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Outstanding Dues & Receivables</h2>
                {duesLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Outstanding</p><h3 className="text-2xl font-bold text-red-600">₹{duesData?.totalOutstandingAmount || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Pending Invoices</p><h3 className="text-2xl font-bold text-slate-900">{duesData?.totalOutstandingInvoices || 0}</h3></div>
                      </div>
                    </div>
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Pending Invoices List</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Invoice</th>
                              <th className="px-4 py-2.5">Patient</th>
                              <th className="px-4 py-2.5">Phone</th>
                              <th className="px-4 py-2.5 text-center">Overdue</th>
                              <th className="px-4 py-2.5 text-right">Pending Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {duesData?.detailedRows?.map((row: any) => (
                              <tr key={row.invoiceId + Math.random().toString()} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-medium text-indigo-600">{row.invoiceNumber}</td>
                                <td className="px-4 py-3 font-bold text-slate-800">{row.patientName}</td>
                                <td className="px-4 py-3">{row.patientPhone || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${row.daysOverdue > 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{row.daysOverdue} Days</span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-red-600">₹{row.pendingAmount}</td>
                              </tr>
                            ))}
                            {(!duesData?.detailedRows || duesData.detailedRows.length === 0) && (
                              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No outstanding dues found!</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}
           {/* OPERATIONAL REPORTS */}
           {activeReport === 'footfall' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Patient Footfall Analysis</h2>
                {footfallLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Footfall</p><h3 className="text-2xl font-bold text-slate-900">{footfallData?.totalFootfall || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Highest Daily Footfall</p><h3 className="text-2xl font-bold text-slate-900">{footfallData?.highestFootfallInADay || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Avg Daily Footfall</p><h3 className="text-2xl font-bold text-slate-900">{Math.round(footfallData?.averageDailyFootfall || 0)}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Daily Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5 text-right">Total Tokens</th>
                              <th className="px-4 py-2.5 text-right">Completed</th>
                              <th className="px-4 py-2.5 text-right">Cancelled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {footfallData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800">{row.totalTokens}</td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">{row.completedTokens}</td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">{row.cancelledTokens}</td>
                              </tr>
                            ))}
                            {(!footfallData?.detailedRows || footfallData.detailedRows.length === 0) && (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'appointment_summary' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Appointment Summary</h2>
                {apptLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><CalendarIcon className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalAppointments || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Completed</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalCompleted || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Pending</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalPending || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><XCircle className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Cancelled</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalCancelled || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Doctor Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Doctor</th>
                              <th className="px-4 py-2.5 text-right">Total</th>
                              <th className="px-4 py-2.5 text-right">Completed</th>
                              <th className="px-4 py-2.5 text-right">Pending</th>
                              <th className="px-4 py-2.5 text-right">Cancelled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apptData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.doctorName}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.totalAppointments}</td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">{row.completed}</td>
                                <td className="px-4 py-3 text-right font-medium text-yellow-600">{row.pending}</td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">{row.cancelled}</td>
                              </tr>
                            ))}
                            {(!apptData?.detailedRows || apptData.detailedRows.length === 0) && (
                              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'queue_performance' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Queue & Wait Time</h2>
                {waitLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Avg Wait Time</p><h3 className="text-2xl font-bold text-slate-900">{Math.round(waitData?.overallAvgWaitTimeMinutes || 0)} mins</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Avg Consultation Time</p><h3 className="text-2xl font-bold text-slate-900">{Math.round(waitData?.overallAvgConsultationTimeMinutes || 0)} mins</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Doctor Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Doctor</th>
                              <th className="px-4 py-2.5 text-right">Tokens Processed</th>
                              <th className="px-4 py-2.5 text-right">Avg Wait Time</th>
                              <th className="px-4 py-2.5 text-right">Avg Consult Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waitData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.doctorName}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.totalTokensProcessed}</td>
                                <td className="px-4 py-3 text-right font-medium text-yellow-600">{Math.round(row.avgWaitTimeMinutes)} mins</td>
                                <td className="px-4 py-3 text-right font-medium text-indigo-600">{Math.round(row.avgConsultationTimeMinutes)} mins</td>
                              </tr>
                            ))}
                            {(!waitData?.detailedRows || waitData.detailedRows.length === 0) && (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'staff_productivity' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Staff Productivity</h2>
                {staffLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Tokens Handled</p><h3 className="text-2xl font-bold text-slate-900">{staffData?.totalTokensGeneratedByStaff || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Staff Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Staff Name</th>
                              <th className="px-4 py-2.5 text-right">Tokens Handled</th>
                              <th className="px-4 py-2.5 text-right">Completed</th>
                              <th className="px-4 py-2.5 text-right">Cancelled</th>
                              <th className="px-4 py-2.5 text-right">Approved Leaves</th>
                              <th className="px-4 py-2.5 text-right">Working Days</th>
                              <th className="px-4 py-2.5 text-right">Tokens / Work Day</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.staffName}</td>
                                <td className="px-4 py-3 text-right font-medium text-indigo-600">{row.tokensGenerated}</td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">{row.appointmentsCompleted}</td>
                                <td className="px-4 py-3 text-right font-medium text-red-600">{row.appointmentsCancelled}</td>
                                <td className="px-4 py-3 text-right font-medium text-amber-600">{row.leavesTakenCount || 0} d</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-700">{row.activeWorkingDays || 0} d</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                  {(row.tokensPerWorkingDay || 0).toFixed(1)}
                                </td>
                              </tr>
                            ))}
                            {(!staffData?.detailedRows || staffData.detailedRows.length === 0) && (
                              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'doctor_availability' && (
             <div className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Doctor Availability & OPD Reliability</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Audit doctor shift adherence, planned vs emergency leaves, session suspensions, and token disruptions.</p>
                </div>

                {docAvailabilityLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><CheckCircle className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Overall Attendance Rate</p>
                          <h3 className="text-2xl font-bold text-slate-900">{(docAvailabilityData?.overallOPDAttendanceRate ?? 100).toFixed(1)}%</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">{docAvailabilityData?.totalSessionsAttended || 0} of {docAvailabilityData?.totalScheduledSessions || 0} sessions attended</p>
                        </div>
                      </div>

                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0"><CalendarDays className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Total Leave Days</p>
                          <h3 className="text-2xl font-bold text-slate-900">{docAvailabilityData?.totalLeaveDaysTaken || 0} Days</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">{docAvailabilityData?.totalPlannedLeaves || 0} planned, {docAvailabilityData?.totalEmergencyLeaves || 0} emergency</p>
                        </div>
                      </div>

                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg shrink-0"><AlertTriangle className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Sessions Suspended</p>
                          <h3 className="text-2xl font-bold text-amber-600">{docAvailabilityData?.totalSessionsSuspended || 0}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Cancelled or paused OPD sessions</p>
                        </div>
                      </div>

                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0"><XCircle className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Tokens Disrupted</p>
                          <h3 className="text-2xl font-bold text-rose-600">{docAvailabilityData?.totalAppointmentsCancelledDueToLeave || 0}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Appointments cancelled due to leave</p>
                        </div>
                      </div>
                    </div>

                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <h3 className="font-bold text-slate-800">Doctor Reliability & Attendance Breakdown</h3>
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={docSearch}
                            onChange={(e) => { setDocSearch(e.target.value); setDocPageIndex(0); }}
                            placeholder="Search doctor or specialization..."
                            className="saas-input h-9 pl-8 pr-2.5 text-xs w-full"
                          />
                        </div>
                      </div>

                      {(() => {
                        const filtered = (docAvailabilityData?.detailedRows || []).filter((r: any) => {
                          if (!docSearch.trim()) return true;
                          const q = docSearch.toLowerCase();
                          return r.doctorName.toLowerCase().includes(q) ||
                                 (r.specialization && r.specialization.toLowerCase().includes(q)) ||
                                 (r.branchName && r.branchName.toLowerCase().includes(q));
                        });
                        const pageSize = 10;
                        const pageCount = Math.ceil(filtered.length / pageSize) || 1;
                        const pagedRows = filtered.slice(docPageIndex * pageSize, (docPageIndex + 1) * pageSize);

                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                                  <tr>
                                    <th className="px-4 py-2.5">Doctor</th>
                                    <th className="px-4 py-2.5">Branch</th>
                                    <th className="px-4 py-2.5 text-right">Scheduled</th>
                                    <th className="px-4 py-2.5 text-right">Attended</th>
                                    <th className="px-4 py-2.5 text-right">Suspended</th>
                                    <th className="px-4 py-2.5 text-right">Planned Leaves</th>
                                    <th className="px-4 py-2.5 text-right">Emergency</th>
                                    <th className="px-4 py-2.5 text-right">Total Days</th>
                                    <th className="px-4 py-2.5 text-right">Cancelled Tokens</th>
                                    <th className="px-4 py-2.5 text-center">Reliability</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagedRows.map((row: any, i: number) => {
                                    const rate = row.reliabilityRate ?? 100;
                                    const badgeClass = rate >= 90 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : rate >= 75 
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-200';

                                    return (
                                      <tr key={row.doctorId || i} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3">
                                          <div className="font-bold text-slate-800">{row.doctorName}</div>
                                          <div className="text-xs text-slate-400 font-medium">{row.specialization || 'General'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">{row.branchName || 'All Branches'}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{row.totalScheduledSessions}</td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{row.sessionsAttended}</td>
                                        <td className="px-4 py-3 text-right font-medium text-amber-600">{row.sessionsSuspended}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-600">{row.plannedLeavesCount}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                          {row.emergencyLeavesCount > 0 ? (
                                            <span className="text-rose-600 font-semibold">{row.emergencyLeavesCount}</span>
                                          ) : (
                                            <span className="text-slate-400">0</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{row.totalLeaveDays} d</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                          {row.cancelledTokensCount > 0 ? (
                                            <span className="text-rose-600 font-semibold">{row.cancelledTokensCount}</span>
                                          ) : (
                                            <span className="text-slate-400">0</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold ${badgeClass}`}>
                                            {rate.toFixed(1)}%
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {pagedRows.length === 0 && (
                                    <tr>
                                      <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                                        No doctor availability records found.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            {filtered.length > 0 && (
                              <DataTablePagination
                                pageIndex={docPageIndex}
                                pageSize={pageSize}
                                totalCount={filtered.length}
                                pageCount={pageCount}
                                onPageChange={setDocPageIndex}
                              />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'leave_summary' && (
             <div className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Staff & Doctor Leave Summary</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit log of leave applications, approval lifecycle, and operational coverage impacts.</p>
                </div>

                {leaveSummaryLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><FileText className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Total Applications</p>
                          <h3 className="text-2xl font-bold text-slate-900">{leaveSummaryData?.totalApplications || 0}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Doctors & staff combined</p>
                        </div>
                      </div>

                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><CheckCircle className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Approved Leaves</p>
                          <h3 className="text-2xl font-bold text-emerald-600">{leaveSummaryData?.approvedCount || 0}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Fully authorized</p>
                        </div>
                      </div>

                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0"><Clock className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Pending Approvals</p>
                          <h3 className="text-2xl font-bold text-amber-600">{leaveSummaryData?.pendingCount || 0}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting admin review</p>
                        </div>
                      </div>

                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0"><CalendarDays className="w-6 h-6" /></div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Total Days Lost</p>
                          <h3 className="text-2xl font-bold text-rose-600">{leaveSummaryData?.totalDaysLost || 0} Days</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">{leaveSummaryData?.emergencyCount || 0} emergency requests</p>
                        </div>
                      </div>
                    </div>

                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col md:flex-row justify-between md:items-center gap-2.5">
                        <h3 className="font-bold text-slate-800">Leave Audit Roster</h3>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={leaveSearch}
                              onChange={(e) => { setLeaveSearch(e.target.value); setLeavePageIndex(0); }}
                              placeholder="Search name, reason, role..."
                              className="saas-input h-9 pl-8 pr-2.5 text-xs w-full"
                            />
                          </div>

                          <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2 shadow-2xs">
                            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                            <select
                              value={leaveRoleFilter}
                              onChange={(e) => { setLeaveRoleFilter(e.target.value); setLeavePageIndex(0); }}
                              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="all">All Roles</option>
                              <option value="Doctor">Doctors Only</option>
                              <option value="Staff">Staff Only</option>
                            </select>
                          </div>

                          <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2 shadow-2xs">
                            <select
                              value={leaveStatusFilter}
                              onChange={(e) => { setLeaveStatusFilter(e.target.value); setLeavePageIndex(0); }}
                              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="all">All Statuses</option>
                              <option value="Approved">Approved</option>
                              <option value="Pending">Pending</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const filtered = (leaveSummaryData?.detailedRows || []).filter((r: any) => {
                          if (leaveRoleFilter !== 'all' && r.role !== leaveRoleFilter) return false;
                          if (leaveStatusFilter !== 'all' && r.statusName !== leaveStatusFilter) return false;
                          if (!leaveSearch.trim()) return true;
                          const q = leaveSearch.toLowerCase();
                          return r.personName.toLowerCase().includes(q) ||
                                 r.personEmail.toLowerCase().includes(q) ||
                                 (r.specializationOrRole && r.specializationOrRole.toLowerCase().includes(q)) ||
                                 (r.reason && r.reason.toLowerCase().includes(q)) ||
                                 (r.branchName && r.branchName.toLowerCase().includes(q));
                        });
                        const pageSize = 10;
                        const pageCount = Math.ceil(filtered.length / pageSize) || 1;
                        const pagedRows = filtered.slice(leavePageIndex * pageSize, (leavePageIndex + 1) * pageSize);

                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                                  <tr>
                                    <th className="px-4 py-2.5">Applicant</th>
                                    <th className="px-4 py-2.5">Designation</th>
                                    <th className="px-4 py-2.5">Branch</th>
                                    <th className="px-4 py-2.5">Type</th>
                                    <th className="px-4 py-2.5">Duration</th>
                                    <th className="px-4 py-2.5">Session</th>
                                    <th className="px-4 py-2.5">Reason</th>
                                    <th className="px-4 py-2.5 text-right">Tokens Impacted</th>
                                    <th className="px-4 py-2.5 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagedRows.map((row: any) => {
                                    const isDoctor = row.role === 'Doctor';
                                    const isEmergency = row.leaveType === 'Emergency';
                                    let statusBadge = 'bg-amber-50 text-amber-700 border border-amber-200';
                                    if (row.statusName === 'Approved') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                                    else if (row.statusName === 'Rejected') statusBadge = 'bg-rose-50 text-rose-700 border border-rose-200';
                                    else if (row.statusName === 'Cancelled') statusBadge = 'bg-slate-100 text-slate-600 border border-slate-200';

                                    return (
                                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-800">{row.personName}</span>
                                            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${isDoctor ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                              {row.role}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-400">{row.personEmail}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 font-medium">{row.specializationOrRole || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">{row.branchName}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${isEmergency ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                            {row.leaveType}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="font-semibold text-slate-800">{row.startDate} {row.startDate !== row.endDate ? `to ${row.endDate}` : ''}</div>
                                          <div className="text-xs text-slate-400 font-medium">{row.daysCount} day{row.daysCount > 1 ? 's' : ''}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{row.sessionName || 'Full Day'}</td>
                                        <td className="px-4 py-3 max-w-[220px]">
                                          <div className="text-slate-800 font-medium truncate" title={row.reason}>{row.reason}</div>
                                          {row.publicNotice && (
                                            <div className="text-[11px] text-slate-400 italic truncate" title={row.publicNotice}>
                                              Notice: {row.publicNotice}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          {row.affectedTokensCount > 0 ? (
                                            <span className="font-bold text-rose-600">{row.affectedTokensCount}</span>
                                          ) : (
                                            <span className="text-slate-400 font-medium">0</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold ${statusBadge}`}>
                                            {row.statusName}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {pagedRows.length === 0 && (
                                    <tr>
                                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                                        No leave records match the selected filters.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            {filtered.length > 0 && (
                              <DataTablePagination
                                pageIndex={leavePageIndex}
                                pageSize={pageSize}
                                totalCount={filtered.length}
                                pageCount={pageCount}
                                onPageChange={setLeavePageIndex}
                              />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
             </div>
           )}

           {/* CLINICAL REPORTS */}
           {activeReport === 'diagnosis_summary' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Diagnosis & Treatment Summary</h2>
                {diagLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Diagnoses Recorded</p><h3 className="text-2xl font-bold text-slate-900">{diagData?.totalDiagnosesRecorded || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Top Diagnoses</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Diagnosis</th>
                              <th className="px-4 py-2.5 text-right">Cases</th>
                              <th className="px-4 py-2.5 text-right">% of Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diagData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.diagnosis}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.totalCases}</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-500">{row.percentageOfTotal}%</td>
                              </tr>
                            ))}
                            {(!diagData?.detailedRows || diagData.detailedRows.length === 0) && (
                              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No diagnoses recorded.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'patient_demographics' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Patient Demographics</h2>
                {demoLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Unique Patients</p><h3 className="text-2xl font-bold text-slate-900">{demoData?.totalPatients || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Age & Gender Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Age Group</th>
                              <th className="px-4 py-2.5 text-right">Male</th>
                              <th className="px-4 py-2.5 text-right">Female</th>
                              <th className="px-4 py-2.5 text-right">Other</th>
                              <th className="px-4 py-2.5 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {demoData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.ageGroup}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.male}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.female}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.other}</td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-600">{row.total}</td>
                              </tr>
                            ))}
                            {(!demoData?.detailedRows || demoData.detailedRows.length === 0) && (
                              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'new_vs_returning' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">New vs Returning Patients</h2>
                {retLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">New Patients</p><h3 className="text-2xl font-bold text-slate-900">{retData?.totalNewPatients || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Returning Patients</p><h3 className="text-2xl font-bold text-slate-900">{retData?.totalReturningPatients || 0}</h3></div>
                      </div>
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Retention Rate</p><h3 className="text-2xl font-bold text-slate-900">{retData?.returningPatientPercentage || 0}%</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Daily Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5 text-right">New Patients</th>
                              <th className="px-4 py-2.5 text-right">Returning Patients</th>
                              <th className="px-4 py-2.5 text-right">Total Tokens</th>
                            </tr>
                          </thead>
                          <tbody>
                            {retData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right font-medium text-blue-600">{row.newPatients}</td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">{row.returningPatients}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800">{row.totalTokens}</td>
                              </tr>
                            ))}
                            {(!retData?.detailedRows || retData.detailedRows.length === 0) && (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}

           {activeReport === 'referral_tracking' && (
             <div className="space-y-6">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Referral Source Tracking</h2>
                {refLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="saas-card p-3 sm:p-3.5 relative overflow-hidden group border-slate-200/90 shadow-2xs bg-white flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Bookings</p><h3 className="text-2xl font-bold text-slate-900">{refData?.totalBookings || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="saas-card overflow-hidden border border-slate-200/90 shadow-2xs bg-white">
                      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/70 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Source Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[11px] font-bold text-slate-500 bg-slate-50 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Source</th>
                              <th className="px-4 py-2.5 text-right">Total Bookings</th>
                              <th className="px-4 py-2.5 text-right">% of Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {refData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{row.source}</td>
                                <td className="px-4 py-3 text-right font-medium">{row.totalBookings}</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-500">{row.percentage}%</td>
                              </tr>
                            ))}
                            {(!refData?.detailedRows || refData.detailedRows.length === 0) && (
                              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
             </div>
           )}


           {!['dcr', 'doctor_revenue', 'service_revenue', 'outstanding', 'footfall', 'appointment_summary', 'queue_performance', 'staff_productivity', 'doctor_availability', 'leave_summary', 'diagnosis_summary', 'patient_demographics', 'new_vs_returning', 'referral_tracking'].includes(activeReport) && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Report Under Construction</h2>
                <p className="text-slate-500 mt-2">This report is planned for future phases.</p>
             </div>
           )}
      </div>
    </div>
  );
}
