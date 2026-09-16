import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageLoader } from "@/components/ui/PageLoader"
import { subDays, format } from "date-fns"
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts"
import {
  Activity, Users, CalendarDays, BriefcaseMedical, Download, Monitor, TrendingUp,
  Clock, CheckCircle2, AlertTriangle, ReceiptIndianRupee, Stethoscope, BarChart3, Building2,
  PieChart as PieChartIcon
} from "lucide-react"

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuthStore } from "@/store/authStore";
import { analyticsService } from "@/services/analyticsService";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { user, activeBranchId } = useAuthStore()
  const role = user?.role?.toLowerCase().replace(/\s/g, '') || ''
  const isMultiBranchDoctor = role === 'doctor';
  const isSuperAdmin = role === 'superadmin';
  const selectedBranchId = (role === 'orgadmin' || isSuperAdmin || isMultiBranchDoctor) ? (activeBranchId || 'org') : (user?.branchId || 'org');

  const [dateRangeMode, setDateRangeMode] = useState<string>('this_month');
  const [customStart, setCustomStart] = useState<Date>(() => subDays(new Date(), 30));
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());
  
  const [activeTab, setActiveTab] = useState<'operational' | 'financial' | 'clinical' | 'system'>('operational')

  const effectiveBranchId = selectedBranchId === 'org' ? undefined : selectedBranchId;

  const { startDateIso, endDateIso, displayStart, displayEnd } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    if (dateRangeMode === 'today') start.setHours(0,0,0,0);
    else if (dateRangeMode === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0,0,0,0); }
    else if (dateRangeMode === 'this_week') { start.setDate(start.getDate() - 7); }
    else if (dateRangeMode === 'this_month') { start.setDate(start.getDate() - 30); }
    
    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let sStr, eStr;
    let dStart = start, dEnd = end;
    if (dateRangeMode === 'custom') {
      const s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      sStr = fmt(s) + 'T00:00:00Z';
      eStr = fmt(e) + 'T23:59:59Z';
      dStart = s; dEnd = e;
    } else {
      sStr = fmt(start) + 'T00:00:00Z';
      eStr = fmt(end) + 'T23:59:59Z';
    }
    return { startDateIso: sStr, endDateIso: eStr, displayStart: dStart, displayEnd: dEnd };
  }, [dateRangeMode, customStart, customEnd]);


  const { data: operational, isLoading: opLoading } = useQuery({
    queryKey: ['analytics', 'operational', effectiveBranchId, startDateIso, endDateIso],
    queryFn: () => analyticsService.getOperational(startDateIso, endDateIso, effectiveBranchId),
  })

  const { data: financial, isLoading: finLoading } = useQuery({
    queryKey: ['analytics', 'financial', effectiveBranchId, startDateIso, endDateIso],
    queryFn: () => analyticsService.getFinancial(startDateIso, endDateIso, effectiveBranchId),
  })

  const { data: clinical, isLoading: clinLoading } = useQuery({
    queryKey: ['analytics', 'clinical', effectiveBranchId, startDateIso, endDateIso],
    queryFn: () => analyticsService.getClinical(startDateIso, endDateIso, effectiveBranchId),
  })

  const { data: system, isLoading: sysLoading } = useQuery({
    queryKey: ['analytics', 'system'],
    queryFn: () => analyticsService.getSystem(),
    enabled: isSuperAdmin && activeTab === 'system'
  })

  const isLoading = opLoading || finLoading || clinLoading || (activeTab === 'system' && sysLoading);

  const handleExportCsv = async () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const workbook = new ExcelJS.Workbook();
    let hasData = false;

    // Operational Sheet
    if (operational) {
      hasData = true;
      const opSheet = workbook.addWorksheet('Operational');
      opSheet.addRow(['Metric', 'Value']);
      opSheet.addRow(['Total Footfall', operational.totalTokens]);
      opSheet.addRow(['Completed', operational.completedTokens]);
      opSheet.addRow(['Cancelled', operational.cancelledTokens]);
      opSheet.addRow(['No Shows', operational.noShowTokens]);
      opSheet.addRow(['Avg Wait Time (min)', operational.averageWaitTimeMinutes]);
      
      opSheet.addRow([]); // empty row
      opSheet.addRow(['Peak Hours']);
      opSheet.addRow(['Hour', 'Tokens Booked']);
      operational.peakHours?.forEach(p => opSheet.addRow([`${p.hour}:00`, p.tokenCount]));
      
      opSheet.addRow([]);
      opSheet.addRow(['Doctor Utilization']);
      opSheet.addRow(['Doctor Name', 'Capacity', 'Booked', 'Utilization %']);
      operational.doctorUtilizations?.forEach(d => opSheet.addRow([d.doctorName, d.totalCapacity, d.bookedTokens, d.utilizationPercentage]));

      // formatting
      opSheet.columns.forEach(column => { column.width = 25; });
      
      // Appointment Log Sheet
      if (operational.appointmentLogs && operational.appointmentLogs.length > 0) {
        const logSheet = workbook.addWorksheet('Appointment Log');
        logSheet.addRow(['Date & Time', 'Token No.', 'Patient Name', 'Phone', 'Doctor', 'Status', 'Wait Time (Min)', 'Fee Paid']);
        operational.appointmentLogs.forEach(log => {
          logSheet.addRow([
            new Date(log.date).toLocaleString(), 
            log.tokenNumber, 
            log.patientName, 
            log.phoneNumber, 
            log.doctorName, 
            log.status, 
            log.waitTimeMinutes, 
            log.feePaid
          ]);
        });
        logSheet.columns.forEach(column => { column.width = 20; });
      }
    }

    // Financial Sheet
    if (financial) {
      hasData = true;
      const finSheet = workbook.addWorksheet('Financial');
      finSheet.addRow(['Metric', 'Value']);
      finSheet.addRow(['Total Revenue', financial.totalRevenue]);
      finSheet.addRow(['Outstanding Dues', financial.outstandingDues]);
      
      finSheet.addRow([]);
      finSheet.addRow(['Daily Revenue Trend']);
      finSheet.addRow(['Date', 'Revenue']);
      financial.revenueTrend?.forEach(r => finSheet.addRow([r.date, r.revenue]));

      finSheet.addRow([]);
      finSheet.addRow(['Doctor Revenue']);
      finSheet.addRow(['Doctor Name', 'Total Revenue']);
      financial.doctorRevenues?.forEach(d => finSheet.addRow([d.doctorName, d.totalRevenue]));

      finSheet.columns.forEach(column => { column.width = 25; });
    }

    // Clinical Sheet
    if (clinical) {
      hasData = true;
      const clinSheet = workbook.addWorksheet('Clinical');
      clinSheet.addRow(['Metric', 'Value']);
      clinSheet.addRow(['New Patients', clinical.newPatients || 0]);
      clinSheet.addRow(['Returning Patients', clinical.returningPatients || 0]);
      
      clinSheet.addRow([]);
      clinSheet.addRow(['Top Diagnoses']);
      clinSheet.addRow(['Diagnosis', 'Count']);
      clinical.topDiagnoses?.forEach(d => clinSheet.addRow([d.diagnosis, d.count]));

      clinSheet.columns.forEach(column => { column.width = 25; });
    }

    // System Sheet
    if (system && isSuperAdmin) {
      hasData = true;
      const sysSheet = workbook.addWorksheet('System');
      sysSheet.addRow(['Metric', 'Value']);
      sysSheet.addRow(['Total Tenants', system.totalOrganizations]);
      sysSheet.addRow(['Active Tenants', system.activeOrganizations]);
      sysSheet.addRow(['Platform Tokens', system.totalTokensBooked]);
      sysSheet.addRow(['API Messages Sent', system.totalMessagesSent]);
      
      sysSheet.addRow([]);
      sysSheet.addRow(['Platform Growth']);
      sysSheet.addRow(['Month', 'New Clinics', 'Tokens Booked']);
      system.platformGrowth?.forEach(g => sysSheet.addRow([g.month, g.newOrganizations, g.tokensBooked]));

      sysSheet.columns.forEach(column => { column.width = 25; });
    }

    if (!hasData) {
      alert("No data available to export yet. Please wait for it to load.");
      return;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Clinic-Analytics-Report-${dateStr}.xlsx`);
  };

  if (isLoading) {
    return <PageLoader message="Gathering Analytics..." subMessage="Compiling data from your organization" />
  }

  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="w-12 h-12 rounded-lg text-indigo-600 flex items-center justify-center border border-indigo-100 bg-indigo-50/50 shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-900">Analytics &</span>
              <span className="text-indigo-600">Reports</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200">
                Intelligence Hub
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Data-driven insights for {format(displayStart, 'MMM d, yyyy')} - {format(displayEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button 
            onClick={handleExportCsv}
            className="btn-secondary px-3.5 py-2 text-xs sm:text-sm font-bold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          
          <div className="relative">
            <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select 
              value={dateRangeMode}
              onChange={(e) => setDateRangeMode(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-md text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 transition-all shadow-2xs cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRangeMode === 'custom' && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
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
                  className="pl-9 pr-3 py-2 w-38 bg-slate-50/80 border border-slate-200 rounded-md text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                  maxDate={customEnd}
                />
              </div>
              <span className="text-slate-400 text-xs font-bold">to</span>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
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
                  className="pl-9 pr-3 py-2 w-38 bg-slate-50/80 border border-slate-200 rounded-md text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                  minDate={customStart}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-md border border-slate-200/80 w-fit overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => setActiveTab('operational')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'operational'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span>Operational</span>
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'financial'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ReceiptIndianRupee className="w-3.5 h-3.5 shrink-0" />
          <span>Financial</span>
        </button>
        <button
          onClick={() => setActiveTab('clinical')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'clinical'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BriefcaseMedical className="w-3.5 h-3.5 shrink-0" />
          <span>Clinical</span>
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'system'
                ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span>Platform</span>
          </button>
        )}
      </div>

      {/* OPERATIONAL TAB */}
      {activeTab === 'operational' && operational && (
        <div className="space-y-6 animate-in fade-in shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Footfall</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{operational.totalTokens}</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Total registered visits</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">
                  {operational.totalTokens ? Math.round((operational.completedTokens / operational.totalTokens) * 100) : 0}%
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">{operational.completedTokens} visits fulfilled</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No-Show / Cancelled</div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-0.5">{operational.noShowTokens + operational.cancelledTokens}</div>
                <div className="text-[10px] text-rose-500 font-medium mt-0.5">{operational.cancelledTokens} cancelled • {operational.noShowTokens} no-show</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Wait Time</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5">{operational.averageWaitTimeMinutes} min</div>
                <div className="text-[10px] text-amber-600 font-medium mt-0.5">Door to doctor consult</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" /> Peak Footfall Hours
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hourly distribution</span>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operational.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                    <Tooltip
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                      formatter={(val) => [`${val} tokens`, 'Footfall']}
                      labelFormatter={(h) => `Hour ${h}:00`}
                    />
                    <Bar dataKey="tokenCount" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-indigo-600" /> Doctor Utilization (%)
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Schedule efficiency</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Doctor</th>
                      <th className="px-4 py-2.5">Booked / Capacity</th>
                      <th className="px-4 py-2.5">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operational.doctorUtilizations.map(doc => (
                      <tr key={doc.doctorId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{doc.doctorName}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{doc.bookedTokens} / {doc.totalCapacity}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-slate-100 rounded-sm h-2 overflow-hidden border border-slate-200/60 max-w-[140px]">
                              <div
                                className="bg-indigo-600 h-full rounded-sm transition-all"
                                style={{ width: `${Math.min(doc.utilizationPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-900">{doc.utilizationPercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL TAB */}
      {activeTab === 'financial' && financial && (
        <div className="space-y-6 animate-in fade-in shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">₹{financial.totalRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Settled income across services</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ReceiptIndianRupee className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues</div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-0.5">₹{financial.outstandingDues.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-rose-500 font-medium mt-0.5">Uncollected receivables</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue Trend
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collection vs Dues</span>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financial.revenueTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={d => format(new Date(d as string), 'MMM d')} tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                    <Tooltip
                      labelFormatter={d => format(new Date(d as string), 'MMM d, yyyy')}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="outstanding" name="Outstanding Dues" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" /> Payment Breakdown
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Settlement modes</span>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={financial.paymentBreakdown} dataKey="totalAmount" nameKey="mode" cx="50%" cy="50%" innerRadius={55} outerRadius={78} label>
                      {financial.paymentBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                {financial.paymentBreakdown.map((item, i) => {
                  const modeNames = ['Pending', 'Cash', 'UPI', 'Card', 'Insurance'];
                  return (
                    <div key={item.mode} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        {modeNames[item.mode] || 'Other'}
                      </span>
                      <span className="font-extrabold text-slate-900">₹{item.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DAILY COLLECTION REPORT (DCR) */}
            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Daily Collection (DCR)
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily gross</span>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financial.revenueTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={d => format(new Date(d as string), 'MMM d')} tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                    <Tooltip
                      labelFormatter={d => format(new Date(d as string), 'MMM d, yyyy')}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                      contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Daily Collection" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DOCTOR REVENUE GRAPH */}
            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-purple-600" /> Doctor-wise Revenue
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top earners</span>
              </div>
              {financial.doctorRevenues && financial.doctorRevenues.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financial.doctorRevenues} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis dataKey="doctorName" type="category" tick={{fontSize: 11, fill: '#64748b'}} width={110} />
                      <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']} />
                      <Bar dataKey="totalRevenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {financial.doctorRevenues.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-xs text-center py-12">No doctor revenue data available.</p>
              )}
            </div>

            {/* SERVICE REVENUE GRAPH */}
            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ReceiptIndianRupee className="w-4 h-4 text-emerald-600" /> Department Revenue
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">By service item</span>
              </div>
              {(financial as any).serviceRevenues && (financial as any).serviceRevenues.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(financial as any).serviceRevenues} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="serviceName" tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                      <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']} />
                      <Bar dataKey="totalAmount" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44}>
                        {(financial as any).serviceRevenues.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-xs text-center py-12">No service revenue data available.</p>
              )}
            </div>

            {/* OUTSTANDING DUES GRAPH */}
            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Outstanding Receivables
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top 10 patient balances</span>
              </div>
              {(financial as any).patientOutstanding && (financial as any).patientOutstanding.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(financial as any).patientOutstanding} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis dataKey="patientName" type="category" tick={{fontSize: 11, fill: '#64748b'}} width={110} />
                      <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Outstanding']} />
                      <Bar dataKey="outstandingAmount" name="Outstanding Dues" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-xs text-center py-12">No outstanding dues recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLINICAL TAB */}
      {activeTab === 'clinical' && clinical && (
        <div className="space-y-6 animate-in fade-in shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Patients</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{clinical.newPatients}</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">First-time registrations</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Returning (Retention)</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">{clinical.returningPatients}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Follow-up & repeat care</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" /> Patient Demographics (Age)
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Age distribution</span>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinical.ageDemographics} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} />
                    <YAxis dataKey="category" type="category" tick={{fontSize: 11, fill: '#64748b'}} width={80} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="saas-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BriefcaseMedical className="w-4 h-4 text-indigo-600" /> Top Diagnoses
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clinical frequency</span>
              </div>
              <div className="space-y-2.5 h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {clinical.topDiagnoses.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-12">No diagnosis data found for this period.</p>
                ) : (
                  clinical.topDiagnoses.map((diag, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50/80 border border-slate-200/70 rounded-md hover:border-slate-300 transition-colors">
                      <span className="font-bold text-xs text-slate-800">{diag.diagnosis}</span>
                      <span className="bg-indigo-50 border border-indigo-200/80 text-indigo-700 px-2.5 py-1 rounded-sm text-[11px] font-bold">
                        {diag.count} cases
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM TAB */}
      {activeTab === 'system' && system && (
        <div className="space-y-6 animate-in fade-in shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tenants</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{system.totalOrganizations}</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Registered clinics</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Tenants</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">{system.activeOrganizations}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Live subscriptions</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform Tokens</div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-0.5">{system.totalTokensBooked}</div>
                <div className="text-[10px] text-indigo-500 font-medium mt-0.5">All appointments booked</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="saas-card p-4 sm:p-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">API Messages</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5">{system.totalMessagesSent}</div>
                <div className="text-[10px] text-amber-600 font-medium mt-0.5">Dispatches sent</div>
              </div>
              <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="saas-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Platform Growth (6 Months)
              </h3>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tokens & Tenant expansion</span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={system.platformGrowth}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{fontSize: 11, fill: '#64748b'}} />
                  <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Legend />
                  <Area type="monotone" dataKey="tokensBooked" name="Tokens Booked" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={2} />
                  <Area type="monotone" dataKey="newOrganizations" name="New Clinics" stroke="#10b981" fillOpacity={1} fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
