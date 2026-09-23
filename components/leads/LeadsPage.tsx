import React, { useMemo } from 'react';
import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { Permission } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import Button from '../ui/Button';

const navButtonClasses = (isActive: boolean) =>
  `w-full flex flex-col items-start px-4 py-3 rounded-lg text-left transition-colors duration-150 border ${
    isActive
      ? 'bg-primary-action text-white border-transparent shadow-md'
      : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-action hover:text-primary-action dark:hover:text-white'
  }`;

const LeadsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('leadsSidebarCollapsed');
  const isDetailView = Boolean(useMatch('/leads/:leadId'));

  const navItems = useMemo(
    () => [
      {
        id: 'overview',
        label: 'Overview',
        description: 'Pipeline board & table views',
        to: '/leads/overview',
        permission: Permission.VIEW_LEADS,
      },
      {
        id: 'activities',
        label: 'Activities',
        description: 'Latest logged touchpoints',
        to: '/leads/activities',
        permission: Permission.VIEW_LEAD_ACTIVITIES,
      },
      {
        id: 'notes',
        label: 'Notes',
        description: 'Centralized notes per lead',
        to: '/leads/notes',
        permission: Permission.MANAGE_LEAD_NOTES,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        description: 'Conversion trends & breakdowns',
        to: '/leads/analytics',
        permission: Permission.VIEW_LEAD_ANALYTICS,
      },
      {
        id: 'settings',
        label: 'Settings',
        description: 'Automation & default ownership',
        to: '/leads/settings',
        permission: Permission.MANAGE_LEAD_SETTINGS,
      },
    ],
    []
  );

  const visibleNavItems = navItems.filter((item) => hasPermission(item.permission));

  if (isDetailView) {
    return <Outlet />;
  }

  if (!hasPermission(Permission.VIEW_LEADS)) {
    return (
      <div className="bg-container-bg dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700 shadow">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100 mb-2">Access Restricted</h2>
        <p className="text-text-secondary dark:text-slate-400">
          Your account does not have permission to view leads. Please contact your administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  if (visibleNavItems.length === 0) {
    return (
      <div className="bg-container-bg dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700 shadow">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100 mb-2">No Leads Modules Enabled</h2>
        <p className="text-text-secondary dark:text-slate-400">
          Your role currently does not have any of the Leads submodules enabled. Ask an admin to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-container-bg dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-text-secondary dark:text-slate-400">Sales Enablement</p>
          <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100 mt-1">Leads Workspace</h1>
          <p className="text-text-secondary dark:text-slate-400 mt-2">
            Manage every interaction from capture to conversion in one place.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {hasPermission(Permission.CREATE_LEAD) && (
            <Button to="/leads/overview" variant="primary" size="lg">
              Go to Pipeline
            </Button>
          )}
          {hasPermission(Permission.VIEW_LEAD_ANALYTICS) && (
            <Button to="/leads/analytics" variant="ghost" size="lg">
              View Analytics
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-80 xl:w-96'} flex-shrink-0 transition-all duration-300`}>
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow">
            <div className="flex justify-between items-center mb-4">
              {!isSidebarCollapsed && <h2 className="text-lg font-semibold text-text-primary dark:text-slate-100">Leads Modules</h2>}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" /></svg>
                )}
              </button>
            </div>
            <nav className="space-y-3">
              {visibleNavItems.map((item) => (
                <NavLink 
                  key={item.id} 
                  to={item.to} 
                  className={({ isActive }) => {
                    if (isSidebarCollapsed) {
                      return `w-full flex items-center justify-center px-2 py-3 rounded-lg transition-colors duration-150 ${
                        isActive 
                          ? 'bg-primary-action text-white shadow-md' 
                          : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700'
                      }`;
                    }
                    return navButtonClasses(isActive);
                  }}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.071M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                  ) : (
                    <>
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-xs opacity-80">{item.description}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-h-[520px]">
          <div className="bg-container-bg dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_top,_#2563eb,_transparent_45%)]" />
            <div className="relative">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeadsPage;
