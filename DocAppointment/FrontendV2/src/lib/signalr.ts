import * as signalR from '@microsoft/signalr';
import { useNotificationStore } from '@/store/notificationStore';
import { toast } from 'react-hot-toast';
import { queryClient } from './queryClient';

let connection: signalR.HubConnection | null = null;

export const initializeSignalR = async (token: string, branchId: string) => {
  if (connection) return;

  const apiUrl = import.meta.env.VITE_API_URL || '/api/v1.0';
  const baseUrl = apiUrl.split('/api')[0];
  const hubUrl = `${baseUrl}/queueHub`;

  const customLogger: signalR.ILogger = {
    log: (logLevel, message) => {
      if (message.includes('stopped during negotiation') || message.includes('hub handshake could complete')) return;
      if (logLevel === signalR.LogLevel.Error) console.error(message);
      else if (logLevel === signalR.LogLevel.Warning) console.warn(message);
    }
  };

  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .configureLogging(customLogger)
    .build();

  // --- Real-time Event Subscriptions with React Query Cache Invalidation ---

  // 1. Token Updated (Active Token Advanced / Called / Completed)
  connection.on('TokenUpdated', (data: { queueId: string, tokenNumber: number }) => {
    useNotificationStore.getState().addNotification({
      title: 'Queue Updated',
      message: `Token #${data.tokenNumber} is now active.`,
      type: 'Info',
      queueId: data.queueId
    });
    toast(`Token #${data.tokenNumber} is now active!`, { icon: '🔔' });

    // Invalidate Queues, Doctor Desks, TVs, Lifecycles
    queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] });
    queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
    queryClient.invalidateQueries({ queryKey: ['upcomingTokens'] });
    queryClient.invalidateQueries({ queryKey: ['queueStats'] });
    queryClient.invalidateQueries({ queryKey: ['tvQueues'] });
    queryClient.invalidateQueries({ queryKey: ['patient-lifecycle'] });
  });

  // 2. Token Created (New Patient Booked / Walk-in / Telegram / WhatsApp)
  connection.on('TokenCreated', (data: { branchId: string, queueId: string, tokenNumber: number, patientName: string }) => {
    toast.success(`Token #${data.tokenNumber} created for ${data.patientName || 'Patient'}`);

    queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] });
    queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
    queryClient.invalidateQueries({ queryKey: ['upcomingTokens'] });
    queryClient.invalidateQueries({ queryKey: ['queueStats'] });
    queryClient.invalidateQueries({ queryKey: ['tvQueues'] });
    queryClient.invalidateQueries({ queryKey: ['patient-lifecycle'] });
    queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
  });

  // 3. Doctor Arrived
  connection.on('DoctorArrived', (data: { queueId: string, doctorName: string }) => {
    useNotificationStore.getState().addNotification({
      title: 'Doctor Arrived',
      message: `Dr. ${data.doctorName} has arrived and started the session.`,
      type: 'Success',
      queueId: data.queueId
    });
    toast.success(`Dr. ${data.doctorName} has started the session.`);

    queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorSessions'] });
    queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
    queryClient.invalidateQueries({ queryKey: ['tvQueues'] });
  });

  // 4. Queue Session Started
  connection.on('QueueStarted', (_data: { queueId: string }) => {
    queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] });
    queryClient.invalidateQueries({ queryKey: ['queue-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['doctorSessions'] });
    queryClient.invalidateQueries({ queryKey: ['tvQueues'] });
  });

  // 5. Queue Session Ended
  connection.on('QueueEnded', (data: { queueId: string }) => {
    useNotificationStore.getState().addNotification({
      title: 'Session Ended',
      message: `The queue session has been ended.`,
      type: 'Alert',
      queueId: data.queueId
    });
    toast('A session has ended.', { icon: '🛑' });

    queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] });
    queryClient.invalidateQueries({ queryKey: ['queueDetails'] });
    queryClient.invalidateQueries({ queryKey: ['upcomingTokens'] });
    queryClient.invalidateQueries({ queryKey: ['queueStats'] });
    queryClient.invalidateQueries({ queryKey: ['queue-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['doctorSessions'] });
    queryClient.invalidateQueries({ queryKey: ['tvQueues'] });
  });

  // 6. Consultation Saved (Clinical Visit completed or prescription written)
  connection.on('ConsultationSaved', (_data: { branchId: string, tokenId?: string, patientId: string, patientName: string }) => {
    queryClient.invalidateQueries({ queryKey: ['clinicalVisits'] });
    queryClient.invalidateQueries({ queryKey: ['patient-lifecycle'] });
    queryClient.invalidateQueries({ queryKey: ['activeQueue'] });
    queryClient.invalidateQueries({ queryKey: ['doctorActiveQueue'] });
    queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
  });

  // 7. Outbox Status Changed (Message dispatched, failed, or retried)
  connection.on('OutboxStatusChanged', (data: { branchId: string, outboxId: string, status: string, channel: string, error?: string }) => {
    queryClient.invalidateQueries({ queryKey: ['outboxMessages'] });
    queryClient.invalidateQueries({ queryKey: ['patient-lifecycle'] });
    
    if (data.status === 'Failed') {
      toast.error(`Outbox: ${data.channel} message failed delivery.`);
    }
  });

  // 8. Invoice Updated (Generated, Paid, or Voided)
  connection.on('InvoiceUpdated', (_data: { branchId: string, invoiceId: string, invoiceNumber: string, status: string }) => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['pending-bills'] });
    queryClient.invalidateQueries({ queryKey: ['billingDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['patient-lifecycle'] });
  });

  try {
    await connection.start();
    console.log('SignalR Connected.');
    await connection.invoke('JoinBranchGroup', branchId);
  } catch (err: any) {
    if (err?.message?.includes('stopped during negotiation') || err?.message?.includes('hub handshake could complete')) {
      console.warn('SignalR start aborted (likely strict mode double effect).');
    } else {
      console.error('SignalR Connection Error: ', err);
    }
  }
};

export const stopSignalR = async () => {
  if (connection) {
    await connection.stop();
    connection = null;
  }
};
