import React, { useState, useCallback } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import ManageGenericList from '../ui/ManageGenericList';
import { Department } from '../../types';
import { apiGetDepartments, apiAddDepartment, apiUpdateDepartment, apiDeleteDepartment } from '../../services/api';

const HRManagementPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('hrManagementSidebarCollapsed');
  const [activeTab, setActiveTab] = useState<'departments'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedDepartments = await apiGetDepartments();
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      addNotification("Failed to load departments.", "error");
    }
    setIsLoading(false);
  }, [addNotification]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">HR Management</h2>}
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
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('departments')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'departments' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Departments' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21v-4.5m0 4.5h16.5M3.75 16.5V7.5M3.75 7.5h16.5M3.75 7.5C3.75 5.843 5.093 4.5 6.75 4.5h10.5c1.657 0 3 1.343 3 3M3.75 7.5L12 12m0 0L20.25 7.5M12 12v9" />
                </svg>
              ) : (
                'Departments'
              )}
            </button>
          </nav>
        </aside>
        <main className="flex-1">
          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            {activeTab === 'departments' && (
              <ManageGenericList
                title="Departments"
                items={departments}
                fetchItems={fetchData}
                addFunction={apiAddDepartment}
                updateFunction={apiUpdateDepartment}
                deleteFunction={apiDeleteDepartment}
                hasDescription={true}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HRManagementPage;





