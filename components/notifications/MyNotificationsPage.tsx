import React, { useState, useMemo } from 'react';
import { usePersistentNotifications } from '../../hooks/usePersistentNotifications';
import { NotificationType } from '../../contexts/NotificationContext'; // NotificationType is correctly from context
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Select from '../ui/Select';

// Icons for notification types (can be more sophisticated)
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ExclamationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>;
const InformationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;

const getIconAndColor = (type: NotificationType) => {
    switch (type) {
      case 'success': return { Icon: CheckCircleIcon, color: 'text-status-success' };
      case 'error': return { Icon: XCircleIcon, color: 'text-status-danger' };
      case 'warning': return { Icon: ExclamationCircleIcon, color: 'text-status-warning' };
      case 'info': default: return { Icon: InformationCircleIcon, color: 'text-status-info' };
    }
};

const MyNotificationsPage: React.FC = () => {
  const { notifications, deleteNotification, markAsRead, markAllAsRead, clearAllNotifications } = usePersistentNotifications();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterReadStatus, setFilterReadStatus] = useState<'all' | 'read' | 'unread'>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const typeMatch = filterType === 'all' || n.type === filterType;
      const readMatch = filterReadStatus === 'all' ||
                        (filterReadStatus === 'read' && n.read) ||
                        (filterReadStatus === 'unread' && !n.read);
      return typeMatch && readMatch;
    });
  }, [notifications, filterType, filterReadStatus]);

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      navigate(link);
    }
  };

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'success', label: 'Success' },
    { value: 'error', label: 'Error' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
  ];

  const readStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ];
  
  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-200">My Notifications</h1>
        <div className="flex gap-2">
          <Button onClick={markAllAsRead} variant="secondary" size="sm" disabled={notifications.every(n => n.read)}>Mark All as Read</Button>
          <Button onClick={clearAllNotifications} variant="danger" size="sm" disabled={notifications.length === 0}>Clear All</Button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Filter by Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
            options={typeOptions}
            containerClassName="mb-0"
          />
          <Select
            label="Filter by Status"
            value={filterReadStatus}
            onChange={(e) => setFilterReadStatus(e.target.value as 'all' | 'read' | 'unread')}
            options={readStatusOptions}
            containerClassName="mb-0"
          />
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-10">
          <InformationCircleIcon />
          <p className="mt-2 text-text-secondary">No notifications match your current filters, or your notification list is empty.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredNotifications.map(notification => {
            const { Icon, color } = getIconAndColor(notification.type);
            const itemStyle = `flex items-start p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
              notification.read ? 'bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700' : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
            }`;

            const content = (
                <>
                    <div className={`flex-shrink-0 mr-3 ${color}`}>
                        <Icon />
                    </div>
                    <div className="flex-1">
                        {notification.title && <h5 className={`text-sm font-semibold ${notification.read ? 'text-text-primary dark:text-slate-200' : 'text-blue-800 dark:text-blue-300'}`}>{notification.title}</h5>}
                        <p className={`text-xs ${notification.read ? 'text-text-secondary dark:text-slate-400' : 'text-blue-700 dark:text-blue-300'}`}>{notification.message}</p>
                        <p className={`text-xs mt-1 ${notification.read ? 'text-gray-400 dark:text-slate-500' : 'text-blue-500 dark:text-blue-400'}`}>{formatTimestamp(notification.timestamp)}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                        className="ml-3 !p-1 text-gray-400 hover:text-status-danger"
                        aria-label="Dismiss notification"
                    >
                        <XCircleIcon />
                    </Button>
                </>
            );

            return (
              <li key={notification.id} 
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                  className={itemStyle}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notification.id, notification.link);}}
                  aria-label={`Notification: ${notification.title || notification.message}. Status: ${notification.read ? 'Read' : 'Unread'}. Type: ${notification.type}. ${notification.link ? 'Click to navigate.' : ''}`}
              >
                {content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MyNotificationsPage;