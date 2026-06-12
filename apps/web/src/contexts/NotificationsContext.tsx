'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../lib/api';
import { useNotificationRealtime } from '../hooks/useNotificationRealtime';
import { useAuth } from './AuthContext';

export type AppNotification = {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read?: boolean;
  metadata?: Record<string, unknown>;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/notifications/unread');
      setNotifications(res.data?.data ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useNotificationRealtime(user?.id, (event, row) => {
    if (row.read) {
      setNotifications((prev) => prev.filter((n) => n.id !== row.id));
      return;
    }
    setNotifications((prev) => {
      const without = prev.filter((n) => n.id !== row.id);
      const next = event === 'insert' ? [row as AppNotification, ...without] : without.map((n) => (n.id === row.id ? (row as AppNotification) : n));
      return next;
    });
  });

  const markRead = useCallback(async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* non-blocking */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications([]);
    } catch {
      /* non-blocking */
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.length,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, loading, refresh, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
