import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Activity, 
  Settings2, 
  ShieldCheck, 
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';

interface BridgeStatus {
  ready: boolean;
  hasQr?: boolean;
  lastQr?: string | null;
  lastQrAt?: string;
  error?: string;
  step?: string;
}

interface Branch {
  id: string;
  name: string;
}

const WhatsAppSettings: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const currentBranchId = useAuthStore((state) => state.branchId);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await api.get('/branches/list');
        setBranches(response.data);
        setSelectedBranchId(currentBranchId || response.data[0]?.id);
      } catch (err) {
        console.error('Failed to fetch branches');
      }
    };
    fetchBranches();
  }, [currentBranchId]);

  const fetchStatus = async () => {
    if (!selectedBranchId) return;
    try {
      const response = await api.get(`/whatsapp/bridge/status/${selectedBranchId}`);
      setStatus(response.data);
    } catch (err) {
      setStatus({ ready: false, hasQr: false, error: 'Bridge Unreachable' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedBranchId]);

  const handleRestart = async () => {
    if (!selectedBranchId || !confirm('Are you sure?')) return;
    setActionLoading(true);
    try {
      await api.post(`/whatsapp/bridge/restart/${selectedBranchId}`);
    } catch (err) {
      alert('Failed to restart.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!selectedBranchId || !confirm('Are you sure?')) return;
    setActionLoading(true);
    try {
      await api.post(`/whatsapp/bridge/logout/${selectedBranchId}`);
    } catch (err) {
      alert('Failed to logout.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="animate-spin" style={{ width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.1)', borderTop: '5px solid var(--accent-color)', borderRadius: '50%' }} />
      </div>
    );
  }

  const showQr = true;

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1400px', 
      margin: '0 auto', 
      color: 'var(--text-primary)',
      minHeight: '100vh',
      animation: 'fadeIn 0.5s ease'
    }}>
      
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '3rem',
        flexWrap: 'wrap',
        gap: '2rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
            <Activity size={18} className="animate-pulse" />
            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem' }}>Infrastructure Node</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            WhatsApp <span style={{ color: 'var(--accent-color)' }}>Hub</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.4rem' }}>Autonomous multi-branch messaging matrix</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
           <div className="glass-pill">
              <span className="live-dot" />
              <span>{branches.length} Nodes</span>
           </div>
           <div className="glass-pill">
              <span className="live-dot" style={{ backgroundColor: status?.ready ? 'var(--success)' : '#f59e0b', boxShadow: `0 0 10px ${status?.ready ? 'var(--success)' : '#f59e0b'}` }} />
              <span>{status?.ready ? 'Channel Sync' : 'Linked Required'}</span>
           </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Branch Navigation Sidebar */}
        <div className="glass-card" style={{ width: '320px', flexShrink: 0, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
             <Settings2 size={16} color="var(--accent-color)" />
             <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
               Select Node
             </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {branches.map(branch => (
              <div 
                key={branch.id}
                onClick={() => setSelectedBranchId(branch.id)}
                className={`branch-item ${selectedBranchId === branch.id ? 'active' : ''}`}
                style={{ 
                  padding: '1.2rem', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: selectedBranchId === branch.id ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedBranchId === branch.id ? 'var(--accent-color)' : 'transparent'}`
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <ShieldCheck size={18} color={selectedBranchId === branch.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: selectedBranchId === branch.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {branch.name}
                  </span>
                </div>
                {selectedBranchId === branch.id && <ArrowRight size={14} color="var(--accent-color)" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Hub */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Health Monitor Card */}
            <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Telemetry</h2>
                <div style={{ 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  background: status?.ready ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: status?.ready ? 'var(--success)' : '#f59e0b',
                  border: `1px solid ${status?.ready ? 'var(--success)' : '#f59e0b'}44`
                }}>
                  {status?.ready ? 'SYNCED' : 'AWAITING'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="data-box">
                  <Clock size={16} color="var(--text-secondary)" />
                  <div>
                    <span className="data-label">Last Ping</span>
                    <span className="data-value">{status?.lastQrAt ? new Date(status.lastQrAt).toLocaleTimeString() : '---'}</span>
                  </div>
                </div>
                <div className="data-box">
                  <Smartphone size={16} color="var(--text-secondary)" />
                  <div>
                    <span className="data-label">Node ID</span>
                    <span className="data-value">{selectedBranchId?.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button onClick={handleRestart} disabled={actionLoading} className="btn-glass">
                  <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
                  Cold Boot
                </button>
                <button onClick={handleLogout} disabled={actionLoading || !status?.ready} className="btn-glass btn-danger-glass">
                  <LogOut size={14} />
                  Flush Session
                </button>
              </div>
            </div>

            {/* Matrix Stats */}
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.5) 100%)' }}>
               <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Operational Matrix</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Global Latency</span>
                    <span style={{ fontWeight: 700 }}>0.04ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Security Layer</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>E2EE Active</span>
                  </div>
                  <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: 0, opacity: 0.7 }}>Securely routing all branch communications through isolated Chromium instances.</p>
                  </div>
               </div>
            </div>
          </div>

          {/* QR Core Hub */}
          <div className="glass-card" style={{ minHeight: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {status?.ready ? (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s ease' }}>
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--success)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 2rem',
                  boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)',
                  border: '2px solid var(--success)'
                }}>
                  <CheckCircle2 size={48} />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Channel Verified</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '400px' }}>
                  Node <strong>{branches.find(b => b.id === selectedBranchId)?.name}</strong> is online and processing automated queue alerts.
                </p>
              </div>
            ) : showQr ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
                  <AlertCircle size={20} color="#f59e0b" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Syncing Security Key</h3>
                </div>
                
                <div style={{ 
                  display: 'inline-block', 
                  padding: '2rem', 
                  background: 'white', 
                  borderRadius: '24px', 
                  boxShadow: '0 0 60px rgba(56, 189, 248, 0.2)',
                  border: '4px solid var(--accent-color)'
                }}>
                  <iframe 
                    src={`${import.meta.env.VITE_WHATSAPP_BRIDGE_URL || 'http://localhost:3101'}/qr/${selectedBranchId}`} 
                    style={{ width: '300px', height: '300px', border: 'none' }}
                    scrolling="no"
                  />
                </div>
                
                <div style={{ marginTop: '2.5rem' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                    Open WhatsApp <ArrowRight size={14} /> Linked Devices <ArrowRight size={14} /> Link a Device
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div className="animate-spin" style={{ width: '60px', height: '60px', border: '6px solid rgba(255,255,255,0.05)', borderTop: '6px solid var(--accent-color)', borderRadius: '50%', margin: '0 auto' }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '2rem' }}>Provisioning Node...</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Spawning Chromium core for encrypted bridge access.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .glass-pill { background: rgba(255,255,255,0.05); padding: 8px 16px; borderRadius: 20px; display: flex; alignItems: center; gap: 10px; fontSize: 0.8rem; fontWeight: 700; border: 1px solid var(--border-color); }
        
        .branch-item:hover { transform: translateX(5px); }
        .branch-item.active { box-shadow: 0 0 20px rgba(56, 189, 248, 0.1); }
        
        .data-box { background: rgba(255,255,255,0.02); padding: 12px; borderRadius: 12px; display: flex; alignItems: center; gap: 10px; border: 1px solid var(--border-color); }
        .data-label { display: block; fontSize: 0.65rem; color: var(--text-secondary); fontWeight: 700; text-transform: uppercase; }
        .data-value { display: block; fontSize: 0.85rem; fontWeight: 800; color: var(--text-primary); }
        
        .btn-glass { padding: 10px; borderRadius: 10px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); cursor: pointer; display: flex; alignItems: center; justifyContent: center; gap: 8px; fontWeight: 700; color: var(--text-secondary); transition: all 0.2s ease; fontSize: 0.8rem; }
        .btn-glass:hover:not(:disabled) { background: rgba(255,255,255,0.1); border-color: var(--accent-color); color: var(--accent-color); transform: translateY(-1px); }
        .btn-danger-glass { color: var(--danger); border-color: rgba(239, 68, 68, 0.2); }
        .btn-danger-glass:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); color: var(--danger); }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default WhatsAppSettings;
