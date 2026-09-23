
import React from 'react';
import { useNotification } from '../../hooks/useNotification';
import NotificationMessage from './NotificationMessage';

const NotificationToaster: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-5 right-5 z-[100] w-full max-w-xs sm:max-w-sm space-y-3">
      {notifications.map((notification) => (
        <NotificationMessage
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationToaster;
