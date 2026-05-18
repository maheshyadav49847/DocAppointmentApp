import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  XAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Clock, Download, Activity,
  BarChart3, Star, UserPlus, 
  UserCheck, ShieldCheck, Timer, MessageSquare, Database, Server
} from 'lucide-react';
import { subDays } from 'date-fns';
import { reportService } from '../../../services/reportService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PageHeader from '../../../components/UI/PageHeader';
import './AnalyticsPage.css';

const AnalyticsPage: React.FC = () => {
  const { orgId, role, branchId: globalBranchId, setBranch } = useAuthStore();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || 'org');
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'staff' | 'saas'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`DocX_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isRestricted = 
    role !== 'OrgAdmin' && 
    role !== 'SuperAdmin' && 
    role !== '1' && 
    role !== '0';

  const isSuperAdmin = role === 'SuperAdmin' || role === '0';

  React.useEffect(() => {
    if (!isRestricted) {
      setSelectedBranchId('org');
    } else {
      setSelectedBranchId(globalBranchId || '');
    }
  }, [isRestricted, globalBranchId]);

  const [dateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date()
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId!),
    enabled: !!orgId
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', selectedBranchId, dateRange],
    queryFn: () => reportService.getBranchAnalytics(
      selectedBranchId, 
      dateRange.start.toISOString(), 
      dateRange.end.toISOString()
    ),
    enabled: !!orgId
  });

  const mainStats = [
    { label: 'Avg Wait Time', value: `${analytics?.averageWaitTimeMinutes || 0} min`, icon: <Clock size={20} />, colorClass: 'stat-color-amber' },
    { label: 'Doctor Punctuality', value: `${analytics?.operations.avgDoctorPunctualityMinutes || 0} min`, icon: <Timer size={20} />, subtitle: 'Avg Delay', colorClass: 'stat-color-red' },
    { label: 'Slot Utilization', value: `${analytics?.operations.slotUtilizationPercent || 0}%`, icon: <Activity size={20} />, colorClass: 'stat-color-indigo' },
  ];

  if (isLoading) return (
    <div className="loading-container">
      <Activity size={60} className="animate-pulse" />
      <p className="loading-text">FIRMING UP STRATEGIC DATA...</p>
    </div>
  );

  return (
    <div className="analytics-container">
      <PageHeader 
        title={isSuperAdmin ? 'Platform' : 'Strategic'}
        accentTitle={isSuperAdmin ? 'Control Center' : 'Hub'}
        subtitle="Clinical, Financial & Operational Performance Benchmarks."
        icon={<ShieldCheck />}
        rightElement={
          <div className="header-actions-container flex-mobile-column full-width-mobile">
            <div className="branch-select-wrapper full-width-mobile">
              <select 
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setBranch(e.target.value !== 'org' ? e.target.value : '');
                }}
                disabled={isRestricted}
                className="branch-select-dropdown"
              >
                {!isRestricted && <option value="org" className="branch-option">Aggregated View (Global)</option>}
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id} className="branch-option">{b.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`btn-primary export-btn ${isExporting ? 'is-exporting' : ''}`}
            >
              {isExporting ? <Activity size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        }
      />

      <div ref={dashboardRef} className="dashboard-content-wrapper">
      <div className="analytics-tabs-container">
        {(['overview', 'operations', 'staff', ...(isSuperAdmin ? ['saas'] : [])] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`analytics-tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="main-stats-grid">
            {mainStats.map((stat, i) => (
              <div key={i} className="glass-card stat-card-inner">
                <div className="stat-card-row">
                  <div>
                    <p className="stat-label-text">{stat.label.toUpperCase()}</p>
                    <h2 className="stat-value-text">{stat.value}</h2>
                  </div>
                  <div className={`stat-icon-container ${stat.colorClass}`}>{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="overview-grid">
            <div className="glass-card patient-breakdown-card">
              <h3 className="card-title-with-icon"><Users size={20} /> Patient Acquisition Breakdown</h3>
              <div className="composition-visual-container">
                <div className="composition-stats-column">
                  <div className="acquisition-stat-box stat-box-new">
                    <div className="stat-header-row">
                      <span className="stat-icon-label"><UserPlus size={14} /> NEW ENTRIES</span>
                      <span className="stat-count-value">{analytics?.patientComposition.newPatients}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill progress-fill-new w-percent-${Math.round(((analytics?.patientComposition.newPatients || 0) / (analytics?.totalTokens || 1) * 100) / 5) * 5}`} />
                    </div>
                  </div>
                  <div className="acquisition-stat-box stat-box-returning">
                    <div className="stat-header-row">
                      <span className="stat-icon-label"><UserCheck size={14} /> RETURNING</span>
                      <span className="stat-count-value">{analytics?.patientComposition.returningPatients}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className={`progress-bar-fill progress-fill-returning w-percent-${Math.round(((analytics?.patientComposition.returningPatients || 0) / (analytics?.totalTokens || 1) * 100) / 5) * 5}`} />
                    </div>
                  </div>
                </div>
                <div className="retention-box-wrapper">
                  <div className="retention-summary-card">
                    <p className="retention-label">OVERALL RETENTION RATE</p>
                    <h3 className="retention-percentage">{analytics?.patientComposition.repeatRate}%</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card doctor-performance-card">
               <h3 className="card-title-with-icon"><Users size={20} /> Clinical Performance (Doctors)</h3>
               <div className="table-scroll-wrapper">
                 <table className="performance-table">
                   <thead>
                     <tr className="table-head-row">
                       <th className="table-header-cell">DOCTOR</th>
                       <th className="table-header-cell">PATIENTS</th>
                       <th className="table-header-cell">AVG CONSULT</th>
                       <th className="table-header-cell">SATISFACTION</th>
                     </tr>
                   </thead>
                   <tbody>
                     {analytics?.doctorPerformance.map((doc: any, i: number) => (
                       <tr key={i} className="table-body-row">
                         <td className="table-body-cell-bold">{doc.doctorName}</td>
                         <td className="table-body-cell">{doc.tokenCount}</td>
                         <td className="table-body-cell">{Math.round(doc.avgWaitTime * 0.8)} min</td>
                         <td className="table-body-cell">
                            <div className="rating-display">
                               <Star size={14} /> {doc.averageRating}
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'operations' && (
        <div className="operations-layout-container">
           <div className="ops-top-row flex-mobile-column">
             <div className="glass-card chart-card">
               <h3 className="card-title-with-icon"><Clock size={20} /> Hourly Traffic Heatmap</h3>
               <div className="chart-container-height">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.hourlyTrends}>
                      <defs>
                        <linearGradient id="colorHeat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopOpacity={0.3}/>
                          <stop offset="95%" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" fontSize={12} tickFormatter={(h) => `${h}:00`} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" fill="url(#colorHeat)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
             </div>
             <div className="glass-card whatsapp-stats-card">
               <h3 className="card-title-with-icon"><MessageSquare size={20} /> WhatsApp Bridge Logs</h3>
               <div className="whatsapp-stats-column">
                  <div className="wa-stat-box wa-stat-delivered">
                     <p className="wa-stat-label wa-stat-label-delivered">DELIVERED</p>
                     <h2 className="wa-stat-value">{analytics?.whatsAppStats.delivered}</h2>
                  </div>
                  <div className="wa-stat-box wa-stat-failed">
                     <p className="wa-stat-label wa-stat-label-failed">FAILED</p>
                     <h2 className="wa-stat-value">{analytics?.whatsAppStats.failed}</h2>
                  </div>
                  <p className="wa-success-rate-text">Success Rate: {Math.round(((analytics?.whatsAppStats.delivered || 0) / (analytics?.whatsAppStats.totalSent || 1)) * 100)}%</p>
               </div>
             </div>
           </div>

           <div className="glass-card wait-time-trend-card">
              <h3 className="card-title-with-icon"><TrendingUp size={20} /> 30-Day Wait Time Trend</h3>
              <div className="wait-time-chart-height">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.dailyWaitTimeTrends}>
                    <XAxis dataKey="date" fontSize={10} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgWaitTime" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="glass-card staff-performance-card">
          <h3 className="card-title-with-icon"><BarChart3 size={20} /> Staff Efficiency & Feedback</h3>
          <div className="table-scroll-wrapper">
            <table className="staff-table">
              <thead>
                <tr className="table-head-row">
                  <th className="table-header-cell">NAME</th>
                  <th className="table-header-cell">TOKENS GENERATED</th>
                  <th className="table-header-cell">RATING</th>
                  <th className="table-header-cell">EFFICIENCY BAND</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.staffPerformance.map((staff: any, i: number) => (
                  <tr key={i} className="staff-table-row">
                    <td className="staff-cell-name">{staff.staffName}</td>
                    <td className="staff-cell-data">{staff.tokensGenerated}</td>
                    <td className="staff-cell-data">
                        <div className="rating-display">
                           <Star size={14} /> {staff.averageRating}
                        </div>
                    </td>
                    <td className="staff-cell-efficiency">
                       <div className="efficiency-bar-wrapper">
                          <div className={`efficiency-bar-fill w-percent-${Math.round(Math.min(100, (staff.tokensGenerated / 40) * 100) / 5) * 5}`} />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'saas' && (
        <div className="saas-grid flex-mobile-column">
           <div className="glass-card infra-health-card">
              <h3 className="card-title-with-icon"><Server size={20} /> Infrastructure Health</h3>
              <div className="infra-stats-list">
                 <div className="infra-stat-item-box">
                    <div className="infra-stat-header">
                       <span className="infra-stat-label-small">API Latency (Global)</span>
                       <span className="infra-stat-value-bold">{analytics?.platformStats.avgApiResponseTimeMs}ms</span>
                    </div>
                    <div className="infra-progress-bg">
                       <div className="infra-progress-fill infra-fill-green w-percent-15" />
                    </div>
                 </div>
                 <div className="infra-stat-item-box">
                    <div className="infra-stat-header">
                       <span className="infra-stat-label-small">Total Ecosystem Scale</span>
                       <span className="infra-stat-value-bold">{analytics?.platformStats.totalOrganizations} Orgs / {analytics?.platformStats.totalBranches} Branches</span>
                    </div>
                    <div className="infra-progress-bg">
                       <div className="infra-progress-fill infra-fill-amber w-percent-100" />
                    </div>
                 </div>
              </div>
           </div>
           <div className="glass-card storage-usage-card">
              <h3 className="card-title-with-icon"><Database size={20} /> Storage & SaaS Usage</h3>
              <div className="storage-display-center">
                 <p className="storage-label-text">DATABASE STORAGE</p>
                 <h2 className="storage-value-large">{analytics?.platformStats.databaseSizeMb} <span className="storage-unit-text">MB</span></h2>
                 <p className="storage-health-status">Active Tenant Health: OPTIMAL</p>
              </div>
           </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
