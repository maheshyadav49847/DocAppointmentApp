import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { 
  Save, Building, MapPin, MessageCircle, Globe, Info, 
  Settings as SettingsIcon, CheckCircle2, UserCircle, Clock 
} from 'lucide-react';

const Settings: React.FC = () => {
  const { branchId } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    whatsAppNumber: '',
    organizationName: ''
  });

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const response = await api.get(`/branches/${branchId}`);
      return response.data;
    },
    enabled: !!branchId
  });

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        address: branch.address,
        whatsAppNumber: branch.whatsAppNumber,
        organizationName: 'City Hospital'
      });
    }
  }, [branch]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/branches/${branchId}`, data),
    onSuccess: () => {
      alert("Settings updated successfully!");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return <p>Loading settings...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ padding: '12px', background: 'var(--accent-glow)', borderRadius: '12px', color: 'var(--accent-color)' }}>
          <SettingsIcon size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '5px' }}>Branch Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your hospital identity and communication channels.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '40px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
            <section>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                <Building size={20} color="var(--accent-color)" /> Hospital Identity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <Info size={16} /> Hospital Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.organizationName}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <UserCircle size={16} /> Branch Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Main Branch" 
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                <Globe size={20} color="var(--accent-color)" /> Communication
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={16} /> Full Address
                  </label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', padding: '12px' }}
                    placeholder="Enter complete branch address..."
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <MessageCircle size={16} /> WhatsApp Business Number
                  </label>
                  <input 
                    type="tel" 
                    value={formData.whatsAppNumber}
                    onChange={(e) => setFormData({...formData, whatsAppNumber: e.target.value})}
                    placeholder="919876543210" 
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Info size={12} /> Include country code without '+' (e.g. 91 for India)
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '30px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 30px' }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Clock size={20} className="animate-spin" /> : <Save size={20} />}
              {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '15px', padding: '25px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', color: 'var(--accent-color)' }}>
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 5px' }}>WhatsApp Integration Active</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Your automated booking bot is linked to the number above. Patients can message "Hi" to this number to start booking appointments.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
