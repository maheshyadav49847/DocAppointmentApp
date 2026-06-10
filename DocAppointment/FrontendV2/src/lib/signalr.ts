import * as signalR from '@microsoft/signalr';
import { useNotificationStore } from '@/store/notificationStore';
import { toast } from 'react-hot-toast';

let connection: signalR.HubConnection | null = null;

export const initializeSignalR = async (token: string, branchId: string) => {
  if (connection) return;

  // Assume API is at http://localhost:5001
  const hubUrl = 'http://localhost:5001/queueHub';

  const customLogger: signalR.ILogger = {
    log: (logLevel, message) => {
      if (message.includes('stopped during negotiation')) return;
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

  connection.on('TokenUpdated', (data: { queueId: string, tokenNumber: number }) => {
    useNotificationStore.getState().addNotification({
      title: 'Queue Updated',
      message: `Token #${data.tokenNumber} is now active.`,
      type: 'Info',
      queueId: data.queueId
    });
    toast(`Token #${data.tokenNumber} is now active!`, { icon: '🔔' });
  });

  connection.on('DoctorArrived', (data: { queueId: string, doctorName: string }) => {
    useNotificationStore.getState().addNotification({
      title: 'Doctor Arrived',
      message: `Dr. ${data.doctorName} has arrived and started the session.`,
      type: 'Success',
      queueId: data.queueId
    });
    toast.success(`Dr. ${data.doctorName} has started the session.`);
  });

  connection.on('QueueEnded', (data: { queueId: string }) => {
    useNotificationStore.getState().addNotification({
      title: 'Session Ended',
      message: `The queue session has been ended.`,
      type: 'Alert',
      queueId: data.queueId
    });
    toast('A session has ended.', { icon: '🛑' });
  });

  try {
    await connection.start();
    console.log('SignalR Connected.');
    await connection.invoke('JoinBranchGroup', branchId);
  } catch (err: any) {
    if (err?.message?.includes('stopped during negotiation')) {
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
