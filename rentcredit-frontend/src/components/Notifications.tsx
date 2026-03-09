import React, { useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 for permanent
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const NotificationsContext = React.createContext<NotificationsContextType | undefined>(
  undefined
);

export function useNotifications() {
  const ctx = React.useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 4000, // default 4 seconds
    };
    setNotifications((prev) => [...prev, newNotification]);

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider
      value={{ notifications, addNotification, removeNotification, clearNotifications }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const colors = {
    success: {
      bg: 'rgba(34,214,138,0.12)',
      border: 'rgba(34,214,138,0.3)',
      text: 'var(--success)',
      icon: '✓',
    },
    error: {
      bg: 'rgba(242,87,87,0.12)',
      border: 'rgba(242,87,87,0.3)',
      text: 'var(--danger)',
      icon: '✕',
    },
    warning: {
      bg: 'rgba(245,166,35,0.12)',
      border: 'rgba(245,166,35,0.3)',
      text: 'var(--warning)',
      icon: '⚠',
    },
    info: {
      bg: 'rgba(82,184,255,0.12)',
      border: 'rgba(82,184,255,0.3)',
      text: 'var(--info)',
      icon: 'ℹ',
    },
  }[notification.type];

  return (
    <div
      style={{
        padding: '12px 16px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--r-md)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ color: colors.text, fontWeight: 700, fontSize: 16, minWidth: 20 }}>
        {colors.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: colors.text, fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          {notification.title}
        </div>
        {notification.message && (
          <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>{notification.message}</div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: colors.text,
          cursor: 'pointer',
          fontSize: 16,
          opacity: 0.6,
          padding: 0,
          minWidth: 20,
          minHeight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function NotificationsDisplay() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 2000,
        maxWidth: '420px',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div style={{ pointerEvents: 'auto' }}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}
