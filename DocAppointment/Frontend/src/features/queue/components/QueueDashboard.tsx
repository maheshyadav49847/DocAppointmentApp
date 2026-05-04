import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck, Play, PlusCircle, MessageSquare, LayoutDashboard,
  Stethoscope, Clock, Users, CheckCircle2,
  SkipForward, UserCircle, Activity, Info, Power,
  ArrowLeft, ChevronRight, RotateCcw,
  AlertCircle, Search, Edit, Trash2, X, Settings, User, Smartphone, Hash, Zap
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { queueService } from '../../../services/queueService';
import { doctorService } from '../../../services/doctorService';
import { sessionService } from '../../../services/sessionService';
import { branchService } from '../../../services/branchService';
import { useQueueHub } from '../../../hooks/useQueueHub';
import { useAuthStore } from '../../../stores/authStore';
import ManualBookingModal from '../../../components/ManualBookingModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../../stores/notificationStore';
import { Building2 } from 'lucide-react';

const QueueDashboard: React.FC = () => {
  const { branchId: globalBranchId, orgId } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>(globalBranchId || '');
  const [viewMode, setViewMode] = useState<'overview' | 'manage'>('overview');
  const [activeSession, setActiveSession] = useState<any>(null); // { doctor, session, queueId }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEndSession, setConfirmEndSession] = useState<{ isOpen: boolean; queueId: string | null }>({ isOpen: false, queueId: null });
  const [editingToken, setEditingToken] = useState<any>(null);

  // 0. Fetch Branches
  const { data: branches } = useQuery({
    queryKey: ['branches', orgId],
    queryFn: () => branchService.getBranches(orgId || ''),
    enabled: !!orgId
  });

  // 1. Fetch Doctors
  const { data: doctors, isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctors', selectedBranchId],
    queryFn: () => doctorService.getDoctors(selectedBranchId),
    enabled: !!selectedBranchId
  });

  // 2. Fetch Dashboard Stats
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats', selectedBranchId],
    queryFn: () => queueService.getStats(selectedBranchId),
    enabled: !!selectedBranchId,
    refetchInterval: 30000 // Refetch every 30s
  });

  const handleStartSession = async (doctor: any, session: any) => {
    console.log("Starting session for:", doctor.name, session.sessionName);
    try {
      const queueId = await queueService.initializeQueue(doctor.id, session.id);
      console.log("Queue initialized with ID:", queueId);
      notify.success('Session Started', `Queue opened for Dr. ${doctor.name} — ${session.sessionName} shift.`);
      handleManageSession(doctor, session, queueId);
    } catch (e) {
      console.error("Initialize Queue Error:", e);
      notify.danger('Session Failed', 'Could not start queue. Please try again.');
      alert("Failed to start session. Please try again.");
    }
  };

  const handleManageSession = (doctor: any, session: any, queueId: string) => {
    setActiveSession({ doctor, session, queueId });
    setViewMode('manage');
  };

  const createTokenMutation = useMutation({
    mutationFn: (data: any) => queueService.createToken(data),
    onSuccess: (_result, variables) => {
      notify.success('Patient Booked', `New token created for ${variables.patientName || 'patient'}.`);
      queryClient.invalidateQueries({ queryKey: ['upcomingTokens', activeSession?.queueId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to create token";
      notify.danger('Booking Failed', message);
    }
  });

  const endQueueMutation = useMutation({
    mutationFn: (queueId: string) => queueService.endQueue(queueId),
    onSuccess: () => {
      console.log("End Queue Mutation successful");
      notify.info('Session Ended', `Queue for ${activeSession?.doctor?.name || 'doctor'} has been closed.`);
      setConfirmEndSession({ isOpen: false, queueId: null });
      setViewMode('overview');
      setActiveSession(null);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    },
    onError: (err: any) => {
      console.error("End Queue Mutation failed:", err);
      notify.danger('End Session Failed', err.response?.data?.message || err.message);
      alert("Failed to end session: " + (err.response?.data?.message || err.message));
    }
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.deleteToken(tokenId),
    onSuccess: () => {
      notify.warning('Token Removed', 'A patient token was deleted from the queue.');
      queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingTokens'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to delete token";
      notify.danger('Delete Failed', message);
    }
  });

  const updateTokenMutation = useMutation({
    mutationFn: ({ tokenId, ...data }: any) => queueService.updateToken(tokenId, data),
    onSuccess: () => {
      notify.info('Patient Updated', 'Patient name or phone number was updated.');
      setEditingToken(null);
      queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingTokens'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to update token";
      notify.danger('Update Failed', message);
    }
  });

  const handleManualBookingSubmit = (data: { name: string; phone: string }) => {
    if (!activeSession?.queueId) return;

    // Strict Client-side duplicate check
    // We search across ALL tokens in the current session (Pending and Now Serving)
    const queueData = queryClient.getQueryData(['upcomingTokens', activeSession.queueId]) as any[];
    const isDuplicate = queueData?.some((t: any) => 
      t.patientPhone === data.phone && (t.status === 0 || t.status === 1)
    );

    if (isDuplicate) {
      notify.danger("Duplicate Patient", "This patient is already in the queue!");
      return;
    }

    createTokenMutation.mutate({
      queueId: activeSession.queueId,
      patientName: data.name,
      patientPhone: data.phone,
      source: 2 // Manual
    });
  };

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    return doctors.filter((d: any) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [doctors, searchQuery]);

  if (isLoadingDoctors) return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <div className="pulse-container">
        <Activity size={60} color="var(--accent-color)" className="animate-pulse" />
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', letterSpacing: '1px' }}>PREPARING DASHBOARD...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '50px' }}>
      {viewMode === 'overview' ? (
        <Overview
          doctors={filteredDoctors}
          stats={stats}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onStart={handleStartSession}
          onManage={handleManageSession}
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
          branches={branches}
        />
      ) : (
        <ManageQueue
          sessionData={activeSession}
          onBack={() => { setViewMode('overview'); setActiveSession(null); }}
          onManualBooking={() => setIsModalOpen(true)}
          isEnding={endQueueMutation.isPending}
          onEndSession={() => setConfirmEndSession({ isOpen: true, queueId: activeSession.queueId })}
          setEditingToken={setEditingToken}
          deleteTokenMutation={deleteTokenMutation}
        />
      )}

      <ManualBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleManualBookingSubmit}
      />

      {confirmEndSession.isOpen && (
        <ConfirmDialog 
          title="End Session?"
          message="Are you sure you want to end this doctor's session? This will mark the queue as completed."
          onConfirm={() => {
            if (activeSession?.queueId) {
              console.log("Proceeding with end session for:", activeSession.queueId);
              endQueueMutation.mutate(activeSession.queueId);
            }
          }}
          onCancel={() => setConfirmEndSession({ isOpen: false, queueId: null })}
        />
      )}

      {editingToken && (
        <EditTokenModal
          token={editingToken}
          isOpen={!!editingToken}
          onClose={() => setEditingToken(null)}
          onSave={(data: any) => {
            updateTokenMutation.mutate({ tokenId: editingToken.id, ...data });
          }}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENT: OVERVIEW ---
const Overview = ({ doctors, stats, searchQuery, setSearchQuery, onStart, onManage, selectedBranchId, setSelectedBranchId, branches }: any) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }} className="flex-mobile-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--accent-glow)', padding: '12px', borderRadius: '15px', color: 'var(--accent-color)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            <LayoutDashboard size={28} />
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
              Queue Dashboard
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Monitor and manage doctor sessions in real-time.</p>
          </div>
        </div>

        <div style={{ minWidth: '250px' }} className="full-width-mobile">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
             <Building2 size={14} /> Clinical Branch
          </label>
          <select 
             value={selectedBranchId} 
             onChange={(e) => setSelectedBranchId(e.target.value)}
             style={{ 
               width: '100%', padding: '12px 15px', borderRadius: '12px', 
               background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
               color: 'white', fontWeight: 600, fontSize: '0.9rem'
             }}
           >
             <option value="" style={{ background: '#0f172a' }}>Choose a branch...</option>
             {branches?.map((b: any) => (
               <option key={b.id} value={b.id} style={{ background: '#0f172a' }}>{b.name}</option>
             ))}
           </select>
        </div>
      </div>

      {!selectedBranchId ? (
        <div style={{ textAlign: 'center', padding: '120px', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Building2 size={80} style={{ marginBottom: '30px', opacity: 0.1, color: 'var(--accent-color)' }} />
          <h2 style={{ color: 'white', fontSize: '2rem' }}>Operational Oversight</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '15px auto' }}>Please select a clinical branch from the header to monitor live patient queues and manage professional sessions.</p>
        </div>
      ) : (
        <>
          {/* Header Stats */}
          <div className="grid-stats">
            <StatCard icon={<Users />} label="Total Patients" value={stats?.totalPatientsToday || 0} color="var(--accent-color)" />
            <StatCard icon={<CheckCircle2 />} label="Completed" value={stats?.completedPatients || 0} color="var(--success)" />
            <StatCard icon={<AlertCircle />} label="Skipped" value={stats?.skippedPatients || 0} color="var(--danger)" />
            <StatCard icon={<Clock />} label="Avg Wait Time" value={`${stats?.avgWaitTimeMinutes || 0}m`} color="#FACC15" />
          </div>

          <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }} className="flex-mobile-column">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'var(--accent-glow)', padding: '10px', borderRadius: '12px', color: 'var(--accent-color)', boxShadow: '0 0 15px var(--accent-glow)' }}>
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Active Sessions</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Doctors currently handling patient queues</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '400px' }} className="flex-mobile-column full-width-mobile">
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Search doctor or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            <div className="grid-sessions">
              {doctors?.map((doc: any) => (
                <DoctorCard key={doc.id} doctor={doc} onStart={onStart} onManage={onManage} />
              ))}
            </div>

            {doctors?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <AlertCircle size={40} color="var(--text-secondary)" style={{ marginBottom: '15px' }} />
                <h3>No doctors found</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search query.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color, subText }: any) => (
  <div className="glass-card stat-card-responsive" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', background: color, filter: 'blur(50px)', opacity: 0.1 }}></div>
    <div style={{ background: `${color}15`, padding: '15px', borderRadius: '15px', color: color, display: 'flex', zIndex: 1 }}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div style={{ zIndex: 1 }}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</p>
      <h3 style={{ margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 800 }}>{value}</h3>
      {subText && <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }} className="desktop-only">{subText}</p>}
    </div>
  </div>
);

