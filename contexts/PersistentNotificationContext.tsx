import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { 
    apiListenForNotifications, 
    apiDeleteNotification, 
    apiMarkAllNotificationsAsRead, 
    apiClearAllNotifications,
    apiUpdateNotification
} from '../services/api';

interface PersistentNotificationContextType {
  notifications: Notification[];
  deleteNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
}

export const PersistentNotificationContext = createContext<PersistentNotificationContextType | undefined>(undefined);

interface PersistentNotificationProviderProps {
  children: ReactNode;
}

export const PersistentNotificationProvider: React.FC<PersistentNotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (user) {
      const unsubscribe = apiListenForNotifications(user.id, (newNotifications) => {
        setNotifications(newNotifications);
      });

      // Cleanup listener on unmount or user change
      return () => unsubscribe();
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
    }
  }, [user]);

  const deleteNotification = useCallback((id: string) => {
    if (!user) return;
    apiDeleteNotification(user.id, id).catch(err => console.error("Failed to delete notification:", err));
  }, [user]);

  const markAsRead = useCallback((id: string) => {
    if (!user) return;
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        apiUpdateNotification(user.id, id, { read: true }).catch(err => console.error("Failed to mark notification as read:", err));
    }
  }, [user, notifications]);

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    apiMarkAllNotificationsAsRead(user.id).catch(err => console.error("Failed to mark all as read:", err));
  }, [user]);

  const clearAllNotifications = useCallback(() => {
    if (!user) return;
    apiClearAllNotifications(user.id).catch(err => console.error("Failed to clear notifications:", err));
  }, [user]);

  return (
    <PersistentNotificationContext.Provider value={{ notifications, deleteNotification, markAsRead, markAllAsRead, clearAllNotifications }}>
      {children}
    </PersistentNotificationContext.Provider>
  );
};
