import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '../../../services/staffService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import Modal from '../../../components/Modal';
import PageHeader from '../../../components/UI/PageHeader';
import {
  Users, Plus, Shield, Trash2, Edit, X, AlertTriangle,
  CheckCircle2, Mail, Lock, Eye, EyeOff, ShieldCheck, UserCog, Building2, Calendar, Search, Phone, Hash
} from 'lucide-react';
import './StaffList.css';

// ─── Role Config ───────────────────────────────────────────────────────────
const ROLES = [
  { value: 3, label: 'Receptionist',  display: 'Receptionist', desc: 'Can manage queue and book tokens' },
  { value: 2, label: 'BranchAdmin',   display: 'Branch Admin', desc: 'Full access to this branch' },
  { value: 1, label: 'OrgAdmin',      display: 'Org Admin',    desc: 'Manages all branches' },
];

const getRoleConfig = (roleStr: string) => {
  const normalized = roleStr?.toLowerCase().replace(/\s/g, '') || '';
  return ROLES.find(r => r.label.toLowerCase().replace(/\s/g, '') === normalized) 
    ?? { value: 3, label: roleStr, desc: '' };
};

// ─── Role Badge ─────────────────────────────────────────────────────────────
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const cfg = getRoleConfig(role);
  return (
    <span className={`role-badge role-badge-${cfg.label.toLowerCase()}`}>
      <ShieldCheck size={12} /> {(cfg as any).display || cfg.label}
    </span>
  );
};

// ─── Staff Form Fields ───────────────────────────────────────────────────────
interface StaffFormData { 
  email: string; 
  password: string; 
  role: number; 
  phoneNumber: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

const StaffFormFields: React.FC<{
  data: StaffFormData;
  onChange: (v: StaffFormData) => void;
  selectedBranchId: string;
  isEdit?: boolean;
}> = ({ data, onChange, selectedBranchId, isEdit }) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <>
      <div className="staff-form-row">
        <div>
          <label className="staff-form-label">
            <UserCog size={15} /> First Name
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={e => onChange({ ...data, firstName: e.target.value })}
            placeholder="John"
            required
          />
        </div>
        <div>
          <label className="staff-form-label">
            Last Name
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={e => onChange({ ...data, lastName: e.target.value })}
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="staff-form-row">
        <div>
          <label data-tooltip="Login email for the staff member" className="staff-form-label">
            <Mail size={15} /> Email Address
          </label>
          <input
            type="email"
            value={data.email}
            onChange={e => onChange({ ...data, email: e.target.value })}
            placeholder="staff@hospital.com"
            required
          />
        </div>
        <div>
          <label data-tooltip="Unique identifier for internal tracking" className="staff-form-label">
            <Hash size={15} /> Employee ID
          </label>
          <input
            type="text"
            value={data.employeeId}
            onChange={e => onChange({ ...data, employeeId: e.target.value })}
            placeholder="EMP-001"
            required
          />
        </div>
      </div>

      <div className="staff-form-group">
        <label data-tooltip="WhatsApp number for password resets" className="staff-form-label">
          <Phone size={15} /> Phone Number (WhatsApp)
        </label>
        <input
          type="tel"
          value={data.phoneNumber}
          onChange={e => onChange({ ...data, phoneNumber: e.target.value })}
          placeholder="+91 98765 43210"
          required
        />
      </div>

