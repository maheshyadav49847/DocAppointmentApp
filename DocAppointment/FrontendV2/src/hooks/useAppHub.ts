import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

export const useAppHub = () => {
  const token = useAuthStore(state => state.token);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1.0';
    const baseUrl = apiUrl.split('/api')[0];
    const hubUrl = import.meta.env.VITE_APP_HUB_URL || `${baseUrl}/appHub`;

    // Stop any existing connection before creating a new one
    if (connectionRef.current) {
      connectionRef.current.stop();
      connectionRef.current = null;
    }

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .configureLogging({
        log: (logLevel, message) => {
          if (message.includes('stopped during negotiation')) return;
          if (logLevel === signalR.LogLevel.Error || logLevel === signalR.LogLevel.Critical) console.error(message);
          else if (logLevel === signalR.LogLevel.Warning) console.warn(message);
        }
      })
      .build();

    connectionRef.current = newConnection;
    let cancelled = false;

    // Register event handlers BEFORE starting so we never miss events
    newConnection.on("RolePermissionsUpdated", async (roleName: string) => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === roleName) {
        console.log(`Live Update: Permissions for role ${roleName} have changed. Refreshing token...`);
        try {
          const data = await authService.refresh();
          useAuthStore.getState().setAuth({
            email: data.email,
            role: data.role,
            orgId: data.orgId,
            branchId: data.branchId,
            doctorId: data.doctorId
          }, data.token);
        } catch (err) {
          console.error("Failed to refresh token after role update", err);
        }
      }
    });

    const startConnection = async () => {
      try {
        if (cancelled) return;
        await newConnection.start();
        if (cancelled) {
          newConnection.stop();
          return;
        }
        console.log("Connected to AppHub");
      } catch (err: any) {
        // Suppress expected "stopped during negotiation" error from React Strict Mode
        const msg = err?.message || '';
        if (!cancelled && !msg.includes('stopped during negotiation')) {
          console.error("SignalR Connection Error (AppHub): ", err);
        }
      }
    };

    startConnection();

    return () => {
      cancelled = true;
      newConnection.stop();
      if (connectionRef.current === newConnection) {
        connectionRef.current = null;
      }
    };
  }, [token]);

  return connectionRef.current;
};
