import React from 'react';
import { Notification } from '../../contexts/NotificationContext';
import NotificationPanelItem from './NotificationPanelItem';
import Button from './Button';

interface NotificationPanelProps {
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onDismissNotification,
  onClearAll,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-container-bg dark:bg-slate-800 rounded-lg shadow-xl z-50 ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 flex flex-col">
      <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-slate-700">
        <h4 className="text-md font-semibold text-text-primary dark:text-slate-100">Notifications</h4>
        <button
            onClick={() => {
              // Mark all as read functionality is now handled by a dedicated button
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close notifications panel"
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-slate-400 text-center p-6">No new notifications.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-slate-700">
          {notifications.map((notification) => (
            <NotificationPanelItem
              key={notification.id}
              notification={notification}
              onDismiss={() => onDismissNotification(notification.id)}
              onMarkAsRead={() => onMarkAsRead(notification.id)}
              onClosePanel={onClose}
            />
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center gap-2">
           <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="w-full text-primary-action dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700"
          >
            Mark all as read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="w-full text-status-danger hover:bg-red-50 dark:hover:bg-slate-700"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;