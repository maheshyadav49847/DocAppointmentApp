import React, { useState } from 'react';
import { X, PlusCircle, User, Smartphone } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import './ManualBookingModal.css';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string }) => void;
  isLoading?: boolean;
}

const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState(searchParams.get('name') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
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
    <div className="modal-overlay">
      <div className="modal-card modal-content-card">
        <button onClick={onClose} className="modal-close-btn">
          <X size={24} />
        </button>

        <h2 className="modal-title">Manual Token Entry</h2>
        <p className="modal-subtitle">Enter patient details to generate a token.</p>

        <div className="modal-form-group">
          <div>
            <label data-tooltip="Full name of the patient for token identification" className="modal-label">
              <User size={16} /> Patient Name
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => { setName(e.target.value); if(errors.name) validate(); }}
              placeholder="e.g. John Doe"
              className={errors.name ? "input-error" : ""}
            />
            {errors.name && <p className="modal-error-text">{errors.name}</p>}
          </div>
          <div>
            <label data-tooltip="WhatsApp number to send token and queue updates" className="modal-label">
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
              className={errors.phone ? "input-error" : ""}
            />
            {errors.phone && <p className="modal-error-text">{errors.phone}</p>}
          </div>
          <button 
            data-tooltip="Submit and generate patient token"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="btn-primary modal-submit-btn" 
          >
            {isLoading ? (
              <>
                <div className="animate-spin modal-spinner"></div>
                Processing...
              </>
            ) : (
              <>
                <PlusCircle size={18} /> Generate Token
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualBookingModal;

