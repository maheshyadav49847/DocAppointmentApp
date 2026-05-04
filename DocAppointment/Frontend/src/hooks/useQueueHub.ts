import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export const useQueueHub = (branchId: string | null) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!branchId) return;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5167/queueHub')
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [branchId]);

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log('Connected to QueueHub');
          connection.invoke('JoinBranchGroup', branchId);
        })
        .catch(e => console.log('Connection failed: ', e));
    }
  }, [connection, branchId]);

  return connection;
};