      <div className="staff-form-group-large">
        <label data-tooltip="Secure password for portal access" className="staff-form-label">
          <Lock size={15} /> {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
        </label>
        <div className="password-input-wrapper">
          <input
            className="password-input"
            type={showPass ? 'text' : 'password'}
            value={data.password}
            onChange={e => onChange({ ...data, password: e.target.value })}
            placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
            required={!isEdit}
          />
          <button
            type="button"
            onClick={() => setShowPass(p => !p)}
            className="password-toggle-btn"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="staff-form-group mb-10">
        <label data-tooltip="Define access level and permissions" className="staff-form-label staff-role-label">
          <Shield size={15} /> Assign Role
        </label>
        <div className="role-select-list">
          {ROLES.filter(role => {
            if (selectedBranchId === 'org') return role.label === 'OrgAdmin';
            return role.label !== 'OrgAdmin';
          }).map(role => (
            <label
              key={role.value}
              onClick={() => onChange({ ...data, role: role.value })}
              className={`role-option role-option-${role.label.toLowerCase()} ${data.role === role.value ? 'active' : ''}`}
            >
              <div className={`role-radio-circle role-circle-${role.label.toLowerCase()} ${data.role === role.value ? 'active' : ''}`}>
                {data.role === role.value && <div className="role-radio-inner" />}
              </div>
              <div>
                <p className={`role-title role-title-${role.label.toLowerCase()} ${data.role === role.value ? 'active' : ''}`}>{(role as any).display || role.label}</p>
                <p className="role-desc">{role.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const StaffList: React.FC = () => {
  const { branchId: globalBranchId, orgId, role, setBranch } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || 'org');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newStaff, setNewStaff] = useState<StaffFormData>({ email: '', password: '', role: 3, phoneNumber: '', firstName: '', lastName: '', employeeId: '' });
  const [editForm, setEditForm] = useState<StaffFormData>({ email: '', password: '', role: 3, phoneNumber: '', firstName: '', lastName: '', employeeId: '' });

  // Fetch all branches for selection
  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', orgId, selectedBranchId],
    queryFn: () => staffService.getStaff(orgId!, selectedBranchId === 'org' ? null : selectedBranchId),
    enabled: !!orgId && !!selectedBranchId
  });

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => staffService.createStaff({
      branchId: selectedBranchId === 'org' ? null : selectedBranchId,
      organizationId: orgId!,
      email: data.email,
      password: data.password,
      role: data.role,
      phoneNumber: data.phoneNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      employeeId: data.employeeId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsAddOpen(false);
      setNewStaff({ email: '', password: '', role: 3, phoneNumber: '', firstName: '', lastName: '', employeeId: '' });
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message ?? 'Failed to create staff member.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: StaffFormData) => staffService.updateStaff(editingStaff.id, {
      id: editingStaff.id,
      email: data.email,
      role: data.role,
      phoneNumber: data.phoneNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      employeeId: data.employeeId,
      newPassword: data.password || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEditingStaff(null);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message ?? 'Failed to update staff member.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setDeletingId(null);
    }
  });

  const openEdit = (member: any) => {
    setEditingStaff(member);
    setEditForm({ 
      email: member.email, 
      password: '', 
      role: ROLES.find(r => r.label === member.role)?.value ?? 3,
      phoneNumber: member.phoneNumber || '',
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      employeeId: member.employeeId || ''
    });
    setErrorMsg(null);
  };

  const handleAdd = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(newStaff); };
  const handleEdit = (e: React.FormEvent) => { e.preventDefault(); updateMutation.mutate(editForm); };

  const [searchQuery, setSearchQuery] = useState('');

