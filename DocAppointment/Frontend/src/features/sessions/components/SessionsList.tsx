import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorService } from '../../../services/doctorService';
import { sessionService } from '../../../services/sessionService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import { 
  Plus, Clock, Calendar, User, Trash2, X, 
  AlertTriangle, Users, Hash,  ListOrdered, Edit, Building2
, Save } from 'lucide-react';
import Modal from '../../../components/Modal';
import { notify } from '../../../stores/notificationStore';
import PageHeader from '../../../components/UI/PageHeader';
import './SessionsList.css';

const SessionFormFields: React.FC<{ data: any; onChange: (v: any) => void }> = ({ data, onChange }) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return (
    <>
      <div className="recurrence-toggle-grid">
        {/* Daily Card */}
        <div 
          onClick={() => onChange({...data, isDaily: true})}
          className={`recurrence-card ${data.isDaily ? 'recurrence-card-active' : ''}`}
        >
          <div className="recurrence-icon">
            <Clock size={20} />
          </div>
          <span className="recurrence-label">Daily</span>
          <span className="recurrence-desc">Available every day</span>
        </div>

        {/* Specific Day Card */}
        <div 
          onClick={() => onChange({...data, isDaily: false})}
          className={`recurrence-card ${!data.isDaily ? 'recurrence-card-active' : ''}`}
        >
          <div className="recurrence-icon">
            <Calendar size={20} />
          </div>
          <span className="recurrence-label">Specific Day</span>
          <span className="recurrence-desc">Once per week</span>
        </div>
      </div>

      {!data.isDaily && (
        <div className="form-field-group">
          <label data-tooltip="Day of the week this professional is available" className="form-label">
            <Calendar size={16} /> Day of Week
          </label>
          <select 
            value={data.dayOfWeek} 
            onChange={(e) => onChange({...data, dayOfWeek: parseInt(e.target.value)})} 
            className="form-select"
          >
            {days.map((day, index) => <option key={index} value={index}>{day}</option>)}
          </select>
        </div>
      )}

      <div className="form-field-group">
        <label data-tooltip="Identify this shift (e.g. Evening Clinic, Emergency)" className="form-label">
          <ListOrdered size={16} color="#0ea5e9" /> Session Name
        </label>
        <input type="text" value={data.sessionName} onChange={(e) => onChange({...data, sessionName: e.target.value})} placeholder="e.g. Morning OPD" required />
      </div>
      <div className="form-input-row grid-stats">
        <div>
          <label data-tooltip="Start time of the session" className="form-label">
            <Clock size={16} color="#10b981" /> Start Time
          </label>
          <input type="time" value={data.startTime.substring(0, 5)} onChange={(e) => onChange({...data, startTime: e.target.value})} required />
        </div>
        <div>
          <label data-tooltip="End time of the session" className="form-label">
            <Clock size={16} color="#10b981" /> End Time
          </label>
          <input type="time" value={data.endTime.substring(0, 5)} onChange={(e) => onChange({...data, endTime: e.target.value})} required />
        </div>
      </div>
      <div className="form-field-group mb-25">
        <label data-tooltip="Maximum number of tokens allowed per session" className="form-label">
          <Hash size={16} color="#8b5cf6" /> Token Capacity
        </label>
        <input type="number" value={data.defaultCapacity} onChange={(e) => onChange({...data, defaultCapacity: parseInt(e.target.value)})} required />
      </div>
    </>
  );
};

