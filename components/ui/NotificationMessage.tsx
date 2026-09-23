
import React, { useEffect, useState } from 'react';
import { Notification, NotificationType } from '../../contexts/NotificationContext';

interface NotificationMessageProps {
  notification: Notification;
  onDismiss: () => void;
}

const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ExclamationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>;
const InformationCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;


const NotificationMessage: React.FC<NotificationMessageProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true); // Trigger enter animation
    const timer = setTimeout(() => {
      setIsVisible(false); // Trigger exit animation
      setTimeout(onDismiss, 300); // Call onDismiss after animation duration
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const handleManualDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };
  
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircleIcon />;
      case 'error': return <XCircleIcon />;
      case 'warning': return <ExclamationCircleIcon />;
      case 'info':
      default:
        return <InformationCircleIcon />;
    }
  };

  const getBackgroundColor = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'bg-status-success';
      case 'error': return 'bg-status-danger';
      case 'warning': return 'bg-status-warning text-slate-800'; // Warning has better contrast with dark text
      case 'info':
      default:
        return 'bg-status-info';
    }
  };

  const textColor = notification.type === 'warning' ? 'text-slate-800' : 'text-white';


  return (
    <div
      className={`
        flex items-start p-4 rounded-lg shadow-xl w-full
        ${getBackgroundColor(notification.type)}
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className={`flex-shrink-0 mr-3 ${textColor}`}>
        {getIcon(notification.type)}
      </div>
      <div className={`flex-1 ${textColor}`}>
        {notification.title && <h4 className="text-sm font-semibold mb-0.5">{notification.title}</h4>}
        <p className="text-sm">{notification.message}</p>
      </div>
      <button
        onClick={handleManualDismiss}
        className={`ml-4 p-1 rounded-md hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 ${textColor}`}
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default NotificationMessage;