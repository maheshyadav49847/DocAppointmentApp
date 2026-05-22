import React, { useState } from 'react';
import { X, UserPlus, User, Smartphone, MapPin, Calendar, Users, Ruler, Droplet, Activity, PhoneCall } from 'lucide-react';
import Modal from '../../../components/Modal';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string; age: string; gender: string; bloodGroup: string; preExistingConditions: string; height: number | null; email: string; address: string; emergencyContactName: string; emergencyContactPhone: string }) => void;
  isLoading?: boolean;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [preExistingConditions, setPreExistingConditions] = useState('');
  const [height, setHeight] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  
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
      onSubmit({ name, phone, age, gender, bloodGroup, preExistingConditions, height: height ? parseFloat(height) : null, email, address, emergencyContactName, emergencyContactPhone });
    }
  };

  if (!isOpen) return null;

  const isValid = name.trim().length >= 2 && phone.length >= 10;

  return (
    <Modal title="Add New Patient" icon={<UserPlus size={20} color="var(--accent-color)" />}
      onClose={onClose} maxWidth="540px">
      <div className="modal-body">
        <p className="color-var-text-secondary-fs-0-9">
          Register a new patient into the system.
        </p>

        <div className="form-group">
          <label className="form-label flex-items-center">
            <User size={14} className="mr-1-5 icon-blue" /> Full Name <span className="color-var-danger">*</span>
          </label>
          <input 
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            type="text" 
            placeholder="e.g. John Doe"
            value={name} 
            onChange={(e) => { setName(e.target.value); if(errors.name) validate(); }}
          />
          {errors.name && <p className="color-var-danger-fs-0-75-mt-5">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label className="form-label flex-items-center">
            <Smartphone size={14} className="mr-1-5 icon-green" /> WhatsApp Number <span className="color-var-danger">*</span>
          </label>
          <input 
            className={`form-input ${errors.phone ? 'input-error' : ''}`}
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 15);
              setPhone(val);
              if(errors.phone) validate();
            }}
          />
          {errors.phone && <p className="color-var-danger-fs-0-75-mt-5">{errors.phone}</p>}
        </div>

        <div className="form-group">
          <label className="form-label flex-items-center">
            <MapPin size={14} className="mr-1-5 icon-violet" /> Address
          </label>
          <input className="form-input" type="text" placeholder="Full address" value={address} onChange={e => setAddress(e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label flex-items-center">
              <Calendar size={14} className="mr-1-5 icon-yellow" /> Age
            </label>
            <input className="form-input" type="number" min="0" placeholder="e.g. 34" value={age} onChange={e => setAge(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label flex-items-center">
              <Users size={14} className="mr-1-5 icon-pink-dark" /> Gender
            </label>
            <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label flex-items-center">
              <Ruler size={14} className="mr-1-5 icon-indigo" /> Height (cm)
            </label>
            <input className="form-input" type="number" min="0" placeholder="e.g. 175" value={height} onChange={e => setHeight(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label flex-items-center">
              <Droplet size={14} className="mr-1-5 icon-red" /> Blood Group
            </label>
            <select className="form-select" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label flex-items-center">
              <PhoneCall size={14} className="mr-1-5 icon-rose" /> Emg. Contact Name
            </label>
            <input className="form-input" type="text" placeholder="e.g. Jane Doe" value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label flex-items-center">
              <PhoneCall size={14} className="mr-1-5 icon-rose" /> Emg. Contact Phone
            </label>
            <input className="form-input" type="tel" placeholder="e.g. 9876543210" value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label flex-items-center">
            <Activity size={14} className="mr-1-5 icon-orange" /> Pre-existing Diseases (comma-separated)
          </label>
          <input type="text" className="form-input" placeholder="e.g. Diabetes, Hypertension" value={preExistingConditions} onChange={e => setPreExistingConditions(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}><X size={14} className="mr-1" /> Cancel</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? <span className="spinner-sm" /> : <UserPlus size={14} />}
            {isLoading ? 'Saving...' : 'Add Patient'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddPatientModal;
