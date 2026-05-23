import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { branchService } from '../../../services/branchService';
import { whatsappConfigService } from '../../../services/whatsappConfigService';
import { notify } from '../../../stores/notificationStore';
import {
  Building2, MapPin, Smartphone, Plus, Settings, Trash2,
  Activity, Info, Shield, Link, ArrowRight, Save, X, CheckCircle2, Lock, AlertTriangle
} from 'lucide-react';
import Modal from '../../../components/Modal';
import PageHeader from '../../../components/UI/PageHeader';

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  padding: '10px 20px',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.9rem',
  fontWeight: 600,
  transition: 'all 0.2s'
};

const BranchesPage: React.FC = () => {
  const { orgId, branchId, setBranch, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

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
    queryFn: whatsappConfigService.getConfig,
    enabled: !!orgId && (['orgadmin', 'superadmin'].includes(role?.toLowerCase().replace(/\s/g, '') || ''))
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
      notify.success('Branch Created', 'New hospital branch has been registered.');
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

  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => branchService.deleteBranch(id),
    onSuccess: () => {
      notify.warning('Branch Deleted', 'The hospital location has been removed.');
      setDeletingBranchId(null);
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    }
  });

  const confirmDeleteBranch = () => {
    if (deletingBranchId) {
      deleteBranchMutation.mutate(deletingBranchId);
    }
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', animation: 'fadeIn 0.5s ease-out' }}>
      <PageHeader
        title="Hospital"
        accentTitle="Branches"
        subtitle="Manage multiple locations and switch context to see localized analytics."
        icon={<Building2 />}
      />

      <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '35px' }}>
        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }} className="flex-mobile-column full-width-mobile">
            <button
              data-tooltip="Register a new hospital location"
              onClick={() => setIsModalOpen(true)}
              className="btn-outline-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 15px var(--accent-glow)'
              }}
            >
              <Plus size={20} /> Add New Branch
            </button>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '25px' }}>
          {branches?.map((branch: any) => {
            const isActiveSession = branch.id === branchId;
            return (
              <div key={branch.id} className="glass-card" style={{
                padding: '30px',
                position: 'relative',
                border: isActiveSession ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.05)',
                background: isActiveSession ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.02)',
                boxShadow: isActiveSession ? '0 0 15px var(--accent-glow)' : 'none',
                transition: 'all 0.3s ease',
                zIndex: isActiveSession ? 2 : 1
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
                  <div
                    data-tooltip="Hospital Branch Identity"
                    style={{
                      width: '50px', height: '50px',
                      background: isActiveSession ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '15px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: isActiveSession ? 'var(--accent-color)' : 'var(--text-secondary)'
                    }}>
                    <Building2 size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{branch.name}</h3>
                    <div
                      data-tooltip={branch.isActive ? "Accepting bookings" : "Bookings disabled"}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: branch.isActive ? 'var(--success)' : 'var(--danger)' }}></div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {branch.isActive ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <div data-tooltip="Hospital Address" className="tooltip-right" style={{ display: 'flex', alignItems: 'center' }}>
                      <MapPin size={18} style={{ flexShrink: 0, color: 'var(--accent-color)' }} />
                    </div>
                    {branch.address || 'No address provided'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <div data-tooltip="WhatsApp Contact" className="tooltip-right" style={{ display: 'flex', alignItems: 'center' }}>
                      <Smartphone size={18} style={{ color: '#25D366' }} />
                    </div>
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
                    data-tooltip="Configure Branch"
                    style={{
                      width: '50px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', height: '40px'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    onClick={() => { setSelectedBranch(branch); setIsConfigModalOpen(true); }}
                  >
                    <Settings size={20} />
                  </button>
                  {(['orgadmin', 'superadmin'].includes(role?.toLowerCase().replace(/\s/g, '') || '')) && (
                    <button
                      data-tooltip="Delete Branch"
                      style={{
                        width: '50px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)',
                        borderRadius: '10px', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', transition: 'all 0.2s', height: '40px'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)'; }}
                      onClick={() => setDeletingBranchId(branch.id)}
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Register New Branch Modal */}
      {isModalOpen && (
        <Modal title="Register New Branch" onClose={() => setIsModalOpen(false)} icon={<Building2 color="var(--accent-color)" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label data-tooltip="Enter the official name of the hospital branch" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Building2 size={16} /> Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. South Extension Hospital"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Full physical address for patient navigation" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <MapPin size={16} /> Address
              </label>
              <textarea
                rows={3}
                placeholder="Enter complete physical address"
                value={newBranch.address}
                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', padding: '12px' }}
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Number used for automated WhatsApp notifications (with country code)" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Smartphone size={16} /> WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="919876543210"
                value={newBranch.whatsAppNumber}
                onChange={(e) => setNewBranch({ ...newBranch, whatsAppNumber: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button
                data-tooltip="Discard changes and return"
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
                data-tooltip="Launch this new hospital branch"
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Building2 size={16} /> Branch Name
              </label>
              <input
                type="text"
                value={selectedBranch.name}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <MapPin size={16} /> Address
              </label>
              <textarea
                rows={4}
                value={selectedBranch.address}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, address: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', padding: '12px' }}
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Specific WhatsApp number for this branch alerts" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Smartphone size={16} /> Localized WhatsApp Number
              </label>
              <input
                type="tel"
                value={selectedBranch.whatsAppNumber}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, whatsAppNumber: e.target.value })}
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
                onChange={(e) => setSelectedBranch({ ...selectedBranch, isActive: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button
                data-tooltip="Discard changes and return"
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
                data-tooltip="Save changes for this location"
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
                These credentials are used by all hospital branches to send automated WhatsApp notifications.
              </p>
            </div>

            <div className="input-group">
              <label data-tooltip="Twilio Unique Identifier from your Console" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Shield size={16} /> Account SID
              </label>
              <input
                type="text"
                value={twilioConfig.accountSid}
                onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
                placeholder="ACXXXXXXXXXXXXXXXX"
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Twilio Private Authentication Token" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Lock size={16} /> Auth Token
              </label>
              <input
                type="password"
                value={twilioConfig.authToken}
                onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Twilio sandbox or verified number (e.g. whatsapp:+123...)" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Link size={16} /> Master Outbound Number
              </label>
              <input
                type="text"
                value={twilioConfig.fromNumber}
                onChange={(e) => setTwilioConfig({ ...twilioConfig, fromNumber: e.target.value })}
                placeholder="whatsapp:+1415..."
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button
                data-tooltip="Verify global Twilio credentials"
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

      {/* Delete Confirmation Modal */}
      {deletingBranchId && (
        <Modal title="Confirm Deletion" onClose={() => setDeletingBranchId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={30} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px' }}>Are you sure you want to remove this branch? All associated sessions and staff access will be affected. This is a soft delete.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setDeletingBranchId(null)} style={cancelButtonStyle}><X size={16} /> No, Keep</button>
              <button
                onClick={confirmDeleteBranch}
                className="btn-primary"
                style={{ flex: 1, background: 'var(--danger)', border: '1px solid var(--danger)' }}
              >
                <Trash2 size={18} /> {deleteBranchMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BranchesPage;