const ConfirmDialog = ({ title, message, onConfirm, onCancel }: any) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.3s ease' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
        <Power size={40} />
      </div>
      <h2 style={{ margin: '0 0 10px', fontSize: '1.8rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '35px', lineHeight: '1.6' }}>{message}</p>
      <div style={{ display: 'flex', gap: '15px' }}>
        <button 
          onClick={onCancel} 
          style={{ 
            flex: 1, padding: '12px 20px', borderRadius: '10px', 
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
            color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <X size={18} /> Cancel
        </button>
        <button 
          onClick={onConfirm} 
          style={{ 
            flex: 1, padding: '12px 20px', borderRadius: '10px', 
            background: 'var(--danger)', border: 'none', color: 'white', 
            cursor: 'pointer', fontWeight: 800, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem' 
          }}
        >
          <Power size={18} /> Confirm End
        </button>
      </div>
    </div>
  </div>
);

const DoctorCard = ({ doctor, onStart, onManage }: any) => {
  const { data: sessions } = useQuery({
    queryKey: ['sessions', doctor.id],
    queryFn: () => sessionService.getSessions(doctor.id)
  });

  return (
    <div className="glass-card doctor-status-card" style={{ padding: '0', overflow: 'hidden', transition: 'all 0.3s ease' }}>
      <div className="doctor-card-header" style={{ padding: '25px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)', display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '18px',
          background: 'var(--accent-glow)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)',
          border: '1px solid rgba(56, 189, 248, 0.3)'
        }}>
          <UserCircle size={35} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{doctor.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', fontSize: '0.9rem', fontWeight: 600 }}>
            <Stethoscope size={14} />
            {doctor.specialization}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>SESSIONS</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{sessions?.length || 0}</span>
        </div>
      </div>

      <div style={{ padding: '20px 25px 25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {sessions?.map((sess: any) => (
          <SessionItem key={sess.id} doctor={doctor} session={sess} onStart={onStart} onManage={onManage} />
        ))}
        {(!sessions || sessions.length === 0) && (
          <div style={{ padding: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No scheduled shifts today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SessionItem = ({ doctor, session, onStart, onManage }: any) => {
  const { data: activeQueue } = useQuery({
    queryKey: ['activeQueue', doctor.id, session.id],
    queryFn: () => queueService.getActiveQueueBySession(doctor.id, session.id),
    refetchInterval: 5000
  });

  const isLive = !!activeQueue;

  return (
    <div style={{
      padding: '22px',
      background: isLive ? 'rgba(56, 189, 248, 0.03)' : 'rgba(255,255,255,0.01)',
      borderRadius: '18px',
      border: `1px solid ${isLive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      position: 'relative',
      boxShadow: isLive ? '0 10px 30px rgba(56, 189, 248, 0.05)' : 'none',
      transition: 'all 0.3s ease'
    }}>
      {/* Header: Name and Time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            width: '45px', height: '45px', borderRadius: '12px', 
            background: 'rgba(255,255,255,0.03)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', color: isLive ? 'var(--accent-color)' : 'var(--text-secondary)' 
          }}>
            <Clock size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{session.sessionName}</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              {session.startTime.substring(0, 5)} <ChevronRight size={10} /> {session.endTime.substring(0, 5)}
            </div>
          </div>
        </div>

        {isLive && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              <div className="live-dot"></div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '1px' }}>LIVE</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', marginTop: '2px' }}>#{activeQueue?.currentTokenNumber || '0'}</div>
          </div>
        )}
      </div>

      {/* Stats and Action Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'rgba(255,255,255,0.02)', 
        padding: '12px 18px', 
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.05)',
        gap: '15px'
      }} className="flex-mobile-column">
        <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'space-between' }} className="stat-row-mobile">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Wait</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-color)' }}>{activeQueue?.waitingCount || 0}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Done</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>{activeQueue?.completedCount || 0}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Skip</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)' }}>{activeQueue?.skippedCount || 0}</span>
          </div>
        </div>

        {isLive ? (
          <button 
            className="btn-primary full-width-mobile" 
            onClick={() => onManage(doctor, session, activeQueue.id)}
            style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '10px', minHeight: '44px' }}
          >
            <Settings size={14} /> Manage Session
          </button>
        ) : (
          <button 
            className="start-btn full-width-mobile" 
            onClick={() => onStart(doctor, session)}
            style={{ 
              padding: '10px 18px', fontSize: '0.85rem', borderRadius: '10px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', cursor: 'pointer', fontWeight: 600, minHeight: '44px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <Play size={12} fill="white" /> Start Session
          </button>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: MANAGE QUEUE ---
const ManageQueue = ({ sessionData, onBack, onManualBooking, isEnding, onEndSession, setEditingToken, deleteTokenMutation }: any) => {
  const queryClient = useQueryClient();
  const { doctor, session, queueId } = sessionData;
  const { branchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'waiting' | 'completed' | 'skipped'>('waiting');
  const [waitingSearch, setWaitingSearch] = useState('');
  const [servedSearch, setServedSearch] = useState('');
  const [skippedSearch, setSkippedSearch] = useState('');

  const { data: queue, refetch: refetchQueue } = useQuery({
    queryKey: ['queueDetails', queueId],
    queryFn: () => queueService.getQueueDetails(queueId)
  });

  const { data: upcomingTokens, refetch: refetchTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId)
  });

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
    onSuccess: (newToken) => {
      if (newToken === 0) {
        notify.info('Queue Empty', 'No more patients are waiting.');
      } else {
        notify.success('Next Patient Called', `Token #${newToken} has been called.`);
      }
      refetchQueue();
      refetchTokens();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to call next patient";
      notify.danger('Call Failed', message);
    }
  });

  const markArrivedMutation = useMutation({
    mutationFn: () => queueService.markArrived(queueId),
    onSuccess: () => {
      notify.success('Doctor Arrived', `Dr. ${doctor.name} has been marked as present. Queue is now live.`);
      refetchQueue();
    }
  });

  const skipMutation = useMutation({
    mutationFn: () => queueService.skipToken(queueId),
    onSuccess: () => {
      notify.warning('Patient Skipped', 'The current patient was skipped.');
      refetchQueue();
      refetchTokens();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to skip token";
      notify.danger('Skip Failed', message);
    }
  });

  const alertMutation = useMutation({
    mutationFn: () => queueService.alertPatient(queueId),
    onSuccess: (success) => {
      if (success) {
        notify.success('WhatsApp Alert Sent', 'Patient was notified that their turn is coming up.');
        refetchQueue();
      } else {
        notify.danger('Alert Failed', 'No active patient to alert.');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to send alert";
      notify.danger('Alert Failed', message);
    }
  });

  const requeueMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.requeueToken(tokenId),
    onSuccess: () => {
      notify.info('Patient Re-queued', 'A skipped patient was added back to the waiting list.');
      refetchQueue();
      refetchTokens();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to requeue token";
      notify.danger('Requeue Failed', message);
    }
  });

  // mutations moved to parent

  const handleEndSession = () => {
    try {
      console.log("End Session button clicked in ManageQueue");
      onEndSession();
    } catch (err) {
      console.error("Error triggering end session:", err);
      alert("UI Error: " + err);
    }
  };

  // SignalR for real-time
  const connection = useQueueHub(branchId);
  useEffect(() => {
    if (connection) {
      const handleUpdate = (data: any) => {
        // Handle both camelCase and PascalCase from SignalR
        const incomingQueueId = data.queueId || data.QueueId;
        if (incomingQueueId === queueId) {
          refetchQueue();
          refetchTokens();
        }
      };
      const handleEnd = (data: any) => {
        const incomingQueueId = data.queueId || data.QueueId;
        if (incomingQueueId === queueId) {
          console.log("Queue ended via notification, going back...");
          onBack();
        }
      };
      connection.on('TokenUpdated', handleUpdate);
      connection.on('QueueEnded', handleEnd);
      return () => { 
        connection.off('TokenUpdated', handleUpdate); 
        connection.off('QueueEnded', handleEnd);
      };
    }
  }, [connection, queueId, refetchQueue, refetchTokens]);

  if (!queue) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Clock size={40} className="animate-spin" style={{ opacity: 0.2 }} />
    </div>
  );

  const isDoctorArrived = queue.status === 1;

  const secondaryControlStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s'
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }} className="flex-mobile-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: 'white', display: 'flex' }}>
            <ArrowLeft size={24} />
          </button>
          <button 
            onClick={() => { refetchQueue(); refetchTokens(); }} 
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: 'var(--accent-color)', display: 'flex' }}
            title="Refresh Data"
          >
            <RotateCcw size={20} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Stethoscope size={24} color="var(--accent-color)" /> {queue?.doctorName || doctor.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{queue?.sessionName || session.sessionName} Session</span>
              <span className="desktop-only" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></span>
              <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="live-dot"></span> LIVE
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', width: '100%' }} className="full-width-mobile flex-mobile-column">
          <button type="button" onClick={onManualBooking} className="full-width-mobile" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
            <PlusCircle size={18} /> Booking
          </button>
          <button 
            type="button"
            onClick={handleEndSession}
            disabled={isEnding}
            className="full-width-mobile"
            style={{ 
              flex: 1,
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid var(--danger)', 
              color: 'var(--danger)', 
              padding: '12px', 
              borderRadius: '10px', 
              fontSize: '0.85rem',
              opacity: isEnding ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700
            }}
          >
            <Power size={18} /> End
          </button>
        </div>
      </div>

      {/* Header Stats - Doctor Specific */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatCard 
          icon={<Users />} 
          label="Total Registered" 
          value={(queue?.waitingCount || 0) + (queue?.completedCount || 0) + (queue?.skippedCount || 0) + (queue?.nowServing ? 1 : 0)} 
          color="var(--accent-color)" 
          subText="Total patients for today"
        />
        <StatCard 
          icon={<CheckCircle2 />} 
          label="Served Patients" 
          value={(queue?.completedCount || 0) + (queue?.nowServing ? 1 : 0)} 
          color="var(--success)" 
          subText={`${queue?.completedCount || 0} completed, ${queue?.nowServing ? '1 currently in cabin' : 'consultation room empty'}`}
        />
        <StatCard 
          icon={<Clock />} 
          label="Waiting Now" 
          value={queue?.waitingCount || 0} 
          color="#FACC15" 
          subText="Patients yet to be seen"
        />
        <StatCard 
          icon={<AlertCircle />} 
          label="Skipped" 
          value={queue?.skippedCount || 0} 
          color="var(--danger)" 
          subText="Patients who missed their turn"
        />
      </div>

      <div className="grid-manage-queue">
        {/* Now Serving Main Card */}
        <div className="glass-card now-serving-card" style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px',
          border: '1px solid rgba(56, 189, 248, 0.2)', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-glow)', filter: 'blur(100px)', opacity: 0.3 }}></div>

          <span className="currentTokenLabel" style={{ color: 'var(--accent-color)', fontWeight: 800, letterSpacing: '4px', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '20px' }}>Current Token</span>

          <div style={{ position: 'relative' }} key={queue.currentTokenNumber}>
            {(queue.currentTokenNumber === 0 || queue.currentPatientName === "No one") && queue.waitingCount === 0 ? (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
                <Users size={100} color="var(--accent-color)" style={{ marginBottom: '20px', opacity: 0.2 }} />
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'white', opacity: 0.5 }}>NOBODY IN QUEUE</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Waiting for new patients to register.</p>
              </div>
            ) : (
              <>
                <h1 className="token-number-animate" style={{ fontSize: '12rem', margin: 0, lineHeight: 0.8, fontWeight: 900, textShadow: '0 0 60px var(--accent-glow)', color: 'white' }}>
                  {queue.currentTokenNumber || '--'}
                </h1>
                {callNextMutation.isPending && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', borderRadius: '20px' }}>
                    <Clock size={60} className="animate-spin" color="var(--accent-color)" />
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }} className="full-width-mobile">
            <div className="patient-name-box" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '15px 40px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <UserCircle size={28} color="var(--accent-color)" />
              <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{queue.currentPatientName || 'Waiting...'}</span>
            </div>
            {queue.currentPatientName && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="var(--success)" /> Patient at Consultation
              </span>
            )}
          </div>
        </div>

        {/* Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
            <button
              onClick={() => callNextMutation.mutate()}
              disabled={!isDoctorArrived || callNextMutation.isPending}
              className="btn-primary call-next-btn"
              style={{
                padding: '30px', fontSize: '1.5rem', borderRadius: '20px',
                opacity: (!isDoctorArrived) ? 0.5 : 1,
                cursor: (!isDoctorArrived) ? 'not-allowed' : 'pointer'
              }}
            >
              <UserCheck size={32} /> {callNextMutation.isPending ? 'Calling...' : 'Call Next'}
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button
                style={{ ...secondaryControlStyle, opacity: (!isDoctorArrived || !queue.currentTokenNumber) ? 0.5 : 1 }}
                onClick={() => skipMutation.mutate()}
                disabled={!isDoctorArrived || skipMutation.isPending || !queue.currentTokenNumber}
              >
                {skipMutation.isPending ? <Clock size={22} className="animate-spin" /> : <SkipForward size={22} />}
                {skipMutation.isPending ? 'Skipping...' : 'Skip'}
              </button>
              <button
                style={{ ...secondaryControlStyle, opacity: (!isDoctorArrived || !queue.currentTokenNumber) ? 0.5 : 1 }}
                onClick={() => alertMutation.mutate()}
                disabled={!isDoctorArrived || alertMutation.isPending || !queue.currentTokenNumber}
              >
                {alertMutation.isPending ? <Clock size={22} className="animate-spin" /> : <MessageSquare size={22} />}
                {alertMutation.isPending ? 'Alerting...' : 'Alert'}
              </button>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 0' }}></div>

            <button
              onClick={() => markArrivedMutation.mutate()}
              disabled={isDoctorArrived || markArrivedMutation.isPending}
              style={{
                background: isDoctorArrived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)',
                color: 'var(--success)', border: `1px solid ${isDoctorArrived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.4)'}`,
                padding: '20px', borderRadius: '18px', cursor: isDoctorArrived ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontWeight: 800,
                fontSize: '1.1rem', transition: 'all 0.3s'
              }}
            >
              {isDoctorArrived ? <CheckCircle2 size={24} /> : <Play size={24} />}
              {isDoctorArrived ? "Doctor is Present" : "Mark Doctor Arrival"}
            </button>

            {!isDoctorArrived && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#F87171', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                <Info size={14} /> You must mark arrival to call patients.
              </p>
            )}
          </div>

          <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-color)', borderRadius: '12px' }}>
              <Info size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Queue Integrity</p>
              <p style={{ margin: 0, fontWeight: 700 }}>Real-time syncing is active.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Search Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '25px' }} className="flex-mobile-column">
        <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '14px', width: '100%', overflowX: 'auto' }} className="no-scrollbar">
          <button 
            onClick={() => setActiveTab('waiting')}
            style={{ 
              padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: activeTab === 'waiting' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'waiting' ? 'black' : 'var(--text-secondary)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
            }}
          >
            <Clock size={14} /> Waiting ({upcomingTokens?.filter((t: any) => t.status === 0).length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            style={{ 
              padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: activeTab === 'completed' ? 'var(--success)' : 'transparent',
              color: activeTab === 'completed' ? 'black' : 'var(--text-secondary)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
            }}
          >
            <CheckCircle2 size={14} /> Served ({upcomingTokens?.filter((t: any) => t.status === 2).length || 0})
          </button>
          <button 
            onClick={() => setActiveTab('skipped')}
            style={{ 
              padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: activeTab === 'skipped' ? 'var(--danger)' : 'transparent',
              color: activeTab === 'skipped' ? 'black' : 'var(--text-secondary)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
            }}
          >
            <AlertCircle size={14} /> Skipped ({upcomingTokens?.filter((t: any) => t.status === 3).length || 0})
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
          <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input
            type="text"
            placeholder={`Search in ${activeTab}...`}
            value={activeTab === 'waiting' ? waitingSearch : activeTab === 'completed' ? servedSearch : skippedSearch}
            onChange={(e) => {
              if (activeTab === 'waiting') setWaitingSearch(e.target.value);
              else if (activeTab === 'completed') setServedSearch(e.target.value);
              else setSkippedSearch(e.target.value);
            }}
            style={{ 
              width: '100%', padding: '14px 15px 14px 45px', borderRadius: '12px', 
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', fontSize: '1rem'
            }}
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '20px 30px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Hash size={14} /> Token</div>
                </th>
                <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> Patient Name</div>
                </th>
                <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Search size={14} /> Phone Number</div>
                </th>
                <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} /> Check-in</div>
                </th>
                {activeTab === 'completed' && (
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} /> Checkout</div>
                  </th>
                )}
                {activeTab === 'skipped' && (
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><X size={14} /> Skipped Time</div>
                  </th>
                )}
                <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} /> Status</div>
                </th>
                {activeTab !== 'completed' && (
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right', paddingRight: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}><Zap size={14} /> Actions</div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = upcomingTokens?.filter((t: any) => {
                  const currentSearch = activeTab === 'waiting' ? waitingSearch : activeTab === 'completed' ? servedSearch : skippedSearch;
                  const matchesSearch = t.patientName.toLowerCase().includes(currentSearch.toLowerCase()) || 
                                       t.tokenNumber.toString().includes(currentSearch);
                  if (!matchesSearch) return false;

                  if (activeTab === 'waiting') return t.status === 0;
                  if (activeTab === 'completed') return t.status === 2;
                  if (activeTab === 'skipped') return t.status === 3;
                  return false;
                });

                if (!filtered || filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', opacity: 0.4 }}>
                            <Users size={40} />
                            <span>{waitingSearch || servedSearch || skippedSearch ? "No matching patients found" : "Nobody in the queue"}</span>
                         </div>
                      </td>
                    </tr>
                  );
                }

                return filtered.map((t: any) => (
                  <tr key={t.id} className="table-row-hover" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '22px 30px', fontWeight: 900, color: 'var(--accent-color)', fontSize: '1.2rem' }}>#{t.tokenNumber}</td>
                    <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t.patientName}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{t.patientPhone}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    {activeTab === 'completed' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </td>
                    )}
                    {activeTab === 'skipped' && (
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </td>
                    )}
                    <td>
                      {t.status === 0 && <span style={{ ...badgeStyle, color: 'var(--accent-color)', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>Pending</span>}
                      {t.status === 2 && <span style={{ ...badgeStyle, color: 'var(--success)', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>Served</span>}
                      {t.status === 3 && <span style={{ ...badgeStyle, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Skipped</span>}
                    </td>
                    {activeTab !== 'completed' && (
                      <td style={{ textAlign: 'right', paddingRight: '30px' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          {t.status === 3 && (
                            <button 
                              onClick={() => requeueMutation.mutate(t.id)}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', border: 'none', color: 'var(--accent-color)', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                            >
                              <Play size={16} fill="var(--accent-color)" /> Requeue
                            </button>
                          )}
                          {t.status !== 2 && (
                            <>
                              <button 
                                onClick={() => setEditingToken(t)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--accent-color)', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => { if(window.confirm("Are you sure you want to delete this token?")) deleteTokenMutation.mutate(t.id); }}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const badgeStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '30px', background: 'rgba(255,255,255,0.05)',
  fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
  border: '1px solid rgba(255,255,255,0.1)'
};

const EditTokenModal = ({ token, isOpen, onClose, onSave }: any) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{name?: string, phone?: string}>({});
 
  useEffect(() => {
    if (token && isOpen) {
      setName(token.patientName || '');
      // Clean phone number when loading
      const cleanPhone = (token.patientPhone || '').replace(/\D/g, '').slice(-10);
      setPhone(cleanPhone);
      setErrors({});
    }
  }, [token, isOpen]);
 
  if (!isOpen) return null;
 
  const validate = () => {
    const newErrors: {name?: string, phone?: string} = {};
    if (name.trim().length < 2) newErrors.name = "Name is too short";
    if (phone.length > 0 && !/^\d{10}$/.test(phone)) newErrors.phone = "Enter exactly 10 digits";
    if (!phone) newErrors.phone = "Phone number is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 
  const handleSave = () => {
    if (validate()) {
      onSave({ patientName: name.trim(), patientPhone: phone });
    }
  };
 
  const isValid = name.trim().length >= 2 && /^\d{10}$/.test(phone);
 
  return (
    <Modal title="Edit Patient Details" onClose={onClose} icon={<Edit color="var(--accent-color)" />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <User size={14} /> Patient Name
          </label>
          <input 
            value={name} 
            onChange={(e) => { setName(e.target.value); setErrors(prev => ({...prev, name: undefined})); }} 
            placeholder="Enter name"
            style={{ borderColor: errors.name ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.name && <p style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '5px' }}>{errors.name}</p>}
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Smartphone size={14} /> Phone Number (WhatsApp)
          </label>
          <input 
            value={phone} 
            onChange={(e) => { 
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPhone(val);
              setErrors(prev => ({...prev, phone: undefined}));
            }} 
            placeholder="10 digit number"
            style={{ borderColor: errors.phone ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.phone && <p style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '5px' }}>{errors.phone}</p>}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button 
            onClick={onClose} 
            style={{ 
              flex: 1, padding: '10px 20px', borderRadius: '8px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '0.9rem', fontWeight: 600
            }}
          >
            <X size={18} /> Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!isValid}
            style={{ 
              flex: 1.5, padding: '10px 20px', borderRadius: '8px', 
              background: isValid ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', 
              border: 'none', color: isValid ? 'black' : 'rgba(255,255,255,0.3)', 
              fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem'
            }}
          >
            <CheckCircle2 size={18} /> Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QueueDashboard;

