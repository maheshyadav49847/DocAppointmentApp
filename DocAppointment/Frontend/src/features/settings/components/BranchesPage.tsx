import React, { useState, useEffect } from 'react';
import './BranchesPage.css';
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
    <div className="branch-style-67">
      <Building2 size={60} color="var(--accent-color)" className="animate-pulse" />
      <p className="branch-style-68">FETCHING BRANCHES...</p>
    </div>
  );

  if (isError) return (
    <div className="branch-style-69">
      <Activity size={60} color="var(--danger)" />
      <p className="branch-style-70">ERROR LOADING BRANCHES</p>
      <p className="branch-style-71">{(error as any)?.message || 'Something went wrong.'}</p>
      <button
        className="branch-style-72"
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onClick={() => queryClient.invalidateQueries({ queryKey: ['branches'] })}
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="branch-style-73">
      <PageHeader
        title="Hospital"
        accentTitle="Branches"
        subtitle="Manage multiple locations and switch context to see localized analytics."
        icon={<Building2 />}
      />

      <div className="glass-card branch-style-74">
        {/* Action Row */}
        <div className="branch-style-75 flex-mobile-column full-width-mobile">
          <button
            data-tooltip="Register a new hospital location"
            onClick={() => setIsModalOpen(true)}
            className="btn-outline-primary branch-style-76"
          >
            <Plus size={20} /> Add New Branch
          </button>
        </div>

        <div className="branch-style-77" />

        <div className="branch-style-78">
          {branches?.map((branch: any) => {
            const isActiveSession = branch.id === branchId;
            return (
              <div key={branch.id} className={`glass-card branch-card ${isActiveSession ? 'active' : ''}`}>
                {isActiveSession && (
                  <div className="branch-style-79">
                    ACTIVE CONTEXT
                  </div>
                )}

                <div className="branch-style-80">
                  <div
                    data-tooltip="Hospital Branch Identity"
                    className={`branch-icon-box ${isActiveSession ? 'active' : ''}`}>
                    <Building2 size={28} />
                  </div>
                  <div className="branch-style-81">
                    <h3 className="branch-style-82">{branch.name}</h3>
                    <div
                      data-tooltip={branch.isActive ? "Accepting bookings" : "Bookings disabled"}
                      className="branch-style-83">
                      <div className={`status-indicator ${branch.isActive ? 'active' : 'inactive'}`}></div>
                      <span className="branch-style-84">
                        {branch.isActive ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="branch-style-85">
                  <div className="branch-style-86">
                    <div data-tooltip="Hospital Address" className="tooltip-right branch-style-87">
                      <MapPin size={18} className="branch-style-88" />
                    </div>
                    {branch.address || 'No address provided'}
                  </div>
                  <div className="branch-style-89">
                    <div data-tooltip="WhatsApp Contact" className="tooltip-right branch-style-90">
                      <Smartphone size={18} className="branch-style-91" />
                    </div>
                    {branch.whatsAppNumber || 'Not configured'}
                  </div>
                </div>

                <div className="branch-style-92">
                  {!isActiveSession ? (
                    <button
                      className="btn-primary branch-style-93"
                      onClick={() => handleSwitchBranch(branch.id, branch.name)}
                    >
                      <ArrowRight size={18} /> Manage This Branch
                    </button>
                  ) : (
                    <div className="branch-style-94">
                      <Activity size={16} /> Currently Managing
                    </div>
                  )}
                  <button
                    data-tooltip="Configure Branch"
                    className="branch-style-95"
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    onClick={() => { setSelectedBranch(branch); setIsConfigModalOpen(true); }}
                  >
                    <Settings size={20} />
                  </button>
                  {(['orgadmin', 'superadmin'].includes(role?.toLowerCase().replace(/\s/g, '') || '')) && (
                    <button
                      data-tooltip="Delete Branch"
                      className="branch-style-96"
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
          <div className="branch-style-97">
            <div className="input-group">
              <label data-tooltip="Enter the official name of the hospital branch" className="branch-style-98">
                <Building2 size={16} color="var(--accent-color)" /> Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. South Extension Hospital"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Full physical address for patient navigation" className="branch-style-99">
                <MapPin size={16} color="#f43f5e" /> Address
              </label>
              <textarea
                rows={3}
                placeholder="Enter complete physical address"
                value={newBranch.address}
                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                className="branch-style-100"
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Number used for automated WhatsApp notifications (with country code)" className="branch-style-101">
                <Smartphone size={16} color="#22c55e" /> WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="9198765a43210"
                value={newBranch.whatsAppNumber}
                onChange={(e) => setNewBranch({ ...newBranch, whatsAppNumber: e.target.value })}
              />
            </div>

            <div className="branch-style-102">
              <button
                data-tooltip="Discard changes and return"
                className="btn-cancel"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} color="#f43f5e" /> Cancel
              </button>
              <button
                data-tooltip="Launch this new hospital branch"
                className="btn-outline-primary branch-style-102"
                disabled={!newBranch.name || createMutation.isPending}
                onClick={() => createMutation.mutate(newBranch)}
              >
                <CheckCircle2 size={18} color="var(--accent-color)" /> {createMutation.isPending ? 'Registering...' : 'Register Branch'}
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
          <div className="branch-style-105">
            <div className="input-group">
              <label className="branch-style-106">
                <Building2 size={16} color="var(--accent-color)" /> Branch Name
              </label>
              <input
                type="text"
                value={selectedBranch.name}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="branch-style-107">
                <MapPin size={16} color="#f43f5e" /> Address
              </label>
              <textarea
                rows={4}
                value={selectedBranch.address}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, address: e.target.value })}
                className="branch-style-108"
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Specific WhatsApp number for this branch alerts" className="branch-style-109">
                <Smartphone size={16} color="#22c55e" /> Localized WhatsApp Number
              </label>
              <input
                type="tel"
                value={selectedBranch.whatsAppNumber}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, whatsAppNumber: e.target.value })}
              />
              <p className="branch-style-110">Used for this branch's specific booking bot alerts.</p>
            </div>
            <div className="branch-style-111">
              <div>
                <p className="branch-style-112">Active Status</p>
                <p className="branch-style-113">Allow bookings for this branch</p>
              </div>
              <input
                type="checkbox"
                checked={selectedBranch.isActive}
                onChange={(e) => setSelectedBranch({ ...selectedBranch, isActive: e.target.checked })}
                className="branch-style-114"
              />
            </div>
            <div className="branch-style-115">
              <button
                data-tooltip="Discard changes and return"
                className="btn-cancel"
                onClick={() => setIsConfigModalOpen(false)}
              >
                <X size={18} color="#f43f5e" /> Cancel
              </button>
              <button
                data-tooltip="Save changes for this location"
                className="btn-outline-primary"
                onClick={() => updateBranchMutation.mutate(selectedBranch)}
                disabled={updateBranchMutation.isPending}
              >
                <Save size={18} color="var(--accent-color)" /> {updateBranchMutation.isPending ? 'Saving...' : 'Save Changes'}
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
          <div className="branch-style-118">
            <div className="branch-style-119">
              <p className="branch-style-120">
                <Info size={16} color="#0ea5e9" /> Global Twilio Configuration
              </p>
              <p className="branch-style-121">
                These credentials are used by all hospital branches to send automated WhatsApp notifications.
              </p>
            </div>

            <div className="input-group">
              <label data-tooltip="Twilio Unique Identifier from your Console" className="branch-style-122">
                <Shield size={16} color="#8b5cf6" /> Account SID
              </label>
              <input
                type="text"
                value={twilioConfig.accountSid}
                onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
                placeholder="ACXXXXXXXXXXXXXXXX"
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Twilio Private Authentication Token" className="branch-style-123">
                <Lock size={16} color="#f59e0b" /> Auth Token
              </label>
              <input
                type="password"
                value={twilioConfig.authToken}
                onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>
            <div className="input-group">
              <label data-tooltip="Twilio sandbox or verified number (e.g. whatsapp:+123...)" className="branch-style-124">
                <Link size={16} color="#22c55e" /> Master Outbound Number
              </label>
              <input
                type="text"
                value={twilioConfig.fromNumber}
                onChange={(e) => setTwilioConfig({ ...twilioConfig, fromNumber: e.target.value })}
                placeholder="whatsapp:+1415..."
              />
            </div>

            <div className="branch-style-125">
              <button
                data-tooltip="Verify global Twilio credentials"
                className="btn-cancel"
                onClick={async () => {
                  try {
                    const res = await whatsappConfigService.testConnection(twilioConfig);
                    if (res.connected) notify.success('Twilio OK', 'Connection successful!');
                    else notify.danger('Twilio Error', 'Could not authenticate.');
                  } catch { notify.danger('Error', 'Test request failed.'); }
                }}
              >
                <Link size={16} color="#0ea5e9" /> Test Connection
              </button>
              <button
                className="btn-outline-primary branch-style-127"
                onClick={() => saveTwilioMutation.mutate(twilioConfig)}
                disabled={saveTwilioMutation.isPending}
              >
                <Save size={18} color="var(--accent-color)" /> {saveTwilioMutation.isPending ? 'Updating...' : 'Update Credentials'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBranchId && (
        <Modal title="Confirm Deletion" onClose={() => setDeletingBranchId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div className="branch-style-128">
            <div className="branch-style-129">
              <AlertTriangle size={30} color="var(--danger)" />
            </div>
            <p className="branch-style-130">Are you sure you want to remove this branch? All associated sessions and staff access will be affected. This is a soft delete.</p>
            <div className="branch-style-131">
              <button onClick={() => setDeletingBranchId(null)} className="btn-cancel"><X size={16} color="#f43f5e" /> No, Keep</button>
              <button
                onClick={confirmDeleteBranch}
                className="btn-primary branch-style-132"
              >
                <Trash2 size={18} color="#fff" /> {deleteBranchMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BranchesPage;

