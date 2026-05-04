import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import api from '../../../services/api';
import { whatsappConfigService } from '../../../services/whatsappConfigService';
import { notify } from '../../../stores/notificationStore';
import { Settings, Smartphone, MessageSquare, Shield, Info, CheckCircle2, Key, Link, Building2, MapPin } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { branchId } = useAuthStore();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const res = await api.get(`/branches/${branchId}`);
      return res.data;
    },
    enabled: !!branchId
  });

  const { data: twilioData, isLoading: isLoadingTwilio } = useQuery({
    queryKey: ['twilioConfig'],
    queryFn: whatsappConfigService.getConfig
  });

  const [settings, setSettings] = useState({
    name: '',
    address: '',
    whatsAppNumber: '',
    isActive: true
  });

  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: ''
  });

  const [isTestingTwilio, setIsTestingTwilio] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Sync settings when data loads
  React.useEffect(() => {
    if (branch) {
      setSettings({
        name: branch.name,
        address: branch.address,
        whatsAppNumber: branch.whatsAppNumber,
        isActive: branch.isActive
      });
    }
  }, [branch]);

  React.useEffect(() => {
    if (twilioData) {
      setTwilioConfig({
        accountSid: twilioData.accountSid || '',
        authToken: twilioData.authTokenConfigured ? '********' : '', // Placeholder to show it's set
        fromNumber: twilioData.fromNumber || ''
      });
      setTwilioStatus(twilioData.isConfigured ? 'success' : 'idle');
    }
  }, [twilioData]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.put(`/branches/${branchId}`, data.branchSettings);
      
      // Only send AuthToken if it was changed (not the placeholder)
      const twilioPayload = { ...data.twilioConfig };
      if (twilioPayload.authToken === '********') {
         twilioPayload.authToken = ''; // Backend will ignore empty auth token and keep existing
      }
      await whatsappConfigService.saveConfig(twilioPayload);
    },
    onSuccess: () => {
      setSuccess(true);
      notify.success('Settings Saved', 'Branch and WhatsApp configurations updated successfully.');
      setTimeout(() => setSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['branch'] });
      queryClient.invalidateQueries({ queryKey: ['twilioConfig'] });
    },
    onError: (err: any) => {
      notify.danger('Failed to Save', err.message || 'Error saving settings.');
    }
  });

  const handleTestTwilio = async () => {
    setIsTestingTwilio(true);
    setTwilioStatus('testing');
    try {
      // If auth token is masked, it means user didn't change it, and we can't test from frontend easily
      // unless backend test endpoint uses stored config. Our backend test takes explicit params.
      // So test might fail if auth token is masked. Let's send what we have. 
      // If it's masked, let's warn.
      if (twilioConfig.authToken === '********') {
         notify.warning('Please enter actual Auth Token to test', 'Testing requires the unmasked Auth Token.');
         setTwilioStatus('idle');
         setIsTestingTwilio(false);
         return;
      }
      const res = await whatsappConfigService.testConnection(twilioConfig);
      if (res.connected) {
        setTwilioStatus('success');
        notify.success('Twilio Connected', 'Successfully authenticated with Twilio API.');
      } else {
        setTwilioStatus('error');
        notify.danger('Connection Failed', 'Could not connect to Twilio. Check your credentials.');
      }
    } catch (err: any) {
      setTwilioStatus('error');
      notify.danger('Connection Failed', err.message || 'Could not connect to Twilio.');
    } finally {
      setIsTestingTwilio(false);
    }
  };

  if (isLoading || isLoadingTwilio) return <p>Loading settings...</p>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }} className="flex-mobile-column">
        <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
          <Settings size={28} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800 }}>Branch Settings</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Configure your hospital branch identity and communication channels.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* General Info */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Info size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0 }}>General Information</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label data-tooltip="The official name of this hospital branch" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Building2 size={16} /> Hospital Branch Name
              </label>
              <input 
                type="text" 
                value={settings.name} 
                onChange={(e) => setSettings({...settings, name: e.target.value})}
              />
            </div>
            <div>
              <label data-tooltip="Modify the physical location details for patients" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <MapPin size={16} /> Physical Address
              </label>
              <textarea 
                rows={3} 
                value={settings.address} 
                onChange={(e) => setSettings({...settings, address: e.target.value})}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', padding: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Config */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={20} color="#25D366" />
              <h3 style={{ margin: 0 }}>Twilio WhatsApp Integration</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               {twilioStatus === 'success' && <span style={{ fontSize: '0.8rem', color: '#25D366', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}><div className="live-dot" style={{ width: '6px', height: '6px' }}></div> Connected</span>}
               {twilioStatus === 'error' && <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Error</span>}
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Configure your Twilio credentials to enable automated WhatsApp notifications.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label data-tooltip="Your unique Twilio Account SID" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Key size={16} /> Account SID
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  value={twilioConfig.accountSid} 
                  onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})}
                  style={{ paddingLeft: '40px' }}
                  placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                />
              </div>
            </div>
            
            <div>
              <label data-tooltip="Secure Twilio Authentication Token" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Shield size={16} /> Auth Token
              </label>
              <div style={{ position: 'relative' }}>
                <Shield size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  value={twilioConfig.authToken} 
                  onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})}
                  style={{ paddingLeft: '40px' }}
                  placeholder="Enter Auth Token"
                />
              </div>
            </div>

            <div>
              <label data-tooltip="Twilio sandbox or verified outbound number" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Smartphone size={16} /> Twilio WhatsApp Number
              </label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  value={twilioConfig.fromNumber} 
                  onChange={(e) => setTwilioConfig({...twilioConfig, fromNumber: e.target.value})}
                  style={{ paddingLeft: '40px' }}
                  placeholder="e.g. +14155238886 or whatsapp:+14155238886"
                />
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button 
                data-tooltip="Verify Twilio credentials with a live test"
                className="btn-secondary" 
                onClick={handleTestTwilio} 
                disabled={isTestingTwilio || !twilioConfig.accountSid || !twilioConfig.authToken}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Link size={16} /> 
                {isTestingTwilio ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Shield size={20} color="var(--danger)" />
            <h3 style={{ margin: 0 }}>Security & Access</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>Active Status</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Disable this branch temporarily</p>
            </div>
            <input 
              data-tooltip="Toggle branch visibility and operations"
              type="checkbox" 
              checked={settings.isActive}
              onChange={(e) => setSettings({...settings, isActive: e.target.checked})}
              style={{ width: '40px', height: '20px', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button 
            data-tooltip="Commit all changes to the system"
            onClick={() => updateMutation.mutate({ branchSettings: settings, twilioConfig })} 
            className="btn-primary" 
            disabled={updateMutation.isPending}
          >
            <CheckCircle2 size={18} />
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        
        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            Settings updated successfully!
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
