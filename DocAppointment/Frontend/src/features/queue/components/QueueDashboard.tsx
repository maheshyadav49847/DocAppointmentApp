import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck, Play, PlusCircle, MessageSquare, LayoutDashboard,
  Stethoscope, Clock, Users, CheckCircle2,
  SkipForward, UserCircle, Activity, Info, Power,
  ArrowLeft, ChevronRight, RotateCcw,
  AlertCircle, AlertTriangle, Search, Edit, Trash2, X, Settings, User, Smartphone, Hash, Zap
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
import PageHeader from '../../../components/UI/PageHeader';

const QueueDashboard: React.FC = () => {
  const { branchId: globalBranchId, orgId, setBranch } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedBranchId, _setSelectedBranchId] = useState<string>(globalBranchId || '');

  const setSelectedBranchId = (id: string) => {
    _setSelectedBranchId(id);
    setBranch(id); // Persistent global update
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get('mode') as 'overview' | 'manage') || 'overview';
  const urlQueueId = searchParams.get('queueId');

  const [activeSession, setActiveSession] = useState<any>(null); // { doctor, session, queueId }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckingWhatsApp, setIsCheckingWhatsApp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingSessions, setProcessingSessions] = useState<Set<string>>(new Set());
  const [confirmEndSession, setConfirmEndSession] = useState<{ isOpen: boolean; queueId: string | null }>({ isOpen: false, queueId: null });
  const [editingToken, setEditingToken] = useState<any>(null);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

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
    const sessionKey = `${doctor.id}_${session.id}`;
    setProcessingSessions(prev => new Set(prev).add(sessionKey));

    console.log("Starting session for:", doctor.name, session.sessionName);
    try {
      const response = await queueService.initializeQueue(doctor.id, session.id);

      // Ensure we have a string ID regardless of response format
      const queueId = response?.id || response?.queueId || (typeof response === 'string' ? response : null);

      if (!queueId) {
        throw new Error("Failed to get valid Queue ID from server");
      }

      console.log("Queue initialized with ID:", queueId);

      // Update cache immediately
      queryClient.setQueryData(['activeQueue', doctor.id, session.id], {
        id: queueId,
        doctorId: doctor.id,
        sessionId: session.id,
        status: 0
      });

      // Save to sessionStorage for persistence
      const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}');
      startedSessions[sessionKey] = queueId;
      sessionStorage.setItem('started_sessions', JSON.stringify(startedSessions));

      notify.success('Session Started', `Queue opened for Dr. ${doctor.name}.`);

      // Navigate to manage view
      handleManageSession(doctor, session, queueId);

      // Background refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['activeQueue', doctor.id, session.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      }, 500);
    } catch (e: any) {
      console.error("Initialize Queue Error:", e);
      notify.danger('Session Failed', e.response?.data?.message || 'Could not start queue. Please try again.');
    } finally {
      setProcessingSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionKey);
        return next;
      });
    }
  };



  const handleManageSession = (doctor: any, session: any, queueId: string) => {
    setActiveSession({ doctor, session, queueId });
    setSearchParams({ mode: 'manage', queueId: queueId });
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
    onSuccess: (_result, queueId) => {
      console.log("End Queue Mutation successful");
      notify.info('Session Ended', `Queue for ${activeSession?.doctor?.name || 'doctor'} has been closed.`);

      // Cleanup fallback session storage to ensure button reverts to "Start Session"
      try {
        const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}');
        const newSessions = { ...startedSessions };
        let changed = false;
        Object.keys(newSessions).forEach(key => {
          if (newSessions[key] === queueId) {
            delete newSessions[key];
            changed = true;
          }
        });
        if (changed) {
          sessionStorage.setItem('started_sessions', JSON.stringify(newSessions));
        }
      } catch (err) {
        console.error("Error cleaning up sessionStorage:", err);
      }

      setConfirmEndSession({ isOpen: false, queueId: null });
      setSearchParams({}); // Back to overview
      setActiveSession(null);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    },
    onError: (err: any) => {
      console.error("End Queue Mutation failed:", err);
      notify.danger('End Session Failed', err.response?.data?.message || err.message);
    }
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (tokenId: string) => queueService.deleteToken(tokenId),
    onSuccess: () => {
      notify.warning('Token Removed', 'A patient token was deleted from the queue.');
      setDeletingTokenId(null);
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

  const handleManualBookingSubmit = async (data: { name: string; phone: string }) => {
    if (!activeSession?.queueId) return;

    // Strict Client-side duplicate check
    // We search across ALL tokens in the current session (Pending and Now Serving)
    const queueData = queryClient.getQueryData(['upcomingTokens', activeSession.queueId]) as any[];
    const isDuplicate = queueData && queueData.some((t: any) =>
      t.patientPhone === data.phone && (t.status === 0 || t.status === 1)
    );

    if (isDuplicate) {
      notify.danger("Duplicate Patient", "This patient is already in the queue!");
      return;
    }

    setIsCheckingWhatsApp(true);
    try {
      const result = await queueService.checkWhatsAppNumber(selectedBranchId, data.phone);

      if (result?.isError) {
        notify.info("Verification Skipped", "WhatsApp bridge is offline. Booking will proceed without verification.");
      } else if (result && result.ready && !result.exists) {
        const confirmSave = window.confirm("WhatsApp is not active on this number. Do you still want to save?");
        if (!confirmSave) {
          return;
        }
      }
    } catch (err) {
      console.error("Error checking WhatsApp availability:", err);
      notify.info("Verification Skipped", "Could not verify WhatsApp number. Proceeding anyway.");
    } finally {
      setIsCheckingWhatsApp(false);
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
          processingSessions={processingSessions}
        />
      ) : (
        <ManageQueue
          sessionData={activeSession || { queueId: urlQueueId }}
          onBack={() => {
            setSearchParams({});
            setActiveSession(null);
            queryClient.resetQueries({ queryKey: ['activeQueue'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          }}
          onManualBooking={() => setIsModalOpen(true)}
          isEnding={endQueueMutation.isPending}
          onEndSession={() => setConfirmEndSession({ isOpen: true, queueId: urlQueueId || activeSession?.queueId })}
          setEditingToken={setEditingToken}
          setDeletingTokenId={setDeletingTokenId}
          deleteTokenMutation={deleteTokenMutation}
        />
      )}

      <ManualBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleManualBookingSubmit}
        isLoading={createTokenMutation.isPending || isCheckingWhatsApp}
      />

      {confirmEndSession.isOpen && (
        <ConfirmDialog
          title="End Session?"
          message="Are you sure you want to end this doctor's session? This will mark the queue as completed."
          onConfirm={() => {
            if (confirmEndSession.queueId) {
              console.log("Proceeding with end session for:", confirmEndSession.queueId);
              endQueueMutation.mutate(confirmEndSession.queueId);
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

      {deletingTokenId && (
        <Modal title="Confirm Deletion" onClose={() => setDeletingTokenId(null)} icon={<AlertTriangle size={24} color="var(--danger)" />}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={30} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px' }}>Are you sure you want to remove this patient from the queue? This will mark the token as cancelled.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setDeletingTokenId(null)} style={{ flex: 1, padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}><X size={16} /> No, Keep</button>
              <button
                onClick={() => deleteTokenMutation.mutate(deletingTokenId)}
                className="btn-primary"
                style={{ flex: 1, background: 'var(--danger)', border: '1px solid var(--danger)', padding: '10px 20px', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Trash2 size={18} /> {deleteTokenMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: OVERVIEW ---
const Overview = ({ doctors, stats, searchQuery, setSearchQuery, onStart, onManage, selectedBranchId, setSelectedBranchId, branches, processingSessions }: any) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
      <PageHeader
        title="Queue"
        accentTitle="Dashboard"
        subtitle="Monitor and manage doctor sessions in real-time."
        icon={<LayoutDashboard />}
        rightElement={
          <div style={{ minWidth: '250px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <Building2 size={14} /> Hospital Branch
            </label>
            <select
              data-tooltip="Switch hospital branch dashboard"
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
        }
      />

      {!selectedBranchId ? (
        <div style={{ textAlign: 'center', padding: '120px', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Building2 size={80} style={{ marginBottom: '30px', opacity: 0.1, color: 'var(--accent-color)' }} />
          <h2 style={{ color: 'white', fontSize: '2rem' }}>Operational Oversight</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '15px auto' }}>Please select a hospital branch from the header to monitor live patient queues and manage professional sessions.</p>
        </div>
      ) : (
        <>
          {/* Header Stats */}
          <div className="grid-stats">
            <StatCard data-tooltip="Total patients registered across all sessions today" icon={<Users />} label="Total Patients" value={stats?.totalPatientsToday || 0} color="var(--accent-color)" />
            <StatCard data-tooltip="Total patients successfully served today" icon={<CheckCircle2 />} label="Completed" value={stats?.completedPatients || 0} color="var(--success)" />
            <StatCard data-tooltip="Total patients marked as absent today" icon={<AlertCircle />} label="Skipped" value={stats?.skippedPatients || 0} color="var(--danger)" />
            <StatCard data-tooltip="Average wait time for patients across all sessions" icon={<Clock />} label="Avg Wait Time" value={`${stats?.avgWaitTimeMinutes || 0}m`} color="#FACC15" />
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
                    data-tooltip="Find doctor by name or specialty"
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
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  onStart={onStart}
                  onManage={onManage}
                  selectedBranchId={selectedBranchId}
                  processingSessions={processingSessions}
                />
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

const StatCard = ({ icon, label, value, color, subText, ...props }: any) => (
  <div className="glass-card stat-card-responsive" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', overflow: 'hidden' }} {...props}>
    <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', background: color, filter: 'blur(50px)', opacity: 0.1 }}></div>
    <div style={{ color: color, display: 'flex', zIndex: 1 }}>
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
    <div className="modal-card" style={{ width: '100%', maxWidth: '450px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
        <Power size={40} />
      </div>
      <h2 style={{ margin: '0 0 10px', fontSize: '1.8rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '35px', lineHeight: '1.6' }}>{message}</p>
      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          data-tooltip="Return to management console"
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
          data-tooltip="Terminate session and close queue"
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

const DoctorCard = ({ doctor, onStart, onManage, selectedBranchId, processingSessions }: any) => {
  const { data: sessions } = useQuery({
    queryKey: ['sessions', doctor.id, selectedBranchId],
    queryFn: () => sessionService.getSessions(doctor.id, selectedBranchId)
  });

  const [selectedSessId, setSelectedSessId] = useState<string | null>(null);
  const today = new Date().getDay();
  const todaysSessions = useMemo(() => sessions?.filter((s: any) => s.isDaily || s.dayOfWeek === today) || [], [sessions, today]);

  useEffect(() => {
    if (todaysSessions.length > 0 && !selectedSessId) {
      // Priority: Select the session that is currently live (in sessionStorage)
      try {
        const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}');
        const liveSession = todaysSessions.find((s: any) => !!startedSessions[`${doctor.id}_${s.id}`]);

        if (liveSession) {
          setSelectedSessId(liveSession.id);
          return;
        }
      } catch (e) {
        console.error("Error reading started_sessions for auto-select:", e);
      }

      // Fallback: Default to first session
      setSelectedSessId(todaysSessions[0].id);
    }
  }, [todaysSessions, selectedSessId, doctor.id]);

  const activeSess = todaysSessions.find((s: any) => s.id === selectedSessId) || todaysSessions[0];

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

      {todaysSessions.length > 1 && (
        <div className="custom-scrollbar" style={{
          padding: '0 25px 15px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollBehavior: 'smooth'
        }}>
          {todaysSessions.map((sess: any) => (
            <button
              key={sess.id}
              onClick={() => setSelectedSessId(sess.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: selectedSessId === sess.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                color: selectedSessId === sess.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: `1px solid ${selectedSessId === sess.id ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={12} />
              {sess.sessionName}
            </button>
          ))}
        </div>
      )}

      {todaysSessions.length === 0 ? (
        <div style={{ padding: '0 25px 25px' }}>
          <div style={{ padding: '15px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No scheduled shifts today.</p>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 25px 25px' }}>
          <SessionItem
            doctor={doctor}
            session={activeSess}
            onStart={onStart}
            onManage={onManage}
            isProcessing={processingSessions?.has(`${doctor.id}_${activeSess?.id}`)}
          />
        </div>
      )}
    </div>
  );
};

const SessionItem = ({ doctor, session, onStart, onManage, isProcessing }: any) => {
  const { data: activeQueue } = useQuery({
    queryKey: ['activeQueue', doctor.id, session.id],
    queryFn: () => queueService.getActiveQueueBySession(doctor.id, session.id),
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Check if session was recently started in this browser session (fallback)
  const startedSessions = JSON.parse(sessionStorage.getItem('started_sessions') || '{}');
  const fallbackQueueId = startedSessions[`${doctor.id}_${session.id}`];

  // Sticky logic: Jab tak fallback ID hai ya backend active queue bol raha hai, tab tak "Manage" hi dikhega.
  // Fallback ID sirf endQueueMutation.onSuccess pe hi delete hota hai.
  const isLive = !!fallbackQueueId || (!!activeQueue && !!activeQueue.id);
  const displayQueueId = activeQueue?.id || fallbackQueueId;

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
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600 }}>
              {session.isDaily ? 'EVERY DAY (DAILY)' : 'SPECIFIC DAY'}
            </span>
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
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)',
        padding: '18px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.05)',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', gap: '20px', width: '100%', justifyContent: 'space-between' }}>
          <div data-tooltip="Total patients currently waiting" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Wait</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-color)' }}>{activeQueue?.waitingCount || 0}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
          <div data-tooltip="Patients successfully treated today" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Done</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>{activeQueue?.completedCount || 0}</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }}></div>
          <div data-tooltip="Patients who were skipped" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Skip</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)' }}>{activeQueue?.skippedCount || 0}</span>
          </div>
        </div>

        {isLive ? (
          <button
            data-tooltip="Open queue management console"
            className="btn-primary doctor-card-btn"
            onClick={() => onManage(doctor, session, displayQueueId)}
            style={{
              width: '100%',
              padding: '12px 18px', fontSize: '0.85rem', borderRadius: '10px',
              minHeight: '44px', gap: '8px', fontWeight: 700
            }}
          >
            <Settings size={14} /> Manage Session
          </button>
        ) : (
          <button
            data-tooltip="Initialize queue for this shift"
            className="start-btn doctor-card-btn"
            onClick={() => onStart(doctor, session)}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '12px 18px', fontSize: '0.85rem', borderRadius: '10px',
              minHeight: '44px', gap: '8px', fontWeight: 700,
              background: isProcessing ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              color: 'var(--accent-color)',
              opacity: isProcessing ? 0.7 : 1,
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessing ? (
              <Clock size={12} className="animate-spin" />
            ) : (
              <Play size={12} fill="var(--accent-color)" />
            )}
            {isProcessing ? 'Starting...' : 'Start Session'}
          </button>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: MANAGE QUEUE ---
const ManageQueue = ({ sessionData, onBack, onManualBooking, isEnding, onEndSession, setEditingToken, setDeletingTokenId }: any) => {
  const queryClient = useQueryClient();
  const { doctor, session, queueId } = sessionData;
  const { branchId, role: userRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'waiting' | 'completed' | 'skipped'>('waiting');
  const [waitingSearch, setWaitingSearch] = useState('');
  const [servedSearch, setServedSearch] = useState('');
  const [skippedSearch, setSkippedSearch] = useState('');

  const { data: queue, refetch: refetchQueue, isRefetching: isRefetchingQueue } = useQuery({
    queryKey: ['queueDetails', queueId],
    queryFn: () => queueService.getQueueDetails(queueId)
  });

  const { data: upcomingTokens, refetch: refetchTokens, isRefetching: isRefetchingTokens } = useQuery({
    queryKey: ['upcomingTokens', queueId],
    queryFn: () => queueService.getUpcomingTokens(queueId)
  });

  const isRefreshing = isRefetchingQueue || isRefetchingTokens;
  const [isManualSync, setIsManualSync] = useState(false);

  const handleRefresh = async () => {
    setIsManualSync(true);
    await Promise.all([refetchQueue(), refetchTokens()]);
    notify.success('Sync Complete', 'Queue data updated.');
    // Add a slight delay so the user can see the spin even if the network is instant
    setTimeout(() => setIsManualSync(false), 500);
  };

  const callNextMutation = useMutation({
    mutationFn: () => queueService.callNext(queueId),
    onSuccess: (newToken) => {
      if (newToken === 0) {
        notify.info('Queue Empty', 'No more patients are waiting.');
      } else {
        notify.success('Next Patient Called', `Token ${newToken} is now being called.`);
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

  const completeMutation = useMutation({
    mutationFn: () => queueService.completeToken(queueId),
    onSuccess: () => {
      notify.success('Consultation Complete', 'The current patient consultation is marked as completed.');
      refetchQueue();
      refetchTokens();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to complete consultation";
      notify.danger('Completion Failed', message);
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

  const handleEndSession = () => {
    try {
      console.log("End Session button clicked in ManageQueue");
      onEndSession();
    } catch (err) {
      console.error("Error triggering end session:", err);
      notify.danger('UI Error', String(err));
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
            data-tooltip="Refresh live queue data"
            onClick={handleRefresh} 
            disabled={isRefreshing || isManualSync}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', 
              padding: '10px', 
              borderRadius: '8px', 
              cursor: (isRefreshing || isManualSync) ? 'not-allowed' : 'pointer', 
              color: (isRefreshing || isManualSync) ? 'var(--text-secondary)' : 'var(--accent-color)', 
              display: 'flex',
              opacity: (isRefreshing || isManualSync) ? 0.7 : 1,
              transition: 'all 0.3s',
              transform: (isRefreshing || isManualSync) ? 'scale(0.95)' : 'scale(1)'
            }}
            title="Refresh Data"
          >
            <RotateCcw size={20} className={(isRefreshing || isManualSync) ? 'animate-spin' : ''} />
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

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            data-tooltip="Permanently close this doctor's session"
            type="button"
            onClick={handleEndSession}
            disabled={isEnding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.75rem',
              opacity: isEnding ? 0.5 : 1,
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <Power size={18} /> End Session
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
            {(!queue.currentTokenNumber || queue.currentPatientName === "No one") ? (
              <button
                data-tooltip="Call the next patient in line"
                onClick={() => callNextMutation.mutate()}
                disabled={callNextMutation.isPending || !isDoctorArrived || queue.waitingCount === 0}
                className="btn-primary call-next-btn"
                style={{
                  padding: '35px', fontSize: '1.6rem', borderRadius: '20px',
                  opacity: (!isDoctorArrived || queue.waitingCount === 0) ? 0.5 : 1,
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px'
                }}
              >
                <UserCheck size={35} /> {callNextMutation.isPending ? 'Calling...' : 'Call Next'}
              </button>
            ) : (
              <button
                data-tooltip="Mark current as complete AND call next patient instantly"
                onClick={async () => {
                  try {
                    await completeMutation.mutateAsync();
                    if (queue.waitingCount > 0) {
                      callNextMutation.mutate();
                    }
                  } catch (e) { }
                }}
                disabled={completeMutation.isPending || callNextMutation.isPending}
                className="btn-primary"
                style={{
                  padding: '35px',
                  fontSize: '1.6rem',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, var(--success) 0%, #166534 100%)',
                  border: 'none',
                  boxShadow: '0 10px 20px rgba(34, 197, 94, 0.2)',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px'
                }}
              >
                {completeMutation.isPending || callNextMutation.isPending ?
                  <Clock size={32} className="animate-spin" /> :
                  <><CheckCircle2 size={32} /> <ChevronRight size={32} /> Complete & Next</>
                }
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

              <button
                data-tooltip="Mark consultation as complete"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || !queue.currentTokenNumber}
                style={{
                  ...secondaryControlStyle,
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: 'var(--success)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  opacity: (!queue.currentTokenNumber) ? 0.5 : 1
                }}
              >
                {completeMutation.isPending ? <Clock size={22} className="animate-spin" /> : <CheckCircle2 size={22} />}
                Complete
              </button>

              <button
                data-tooltip="Skip current patient's turn"
                style={{ ...secondaryControlStyle, opacity: (!queue.currentTokenNumber) ? 0.5 : 1 }}
                onClick={() => skipMutation.mutate()}
                disabled={skipMutation.isPending || !queue.currentTokenNumber}
              >
                {skipMutation.isPending ? <Clock size={22} className="animate-spin" /> : <SkipForward size={22} />}
                Skip
              </button>
            </div>

            <button
              data-tooltip="Send WhatsApp alert to current patient"
              style={{ ...secondaryControlStyle, opacity: (!queue.currentTokenNumber) ? 0.5 : 1 }}
              onClick={() => alertMutation.mutate()}
              disabled={alertMutation.isPending || !queue.currentTokenNumber}
            >
              {alertMutation.isPending ? <Clock size={22} className="animate-spin" /> : <MessageSquare size={22} />}
              {alertMutation.isPending ? 'Alerting...' : 'Alert Patient'}
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 0' }}></div>

            <button
              data-tooltip="Mark doctor's presence (optional)"
              onClick={() => markArrivedMutation.mutate()}
              disabled={isDoctorArrived || markArrivedMutation.isPending}
              style={{
                background: isDoctorArrived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                color: isDoctorArrived ? 'var(--success)' : 'white',
                border: `1px solid ${isDoctorArrived ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.1)'}`,
                padding: '15px', borderRadius: '14px', cursor: isDoctorArrived ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 600,
                fontSize: '0.9rem', transition: 'all 0.3s'
              }}
            >
              {isDoctorArrived ? <CheckCircle2 size={18} /> : <Play size={18} />}
              {isDoctorArrived ? "Doctor is Present" : "Mark Arrival"}
            </button>
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

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', maxWidth: '600px', marginLeft: 'auto' }} className="flex-mobile-column">
          <div style={{ position: 'relative', flex: 1 }}>
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
                width: '100%', padding: '12px 15px 12px 45px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', fontSize: '0.9rem'
              }}
            />
          </div>

          <button
            data-tooltip="Manually book a patient in the queue"
            type="button"
            onClick={onManualBooking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.75rem',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <PlusCircle size={18} /> New Booking
          </button>
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
                              data-tooltip="Requeue: Move patient back to waiting list"
                              onClick={() => requeueMutation.mutate(t.id)}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', border: 'none', color: 'var(--accent-color)', padding: '10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Play size={16} fill="var(--accent-color)" />
                            </button>
                          )}
                          {t.status !== 2 && (
                            <>
                              <button
                                data-tooltip="Modify patient details"
                                onClick={() => setEditingToken(t)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--accent-color)', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
                              >
                                <Edit size={18} />
                              </button>
                              {(['orgadmin', 'branchadmin', 'superadmin', 'receptionist'].includes(userRole?.toLowerCase().replace(/\s/g, '') || '')) && (
                                <button
                                  data-tooltip="Delete: Permanently remove from queue"
                                  onClick={() => setDeletingTokenId(t.id)}
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', padding: '10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
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
  const [errors, setErrors] = useState<{ name?: string, phone?: string }>({});

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
    const newErrors: { name?: string, phone?: string } = {};
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
          <label data-tooltip="Update patient's official name" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <User size={14} /> Patient Name
          </label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
            placeholder="Enter name"
            style={{ borderColor: errors.name ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.name && <p style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '5px' }}>{errors.name}</p>}
        </div>
        <div>
          <label data-tooltip="Update WhatsApp contact for notifications" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Smartphone size={14} /> Phone Number (WhatsApp)
          </label>
          <input
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPhone(val);
              setErrors(prev => ({ ...prev, phone: undefined }));
            }}
            placeholder="10 digit number"
            style={{ borderColor: errors.phone ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
          />
          {errors.phone && <p style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '5px' }}>{errors.phone}</p>}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button
            data-tooltip="Discard changes and return"
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
            data-tooltip="Update patient record in queue"
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