const SessionsList: React.FC = () => {
  const { branchId: globalBranchId, orgId, role, setBranch } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors', selectedBranchId],
    queryFn: () => doctorService.getDoctors(selectedBranchId),
    enabled: !!selectedBranchId
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', selectedDoctorId],
    queryFn: () => sessionService.getSessions(selectedDoctorId),
    enabled: !!selectedDoctorId
  });

  const [newSession, setNewSession] = useState({
    sessionName: '',
    dayOfWeek: 1,
    isDaily: true,
    startTime: '09:00',
    endTime: '13:00',
    defaultCapacity: 30
  });

  const handleBranchChange = (id: string) => {
    setSelectedBranchId(id);
    setBranch(id);
    setSelectedDoctorId('');
  };

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => sessionService.createSession({ 
      ...data, 
      doctorId: selectedDoctorId,
      branchId: selectedBranchId,
      startTime: data.startTime.length === 5 ? data.startTime + ":00" : data.startTime,
      endTime: data.endTime.length === 5 ? data.endTime + ":00" : data.endTime
    }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      notify.success('Shift Created', `"${variables.sessionName}" shift has been added.`);
      setIsModalOpen(false);
      setNewSession({ sessionName: '', dayOfWeek: 1, isDaily: true, startTime: '09:00', endTime: '13:00', defaultCapacity: 30 });
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: (data: any) => sessionService.updateSession(data.id, {
      ...data,
      startTime: data.startTime.length === 5 ? data.startTime + ":00" : data.startTime,
      endTime: data.endTime.length === 5 ? data.endTime + ":00" : data.endTime
    }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      notify.info('Shift Updated', `"${variables.sessionName}" shift has been updated.`);
      setEditingSession(null);
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => sessionService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      notify.warning('Shift Deleted', 'A doctor shift was removed from the schedule.');
      setDeletingSessionId(null);
    }
  });

  const confirmDelete = () => {
    if (deletingSessionId) {
      deleteSessionMutation.mutate(deletingSessionId);
    }
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    createSessionMutation.mutate(newSession);
  };

  const handleUpdateSession = (e: React.FormEvent) => {
    e.preventDefault();
    updateSessionMutation.mutate(editingSession);
  };

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="sessions-container">
      <PageHeader 
        title="Sessions" 
        accentTitle="Hub" 
        subtitle="Configure working hours and professional capacity."
        icon={<Calendar />}
        rightElement={
          <div className="branch-select-container">
             <label className="branch-label">
               <Building2 size={14} /> Hospital Branch
             </label>
             <select 
               data-tooltip="Select hospital location to manage professional shifts"
               value={selectedBranchId} 
               onChange={(e) => handleBranchChange(e.target.value)}
               className="branch-dropdown"
             >
               <option value="">Choose a branch...</option>
               {branches?.map((b: any) => (
                 <option key={b.id} value={b.id}>{b.name}</option>
               ))}
             </select>
          </div>
        }
      />

      <div className="glass-card sessions-content">
        <div className="session-actions-row flex-mobile-column">
          <div className="doctor-dropdown-wrapper full-width-mobile">
            <select 
              data-tooltip="Choose a professional to manage their working hours"
              value={selectedDoctorId} 
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={!selectedBranchId}
              className="doctor-dropdown"
            >
              <option value="">Choose professional...</option>
              {doctors?.map((doc: any) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          </div>

          {selectedDoctorId && (
            <button 
              data-tooltip="Define a new time slot or shift for this doctor"
              onClick={() => setIsModalOpen(true)} 
              className="btn-outline-primary add-session-btn full-width-mobile" 
            >
              <Plus size={20} strokeWidth={3} /> Add New Shift
            </button>
          )}
        </div>

        <div className="section-divider" />

        {!selectedBranchId ? (
          <div className="empty-state-box">
            <Building2 size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">No Branch Selected</h3>
            <p className="empty-state-text">Select a hospital branch first to view and manage professional shifts.</p>
          </div>
        ) : !selectedDoctorId ? (
          <div className="empty-state-box">
            <User size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">No Doctor Selected</h3>
            <p className="empty-state-text">Select a professional from the second dropdown to manage their working hours.</p>
          </div>
        ) : isLoading ? (
          <p className="loading-text">Loading sessions...</p>
        ) : (
          <div className="grid-sessions">
            {sessions?.map((session: any) => (
              <div 
                key={session.id} 
                className="glass-card session-card"
                
                onClick={() => setEditingSession(session)}
              >
                <div className="session-header">
                  <div>
                    <h3 className="session-name">{session.sessionName}</h3>
                    <div className="session-occurrence">
                      <Calendar size={14} />
                      <span>{session.isDaily ? 'EVERY DAY' : `${days[session.dayOfWeek].toUpperCase()}S`}</span>
                    </div>
                  </div>

                  <div className="session-actions">
                    <button 
                      data-tooltip="Edit Shift"
                      onClick={(e) => { e.stopPropagation(); setEditingSession(session); }}
                      className="session-action-btn btn-edit-session"
                    >
                      <Edit size={16} color="#3b82f6" />
                    </button>
                    {(['orgadmin', 'branchadmin', 'superadmin', 'receptionist'].includes(role?.toLowerCase().replace(/\s/g, '') || '')) && (
                      <button 
                        data-tooltip="Delete Shift"
                        onClick={(e) => { e.stopPropagation(); setDeletingSessionId(session.id); }}
                        className="session-action-btn btn-delete-session"
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="session-data-grid">
                  <div className="session-data-item">
                    <div className="session-data-label label-hours">
                      <Clock size={12} /> Hours
                    </div>
                    <span className="session-data-value">{session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}</span>
                  </div>

                  <div className="session-data-item">
                    <div className="session-data-label label-capacity">
                      <Users size={12} /> Capacity
                    </div>
                    <span className="session-data-value">{session.defaultCapacity} <small className="capacity-unit">Patients</small></span>
                  </div>
                </div>
              </div>
            ))}
            {sessions?.length === 0 && (
              <div className="empty-state-box grid-full-width">
                <p className="empty-state-text">No shifts configured for this doctor.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal title="Add New Shift" onClose={() => setIsModalOpen(false)} icon={<Clock size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleAddSession}>
            <SessionFormFields data={newSession} onChange={setNewSession} />
            <div className="modal-footer-row">
              <button data-tooltip="Discard changes and return" type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel-session"><X size={16} color="#f43f5e" /> Cancel</button>
              <button data-tooltip="Save and create new shift" type="submit" className="btn-outline-primary btn-submit-session">
                <Save size={18} /> {createSessionMutation.isPending ? 'Saving...' : 'Add Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingSession && (
        <Modal title="Edit Shift Details" onClose={() => setEditingSession(null)} icon={<Clock size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleUpdateSession}>
            <SessionFormFields data={editingSession} onChange={setEditingSession} />
            <div className="modal-footer-row">
              <button data-tooltip="Discard changes and return" type="button" onClick={() => setEditingSession(null)} className="btn-cancel-session"><X size={16} color="#f43f5e" /> Cancel</button>
              <button data-tooltip="Commit updates to this shift" type="submit" className="btn-outline-primary btn-submit-session">
                <Save size={18} /> {updateSessionMutation.isPending ? 'Updating...' : 'Update Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingSessionId && (
        <Modal title="Delete Shift?" onClose={() => setDeletingSessionId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div className="delete-confirm-box">
            <div className="delete-alert-icon-wrapper">
              <AlertTriangle size={30} />
            </div>
            <p className="delete-alert-text">Are you sure you want to delete this shift? This will prevent new bookings for this slot.</p>
            <div className="modal-footer-row">
              <button data-tooltip="Keep this session" onClick={() => setDeletingSessionId(null)} className="btn-cancel-session"><X size={16} color="#f43f5e" /> Cancel</button>
              <button 
                data-tooltip="Permanently delete this shift"
                onClick={confirmDelete}
                className="btn-primary btn-delete-final" 
              >
                <Trash2 size={18} /> {deleteSessionMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SessionsList;
