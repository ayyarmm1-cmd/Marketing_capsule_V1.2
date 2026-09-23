

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, Permission, Employee } from '../../types';
import { APP_NAME } from '../../constants';
import { dispatchRefreshData } from '../../utils/refreshDataBus';
import RecordPaymentModal from '../finance/modals/RecordPaymentModal';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  isSubItem?: boolean;
  target?: string;
  rel?: string;
  setIsOpen?: (isOpen: boolean) => void;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, text, isSubItem = false, target, rel, setIsOpen, isCollapsed = false }) => {
  const location = useLocation();
  
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

  const handleClick = () => {
    if (setIsOpen && isMobile()) {
      setIsOpen(false);
    }
  };

  const [toPathname, toQuery] = to.split('?');
  const toSearch = toQuery ? `?${toQuery}` : '';

  const isActive = useMemo(() => {
    if (toSearch) {
      // For links with query params, we need an exact match on path and search
      return location.pathname === toPathname && location.search === toSearch;
    }
    
    // For links without query params
    // If the current location has query params, don't consider it active
    if (location.pathname === toPathname) {
        // If current location has query params but link doesn't, check if it's a different view
        if (location.search) {
            // For /tasks specifically, if there's a type query param, it's a different view
            if (toPathname === '/tasks' && location.search.includes('type=')) {
                return false;
            }
            // For other paths, if there are query params, don't consider it active
            return false;
        }
        return true;
    }

    // Handle sub-paths like /tasks/TSK_123 being active for /tasks link
    // But exclude sibling paths like /sales/invoices when checking /sales
    if (toPathname !== '/' && location.pathname.startsWith(`${toPathname}/`)) {
        // List of known sibling paths that should NOT activate the parent
        const knownSiblingPaths: Record<string, string[]> = {
            '/sales': ['/sales/invoices', '/sales/quotations'],
            '/leads': ['/leads/overview', '/leads/activities', '/leads/notes', '/leads/analytics', '/leads/settings'],
            '/clients': ['/businesses', '/clients/settings'],
            '/hr': ['/hr/staff', '/hr/payroll', '/hr/attendance', '/hr/attendance-rules', '/hr/leave-admin', '/hr/holidays', '/hr/activity-log', '/hr/kpi-management', '/hr/team-kpis'],
            '/finance': ['/finance/ap', '/finance/ar', '/finance/opening-balance', '/finance/payments', '/finance/cash', '/finance/fixed-assets', '/finance/capital', '/finance/analytics', '/finance/bad-debts', '/finance/balance-sheet', '/finance/visa-cards', '/finance/expenses', '/finance/credit-notes', '/finance/balance-adjustments'],
            '/projects': ['/projects', '/tasks'],
            '/sms': ['/sms/compose', '/sms/templates', '/sms/outbox', '/sms/settings'],
            '/pos': ['/pos/customers', '/pos/products', '/pos/orders', '/pos/delivery', '/pos/revenue'],
        };
        
        const siblings = knownSiblingPaths[toPathname] || [];
        const isSiblingPath = siblings.some(sibling => location.pathname === sibling || location.pathname.startsWith(`${sibling}/`));
        
        // Only activate parent if it's NOT a sibling path
        if (!isSiblingPath) {
            return true;
        }
    }
    
    return false;
  }, [location.pathname, location.search, toPathname, toSearch]);


  return (
    <li>
      <Link
        to={to}
        target={target}
        rel={rel}
        onClick={handleClick}
        className={`flex items-center ${isCollapsed ? 'justify-center' : ''} ${isSubItem ? (isCollapsed ? 'px-2 py-3' : 'pl-10 pr-4 py-3') : (isCollapsed ? 'px-2 py-3' : 'px-4 py-3')} ${isSubItem ? 'text-sm' : 'text-base'} rounded-lg font-medium transition-colors duration-150 group
                    ${isActive 
                      ? 'bg-blue-50 text-primary-action dark:bg-slate-700 dark:text-white font-semibold' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
      >
        <span className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-action dark:text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`}>{icon}</span>
        {!isCollapsed && <span className="truncate">{text}</span>}
      </Link>
    </li>
  );
};

