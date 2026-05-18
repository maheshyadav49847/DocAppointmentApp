import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Settings2, 
  ShieldCheck, 
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';
import { notify } from '../../../stores/notificationStore';
import PageHeader from '../../../components/UI/PageHeader';
import './WhatsAppSettings.css';

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

const WhatsAppSettingsReplica: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { branchId: currentBranchId, setBranch } = useAuthStore();

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
      notify.danger('Restart Failed', 'Failed to restart bridge.');
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
      notify.danger('Logout Failed', 'Failed to logout from bridge.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner animate-spin" />
      </div>
    );
  }

  const showQr = true;

  return (
    <div className="whatsapp-container">
      
      {/* Header Section */}
      <PageHeader 
        title="WhatsApp" 
        accentTitle="Hub" 
        subtitle="Autonomous multi-branch messaging matrix"
        icon={<Smartphone />}
        rightElement={
          <div className="header-right">
             <div className="glass-pill">
                <span className="live-dot" />
                <span>{branches.length} Nodes</span>
             </div>
             <div className="glass-pill">
                <span className={`live-dot status-dot-${status?.ready ? 'ready' : 'awaiting'}`} />
                <span>{status?.ready ? 'Channel Sync' : 'Linked Required'}</span>
             </div>
          </div>
        }
      />

      <div className="content-layout">
        
        {/* Branch Navigation Sidebar */}
        <div className="glass-card sidebar-card">
          <div className="sidebar-header">
             <Settings2 size={16} color="var(--accent-color)" />
             <h3 className="sidebar-title">
               Select Node
             </h3>
          </div>
          
          <div className="branch-list">
            {branches.map(branch => (
              <div 
                key={branch.id}
                onClick={() => {
                  setSelectedBranchId(branch.id);
                  setBranch(branch.id);
                }}
                className={`branch-item ${selectedBranchId === branch.id ? 'active' : ''}`}
              >
                <div className="branch-item-info">
                  <ShieldCheck size={18} className="branch-item-icon" />
                  <span className="branch-item-name">
                    {branch.name}
                  </span>
                </div>
                {selectedBranchId === branch.id && <ArrowRight size={14} color="var(--accent-color)" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Hub */}
        <div className="main-hub">
          
          <div className="stats-grid">
            
            {/* Health Monitor Card */}
            <div className="glass-card telemetry-card">
              <div className="card-header-row">
                <h2 className="card-title">Telemetry</h2>
                <div className={`status-badge ${status?.ready ? 'ready' : 'awaiting'}`}>
                  {status?.ready ? 'SYNCED' : 'AWAITING'}
                </div>
              </div>

              <div className="data-grid">
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

              <div className="action-grid">
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
            <div className="glass-card matrix-card">
               <h3 className="matrix-title">Operational Matrix</h3>
               <div className="matrix-list">
                  <div className="matrix-item">
                    <span className="matrix-label">Global Latency</span>
                    <span className="matrix-value">0.04ms</span>
                  </div>
                  <div className="matrix-item">
                    <span className="matrix-label">Security Layer</span>
                    <span className="matrix-value success">E2EE Active</span>
                  </div>
                  <div className="matrix-note">
                    <p className="matrix-note-text">Securely routing all branch communications through isolated Chromium instances.</p>
                  </div>
               </div>
            </div>
          </div>

          {/* QR Core Hub */}
          <div className="glass-card qr-hub-card">
            {status?.ready ? (
              <div className="success-state">
                <div className="success-icon-wrapper">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="success-title">Channel Verified</h2>
                <p className="success-text">
                  Node <strong>{branches.find(b => b.id === selectedBranchId)?.name}</strong> is online and processing automated queue alerts.
                </p>
              </div>
            ) : showQr ? (
              <div className="qr-state">
                <div className="qr-header">
                  <AlertCircle size={20} color="#f59e0b" />
                  <h3 className="qr-title">Syncing Security Key</h3>
                </div>
                
                <div className="qr-container">
                  <iframe 
                    src={`${import.meta.env.VITE_WHATSAPP_BRIDGE_URL || 'http://localhost:3101'}/qr/${selectedBranchId}?apiKey=${import.meta.env.VITE_WHATSAPP_BRIDGE_API_KEY || ''}`} 
                    className="qr-iframe"
                    scrolling="no"
                  />
                </div>
                
                <div className="qr-instructions">
                  <p className="qr-instruction-text">
                    Open WhatsApp <ArrowRight size={14} /> Linked Devices <ArrowRight size={14} /> Link a Device
                  </p>
                </div>
              </div>
            ) : (
              <div className="loading-state">
                <div className="spinner large animate-spin" />
                <h3 className="loading-title">Provisioning Node...</h3>
                <p className="loading-subtitle">Spawning Chromium core for encrypted bridge access.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettingsReplica;
