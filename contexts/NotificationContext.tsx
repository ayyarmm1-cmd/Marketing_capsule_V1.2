
import React, { createContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
  link?: string; // New: Optional link for navigation
  timestamp: string; // New: Timestamp for the notification
  read: boolean; // New: Read status
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType, title?: string, duration?: number, link?: string) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void; // New
  markAllAsRead: () => void; // New
  clearAllNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType, title?: string, duration: number = 5000, link?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    const read = false;
    const newNotification = { id, message, type, title, link, timestamp, read, duration };
    setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
    
    // Auto-remove toast notifications after their duration
    setTimeout(() => {
        removeNotification(id);
    }, duration);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prevNotifications => prevNotifications.filter(notification => notification.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, markAsRead, markAllAsRead, clearAllNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};