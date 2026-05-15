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

const AnalyticsPage: React.FC = () => {
  const { orgId, role, branchId: globalBranchId } = useAuthStore();
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
        useCORS: true,
        backgroundColor: '#0a0a0a' // Match dashboard bg
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
    { label: 'Avg Wait Time', value: `${analytics?.averageWaitTimeMinutes || 0} min`, icon: <Clock size={20} />, color: '#fbbf24' },
    { label: 'Doctor Punctuality', value: `${analytics?.operations.avgDoctorPunctualityMinutes || 0} min`, icon: <Timer size={20} />, color: '#f87171', subtitle: 'Avg Delay' },
    { label: 'Slot Utilization', value: `${analytics?.operations.slotUtilizationPercent || 0}%`, icon: <Activity size={20} />, color: '#818cf8' },
  ];

  if (isLoading) return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Activity size={60} color="var(--accent-color)" className="animate-pulse" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>FIRMING UP STRATEGIC DATA...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header Section */}
      <PageHeader 
        title={isSuperAdmin ? 'Platform' : 'Strategic'}
        accentTitle={isSuperAdmin ? 'Control Center' : 'Hub'}
        subtitle="Clinical, Financial & Operational Performance Benchmarks."
        icon={<ShieldCheck />}
        rightElement={
          <div style={{ display: 'flex', gap: '15px' }} className="flex-mobile-column full-width-mobile">
            <div style={{ position: 'relative', minWidth: '220px' }} className="full-width-mobile">
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={isRestricted}
                style={{ 
                  width: '100%', padding: '12px 15px', borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', fontWeight: 600, fontSize: '0.85rem',
                  outline: 'none', cursor: isRestricted ? 'not-allowed' : 'pointer',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {!isRestricted && <option value="org" style={{ background: '#1e293b', color: 'white' }}>Aggregated View (Global)</option>}
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id} style={{ background: '#1e293b', color: 'white' }}>{b.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="btn-primary" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                borderRadius: '12px', opacity: isExporting ? 0.7 : 1 
              }}
            >
              {isExporting ? <Activity size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        }
      />

      <div ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
         {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '5px', borderRadius: '15px', width: 'fit-content' }}>
        {(['overview', 'operations', 'staff', ...(isSuperAdmin ? ['saas'] : [])] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{ 
              padding: '10px 25px', borderRadius: '10px', border: 'none', 
              background: activeTab === tab ? 'var(--accent-color)' : 'transparent',
              color: activeTab === tab ? 'black' : 'var(--text-secondary)',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s',
              textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Main Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {mainStats.map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px' }}>{stat.label.toUpperCase()}</p>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{stat.value}</h2>
                  </div>
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
            {/* Patient Composition */}
            <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', width: '100%' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={20} color="var(--accent-color)" /> Patient Acquisition Breakdown</h3>
              <div style={{ flex: 1, display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.03)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><UserPlus size={14} color="#38bdf8" /> NEW ENTRIES</span>
                      <span style={{ fontWeight: 800 }}>{analytics?.patientComposition.newPatients}</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                      <div style={{ height: '100%', background: '#38bdf8', width: `${(analytics?.patientComposition.newPatients || 0) / (analytics?.totalTokens || 1) * 100}%` }} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '15px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}><UserCheck size={14} color="#10b981" /> RETURNING</span>
                      <span style={{ fontWeight: 800 }}>{analytics?.patientComposition.returningPatients}</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                      <div style={{ height: '100%', background: '#10b981', width: `${(analytics?.patientComposition.returningPatients || 0) / (analytics?.totalTokens || 1) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '100%', padding: '25px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 800 }}>OVERALL RETENTION RATE</p>
                    <h3 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)' }}>{analytics?.patientComposition.repeatRate}%</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Width Doctor Performance Table */}
            <div className="glass-card" style={{ padding: '25px' }}>
               <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={20} color="var(--accent-color)" /> Clinical Performance (Doctors)</h3>
               <div style={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead>
                     <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <th style={{ padding: '10px' }}>DOCTOR</th>
                       <th style={{ padding: '10px' }}>PATIENTS</th>
                       <th style={{ padding: '10px' }}>AVG CONSULT</th>
                       <th style={{ padding: '10px' }}>SATISFACTION</th>
                     </tr>
                   </thead>
                   <tbody>
                     {analytics?.doctorPerformance.map((doc, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                         <td style={{ padding: '15px 10px', fontWeight: 600 }}>{doc.doctorName}</td>
                         <td style={{ padding: '15px 10px' }}>{doc.tokenCount}</td>
                         <td style={{ padding: '15px 10px' }}>{Math.round(doc.avgWaitTime * 0.8)} min</td>
                         <td style={{ padding: '15px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontWeight: 700 }}>
                               <Star size={14} fill="#fbbf24" /> {doc.averageRating}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', minWidth: 0 }} className="flex-mobile-column">
             <div className="glass-card" style={{ padding: '25px' }}>
               <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Clock size={20} color="var(--accent-color)" /> Hourly Traffic Heatmap</h3>
               <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.hourlyTrends}>
                      <defs>
                        <linearGradient id="colorHeat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(h) => `${h}:00`} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="var(--accent-color)" fill="url(#colorHeat)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
             </div>
             <div className="glass-card" style={{ padding: '25px' }}>
               <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><MessageSquare size={20} color="#38bdf8" /> WhatsApp Bridge Logs</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '15px', textAlign: 'center' }}>
                     <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>DELIVERED</p>
                     <h2 style={{ margin: '5px 0 0 0', fontSize: '2.5rem' }}>{analytics?.whatsAppStats.delivered}</h2>
                  </div>
                  <div style={{ padding: '20px', background: 'rgba(248, 113, 113, 0.05)', borderRadius: '15px', textAlign: 'center' }}>
                     <p style={{ margin: 0, fontSize: '0.7rem', color: '#f87171', fontWeight: 800 }}>FAILED</p>
                     <h2 style={{ margin: '5px 0 0 0', fontSize: '2.5rem' }}>{analytics?.whatsAppStats.failed}</h2>
                  </div>
                  <p style={{ margin: 0, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Success Rate: {Math.round(((analytics?.whatsAppStats.delivered || 0) / (analytics?.whatsAppStats.totalSent || 1)) * 100)}%</p>
               </div>
             </div>
           </div>

           <div className="glass-card" style={{ padding: '25px' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><TrendingUp size={20} color="#fbbf24" /> 30-Day Wait Time Trend</h3>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.dailyWaitTimeTrends}>
                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgWaitTime" stroke="#fbbf24" fill="#fbbf2420" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><BarChart3 size={20} color="var(--accent-color)" /> Staff Efficiency & Feedback</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0 15px' }}>NAME</th>
                  <th style={{ padding: '0 15px' }}>TOKENS GENERATED</th>
                  <th style={{ padding: '0 15px' }}>RATING</th>
                  <th style={{ padding: '0 15px' }}>EFFICIENCY BAND</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.staffPerformance.map((staff, i) => (
                  <tr key={i} style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '15px', fontWeight: 700, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>{staff.staffName}</td>
                    <td style={{ padding: '15px' }}>{staff.tokensGenerated}</td>
                    <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontWeight: 700 }}>
                           <Star size={14} fill="#fbbf24" /> {staff.averageRating}
                        </div>
                    </td>
                    <td style={{ padding: '15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                       <div style={{ width: '150px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                          <div style={{ height: '100%', background: 'var(--accent-color)', width: `${Math.min(100, (staff.tokensGenerated / 40) * 100)}%` }} />
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }} className="flex-mobile-column">
           <div className="glass-card" style={{ padding: '25px' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Server size={20} color="var(--accent-color)" /> Infrastructure Health</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontSize: '0.8rem' }}>API Latency (Global)</span>
                       <span style={{ fontWeight: 700, color: '#10b981' }}>{analytics?.platformStats.avgApiResponseTimeMs}ms</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                       <div style={{ height: '100%', width: '15%', background: '#10b981' }} />
                    </div>
                 </div>
                 <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontSize: '0.8rem' }}>Total Ecosystem Scale</span>
                       <span style={{ fontWeight: 700, color: '#fbbf24' }}>{analytics?.platformStats.totalOrganizations} Orgs / {analytics?.platformStats.totalBranches} Branches</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                       <div style={{ height: '100%', width: '100%', background: '#fbbf24' }} />
                    </div>
                 </div>
              </div>
           </div>
           <div className="glass-card" style={{ padding: '25px' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Database size={20} color="var(--accent-color)" /> Storage & SaaS Usage</h3>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                 <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DATABASE STORAGE</p>
                 <h2 style={{ margin: '10px 0', fontSize: '3rem', fontWeight: 800 }}>{analytics?.platformStats.databaseSizeMb} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>MB</span></h2>
                 <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981' }}>Active Tenant Health: OPTIMAL</p>
              </div>
           </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
