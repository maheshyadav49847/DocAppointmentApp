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
  Activity, DollarSign, Users, CalendarDays, BriefcaseMedical, Download, Monitor, TrendingUp
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
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col h-full min-h-0 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 shrink-0">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="p-3.5 rounded-lg text-indigo-600 flex items-center justify-center border-2 border-indigo-100 bg-transparent shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="text-slate-900">Analytics &</span>
              <span className="text-indigo-600">Reports</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Data-driven insights for {format(displayStart, 'MMM d, yyyy')} - {format(displayEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm shrink-0"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shrink-0 shadow-sm">
              <CalendarDays className="w-4 h-4 text-slate-400 mr-2" />
              <select 
                value={dateRangeMode}
                onChange={(e) => setDateRangeMode(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
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
                  <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={customStart}
                    onChange={(date: Date | null) => date && setCustomStart(date)}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    className="w-32 pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white"
                  />
                </div>
                <span className="text-slate-400">-</span>
                <div className="relative">
                  <CalendarDays className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <DatePicker
                    selected={customEnd}
                    onChange={(date: Date | null) => date && setCustomEnd(date)}
                    dateFormat="dd MMM yyyy"
                    showMonthDropdown
                    showYearDropdown
                    className="w-32 pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('operational')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'operational' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Activity className="w-4 h-4 inline-block mr-2" /> Operational
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'financial' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <DollarSign className="w-4 h-4 inline-block mr-2" /> Financial
        </button>
        <button
          onClick={() => setActiveTab('clinical')}
          className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'clinical' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <BriefcaseMedical className="w-4 h-4 inline-block mr-2" /> Clinical
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'system' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Monitor className="w-4 h-4 inline-block mr-2" /> Platform
          </button>
        )}
      </div>

      {/* OPERATIONAL TAB */}
      {activeTab === 'operational' && operational && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Total Footfall</p>
              <h2 className="text-3xl font-bold text-slate-900">{operational.totalTokens}</h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Completion Rate</p>
              <h2 className="text-3xl font-bold text-emerald-600">
                {operational.totalTokens ? Math.round((operational.completedTokens / operational.totalTokens) * 100) : 0}%
              </h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">No-Show / Cancelled</p>
              <h2 className="text-3xl font-bold text-rose-600">{operational.noShowTokens + operational.cancelledTokens}</h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Avg Wait Time</p>
              <h2 className="text-3xl font-bold text-amber-500">{operational.averageWaitTimeMinutes} min</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Peak Footfall Hours</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operational.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="tokenCount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Doctor Utilization (%)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Doctor</th>
                      <th className="px-4 py-3">Booked / Capacity</th>
                      <th className="px-4 py-3 rounded-r-lg">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operational.doctorUtilizations.map(doc => (
                      <tr key={doc.doctorId} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium">{doc.doctorName}</td>
                        <td className="px-4 py-3">{doc.bookedTokens} / {doc.totalCapacity}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(doc.utilizationPercentage, 100)}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold">{doc.utilizationPercentage}%</span>
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
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Total Revenue</p>
              <h2 className="text-3xl font-bold text-emerald-600">&#8377;{financial.totalRevenue.toLocaleString()}</h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Outstanding Dues</p>
              <h2 className="text-3xl font-bold text-rose-600">&#8377;{financial.outstandingDues.toLocaleString()}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Revenue Trend</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financial.revenueTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={d => format(new Date(d as string), 'MMM d')} tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip labelFormatter={d => format(new Date(d as string), 'MMM d, yyyy')} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="outstanding" name="Outstanding Dues" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Payment Breakdown</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={financial.paymentBreakdown} dataKey="totalAmount" nameKey="mode" cx="50%" cy="50%" innerRadius={60} outerRadius={80} label>
                      {financial.paymentBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {financial.paymentBreakdown.map((item, i) => {
                  const modeNames = ['Pending', 'Cash', 'UPI', 'Card', 'Insurance'];
                  return (
                    <div key={item.mode} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        {modeNames[item.mode] || 'Other'}
                      </span>
                      <span className="font-semibold">&#8377;{item.totalAmount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DAILY COLLECTION REPORT (DCR) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Daily Collection Report (DCR)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financial.revenueTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={d => format(new Date(d as string), 'MMM d')} tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip labelFormatter={d => format(new Date(d as string), 'MMM d, yyyy')} formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" name="Daily Collection" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DOCTOR REVENUE GRAPH */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Doctor-wise Revenue</h3>
              {financial.doctorRevenues && financial.doctorRevenues.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financial.doctorRevenues} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{fontSize: 12}} />
                      <YAxis dataKey="doctorName" type="category" tick={{fontSize: 12}} width={120} />
                      <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                      <Bar dataKey="totalRevenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {financial.doctorRevenues.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">No doctor revenue data available.</p>
              )}
            </div>

            {/* SERVICE REVENUE GRAPH */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Service / Department Revenue</h3>
              {(financial as any).serviceRevenues && (financial as any).serviceRevenues.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(financial as any).serviceRevenues} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="serviceName" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                      <Bar dataKey="totalAmount" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]}>
                        {(financial as any).serviceRevenues.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">No service revenue data available.</p>
              )}
            </div>

            {/* OUTSTANDING DUES GRAPH */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Outstanding Dues & Receivables (Top 10)</h3>
              {(financial as any).patientOutstanding && (financial as any).patientOutstanding.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(financial as any).patientOutstanding} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{fontSize: 12}} />
                      <YAxis dataKey="patientName" type="category" tick={{fontSize: 12}} width={120} />
                      <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                      <Bar dataKey="outstandingAmount" name="Outstanding Dues" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">No outstanding dues available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLINICAL TAB */}
      {activeTab === 'clinical' && clinical && (
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">New Patients</p>
                <h2 className="text-3xl font-bold text-slate-900">{clinical.newPatients}</h2>
              </div>
              <Users className="w-10 h-10 text-indigo-100" />
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Returning (Retention)</p>
                <h2 className="text-3xl font-bold text-emerald-600">{clinical.returningPatients}</h2>
              </div>
              <CalendarDays className="w-10 h-10 text-emerald-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Patient Demographics (Age)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinical.ageDemographics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{fontSize: 12}} />
                    <YAxis dataKey="category" type="category" tick={{fontSize: 12}} width={80} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-6">Top Diagnoses</h3>
              <div className="space-y-3 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {clinical.topDiagnoses.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No diagnosis data found for this period.</p>
                ) : (
                  clinical.topDiagnoses.map((diag, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{diag.diagnosis}</span>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{diag.count} cases</span>
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
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Total Tenants</p>
              <h2 className="text-3xl font-bold text-slate-900">{system.totalOrganizations}</h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Active Tenants</p>
              <h2 className="text-3xl font-bold text-emerald-600">{system.activeOrganizations}</h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Total Tokens (Platform)</p>
              <h2 className="text-3xl font-bold text-indigo-600">{system.totalTokensBooked}</h2>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Messages Sent (API)</p>
              <h2 className="text-3xl font-bold text-amber-500">{system.totalMessagesSent}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-6">Platform Growth (6 Months)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={system.platformGrowth}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
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
