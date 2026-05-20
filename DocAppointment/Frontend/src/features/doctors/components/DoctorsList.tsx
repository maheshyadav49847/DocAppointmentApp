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
import PageHeader from '../../../components/UI/PageHeader';
import './DoctorsList.css';

const Field: React.FC<{ label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; tooltip?: string; required?: boolean }> = ({ label, icon, value, onChange, tooltip, required }) => (
  <div className="field-group">
    <label data-tooltip={tooltip} className="field-label">
      {icon}
      {label}
    </label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
  </div>
);

const DoctorsList: React.FC = () => {
  const { orgId, role } = useAuthStore();
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

  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

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

  const isBranchSelected = (branchId: string, currentBranchIds: any[]) => {
    if (!branchId || !currentBranchIds || !Array.isArray(currentBranchIds)) return false;
    const bid = branchId.toLowerCase();
    return currentBranchIds.some(id => id && id.toString().toLowerCase() === bid);
  };

  const toggleBranchSelection = (branchId: string, isEditing: boolean) => {
    const bId = branchId.toLowerCase();
    if (isEditing) {
      const current = (editingDoctor.branchIds || editingDoctor.BranchIds || []).map((id: any) => id.toString().toLowerCase());
      const updated = current.includes(bId)
        ? current.filter((id: string) => id !== bId)
        : [...current, bId];
      setEditingDoctor({ ...editingDoctor, branchIds: updated, BranchIds: updated });
    } else {
      const current = (newDoctor.branchIds || []).map((id: any) => id.toString().toLowerCase());
      const updated = current.includes(bId)
        ? current.filter((id: string) => id !== bId)
        : [...current, bId];
      setNewDoctor({ ...newDoctor, branchIds: updated });
    }
  };

  return (
    <div className="doctors-container">
      <PageHeader 
        title="Doctors" 
        accentTitle="Hub" 
        subtitle="Manage medical professionals across all organization branches."
        icon={<Users />}
      />

      <div className="doctors-content glass-card">
        <div className="actions-row flex-mobile-column">
          <div className="doctor-search-wrapper full-width-mobile">
            <Search size={18} className="doctor-search-icon" />
            <input 
              type="text" 
              placeholder="Search all professionals..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="doctor-search-input"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-primary add-doctor-btn full-width-mobile" 
          >
            <Plus size={20} strokeWidth={3} /> Add New Doctor
          </button>
        </div>

        <div className="horizontal-divider" />

        {isLoading ? (
          <p className="loading-text">Loading professionals...</p>
        ) : filteredDoctors.length === 0 ? (
          <div className="no-data-card">
            <User size={48} className="no-data-icon" />
            <h3 className="no-data-title">No Professionals Found</h3>
            <p className="no-data-subtitle">{searchQuery ? 'Try adjusting your search query.' : 'Add your first professional to the organization to get started.'}</p>
          </div>
        ) : (
          <div className="grid-doctors">
            {filteredDoctors.map((doc: any) => (
              <div key={doc.id} className="glass-card doctor-card">
                <div className="doctor-header">
                  <div className="doctor-avatar-wrapper">
                    <User size={28} color="var(--accent-color)" />
                  </div>
                  <div className="doctor-title-box">
                    <h3 className="doctor-name">{doc.name}</h3>
                    <div className="doctor-spec-wrapper">
                      <Stethoscope size={14} />
                      {doc.specialization}
                    </div>
                  </div>
                </div>

                <div className="doctor-details-list">
                  <div className="doctor-detail-item">
                    <ShieldCheck size={14} />
                    <span>Reg: {doc.registrationNumber || 'N/A'}</span>
                  </div>
                  <div className="doctor-detail-item">
                    <Building2 size={14} />
                    <span className="doctor-branch-text">{doc.branchName || 'Not Assigned'}</span>
                  </div>
                </div>

                <div className="doctor-actions-footer">
                  <div className="doctor-actions-row">
                    <button 
                      data-tooltip="Feedback: View patient ratings and comments"
                      onClick={() => setViewRatingsDoctorId(doc)} 
                      className="action-btn btn-feedback"
                    >
                      <Star size={16} fill="#FACC15" color="#FACC15" />
                    </button>
                    <button 
                      data-tooltip="View: See full professional profile"
                      onClick={() => setViewDoctor(doc)} 
                      className="action-btn btn-view"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      data-tooltip="Edit: Modify professional details"
                      onClick={() => {
                        const normalizedIds = (doc.branchIds || doc.BranchIds || []).map((id: any) => id.toString().toLowerCase());
                        setEditingDoctor({ 
                          ...doc, 
                          branchIds: normalizedIds,
                          BranchIds: normalizedIds 
                        });
                      }} 
                      className="action-btn btn-edit"
                    >
                      <Edit size={16} />
                    </button>
                    {(['orgadmin', 'branchadmin', 'superadmin', 'receptionist'].includes(role?.toLowerCase().replace(/\s/g, '') || '')) && (
                      <button 
                        data-tooltip="Delete: Remove professional profile"
                        onClick={() => setDeletingDoctorId(doc.id)} 
                        className="action-btn btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal title="Add New Professional" onClose={() => { setIsModalOpen(false); setErrorMessage(null); }} icon={<ClipboardList size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleAddDoctor}>
            {errorMessage && (
              <div className="error-alert">
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}
            <Field label="Full Name" icon={<User size={16}/>} value={newDoctor.name} onChange={(v) => setNewDoctor({...newDoctor, name: v})} required />
            <Field label="Specialization" icon={<Stethoscope size={16}/>} value={newDoctor.specialization} onChange={(v) => setNewDoctor({...newDoctor, specialization: v})} required />
            <Field label="Registration No." icon={<Hash size={16}/>} value={newDoctor.registrationNumber} onChange={(v) => setNewDoctor({...newDoctor, registrationNumber: v})} />
            
            <div className="branches-assign-section">
              <label className="field-label">
                <Building2 size={16} /> Assign to Branches
              </label>
              {!branches ? (
                <div className="branches-loading-box">
                   Loading available branches...
                </div>
              ) : branches.length > 0 ? (
                <div className="branch-checkbox-grid">
                  {branches.map((branch: any) => (
                    <label key={branch.id} className="branch-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={isBranchSelected(branch.id, newDoctor.branchIds)}
                        onChange={() => toggleBranchSelection(branch.id, false)}
                        className="branch-checkbox-input"
                      />
                      <span className="branch-checkbox-name">{branch.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="no-branches-alert">
                  <p className="no-branches-text">
                    No branches found. <span className="no-branches-link" onClick={() => navigate('/branches')}>Create a branch</span> first.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel"><X size={16} /> Cancel</button>
              <button type="submit" className="btn-primary btn-submit-action">
                <CheckCircle2 size={18} /> {createDoctorMutation.isPending ? 'Adding...' : 'Add Doctor'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingDoctor && (
        <Modal title="Edit Doctor Details" onClose={() => { setEditingDoctor(null); setErrorMessage(null); }} icon={<ClipboardList size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleEditDoctor}>
            {errorMessage && (
              <div className="error-alert">
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}
            <Field label="Full Name" icon={<User size={16}/>} value={editingDoctor.name} onChange={(v) => setEditingDoctor({...editingDoctor, name: v})} required />
            <Field label="Specialization" icon={<Stethoscope size={16}/>} value={editingDoctor.specialization} onChange={(v) => setEditingDoctor({...editingDoctor, specialization: v})} required />
            <Field label="Registration No." icon={<Hash size={16}/>} value={editingDoctor.registrationNumber || ''} onChange={(v) => setEditingDoctor({...editingDoctor, registrationNumber: v})} />
            
            <div className="branches-assign-section">
              <label className="field-label">
                <Building2 size={16} /> Assign to Branches
              </label>
              {!branches ? (
                <div className="branches-loading-box">
                  Loading available branches...
                </div>
              ) : branches.length > 0 ? (
                <div className="branch-checkbox-grid">
                  {branches.map((branch: any) => (
                    <label key={branch.id} className="branch-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={isBranchSelected(branch.id, editingDoctor.branchIds || [])}
                        onChange={() => toggleBranchSelection(branch.id, true)}
                        className="branch-checkbox-input"
                      />
                      <span className="branch-checkbox-name">{branch.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="no-branches-alert">
                  <p className="no-branches-text">
                    No branches found. <span className="no-branches-link" onClick={() => navigate('/branches')}>Create a branch</span> first to assign this doctor.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setEditingDoctor(null)} className="btn-cancel"><X size={16} /> Cancel</button>
              <button type="submit" className="btn-primary btn-submit-action">
                <CheckCircle2 size={18} /> {updateDoctorMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deletingDoctorId && (
        <Modal title="Confirm Deletion" onClose={() => setDeletingDoctorId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div className="delete-confirm-body">
            <div className="delete-icon-wrapper">
              <AlertTriangle size={30} />
            </div>
            <p className="delete-text">Are you sure you want to remove this professional? This action cannot be undone.</p>
            <div className="modal-footer">
              <button data-tooltip="Keep this profile" onClick={() => setDeletingDoctorId(null)} className="btn-cancel"><X size={16}/> No, Keep</button>
              <button 
                data-tooltip="Permanently delete this professional"
                onClick={confirmDelete}
                className="btn-primary btn-delete-confirm" 
              >
                <Trash2 size={18} /> {deleteDoctorMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewDoctor && (
        <Modal title="Doctor Profile" onClose={() => setViewDoctor(null)} icon={<User size={24} color="var(--accent-color)" />}>
          <div className="profile-view-body">
            <div className="profile-avatar-large">
              <User size={40} />
            </div>
            <h2 className="profile-name">{viewDoctor.name}</h2>
            <div className="profile-spec-row">
              <Stethoscope size={18} />
              {viewDoctor.specialization}
            </div>
            <div className="profile-info-box">
              <div className="info-item">
                <div className="info-label">
                  <ShieldCheck size={14} /> Registration Number
                </div>
                <p className="info-value">{viewDoctor.registrationNumber || 'N/A'}</p>
              </div>
              <div className="info-item">
                <div className="info-label">
                  <MapPin size={14} /> Branch Status
                </div>
                <p className="status-active">
                  <CheckCircle2 size={14} /> Active Professional
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {viewRatingsDoctorId && (
        <Modal onClose={() => setViewRatingsDoctorId(null)} title={`Feedback: Dr. ${viewRatingsDoctorId?.name}`}>
        {isLoadingRatings ? (
           <p className="loading-text ratings-loading">Loading ratings...</p>
        ) : ratingsData ? (
           <div className="ratings-container">
             <div className="ratings-summary-header">
                <div className="ratings-avg-box">
                   <p className="ratings-label-small">AVERAGE RATING</p>
                   <div className="ratings-avg-row">
                     <h1 className="ratings-avg-value">{ratingsData.averageScore}</h1>
                     <Star size={30} fill="#FACC15" color="#FACC15" />
                   </div>
                </div>
                <div className="ratings-vertical-divider"></div>
                <div className="ratings-count-box">
                   <p className="ratings-label-small">TOTAL REVIEWS</p>
                   <h1 className="ratings-count-value">{ratingsData.totalRatings}</h1>
                </div>
             </div>

             <div>
                <h3 className="reviews-section-title">Recent Feedback</h3>
                
                {ratingsData.recentRatings.length === 0 ? (
                  <div className="no-reviews-box">
                     <MessageSquare size={30} className="no-reviews-icon" />
                     <p className="no-reviews-text">No feedback has been received for this doctor yet.</p>
                  </div>
                ) : (
                  <div className="reviews-list-scroll">
                    {ratingsData.recentRatings.map((rating: any) => (
                       <div key={rating.id} className="review-item-card">
                         <div className="review-header-row">
                            <div>
                               <p className="reviewer-name">{rating.patientName}</p>
                               <p className="review-date">
                                 {new Date(rating.createdAt).toLocaleDateString()} at {new Date(rating.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </p>
                            </div>
                            <div className="review-stars-row">
                               {[1, 2, 3, 4, 5].map((star) => (
                                 <Star key={star} size={14} fill={star <= rating.score ? '#FACC15' : 'transparent'} color={star <= rating.score ? '#FACC15' : 'rgba(255,255,255,0.2)'} />
                               ))}
                            </div>
                         </div>
                         {rating.comment ? (
                            <p className="review-comment-text">
                               "{rating.comment}"
                            </p>
                         ) : (
                            <p className="review-no-comment">
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
