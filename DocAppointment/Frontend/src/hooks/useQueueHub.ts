import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export const useQueueHub = (branchId: string | null) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!branchId) return;

    const hubUrl = import.meta.env.VITE_HUB_URL || 'http://localhost:5001/queueHub';
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [branchId]);

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          connection.invoke('JoinBranchGroup', branchId);
        })
        .catch(() => {});
    }
  }, [connection, branchId]);

  return connection;
};
