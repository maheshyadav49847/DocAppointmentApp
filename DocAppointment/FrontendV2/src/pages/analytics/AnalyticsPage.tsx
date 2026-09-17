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
    <div className="animate-in fade-in duration-500 space-y-3.5 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-white shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-slate-900">Performance</span>
              <span className="text-indigo-600">Analytics</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                Intelligence Hub
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Data-driven insights for {format(displayStart, 'MMM d, yyyy')} - {format(displayEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Header Actions & Filters - Uniform h-9 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button 
            onClick={handleExportCsv}
            className="btn-secondary h-9 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            title="Export analytics to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          
          <div className="h-9 flex items-center bg-white border border-slate-200/90 rounded-md px-2.5 shadow-2xs">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <select 
              value={dateRangeMode}
              onChange={(e) => setDateRangeMode(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRangeMode === 'custom' && (
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
        </div>
      </div>

      {/* Segmented Navigation Tabs - Strict Uniform h-9 Height */}
      <div className="saas-card p-1.5 flex flex-wrap items-center gap-1.5 bg-white border border-slate-200/90 shadow-2xs w-fit">
        <button
          onClick={() => setActiveTab('operational')}
          className={`h-9 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'operational'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span>Operational</span>
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`h-9 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'financial'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <ReceiptIndianRupee className="w-3.5 h-3.5 shrink-0" />
          <span>Financial</span>
        </button>
        <button
          onClick={() => setActiveTab('clinical')}
          className={`h-9 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            activeTab === 'clinical'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <BriefcaseMedical className="w-3.5 h-3.5 shrink-0" />
          <span>Clinical</span>
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`h-9 px-3.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'system'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span>Platform</span>
          </button>
        )}
      </div>

      {/* OPERATIONAL TAB */}
      {activeTab === 'operational' && operational && (
        <div className="space-y-3.5 animate-in fade-in shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Footfall</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{operational.totalTokens}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Total registered visits</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">
                  {operational.totalTokens ? Math.round((operational.completedTokens / operational.totalTokens) * 100) : 0}%
                </h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">{operational.completedTokens} visits fulfilled</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">No-Show / Cancelled</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">{operational.noShowTokens + operational.cancelledTokens}</h3>
                <p className="text-[10px] sm:text-[11px] text-rose-600/80 font-medium mt-0.5">{operational.cancelledTokens} cancelled • {operational.noShowTokens} no-show</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Wait Time</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">{operational.averageWaitTimeMinutes} min</h3>
                <p className="text-[10px] sm:text-[11px] text-amber-600/80 font-medium mt-0.5">Door to doctor consult</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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

            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
        <div className="space-y-3.5 animate-in fade-in shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">₹{financial.totalRevenue.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">Settled income across services</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ReceiptIndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5">₹{financial.outstandingDues.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] sm:text-[11px] text-rose-600/80 font-medium mt-0.5">Uncollected receivables</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            <div className="lg:col-span-2 saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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

            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
        <div className="space-y-3.5 animate-in fade-in shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Patients</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{clinical.newPatients}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">First-time registrations</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Returning (Retention)</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{clinical.returningPatients}</h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">Follow-up & repeat care</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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

            <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
        <div className="space-y-3.5 animate-in fade-in shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tenants</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{system.totalOrganizations}</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Registered clinics</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Tenants</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{system.activeOrganizations}</h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium mt-0.5">Live subscriptions</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform Tokens</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-600 mt-0.5">{system.totalTokensBooked}</h3>
                <p className="text-[10px] sm:text-[11px] text-indigo-600/80 font-medium mt-0.5">All appointments booked</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-lg p-3 sm:p-3.5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">API Messages</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-0.5">{system.totalMessagesSent}</h3>
                <p className="text-[10px] sm:text-[11px] text-amber-600/80 font-medium mt-0.5">Dispatches sent</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          <div className="saas-card p-4 sm:p-4.5 border-slate-200/90 shadow-2xs bg-white">
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
