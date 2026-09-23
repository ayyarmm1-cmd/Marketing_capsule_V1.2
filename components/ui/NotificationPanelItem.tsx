import React from 'react';
import { Notification, NotificationType } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

// Re-define icons here or import from a shared location if they are used elsewhere
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ExclamationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>;
const InformationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;

interface NotificationPanelItemProps {
  notification: Notification;
  onDismiss: () => void;
  onMarkAsRead: () => void;
  onClosePanel: () => void;
}

const NotificationPanelItem: React.FC<NotificationPanelItemProps> = ({ notification, onDismiss, onMarkAsRead, onClosePanel }) => {
  const navigate = useNavigate();

  const getIconAndColor = (type: NotificationType) => {
    switch (type) {
      case 'success': return { Icon: CheckCircleIcon, color: 'text-status-success' };
      case 'error': return { Icon: XCircleIcon, color: 'text-status-danger' };
      case 'warning': return { Icon: ExclamationCircleIcon, color: 'text-status-warning' };
      case 'info': default: return { Icon: InformationCircleIcon, color: 'text-status-info' };
    }
  };

  const { Icon, color } = getIconAndColor(notification.type);

  const handleItemClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!notification.read) {
      onMarkAsRead();
    }
    if (notification.link) {
      navigate(notification.link);
      onClosePanel(); 
    }
  };
  
  const itemBaseStyle = "flex items-start p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer";
  const unreadStyle = !notification.read ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30" : "bg-white dark:bg-slate-800";


  const content = (
    <>
      <div className={`flex-shrink-0 mr-2.5 ${color}`}>
        <Icon />
      </div>
      <div className="flex-1">
        {notification.title && <h5 className={`text-sm font-semibold ${!notification.read ? 'text-blue-800 dark:text-blue-300' : 'text-text-primary dark:text-slate-100'} mb-0.5`}>{notification.title}</h5>}
        <p className={`text-xs ${!notification.read ? 'text-blue-700 dark:text-blue-400' : 'text-text-secondary dark:text-slate-400'}`}>{notification.message}</p>
        <p className={`text-xs mt-0.5 ${!notification.read ? 'text-blue-500 dark:text-blue-500' : 'text-gray-400 dark:text-slate-500'}`}>{new Date(notification.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit'})}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }} // Prevent item click when dismissing
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-action"
        aria-label="Dismiss notification"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </>
  );

  return (
    <div onClick={handleItemClick} className={`${itemBaseStyle} ${unreadStyle}`} role="button" tabIndex={0} onKeyDown={(e) => {if(e.key === 'Enter') handleItemClick(e as any)}}>
        {content}
    </div>
  );
};

export default NotificationPanelItem;