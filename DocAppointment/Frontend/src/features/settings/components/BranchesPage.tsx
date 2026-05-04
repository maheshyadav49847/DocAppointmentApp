import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { branchService } from '../../../services/branchService';
import { whatsappConfigService } from '../../../services/whatsappConfigService';
import { notify } from '../../../stores/notificationStore';
import { 
  Building2, MapPin, Smartphone, Plus, Settings, 
  Activity, Info, Shield, Link, Download, ArrowRight, Save, X, CheckCircle2
} from 'lucide-react';
import Modal from '../../../components/Modal';

const BranchesPage: React.FC = () => {
  const { orgId, branchId, setBranch } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  
  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    whatsAppNumber: '',
    organizationId: orgId
  });

  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: ''
  });

  const { data: branches, isLoading, isError, error } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  const { data: twilioData } = useQuery({
    queryKey: ['twilioConfig'],
    queryFn: whatsappConfigService.getConfig
  });

  useEffect(() => {
    if (twilioData) {
      setTwilioConfig({
        accountSid: twilioData.accountSid || '',
        authToken: twilioData.authTokenConfigured ? '********' : '',
        fromNumber: twilioData.fromNumber || ''
      });
    }
  }, [twilioData]);

  const createMutation = useMutation({
    mutationFn: (data: any) => branchService.createBranch(data),
    onSuccess: () => {
      notify.success('Branch Created', 'New clinic branch has been registered.');
      setIsModalOpen(false);
      setNewBranch({ name: '', address: '', whatsAppNumber: '', organizationId: orgId });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: any) => {
      notify.danger('Failed to Create', err.response?.data?.message || 'Error creating branch.');
    }
  });

  const updateBranchMutation = useMutation({
    mutationFn: (data: any) => branchService.updateBranch(data.id, data),
    onSuccess: () => {
      notify.success('Branch Updated', 'Branch details saved successfully.');
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    }
  });

  const saveTwilioMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (payload.authToken === '********') payload.authToken = '';
      return whatsappConfigService.saveConfig(payload);
    },
    onSuccess: () => {
      notify.success('Global Config Saved', 'Twilio credentials updated for the entire organization.');
      setIsGlobalModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['twilioConfig'] });
    }
  });

  const handleSwitchBranch = (id: string, name: string) => {
    setBranch(id);
    notify.success('Context Switched', `You are now managing ${name}. All dashboard metrics are updated.`);
  };

  if (!orgId) return <div className="p-10 text-center color-danger">Organization ID missing. Please re-login.</div>;

  if (isLoading) return (
    <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Building2 size={60} color="var(--accent-color)" className="animate-pulse" />
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', letterSpacing: '1px' }}>FETCHING BRANCHES...</p>
    </div>
  );

  if (isError) return (
    <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Activity size={60} color="var(--danger)" />
      <p style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>ERROR LOADING BRANCHES</p>
      <p style={{ color: 'var(--text-secondary)' }}>{(error as any)?.message || 'Something went wrong.'}</p>
      <button 
        style={{ 
          padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' 
        }} 
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onClick={() => queryClient.invalidateQueries({ queryKey: ['branches'] })}
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }} className="flex-mobile-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            <Building2 size={28} />
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
              Clinic Branches
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage multiple locations and switch context to see localized analytics.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }} className="flex-mobile-column full-width-mobile">
          <button 
            onClick={() => setIsGlobalModalOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '10px', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <Settings size={18} color="var(--accent-color)" /> Global Settings
          </button>
          
          <button 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '10px', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <Download size={18} /> Export Data
          </button>

          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }} className="hide-mobile"></div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
              borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 15px var(--accent-glow)'
            }}
          >
            <Plus size={20} /> Add New Branch
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '25px' }}>
        {branches?.map((branch: any) => {
          const isActiveSession = branch.id === branchId;
          return (
            <div key={branch.id} className="glass-card" style={{ 
              padding: '30px', 
              position: 'relative',
              border: isActiveSession ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.05)',
              background: isActiveSession ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)',
              boxShadow: isActiveSession ? '0 0 30px rgba(56, 189, 248, 0.1)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {isActiveSession && (
                <div style={{ 
                  position: 'absolute', top: '-12px', right: '25px', 
                  background: 'var(--accent-color)', color: 'black', 
                  fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', 
                  borderRadius: '20px', letterSpacing: '1px', boxShadow: '0 5px 15px rgba(56, 189, 248, 0.3)'
                }}>
                  ACTIVE CONTEXT
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '25px' }}>
                <div style={{ 
                  width: '50px', height: '50px', 
                  background: isActiveSession ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)', 
                  borderRadius: '15px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: isActiveSession ? 'var(--accent-color)' : 'var(--text-secondary)' 
                }}>
                  <Building2 size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{branch.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: branch.isActive ? 'var(--success)' : 'var(--danger)' }}></div>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                       {branch.isActive ? 'Online' : 'Offline'}
                     </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  <MapPin size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-color)' }} /> 
                  {branch.address || 'No address provided'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Smartphone size={18} style={{ color: '#25D366' }} /> 
                  {branch.whatsAppNumber || 'Not configured'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                 {!isActiveSession ? (
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1.5, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={() => handleSwitchBranch(branch.id, branch.name)}
                    >
                       <ArrowRight size={18} /> Manage This Branch
                    </button>
                 ) : (
                   <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-color)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Activity size={16} /> Currently Managing
                   </div>
                 )}
                 <button 
                   style={{ 
                     width: '50px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: '10px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', height: '40px'
                   }}
                   onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                   onClick={() => { setSelectedBranch(branch); setIsConfigModalOpen(true); }}
                   title="Settings"
                 >
                    <Settings size={20} />
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register New Branch Modal */}
      {isModalOpen && (
        <Modal title="Register New Branch" onClose={() => setIsModalOpen(false)} icon={<Building2 color="var(--accent-color)" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label>Branch Name</label>
              <input 
                type="text" 
                placeholder="e.g. South Extension Clinic" 
                value={newBranch.name}
                onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Address</label>
              <textarea 
                rows={3}
                placeholder="Enter complete physical address"
                value={newBranch.address}
                onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', padding: '12px' }}
              />
            </div>
            <div className="input-group">
              <label>WhatsApp Number</label>
              <input 
                type="tel" 
                placeholder="919876543210" 
                value={newBranch.whatsAppNumber}
                onChange={(e) => setNewBranch({...newBranch, whatsAppNumber: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button 
                style={{ 
                  flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }} 
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} /> Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={!newBranch.name || createMutation.isPending}
                onClick={() => createMutation.mutate(newBranch)}
              >
                {createMutation.isPending ? 'Registering...' : <><Plus size={20} /> Register Branch</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Branch Configuration Modal (Localized) */}
      {isConfigModalOpen && selectedBranch && (
        <Modal 
          title={`${selectedBranch.name} Settings`} 
          onClose={() => setIsConfigModalOpen(false)} 
          icon={<Settings color="var(--accent-color)" />}
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label>Branch Name</label>
                <input 
                  type="text" 
                  value={selectedBranch.name}
                  onChange={(e) => setSelectedBranch({...selectedBranch, name: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Address</label>
                <textarea 
                  rows={4}
                  value={selectedBranch.address}
                  onChange={(e) => setSelectedBranch({...selectedBranch, address: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', padding: '12px' }}
                />
              </div>
              <div className="input-group">
                <label>Localized WhatsApp Number</label>
                <input 
                  type="tel" 
                  value={selectedBranch.whatsAppNumber}
                  onChange={(e) => setSelectedBranch({...selectedBranch, whatsAppNumber: e.target.value})}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Used for this branch's specific booking bot alerts.</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px' }}>
                <div>
                   <p style={{ margin: 0, fontWeight: 600 }}>Active Status</p>
                   <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allow bookings for this branch</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={selectedBranch.isActive}
                  onChange={(e) => setSelectedBranch({...selectedBranch, isActive: e.target.checked})}
                  style={{ width: '20px', height: '20px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button 
                  style={{ 
                    flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }} 
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onClick={() => setIsConfigModalOpen(false)}
                >
                  <X size={18} /> Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => updateBranchMutation.mutate(selectedBranch)}
                  disabled={updateBranchMutation.isPending}
                >
                  {updateBranchMutation.isPending ? 'Saving...' : <><CheckCircle2 size={18} /> Save Changes</>}
                </button>
              </div>
          </div>
        </Modal>
      )}

      {/* Global Settings Modal (Twilio) */}
      {isGlobalModalOpen && (
        <Modal 
          title="Organization Global Settings" 
          onClose={() => setIsGlobalModalOpen(false)} 
          icon={<Shield color="#25D366" />}
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '15px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.1)', marginBottom: '10px' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} /> Global Twilio Configuration
                 </p>
                 <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    These credentials are used by all clinic branches to send automated WhatsApp notifications.
                 </p>
              </div>
              
              <div className="input-group">
                <label>Account SID</label>
                <input 
                  type="text" 
                  value={twilioConfig.accountSid}
                  onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})}
                  placeholder="ACXXXXXXXXXXXXXXXX"
                />
              </div>
              <div className="input-group">
                <label>Auth Token</label>
                <input 
                  type="password" 
                  value={twilioConfig.authToken}
                  onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})}
                  placeholder="••••••••••••••••"
                />
              </div>
              <div className="input-group">
                <label>Master Outbound Number</label>
                <input 
                  type="text" 
                  value={twilioConfig.fromNumber}
                  onChange={(e) => setTwilioConfig({...twilioConfig, fromNumber: e.target.value})}
                  placeholder="whatsapp:+1415..."
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button 
                  style={{ 
                    flex: 1, 
                    background: 'rgba(56, 189, 248, 0.05)', 
                    color: 'var(--accent-color)', 
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                  onClick={async () => {
                     try {
                       const res = await whatsappConfigService.testConnection(twilioConfig);
                       if (res.connected) notify.success('Twilio OK', 'Connection successful!');
                       else notify.danger('Twilio Error', 'Could not authenticate.');
                     } catch { notify.danger('Error', 'Test request failed.'); }
                  }}
                >
                   <Link size={16} /> Test Connection
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => saveTwilioMutation.mutate(twilioConfig)}
                >
                   <Save size={18} /> Update Credentials
                </button>
              </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BranchesPage;

