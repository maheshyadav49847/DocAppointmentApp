import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorService } from '../../../services/doctorService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import { 
  Plus, User, Stethoscope, Trash2, Edit, Eye, X, AlertTriangle, 
  Hash, ClipboardList, CheckCircle2, ShieldCheck, MapPin, Users, Search, Star, MessageSquare, Building2
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { notify } from '../../../stores/notificationStore';
import { ratingService } from '../../../services/ratingService';

const actionButtonStyle = (bg: string, color: string): React.CSSProperties => ({
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, background: bg,
  border: `1px solid ${bg}`, borderRadius: '8px', color: color, cursor: 'pointer', transition: 'all 0.2s'
});

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

const Field: React.FC<{ label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; tooltip?: string; required?: boolean }> = ({ label, icon, value, onChange, tooltip, required }) => (
  <div style={{ marginBottom: '15px' }}>
    <label data-tooltip={tooltip} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
      {icon}
      {label}
    </label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
  </div>
);

const DoctorsList: React.FC = () => {
  const { orgId } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewDoctor, setViewDoctor] = useState<any>(null);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [deletingDoctorId, setDeletingDoctorId] = useState<string | null>(null);
  const [newDoctor, setNewDoctor] = useState({ name: '', specialization: '', registrationNumber: '', branchIds: [] as string[] });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewRatingsDoctorId, setViewRatingsDoctorId] = useState<any>(null);

  // Fetch all branches for the organization
  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  // Fetch all doctors for the organization
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', 'organization', orgId],
    queryFn: () => doctorService.getOrganizationDoctors(),
    enabled: !!orgId
  });

  const { data: ratingsData, isLoading: isLoadingRatings } = useQuery({
    queryKey: ['doctorRatings', viewRatingsDoctorId?.id],
    queryFn: () => ratingService.getDoctorRatings(viewRatingsDoctorId!.id),
    enabled: !!viewRatingsDoctorId
  });

  const createDoctorMutation = useMutation({
    mutationFn: (data: any) => {
      if (!orgId) throw new Error("Organization ID is missing. Please re-login.");
      return doctorService.createDoctor({ ...data, OrganizationId: orgId });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      notify.success('Doctor Added', `Dr. ${variables.name} was added to the organization.`);
      setIsModalOpen(false);
      setNewDoctor({ name: '', specialization: '', registrationNumber: '', branchIds: [] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to add doctor.";
      setErrorMessage(message);
    }
  });

  const updateDoctorMutation = useMutation({
    mutationFn: (data: any) => {
      if (!orgId) throw new Error("Organization ID is missing. Please re-login.");
      return doctorService.updateDoctor(data.id, { ...data, OrganizationId: orgId });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      notify.info('Doctor Updated', `Dr. ${variables.name}'s details have been updated.`);
      setEditingDoctor(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to update doctor.";
      setErrorMessage(message);
    }
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: (id: string) => doctorService.deleteDoctor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      notify.warning('Doctor Removed', 'A doctor profile was deleted from the system.');
      setDeletingDoctorId(null);
    }
  });

  const confirmDelete = () => {
    if (deletingDoctorId) {
      deleteDoctorMutation.mutate(deletingDoctorId);
    }
  };

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    return doctors.filter((doc: any) => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [doctors, searchQuery]);

  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newDoctor.branchIds.length === 0) {
      setErrorMessage("Please assign at least one branch to this doctor.");
      return;
    }

    createDoctorMutation.mutate(newDoctor);
  };

  const handleEditDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (editingDoctor.branchIds.length === 0) {
      setErrorMessage("Please assign at least one branch to this doctor.");
      return;
    }

    updateDoctorMutation.mutate(editingDoctor);
  };

  const toggleBranchSelection = (branchId: string, isEditing: boolean) => {
    if (isEditing) {
      const current = editingDoctor.branchIds || [];
      const updated = current.includes(branchId)
        ? current.filter((id: string) => id !== branchId)
        : [...current, branchId];
      setEditingDoctor({ ...editingDoctor, branchIds: updated });
    } else {
      const current = newDoctor.branchIds;
      const updated = current.includes(branchId)
        ? current.filter((id: string) => id !== branchId)
        : [...current, branchId];
      setNewDoctor({ ...newDoctor, branchIds: updated });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }} className="flex-mobile-column">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
              <Users size={28} />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '2.5rem', 
                fontWeight: 800, 
                background: 'linear-gradient(to right, #fff, var(--accent-color))', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                Organization Doctors
              </h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage medical professionals across all organization branches.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="doctors-content glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '15px'
        }} className="flex-mobile-column">
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }} className="full-width-mobile">
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search all professionals..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                paddingLeft: '45px', borderRadius: '12px', 
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', 
                width: '100%', height: '48px', color: 'white', outline: 'none'
              }}
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-primary full-width-mobile" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', 
              height: '48px', padding: '0 25px', borderRadius: '12px',
              fontWeight: 700, boxShadow: '0 4px 15px var(--accent-glow)'
            }}
          >
            <Plus size={20} strokeWidth={3} /> Add New Doctor
          </button>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading professionals...</p>
        ) : filteredDoctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <User size={48} style={{ opacity: 0.2, marginBottom: '15px', color: 'var(--accent-color)' }} />
            <h3 style={{ margin: 0 }}>No Professionals Found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{searchQuery ? 'Try adjusting your search query.' : 'Add your first professional to the organization to get started.'}</p>
          </div>
        ) : (
          <div className="grid-doctors">
            {filteredDoctors.map((doc: any) => (
              <div key={doc.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '220px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ 
                    width: '55px', height: '55px', borderRadius: '15px', 
                    background: 'var(--accent-glow)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--accent-color)'
                  }}>
                    <User size={28} color="var(--accent-color)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{doc.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontSize: '0.85rem', fontWeight: 500 }}>
                      <Stethoscope size={14} />
                      {doc.specialization}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <ShieldCheck size={14} />
                    <span>Reg: {doc.registrationNumber || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Building2 size={14} style={{ marginTop: '2px' }} />
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{doc.branchName || 'Not Assigned'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%' }}>
                    <button onClick={() => setViewRatingsDoctorId(doc)} style={actionButtonStyle('rgba(250, 204, 21, 0.1)', '#FACC15')}>
                      <Star size={16} fill="#FACC15" color="#FACC15" /> Feedback
                    </button>
                    <button onClick={() => setViewDoctor(doc)} style={actionButtonStyle('rgba(56, 189, 248, 0.1)', 'var(--accent-color)')}>
                      <Eye size={16} /> View
                    </button>
                    <button onClick={() => setEditingDoctor({ ...doc, branchIds: doc.branchIds || [] })} style={actionButtonStyle('rgba(255, 255, 255, 0.1)', 'white')}>
                      <Edit size={16} /> Edit
                    </button>
                    <button onClick={() => setDeletingDoctorId(doc.id)} style={actionButtonStyle('rgba(239, 68, 68, 0.1)', 'var(--danger)')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <Modal title="Add New Professional" onClose={() => { setIsModalOpen(false); setErrorMessage(null); }} icon={<ClipboardList size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleAddDoctor}>
            {errorMessage && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}
            <Field label="Full Name" icon={<User size={16}/>} value={newDoctor.name} onChange={(v) => setNewDoctor({...newDoctor, name: v})} required />
            <Field label="Specialization" icon={<Stethoscope size={16}/>} value={newDoctor.specialization} onChange={(v) => setNewDoctor({...newDoctor, specialization: v})} required />
            <Field label="Registration No." icon={<Hash size={16}/>} value={newDoctor.registrationNumber} onChange={(v) => setNewDoctor({...newDoctor, registrationNumber: v})} />
            
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Building2 size={16} /> Assign to Branches
              </label>
              {!branches ? (
                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                   Loading available branches...
                </div>
              ) : branches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {branches.map((branch: any) => (
                    <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px' }}>
                      <input 
                        type="checkbox" 
                        checked={newDoctor.branchIds.includes(branch.id)}
                        onChange={() => toggleBranchSelection(branch.id, false)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>{branch.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--danger)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger)' }}>
                    No branches found. <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/branches')}>Create a branch</span> first.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={cancelButtonStyle}><X size={16} /> Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                <CheckCircle2 size={18} /> {createDoctorMutation.isPending ? 'Adding...' : 'Add Doctor'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingDoctor && (
        <Modal title="Edit Doctor Details" onClose={() => { setEditingDoctor(null); setErrorMessage(null); }} icon={<ClipboardList size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleEditDoctor}>
            {errorMessage && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}
            <Field label="Full Name" icon={<User size={16}/>} value={editingDoctor.name} onChange={(v) => setEditingDoctor({...editingDoctor, name: v})} required />
            <Field label="Specialization" icon={<Stethoscope size={16}/>} value={editingDoctor.specialization} onChange={(v) => setEditingDoctor({...editingDoctor, specialization: v})} required />
            <Field label="Registration No." icon={<Hash size={16}/>} value={editingDoctor.registrationNumber || ''} onChange={(v) => setEditingDoctor({...editingDoctor, registrationNumber: v})} />
            
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Building2 size={16} /> Assign to Branches
              </label>
              {!branches ? (
                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Loading available branches...
                </div>
              ) : branches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {branches.map((branch: any) => (
                    <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px' }}>
                      <input 
                        type="checkbox" 
                        checked={(editingDoctor.branchIds || []).includes(branch.id)}
                        onChange={() => toggleBranchSelection(branch.id, true)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>{branch.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed var(--danger)', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger)' }}>
                    No branches found. <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }} onClick={() => navigate('/branches')}>Create a branch</span> first to assign this doctor.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button type="button" onClick={() => setEditingDoctor(null)} style={cancelButtonStyle}><X size={16} /> Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                <CheckCircle2 size={18} /> {updateDoctorMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDoctorId && (
        <Modal title="Confirm Deletion" onClose={() => setDeletingDoctorId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={30} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px' }}>Are you sure you want to remove this professional? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button data-tooltip="Keep this profile" onClick={() => setDeletingDoctorId(null)} style={cancelButtonStyle}><X size={16}/> No, Keep</button>
              <button 
                data-tooltip="Permanently delete this professional"
                onClick={confirmDelete}
                className="btn-primary" 
                style={{ flex: 1, background: 'var(--danger)', border: '1px solid var(--danger)' }}
              >
                <Trash2 size={18} /> {deleteDoctorMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {viewDoctor && (
        <Modal title="Doctor Profile" onClose={() => setViewDoctor(null)} icon={<User size={24} color="var(--accent-color)" />}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-color)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
              <User size={40} />
            </div>
            <h2 style={{ marginBottom: '5px' }}>{viewDoctor.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '20px' }}>
              <Stethoscope size={18} />
              {viewDoctor.specialization}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', textAlign: 'left' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <ShieldCheck size={14} /> Registration Number
                </div>
                <p style={{ margin: 0 }}>{viewDoctor.registrationNumber || 'N/A'}</p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <MapPin size={14} /> Branch Status
                </div>
                <p style={{ margin: 0, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} /> Active Professional
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Feedback Ratings Modal */}
      {viewRatingsDoctorId && (
        <Modal onClose={() => setViewRatingsDoctorId(null)} title={`Feedback: Dr. ${viewRatingsDoctorId?.name}`}>
        {isLoadingRatings ? (
           <p style={{ textAlign: 'center', padding: '20px' }}>Loading ratings...</p>
        ) : ratingsData ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             
             {/* Summary Header */}
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px' }}>
                <div style={{ textAlign: 'center' }}>
                   <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>AVERAGE RATING</p>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '5px' }}>
                     <h1 style={{ margin: 0, fontSize: '3rem', color: '#FACC15' }}>{ratingsData.averageScore}</h1>
                     <Star size={30} fill="#FACC15" color="#FACC15" />
                   </div>
                </div>
                <div style={{ height: '60px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ textAlign: 'center' }}>
                   <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>TOTAL REVIEWS</p>
                   <h1 style={{ margin: '5px 0 0 0', fontSize: '2.5rem', color: 'white' }}>{ratingsData.totalRatings}</h1>
                </div>
             </div>

             {/* Recent Reviews List */}
             <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: 'white' }}>Recent Feedback</h3>
                
                {ratingsData.recentRatings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                     <MessageSquare size={30} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '10px' }} />
                     <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No feedback has been received for this doctor yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                    {ratingsData.recentRatings.map((rating: any) => (
                       <div key={rating.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #FACC15' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div>
                               <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>{rating.patientName}</p>
                               <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                 {new Date(rating.createdAt).toLocaleDateString()} at {new Date(rating.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </p>
                            </div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                               {[1, 2, 3, 4, 5].map((star) => (
                                 <Star key={star} size={14} fill={star <= rating.score ? '#FACC15' : 'transparent'} color={star <= rating.score ? '#FACC15' : 'rgba(255,255,255,0.2)'} />
                               ))}
                            </div>
                         </div>
                         {rating.comment ? (
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                              "{rating.comment}"
                            </p>
                         ) : (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              No comment provided.
                            </p>
                         )}
                       </div>
                    ))}
                  </div>
                )}
             </div>

           </div>
        ) : (
           <p>Failed to load data.</p>
        )}
      </Modal>
      )}
    </div>
  );
};

export default DoctorsList;
