import { useContext } from 'react';
import { PersistentNotificationContext } from '../contexts/PersistentNotificationContext';

export const usePersistentNotifications = () => {
  const context = useContext(PersistentNotificationContext);
  if (context === undefined) {
    throw new Error('usePersistentNotifications must be used within a PersistentNotificationProvider');
  }
  return context;
};
