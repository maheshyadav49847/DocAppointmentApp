import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  XAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Users, Clock, Download, Activity,
  BarChart3, Star, CreditCard, UserPlus, 
  UserCheck, ShieldCheck, Timer, MessageSquare, Database, Server
} from 'lucide-react';
import { subDays } from 'date-fns';
import { reportService } from '../../../services/reportService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    { label: 'Total Revenue', value: `₹${(analytics?.totalRevenue || 0).toLocaleString()}`, icon: <CreditCard size={20} />, color: '#10b981' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} className="flex-mobile-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              background: 'linear-gradient(to right, #fff, var(--accent-color))', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              {isSuperAdmin ? 'Platform Control Center' : 'Strategic Hub'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '5px', margin: 0 }}>Clinical, Financial & Operational Performance Benchmarks.</p>
          </div>
        }
      />

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
                  <div style={{ padding: '12px', background: `${stat.color}15`, color: stat.color, borderRadius: '12px' }}>{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }} className="flex-mobile-column">
            {/* Financial Breakdown */}
            <div className="glass-card" style={{ padding: '25px' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><CreditCard size={20} color="var(--accent-color)" /> Revenue Stream Mix</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cash', value: analytics?.financials.cash || 0 },
                          { name: 'UPI', value: analytics?.financials.upi || 0 },
                          { name: 'Card', value: analytics?.financials.card || 0 },
                          { name: 'Online', value: analytics?.financials.online || 0 },
                        ]}
                        innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        <Cell fill="#10b981" /><Cell fill="#38bdf8" /><Cell fill="#fbbf24" /><Cell fill="#818cf8" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                  {['Cash', 'UPI', 'Card', 'Online'].map((mode, i) => {
                    const colors = ['#10b981', '#38bdf8', '#fbbf24', '#818cf8'];
                    const val = (analytics?.financials as any)?.[mode.toLowerCase()] || 0;
                    return (
                      <div key={mode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i] }} />
                          <span style={{ fontSize: '0.85rem' }}>{mode}</span>
                        </div>
                        <span style={{ fontWeight: 700 }}>₹{val.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Patient Composition */}
            <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={20} color="var(--accent-color)" /> Patient Acquisition</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '25px', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.03)', padding: '15px', borderRadius: '12px' }}>
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
            </div>
          </div>
        </>
      )}

      {activeTab === 'operations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }} className="flex-mobile-column">
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
          <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><BarChart3 size={20} color="var(--accent-color)" /> Receptionist Throughput</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0 15px' }}>NAME</th>
                  <th style={{ padding: '0 15px' }}>TOKENS GENERATED</th>
                  <th style={{ padding: '0 15px' }}>EFFICIENCY BAND</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.staffPerformance.map((staff, i) => (
                  <tr key={i} style={{ background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '15px', fontWeight: 700, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>{staff.staffName}</td>
                    <td style={{ padding: '15px' }}>{staff.tokensGenerated}</td>
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
                       <span style={{ fontSize: '0.8rem' }}>API Response Time</span>
                       <span style={{ fontWeight: 700, color: '#10b981' }}>124ms</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}><div style={{ height: '100%', width: '15%', background: '#10b981' }} /></div>
                 </div>
                 <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontSize: '0.8rem' }}>Database Load</span>
                       <span style={{ fontWeight: 700, color: '#fbbf24' }}>42%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}><div style={{ height: '100%', width: '42%', background: '#fbbf24' }} /></div>
                 </div>
              </div>
           </div>
           <div className="glass-card" style={{ padding: '25px' }}>
              <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Database size={20} color="var(--accent-color)" /> Tenant Resource Usage</h3>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                 <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DATA CONSUMPTION</p>
                 <h2 style={{ margin: '10px 0', fontSize: '3rem', fontWeight: 800 }}>85.4 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>MB</span></h2>
                 <p style={{ margin: 0, fontSize: '0.7rem', color: '#10b981' }}>Within SaaS Tier Limits</p>
              </div>
           </div>
        </div>
      )}

      {/* Common View: Doctor Performance & Feedback */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }} className="flex-mobile-column">
        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={20} color="var(--accent-color)" /> Clinical Throughput (Doctors)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '10px' }}>DOCTOR</th>
                  <th style={{ padding: '10px' }}>PATIENTS</th>
                  <th style={{ padding: '10px' }}>AVG CONSULT</th>
                  <th style={{ padding: '10px' }}>REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.doctorPerformance.map((doc, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '15px 10px', fontWeight: 600 }}>{doc.doctorName}</td>
                    <td style={{ padding: '15px 10px' }}>{doc.tokenCount}</td>
                    <td style={{ padding: '15px 10px' }}>{Math.round(doc.avgWaitTime * 0.8)} min</td>
                    <td style={{ padding: '15px 10px', fontWeight: 700, color: '#10b981' }}>₹{doc.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><Star size={20} color="#fbbf24" /> Patient NPS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {analytics?.recentFeedback.slice(0, 5).map((fb, i) => (
              <div key={i} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{fb.patientName}</span>
                  <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>★ {fb.score}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{fb.comment || 'Excellent service.'}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
