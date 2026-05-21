import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Phone, Calendar as CalendarIcon, UserPlus, MessageSquare,
  History, CalendarPlus, Send, X, ArrowLeft, Building2, Edit, Check,
  Trash2, Download, Plus, FileText, Bell, BellOff, CheckCircle, ClipboardList,
  Droplets, HeartPulse, Upload, ChevronRight, Activity, Save, Edit2
} from 'lucide-react';
import PageHeader from '../../../components/UI/PageHeader';
import Modal from '../../../components/Modal';
import { useAuthStore } from '../../../stores/authStore';
import { branchService } from '../../../services/branchService';
import { notify } from '../../../stores/notificationStore';
import api from '../../../services/api';
import './PatientsList.css';

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
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editChronicTags, setEditChronicTags] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Active Consultation State (Doctor's Main View)
  const [visitDoctorId, setVisitDoctorId] = useState('');
  const [visitSymptoms, setVisitSymptoms] = useState('');
  const [visitDiagnosis, setVisitDiagnosis] = useState('');
  const [visitAdvice, setVisitAdvice] = useState('');
  const [visitInternalNotes, setVisitInternalNotes] = useState('');
  const [visitFollowUpDate, setVisitFollowUpDate] = useState('');
  const [visitFollowUpInstructions, setVisitFollowUpInstructions] = useState('');
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
      setEditAge(selectedPatient.age || '');
      setEditGender(selectedPatient.gender || '');
      setEditBloodGroup(selectedPatient.bloodGroup || '');
      setEditChronicTags(selectedPatient.chronicTags || '');
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
        age: editAge, gender: editGender, bloodGroup: editBloodGroup, chronicTags: editChronicTags,
      });
      setSelectedPatient((prev: any) => ({ ...prev, ...r.data }));
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      notify.success('Saved', 'Patient profile updated.');
      setIsEditingProfile(false);
    } catch { notify.danger('Error', 'Failed to update profile.'); }
    finally { setIsSavingProfile(false); }
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatient || !visitDoctorId) { notify.warning('Required', 'Please select a doctor.'); return; }
    setIsSavingVisit(true);
    try {
      let visitId: string;
      if (editingVisitId) {
        await api.put(`/patientclinical/visits/${editingVisitId}`, {
          symptoms: visitSymptoms,
          diagnosis: visitDiagnosis,
          advice: visitAdvice,
          internalNotes: visitInternalNotes,
          followUpDate: visitFollowUpDate ? new Date(visitFollowUpDate).toISOString() : null,
          followUpInstructions: visitFollowUpInstructions || null,
          medicines: visitMedicines,
        });
        visitId = editingVisitId;
      } else {
        const res = await api.post(`/patientclinical/${selectedPatient.id}/visits`, {
          doctorId: visitDoctorId,
          symptoms: visitSymptoms,
          diagnosis: visitDiagnosis,
          advice: visitAdvice,
          internalNotes: visitInternalNotes,
          followUpDate: visitFollowUpDate ? new Date(visitFollowUpDate).toISOString() : null,
          followUpInstructions: visitFollowUpInstructions || null,
          medicines: visitMedicines,
        });
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
      notify.success('Saved', 'Consultation notes saved successfully.');
      
      // Clear form
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
          <div className="ehr-banner-compact">
            <div className="ehr-banner-left">
              <button className="btn-back-icon" onClick={() => setSelectedPatient(null)} title="Back to Directory">
                <ArrowLeft size={18} />
              </button>
              <div className="ehr-avatar-sm">{selectedPatient.name.charAt(0)}</div>
              <div className="ehr-patient-info">
                <div className="ehr-patient-title-row">
                  <h2 className="ehr-patient-name">{selectedPatient.name}</h2>
                  <span className="ehr-code-badge">{patientCode}</span>
                  <button className="btn-icon-ghost" onClick={() => setIsEditingProfile(true)} title="Edit Profile">
                    <Edit size={14} />
                  </button>
                </div>
                <div className="ehr-vitals-inline">
                  <span className="vital-text">{selectedPatient.gender || 'No Gender'}</span>
                  <span className="vital-dot">•</span>
                  <span className="vital-text">{selectedPatient.age || 'No Age'}</span>
                  {selectedPatient.bloodGroup && (
                    <>
                      <span className="vital-dot">•</span>
                      <span className="vital-text blood-group"><Droplets size={10} /> {selectedPatient.bloodGroup}</span>
                    </>
                  )}
                  {selectedPatient.chronicTags && selectedPatient.chronicTags.split(',').map((t: string) => (
                    <span key={t} className="chronic-tag-sm">{t.trim()}</span>
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
            <div className="workspace-main panel-glass">
              <div className="panel-header">
                <div className="panel-title">
                  <Activity size={18} className="text-accent" />
                  <h3>{editingVisitId ? 'Edit Consultation' : 'Active Consultation'}</h3>
                </div>
              </div>

              <div className="consult-form">
                <div className="form-group">
                  <label className="form-label">Consulting Doctor</label>
                  <select className="form-select" value={visitDoctorId} onChange={e => setVisitDoctorId(e.target.value)}>
                    <option value="">— Select Doctor —</option>
                    {doctors?.map((d: any) => (
                      <option key={d.id} value={d.id}>Dr. {d.name} · {d.specialization}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Symptoms / Complaints</label>
                    <textarea className="form-textarea" placeholder="What is the patient experiencing?" rows={2}
                      value={visitSymptoms} onChange={e => setVisitSymptoms(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diagnosis</label>
                    <textarea className="form-textarea" placeholder="Clinical diagnosis..." rows={2}
                      value={visitDiagnosis} onChange={e => setVisitDiagnosis(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Advice & Treatment Plan</label>
                  <textarea className="form-textarea" placeholder="Instructions, diet, rest..." rows={2}
                    value={visitAdvice} onChange={e => setVisitAdvice(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Private Notes (Doctor Only)</label>
                  <input type="text" className="form-input notes-field" placeholder="Confidential observations..." 
                    value={visitInternalNotes} onChange={e => setVisitInternalNotes(e.target.value)} />
                </div>

                <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label className="form-label" style={{ marginBottom: '12px' }}><Upload size={14} style={{ marginRight: '6px' }}/>Attach Documents for this Visit</label>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <select className="form-select" style={{ width: '140px' }} value={stagingCategory} onChange={e => setStagingCategory(e.target.value)}>
                      <option value="Lab Report">Lab Report</option>
                      <option value="X-Ray">X-Ray</option>
                      <option value="MRI Scan">MRI Scan</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Other">Other</option>
                    </select>
                    <input 
                      type="file" 
                      className="form-input" 
                      style={{ flex: 1, minWidth: '200px' }}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {existingAttachments.map((item: any) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14, 165, 233, 0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                          <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>[{item.category}]</span>
                            <a href={`${getFileBaseUrl()}${item.fileUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{item.fileName}</a>
                          </div>
                          <button className="btn-del-icon" style={{ padding: '4px' }} onClick={async () => {
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
                        <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14, 165, 233, 0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                          <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>[{item.category}]</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{item.file.name}</span>
                          </div>
                          <button className="btn-del-icon" style={{ padding: '4px' }} onClick={() => {
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
                  <div className="section-header">
                    <h4><HeartPulse size={15} className="text-accent" /> Prescription</h4>
                    <button className="btn-add-sm" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: '', dosage: '' }])}>
                      <Plus size={12} /> Add Custom
                    </button>
                  </div>

                  <div className="med-chip-container">
                    <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Paracetamol 650mg', dosage: '1-0-1' }])}>+ Paracetamol</div>
                    <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Amoxicillin 500mg', dosage: '1-0-1 x 5 Days' }])}>+ Amoxicillin</div>
                    <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Pantoprazole 40mg', dosage: '1-0-0 Before Food' }])}>+ Pantoprazole</div>
                    <div className="med-chip" onClick={() => setVisitMedicines([...visitMedicines, { medicineName: 'Cough Syrup', dosage: '2 tsp x 3 times' }])}>+ Cough Syrup</div>
                  </div>

                  <div className="rx-list">
                    {visitMedicines.length === 0 ? (
                      <div className="rx-empty">No medicines prescribed yet. Use quick-add chips above or add custom.</div>
                    ) : (
                      visitMedicines.map((m, i) => (
                        <div key={i} className="rx-row">
                          <input className="form-input rx-name" type="text" placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                            value={m.medicineName} onChange={e => { const u = [...visitMedicines]; u[i].medicineName = e.target.value; setVisitMedicines(u); }} />
                          <input className="form-input rx-dosage" type="text" placeholder="Dosage (e.g. 1-0-1 x 3 Days)"
                            value={m.dosage} onChange={e => { const u = [...visitMedicines]; u[i].dosage = e.target.value; setVisitMedicines(u); }} />
                          <button className="btn-del-icon" onClick={() => setVisitMedicines(visitMedicines.filter((_, j) => j !== i))}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Next Follow-up Date (Optional)</label>
                  <input type="date" className="form-input" style={{ width: '200px' }}
                    value={visitFollowUpDate} onChange={e => setVisitFollowUpDate(e.target.value)} />
                </div>

                {visitFollowUpDate && (
                  <div className="form-group slide-down instruction-box-premium">
                    <label className="form-label" style={{ color: 'var(--accent-color)' }}>📝 Patient Instructions (Sent via WhatsApp)</label>
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

              <div className="panel-footer" style={{ display: 'flex', gap: '12px' }}>
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
            <div className="workspace-sidebar panel-glass">
              <div className="sidebar-tabs">
                <button className="sb-tab active">
                  History {clinicalVisits?.length > 0 && <span>({clinicalVisits.length})</span>}
                </button>
              </div>

              <div className="sidebar-content">
                
                {workspaceTab === 'history' && (
                  <div className="history-pane">
                    {isVisitsLoading ? (
                      <div className="compact-timeline" style={{ paddingTop: '10px' }}>
                        <div className="skeleton-box skeleton-block"></div>
                        <div className="skeleton-box skeleton-block" style={{ opacity: 0.6 }}></div>
                        <div className="skeleton-box skeleton-block" style={{ opacity: 0.3 }}></div>
                      </div>
                    ) : !clinicalVisits?.length ? (
                      <div className="ehr-state-sm">No past visits found.</div>
                    ) : (
                      <div className="compact-timeline">
                        {clinicalVisits.map((v: any, index: number) => (
                          <div key={v.id} className="ct-item">
                            <div className="ct-date">{formatDate(v.visitDate)}</div>
                            <div className="ct-card">
                              <div className="ct-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span>Dr. {v.doctorName} {v.tokenId && <span className="ct-badge">Queue</span>}</span>
                                {index === 0 && (
                                  <button className="btn-icon-ghost" style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} onClick={() => handleEditVisit(v)} title="Edit Consultation">
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </div>
                              {v.diagnosis && <div className="ct-text"><strong>Dx:</strong> {v.diagnosis}</div>}
                              {v.symptoms && <div className="ct-text"><strong>Sx:</strong> {v.symptoms}</div>}
                              {v.advice && <div className="ct-text"><strong>Advice/Plan:</strong> {v.advice}</div>}
                              {v.internalNotes && <div className="ct-text" style={{ color: 'var(--accent-color)' }}><strong>Private Note:</strong> {v.internalNotes}</div>}
                              {v.followUpDate && (
                                <div className="ct-text" style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: '6px', marginTop: '4px' }}>
                                  <div><strong>Next Follow-up:</strong> {formatDate(v.followUpDate)}</div>
                                  {v.followUpInstructions && <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📝 {v.followUpInstructions}</div>}
                                </div>
                              )}
                              {v.medicines?.length > 0 && (
                                <div className="ct-rx">
                                  {v.medicines.map((m:any) => <div key={m.id}>• {m.medicineName} ({m.dosage})</div>)}
                                </div>
                              )}
                              {v.attachments?.length > 0 && (
                                <div className="ct-attachments" style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {v.attachments.map((a:any) => (
                                    <a key={a.id} href={`${getFileBaseUrl()}${a.fileUrl}`} target="_blank" rel="noreferrer" 
                                       style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', color: 'var(--accent-color)', fontWeight: 600, transition: '0.2s' }}>
                                      <FileText size={12} style={{ marginRight: '6px' }} /> [{a.category}] {a.fileName}
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
                                  <div className="ct-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>These documents were uploaded separately from any consultation.</div>
                                  <div className="ct-attachments" style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {unlinkedAttachments.map((a:any) => (
                                      <a key={a.id} href={`${getFileBaseUrl()}${a.fileUrl}`} target="_blank" rel="noreferrer" 
                                         style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', color: 'var(--accent-color)', fontWeight: 600, transition: '0.2s' }}>
                                        <FileText size={12} style={{ marginRight: '6px' }} /> [{a.category}] {a.fileName}
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
          <div className="patients-header-actions">
            <div className="search-input-wrapper">
              <div className="search-input-container">
                <Search size={15} className="search-icon-pos" />
                <input type="text" placeholder="Search by name or phone..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="search-input-field" />
              </div>
            </div>
            <button className="btn-primary"
              onClick={() => navigate('/dashboard?action=book')}>
              <UserPlus size={15} /> New Patient
            </button>
          </div>

          <div className="divider-light" />

          <div className="patients-bento-grid">
            {isLoading ? (
              <div className="empty-table-wrapper" style={{ gridColumn: '1 / -1' }}>
                <div className="spinner-ring" /><span>Loading...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="empty-table-wrapper" style={{ gridColumn: '1 / -1' }}>
                <Users size={32} /><span>No patients found.</span>
              </div>
            ) : filteredPatients.map((p: any) => (
              <div key={p.id} className="patient-bento-card">
                <div className="pb-header">
                  <div className="pb-avatar">{p.name.charAt(0)}</div>
                  <span className="pb-id">{p.patientCode || 'PT-' + p.id.substring(0, 6).toUpperCase()}</span>
                </div>
                
                <div className="pb-info">
                  <div className="pb-name">{p.name}</div>
                  <div className="pb-phone"><Phone size={11} /> {p.phone}</div>
                  <div className="pb-stats-row">
                    {p.age > 0 && <span className="pb-pill">{p.age} Yrs</span>}
                    {p.gender && <span className={`pb-pill gender`}>{p.gender.charAt(0)}</span>}
                    {p.bloodGroup && <span className="pb-pill blood">{p.bloodGroup}</span>}
                  </div>
                </div>

                <div className="pb-footer">
                  <div className="pb-time">
                    {p.lastVisit ? `Last Visit: ${formatDate(p.lastVisit)}` : `Reg: ${formatDate(p.createdAt)}`}
                  </div>
                  <div className="actions-wrapper">
                    <button className="action-btn-ghost" data-tooltip="WhatsApp"
                      onClick={() => { setMessagingPatient(p); setMessageText(''); }}>
                      <MessageSquare size={14} />
                    </button>
                    <button className="pb-action" data-tooltip="Consult"
                      onClick={() => { setSelectedPatient(p); setWorkspaceTab('history'); }}>
                      Consult
                    </button>
                  </div>
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
          onClose={() => setIsEditingProfile(false)} maxWidth="480px">
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-input" type="text" placeholder="e.g. 34 Years"
                  value={editAge} onChange={e => setEditAge(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={editGender} onChange={e => setEditGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <input className="form-input" type="text" placeholder="e.g. O+"
                value={editBloodGroup} onChange={e => setEditBloodGroup(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Chronic Conditions (comma-separated)</label>
              <input className="form-input" type="text" placeholder="e.g. Diabetes, Hypertension"
                value={editChronicTags} onChange={e => setEditChronicTags(e.target.value)} />
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
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
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
    </div>
  );
};

export default PatientsList;
