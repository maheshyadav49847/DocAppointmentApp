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
  MapPin,
  UserCircle,
  IndianRupee,
  FileText,
  TrendingUp,
  CreditCard,
  Building
, Clock, CheckCircle, XCircle, CalendarDays} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';
import { branchService } from '@/services/branchService';
import { doctorService } from '@/services/doctorService';
import { useAuthStore } from '@/store/authStore';

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
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Header & Global Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reports Center</h1>
            <p className="text-sm text-slate-500">Analytics and insights for your clinic</p>
          </div>
        </div>
        
        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pb-2 sm:pb-0">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shrink-0">
            <CalendarIcon className="w-4 h-4 text-slate-400 mr-2" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <DatePicker
                  selected={customStart}
                  onChange={(date: Date | null) => date && setCustomStart(date)}
                  dateFormat="dd MMM yyyy"
                  showMonthDropdown
                  showYearDropdown
                  todayButton="Today"
                  dropdownMode="select"
                  className="pl-9 pr-3 py-1.5 w-36 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  maxDate={customEnd}
                />
              </div>
              <span className="text-slate-400 text-xs font-bold">to</span>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <DatePicker
                  selected={customEnd}
                  onChange={(date: Date | null) => date && setCustomEnd(date)}
                  dateFormat="dd MMM yyyy"
                  showMonthDropdown
                  showYearDropdown
                  todayButton="Today"
                  dropdownMode="select"
                  className="pl-9 pr-3 py-1.5 w-36 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  minDate={customStart}
                />
              </div>
            </div>
          )}
          

          
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shrink-0">
            <UserCircle className="w-4 h-4 text-slate-400 mr-2" />
            <select 
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Doctors</option>
              {(doctors as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <button onClick={handleExport} className="flex items-center justify-center p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors shrink-0 tooltip-trigger" title="Export current report">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-6">
            {categories.map(category => {
              const Icon = category.icon;
              const isActiveCategory = activeCategory === category.id;
              
              return (
                <div key={category.id} className="space-y-1">
                  <button 
                    onClick={() => {
                      setActiveCategory(category.id);
                      const firstMap: Record<string, string> = { financial: 'dcr', operational: 'footfall', clinical: 'diagnosis_summary', inventory: 'stock_summary' };
                      setActiveReport(firstMap[category.id] || 'dcr');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isActiveCategory ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActiveCategory ? 'text-indigo-600' : ''}`} />
                    {category.label}
                  </button>
                  
                  {isActiveCategory && (() => {
                    const reportMap: Record<string, {id: string; label: string}[]> = {
                      financial: financialReports,
                      operational: operationalReports,
                      clinical: clinicalReports,
                      inventory: inventoryReports,
                    };
                    const reports = reportMap[category.id];
                    if (!reports) return null;
                    return (
                      <div className="pl-11 pr-2 space-y-1 py-1">
                        {reports.map(report => (
                          <button
                            key={report.id}
                            onClick={() => setActiveReport(report.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                              activeReport === report.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 font-medium hover:text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {report.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
           {activeReport === 'dcr' && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Daily Collection Report</h2>
                {dcrLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Collection</p><h3 className="text-2xl font-bold text-slate-900">₹{dcrData?.totalCollection || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Wallet className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Cash</p><h3 className="text-2xl font-bold text-slate-900">₹{dcrData?.cashCollection || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Building className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">UPI / Online</p><h3 className="text-2xl font-bold text-slate-900">₹{(dcrData?.upiCollection || 0) + (dcrData?.onlineCollection || 0)}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Card</p><h3 className="text-2xl font-bold text-slate-900">₹{dcrData?.cardCollection || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Transaction Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Invoice</th>
                              <th className="px-6 py-3">Patient</th>
                              <th className="px-6 py-3">Mode</th>
                              <th className="px-6 py-3">Txn ID</th>
                              <th className="px-6 py-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dcrData?.detailedRows?.map((row: any) => (
                              <tr key={row.paymentId + Math.random().toString()} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(row.paymentDate).toLocaleString()}</td>
                                <td className="px-6 py-4 font-medium text-indigo-600">{row.invoiceNumber}</td>
                                <td className="px-6 py-4">{row.patientName}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{row.paymentMode}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{row.transactionId || '-'}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">₹{row.amount}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Doctor Revenue Report</h2>
                {docLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Billing</p><h3 className="text-2xl font-bold text-slate-900">₹{docData?.totalRevenueGenerated || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Revenue Collected</p><h3 className="text-2xl font-bold text-slate-900">₹{docData?.totalRevenueCollected || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Discounts Given</p><h3 className="text-2xl font-bold text-slate-900">₹{docData?.totalDiscountsGiven || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Doctor Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Doctor</th>
                              <th className="px-6 py-3">Patient</th>
                              <th className="px-6 py-3">Invoice</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Total</th>
                              <th className="px-6 py-3 text-right">Paid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docData?.detailedRows?.map((row: any) => (
                              <tr key={row.invoiceId + Math.random().toString()} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{row.doctorName}</td>
                                <td className="px-6 py-4">{row.patientName}</td>
                                <td className="px-6 py-4 font-medium text-indigo-600">{row.invoiceNumber}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.status === 'Paid' ? 'bg-green-100 text-green-700' : row.status === 'Unpaid' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-medium">₹{row.totalAmount}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">₹{row.paidAmount}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Service & Department Revenue</h2>
                {svcLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Service Revenue</p><h3 className="text-2xl font-bold text-slate-900">₹{svcData?.totalServiceRevenue || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Package className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Services Performed</p><h3 className="text-2xl font-bold text-slate-900">{svcData?.totalServicesPerformed || 0}</h3></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Service Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Service Name</th>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3 text-right">Quantity</th>
                              <th className="px-6 py-3 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {svcData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.serviceName}</td>
                                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{row.category}</span></td>
                                <td className="px-6 py-4 text-right font-medium">{row.totalQuantity}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900">₹{row.totalRevenue}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Outstanding Dues & Receivables</h2>
                {duesLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Outstanding</p><h3 className="text-2xl font-bold text-red-600">₹{duesData?.totalOutstandingAmount || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Pending Invoices</p><h3 className="text-2xl font-bold text-slate-900">{duesData?.totalOutstandingInvoices || 0}</h3></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Pending Invoices List</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Invoice</th>
                              <th className="px-6 py-3">Patient</th>
                              <th className="px-6 py-3">Phone</th>
                              <th className="px-6 py-3 text-center">Overdue</th>
                              <th className="px-6 py-3 text-right">Pending Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {duesData?.detailedRows?.map((row: any) => (
                              <tr key={row.invoiceId + Math.random().toString()} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium text-indigo-600">{row.invoiceNumber}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{row.patientName}</td>
                                <td className="px-6 py-4">{row.patientPhone || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${row.daysOverdue > 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{row.daysOverdue} Days</span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-red-600">₹{row.pendingAmount}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Patient Footfall Analysis</h2>
                {footfallLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Footfall</p><h3 className="text-2xl font-bold text-slate-900">{footfallData?.totalFootfall || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Highest Daily Footfall</p><h3 className="text-2xl font-bold text-slate-900">{footfallData?.highestFootfallInADay || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Avg Daily Footfall</p><h3 className="text-2xl font-bold text-slate-900">{Math.round(footfallData?.averageDailyFootfall || 0)}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Daily Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3 text-right">Total Tokens</th>
                              <th className="px-6 py-3 text-right">Completed</th>
                              <th className="px-6 py-3 text-right">Cancelled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {footfallData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{row.totalTokens}</td>
                                <td className="px-6 py-4 text-right font-medium text-green-600">{row.completedTokens}</td>
                                <td className="px-6 py-4 text-right font-medium text-red-600">{row.cancelledTokens}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Appointment Summary</h2>
                {apptLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><CalendarIcon className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalAppointments || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Completed</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalCompleted || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Pending</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalPending || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><XCircle className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Cancelled</p><h3 className="text-2xl font-bold text-slate-900">{apptData?.totalCancelled || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Doctor Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Doctor</th>
                              <th className="px-6 py-3 text-right">Total</th>
                              <th className="px-6 py-3 text-right">Completed</th>
                              <th className="px-6 py-3 text-right">Pending</th>
                              <th className="px-6 py-3 text-right">Cancelled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apptData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.doctorName}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.totalAppointments}</td>
                                <td className="px-6 py-4 text-right font-medium text-green-600">{row.completed}</td>
                                <td className="px-6 py-4 text-right font-medium text-yellow-600">{row.pending}</td>
                                <td className="px-6 py-4 text-right font-medium text-red-600">{row.cancelled}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Queue & Wait Time</h2>
                {waitLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Avg Wait Time</p><h3 className="text-2xl font-bold text-slate-900">{Math.round(waitData?.overallAvgWaitTimeMinutes || 0)} mins</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Avg Consultation Time</p><h3 className="text-2xl font-bold text-slate-900">{Math.round(waitData?.overallAvgConsultationTimeMinutes || 0)} mins</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Doctor Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Doctor</th>
                              <th className="px-6 py-3 text-right">Tokens Processed</th>
                              <th className="px-6 py-3 text-right">Avg Wait Time</th>
                              <th className="px-6 py-3 text-right">Avg Consult Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waitData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.doctorName}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.totalTokensProcessed}</td>
                                <td className="px-6 py-4 text-right font-medium text-yellow-600">{Math.round(row.avgWaitTimeMinutes)} mins</td>
                                <td className="px-6 py-4 text-right font-medium text-indigo-600">{Math.round(row.avgConsultationTimeMinutes)} mins</td>
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
                <h2 className="text-xl font-bold text-slate-900">Staff Productivity</h2>
                {staffLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Tokens Handled</p><h3 className="text-2xl font-bold text-slate-900">{staffData?.totalTokensGeneratedByStaff || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Staff Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Staff Name</th>
                              <th className="px-6 py-3 text-right">Tokens Handled</th>
                              <th className="px-6 py-3 text-right">Completed</th>
                              <th className="px-6 py-3 text-right">Cancelled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.staffName}</td>
                                <td className="px-6 py-4 text-right font-medium text-indigo-600">{row.tokensGenerated}</td>
                                <td className="px-6 py-4 text-right font-medium text-green-600">{row.appointmentsCompleted}</td>
                                <td className="px-6 py-4 text-right font-medium text-red-600">{row.appointmentsCancelled}</td>
                              </tr>
                            ))}
                            {(!staffData?.detailedRows || staffData.detailedRows.length === 0) && (
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

           {/* CLINICAL REPORTS */}
           {activeReport === 'diagnosis_summary' && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900">Diagnosis & Treatment Summary</h2>
                {diagLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Diagnoses Recorded</p><h3 className="text-2xl font-bold text-slate-900">{diagData?.totalDiagnosesRecorded || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Top Diagnoses</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Diagnosis</th>
                              <th className="px-6 py-3 text-right">Cases</th>
                              <th className="px-6 py-3 text-right">% of Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diagData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.diagnosis}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.totalCases}</td>
                                <td className="px-6 py-4 text-right font-medium text-slate-500">{row.percentageOfTotal}%</td>
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
                <h2 className="text-xl font-bold text-slate-900">Patient Demographics</h2>
                {demoLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Unique Patients</p><h3 className="text-2xl font-bold text-slate-900">{demoData?.totalPatients || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Age & Gender Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Age Group</th>
                              <th className="px-6 py-3 text-right">Male</th>
                              <th className="px-6 py-3 text-right">Female</th>
                              <th className="px-6 py-3 text-right">Other</th>
                              <th className="px-6 py-3 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {demoData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.ageGroup}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.male}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.female}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.other}</td>
                                <td className="px-6 py-4 text-right font-bold text-indigo-600">{row.total}</td>
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
                <h2 className="text-xl font-bold text-slate-900">New vs Returning Patients</h2>
                {retLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">New Patients</p><h3 className="text-2xl font-bold text-slate-900">{retData?.totalNewPatients || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Returning Patients</p><h3 className="text-2xl font-bold text-slate-900">{retData?.totalReturningPatients || 0}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Retention Rate</p><h3 className="text-2xl font-bold text-slate-900">{retData?.returningPatientPercentage || 0}%</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Daily Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3 text-right">New Patients</th>
                              <th className="px-6 py-3 text-right">Returning Patients</th>
                              <th className="px-6 py-3 text-right">Total Tokens</th>
                            </tr>
                          </thead>
                          <tbody>
                            {retData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right font-medium text-blue-600">{row.newPatients}</td>
                                <td className="px-6 py-4 text-right font-medium text-green-600">{row.returningPatients}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">{row.totalTokens}</td>
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
                <h2 className="text-xl font-bold text-slate-900">Referral Source Tracking</h2>
                {refLoading ? (
                  <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div><p className="text-sm text-slate-500 font-medium">Total Bookings</p><h3 className="text-2xl font-bold text-slate-900">{refData?.totalBookings || 0}</h3></div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Source Breakdown</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3">Source</th>
                              <th className="px-6 py-3 text-right">Total Bookings</th>
                              <th className="px-6 py-3 text-right">% of Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {refData?.detailedRows?.map((row: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{row.source}</td>
                                <td className="px-6 py-4 text-right font-medium">{row.totalBookings}</td>
                                <td className="px-6 py-4 text-right font-medium text-slate-500">{row.percentage}%</td>
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



           {!['dcr', 'doctor_revenue', 'service_revenue', 'outstanding', 'footfall', 'appointment_summary', 'queue_performance', 'staff_productivity', 'diagnosis_summary', 'patient_demographics', 'new_vs_returning', 'referral_tracking'].includes(activeReport) && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Report Under Construction</h2>
                <p className="text-slate-500 mt-2">This report is planned for future phases.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
