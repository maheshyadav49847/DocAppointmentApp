import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'success' | 'info' | 'warning' | 'danger';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  icon?: string;
};

export type ToastMessage = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
};

interface NotificationState {
  notifications: AppNotification[];
  toasts: ToastMessage[];
  push: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
  addToast: (t: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      toasts: [],

      push: (n) =>
        set((state) => ({
          notifications: [
            {
              ...n,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp: Date.now(),
              read: false,
            },
            ...state.notifications,
          ].slice(0, 50), // keep max 50 notifications
        })),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      remove: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      addToast: (t) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({ toasts: [...state.toasts, { ...t, id }] }));
        setTimeout(() => get().removeToast(id), 4000); // Auto remove after 4s
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    { 
      name: 'notifications-storage',
      partialize: (state) => ({ notifications: state.notifications }), // Only persist notifications, not ephemeral toasts
    }
  )
);

// ─── Convenience helper used by other components ────────────────────────────
export const notify = {
  success: (title: string, message: string) => {
    useNotificationStore.getState().push({ type: 'success', title, message, icon: '✅' });
    useNotificationStore.getState().addToast({ type: 'success', title, message });
  },
  info: (title: string, message: string) => {
    useNotificationStore.getState().push({ type: 'info', title, message, icon: '🔔' });
    useNotificationStore.getState().addToast({ type: 'info', title, message });
  },
  warning: (title: string, message: string) => {
    useNotificationStore.getState().push({ type: 'warning', title, message, icon: '⚠️' });
    useNotificationStore.getState().addToast({ type: 'warning', title, message });
  },
  danger: (title: string, message: string) => {
    useNotificationStore.getState().push({ type: 'danger', title, message, icon: '🚨' });
    useNotificationStore.getState().addToast({ type: 'danger', title, message });
  },
};
