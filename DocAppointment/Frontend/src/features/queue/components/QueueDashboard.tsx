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
import './QueueDashboard.css';

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
      queryClient.invalidateQueries({ queryKey: ['upcomingTokens', activeSession?.queueId || urlQueueId] });
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
    const currentQueueId = activeSession?.queueId || urlQueueId;
    if (!currentQueueId) {
      notify.danger("Error", "No active session found. Please try refreshing.");
      return;
    }

    // Strict Client-side duplicate check
    // We search across ALL tokens in the current session (Pending and Now Serving)
    const queueData = queryClient.getQueryData(['upcomingTokens', currentQueueId]) as any[];
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
      queueId: currentQueueId,
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
    <div className="loading-container">
      <div className="pulse-container">
        <Activity size={60} color="var(--accent-color)" className="animate-pulse" />
      </div>
      <p className="loading-text">PREPARING DASHBOARD...</p>
    </div>
  );

  return (
    <div className="queue-dashboard-container">
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
          <div className="modal-delete-content">
            <div className="modal-delete-icon-wrapper">
              <AlertTriangle size={30} />
            </div>
            <p className="modal-delete-text">Are you sure you want to remove this patient from the queue? This will mark the token as cancelled.</p>
            <div className="modal-actions-gap">
              <button onClick={() => setDeletingTokenId(null)} className="btn-secondary-ghost"><X size={16} /> No, Keep</button>
              <button
                onClick={() => deleteTokenMutation.mutate(deletingTokenId)}
                className="btn-danger-action"
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
    <div className="overview-container">
      <PageHeader
        title="Queue"
        accentTitle="Dashboard"
        subtitle="Monitor and manage doctor sessions in real-time."
        icon={<LayoutDashboard />}
        rightElement={
          <div className="branch-select-container">
            <label className="branch-select-label">
              <Building2 size={14} /> Hospital Branch
            </label>
            <select
              data-tooltip="Switch hospital branch dashboard"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="branch-select"
            >
              <option value="">Choose a branch...</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        }
      />

      {!selectedBranchId ? (
        <div className="no-branch-selected">
          <Building2 size={80} className="no-branch-icon" />
          <h2 className="no-branch-title">Operational Oversight</h2>
          <p className="no-branch-p">Please select a hospital branch from the header to monitor live patient queues and manage professional sessions.</p>
        </div>
      ) : (
        <>
          {/* Header Stats */}
          <div className="grid-stats">
            <StatCard data-tooltip="Total patients registered across all sessions today" icon={<Users />} label="Total Patients" value={stats?.totalPatientsToday || 0} variant="accent" />
            <StatCard data-tooltip="Total patients successfully served today" icon={<CheckCircle2 />} label="Completed" value={stats?.completedPatients || 0} variant="success" />
            <StatCard data-tooltip="Total patients marked as absent today" icon={<AlertCircle />} label="Skipped" value={stats?.skippedPatients || 0} variant="danger" />
            <StatCard data-tooltip="Average wait time for patients across all sessions" icon={<Clock />} label="Avg Wait Time" value={`${stats?.avgWaitTimeMinutes || 0}m`} variant="warning" />
          </div>

          <div className="glass-card sessions-card-body">
            <div className="sessions-header-actions flex-mobile-column">
              <div className="active-sessions-title-wrapper">
                <div className="active-sessions-icon-bg">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h3 className="active-sessions-title">Active Sessions</h3>
                  <p className="active-sessions-subtitle">Doctors currently handling patient queues</p>
                </div>
              </div>
              <div className="search-input-wrapper flex-mobile-column full-width-mobile">
                <div className="search-input-container">
                  <Search size={18} className="search-icon-pos" />
                  <input
                    data-tooltip="Find doctor by name or specialty"
                    type="text"
                    placeholder="Search doctor or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-field"
                  />
                </div>
              </div>
            </div>

            <div className="divider-light" />

            <div className="queue-grid-sessions">
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
              <div className="no-doctors-found">
                <AlertCircle size={40} color="var(--text-secondary)" className="no-doctors-icon" />
                <h3>No doctors found</h3>
                <p>Try adjusting your search query.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, variant, subText, ...props }: any) => (
  <div className={`glass-card stat-card-responsive stat-card-container stat-card-${variant}`} {...props}>
    <div className="stat-card-glow bg-current-color"></div>
    <div className="stat-card-icon-wrapper text-current-color">
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div className="stat-card-content">
      <p className="stat-card-label">{label}</p>
      <h3 className="stat-card-value">{value}</h3>
      {subText && <p className="stat-card-subtext desktop-only">{subText}</p>}
    </div>
  </div>
);

const ConfirmDialog = ({ title, message, onConfirm, onCancel }: any) => (
  <div className="confirm-dialog-overlay">
    <div className="modal-card confirm-dialog-card">
      <div className="confirm-dialog-icon-bg">
        <Power size={40} />
      </div>
      <h2 className="confirm-dialog-title">{title}</h2>
      <p className="confirm-dialog-message">{message}</p>
      <div className="modal-actions-gap">
        <button
          data-tooltip="Return to management console"
          onClick={onCancel}
          className="btn-cancel-dialog"
        >
          <X size={18} /> Cancel
        </button>
        <button
          data-tooltip="Terminate session and close queue"
          onClick={onConfirm}
          className="btn-confirm-end"
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
    <div className="glass-card doctor-status-card doctor-card-container">
      <div className="doctor-card-header doctor-card-header-wrapper">
        <div className="doctor-card-avatar-bg">
          <UserCircle size={35} />
        </div>
        <div className="doctor-card-name-wrapper">
          <h3 className="doctor-card-name">{doctor.name}</h3>
          <div className="doctor-card-specialization">
            <Stethoscope size={14} />
            {doctor.specialization}
          </div>
        </div>
        <div className="doctor-card-sessions-count">
          <span className="doctor-card-sessions-label">SESSIONS</span>
          <span className="doctor-card-sessions-value">{sessions?.length || 0}</span>
        </div>
      </div>

      {todaysSessions.length > 1 && (
        <div className="custom-scrollbar doctor-sessions-tabs">
          {todaysSessions.map((sess: any) => (
            <button
              key={sess.id}
              onClick={() => setSelectedSessId(sess.id)}
              className={`doctor-session-tab-btn ${selectedSessId === sess.id ? 'active' : ''}`}
            >
              <Clock size={12} />
              {sess.sessionName}
            </button>
          ))}
        </div>
      )}

      {todaysSessions.length === 0 ? (
        <div className="no-shifts-container">
          <div className="no-shifts-card">
            <p className="no-shifts-text">No scheduled shifts today.</p>
          </div>
        </div>
      ) : (
        <div className="session-item-wrapper">
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
    <div className={`session-item-container ${isLive ? 'is-live' : 'is-idle'}`}>
      {/* Header: Name and Time */}
      <div className="session-item-header">
        <div className="session-item-title-row">
          <div className={`session-item-icon-bg ${isLive ? 'text-accent' : 'text-secondary'}`}>
            <Clock size={22} />
          </div>
          <div>
            <h4 className="session-item-title">{session.sessionName}</h4>
            <span className="session-item-type">
              {session.isDaily ? 'EVERY DAY (DAILY)' : 'SPECIFIC DAY'}
            </span>
            <div className="session-item-time">
              {session.startTime.substring(0, 5)} <ChevronRight size={10} /> {session.endTime.substring(0, 5)}
            </div>
          </div>
        </div>

        {isLive && (
          <div className="live-badge-wrapper">
            <div className="live-badge-label">
              <div className="live-dot"></div>
              <span className="live-badge-text">LIVE</span>
            </div>
            <div className="live-token-number">#{activeQueue?.currentTokenNumber || '0'}</div>
          </div>
        )}
      </div>

      {/* Stats and Action Row */}
      <div className="session-stats-container">
        <div className="session-stats-row">
          <div data-tooltip="Total patients currently waiting" className="session-stat-item">
            <span className="session-stat-label">Wait</span>
            <span className="session-stat-value text-accent">{activeQueue?.waitingCount || 0}</span>
          </div>
          <div className="session-stat-divider"></div>
          <div data-tooltip="Patients successfully treated today" className="session-stat-item">
            <span className="session-stat-label">Done</span>
            <span className="session-stat-value text-success">{activeQueue?.completedCount || 0}</span>
          </div>
          <div className="session-stat-divider"></div>
          <div data-tooltip="Patients who were skipped" className="session-stat-item">
            <span className="session-stat-label">Skip</span>
            <span className="session-stat-value text-danger">{activeQueue?.skippedCount || 0}</span>
          </div>
        </div>

        {isLive ? (
          <button
            data-tooltip="Open queue management console"
            className="btn-primary doctor-card-btn manage-session-btn"
            onClick={() => onManage(doctor, session, displayQueueId)}
          >
            <Settings size={14} /> Manage Session
          </button>
        ) : (
          <button
            data-tooltip="Initialize queue for this shift"
            className={`start-btn doctor-card-btn start-session-btn ${isProcessing ? 'processing' : ''}`}
            onClick={() => onStart(doctor, session)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Clock size={12} className="animate-spin" />
            ) : (
              <Play size={12} fill="currentColor" />
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
    <div className="loading-spinner">
      <Clock size={40} className="animate-spin opacity-20" />
    </div>
  );

  const isDoctorArrived = queue.status === 1;


  return (
    <div className="manage-queue-container">
      <div className="manage-header flex-mobile-column">
        <div className="manage-header-left">
          <button onClick={onBack} className="btn-back">
            <ArrowLeft size={24} />
          </button>
          <button 
            data-tooltip="Refresh live queue data"
            onClick={handleRefresh} 
            disabled={isRefreshing || isManualSync}
            className={`btn-refresh ${(isRefreshing || isManualSync) ? 'loading' : ''}`}
            title="Refresh Data"
          >
            <RotateCcw size={20} className={(isRefreshing || isManualSync) ? 'animate-spin' : ''} />
          </button>
          <div>
            <h2 className="doctor-name-manage">
              <Stethoscope size={24} color="var(--accent-color)" /> {queue?.doctorName || doctor.name}
            </h2>
            <div className="session-info-manage">
              <span className="session-name-text">{queue?.sessionName || session.sessionName} Session</span>
              <span className="desktop-only dot-separator"></span>
              <span className="live-indicator-manage">
                <span className="live-dot"></span> LIVE
              </span>
            </div>
          </div>
        </div>

        <div className="flex-gap-10">
          <button
            data-tooltip="Permanently close this doctor's session"
            type="button"
            onClick={handleEndSession}
            disabled={isEnding}
            className={`end-session-btn-manage ${isEnding ? 'btn-disabled' : ''}`}
          >
            <Power size={18} /> End Session
          </button>
        </div>
      </div>

      {/* Header Stats - Doctor Specific */}
      <div className="stats-grid-manage">
        <StatCard
          icon={<Users />}
          label="Total Registered"
          value={(queue?.waitingCount || 0) + (queue?.completedCount || 0) + (queue?.skippedCount || 0) + (queue?.nowServing ? 1 : 0)}
          variant="accent"
          subText="Total patients for today"
        />
        <StatCard
          icon={<CheckCircle2 />}
          label="Served Patients"
          value={(queue?.completedCount || 0) + (queue?.nowServing ? 1 : 0)}
          variant="success"
          subText={`${queue?.completedCount || 0} completed, ${queue?.nowServing ? '1 currently in cabin' : 'consultation room empty'}`}
        />
        <StatCard
          icon={<Clock />}
          label="Waiting Now"
          value={queue?.waitingCount || 0}
          variant="warning"
          subText="Patients yet to be seen"
        />
        <StatCard
          icon={<AlertCircle />}
          label="Skipped"
          value={queue?.skippedCount || 0}
          variant="danger"
          subText="Patients who missed their turn"
        />
      </div>

      <div className="grid-manage-queue">
        {/* Now Serving Main Card */}
        <div className="glass-card now-serving-card now-serving-card-manage">
          <div className="now-serving-glow"></div>

          <span className="currentTokenLabel current-token-label">Current Token</span>

          <div className="token-number-display" key={queue.currentTokenNumber}>
            {(queue.currentTokenNumber === 0 || queue.currentPatientName === "No one") && queue.waitingCount === 0 ? (
              <div className="empty-queue-container">
                <Users size={100} color="var(--accent-color)" className="empty-queue-icon" />
                <h2 className="empty-queue-title">NOBODY IN QUEUE</h2>
                <p className="empty-queue-p">Waiting for new patients to register.</p>
              </div>
            ) : (
              <>
                <h1 className="token-number-animate token-number-large">
                  {queue.currentTokenNumber || '--'}
                </h1>
                {callNextMutation.isPending && (
                  <div className="token-loading-overlay">
                    <Clock size={60} className="animate-spin" color="var(--accent-color)" />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="patient-info-manage full-width-mobile">
            <div className="patient-name-box patient-name-container">
              <UserCircle size={28} color="var(--accent-color)" />
              <span className="patient-name-text">{queue.currentPatientName || 'Waiting...'}</span>
            </div>
            {queue.currentPatientName && (
              <span className="consultation-status">
                <CheckCircle2 size={14} color="var(--success)" /> Patient at Consultation
              </span>
            )}
          </div>
        </div>

        {/* Controls Column */}
        <div className="controls-column-manage">
          <div className="glass-card controls-card-main">
            {(!queue.currentTokenNumber || queue.currentPatientName === "No one") ? (
              <button
                data-tooltip="Call the next patient in line"
                onClick={() => callNextMutation.mutate()}
                disabled={callNextMutation.isPending || !isDoctorArrived || queue.waitingCount === 0}
                className={`btn-primary call-next-btn call-next-btn-large ${(!isDoctorArrived || queue.waitingCount === 0) ? 'btn-disabled' : ''}`}
              >
                {callNextMutation.isPending ? <Clock size={32} className="animate-spin" /> : <><UserCheck size={35} /> Call Next Patient</>}
              </button>
            ) : (
              <button
                data-tooltip="Finish current consultation and empty the room"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="btn-primary complete-next-btn-large"
                style={{ background: 'var(--success)', color: 'white' }}
              >
                {completeMutation.isPending ?
                  <Clock size={32} className="animate-spin" /> :
                  <><CheckCircle2 size={32} /> Finish Consultation</>
                }
              </button>
            )}

            <div className="secondary-controls-grid">
              <button
                data-tooltip="Skip current patient's turn"
                className={`skip-btn-secondary ${(!queue.currentTokenNumber) ? 'btn-disabled' : ''}`}
                onClick={() => skipMutation.mutate()}
                disabled={skipMutation.isPending || !queue.currentTokenNumber}
              >
                {skipMutation.isPending ? <Clock size={22} className="animate-spin" /> : <SkipForward size={22} />}
                Skip Patient
              </button>

              <button
                data-tooltip="Send WhatsApp alert to current patient"
                className={`alert-btn-secondary ${(!queue.currentTokenNumber) ? 'btn-disabled' : ''}`}
                onClick={() => alertMutation.mutate()}
                disabled={alertMutation.isPending || !queue.currentTokenNumber}
              >
                {alertMutation.isPending ? <Clock size={22} className="animate-spin" /> : <MessageSquare size={22} />}
                Alert Patient
              </button>
            </div>

            <div className="control-divider"></div>

            <button
              data-tooltip="Mark doctor's presence (optional)"
              onClick={() => markArrivedMutation.mutate()}
              disabled={isDoctorArrived || markArrivedMutation.isPending}
              className={`mark-arrival-btn ${isDoctorArrived ? 'arrived' : 'not-arrived'}`}
            >
              {isDoctorArrived ? <CheckCircle2 size={18} /> : <Play size={18} />}
              {isDoctorArrived ? "Doctor is Present" : "Mark Arrival"}
            </button>
          </div>

          <div className="glass-card integrity-card">
            <div className="integrity-icon-bg">
              <Info size={24} />
            </div>
            <div>
              <p className="integrity-label">Queue Integrity</p>
              <p className="integrity-text">Real-time syncing is active.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Search Section */}
      <div className="tabs-section-manage flex-mobile-column">
        <div className="tabs-container no-scrollbar">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`tab-btn-manage ${activeTab === 'waiting' ? 'active-waiting' : ''}`}
          >
            <Clock size={14} /> Waiting ({upcomingTokens?.filter((t: any) => t.status === 0).length || 0})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`tab-btn-manage ${activeTab === 'completed' ? 'active-completed' : ''}`}
          >
            <CheckCircle2 size={14} /> Served ({upcomingTokens?.filter((t: any) => t.status === 2).length || 0})
          </button>
          <button
            onClick={() => setActiveTab('skipped')}
            className={`tab-btn-manage ${activeTab === 'skipped' ? 'active-skipped' : ''}`}
          >
            <AlertCircle size={14} /> Skipped ({upcomingTokens?.filter((t: any) => t.status === 3).length || 0})
          </button>
        </div>

        <div className="search-actions-row flex-mobile-column">
          <div className="table-search-wrapper">
            <Search size={18} className="table-search-icon" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={activeTab === 'waiting' ? waitingSearch : activeTab === 'completed' ? servedSearch : skippedSearch}
              onChange={(e) => {
                if (activeTab === 'waiting') setWaitingSearch(e.target.value);
                else if (activeTab === 'completed') setServedSearch(e.target.value);
                else setSkippedSearch(e.target.value);
              }}
              className="table-search-input"
            />
          </div>

          <button
            data-tooltip="Manually book a patient in the queue"
            type="button"
            onClick={onManualBooking}
            className="new-booking-btn"
          >
            <PlusCircle size={18} /> New Booking
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="glass-card patients-table-card">
        <div className="table-container patients-table-container">
          <table className="patients-table">
            <thead>
              <tr className="table-head-row">
                <th className="table-th">
                  <div className="th-content"><Hash size={14} /> Token</div>
                </th>
                <th className="table-th">
                  <div className="th-content"><User size={14} /> Patient Name</div>
                </th>
                <th className="table-th">
                  <div className="th-content"><Search size={14} /> Phone Number</div>
                </th>
                <th className="table-th">
                  <div className="th-content"><Clock size={14} /> Check-in</div>
                </th>
                {activeTab === 'completed' && (
                  <th className="table-th">
                    <div className="th-content"><CheckCircle2 size={14} /> Checkout</div>
                  </th>
                )}
                {activeTab === 'skipped' && (
                  <th className="table-th">
                    <div className="th-content"><X size={14} /> Skipped Time</div>
                  </th>
                )}
                <th className="table-th">
                  <div className="th-content"><AlertCircle size={14} /> Status</div>
                </th>
                {activeTab !== 'completed' && (
                  <th className="table-th th-actions-header">
                    <div className="th-content-right"><Zap size={14} /> Actions</div>
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
                      <td colSpan={7} className="empty-table-td">
                        <div className="empty-table-wrapper">
                          <Users size={40} />
                          <span>{waitingSearch || servedSearch || skippedSearch ? "No matching patients found" : "Nobody in the queue"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filtered.map((t: any) => (
                  <tr key={t.id} className="table-row-hover table-row-item">
                    <td className="td-token">#{t.tokenNumber}</td>
                    <td className="td-name">{t.patientName}</td>
                    <td className="td-phone">{t.patientPhone}</td>
                    <td className="td-time">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    {activeTab === 'completed' && (
                      <td className="td-time">
                        {t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </td>
                    )}
                    {activeTab === 'skipped' && (
                      <td className="td-time">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </td>
                    )}
                    <td>
                      {t.status === 0 && <span className="status-badge status-badge-pending">Pending</span>}
                      {t.status === 2 && <span className="status-badge status-badge-served">Served</span>}
                      {t.status === 3 && <span className="status-badge status-badge-skipped">Skipped</span>}
                    </td>
                    {activeTab !== 'completed' && (
                      <td className="td-actions">
                        <div className="actions-wrapper">
                          {t.status === 3 && (
                            <button
                              data-tooltip="Requeue: Move patient back to waiting list"
                              onClick={() => requeueMutation.mutate(t.id)}
                              className="action-btn-blue"
                            >
                              <Play size={16} fill="var(--accent-color)" />
                            </button>
                          )}
                          {t.status !== 2 && (
                            <>
                              <button
                                data-tooltip="Modify patient details"
                                onClick={() => setEditingToken(t)}
                                className="action-btn-ghost"
                              >
                                <Edit size={18} />
                              </button>
                              {(['orgadmin', 'branchadmin', 'superadmin', 'receptionist'].includes(userRole?.toLowerCase().replace(/\s/g, '') || '')) && (
                                <button
                                  data-tooltip="Delete: Permanently remove from queue"
                                  onClick={() => setDeletingTokenId(t.id)}
                                  className="action-btn-danger"
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
      <div className="edit-modal-container">
        <div>
          <label data-tooltip="Update patient's official name" className="edit-modal-label">
            <User size={14} /> Patient Name
          </label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
            placeholder="Enter name"
            className={errors.name ? 'input-field-error' : ''}
          />
          {errors.name && <p className="edit-modal-error-text">{errors.name}</p>}
        </div>
        <div>
          <label data-tooltip="Update WhatsApp contact for notifications" className="edit-modal-label">
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
            className={errors.phone ? 'input-field-error' : ''}
          />
          {errors.phone && <p className="edit-modal-error-text">{errors.phone}</p>}
        </div>
        <div className="edit-modal-actions">
          <button
            data-tooltip="Discard changes and return"
            onClick={onClose}
            className="btn-cancel-modal"
          >
            <X size={18} /> Cancel
          </button>
          <button
            data-tooltip="Update patient record in queue"
            onClick={handleSave}
            disabled={!isValid}
            className={`btn-save-modal ${isValid ? 'active' : 'disabled'}`}
          >
            <CheckCircle2 size={18} /> Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QueueDashboard;
