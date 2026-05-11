import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorService } from '../../../services/doctorService';
import { sessionService } from '../../../services/sessionService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import { 
  Plus, Clock, Calendar, User, Trash2, X, 
  AlertTriangle, Users, Hash, CheckCircle2, ListOrdered, Edit, Building2
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { notify } from '../../../stores/notificationStore';
import PageHeader from '../../../components/UI/PageHeader';

const SessionFormFields: React.FC<{ data: any; onChange: (v: any) => void }> = ({ data, onChange }) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Daily Card */}
          <div 
            onClick={() => onChange({...data, isDaily: true})}
            style={{ 
              padding: '16px', borderRadius: '14px', cursor: 'pointer',
              background: data.isDaily ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
              border: `2px solid ${data.isDaily ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              boxShadow: data.isDaily ? '0 8px 20px rgba(56, 189, 248, 0.15)' : 'none'
            }}
          >
            <div style={{ color: data.isDaily ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
              <Clock size={20} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: data.isDaily ? 'white' : 'var(--text-secondary)' }}>Daily</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Available every day</span>
          </div>

          {/* Specific Day Card */}
          <div 
            onClick={() => onChange({...data, isDaily: false})}
            style={{ 
              padding: '16px', borderRadius: '14px', cursor: 'pointer',
              background: !data.isDaily ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
              border: `2px solid ${!data.isDaily ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              boxShadow: !data.isDaily ? '0 8px 20px rgba(56, 189, 248, 0.15)' : 'none'
            }}
          >
            <div style={{ color: !data.isDaily ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
              <Calendar size={20} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: !data.isDaily ? 'white' : 'var(--text-secondary)' }}>Specific Day</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Once per week</span>
          </div>
        </div>
      </div>

      {!data.isDaily && (
        <div style={{ marginBottom: '15px' }}>
          <label data-tooltip="Day of the week this professional is available" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Calendar size={16} /> Day of Week
          </label>
          <select value={data.dayOfWeek} onChange={(e) => onChange({...data, dayOfWeek: parseInt(e.target.value)})} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', padding: '12px' }}>
            {days.map((day, index) => <option key={index} value={index} style={{ background: '#0f172a', color: 'white' }}>{day}</option>)}
          </select>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label data-tooltip="Identify this shift (e.g. Evening Clinic, Emergency)" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <ListOrdered size={16} /> Session Name
        </label>
        <input type="text" value={data.sessionName} onChange={(e) => onChange({...data, sessionName: e.target.value})} placeholder="e.g. Morning OPD" required />
      </div>
      <div style={{ display: 'grid', gap: '15px', marginBottom: '15px' }} className="grid-stats">
        <div>
          <label data-tooltip="Start time of the session" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Clock size={16} /> Start Time
          </label>
          <input type="time" value={data.startTime.substring(0, 5)} onChange={(e) => onChange({...data, startTime: e.target.value})} required />
        </div>
        <div>
          <label data-tooltip="End time of the session" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <Clock size={16} /> End Time
          </label>
          <input type="time" value={data.endTime.substring(0, 5)} onChange={(e) => onChange({...data, endTime: e.target.value})} required />
        </div>
      </div>
      <div style={{ marginBottom: '25px' }}>
        <label data-tooltip="Maximum number of tokens allowed per session" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <Hash size={16} /> Token Capacity
        </label>
        <input type="number" value={data.defaultCapacity} onChange={(e) => onChange({...data, defaultCapacity: parseInt(e.target.value)})} required />
      </div>
    </>
  );
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1, 
  background: 'rgba(255,255,255,0.05)', 
  border: '1px solid rgba(255,255,255,0.1)', 
  color: 'white', 
  padding: '10px 20px', 
  borderRadius: '10px', 
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  gap: '8px', 
  fontSize: '0.9rem', 
  fontWeight: 600,
  transition: 'all 0.2s'
};

const SessionsList: React.FC = () => {
  const { branchId: globalBranchId, orgId, role } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Fetch branches
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

  // Handle branch change
  const handleBranchChange = (id: string) => {
    setSelectedBranchId(id);
    setSelectedDoctorId(''); // Reset doctor when branch changes
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      {/* Page Header Section */}
      <PageHeader 
        title="Sessions" 
        accentTitle="Hub" 
        subtitle="Configure working hours and professional capacity."
        icon={<Calendar />}
        rightElement={
          <div style={{ minWidth: '220px' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               <Building2 size={14} /> Hospital Branch
             </label>
             <select 
               data-tooltip="Select hospital location to manage professional shifts"
               value={selectedBranchId} 
               onChange={(e) => handleBranchChange(e.target.value)}
               style={{ 
                 width: '100%', padding: '10px 15px', borderRadius: '12px', 
                 background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                 color: 'white', fontWeight: 600, fontSize: '0.85rem'
               }}
             >
               <option value="" style={{ background: '#1e293b', color: 'white' }}>Choose a branch...</option>
               {branches?.map((b: any) => (
                 <option key={b.id} value={b.id} style={{ background: '#1e293b', color: 'white' }}>{b.name}</option>
               ))}
             </select>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {/* Action Row (Inside Card) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }} className="flex-mobile-column">
          {/* Doctor Selector */}
          <div style={{ flex: 1, width: '100%', maxWidth: '300px' }} className="full-width-mobile">
            <select 
              data-tooltip="Choose a professional to manage their working hours"
              value={selectedDoctorId} 
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={!selectedBranchId}
              style={{ 
                width: '100%', height: '48px', padding: '0 15px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', 
                color: 'white', fontWeight: 600, outline: 'none'
              }}
            >
              <option value="" style={{ background: '#1e293b', color: 'white' }}>Choose professional...</option>
              {doctors?.map((doc: any) => (
                <option key={doc.id} value={doc.id} style={{ background: '#1e293b', color: 'white' }}>{doc.name}</option>
              ))}
            </select>
          </div>

          {selectedDoctorId && (
            <button 
              data-tooltip="Define a new time slot or shift for this doctor"
              onClick={() => setIsModalOpen(true)} 
              className="btn-primary full-width-mobile" 
              style={{ 
                height: '48px', padding: '0 25px', display: 'flex', 
                alignItems: 'center', gap: '8px', justifyContent: 'center',
                borderRadius: '12px', fontWeight: 700, boxShadow: '0 4px 15px var(--accent-glow)'
              }}
            >
              <Plus size={20} strokeWidth={3} /> Add New Shift
            </button>
          )}
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {!selectedBranchId ? (
          <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Building2 size={48} style={{ marginBottom: '20px', opacity: 0.2, color: 'var(--accent-color)' }} />
            <h3 style={{ margin: 0, color: 'white' }}>No Branch Selected</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Select a hospital branch first to view and manage professional shifts.</p>
          </div>
        ) : !selectedDoctorId ? (
          <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <User size={48} style={{ marginBottom: '20px', opacity: 0.2, color: 'var(--accent-color)' }} />
            <h3 style={{ margin: 0, color: 'white' }}>No Doctor Selected</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Select a professional from the second dropdown to manage their working hours.</p>
          </div>
        ) : isLoading ? (
          <p>Loading sessions...</p>
        ) : (
          <div className="grid-doctors">
            {sessions?.map((session: any) => (
              <div key={session.id} className="glass-card" style={{ 
                borderLeft: '4px solid var(--accent-color)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                background: 'rgba(255,255,255,0.02)', 
                padding: '25px',
                transition: 'all 0.3s ease'
              }}>
                {/* Header: Name + Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>{session.sessionName}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', fontSize: '0.85rem', marginTop: '6px', fontWeight: 600 }}>
                      <Calendar size={14} />
                      <span>{session.isDaily ? 'EVERY DAY' : `${days[session.dayOfWeek].toUpperCase()}S`}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      data-tooltip="Edit Shift"
                      onClick={() => setEditingSession(session)}
                      style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                      <Edit size={16} />
                    </button>
                    {(['orgadmin', 'branchadmin', 'superadmin', 'receptionist'].includes(role?.toLowerCase().replace(/\s/g, '') || '')) && (
                      <button 
                        data-tooltip="Delete Shift"
                        onClick={() => setDeletingSessionId(session.id)}
                        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)'; e.currentTarget.style.color = 'rgba(239, 68, 68, 0.5)'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body: Operational Data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      <Clock size={12} /> Hours
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>{session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      <Users size={12} /> Capacity
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>{session.defaultCapacity} <small style={{ fontWeight: 400, opacity: 0.6 }}>Patients</small></span>
                  </div>
                </div>
              </div>
            ))}
            {sessions?.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No shifts configured for this doctor.
              </div>
            )}
          </div>
        )}
      </div>


      {/* Add Session Modal */}
      {isModalOpen && (
        <Modal title="Add New Shift" onClose={() => setIsModalOpen(false)} icon={<Clock size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleAddSession}>
            <SessionFormFields data={newSession} onChange={setNewSession} />
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button data-tooltip="Discard changes and return" type="button" onClick={() => setIsModalOpen(false)} style={cancelButtonStyle}><X size={16} /> Cancel</button>
              <button data-tooltip="Save and create new shift" type="submit" className="btn-primary" style={{ flex: 1 }}>
                <CheckCircle2 size={18} /> {createSessionMutation.isPending ? 'Saving...' : 'Add Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <Modal title="Edit Shift Details" onClose={() => setEditingSession(null)} icon={<Clock size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleUpdateSession}>
            <SessionFormFields data={editingSession} onChange={setEditingSession} />
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button data-tooltip="Discard changes and return" type="button" onClick={() => setEditingSession(null)} style={cancelButtonStyle}><X size={16} /> Cancel</button>
              <button data-tooltip="Commit updates to this shift" type="submit" className="btn-primary" style={{ flex: 1 }}>
                <CheckCircle2 size={18} /> {updateSessionMutation.isPending ? 'Updating...' : 'Update Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <Modal title="Delete Shift?" onClose={() => setDeletingSessionId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={30} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px' }}>Are you sure you want to delete this shift? This will prevent new bookings for this slot.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button data-tooltip="Keep this session" onClick={() => setDeletingSessionId(null)} style={cancelButtonStyle}><X size={16} /> Cancel</button>
              <button 
                data-tooltip="Permanently delete this shift"
                onClick={confirmDelete}
                className="btn-primary" 
                style={{ flex: 1, background: 'var(--danger)', border: '1px solid var(--danger)' }}
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
