import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '../../../services/staffService';
import { branchService } from '../../../services/branchService';
import { useAuthStore } from '../../../stores/authStore';
import Modal from '../../../components/Modal';
import {
  Users, Plus, Shield, Trash2, Edit, X, AlertTriangle,
  CheckCircle2, Mail, Lock, Eye, EyeOff, ShieldCheck, UserCog, Building2, Calendar, Search
} from 'lucide-react';

// ─── Role Config ───────────────────────────────────────────────────────────
const ROLES = [
  { value: 3, label: 'Receptionist',  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  desc: 'Can manage queue and book tokens' },
  { value: 2, label: 'Branch Admin',  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', desc: 'Full access to this branch' },
  { value: 1, label: 'Org Admin',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  desc: 'Manages all branches' },
  { value: 4, label: 'Doctor',        color: '#34d399', bg: 'rgba(52,211,153,0.1)',  desc: 'Doctor-level portal access' },
];

const getRoleConfig = (roleStr: string) =>
  ROLES.find(r => r.label === roleStr) ?? { value: 3, label: roleStr, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', desc: '' };

// ─── Role Badge ─────────────────────────────────────────────────────────────
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const cfg = getRoleConfig(role);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`
    }}>
      <ShieldCheck size={12} /> {cfg.label}
    </span>
  );
};

// ─── Staff Form Fields ───────────────────────────────────────────────────────
interface StaffFormData { email: string; password: string; role: number; }

const StaffFormFields: React.FC<{
  data: StaffFormData;
  onChange: (v: StaffFormData) => void;
  isEdit?: boolean;
}> = ({ data, onChange, isEdit }) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <>
      <div style={{ marginBottom: '15px' }}>
        <label data-tooltip="Login email for the staff member" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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

      <div style={{ marginBottom: '20px' }}>
        <label data-tooltip="Secure password for portal access" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <Lock size={15} /> {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            value={data.password}
            onChange={e => onChange({ ...data, password: e.target.value })}
            placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
            required={!isEdit}
            style={{ paddingRight: '45px' }}
          />
          <button
            type="button"
            onClick={() => setShowPass(p => !p)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label data-tooltip="Define access level and permissions" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <Shield size={15} /> Assign Role
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ROLES.map(role => (
            <label
              key={role.value}
              onClick={() => onChange({ ...data, role: role.value })}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 15px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${data.role === role.value ? role.color : 'rgba(255,255,255,0.08)'}`,
                background: data.role === role.value ? role.bg : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${role.color}`,
                background: data.role === role.value ? role.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {data.role === role.value && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'black' }} />}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: data.role === role.value ? role.color : 'white' }}>{role.label}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{role.desc}</p>
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
  const { branchId: globalBranchId, orgId } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || '');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newStaff, setNewStaff] = useState<StaffFormData>({ email: '', password: '', role: 3 });
  const [editForm, setEditForm] = useState<StaffFormData>({ email: '', password: '', role: 3 });

  // Fetch all branches for selection
  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', selectedBranchId],
    queryFn: () => staffService.getStaff(selectedBranchId),
    enabled: !!selectedBranchId
  });

  const createMutation = useMutation({
    mutationFn: (data: StaffFormData) => staffService.createStaff({
      branchId: selectedBranchId,
      organizationId: orgId!,
      email: data.email,
      password: data.password,
      role: data.role
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsAddOpen(false);
      setNewStaff({ email: '', password: '', role: 3 });
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
    setEditForm({ email: member.email, password: '', role: ROLES.find(r => r.label === member.role)?.value ?? 3 });
    setErrorMsg(null);
  };

  const handleAdd = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(newStaff); };
  const handleEdit = (e: React.FormEvent) => { e.preventDefault(); updateMutation.mutate(editForm); };

  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r.label] = staff?.filter((s: any) => s.role === r.label).length ?? 0;
    return acc;
  }, {} as Record<string, number>);

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter((s: any) => 
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      {/* Page Header (Outside Card) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="flex-mobile-column">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
              <UserCog size={28} />
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
                Staff
              </h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage administrative roles and branch permissions.</p>
            </div>
          </div>

          {/* Branch Selector (Parallel to Title) */}
          <div style={{ minWidth: '220px' }} className="full-width-mobile">
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               <Building2 size={14} /> Hospital Branch
             </label>
             <select 
               data-tooltip="Select hospital location to manage staff permissions"
               value={selectedBranchId} 
               onChange={(e) => setSelectedBranchId(e.target.value)}
               style={{ 
                 width: '100%', padding: '10px 15px', borderRadius: '12px', 
                 background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                 color: 'white', fontWeight: 600, fontSize: '0.85rem'
               }}
             >
               <option value="" style={{ background: '#0f172a' }}>Choose a branch...</option>
               {branches?.map((b: any) => (
                 <option key={b.id} value={b.id} style={{ background: '#0f172a' }}>{b.name}</option>
               ))}
             </select>
          </div>
        </div>
      </div>

      {/* Role Stats Card (Separate) */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '15px' }}>
          {ROLES.map(role => (
            <div key={role.value} style={{ background: role.bg, border: `1px solid ${role.color}30`, borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: role.color }}>{role.label}</span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{roleCounts[role.label] ?? 0}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>members</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area: Team Management */}
      <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {/* Action Row (Inside Card) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }} className="flex-mobile-column">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--accent-color)" /> {selectedBranchId ? 'Active Team' : 'Select Branch'}
          </h3>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }} className="flex-mobile-column full-width-mobile">
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', minWidth: '250px' }} className="full-width-mobile">
              <Search size={16} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-secondary)' }} />
              <input 
                data-tooltip="Search staff by email or assigned role"
                type="text" 
                placeholder="Search staff..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  paddingLeft: '42px', borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', 
                  width: '100%', height: '48px', color: 'white', outline: 'none', fontSize: '0.9rem'
                }}
              />
            </div>

            <button 
              data-tooltip="Add a new member to the administrative team"
              onClick={() => { setIsAddOpen(true); setErrorMsg(null); setNewStaff({ email: '', password: '', role: 3 }); }} 
              className="btn-primary full-width-mobile" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', 
                height: '48px', padding: '0 25px', borderRadius: '12px',
                fontWeight: 700, boxShadow: '0 4px 15px var(--accent-glow)', whiteSpace: 'nowrap'
              }}
              disabled={!selectedBranchId}
            >
              <Plus size={20} strokeWidth={3} /> Add Member
            </button>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

        {!selectedBranchId ? (
          <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Building2 size={48} style={{ marginBottom: '20px', opacity: 0.2, color: 'var(--accent-color)' }} />
            <h3 style={{ margin: 0, color: 'white' }}>No Branch Selected</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Please select a hospital branch from the dropdown above to manage its staff.</p>
          </div>
        ) : isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading staff members...</p>
        ) : filteredStaff.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '15px', color: 'var(--accent-color)' }} />
            <h3 style={{ margin: 0 }}>{staff.length === 0 ? 'No Staff Added Yet' : 'No Members Found'}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {staff.length === 0 
                ? 'Add your first receptionist or admin for this branch to get started.' 
                : 'Try adjusting your search query to find the team member.'}
            </p>
          </div>
        ) : (
          <div className="grid-doctors">
            {filteredStaff.map((member: any) => (
              <div key={member.id} className="glass-card" style={{ 
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', height: '100%', minHeight: '220px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ 
                    width: '50px', height: '50px', borderRadius: '12px', 
                    background: getRoleConfig(member.role).bg, border: `1px solid ${getRoleConfig(member.role).color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: getRoleConfig(member.role).color, fontWeight: 900, fontSize: '1.2rem'
                  }}>
                    {member.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</h3>
                    <div style={{ marginTop: '5px' }}>
                      <RoleBadge role={member.role} />
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Calendar size={14} />
                    <span>Joined {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button 
                    data-tooltip="Modify staff account details"
                    onClick={() => openEdit(member)} 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button 
                    data-tooltip="Revoke staff administrative access"
                    onClick={() => setDeletingId(member.id)} 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
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
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertTriangle size={15} /> {errorMsg}
              </div>
            )}
            <StaffFormFields data={newStaff} onChange={setNewStaff} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button 
                data-tooltip="Cancel and return to staff list"
                type="button" 
                onClick={() => setIsAddOpen(false)} 
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' 
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <X size={16} /> Cancel
              </button>
              <button data-tooltip="Grant administrative permissions" type="submit" className="btn-primary" style={{ flex: 1.5 }} disabled={createMutation.isPending}>
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
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertTriangle size={15} /> {errorMsg}
              </div>
            )}
            <StaffFormFields data={editForm} onChange={setEditForm} isEdit />
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button 
                data-tooltip="Discard changes and return"
                type="button" 
                onClick={() => setEditingStaff(null)} 
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' 
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <X size={16} /> Cancel
              </button>
              <button data-tooltip="Update staff access and role" type="submit" className="btn-primary" style={{ flex: 1.5 }} disabled={updateMutation.isPending}>
                <CheckCircle2 size={18} /> {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deletingId && (
        <Modal title="Remove Staff Member?" onClose={() => setDeletingId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={32} />
            </div>
            <p style={{ fontSize: '1rem', marginBottom: '30px', color: 'var(--text-secondary)' }}>
              This will <strong style={{ color: 'white' }}>permanently remove</strong> this staff member's access. They will no longer be able to log in.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                data-tooltip="Keep this staff member"
                onClick={() => setDeletingId(null)} 
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' 
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <X size={16} /> Cancel
              </button>
              <button data-tooltip="Permanently revoke all access" onClick={() => deleteMutation.mutate(deletingId!)} className="btn-primary" style={{ flex: 1.5, background: 'var(--danger)', border: '1px solid var(--danger)' }} disabled={deleteMutation.isPending}>
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
