import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../../services/analyticsService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import { format, subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
  Calendar, TrendingUp, Users, CheckCircle2, Clock,
  AlertCircle, Download, ArrowUpRight, ArrowDownRight,
  Activity, BarChart3, Building2
} from 'lucide-react';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; trend?: string; trendUp?: boolean }> = ({ title, value, icon, color, trend, trendUp }) => (
  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, transform: 'scale(2)', color }}>
      {icon}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ padding: '10px', borderRadius: '12px', background: `${color}20`, color }}>
        {icon}
      </div>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
      <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{value}</h2>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: trendUp ? 'var(--success)' : 'var(--danger)', marginBottom: '5px' }}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      )}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card" style={{
        padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        background: 'rgba(30, 41, 59, 0.85)',
        borderRadius: '12px',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || entry.fill }}></div>
              <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>
                {entry.name}: <span style={{ color: entry.color || entry.fill, fontWeight: 700 }}>{entry.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const AnalyticsPage: React.FC = () => {
  const { branchId: globalBranchId, orgId } = useAuthStore();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || '');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', selectedBranchId, startDate, endDate],
    queryFn: () => analyticsService.getHistoricalStats(selectedBranchId, startDate, endDate),
    enabled: !!selectedBranchId
  });

  const chartData = data?.dailyStats.map(stat => ({
    ...stat,
    formattedDate: format(new Date(stat.date), 'MMM dd')
  })) || [];

  const pieData = [
    { name: 'Completed', value: data?.totalCompletedInPeriod || 0, color: 'var(--success)' },
    { name: 'Skipped', value: data?.totalSkippedInPeriod || 0, color: 'var(--danger)' }
  ];

  if (!selectedBranchId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="flex-mobile-column">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>Analytics</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '5px', margin: 0 }}>Select a branch to view performance data</p>
            </div>
          </div>
          <div style={{ minWidth: '250px' }} className="full-width-mobile">
            <select 
               value={selectedBranchId} 
               onChange={(e) => setSelectedBranchId(e.target.value)}
               style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
             >
               <option value="">Choose a branch...</option>
               {branches?.map((b: any) => <option key={b.id} value={b.id} style={{ background: '#0f172a' }}>{b.name}</option>)}
             </select>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '120px', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Building2 size={80} style={{ marginBottom: '30px', opacity: 0.1, color: 'var(--accent-color)' }} />
          <h2 style={{ color: 'white', fontSize: '2rem' }}>Ready for Analysis</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '15px auto' }}>Please select a hospital location from the dropdown above to generate site-specific performance reports and trends.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Activity size={60} color="var(--accent-color)" className="animate-pulse" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>ANALYZING HOSPITAL DATA...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="flex-mobile-column">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
              <BarChart3 size={28} />
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
                Analytics
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '5px', margin: 0 }}>Site-specific performance trends.</p>
            </div>
          </div>

          {/* Branch Selector Parallel to Title */}
          <div style={{ minWidth: '220px' }} className="full-width-mobile">
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               <Building2 size={12} /> Hospital Branch
             </label>
             <select 
               value={selectedBranchId} 
               onChange={(e) => setSelectedBranchId(e.target.value)}
               style={{ 
                 width: '100%', padding: '10px 15px', borderRadius: '12px', 
                 background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                 color: 'white', fontWeight: 600, fontSize: '0.85rem'
               }}
             >
               {branches?.map((b: any) => (
                 <option key={b.id} value={b.id} style={{ background: '#0f172a' }}>{b.name}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Filters & Actions Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          gap: '20px'
        }} className="flex-mobile-column">
          
          {/* Modernized Date Picker (Keeping requested change) */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', 
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)',
            padding: '0 20px', borderRadius: '12px', height: '44px', boxSizing: 'border-box'
          }} className="full-width-mobile glass-hover">
            <Calendar size={18} color="var(--accent-color)" />
            <Flatpickr
              value={[new Date(startDate), new Date(endDate)]}
              options={{
                mode: 'range',
                dateFormat: 'M d, Y',
                showMonths: 2
              }}
              onChange={(dates: Date[]) => {
                if (dates.length === 2) {
                  setStartDate(format(dates[0], 'yyyy-MM-dd'));
                  setEndDate(format(dates[1], 'yyyy-MM-dd'));
                }
              }}
              className="flatpickr-custom-input"
            />
          </div>

          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
              transition: 'all 0.2s', height: '44px', boxSizing: 'border-box'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <Download size={16} color="var(--accent-color)" /> Export CSV
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <StatCard
          icon={<Users color="var(--accent-color)" />}
          title="Total Patients"
          value={data?.totalPatientsInPeriod || 0}
          trend="+12%"
          color="var(--accent-color)"
        />
        <StatCard
          icon={<CheckCircle2 color="var(--success)" />}
          title="Completed"
          value={data?.totalCompletedInPeriod || 0}
          trend="+8%"
          color="var(--success)"
        />
        <StatCard
          icon={<AlertCircle color="var(--danger)" />}
          title="Skipped"
          value={data?.totalSkippedInPeriod || 0}
          trend="-2%"
          color="var(--danger)"
        />
        <StatCard
          icon={<Clock color="#facc15" />}
          title="Avg. Wait Time"
          value={`${data?.averageWaitTimeInPeriod || 0}m`}
          trend="-15%"
          color="#facc15"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Main Area Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp color="var(--accent-color)" />
              <h3 style={{ fontSize: '1.2rem' }}>Patient Flow Trends</h3>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }}></div> Total
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div> Completed
              </span>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="totalPatients"
                  name="Total"
                  stroke="var(--accent-color)"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="var(--success)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSuccess)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Status Pie */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <Activity color="var(--success)" />
            <h3 style={{ fontSize: '1.2rem' }}>Status Breakdown</h3>
          </div>

          <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>EFFICIENCY</p>
              <h2 style={{ margin: 0, fontSize: '2rem' }}>
                {data && data.totalPatientsInPeriod > 0
                  ? Math.round((data.totalCompletedInPeriod / data.totalPatientsInPeriod) * 100)
                  : 0}%
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            {pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }}></div>
                  <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wait Time Bar Chart */}
      <div className="glass-card" style={{ minHeight: '350px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <Clock color="#facc15" />
          <h3 style={{ fontSize: '1.2rem' }}>Average Wait Time (Minutes)</h3>
        </div>

        <div style={{ height: '250px', width: '100%', minHeight: '250px' }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="avgWaitTimeMinutes" name="Wait Time" radius={[4, 4, 0, 0]} barSize={30}>
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.avgWaitTimeMinutes > 15 ? 'var(--danger)' : 'var(--accent-color)'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
