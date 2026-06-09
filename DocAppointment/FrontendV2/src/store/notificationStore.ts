import { create } from 'zustand';
import { api } from '@/lib/axios';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'Info' | 'Alert' | 'Success';
  createdAt: string;
  isRead: boolean;
  queueId?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  fetchNotifications: (branchId: string) => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (branchId: string) => Promise<void>;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  
  fetchNotifications: async (branchId: string) => {
    try {
      const response = await api.get(`/notifications/branch/${branchId}`);
      set({ notifications: response.data });
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  },

  addNotification: (notif) => set((state) => ({
    // The DB will also insert it, so the backend and frontend stay in sync.
    // For immediate UI update we push it here:
    notifications: [{
      ...notif,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isRead: false
    }, ...state.notifications]
  })),

  markAsRead: async (id: string) => {
    try {
      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      }));
      await api.post(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  },

  markAllAsRead: async (branchId: string) => {
    try {
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      }));
      await api.post(`/notifications/branch/${branchId}/read-all`);
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  },

  clearAll: () => set({ notifications: [] })
}));
