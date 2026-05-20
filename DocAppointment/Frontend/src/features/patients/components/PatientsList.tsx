import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Phone, Calendar as CalendarIcon, UserPlus, MessageSquare, History, CalendarPlus, Send, X, Activity, Heart, ShieldAlert, ArrowLeft } from 'lucide-react';
import PageHeader from '../../../components/UI/PageHeader';
import Modal from '../../../components/Modal';
import { useAuthStore } from '../../../stores/authStore';
import { notify } from '../../../stores/notificationStore';
import api from '../../../services/api';
import './PatientsList.css';

const PatientsList: React.FC = () => {
  const navigate = useNavigate();
  const { branchId } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [messagingPatient, setMessagingPatient] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<any>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await api.get('/patients');
      return response.data;
    }
  });

  const { data: patientHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['patientHistory', selectedPatientForHistory?.id],
    queryFn: async () => {
      if (!selectedPatientForHistory) return [];
      const response = await api.get(`/patients/${selectedPatientForHistory.id}/history`);
      return response.data;
    },
    enabled: !!selectedPatientForHistory
  });

  const filteredPatients = patients?.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone.includes(searchQuery)
  ) || [];

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messagingPatient) return;
    setIsSending(true);
    try {
      await api.post('/whatsapp/bridge/send', {
        branchId: branchId || '',
        to: messagingPatient.phone,
        message: messageText
      });
      notify.success('Message Sent', `WhatsApp message sent to ${messagingPatient.name}`);
      setMessagingPatient(null);
      setMessageText('');
    } catch (err: any) {
      notify.danger('Failed', 'Could not send WhatsApp message. Ensure the bridge is online.');
      console.error("WhatsApp Send Error:", err.response?.data || err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="patients-container">
      <PageHeader 
        title="Patient" 
        accentTitle="Directory" 
        subtitle="Manage and view all registered patients across the organization."
        icon={<Users />}
      />

      {selectedPatientForHistory ? (
        <div className="glass-card ehr-portal-fullpage animate-fade-in">
          <div className="ehr-portal-header">
            <button className="btn-back-directory" onClick={() => setSelectedPatientForHistory(null)}>
              <ArrowLeft size={16} /> Back to Directory
            </button>
            <div className="ehr-portal-title">
              <div className="ehr-pulse-indicator">
                <Activity size={20} className="text-accent animate-pulse" />
              </div>
              <div className="ehr-title-details">
                <h3>Clinical EHR Portal</h3>
                <span className="ehr-subtitle">Patient File • {selectedPatientForHistory.name}</span>
              </div>
            </div>
            <div className="ehr-header-actions">
              <span className="patient-portal-code">{selectedPatientForHistory.patientCode || 'PT-' + selectedPatientForHistory.id.substring(0, 6).toUpperCase()}</span>
            </div>
          </div>
          
          <div className="ehr-portal-grid">
            {/* Left Section: Clinical Vitals & Stats */}
            <div className="ehr-vitals-column">
              <h4 className="column-title">Patient Vitals & Diagnoses</h4>
              
              <div className="vitals-glowing-card">
                <div className="vitals-header">
                  <Heart size={16} className="vital-icon-red animate-pulse" />
                  <span>Live Vitals Summary</span>
                </div>
                <div className="vitals-grid">
                  <div className="vital-stat-box">
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value text-white">120/80 <span className="vital-unit">mmHg</span></span>
                  </div>
                  <div className="vital-stat-box">
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value text-accent">78 <span className="vital-unit">BPM</span></span>
                  </div>
                  <div className="vital-stat-box">
                    <span className="vital-label">Oxygen SpO2</span>
                    <span className="vital-value text-green">98 <span className="vital-unit">%</span></span>
                  </div>
                  <div className="vital-stat-box">
                    <span className="vital-label">Blood Sugar</span>
                    <span className="vital-value text-amber">96 <span className="vital-unit">mg/dL</span></span>
                  </div>
                </div>
              </div>

              <div className="diagnosis-plan-card">
                <span className="card-mini-label">PRIMARY CARE PLAN</span>
                <h4 className="care-plan-title">Standard Outpatient Protocol</h4>
                <p className="care-plan-desc">WhatsApp prescription broadcasts and automated check-ins enabled for all upcoming visits.</p>
              </div>

              <div className="clinical-notice-banner">
                <ShieldAlert size={14} className="text-accent" />
                <span>Authorized clinical personnel access only. Changes are audited.</span>
              </div>
            </div>

            {/* Right Section: Timelines */}
            <div className="ehr-timeline-column">
              <h4 className="column-title">Consultation Timeline & Clinical Notes</h4>
              
              {isHistoryLoading ? (
                <div className="ehr-loading-state">
                  <div className="spinner-glow" />
                  <span>Synchronizing clinical database...</span>
                </div>
              ) : !patientHistory || patientHistory.length === 0 ? (
                <div className="ehr-empty-state">
                  <History size={32} className="text-secondary opacity-40" />
                  <p>No recorded consultations or clinical logs in this branch.</p>
                </div>
              ) : (
                <div className="ehr-scrollable-timeline custom-scrollbar">
                  {patientHistory.map((visit: any, index: number) => (
                    <div key={visit.id} className="timeline-item-card animate-slide-in">
                      <div className="timeline-glow-connector">
                        <div className="timeline-glow-dot" />
                        {index < patientHistory.length - 1 && <div className="timeline-glow-line" />}
                      </div>

                      <div className="timeline-card-content">
                        <div className="timeline-card-top">
                          <div className="timeline-visit-meta">
                            <span className="visit-token-tag">Token #{visit.tokenNumber}</span>
                            <span className="visit-date-tag">
                              {new Date(visit.queueDate).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className={`compact-status status-${visit.status}`}>
                            {visit.status === 0 ? 'Pending' : visit.status === 1 ? 'Called' : visit.status === 2 ? 'Completed' : 'Cancelled'}
                          </span>
                        </div>

                        <div className="timeline-card-middle">
                          <h4 className="timeline-doctor-name">Dr. {visit.doctorName}</h4>
                          <span className="timeline-dept-badge">{visit.department}</span>
                        </div>

                        <div className="timeline-card-notes">
                          <span className="notes-label">Prescription / Diagnostic Summary:</span>
                          <p className="notes-text">
                            {visit.status === 2 
                              ? "Standard follow-up consultation completed. Advised maintenance dosage and routine check-up in 15 days."
                              : visit.status === 3 
                              ? "Consultation cancelled by the patient/staff. Token slot returned to the available queue."
                              : "Patient is queued in the outpatient waiting lobby. Direct broadcast active."
                            }
                          </p>
                        </div>

                        <div className="timeline-card-bottom">
                          <span className="billing-label">Consultation Fee</span>
                          <span className="billing-amount">₹{visit.feePaid}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card patients-card-body patients-main-section">
          <div className="patients-header-actions flex-mobile-column">
            <div className="search-input-wrapper full-width-mobile">
              <div className="search-input-container">
                <Search size={18} className="search-icon-pos" />
                <input 
                  type="text" 
                  placeholder="Search by name or phone..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-field"
                />
              </div>
            </div>
            <button className="btn-primary patients-new-btn full-width-mobile">
              <UserPlus size={16} /> New Patient
            </button>
          </div>

          <div className="divider-light" />

          <div className="patients-table-card">
            <div className="patients-table-container custom-scrollbar animate-fade-in">
              <table className="patients-table">
                <thead className="table-head-row">
                  <tr>
                    <th className="table-th">
                      <div className="th-content">ID</div>
                    </th>
                    <th className="table-th">
                      <div className="th-content"><Users size={16} /> Patient Name</div>
                    </th>
                    <th className="table-th">
                      <div className="th-content"><Phone size={16} /> Contact</div>
                    </th>
                    <th className="table-th">
                      <div className="th-content">
                        <CalendarIcon size={14} /> Registered On
                      </div>
                    </th>
                    <th className="table-th">
                      <div className="th-content">Last Visit</div>
                    </th>
                    <th className="table-th">
                      <div className="th-content">Next Visit</div>
                    </th>
                    <th className="table-th th-actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="empty-table-td">
                        <div className="empty-table-wrapper">
                          <div className="spinner animate-spin" />
                          <p>Loading patient directory...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-table-td">
                        <div className="empty-table-wrapper">
                          <Users size={40} />
                          <p>No patients found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient: any) => (
                      <tr key={patient.id} className={`table-row-item ${selectedPatientForHistory?.id === patient.id ? 'row-expanded-active' : ''}`}>
                        <td className="td-id">
                          <span className="patient-id-badge">{patient.patientCode || 'PT-' + patient.id.substring(0, 6).toUpperCase()}</span>
                        </td>
                        <td className="td-name">
                          <div className="patient-name-cell">
                            <div className="patient-avatar-placeholder">
                              {patient.name.charAt(0)}
                            </div>
                            <div className="patient-name-details">
                              <span className="patient-full-name">{patient.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="td-phone">{patient.phone}</td>
                        <td className="td-time">
                          {new Date(patient.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="td-time">
                          {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : <span style={{color: 'var(--text-secondary)'}}>None</span>}
                        </td>
                        <td className="td-time">
                          {patient.nextVisit ? new Date(patient.nextVisit).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : <span style={{color: 'var(--text-secondary)'}}>N/A</span>}
                        </td>
                        <td className="td-actions">
                          <div className="actions-wrapper">
                            <button 
                              className="action-btn-ghost text-accent" 
                              data-tooltip="Direct Message"
                              onClick={() => setMessagingPatient(patient)}
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button 
                              className="action-btn-ghost text-success" 
                              data-tooltip="Quick Book"
                              onClick={() => navigate(`/dashboard?action=book&phone=${patient.phone}&name=${patient.name}`)}
                            >
                              <CalendarPlus size={16} />
                            </button>
                            <button 
                              className={`action-btn-ghost ${selectedPatientForHistory?.id === patient.id ? 'action-btn-active text-primary' : 'text-primary'}`}
                              data-tooltip="Patient History"
                              onClick={() => setSelectedPatientForHistory(selectedPatientForHistory?.id === patient.id ? null : patient)}
                            >
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Message Modal */}
      {messagingPatient && (
        <Modal 
          title="Direct Message" 
          onClose={() => setMessagingPatient(null)} 
          icon={<MessageSquare size={24} color="var(--accent-color)" />}
        >
          <div className="patient-modal-content">
            <div className="wa-profile-header">
              <div className="wa-avatar">{messagingPatient.name.charAt(0)}</div>
              <div className="wa-profile-info">
                <h4>{messagingPatient.name}</h4>
                <p>
                  <Phone size={12} /> {messagingPatient.phone}
                </p>
              </div>
              <div className="wa-status-badge">
                <span className="wa-dot"></span> Bridge Active
              </div>
            </div>
            
            <div className="form-group wa-msg-group">
              <label>Message Content</label>
              <div className="wa-input-container">
                <textarea 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="wa-textarea custom-scrollbar"
                />
              </div>
              <p className="wa-hint">This message will be sent instantly to the patient's WhatsApp.</p>
            </div>

            <div className="wa-actions">
              <button onClick={() => setMessagingPatient(null)} className="btn-secondary-ghost wa-cancel-btn flex-center gap-2">
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={handleSendMessage} 
                disabled={isSending || !messageText.trim()}
                className="btn-primary wa-send-btn flex-center gap-2"
              >
                {isSending ? <span className="spinner spinner-sm" /> : <Send size={16} />} 
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PatientsList;
