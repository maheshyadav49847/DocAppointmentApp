import React, { useState } from 'react';
import { X, PlusCircle, User, Smartphone } from 'lucide-react';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string }) => void;
}

const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{name?: string, phone?: string}>({});

  const validate = () => {
    const newErrors: {name?: string, phone?: string} = {};
    if (name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";
    if (!/^\d{10,15}$/.test(phone)) newErrors.phone = "Enter a valid 10-15 digit phone number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ name, phone });
      setName('');
      setPhone('');
      setErrors({});
    }
  };

  if (!isOpen) return null;

  const isValid = name.trim().length >= 2 && phone.length >= 10;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px', margin: '0 20px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '10px' }}>Manual Token Entry</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>Enter patient details to generate a token.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label data-tooltip="Full name of the patient for token identification" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <User size={16} /> Patient Name
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => { setName(e.target.value); if(errors.name) validate(); }}
              placeholder="e.g. John Doe"
              style={{ borderColor: errors.name ? 'var(--danger)' : undefined }}
            />
            {errors.name && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px', fontWeight: 600 }}>{errors.name}</p>}
          </div>
          <div>
            <label data-tooltip="WhatsApp number to send token and queue updates" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <Smartphone size={16} /> WhatsApp Number
            </label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => { 
                const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                setPhone(val);
                if(errors.phone) validate();
              }}
              placeholder="e.g. 9876543210"
              style={{ borderColor: errors.phone ? 'var(--danger)' : undefined }}
            />
            {errors.phone && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '5px', fontWeight: 600 }}>{errors.phone}</p>}
          </div>
          <button 
            data-tooltip="Submit and generate patient token"
            onClick={handleSubmit}
            disabled={!isValid}
            className="btn-primary" 
            style={{ 
              width: '100%', marginTop: '10px', 
              opacity: isValid ? 1 : 0.5, 
              cursor: isValid ? 'pointer' : 'not-allowed',
              background: isValid ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'
            }}
          >
            <PlusCircle size={18} /> Generate Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualBookingModal;
