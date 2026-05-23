import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Users, Search, Phone, Calendar as CalendarIcon, UserPlus, MessageSquare,
  History, Send, X, ArrowLeft, Building2, Edit, Check,
  Trash2, Plus, FileText, ClipboardList,
  Droplets, HeartPulse, Upload, Activity, Save, Edit2, Stethoscope, Clock, User, Hash, Ruler, MapPin, PhoneCall, Smartphone,
  ChevronLeft, ChevronRight
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
  
  const queryClient = useQueryClient();
  const { orgId, branchId: currentBranchId } = useAuthStore();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranchId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedBranchId, limit]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Doctor Workspace Tabs (Right Sidebar)
  const [workspaceTab, setWorkspaceTab] = useState<'history' | 'reports' | 'followups'>('history');

  // Modals
  const [messagingPatient, setMessagingPatient] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingFromCard, setIsEditingFromCard] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
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

  const { data: patientsData, isLoading } = useQuery({
    queryKey: ['patients', selectedBranchId, page, limit, debouncedSearchQuery],
    queryFn: async () => {
      const r = await api.get('/patients', {
        params: { 
          branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
          page,
          limit,
          search: debouncedSearchQuery || undefined
        },
      });
      return r.data;
    },
  });

  const patients = patientsData?.data || [];
  const totalPages = patientsData?.totalPages || 1;
  const totalCount = patientsData?.totalCount || 0;

  const { data: clinicalVisitsData, isLoading: isVisitsLoading } = useQuery({
    queryKey: ['clinicalVisits', selectedPatient?.id, historyPage],
    queryFn: async () => { const r = await api.get(`/patientclinical/${selectedPatient.id}/visits?page=${historyPage}&limit=5`); return r.data; },
    enabled: !!selectedPatient,
  });
  const clinicalVisits = clinicalVisitsData?.data || [];
  const totalHistoryPages = clinicalVisitsData?.totalPages || 1;

  const { data: attachmentsData } = useQuery({
    queryKey: ['attachments', selectedPatient?.id],
    queryFn: async () => { const r = await api.get(`/patientclinical/${selectedPatient.id}/attachments?limit=100`); return r.data; },
    enabled: !!selectedPatient,
  });
  const attachments = attachmentsData?.data || [];

  useQuery({
    queryKey: ['followups', selectedPatient?.id],
    queryFn: async () => { const r = await api.get(`/patientclinical/${selectedPatient.id}/followups`); return r.data; },
    enabled: !!selectedPatient,
  });

  const filteredPatients = patients || [];

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

  const handleCloseEditModal = () => {
    setIsEditingProfile(false);
    if (isEditingFromCard) {
      setSelectedPatient(null);
      setIsEditingFromCard(false);
    }
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
      handleCloseEditModal();
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

  /*
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
  */

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
              <div className="ehr-avatar-lg">{selectedPatient.name.charAt(0)}</div>
              <div className="ehr-patient-info">
                <div className="ehr-patient-title-row">
                  <h2 className="ehr-patient-name">{selectedPatient.name}</h2>
                  <span className="ehr-code-badge items-center-icon-purple-fs-0-65">
                    <Hash size={10} /> {patientCode}
                  </span>
                  <button className="btn-icon-ghost" onClick={() => { setIsEditingProfile(true); setIsEditingFromCard(false); }} title="Edit Profile">
                    <Edit size={14} />
                  </button>
                </div>
                <div className="ehr-vitals-inline">
                  <span className="vital-text flex-items-center-icon-blue-light">
                    <User size={12} className="icon-blue mr-1" /> {selectedPatient.gender || 'No Gender'}
                  </span>
                  <span className="vital-dot">•</span>
                  <span className="vital-text flex-items-center-icon-emerald">
                    <CalendarIcon size={12} className="icon-amber mr-1" /> {selectedPatient.age > 0 ? `${selectedPatient.age} Yrs` : 'No Age'}
                  </span>
                  {selectedPatient.bloodGroup && (
                    <>
                      <span className="vital-dot">•</span>
                      <span className="vital-text blood-group flex-items-center-icon-f87171">
                        <Droplets size={12} className="icon-red mr-1" /> {selectedPatient.bloodGroup}
                      </span>
                    </>
                  )}
                  {selectedPatient.height && (
                    <>
                      <span className="vital-dot">•</span>
                      <span className="vital-text flex-items-center-icon-amber">
                        <Ruler size={12} /> {selectedPatient.height} cm
                      </span>
                    </>
                  )}
                  {selectedPatient.preExistingConditions && selectedPatient.preExistingConditions.split(',').map((t: string) => (
                    <span key={t} className="chronic-tag-sm items-center-icon-red-fs-0-7">
                      <Activity size={10} className="icon-red mr-1" /> {t.trim()}
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
                  <h3 className="fs-1-1-icon-f8fafc">{editingVisitId ? 'Edit Consultation' : 'Active Consultation'}</h3>
                </div>
              </div>

              <div className="consult-form flex">
                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <Stethoscope size={14} className="mr-1-5 icon-sky" /> Consulting Doctor
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
                      <Activity size={14} className="mr-1-5 icon-red" /> Symptoms / Complaints
                    </label>
                    <textarea className="form-textarea" placeholder="What is the patient experiencing?" rows={2}
                      value={visitSymptoms} onChange={e => setVisitSymptoms(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label flex-items-center-1">
                      <ClipboardList size={14} className="mr-1-5 icon-purple" /> Diagnosis
                    </label>
                    <textarea className="form-textarea" placeholder="Clinical diagnosis..." rows={2}
                      value={visitDiagnosis} onChange={e => setVisitDiagnosis(e.target.value)} />
                  </div>
                </div>

                <div className="vitals-section">
                  <div className="section-header flex-justify-space-between-items-center">
                    <h4 className="fs-0-95-color-var-accent-color-flex-items-center">
                      <Activity size={16} className="mr-1-5 icon-red" /> Clinical Vitals
                    </h4>
                    {selectedPatient?.height && visitWeight && (
                      <div className="fs-0-85-icon-38bdf8">
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
                      <label className="vital-label">Temp (°F)</label>
                      <input type="number" min="0" className="vital-input" placeholder="98.6" value={visitTemperature} onChange={e => setVisitTemperature(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">Blood Sugar</label>
                      <input type="number" min="0" className="vital-input" placeholder="110" value={visitBloodSugar} onChange={e => setVisitBloodSugar(e.target.value)} />
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
                      <label className="vital-label">Heart Rate</label>
                      <input type="number" min="0" className="vital-input" placeholder="72" value={visitHeartRate} onChange={e => setVisitHeartRate(e.target.value)} />
                    </div>
                    <div className="vital-group">
                      <label className="vital-label">Resp. Rate</label>
                      <input type="number" min="0" className="vital-input" placeholder="16" value={visitRespiratoryRate} onChange={e => setVisitRespiratoryRate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <HeartPulse size={14} className="mr-1-5 icon-emerald" /> Advice & Treatment Plan
                  </label>
                  <textarea className="form-textarea" placeholder="Instructions, diet, rest..." rows={2}
                    value={visitAdvice} onChange={e => setVisitAdvice(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <Edit2 size={14} className="mr-1-5 icon-amber" /> Private Notes (Doctor Only)
                  </label>
                  <input type="text" className="form-input" placeholder="Confidential observations..." 
                    value={visitInternalNotes} onChange={e => setVisitInternalNotes(e.target.value)} />
                </div>

                <div className="form-group custom-style-1">
                  <label className="form-label custom-style-2"><Upload size={14} className="mr-1-5 icon-cyan" />Attach Documents for this Visit</label>
                  
                  <div className="attach-docs-row">
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
                      <Plus size={14} className="icon-emerald mr-1" /> Add
                    </button>
                  </div>

                  {(visitFiles.length > 0 || existingAttachments.length > 0) && (
                    <div className="flex-1">
                      {existingAttachments.map((item: any) => (
                        <div key={item.id} className="doc-item-row">
                          <div className="doc-item-info">
                            <span className="doc-item-cat">[{item.category}]</span>
                            <a href={`${getFileBaseUrl()}${item.fileUrl}`} target="_blank" rel="noreferrer" className="doc-item-name">{item.fileName}</a>
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
                            <Trash2 size={12} className="icon-red mr-1" />
                          </button>
                        </div>
                      ))}
                      {visitFiles.map((item, index) => (
                        <div key={index} className="doc-item-row">
                          <div className="doc-item-info">
                            <span className="doc-item-cat">[{item.category}]</span>
                            <span className="doc-item-name">{item.file.name}</span>
                          </div>
                          <button className="btn-del-icon custom-style-5" onClick={() => {
                            setVisitFiles(visitFiles.filter((_, i) => i !== index));
                          }}>
                            <Trash2 size={12} className="icon-red mr-1" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="prescription-section">
                  <div className="section-header custom-style-6">
                    <h4 className="fs-0-95-color-var-accent-color-flex-items-center">
                      <HeartPulse size={16} className="mr-1-5 icon-rose" /> Prescription
                    </h4>
                  </div>



                  <div className="rx-list flex-2">
                    {visitMedicines.length > 0 && (
                      <div className="rx-header">
                        <div className="rx-col-2"><Activity size={14} className="icon-cyan mr-1-5" /> Medicine Name</div>
                        <div className="rx-col-1"><Clock size={14} className="icon-purple mr-1-5" /> Dosage / Freq</div>
                        <div className="rx-col-action"></div>
                      </div>
                    )}
                    {visitMedicines.length === 0 ? (
                      <div className="rx-empty custom-style-10">
                        <Droplets size={24} color="var(--text-secondary)" className="custom-style-11" />
                        <div className="icon-slate-fs-0-85">No medicines prescribed yet.</div>
                        <div className="icon-64748b-fs-0-75-mt-4">Click "Add Custom Medicine" below to get started.</div>
                      </div>
                    ) : (
                      visitMedicines.map((m, i) => (
                        <div key={i} className="rx-row flex-items-center-5">
                          <div className="row-marker"></div>
                          <input className="form-input rx-input rx-col-2" type="text" placeholder="e.g. Paracetamol 650mg"
                            value={m.medicineName} onChange={e => { const u = [...visitMedicines]; u[i].medicineName = e.target.value; setVisitMedicines(u); }} />
                          <input className="form-input rx-input rx-col-1" type="text" placeholder="e.g. 1-0-1 After Food"
                            value={m.dosage} onChange={e => { const u = [...visitMedicines]; u[i].dosage = e.target.value; setVisitMedicines(u); }} />
                          <button className="btn-del-icon flex-center-items-center-danger" title="Remove Medicine" onClick={() => setVisitMedicines(visitMedicines.filter((_, j) => j !== i))}>
                            <Trash2 size={16} className="icon-red" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <button 
                    className="btn-add-custom-med" 
                    onClick={() => setVisitMedicines([...visitMedicines, { medicineName: '', dosage: '' }])}
                  >
                    <Plus size={16} className="icon-sky mr-1-5" /> Add Custom Medicine
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label flex-items-center-1">
                    <CalendarIcon size={14} className="mr-1-5 icon-pink" /> Next Follow-up Date (Optional)
                  </label>
                  <input type="date" className="form-input input-date-sm"
                    value={visitFollowUpDate} onChange={e => setVisitFollowUpDate(e.target.value)} />
                </div>

                {visitFollowUpDate && (
                  <div className="form-group slide-down instruction-box-premium">
                    <label className="form-label color-var-accent-color-flex-items-center">
                      <MessageSquare size={14} className="mr-1-5 icon-blue-light" /> Patient Instructions (Sent via WhatsApp)
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
                  <X size={16} color="#f43f5e" className="mr-1-5" /> Cancel
                </button>
                <button id="btn-save-consult" className="btn-save-consult" onClick={handleSaveConsultation} disabled={isSavingVisit || !visitDoctorId}>
                  {isSavingVisit ? <span className="spinner-sm" /> : <Save size={16} className="mr-1-5" />}
                  {isSavingVisit ? 'Saving Record...' : editingVisitId ? 'Update Consultation Record' : 'Save Consultation Record'}
                  <span className="shortcut-hint">Ctrl+Enter</span>
                </button>
              </div>
            </div>

            {/* RIGHT: History & Sidebar */}
            <div className="workspace-sidebar plain-panel">
              <div className="sidebar-tabs">
                <button className="sb-tab active">
                  History {clinicalVisitsData?.totalCount > 0 && <span>({clinicalVisitsData.totalCount})</span>}
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
                    ) : !clinicalVisitsData?.data?.length ? (
                      <div className="ehr-state-sm">No past visits found.</div>
                    ) : (
                      <div className="compact-timeline">
                        {clinicalVisitsData.data.map((v: any, index: number) => (
                          <div key={v.id} className="ct-item">
                            <div className="ct-date">{formatDate(v.visitDate)}</div>
                            <div className="ct-card">
                              <div className="ct-header flex-justify-space-between-items-fs">
                                <span>Dr. {v.doctorName} {v.tokenId && <span className="ct-badge">Queue</span>}</span>
                                {index === 0 && (
                                  <button className="btn-icon-ghost custom-style-19" onClick={() => handleEditVisit(v)} title="Edit Consultation">
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </div>
                              <div className="ct-text flex-items-fs-gap-6 mb-2"><ClipboardList size={14} className="icon-purple mt-2px mr-1-5" /> <span><strong className="text-slate-200">Diagnosis:</strong> {v.diagnosis || '--'}</span></div>
                              <div className="ct-text flex-items-fs-gap-6 mb-2"><Activity size={14} className="icon-red mt-2px mr-1-5" /> <span><strong className="text-slate-200">Symptoms:</strong> {v.symptoms || '--'}</span></div>
                              {v.advice && <div className="ct-text flex-items-fs-gap-6 mb-2"><HeartPulse size={14} className="icon-emerald mt-2px mr-1-5" /> <span><strong className="text-slate-200">Treatment Plan:</strong> {v.advice}</span></div>}

                              <details className="ct-details">
                                <summary className="ct-summary">View Details</summary>
                                <div className="ct-details-content">
                                  {(v.weight || v.heartRate || v.bloodPressure || v.oxygenLevel || v.temperature || v.respiratoryRate || v.bloodSugar) && (
                                    <div className="ct-rx rx-history-card" style={{ marginBottom: '12px' }}>
                                      <div className="rx-history-header">
                                        <Activity size={12} className="icon-red mr-1" /> CLINICAL VITALS
                                      </div>
                                      <div className="vitals-modern-grid">
                                        {/* Row 1: Weight, Temp, Blood Sugar, BP */}
                                        <div className={`vital-box vital-box-emerald ${!v.weight ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">Weight</span>
                                          <span className="vital-box-value">{v.weight ? `${v.weight} kg` : '--'}</span>
                                        </div>
                                        <div className={`vital-box vital-box-amber ${!v.temperature ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">Temp</span>
                                          <span className="vital-box-value">{v.temperature ? `${v.temperature}°F` : '--'}</span>
                                        </div>
                                        <div className={`vital-box vital-box-pink ${!v.bloodSugar ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">Blood Sugar</span>
                                          <span className="vital-box-value">{v.bloodSugar ? `${v.bloodSugar}` : '--'}</span>
                                        </div>
                                        <div className={`vital-box vital-box-violet ${!v.bloodPressure ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">BP</span>
                                          <span className="vital-box-value">{v.bloodPressure ? v.bloodPressure : '--'}</span>
                                        </div>

                                        {/* Row 2: Oxygen, Heart Rate, Resp. Rate */}
                                        <div className={`vital-box vital-box-sky ${!v.oxygenLevel ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">Oxygen</span>
                                          <span className="vital-box-value">{v.oxygenLevel ? `${v.oxygenLevel}%` : '--'}</span>
                                        </div>
                                        <div className={`vital-box vital-box-rose ${!v.heartRate ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">Heart Rate</span>
                                          <span className="vital-box-value">{v.heartRate ? `${v.heartRate} bpm` : '--'}</span>
                                        </div>
                                        <div className={`vital-box vital-box-teal ${!v.respiratoryRate ? 'vital-empty' : ''}`}>
                                          <span className="vital-box-label">Resp. Rate</span>
                                          <span className="vital-box-value">{v.respiratoryRate ? `${v.respiratoryRate}/min` : '--'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {v.internalNotes && <div className="ct-text flex-items-fs-gap-6 color-var-accent-color"><Edit2 size={14} className="icon-amber mt-2px mr-1-5" /> <span><strong className="text-slate-200">Private Note:</strong> {v.internalNotes}</span></div>}
                                  {v.followUpDate && (
                                    <div className="ct-text history-fup-card">
                                      <div className="flex-items-center-gap-6"><CalendarIcon size={14} className="icon-pink mr-1-5" /> <strong>Next Follow-up:</strong> {formatDate(v.followUpDate)}</div>
                                      {v.followUpInstructions && <div className="history-fup-text"><MessageSquare size={12} className="icon-blue-light mt-2px flex-shrink-0 mr-1-5" /> <span>{v.followUpInstructions}</span></div>}
                                    </div>
                                  )}
                                  {v.medicines?.length > 0 && (
                                    <div className="ct-rx mt-8">
                                      <div className="fs-0-75-icon-38bdf8-flex-items-center"><HeartPulse size={12} className="icon-rose mr-1" /> Prescribed Medicines</div>
                                      {v.medicines.map((m:any) => <div key={m.id} className="fs-0-8-icon-e2e8f0-flex-justify-space-between"><span>• {m.medicineName}</span> <span className="icon-slate">{m.dosage}</span></div>)}
                                    </div>
                                  )}
                                  {v.attachments?.length > 0 && (
                                    <div className="ct-attachments history-attachments-wrap">
                                      {v.attachments.map((a:any) => (
                                        <a key={a.id} href={`${getFileBaseUrl()}${a.fileUrl}`} target="_blank" rel="noreferrer" 
                                           className="items-center-fs-0-75-icon-f8fafc">
                                          <FileText size={12} className="mr-6" /> [{a.category}] {a.fileName}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </details>
                            </div>
                          </div>
                        ))}
                        
                        {/* History Pagination */}
                        {totalHistoryPages > 1 && (
                          <div className="history-pagination mt-4 mb-4 flex-justify-space-between-items-center">
                            <button 
                              className="btn-outline-sm" 
                              disabled={historyPage === 1}
                              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            >
                              <ChevronLeft size={14} className="mr-1" /> Prev
                            </button>
                            <span className="text-muted fs-0-8">Page {historyPage} of {totalHistoryPages}</span>
                            <button 
                              className="btn-outline-sm" 
                              disabled={historyPage === totalHistoryPages}
                              onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                            >
                              Next <ChevronRight size={14} className="ml-1" />
                            </button>
                          </div>
                        )}

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
                                  <div className="ct-text history-attachments-text">These documents were uploaded separately from any consultation.</div>
                                  <div className="ct-attachments history-attachments-wrap">
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
            <div className="pro-limit-selector" style={{ marginRight: 'auto' }}>
              <span className="pro-limit-label">Rows:</span>
              <select 
                className="pro-limit-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="search-input-wrapper">
              <div className="search-input-container">
                <Search size={15} className="search-icon-pos" />
                <input type="text" placeholder="Search by name or phone..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="search-input-field" />
              </div>
            </div>
            <button className="btn-outline-primary"
              onClick={() => setIsAddModalOpen(true)}>
              <UserPlus size={15} className="mr-1-5" /> New Patient
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
                      <div className={`ep-status-badge ${!p.lastVisit ? 'status-new' : ''}`}>
                        <span className={`ep-status-dot ${p.lastVisit ? 'dot-active' : 'dot-new'}`}></span>
                        {p.lastVisit ? 'Active' : 'New'}
                      </div>
                    </div>
                    <div className="ep-subtext">
                      <span className="icon-blue-light-flex-items-center">
                        <User size={12} className="icon-blue mr-1" /> {p.gender || 'Unknown'}
                      </span>
                      <span className="ep-dot">•</span>
                      <span className="icon-emerald-flex-items-center">
                        <CalendarIcon size={12} className="icon-amber mr-1" /> {p.age > 0 ? `${p.age} Yrs` : 'N/A'}
                      </span>
                      <span className="ep-dot">•</span>
                      <span className="icon-f87171-flex-items-center">
                        <Droplets size={12} className="icon-red mr-1" /> {p.bloodGroup || '--'}
                      </span>
                      <span className="ep-dot">•</span>
                      <span className="icon-amber-flex-items-center">
                        <Ruler size={12} /> {p.height ? `${p.height} cm` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ep-details-grid">
                  {/* 1. Patient ID (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon icon-purple"><Hash size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Patient ID</span>
                      <span className="ep-d-val">{p.patientCode || 'PT-' + p.id.substring(0, 6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* 2. Contact (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon icon-blue-light"><Phone size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Contact</span>
                      <span className="ep-d-val">{p.phone || 'N/A'}</span>
                    </div>
                  </div>

                  {/* 3. Address (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon icon-14b8a6"><FileText size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Address</span>
                      <span className="ep-d-val">{p.address || '--'}</span>
                    </div>
                  </div>

                  {/* 4. Last Diagnosis (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon icon-purple"><ClipboardList size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Last Diagnosis</span>
                      <span className="ep-d-val">{p.lastDiagnosis || '--'}</span>
                    </div>
                  </div>

                  {/* 4.5. Last Symptom (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon icon-red"><Activity size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Last Symptom</span>
                      <span className="ep-d-val">{p.lastSymptoms || '--'}</span>
                    </div>
                  </div>

                  {/* 5. Total Visits (Half) */}
                  <div className="ep-detail-item">
                    <div className="ep-detail-icon icon-emerald"><FileText size={14} /></div>
                    <div className="ep-detail-text">
                      <span className="ep-d-label">Visits</span>
                      <span className="ep-d-val">{p.totalVisits || 0} Total</span>
                    </div>
                  </div>

                  {/* 6. Next Visit (Half) */}
                  {p.nextVisit && (
                    <div className="ep-detail-item">
                      <div className="ep-detail-icon icon-pink-1"><CalendarIcon size={14} /></div>
                      <div className="ep-detail-text">
                        <span className="ep-d-label">Next Visit</span>
                        <span className="ep-d-val">{formatDate(p.nextVisit)}</span>
                      </div>
                    </div>
                  )}

                  {/* Remaining Items */}
                  {(p.emergencyContactName || p.emergencyContactPhone) && (
                    <div className="ep-detail-item">
                      <div className="ep-detail-icon icon-rose"><Phone size={14} /></div>
                      <div className="ep-detail-text">
                        <span className="ep-d-label">Emergency</span>
                        <span className="ep-d-val">{p.emergencyContactName ? `${p.emergencyContactName} - ` : ''}{p.emergencyContactPhone || ''}</span>
                      </div>
                    </div>
                  )}
                  {p.preExistingConditions && (
                    <div className="ep-detail-item">
                      <div className="ep-detail-icon icon-red"><Activity size={14} /></div>
                      <div className="ep-detail-text">
                        <span className="ep-d-label">Pre-existing</span>
                        <span className="ep-d-val">{p.preExistingConditions.split(',').map((t:any) => t.trim()).join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ep-footer">
                  <div className="ep-last-visit flex-items-center-1">
                    <History size={14} className="icon-slate mr-1-5" /> Last Visit: <span className="ml-1-5">{p.lastVisit ? formatDate(p.lastVisit) : 'None'}</span>
                  </div>
                  <div className="ep-footer-actions">
                    <button className="ep-edit-btn" onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); setIsEditingProfile(true); setIsEditingFromCard(true); }}>
                      <Edit size={16} className="mr-1-5" /> Edit Profile
                    </button>
                    <button className="ep-consult-btn" onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); setWorkspaceTab('history'); }}>
                      <Stethoscope size={16} className="icon-sky mr-1-5" /> Consult
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="pro-pagination-container">
              <div className="pro-pagination-info">
                Showing <span className="pro-font-medium">{(page - 1) * limit + 1}</span> to <span className="pro-font-medium">{Math.min(page * limit, totalCount)}</span> of <span className="pro-font-medium">{totalCount}</span> results
              </div>
              
              <div className="pro-pagination-actions">
                {totalPages > 1 && (
                  <nav className="pro-pagination-nav" aria-label="Pagination">
                    <button 
                      className="pro-pagination-btn" 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      title="Previous"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        className={`pro-pagination-page ${page === num ? 'active' : ''}`}
                        onClick={() => setPage(num)}
                      >
                        {num}
                      </button>
                    ))}

                    <button 
                      className="pro-pagination-btn" 
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      title="Next"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </nav>
                )}
              </div>
            </div>
          )}

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
              <button className="btn-cancel" onClick={() => setMessagingPatient(null)}><X size={14} color="#f43f5e" className="mr-1" /> Cancel</button>
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
          onClose={handleCloseEditModal} maxWidth="540px">
          <div className="modal-body">
            <p className="color-var-text-secondary-fs-0-9">
              Update patient information.
            </p>

            <div className="form-group">
              <label className="form-label flex-items-center">
                <User size={14} className="mr-1-5 icon-blue" /> Full Name <span className="color-var-danger">*</span>
              </label>
              <input className="form-input" type="text" placeholder="e.g. John Doe"
                value={editName} onChange={e => setEditName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label flex-items-center">
                <Smartphone size={14} className="mr-1-5 icon-green" /> WhatsApp Number <span className="color-var-danger">*</span>
              </label>
              <input className="form-input" type="tel" placeholder="+1 (555) 000-0000"
                value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label flex-items-center">
                <MapPin size={14} className="mr-1-5 icon-violet" /> Address
              </label>
              <input className="form-input" type="text" placeholder="Full address"
                value={editAddress} onChange={e => setEditAddress(e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label flex-items-center">
                  <CalendarIcon size={14} className="mr-1-5 icon-amber" /> Age
                </label>
                <input className="form-input" type="number" min="0" placeholder="e.g. 34"
                  value={editAge} onChange={e => setEditAge(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label flex-items-center">
                  <Users size={14} className="mr-1-5 icon-pink-dark" /> Gender
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
                <label className="form-label flex-items-center">
                  <Ruler size={14} className="mr-1-5 icon-indigo" /> Height (cm)
                </label>
                <input className="form-input" type="number" min="0" placeholder="e.g. 175"
                  value={editHeight} onChange={e => setEditHeight(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <Droplets size={14} className="mr-1-5 icon-red" /> Blood Group
                </label>
                <input className="form-input" type="text" placeholder="e.g. O+"
                  value={editBloodGroup} onChange={e => setEditBloodGroup(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <PhoneCall size={14} className="mr-1-5 icon-rose" /> Emg. Contact Name
                </label>
                <input className="form-input" type="text" placeholder="e.g. Jane Doe"
                  value={editEmergencyContactName} onChange={e => setEditEmergencyContactName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label flex-items-center-1">
                  <PhoneCall size={14} className="mr-1-5 icon-rose" /> Emg. Contact Phone
                </label>
                <input className="form-input" type="tel" placeholder="e.g. 9876543210"
                  value={editEmergencyContactPhone} onChange={e => setEditEmergencyContactPhone(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label flex-items-center-1">
                <Activity size={14} className="mr-1-5 icon-orange" /> Pre-existing Diseases (comma-separated)
              </label>
              <input className="form-input" type="text" placeholder="e.g. Diabetes, Hypertension"
                value={editPreExistingConditions} onChange={e => setEditPreExistingConditions(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleCloseEditModal}><X size={14} color="#f43f5e" className="mr-1" /> Cancel</button>
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
                <X size={14} color="#f43f5e" className="mr-1" /> Cancel
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
