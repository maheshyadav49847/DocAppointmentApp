import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Phone, Calendar as CalendarIcon, UserPlus, MessageSquare,
  History, CalendarPlus, Send, X, ArrowLeft, Building2, Edit, Check,
  Trash2, Download, Plus, FileText, Bell, BellOff, CheckCircle, ClipboardList,
  Droplets, HeartPulse, Upload, ChevronRight, Activity, Save, Edit2, ArrowRight, Stethoscope, Clock, User, Hash, Ruler, MapPin, PhoneCall
} from 'lucide-react';
import PageHeader from '../../../components/UI/PageHeader';
import Modal from '../../../components/Modal';
import { useAuthStore } from '../../../stores/authStore';
import { branchService } from '../../../services/branchService';
import { notify } from '../../../stores/notificationStore';
import api from '../../../services/api';
import './PatientsList.css';
import AddPatientModal from './AddPatientModal';

interface Medicine { medicineName: string; dosage: string; }

const PatientsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId, branchId: currentBranchId } = useAuthStore();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranchId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Doctor Workspace Tabs (Right Sidebar)
  const [workspaceTab, setWorkspaceTab] = useState<'history' | 'reports' | 'followups'>('history');

  // Modals
  const [messagingPatient, setMessagingPatient] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editPreExistingConditions, setEditPreExistingConditions] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editEmergencyContactName, setEditEmergencyContactName] = useState('');
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingPatient, setIsAddingPatient] = useState(false);

  // Active Consultation State (Doctor's Main View)
  const [visitDoctorId, setVisitDoctorId] = useState('');
  const [visitSymptoms, setVisitSymptoms] = useState('');
  const [visitDiagnosis, setVisitDiagnosis] = useState('');
  const [visitAdvice, setVisitAdvice] = useState('');
  const [visitInternalNotes, setVisitInternalNotes] = useState('');
  const [visitFollowUpDate, setVisitFollowUpDate] = useState('');
  const [visitFollowUpInstructions, setVisitFollowUpInstructions] = useState('');
  const [visitWeight, setVisitWeight] = useState('');
  const [visitHeartRate, setVisitHeartRate] = useState('');
  const [visitBloodPressure, setVisitBloodPressure] = useState('');
  const [visitOxygenLevel, setVisitOxygenLevel] = useState('');
  const [visitTemperature, setVisitTemperature] = useState('');
  const [visitRespiratoryRate, setVisitRespiratoryRate] = useState('');
  const [visitBloodSugar, setVisitBloodSugar] = useState('');
  const [visitMedicines, setVisitMedicines] = useState<Medicine[]>([]);
  const [visitFiles, setVisitFiles] = useState<{file: File, category: string}[]>([]);
  const [stagingFile, setStagingFile] = useState<File | null>(null);
  const [stagingCategory, setStagingCategory] = useState('Lab Report');
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Lab Report');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);

  useEffect(() => {
    if (currentBranchId) setSelectedBranchId(currentBranchId);
  }, [currentBranchId]);

  useEffect(() => {
    if (selectedPatient && isEditingProfile) {
      setEditName(selectedPatient.name || '');
      setEditPhone(selectedPatient.phone || '');
      setEditEmail(selectedPatient.email || '');
      setEditAddress(selectedPatient.address || '');
      setEditEmergencyContact(selectedPatient.emergencyContact || '');
      setEditAge(selectedPatient.age || '');
      setEditGender(selectedPatient.gender || '');
      setEditBloodGroup(selectedPatient.bloodGroup || '');
      setEditPreExistingConditions(selectedPatient.preExistingConditions || '');
      setEditHeight(selectedPatient.height != null ? selectedPatient.height.toString() : '');
      setEditEmergencyContactName(selectedPatient.emergencyContactName || '');
      setEditEmergencyContactPhone(selectedPatient.emergencyContactPhone || '');
    }
  }, [selectedPatient, isEditingProfile]);

  // Reset consultation form when patient changes
  useEffect(() => {
    setVisitSymptoms('');
    setVisitDiagnosis('');
    setVisitAdvice('');
    setVisitInternalNotes('');
    setVisitFollowUpDate('');
    setVisitFollowUpInstructions('');
    setVisitWeight('');
    setVisitHeartRate('');
    setVisitBloodPressure('');
    setVisitOxygenLevel('');
    setVisitTemperature('');
    setVisitRespiratoryRate('');
    setVisitBloodSugar('');
    setVisitMedicines([]);
    setVisitFiles([]);
  }, [selectedPatient]);

  // Premium UX: Keyboard-First Navigation (Ctrl+Enter to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const btn = document.getElementById('btn-save-consult');
        if (btn && !(btn as HTMLButtonElement).disabled) {
          e.preventDefault();
          btn.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Queries ──────────────────────────────────────────────────────
  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => orgId ? branchService.getBranches(orgId) : Promise.resolve([]),
    enabled: !!orgId,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors', orgId],
    queryFn: async () => { const r = await api.get('/doctors'); return r.data; },
    enabled: !!orgId,
  });

  // Auto-select first doctor if available and none selected
  useEffect(() => {
    if (doctors && doctors.length > 0 && !visitDoctorId) {
      setVisitDoctorId(doctors[0].id);
    }
  }, [doctors, visitDoctorId]);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', selectedBranchId],
    queryFn: async () => {
      const r = await api.get('/patients', {
        params: { branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined },
      });
      return r.data;
    },
  });

  const { data: clinicalVisits, isLoading: isVisitsLoading } = useQuery({
    queryKey: ['clinicalVisits', selectedPatient?.id],
    queryFn: async () => { const r = await api.get(`/patientclinical/${selectedPatient.id}/visits`); return r.data; },
    enabled: !!selectedPatient,
  });

  const { data: attachments, isLoading: isAttachmentsLoading } = useQuery({
    queryKey: ['attachments', selectedPatient?.id],
    queryFn: async () => { const r = await api.get(`/patientclinical/${selectedPatient.id}/attachments`); return r.data; },
    enabled: !!selectedPatient,
  });

  const { data: followups, isLoading: isFollowupsLoading } = useQuery({
    queryKey: ['followups', selectedPatient?.id],
    queryFn: async () => { const r = await api.get(`/patientclinical/${selectedPatient.id}/followups`); return r.data; },
    enabled: !!selectedPatient,
  });

  const filteredPatients = patients?.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery)
  ) || [];

  const getFileBaseUrl = () => (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messagingPatient) return;
    setIsSending(true);
    try {
      await api.post('/whatsapp/bridge/send', {
        branchId: currentBranchId || '', to: messagingPatient.phone, message: messageText,
      });
      notify.success('Sent', `WhatsApp message sent to ${messagingPatient.name}`);
      setMessagingPatient(null); setMessageText('');
    } catch { notify.danger('Failed', 'WhatsApp bridge may be offline.'); }
    finally { setIsSending(false); }
  };

  const handleSaveProfile = async () => {
    if (!selectedPatient) return;
    setIsSavingProfile(true);
    try {
      const r = await api.put(`/patientclinical/${selectedPatient.id}`, {
        name: editName, phone: editPhone, email: editEmail, address: editAddress,
        emergencyContactName: editEmergencyContactName, emergencyContactPhone: editEmergencyContactPhone,
        age: editAge, gender: editGender, bloodGroup: editBloodGroup, preExistingConditions: editPreExistingConditions, height: editHeight ? parseFloat(editHeight) : null
      });
      setSelectedPatient((prev: any) => ({ ...prev, ...r.data }));
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      notify.success('Saved', 'Patient profile updated.');
      setIsEditingProfile(false);
    } catch { notify.danger('Error', 'Failed to update profile.'); }
    finally { setIsSavingProfile(false); }
  };

  const handleAddPatient = async (data: any) => {
    setIsAddingPatient(true);
    try {
      await api.post('/patients', data);
      notify.success('Success', 'Patient added successfully.');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsAddModalOpen(false);
    } catch (err: any) {
      const msg = typeof err?.response?.data === 'string' ? err.response.data : 'Failed to add patient.';
      notify.danger('Error', msg);
    } finally {
      setIsAddingPatient(false);
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !visitDoctorId) { notify.warning('Required', 'Please select a doctor.'); return; }
    setIsSavingVisit(true);
    try {
      let visitId: string;
      const payload = {
        doctorId: visitDoctorId,
        symptoms: visitSymptoms,
        diagnosis: visitDiagnosis,
        advice: visitAdvice,
        internalNotes: visitInternalNotes,
        followUpDate: visitFollowUpDate ? new Date(visitFollowUpDate).toISOString() : null,
        followUpInstructions: visitFollowUpInstructions || null,
        weight: visitWeight ? parseFloat(visitWeight) : null,
        heartRate: visitHeartRate ? parseInt(visitHeartRate, 10) : null,
        bloodPressure: visitBloodPressure || null,
        oxygenLevel: visitOxygenLevel ? parseFloat(visitOxygenLevel) : null,
        temperature: visitTemperature ? parseFloat(visitTemperature) : null,
        respiratoryRate: visitRespiratoryRate ? parseInt(visitRespiratoryRate, 10) : null,
        bloodSugar: visitBloodSugar ? parseFloat(visitBloodSugar) : null,
        medicines: visitMedicines,
      };

      if (editingVisitId) {
        await api.put(`/patientclinical/visits/${editingVisitId}`, payload);
        visitId = editingVisitId;
      } else {
        const res = await api.post(`/patientclinical/${selectedPatient.id}/visits`, payload);
        visitId = res.data.id;
      }
      
      // Upload attached documents for this visit
      if (visitFiles.length > 0) {
        for (const item of visitFiles) {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('category', item.category);
          formData.append('patientVisitId', visitId);
          await api.post(`/patientclinical/${selectedPatient.id}/attachments`, formData);
        }
        queryClient.invalidateQueries({ queryKey: ['attachments', selectedPatient.id] });
      }
      
      if (!editingVisitId && visitFollowUpDate) {
        // Follow-ups are automatically updated by PUT /visits endpoint if editing
        // But for POST, the backend also automatically adds it if we sent followUpDate
        // Actually backend POST adds it automatically. We don't need this extra POST unless we want to force it?
        // Let's remove the redundant POST to followups since the AddPatientVisit API already does it!
      }

      queryClient.invalidateQueries({ queryKey: ['clinicalVisits', selectedPatient.id] });
      queryClient.invalidateQueries({ queryKey: ['followups', selectedPatient.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      notify.success('Saved', 'Consultation notes saved successfully.');
      
      // Clear form
      setVisitSymptoms('');
      setVisitDiagnosis('');
      setVisitAdvice('');
      setVisitInternalNotes('');
      setVisitFollowUpDate('');
      setVisitFollowUpInstructions('');
      setVisitWeight('');
      setVisitHeartRate('');
      setVisitBloodPressure('');
      setVisitOxygenLevel('');
      setVisitTemperature('');
      setVisitRespiratoryRate('');
      setVisitBloodSugar('');
      setVisitMedicines([]);
      setVisitFiles([]);
      setStagingFile(null);
      setStagingCategory('Lab Report');
      setEditingVisitId(null);
      setExistingAttachments([]);
      setWorkspaceTab('history');
    } catch { notify.danger('Error', 'Failed to save consultation.'); }
    finally { setIsSavingVisit(false); }
  };

  const handleEditVisit = (visit: any) => {
    setEditingVisitId(visit.id);
    setVisitDoctorId(visit.doctorId || '');
    setVisitSymptoms(visit.symptoms || '');
    setVisitDiagnosis(visit.diagnosis || '');
    setVisitAdvice(visit.advice || '');
    setVisitInternalNotes(visit.internalNotes || '');
    setVisitFollowUpDate(visit.followUpDate ? visit.followUpDate.substring(0, 10) : '');
    setVisitFollowUpInstructions(visit.followUpInstructions || '');
    setVisitWeight(visit.weight != null ? visit.weight.toString() : '');
    setVisitHeartRate(visit.heartRate != null ? visit.heartRate.toString() : '');
    setVisitBloodPressure(visit.bloodPressure || '');
    setVisitOxygenLevel(visit.oxygenLevel != null ? visit.oxygenLevel.toString() : '');
    setVisitTemperature(visit.temperature != null ? visit.temperature.toString() : '');
    setVisitRespiratoryRate(visit.respiratoryRate != null ? visit.respiratoryRate.toString() : '');
    setVisitBloodSugar(visit.bloodSugar != null ? visit.bloodSugar.toString() : '');
    setVisitMedicines(visit.medicines ? visit.medicines.map((m: any) => ({ medicineName: m.medicineName, dosage: m.dosage })) : []);
    setExistingAttachments(visit.attachments || []);
    setVisitFiles([]);
    setStagingFile(null);
    setStagingCategory('Lab Report');
    
    // Scroll to form
    const formElement = document.querySelector('.consult-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUploadAttachment = async () => {
    if (!selectedPatient || uploadFiles.length === 0) { notify.warning('Required', 'Please select at least one file.'); return; }
    
    // Check sizes
    if (uploadFiles.some(f => f.size > 10 * 1024 * 1024)) {
      notify.warning('Too Large', 'Each file must be under 10MB.');
      return;
    }

    setIsSavingAttachment(true);
    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory);
        await api.post(`/patientclinical/${selectedPatient.id}/attachments`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ['attachments', selectedPatient.id] });
      notify.success('Uploaded', `${uploadFiles.length} file(s) uploaded successfully.`);
      setIsUploadingAttachment(false); setUploadFiles([]);
    } catch (err: any) {
      const msg = err?.response?.data;
      notify.danger('Upload Failed', typeof msg === 'string' ? msg : 'Upload failed.');
    } finally { setIsSavingAttachment(false); }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.delete(`/patientclinical/attachments/${id}`);
      queryClient.invalidateQueries({ queryKey: ['attachments', selectedPatient.id] });
      notify.success('Deleted', 'File deleted.');
    } catch { notify.danger('Error', 'Could not delete file.'); }
  };

  const handleToggleReminder = async (fup: any) => {
    try {
      await api.put(`/patientclinical/followups/${fup.id}`, {
        reminderEnabled: !fup.reminderEnabled, followUpDate: fup.followUpDate,
      });
      queryClient.invalidateQueries({ queryKey: ['followups', selectedPatient.id] });
    } catch { notify.danger('Error', 'Failed to update reminder.'); }
  };

  const formatDate = (d: string, opts?: Intl.DateTimeFormatOptions) =>
    new Date(d).toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });

  const patientCode = selectedPatient
    ? (selectedPatient.patientCode || 'PT-' + selectedPatient.id.substring(0, 6).toUpperCase())
    : '';

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="patients-container">

      {/* Page Header */}
      {!selectedPatient && (
        <PageHeader
          title="Patient"
          accentTitle="Directory"
          subtitle="Manage registered patients and clinical records."
          icon={<Users />}
          rightElement={
            <div className="branch-select-container">
              <label className="branch-select-label"><Building2 size={12} /> Branch</label>
              <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="branch-select">
                <option value="all">All Branches</option>
                {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          }
        />
      )}

      {selectedPatient ? (
        /* ════════════════════════════════════════════════════════
           DOCTOR'S WORKSPACE (EHR PORTAL)
        ════════════════════════════════════════════════════════ */
        <div className="doctor-workspace">

          {/* ── Patient Banner (Compact) ─────────────────────────────────── */}
          <div className="plain-panel flex-items-center-justify-space-between">
            <div className="ehr-banner-left">
              <button className="btn-back-icon" onClick={() => setSelectedPatient(null)} title="Back to Directory">
                <ArrowLeft size={18} />
              </button>
              <div className="ehr-avatar-lg color-f8fafc-fs-1-4-flex-items-center-justify-center">{selectedPatient.name.charAt(0)}</div>
              <div className="ehr-patient-info">
                <div className="ehr-patient-title-row">
                  <h2 className="ehr-patient-name">{selectedPatient.name}</h2>
                  <span className="ehr-code-badge items-center-color-a855f7-fs-0-65">
                    <Hash size={10} /> {patientCode}
                  </span>
                  <button className="btn-icon-ghost" onClick={() => setIsEditingProfile(true)} title="Edit Profile">
                    <Edit size={14} />
                  </button>
                </div>
                <div className="ehr-vitals-inline">
                  <span className="vital-text flex-items-center-color-60a5fa">
                    <User size={12} /> {selectedPatient.gender || 'No Gender'}
                  </span>
                  <span className="vital-dot">•</span>
                  <span className="vital-text flex-items-center-color-34d399">
                    <CalendarIcon size={12} /> {selectedPatient.age > 0 ? `${selectedPatient.age} Yrs` : 'No Age'}
                  </span>
                  {selectedPatient.bloodGroup && (
                    <>
                      <span className="vital-dot">•</span>
                      <span className="vital-text blood-group flex-items-center-color-f87171">
                        <Droplets size={12} /> {selectedPatient.bloodGroup}
                      </span>
                    </>
                  )}
                  {selectedPatient.height && (
                    <>
                      <span className="vital-dot">•</span>
                      <span className="vital-text flex-items-center-color-fbbf24">
                        <Ruler size={12} /> {selectedPatient.height} cm
                      </span>
                    </>
                  )}
                  {selectedPatient.preExistingConditions && selectedPatient.preExistingConditions.split(',').map((t: string) => (
                    <span key={t} className="chronic-tag-sm items-center-color-ef4444-fs-0-7">
                      <Activity size={10} /> {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="ehr-banner-right">
                {/* Reserved for future right-aligned banner items */}
            </div>
          </div>

          {/* ── Split Layout ─────────────────────── */}
          <div className="workspace-grid">
            
            {/* LEFT: Active Consultation Form */}
            <div className="workspace-main plain-panel">
              <div className="panel-header">
                <div className="panel-title flex-items-center">
                  <Activity size={18} className="text-accent" />
                  <h3 className="fs-1-1-color-f8fafc">{editingVisitId ? 'Edit Consultation' : 'Active Consultation'}</h3>
                </div>
              </div>

              <div className="consult-form flex">
                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <Stethoscope size={14} className="mr-6-color-0ea5e9" /> Consulting Doctor
                  </label>
                  <select className="form-select" value={visitDoctorId} onChange={e => setVisitDoctorId(e.target.value)}>
                    <option value="">— Select Doctor —</option>
                    {doctors?.map((d: any) => (
                      <option key={d.id} value={d.id}>Dr. {d.name} · {d.specialization}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label flex-items-center-1">
                      <Activity size={14} className="mr-6-color-ef4444" /> Symptoms / Complaints
                    </label>
                    <textarea className="form-textarea" placeholder="What is the patient experiencing?" rows={2}
                      value={visitSymptoms} onChange={e => setVisitSymptoms(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label flex-items-center-1">
                      <ClipboardList size={14} className="mr-6-color-a855f7" /> Diagnosis
                    </label>
                    <textarea className="form-textarea" placeholder="Clinical diagnosis..." rows={2}
                      value={visitDiagnosis} onChange={e => setVisitDiagnosis(e.target.value)} />
                  </div>
                </div>

                <div className="vitals-section">
                  <div className="section-header flex-justify-space-between-items-center">
                    <h4 className="fs-0-95-color-var-accent-color-flex-items-center">
                      <Activity size={16} /> Clinical Vitals
                    </h4>
                    {selectedPatient?.height && visitWeight && (
                      <div className="fs-0-85-color-38bdf8">
                        BMI: {(parseFloat(visitWeight) / Math.pow(selectedPatient.height / 100, 2)).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="vitals-grid">
                    <div className="vital-group">
                      <label className="vital-label">Weight (kg)</label>
                      <input type="number" min="0" className="vital-input" placeholder="70" value={visitWeight} onChange={e => setVisitWeight(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">Heart Rate</label>
                      <input type="number" min="0" className="vital-input" placeholder="72" value={visitHeartRate} onChange={e => setVisitHeartRate(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">BP (mmHg)</label>
                      <input type="text" className="vital-input" placeholder="120/80" value={visitBloodPressure} onChange={e => setVisitBloodPressure(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">SpO2 (%)</label>
                      <input type="number" min="0" className="vital-input" placeholder="98" value={visitOxygenLevel} onChange={e => setVisitOxygenLevel(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">Temp (°F)</label>
                      <input type="number" min="0" className="vital-input" placeholder="98.6" value={visitTemperature} onChange={e => setVisitTemperature(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">Resp. Rate</label>
                      <input type="number" min="0" className="vital-input" placeholder="16" value={visitRespiratoryRate} onChange={e => setVisitRespiratoryRate(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">Blood Sugar</label>
                      <input type="number" min="0" className="vital-input" placeholder="110" value={visitBloodSugar} onChange={e => setVisitBloodSugar(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <HeartPulse size={14} className="mr-6-color-34d399" /> Advice & Treatment Plan
                  </label>
                  <textarea className="form-textarea" placeholder="Instructions, diet, rest..." rows={2}
                    value={visitAdvice} onChange={e => setVisitAdvice(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <Edit2 size={14} className="mr-6-color-fbbf24" /> Private Notes (Doctor Only)
                  </label>
                  <input type="text" className="form-input" placeholder="Confidential observations..." 
                    value={visitInternalNotes} onChange={e => setVisitInternalNotes(e.target.value)} />
                </div>

                <div className="form-group custom-style-1">
                  <label className="form-label custom-style-2"><Upload size={14} className="mr-6"/>Attach Documents for this Visit</label>
                  
                  <div className="flex-items-center-2">
                    <select className="form-select custom-style-3" value={stagingCategory} onChange={e => setStagingCategory(e.target.value)}>
                      <option value="Lab Report">Lab Report</option>
                      <option value="X-Ray">X-Ray</option>
                      <option value="MRI Scan">MRI Scan</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Other">Other</option>
                    </select>
                    <input 
                      type="file" 
                      className="form-input custom-style-4"
                      onChange={e => {
                        if (e.target.files?.[0]) setStagingFile(e.target.files[0]);
                      }}
                    />
                    <button className="btn-add-sm" onClick={() => {
                      if (stagingFile) {
                        setVisitFiles([...visitFiles, { file: stagingFile, category: stagingCategory }]);
                        setStagingFile(null);
                        // Reset input
                        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                        if (input) input.value = '';
                      }
                    }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {(visitFiles.length > 0 || existingAttachments.length > 0) && (
                    <div className="flex-1">
                      {existingAttachments.map((item: any) => (
                        <div key={item.id} className="flex-items-center-justify-space-between-1">
                          <div className="fs-0-8-flex-items-center">
                            <span className="color-var-accent-color">[{item.category}]</span>
                            <a href={`${getFileBaseUrl()}${item.fileUrl}`} target="_blank" rel="noreferrer" className="color-var-text-secondary">{item.fileName}</a>
                          </div>
                          <button className="btn-del-icon custom-style-5" onClick={async () => {
                             if (confirm('Delete this attachment permanently?')) {
                               try {
                                 await api.delete(`/patientclinical/attachments/${item.id}`);
                                 setExistingAttachments(existingAttachments.filter((a) => a.id !== item.id));
                                 queryClient.invalidateQueries({ queryKey: ['clinicalVisits', selectedPatient.id] });
                                 queryClient.invalidateQueries({ queryKey: ['attachments', selectedPatient.id] });
                               } catch { notify.danger('Error', 'Failed to delete attachment.'); }
                             }
                          }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {visitFiles.map((item, index) => (
                        <div key={index} className="flex-items-center-justify-space-between-1">
                          <div className="fs-0-8-flex-items-center">
                            <span className="color-var-accent-color">[{item.category}]</span>
                            <span className="color-var-text-secondary-1">{item.file.name}</span>
                          </div>
                          <button className="btn-del-icon custom-style-5" onClick={() => {
                            setVisitFiles(visitFiles.filter((_, i) => i !== index));
                          }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="prescription-section">
                  <div className="section-header custom-style-6">
                    <h4 className="fs-0-95-color-var-accent-color-flex-items-center">
                      <HeartPulse size={16} /> Prescription
                    </h4>
                  </div>

                  <div className="quick-prescribe-box custom-style-7">
                    <div className="fs-0-7-color-var-text-secondary-flex-items-center">
                      <Activity size={12} /> Quick Prescribe
                    </div>
                    <div className="med-chip-container custom-style-8">
                      <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Paracetamol 650mg', dosage: '1-0-1' }])}>+ Paracetamol</div>
                      <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Amoxicillin 500mg', dosage: '1-0-1 x 5 Days' }])}>+ Amoxicillin</div>
                      <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Pantoprazole 40mg', dosage: '1-0-0 Before Food' }])}>+ Pantoprazole</div>
                      <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Cough Syrup', dosage: '2 tsp x 3 times' }])}>+ Cough Syrup</div>
                    </div>
                  </div>

                  <div className="rx-list flex-2">
                    {visitMedicines.length > 0 && (
                      <div className="rx-header flex-fs-0-75-color-var-text-secondary">
                        <div className="flex-items-center-3"><Activity size={14} /> Medicine Name</div>
                        <div className="flex-items-center-4"><Clock size={14} /> Dosage / Freq</div>
                        <div className="custom-style-9"></div>
                      </div>
                    )}
                    {visitMedicines.length === 0 ? (
                      <div className="rx-empty custom-style-10">
                        <Droplets size={24} color="var(--text-secondary)" className="custom-style-11" />
                        <div className="color-94a3b8-fs-0-85">No medicines prescribed yet.</div>
                        <div className="color-64748b-fs-0-75-mt-4">Select from quick prescribe above or add a custom medicine.</div>
                      </div>
                    ) : (
                      visitMedicines.map((m, i) => (
                        <div key={i} className="rx-row flex-items-center-5">
                          <div className="custom-style-12"></div>
                          <input className="form-input rx-input" type="text" placeholder="e.g. Paracetamol 650mg custom-style-13"
                            value={m.medicineName} onChange={e => { const u = [...visitMedicines]; u[i].medicineName = e.target.value; setVisitMedicines(u); }} />
                          <input className="form-input rx-input" type="text" placeholder="e.g. 1-0-1 After Food custom-style-14"
                            value={m.dosage} onChange={e => { const u = [...visitMedicines]; u[i].dosage = e.target.value; setVisitMedicines(u); }} />
                          <button className="btn-del-icon" title="Remove Medicine flex-justify-center-items-center-color-var-danger" onClick={() => setVisitMedicines(visitMedicines.filter((_, j) => j !== i))}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <button 
                    className="mt-12-color-var-accent-color-flex-justify-center-items-center" 
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'; e.currentTarget.style.borderStyle = 'solid'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.05)'; e.currentTarget.style.borderStyle = 'dashed'; }}
                    onClick={() => setVisitMedicines([...visitMedicines, { medicineName: '', dosage: '' }])}
                  >
                    <Plus size={16} /> Add Custom Medicine
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <CalendarIcon size={14} className="mr-6-color-f472b6" /> Next Follow-up Date (Optional)
                  </label>
                  <input type="date" className="form-input custom-style-15"
                    value={visitFollowUpDate} onChange={e => setVisitFollowUpDate(e.target.value)} />
                </div>

                {visitFollowUpDate && (
                  <div className="form-group slide-down instruction-box-premium">
                    <label className="form-label color-var-accent-color-flex-items-center">
                      <MessageSquare size={14} className="mr-6-color-60a5fa" /> Patient Instructions (Sent via WhatsApp)
                    </label>
                    <textarea 
                      className="form-textarea" 
                      placeholder="e.g. Bring old reports, come fasting..."
                      rows={2}
                      value={visitFollowUpInstructions} 
                      onChange={e => setVisitFollowUpInstructions(e.target.value)} 
                    />
                    <div className="quick-instruction-chips">
                      <span className="qi-chip" onClick={() => setVisitFollowUpInstructions(prev => (prev ? prev + ', ' : '') + 'Bring all previous reports')}>+ Old Reports</span>
                      <span className="qi-chip" onClick={() => setVisitFollowUpInstructions(prev => (prev ? prev + ', ' : '') + 'Come empty stomach (Fasting)')}>+ Fasting</span>
                      <span className="qi-chip" onClick={() => setVisitFollowUpInstructions(prev => (prev ? prev + ', ' : '') + 'Arrive 15 mins early')}>+ 15 Mins Early</span>
                    </div>
                  </div>
                )}

              </div>

              <div className="panel-footer">
                <button className="btn-cancel-consult" onClick={() => {
                  setVisitSymptoms('');
                  setVisitDiagnosis('');
                  setVisitAdvice('');
                  setVisitInternalNotes('');
                  setVisitFollowUpDate('');
                  setVisitFollowUpInstructions('');
                  setVisitMedicines([]);
                  setVisitFiles([]);
                  setStagingFile(null);
                  setStagingCategory('Lab Report');
                  setEditingVisitId(null);
                  setExistingAttachments([]);
                }}>
                  Cancel
                </button>
                <button id="btn-save-consult" className="btn-save-consult" onClick={handleSaveConsultation} disabled={isSavingVisit || !visitDoctorId}>
                  {isSavingVisit ? <span className="spinner-sm" /> : <Save size={16} />}
                  {isSavingVisit ? 'Saving Record...' : editingVisitId ? 'Update Consultation Record' : 'Save Consultation Record'}
                  <span className="shortcut-hint">Ctrl+Enter</span>
                </button>
              </div>
            </div>

            {/* RIGHT: History & Sidebar */}
            <div className="workspace-sidebar plain-panel">
              <div className="sidebar-tabs">
                <button className="sb-tab active">
                  History {clinicalVisits?.length > 0 && <span>({clinicalVisits.length})</span>}
                </button>
              </div>

              <div className="sidebar-content">
                
                {workspaceTab === 'history' && (
                  <div className="history-pane">
                    {isVisitsLoading ? (
                      <div className="compact-timeline custom-style-16">
                        <div className="skeleton-box skeleton-block"></div>
                        <div className="skeleton-box skeleton-block custom-style-17"></div>
                        <div className="skeleton-box skeleton-block custom-style-18"></div>
                      </div>
                    ) : !clinicalVisits?.length ? (
                      <div className="ehr-state-sm">No past visits found.</div>
                    ) : (
                      <div className="compact-timeline">
                        {clinicalVisits.map((v: any, index: number) => (
                          <div key={v.id} className="ct-item">
                            <div className="ct-date">{formatDate(v.visitDate)}</div>
                            <div className="ct-card">
                              <div className="ct-header flex-justify-space-between-items-flex-start">
                                <span>Dr. {v.doctorName} {v.tokenId && <span className="ct-badge">Queue</span>}</span>
                                {index === 0 && (
                                  <button className="btn-icon-ghost custom-style-19" onClick={() => handleEditVisit(v)} title="Edit Consultation">
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="ct-text flex-items-flex-start"><ClipboardList size={14} className="color-a855f7-mt-2" /> <span><strong className="color-e2e8f0">Diagnosis:</strong> {v.diagnosis || '--'}</span></div>
                              <div className="ct-text flex-items-flex-start"><Activity size={14} className="color-ef4444-mt-2" /> <span><strong className="color-e2e8f0">Symptoms:</strong> {v.symptoms || '--'}</span></div>
                              {v.advice && <div className="ct-text flex-items-flex-start"><HeartPulse size={14} className="color-34d399-mt-2" /> <span><strong className="color-e2e8f0">Treatment Plan:</strong> {v.advice}</span></div>}
                              {v.internalNotes && <div className="ct-text flex-items-flex-start-color-var-accent-color"><Edit2 size={14} className="color-fbbf24-mt-2" /> <span><strong className="color-e2e8f0">Private Note:</strong> {v.internalNotes}</span></div>}
                              {(v.height || v.weight || v.heartRate || v.bloodPressure || v.oxygenLevel || v.temperature || v.respiratoryRate || v.bloodSugar) && (
                                <div className="ct-text flex-mt-4">
                                  <div className="fs-0-75-color-var-accent-color-flex-items-center"><Activity size={12} /> VITALS</div>
                                  {v.height && <span className="fs-0-75">HT: {v.height}cm</span>}
                                  {v.weight && <span className="fs-0-75">WT: {v.weight}kg</span>}
                                  {v.height && v.weight && <span className="fs-0-75">BMI: {(parseFloat(v.weight) / Math.pow(parseFloat(v.height) / 100, 2)).toFixed(1)}</span>}
                                  {v.heartRate && <span className="fs-0-75">HR: {v.heartRate}</span>}
                                  {v.bloodPressure && <span className="fs-0-75">BP: {v.bloodPressure}</span>}
                                  {v.oxygenLevel && <span className="fs-0-75">SpO2: {v.oxygenLevel}%</span>}
                                  {v.temperature && <span className="fs-0-75">Temp: {v.temperature}°F</span>}
                                  {v.respiratoryRate && <span className="fs-0-75">RR: {v.respiratoryRate}</span>}
                                  {v.bloodSugar && <span className="fs-0-75">Sugar: {v.bloodSugar}</span>}
                                </div>
                              )}
                              {v.followUpDate && (
                                <div className="ct-text mt-4">
                                  <div className="flex-items-center-6"><CalendarIcon size={14} className="color-f472b6" /> <strong>Next Follow-up:</strong> {formatDate(v.followUpDate)}</div>
                                  {v.followUpInstructions && <div className="mt-4-fs-0-78-color-var-text-secondary-flex-items-flex-start"><MessageSquare size={12} className="color-60a5fa-mt-2" /> <span>{v.followUpInstructions}</span></div>}
                                </div>
                              )}
                              {v.medicines?.length > 0 && (
                                <div className="ct-rx mt-8">
                                  <div className="fs-0-75-color-38bdf8-flex-items-center"><HeartPulse size={12} /> Prescribed Medicines</div>
                                  {v.medicines.map((m:any) => <div key={m.id} className="fs-0-8-color-e2e8f0-flex-justify-space-between"><span>• {m.medicineName}</span> <span className="color-94a3b8">{m.dosage}</span></div>)}
                                </div>
                              )}
                              {v.attachments?.length > 0 && (
                                <div className="ct-attachments mt-8-flex">
                                  {v.attachments.map((a:any) => (
                                    <a key={a.id} href={`${getFileBaseUrl()}${a.fileUrl}`} target="_blank" rel="noreferrer" 
                                       className="items-center-fs-0-75-color-f8fafc">
                                      <FileText size={12} className="mr-6" /> [{a.category}] {a.fileName}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* Render Unlinked Attachments */}
                        {(() => {
                          const linkedAttachmentIds = new Set(clinicalVisits?.flatMap((v:any) => v.attachments?.map((a:any) => a.id) || []));
                          const unlinkedAttachments = attachments?.filter((a:any) => !linkedAttachmentIds.has(a.id));
                          
                          if (unlinkedAttachments && unlinkedAttachments.length > 0) {
                            return (
                              <div className="ct-item">
                                <div className="ct-date">Archive</div>
                                <div className="ct-card">
                                  <div className="ct-header">Independent Reports</div>
                                  <div className="ct-text fs-0-8-color-var-text-secondary">These documents were uploaded separately from any consultation.</div>
                                  <div className="ct-attachments mt-8-flex">
                                    {unlinkedAttachments.map((a:any) => (
                                      <a key={a.id} href={`${getFileBaseUrl()}${a.fileUrl}`} target="_blank" rel="noreferrer" 
                                         className="items-center-fs-0-75-color-var-accent-color">
                                        <FileText size={12} className="mr-6" /> [{a.category}] {a.fileName}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* ════════════════════════════════════════════════════════
           PATIENT DIRECTORY TABLE
        ════════════════════════════════════════════════════════ */
        <div className="glass-card patients-card-body">
          <div className="patients-header-actions flex-justify-flex-end-items-center">
            <div className="search-input-wrapper">
              <div className="search-input-container">
                <Search size={15} className="search-icon-pos" />
                <input type="text" placeholder="Search by name or phone..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="search-input-field" />
              </div>
            </div>
            <button className="btn-primary"
              onClick={() => setIsAddModalOpen(true)}>
              <UserPlus size={15} /> New Patient
            </button>
          </div>

          <div className="divider-light" />

          <div className="patients-bento-grid">
            {isLoading ? (
              <div className="empty-table-wrapper custom-style-20">
                <div className="spinner-ring" /><span>Loading...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="empty-table-wrapper custom-style-20">
                <Users size={32} /><span>No patients found.</span>
              </div>
            ) : filteredPatients.map((p: any) => (
              <div key={p.id} className="elegant-patient-card" onClick={() => { setSelectedPatient(p); setWorkspaceTab('history'); }}>
                {/* Hover Line */}
                
                <div className="ep-header">
                  <div className="ep-avatar">
                    {p.name.charAt(0)}
                  </div>
                  <div className="ep-info">
                    <div className="ep-name-row">
                      <h3 className="ep-name">{p.name}</h3>
                      <div className="ep-status-badge" style={!p.lastVisit ? { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)' } : {}}>
                        <span style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.lastVisit ? '#34d399' : '#60a5fa'}}></span>
                        {p.lastVisit ? 'Active' : 'New'}
                      </div>
                    </div>
                    <div className="ep-subtext">
                      <span className="color-60a5fa-flex-items-center">
                        <User size={12} /> {p.gender || 'Unknown'}
                      </span>
                      <span className="ep-dot">•</span>
                      <span className="color-34d399-flex-items-center">
                        <CalendarIcon size={12} /> {p.age > 0 ? `${p.age} Yrs` : 'N/A'}
                      </span>
                      <span className="ep-dot">•</span>
                      <span className="color-f87171-flex-items-center">
                        <Droplets size={12} /> {p.bloodGroup || '--'}
                      </span>
                      <span className="ep-dot">•</span>
                      <span className="color-fbbf24-flex-items-center">
                        <Ruler size={12} /> {p.height ? `${p.height} cm` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ep-details-grid">
                  {/* 1. Patient ID (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon color-a855f7"><Hash size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Patient ID</span>
                      <span className="ep-d-val">{p.patientCode || 'PT-' + p.id.substring(0, 6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* 2. Contact (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon color-60a5fa"><Phone size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Contact</span>
                      <span className="ep-d-val">{p.phone || 'N/A'}</span>
                    </div>
                  </div>

                  {/* 3. Address (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon color-14b8a6"><FileText size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Address</span>
                      <span className="ep-d-val">{p.address || '--'}</span>
                    </div>
                  </div>

                  {/* 4. Last Diagnosis (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon color-a855f7"><ClipboardList size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Last Diagnosis</span>
                      <span className="ep-d-val">{p.lastDiagnosis || '--'}</span>
                    </div>
                  </div>

                  {/* 4.5. Last Symptom (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon color-ef4444"><Activity size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Last Symptom</span>
                      <span className="ep-d-val">{p.lastSymptoms || '--'}</span>
                    </div>
                  </div>

                  {/* 5. Total Visits (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon color-34d399"><FileText size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Visits</span>
                      <span className="ep-d-val">{p.totalVisits || 0} Total</span>
                    </div>
                  </div>

                  {/* 6. Next Visit (Half) */}
                  {p.nextVisit && (
                    <div className="ep-detail-item">
                      <div className="ep-detail-icon color-f472b6-1"><CalendarIcon size={14} /></div>
                      <div className="ep-detail-text">
                        <span className="ep-d-label">Next Visit</span>
                        <span className="ep-d-val">{formatDate(p.nextVisit)}</span>
                      </div>
                    </div>
                  )}

                  {/* Remaining Items */}
                  {(p.emergencyContactName || p.emergencyContactPhone) && (
                    <div className="ep-detail-item">
                      <div className="ep-detail-icon color-f43f5e"><Phone size={14} /></div>
                      <div className="ep-detail-text">
                        <span className="ep-d-label">Emergency</span>
                        <span className="ep-d-val">{p.emergencyContactName ? `${p.emergencyContactName} - ` : ''}{p.emergencyContactPhone || ''}</span>
                      </div>
                    </div>
                  )}
                  {p.preExistingConditions && (
                    <div className="ep-detail-item">
                      <div className="ep-detail-icon color-ef4444"><Activity size={14} /></div>
                      <div className="ep-detail-text">
                        <span className="ep-d-label">Pre-existing</span>
                        <span className="ep-d-val">{p.preExistingConditions.split(',').map((t:any) => t.trim()).join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ep-footer">
                  <div className="ep-last-visit flex-items-center-1">
                    <History size={14} className="mr-6-1" /> Last Visit: <span className="ml-4">{p.lastVisit ? formatDate(p.lastVisit) : 'None'}</span>
                  </div>
                  <button className="ep-consult-btn" onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); setWorkspaceTab('history'); }}>
                    <Stethoscope size={16} /> Consult
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════ MODALS ════════════ */}

      {/* WhatsApp Modal */}
      {messagingPatient && (
        <Modal title="Send WhatsApp" icon={<MessageSquare size={20} color="var(--accent-color)" />}
          onClose={() => setMessagingPatient(null)} maxWidth="460px">
          <div className="modal-body">
            <div className="wa-recipient-box">
              <div className="wa-avatar">{messagingPatient.name.charAt(0)}</div>
              <div className="wa-info">
                <h4>{messagingPatient.name}</h4>
                <p><Phone size={11} /> {messagingPatient.phone}</p>
              </div>
              <div className="wa-bridge-dot"><span className="wa-dot" /> Bridge</div>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <div className="wa-textarea-wrap">
                <textarea className="wa-textarea" rows={4} placeholder="Type your message..."
                  value={messageText} onChange={e => setMessageText(e.target.value)} />
              </div>
              <span className="wa-hint">Sent via WhatsApp bridge instantly.</span>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setMessagingPatient(null)}><X size={14} /> Cancel</button>
              <button className="btn-submit" onClick={handleSendMessage}
                disabled={isSending || !messageText.trim()}>
                {isSending ? <span className="spinner-sm" /> : <Send size={14} />}
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && selectedPatient && (
        <Modal title="Edit Patient Profile" icon={<Edit size={20} color="var(--accent-color)" />}
          onClose={() => setIsEditingProfile(false)} maxWidth="540px">
          <div className="modal-body custom-style-21">
            <div className="form-group">
              <label className="form-label flex-items-center-1">
                <User size={14} className="mr-6-color-3b82f6" /> Full Name <span className="color-var-danger">*</span>
              </label>
              <input className="form-input" type="text" placeholder="e.g. John Doe"
                value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label flex-items-center-1">
                <Phone size={14} className="mr-6-color-10b981" /> Phone <span className="color-var-danger">*</span>
              </label>
              <input className="form-input" type="text" placeholder="+91..."
                value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label flex-items-center-1">
                <MapPin size={14} className="mr-6-color-8b5cf6" /> Address
              </label>
              <input className="form-input" type="text" placeholder="Full address"
                value={editAddress} onChange={e => setEditAddress(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <CalendarIcon size={14} className="mr-6-color-f59e0b" /> Age
                </label>
                <input className="form-input" type="number" min="0" placeholder="e.g. 34"
                  value={editAge} onChange={e => setEditAge(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <Users size={14} className="mr-6-color-ec4899" /> Gender
                </label>
                <select className="form-select" value={editGender} onChange={e => setEditGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <Ruler size={14} className="mr-6-color-6366f1" /> Height (cm)
                </label>
                <input className="form-input" type="number" min="0" placeholder="e.g. 175"
                  value={editHeight} onChange={e => setEditHeight(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <Droplets size={14} className="mr-6-color-ef4444" /> Blood Group
                </label>
                <input className="form-input" type="text" placeholder="e.g. O+"
                  value={editBloodGroup} onChange={e => setEditBloodGroup(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <PhoneCall size={14} className="mr-6-color-f43f5e" /> Emg. Contact Name
                </label>
                <input className="form-input" type="text" placeholder="e.g. Jane Doe"
                  value={editEmergencyContactName} onChange={e => setEditEmergencyContactName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <PhoneCall size={14} className="mr-6-color-f43f5e" /> Emg. Contact Phone
                </label>
                <input className="form-input" type="tel" placeholder="e.g. 9876543210"
                  value={editEmergencyContactPhone} onChange={e => setEditEmergencyContactPhone(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label flex-items-center-1">
                <Activity size={14} className="mr-6-color-f97316" /> Pre-existing Diseases (comma-separated)
              </label>
              <input className="form-input" type="text" placeholder="e.g. Diabetes, Hypertension"
                value={editPreExistingConditions} onChange={e => setEditPreExistingConditions(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsEditingProfile(false)}><X size={14} /> Cancel</button>
              <button className="btn-submit" onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? <span className="spinner-sm" /> : <Check size={14} />}
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Modal */}
      {isUploadingAttachment && (
        <Modal title="Upload Report / File" icon={<Upload size={20} color="var(--accent-color)" />}
          onClose={() => { setIsUploadingAttachment(false); setUploadFiles([]); }} maxWidth="420px">
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                <option value="Lab Report">Lab Report</option>
                <option value="X-Ray">X-Ray / Scan</option>
                <option value="MRI Scan">MRI / CT Scan</option>
                <option value="Prescription">Prescription</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Files (PDF, PNG, JPG — max 10 MB per file)</label>
              <input type="file" className="file-input-styled" accept=".pdf,.png,.jpg,.jpeg" multiple
                onChange={e => { if (e.target.files) setUploadFiles(Array.from(e.target.files)); }} />
              {uploadFiles.length > 0 && (
                <div className="mt-8-fs-0-8-color-var-accent-color">
                  {uploadFiles.length} file(s) selected
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel"
                onClick={() => { setIsUploadingAttachment(false); setUploadFiles([]); }}>
                <X size={14} /> Cancel
              </button>
              <button className="btn-submit" onClick={handleUploadAttachment}
                disabled={isSavingAttachment || uploadFiles.length === 0}>
                {isSavingAttachment ? <span className="spinner-sm" /> : <Upload size={14} />}
                {isSavingAttachment ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddPatient}
        isLoading={isAddingPatient}
      />
    </div>
  );
};

export default PatientsList;