/** Recursively check if any descendant nav link matches current location (so nested accordions keep parent open) */
function isDescendantActive(node: React.ReactNode, pathname: string, search: string): boolean {
  const children = React.Children.toArray(node);
  return children.some(child => {
    if (React.isValidElement<{ to?: string; children?: React.ReactNode }>(child)) {
      if (child.props.to) {
        const to = child.props.to;
        const [toPathname, toQuery] = to.split('?');
        const toSearch = toQuery ? `?${toQuery}` : '';
        if (toSearch)
          return pathname === toPathname && search === toSearch;
        return pathname === toPathname || (toPathname !== '/' && pathname.startsWith(`${toPathname}/`));
      }
      if (child.props.children)
        return isDescendantActive(child.props.children, pathname, search);
    }
    return false;
  });
}

interface AccordionNavItemProps {
  icon: React.ReactNode;
  text: string;
  children: React.ReactNode;
  basePath: string; 
  setIsOpen?: (isOpen: boolean) => void;
  isCollapsed?: boolean;
}

const AccordionNavItem: React.FC<AccordionNavItemProps> = ({ icon, text, children, basePath, setIsOpen: setParentOpen, isCollapsed = false }) => {
  const location = useLocation();

  const isAnyChildActive = useMemo(() => isDescendantActive(children, location.pathname, location.search), [children, location.pathname, location.search]);
  
  const isOpenInitially = location.pathname.startsWith(basePath) || isAnyChildActive;
  const [isOpen, setIsOpen] = useState(isOpenInitially);
  
  useEffect(() => {
    setIsOpen(location.pathname.startsWith(basePath) || isAnyChildActive);
  }, [location.pathname, location.search, basePath, isAnyChildActive]);


  if (isCollapsed) {
    return (
      <li>
        <div className={`flex items-center justify-center px-2 py-3 rounded-lg text-base font-medium transition-colors duration-150 group
                    ${isAnyChildActive ? 'bg-slate-100 dark:bg-slate-800 text-text-primary dark:text-slate-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
             title={text}>
          <span className={`h-5 w-5 ${isAnyChildActive ? 'text-text-primary dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`}>{icon}</span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-base font-medium transition-colors duration-150 group
                    ${isOpen ? 'bg-slate-100 dark:bg-slate-800 text-text-primary dark:text-slate-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          <span className={`mr-3 h-5 w-5 ${isOpen ? 'text-text-primary dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`}>{icon}</span>
          {text}
        </div>
        <svg className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isOpen ? 'text-text-primary dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <ul className="mt-2 ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
            {React.Children.map(children, child => 
                React.isValidElement(child) ? React.cloneElement(child, { setIsOpen: setParentOpen, isCollapsed } as any) : child
            )}
        </ul>
      )}
    </li>
  );
};


// Placeholder Icons
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const LeadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const ClientIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.75-5.25T21 12a9 9 0 1 0-9 9 9.094 9.094 0 0 0 5.25-1.23m0 0L11.25 11.25m0 0L8.25 15l7.5-7.5" /></svg>;
const ServiceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>;
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const ReportsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></svg>;
const FinanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6V9m18-3v3m-10.5-3H16.5m-3.75 0V3.75m0 0H10.5m2.25 0L12 2.25M4.5 20.25v-3.75m0 0A2.25 2.25 0 0 1 6.75 15h10.5a2.25 2.25 0 0 1 2.25 2.25m-15 0V15m0 2.25H15m0 0v3.75m0-3.75H9.75m0 0V15M12 9v6m-3-3h6" /></svg>;
const HRIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.071M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-3 0V3m0 3v3m0 0h3m-3 0H9m12 6a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const TaskIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const TrainingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>;
const MySpaceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const NotificationsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>;
const ProjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.5 13.5h3.75" /></svg>;
const CertificateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9 9 0 0 0 9 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
const AttendanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const QuizIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>;
const FacebookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2.04c-5.5 0-10 4.49-10 10s4.5 10 10 10 10-4.49 10-10-4.5-10-10-10zm2.25 10.5h-2v6h-3v-6h-1.5v-2.5h1.5v-2c0-1.26.54-3 3-3h2v2.5h-1.31c-.5 0-.69.24-.69.72v1.78h2l-.25 2.5z"></path></svg>;
const KpiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>;
const StudentRegIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M12 15v5.25a.75.75 0 0 1-1.5 0V15M3 15h18" /></svg>;
const InquiryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>;
const SignatureIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;

// New SMS Icons
const SmsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ComposeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M12 15v5.25a.75.75 0 0 1-1.5 0V15" /></svg>;
const OutboxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;
const TemplateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12.75h7.5" /></svg>;
const PromotionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>;

// POS System Icons
const POSIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>;
const ProductIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>;
const InventoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>;
const OrderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>;
const DeliveryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h14.25m0 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m0 0h-7.5m7.5 0v-3.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v3.375m15.75 0v1.125c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.125m15.75 0h-7.5" /></svg>;
const RevenueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const CustomerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>;

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, hasPermission, companyProfile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('sidebarCollapseChange'));
  }, [isCollapsed]);

  // Record Payment modal fetches its own data when opened (lazy-load to reduce Firebase reads)
  const handleRecordPaymentClick = () => setIsRecordPaymentModalOpen(true);

  if (!user) return <></>; 

  const isAdminOrOwner = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;
  
  const showMySpace = true; // Always show My Space for logged in users
  const showLeads = hasPermission(Permission.VIEW_LEADS);
  // POS should be visible to Owners and Admins by default, or if user has VIEW_POS permission
  const showPOS = isAdminOrOwner || hasPermission(Permission.VIEW_POS);
  const showFinance =
    hasPermission(Permission.VIEW_FINANCE_DASHBOARD) ||
    hasPermission(Permission.MANAGE_PAYMENTS_RECEIPTS) ||
    hasPermission(Permission.MANAGE_QUOTATIONS) ||
    hasPermission(Permission.MANAGE_INVOICES) ||
    hasPermission(Permission.VIEW_CLIENTS_TO_PAY) ||
    hasPermission(Permission.MANAGE_VISA_CARDS) ||
    hasPermission(Permission.MANAGE_EXPENSES) ||
    hasPermission(Permission.VIEW_GL) ||
    hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE) ||
    hasPermission(Permission.MANAGE_ACCOUNTS_RECEIVABLE) ||
    hasPermission(Permission.MANAGE_TREASURY) ||
    hasPermission(Permission.MANAGE_FIXED_ASSETS) ||
    hasPermission(Permission.MANAGE_CAPITAL) ||
    hasPermission(Permission.VIEW_FINANCIAL_REPORTS);
  const showHR = (isAdminOrOwner && (hasPermission(Permission.VIEW_STAFF_LIST) || hasPermission(Permission.VIEW_PAYROLL_ADMIN) || hasPermission(Permission.VIEW_LEAVE_ADMIN))) || hasPermission(Permission.MANAGE_HOLIDAYS) || hasPermission(Permission.MANAGE_KPI_LIBRARY) || hasPermission(Permission.VIEW_TEAM_KPIS);
  const showProjectManagement = hasPermission(Permission.VIEW_PROJECTS);
  const showSmsModule = hasPermission(Permission.VIEW_SMS_MODULE); // New permission check
  const showPromotions = hasPermission(Permission.MANAGE_PROMOTIONS);
  const showServices = hasPermission(Permission.VIEW_SERVICES);
  const showReports =
    hasPermission(Permission.VIEW_REPORTS) ||
    hasPermission(Permission.VIEW_REPORTS_PERFORMANCE) ||
    hasPermission(Permission.VIEW_FINANCIAL_REPORTS) ||
    hasPermission(Permission.VIEW_FINANCE_DASHBOARD);


  return (
    <div className={`fixed top-0 left-0 ${isCollapsed ? 'w-16' : 'w-64'} h-full bg-container-bg dark:bg-slate-900 text-white flex flex-col shadow-lg z-40 border-r border-slate-100 dark:border-slate-800 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="px-4 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <Link to="/dashboard" className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
          {companyProfile?.logoUrl ? (
            <img src={companyProfile.logoUrl} alt="Company Logo" className="h-10 w-auto" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-primary-action">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.098a2.25 2.25 0 0 1-2.25 2.25h-13.5a2.25 2.25 0 0 1-2.25-2.25V14.15M12 18.75V15M18.75 10.5H5.25A2.25 2.25 0 0 1 3 8.25V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25a2.25 2.25 0 0 1-2.25 2.25Z" />
            </svg>
          )}
          {!isCollapsed && <span className="text-xl font-bold tracking-tight text-text-primary dark:text-slate-100">{companyProfile?.appName || APP_NAME}</span>}
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" /></svg>
            )}
          </button>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">
          <NavItem to="/dashboard" icon={<HomeIcon />} text="Dashboard" setIsOpen={setIsOpen} isCollapsed={isCollapsed}/>
          
          {showMySpace && (
            <AccordionNavItem icon={<MySpaceIcon />} text="My Space" basePath="/my" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              {hasPermission(Permission.VIEW_TASKS) && <NavItem to="/my-tasks" icon={<TaskIcon />} text="My Tasks" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.VIEW_OWN_PROFILE) && <NavItem to="/profile" icon={<ClientIcon />} text="My Profile" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.VIEW_OWN_PROFILE) && <NavItem to="/my-notifications" icon={<NotificationsIcon />} text="Update Notifications" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.VIEW_OWN_LEAVE_REQUESTS) && <NavItem to="/my/leave" icon={<ServiceIcon />} text="My Leave" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.VIEW_OWN_PAYSLIP) && <NavItem to="/my-payroll" icon={<SalesIcon />} text="My Payroll" isSubItem isCollapsed={isCollapsed} />}
              {<NavItem to="/my/kpi" icon={<KpiIcon />} text="My KPIs" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}
          
          {showLeads && (
            <AccordionNavItem icon={<LeadIcon />} text="Leads" basePath="/leads" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/leads/overview" icon={<LeadIcon />} text="Overview" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.VIEW_LEAD_ACTIVITIES) && (
                <NavItem to="/leads/activities" icon={<TaskIcon />} text="Activities" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.MANAGE_LEAD_NOTES) && (
                <NavItem to="/leads/notes" icon={<ServiceIcon />} text="Notes" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.VIEW_LEAD_ANALYTICS) && (
                <NavItem to="/leads/analytics" icon={<ReportsIcon />} text="Analytics" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.MANAGE_LEAD_SETTINGS) && (
                <NavItem to="/leads/settings" icon={<SettingsIcon />} text="Settings" isSubItem isCollapsed={isCollapsed} />
              )}
            </AccordionNavItem>
          )}
          
          {hasPermission(Permission.VIEW_CLIENTS_BUSINESSES) && (
            <AccordionNavItem icon={<ClientIcon />} text="Clients" basePath="/clients" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/clients" icon={<ClientIcon />} text="Clients" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/businesses" icon={<ClientIcon />} text="Businesses" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.MANAGE_SYSTEM_LISTS) && (
                <NavItem to="/clients/settings" icon={<SettingsIcon />} text="Settings" isSubItem isCollapsed={isCollapsed} />
              )}
            </AccordionNavItem>
          )}
          
          {(showServices || showPromotions) && (
            <AccordionNavItem icon={<ServiceIcon />} text="Services Mgt" basePath="/services" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
                {showServices && <NavItem to="/services" icon={<ServiceIcon />} text="Service List" isSubItem isCollapsed={isCollapsed} />}
                {showPromotions && <NavItem to="/promotions" icon={<PromotionsIcon />} text="Promotions" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}


          {showSmsModule && (
            <AccordionNavItem icon={<SmsIcon />} text="SMS" basePath="/sms" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              {hasPermission(Permission.SEND_SMS) && <NavItem to="/sms/compose" icon={<ComposeIcon />} text="Compose" isSubItem isCollapsed={isCollapsed} />}
              <NavItem to="/sms/outbox" icon={<OutboxIcon />} text="Outbox" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.MANAGE_SMS_TEMPLATES) && <NavItem to="/sms/templates" icon={<TemplateIcon />} text="Templates" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_SMS_SETTINGS) && <NavItem to="/sms/settings" icon={<SettingsIcon />} text="Settings" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}

          {showPOS && (
            <AccordionNavItem icon={<POSIcon />} text="POS" basePath="/pos" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/pos" icon={<SalesIcon />} text="Sales" isSubItem isCollapsed={isCollapsed} />
              {(hasPermission(Permission.VIEW_POS) || hasPermission(Permission.CREATE_POS_ORDER)) && <NavItem to="/pos/customers" icon={<CustomerIcon />} text="Customers" isSubItem isCollapsed={isCollapsed} />}
              {(hasPermission(Permission.MANAGE_POS_PRODUCTS) || hasPermission(Permission.MANAGE_POS_INVENTORY)) && <NavItem to="/pos/products" icon={<ProductIcon />} text="Products & Inventory" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_POS_ORDERS) && <NavItem to="/pos/orders" icon={<OrderIcon />} text="Orders" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_DELIVERY_TRACKING) && <NavItem to="/pos/delivery" icon={<DeliveryIcon />} text="Delivery Tracking" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.VIEW_POS_REVENUE) && <NavItem to="/pos/revenue" icon={<RevenueIcon />} text="Revenue" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}
          
          {showProjectManagement && (
            <AccordionNavItem icon={<ProjectIcon />} text="Projects" basePath="/projects" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/projects" icon={<ProjectIcon />} text="Projects" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.VIEW_TASKS) && <NavItem to="/tasks" icon={<TaskIcon />} text="Task Management" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}
          
          {hasPermission(Permission.VIEW_SALES_RECORDS) && (
            <AccordionNavItem icon={<SalesIcon />} text="Sales" basePath="/sales" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/sales" icon={<SalesIcon />} text="Sales & Credits" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.MANAGE_INVOICES) && <NavItem to="/sales/invoices" icon={<SalesIcon />} text="Invoices" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_QUOTATIONS) && <NavItem to="/sales/quotations" icon={<SalesIcon />} text="Quotations" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}

          {showFinance && (
            <AccordionNavItem icon={<FinanceIcon />} text="Finance" basePath="/finance" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/finance/visa-cards" icon={<ClientIcon />} text="Visa Cards" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/expenses" icon={<ClientIcon />} text="Expenses" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/ap" icon={<FinanceIcon />} text="Accounts Payable" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE) && <NavItem to="/finance/credit-notes" icon={<FinanceIcon />} text="Credit Notes" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE) && <NavItem to="/finance/balance-adjustments" icon={<FinanceIcon />} text="Balance Adjustments" isSubItem isCollapsed={isCollapsed} />}
              <NavItem to="/finance/ar" icon={<FinanceIcon />} text="Receivables & Bad Debts" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/opening-balance" icon={<FinanceIcon />} text="Opening Balance" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.MANAGE_PAYMENTS_RECEIPTS) && <NavItem to="/finance/payments" icon={<FinanceIcon />} text="Payments & Receipts" isSubItem isCollapsed={isCollapsed} />}
              <NavItem to="/finance/cash" icon={<FinanceIcon />} text="Cash & Treasury" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/fixed-assets" icon={<FinanceIcon />} text="Fixed Assets" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/capital" icon={<FinanceIcon />} text="Capital Mgmt" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/analytics" icon={<FinanceIcon />} text="Financial Analytics" isSubItem isCollapsed={isCollapsed} />
              <NavItem to="/finance/balance-sheet" icon={<FinanceIcon />} text="Balance Sheet" isSubItem isCollapsed={isCollapsed} />
            </AccordionNavItem>
          )}

          {showHR && (
            <AccordionNavItem icon={<HRIcon />} text="HR" basePath="/hr" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              {isAdminOrOwner && hasPermission(Permission.VIEW_STAFF_LIST) && <NavItem to="/hr/staff" icon={<LeadIcon />} text="Staff Management" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_DEPARTMENTS) && <NavItem to="/hr/departments" icon={<ServiceIcon />} text="Departments" isSubItem isCollapsed={isCollapsed} />}
              {isAdminOrOwner && hasPermission(Permission.VIEW_PAYROLL_ADMIN) && <NavItem to="/hr/payroll" icon={<SalesIcon />} text="Payroll Admin" isSubItem isCollapsed={isCollapsed} />}
              {isAdminOrOwner && <NavItem to="/hr/attendance" icon={<AttendanceIcon />} text="Attendance Admin" isSubItem isCollapsed={isCollapsed} />}
              {isAdminOrOwner && hasPermission(Permission.VIEW_LEAVE_ADMIN) && <NavItem to="/hr/leave-admin" icon={<LeadIcon />} text="Leave Admin" isSubItem isCollapsed={isCollapsed} />}
              {(hasPermission(Permission.MANAGE_HOLIDAYS) || hasPermission(Permission.VIEW_LEAVE_ADMIN) || hasPermission(Permission.VIEW_OWN_LEAVE_REQUESTS)) && <NavItem to="/hr/holidays" icon={<ServiceIcon />} text="Holiday Calendar" isSubItem isCollapsed={isCollapsed} />}
              {isAdminOrOwner && <NavItem to="/hr/activity-log" icon={<TaskIcon />} text="Activity Log" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.MANAGE_KPI_LIBRARY) && <NavItem to="/hr/kpi-management" icon={<KpiIcon />} text="KPI Management" isSubItem isCollapsed={isCollapsed} />}
              {hasPermission(Permission.VIEW_TEAM_KPIS) && <NavItem to="/hr/team-kpis" icon={<HRIcon />} text="Team KPIs" isSubItem isCollapsed={isCollapsed} />}
            </AccordionNavItem>
          )}
          

          {showReports && (
            <AccordionNavItem icon={<ReportsIcon />} text="Reports" basePath="/reports" setIsOpen={setIsOpen} isCollapsed={isCollapsed}>
              <NavItem to="/reports" icon={<ReportsIcon />} text="Reports Dashboard" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.VIEW_FINANCIAL_REPORTS) && (
                <NavItem to="/reports/profit-loss" icon={<ReportsIcon />} text="Profit & Loss" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.VIEW_FINANCIAL_REPORTS) && (
                <NavItem to="/reports/balance-sheet" icon={<ReportsIcon />} text="Balance Sheet" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.VIEW_FINANCE_DASHBOARD) && (
                <NavItem to="/reports/financial" icon={<ReportsIcon />} text="Company Financial" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.MANAGE_EXPENSES) && (
                <NavItem to="/reports/expenses" icon={<ReportsIcon />} text="Expense Report" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.VIEW_SALES_RECORDS) && (
                <NavItem to="/reports/sales" icon={<ReportsIcon />} text="Sales Report" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.VIEW_LEADS) && (
                <NavItem to="/reports/leads" icon={<ReportsIcon />} text="Leads Report" isSubItem isCollapsed={isCollapsed} />
              )}
              {hasPermission(Permission.VIEW_TASKS) && (
                <NavItem to="/reports/tasks" icon={<ReportsIcon />} text="Tasks Report" isSubItem isCollapsed={isCollapsed} />
              )}
              <NavItem to="/reports/my-activity" icon={<ReportsIcon />} text="My Activity" isSubItem isCollapsed={isCollapsed} />
              {hasPermission(Permission.VIEW_REPORTS_PERFORMANCE) && (
                <NavItem to="/reports/employee-performance" icon={<ReportsIcon />} text="Employee Performance" isSubItem isCollapsed={isCollapsed} />
              )}
            </AccordionNavItem>
          )}
          {hasPermission(Permission.MANAGE_SETTINGS) && <NavItem to="/settings" icon={<SettingsIcon />} text="Settings" setIsOpen={setIsOpen} isCollapsed={isCollapsed}/>}
        </ul>
      </nav>
      <div className={`p-4 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-3 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className={`w-10 h-10 rounded-full bg-primary-action flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
                {user.facePhotoUrl ? (
                    <img src={user.facePhotoUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                    user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                )}
            </div>
            {!isCollapsed && (
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary dark:text-slate-100 truncate">{user.name}</p>
                    <p className="text-xs text-text-secondary dark:text-slate-400 truncate">{user.role}</p>
                </div>
            )}
        </div>
        
        {/* Record Payment Button */}
        {hasPermission(Permission.MANAGE_PAYMENTS_RECEIPTS) && (
          <button
            onClick={handleRecordPaymentClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-2.5 bg-primary-action hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-150 shadow-sm`}
            title={isCollapsed ? "Record Payment" : undefined}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {!isCollapsed && <span className="ml-2">Record Payment</span>}
          </button>
        )}
      </div>

      {/* Record Payment Modal */}
      {isRecordPaymentModalOpen && user && (
        <RecordPaymentModal 
          isOpen={isRecordPaymentModalOpen}
          onClose={() => setIsRecordPaymentModalOpen(false)}
          onSuccess={() => {
            setIsRecordPaymentModalOpen(false);
            dispatchRefreshData();
          }}
        />
      )}
    </div>
  );
}