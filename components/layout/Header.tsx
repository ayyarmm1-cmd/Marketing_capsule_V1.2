
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types'; 
import NotificationPanel from '../ui/NotificationPanel'; 
import { usePersistentNotifications } from '../../hooks/usePersistentNotifications';
import { useTheme } from '../../hooks/useTheme';
import GlobalSearchBar from './GlobalSearchBar';

// Icons for theme switcher
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const ExpandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;
const CompressIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const SystemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;


const getPageTitle = (pathname: string, search: string): string => {
  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const pathSegments = normalizedPath.split('/');

  if (normalizedPath === '/dashboard') return 'Dashboard Overview'; 
  if (normalizedPath === '/reports') return 'Reports Dashboard'; 
  if (normalizedPath.startsWith('/reports/profit-loss')) return 'Profit & Loss Report';
  if (normalizedPath.startsWith('/reports/balance-sheet')) return 'Balance Sheet Report';
  if (normalizedPath.startsWith('/reports/financial')) return 'Company Financial Report';
  if (normalizedPath.startsWith('/reports/expenses')) return 'Expense Report';
  if (normalizedPath.startsWith('/reports/sales')) return 'Sales Report';
  if (normalizedPath.startsWith('/reports/leads')) return 'Leads Report';
  if (normalizedPath.startsWith('/reports/tasks')) return 'Tasks Report';
  if (normalizedPath.startsWith('/reports/my-activity')) return 'My Activity Report';
  if (normalizedPath.startsWith('/reports/employee-performance')) return 'Employee Performance Report';

  if (pathSegments[1] === 'leads' && pathSegments.length === 3 && pathSegments[2]) return 'Lead Details';
  if (pathSegments[1] === 'clients' && pathSegments.length === 3 && pathSegments[2]) return 'Client Details';
  if (pathSegments[1] === 'businesses' && pathSegments.length === 3 && pathSegments[2]) return 'Business Details';
  if (pathSegments[1] === 'hr' && pathSegments[2] === 'staff' && pathSegments.length === 4 && pathSegments[3]) return 'Employee Details';
  if (pathSegments[1] === 'tasks' && pathSegments.length === 3 && pathSegments[2]) return 'Task Details';
  
  if (normalizedPath.startsWith('/sales')) return 'Sales & Credits';

  // NEW: Consolidated Finance Documents Page
  if (normalizedPath.startsWith('/finance/documents')) return 'Financial Documents';
  
  if (normalizedPath.startsWith('/finance/clients-to-pay')) return 'Clients with Pending Payments';
  if (normalizedPath.startsWith('/finance/credit-notes')) return 'Credit Notes';
  if (normalizedPath.startsWith('/finance/visa-cards')) return 'Visa Card Management';
  if (normalizedPath.startsWith('/finance/expenses')) return 'Expense Tracking';
  
  if (normalizedPath.startsWith('/hr/staff')) return 'Staff Management'; 
  if (normalizedPath.startsWith('/hr/payroll')) return 'Payroll';
  if (normalizedPath.startsWith('/my-payroll')) return 'My Payroll'; 
  if (normalizedPath.startsWith('/my/leave')) return 'My Leave Requests';
  if (normalizedPath.startsWith('/hr/leave-admin')) return 'Leave Management (Admin)';
  if (normalizedPath.startsWith('/hr/holidays')) return 'Holiday Calendar';
  if (normalizedPath.startsWith('/profile')) return 'My Profile'; 
  if (normalizedPath.startsWith('/my-notifications')) return 'My Notifications'; // New Page Title
  if (normalizedPath.startsWith('/my-tasks')) return 'My Tasks';

  
  if (normalizedPath.startsWith('/tasks')) {
      return 'Task Management';
  }
  
  if (normalizedPath.startsWith('/settings')) return 'Application Settings';

  // Facebook Ads Titles
  if (normalizedPath.startsWith('/facebook-ads/dashboard')) return 'Facebook Ads Dashboard';
  if (normalizedPath.startsWith('/facebook-ads/campaigns')) return 'Facebook Ads Campaigns';
  if (normalizedPath.startsWith('/facebook-ads/spend')) return 'Facebook Ads Spend';
  if (normalizedPath.startsWith('/facebook-ads/settings')) return 'Facebook Ads Settings';

  const segments = normalizedPath.split('/').filter(Boolean);
  const baseSegment = segments[0] || '';

  switch (baseSegment) {
    case 'leads': return 'Leads Pipeline'; 
    case 'clients': return 'Clients & Businesses';
    case 'services': return 'Service Management';
    case 'finance': return 'Finance'; // General Finance fallback
    case 'hr': return 'Human Resources'; 
    default: return 'Dashboard Overview';
  }
};

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notifications, deleteNotification, clearAllNotifications, markAsRead, markAllAsRead } = usePersistentNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false); 
  const [pageTitle, setPageTitle] = useState('Dashboard Overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const userDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const userDropdownPanelRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setPageTitle(getPageTitle(location.pathname, location.search));
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const roleColors: Record<UserRole, string> = {
    [UserRole.OWNER]: 'bg-red-600',
    [UserRole.ADMIN]: 'bg-purple-600',
    [UserRole.TEAM_LEADER]: 'bg-blue-600',
    [UserRole.STAFF]: 'bg-green-600',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node) &&
          notificationButtonRef.current && !notificationButtonRef.current.contains(event.target as Node)) {
        setIsNotificationPanelOpen(false);
      }
      if (userDropdownPanelRef.current && !userDropdownPanelRef.current.contains(event.target as Node) &&
          userDropdownButtonRef.current && !userDropdownButtonRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!user) return null;

  return (
    <header className="bg-container-bg dark:bg-slate-800 shadow-md flex flex-wrap items-center gap-4 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-20 border-b border-transparent dark:border-slate-700">
      <div className="flex items-center min-w-[200px] flex-shrink">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-full text-text-secondary dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 mr-3"
          aria-label="Open sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-slate-100 truncate">{pageTitle}</h1> 
      </div>
      <div className="flex-1 min-w-[240px] order-3 w-full lg:order-none">
        <GlobalSearchBar />
      </div>
      <div className="flex items-center space-x-2 sm:space-x-5 flex-shrink-0 ml-auto">
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full text-text-secondary dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>
        <div className="relative">
          <button
            ref={notificationButtonRef}
            onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
            className="p-2 rounded-full text-text-secondary dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 relative"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {isNotificationPanelOpen && (
            <div ref={notificationPanelRef}>
              <NotificationPanel
                notifications={notifications}
                onDismissNotification={deleteNotification}
                onClearAll={clearAllNotifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClose={() => setIsNotificationPanelOpen(false)}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            ref={userDropdownButtonRef}
            onClick={() => setDropdownOpen(!dropdownOpen)} 
            className="flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-action focus:ring-offset-2"
          >
            <div className={`w-10 h-10 rounded-full ${roleColors[user.role]} flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden`}>
               {user.facePhotoUrl ? (
                    <img src={user.facePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    getInitials(user.name)
                )}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-text-primary dark:text-slate-100">{user.name}</p>
              <p className="text-xs text-text-secondary dark:text-slate-400">{user.role}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-text-secondary dark:text-slate-400 hidden md:block">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {dropdownOpen && (
            <div 
              ref={userDropdownPanelRef}
              className="absolute right-0 mt-2 w-56 bg-container-bg dark:bg-slate-700 rounded-md shadow-xl z-50 ring-1 ring-black ring-opacity-5 dark:ring-slate-600"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-600">
                <p className="text-sm font-semibold text-text-primary dark:text-slate-100">{user.name}</p>
                <p className="text-xs text-text-secondary dark:text-slate-400 truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-text-primary dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  My Profile
                </Link>
                <button
                  onClick={() => { navigate('/change-password'); setDropdownOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-text-primary dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  Change Password
                </button>
              </div>
              <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-600">
                <p className="text-xs text-text-secondary dark:text-slate-400 mb-2">Theme</p>
                <div className="flex justify-around bg-gray-100 dark:bg-slate-800 p-1 rounded-md">
                   <button onClick={() => setTheme('light')} title="Light Mode" className={`flex-1 flex justify-center p-1.5 rounded-md text-xs transition-colors ${theme === 'light' ? 'bg-primary-action text-white shadow' : 'hover:bg-gray-200 dark:hover:bg-slate-600'}`}><SunIcon/></button>
                   <button onClick={() => setTheme('dark')} title="Dark Mode" className={`flex-1 flex justify-center p-1.5 rounded-md text-xs transition-colors ${theme === 'dark' ? 'bg-primary-action text-white shadow' : 'hover:bg-gray-200 dark:hover:bg-slate-600'}`}><MoonIcon/></button>
                   <button onClick={() => setTheme('system')} title="System Default" className={`flex-1 flex justify-center p-1.5 rounded-md text-xs transition-colors ${theme === 'system' ? 'bg-primary-action text-white shadow' : 'hover:bg-gray-200 dark:hover:bg-slate-600'}`}><SystemIcon/></button>
                </div>
              </div>
              <div className="py-1 border-t border-gray-200 dark:border-slate-600">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-status-danger hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