  const currentRoles = selectedBranchId === 'org' 
    ? ROLES.filter(r => r.label === 'OrgAdmin') 
    : ROLES.filter(r => r.label !== 'OrgAdmin');

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { total: staff?.length || 0 };
    staff?.forEach((s: any) => {
      // SMART COUNT for Org View: Anyone with no branch at org level is an admin
      if (selectedBranchId === 'org' && (s.branchId === null || s.branchId === undefined)) {
        counts['OrgAdmin'] = (counts['OrgAdmin'] || 0) + 1;
        return;
      }

      const normalizedRole = s.role?.toLowerCase().replace(/\s/g, '') || '';
      ROLES.forEach(r => {
        const target = r.label.toLowerCase().replace(/\s/g, '');
        if (normalizedRole === target) {
          counts[r.label] = (counts[r.label] || 0) + 1;
        }
      });
    });
    return counts;
  }, [staff, selectedBranchId]);

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter((s: any) => 
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  return (
    <div className="staff-container">
      <PageHeader 
        title="Administrative" 
        accentTitle="Staff" 
        subtitle="Manage administrative roles and branch permissions."
        icon={<UserCog />}
        rightElement={
          <div className="branch-select-container">
             <label className="branch-label">
               <Building2 size={14} /> Hospital Branch / Level
             </label>
             <select 
               data-tooltip="Select level or branch to manage staff"
               value={selectedBranchId} 
              disabled={role === 'BranchAdmin' || role === 'Receptionist'}
               onChange={(e) => {
                 setSelectedBranchId(e.target.value);
                 setBranch(e.target.value !== 'org' ? e.target.value : '');
                 // Reset role based on new selection
                 if (e.target.value === 'org') {
                   setNewStaff(prev => ({ ...prev, role: 1 }));
                 } else {
                   setNewStaff(prev => ({ ...prev, role: 3 }));
                 }
               }}
               className="branch-dropdown"
             >
               <option value="">Choose a branch...</option>
               <option value="org" className="org-level-option">🏢 Organization Level (Main Admins)</option>
               <optgroup label="Branches">
                 {branches?.map((b: any) => (
                   <option key={b.id} value={b.id}>{b.name}</option>
                 ))}
               </optgroup>
             </select>
          </div>
        }
      />

      {/* Role Stats Card (Separate) */}
      <div className="glass-card staff-stats-card">
        <div className="stats-grid">
          <div className="stat-box default-box">
            <span className="stat-label text-secondary">Total Staff</span>
            <span className="stat-value">{roleCounts.total}</span>
            <span className="stat-unit">members</span>
          </div>
          {currentRoles.map(role => (
            <div key={role.label} className={`stat-box role-stat-box-${role.label.toLowerCase()}`}>
              <span className={`stat-label role-text-${role.label.toLowerCase()}`}>{(role as any).display || role.label}</span>
              <span className="stat-value">{roleCounts[role.label] ?? 0}</span>
              <span className="stat-unit">members</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area: Team Management */}
      <div className="glass-card staff-content">
        {/* Action Row (Inside Card) */}
        <div className="staff-actions-row flex-mobile-column">
          <h3 className="staff-section-title">
            <Users size={20} color="var(--accent-color)" /> {selectedBranchId ? 'Active Team' : 'Select Branch'}
          </h3>
          
          <div className="staff-actions-right flex-mobile-column full-width-mobile">
            {/* Search Input */}
            <div className="staff-search-wrapper full-width-mobile">
              <Search size={16} className="staff-search-icon" />
              <input 
                data-tooltip="Search staff by name, email, role or employee ID"
                type="text" 
                placeholder="Search staff..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="staff-search-input"
              />
            </div>

            <button 
              data-tooltip="Add a new member to the administrative team"
              onClick={() => { setIsAddOpen(true); setErrorMsg(null); setNewStaff({ email: '', password: '', role: 3, phoneNumber: '', firstName: '', lastName: '', employeeId: '' }); }} 
              className="btn-primary add-staff-btn full-width-mobile" 
              disabled={!selectedBranchId}
            >
              <Plus size={20} strokeWidth={3} /> Add Member
            </button>
          </div>
        </div>

        <div className="section-divider" />

        {!selectedBranchId ? (
          <div className="empty-state-box">
            <Building2 size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">No Branch Selected</h3>
            <p className="empty-state-text">Please select a hospital branch from the dropdown above to manage its staff.</p>
          </div>
        ) : isLoading ? (
          <p className="loading-text">Loading staff members...</p>
        ) : filteredStaff.length === 0 ? (
          <div className="empty-state-box small-padding">
            <Search size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">{(staff?.length ?? 0) === 0 ? 'No Staff Added Yet' : 'No Members Found'}</h3>
            <p className="empty-state-text">
              {(staff?.length ?? 0) === 0 
                ? 'Add your first receptionist or admin for this branch to get started.' 
                : 'Try adjusting your search query to find the team member.'}
            </p>
          </div>
        ) : (
          <div className="grid-staff">
            {filteredStaff.map((member: any) => (
              <div key={member.id} className="staff-card">
                {/* Header: Avatar + Info + Actions */}
                <div className="staff-card-header">
                  <div className="staff-info-wrapper">
                    <div className={`staff-avatar role-avatar-${getRoleConfig(member.role).label.toLowerCase()}`}>
                      {member.firstName ? member.firstName[0].toUpperCase() : member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="staff-name">
                        {member.firstName} {member.lastName}
                      </h3>
                      <div className="staff-role-wrapper">
                         <RoleBadge role={member.role} />
                      </div>
                    </div>
                  </div>

                  {/* Top Actions Group */}
                  <div className="staff-card-actions">
                    <button 
                      data-tooltip="Edit Member"
                      onClick={() => openEdit(member)} 
                      className="action-btn edit-btn"
                    >
                      <Edit size={16} />
                    </button>
                    {(['orgadmin', 'branchadmin', 'superadmin'].includes(role?.toLowerCase().replace(/\s/g, '') || '')) && (
                      <button 
                        data-tooltip="Remove Access"
                        onClick={() => setDeletingId(member.id)} 
                        className="action-btn delete-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body: Contact Details */}
                <div className="staff-contact-box">
                  <div className="contact-item">
                    <Mail size={16} color="var(--accent-color)" className="contact-icon" />
                    <span className="contact-text">{member.email}</span>
                  </div>
                  <div className="contact-item">
                    <Phone size={16} color="var(--success)" className="contact-icon" />
                    <span>{member.phoneNumber || 'N/A'}</span>
                  </div>
                </div>

                {/* Footer: Meta Info */}
                <div className="staff-meta-footer">
                  <div className="meta-item">
                    <Hash size={12} /> ID: {member.employeeId || '---'}
                  </div>
                  <div className="meta-item">
                    <Calendar size={12} /> Since {new Date(member.createdAt).getFullYear()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Add Modal ─── */}
      {isAddOpen && (
        <Modal title="Add New Staff Member" onClose={() => setIsAddOpen(false)} icon={<UserCog size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleAdd}>
            {errorMsg && (
              <div className="error-message-box">
                <AlertTriangle size={15} /> {errorMsg}
              </div>
            )}
            <StaffFormFields data={newStaff} onChange={setNewStaff} selectedBranchId={selectedBranchId} />
            <div className="modal-footer-row">
              <button 
                data-tooltip="Cancel and return to staff list"
                type="button" 
                onClick={() => setIsAddOpen(false)} 
                className="btn-cancel"
              >
                <X size={16} /> Cancel
              </button>
              <button data-tooltip="Grant administrative permissions" type="submit" className="btn-primary btn-submit" disabled={createMutation.isPending}>
                <CheckCircle2 size={18} /> {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Edit Modal ─── */}
      {editingStaff && (
        <Modal title="Edit Staff Member" onClose={() => setEditingStaff(null)} icon={<Edit size={24} color="var(--accent-color)" />}>
          <form onSubmit={handleEdit}>
            {errorMsg && (
              <div className="error-message-box">
                <AlertTriangle size={15} /> {errorMsg}
              </div>
            )}
            <StaffFormFields data={editForm} onChange={setEditForm} selectedBranchId={selectedBranchId} isEdit />
            <div className="modal-footer-row">
              <button 
                data-tooltip="Discard changes and return"
                type="button" 
                onClick={() => setEditingStaff(null)} 
                className="btn-cancel"
              >
                <X size={16} /> Cancel
              </button>
              <button data-tooltip="Update staff access and role" type="submit" className="btn-primary btn-submit" disabled={updateMutation.isPending}>
                <CheckCircle2 size={18} /> {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deletingId && (
        <Modal title="Remove Staff Member?" onClose={() => setDeletingId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div className="text-center">
            <div className="delete-icon-wrapper">
              <AlertTriangle size={32} />
            </div>
            <p className="delete-confirm-text">
              This will <strong className="text-white">permanently remove</strong> this staff member's access. They will no longer be able to log in.
            </p>
            <div className="modal-footer-row mt-0">
              <button 
                data-tooltip="Keep this staff member"
                onClick={() => setDeletingId(null)} 
                className="btn-cancel"
              >
                <X size={16} /> Cancel
              </button>
              <button data-tooltip="Permanently revoke all access" onClick={() => deleteMutation.mutate(deletingId!)} className="btn-primary btn-delete-final flex-15" disabled={deleteMutation.isPending}>
                <Trash2 size={18} /> {deleteMutation.isPending ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffList;
