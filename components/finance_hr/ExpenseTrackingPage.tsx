import React, { useState, useCallback } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import MockDataBanner from '../facebook_ads/MockDataBanner';
import ExpenseRecordsTab from './ExpenseRecordsTab';
import ExpenseCategoryManagementTab from './ExpenseCategoryManagementTab';

const ExpenseTrackingPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'records' | 'categories'>('records');
  const [categoryUpdateTrigger, setCategoryUpdateTrigger] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('expenseTrackingSidebarCollapsed');

  const handleCategoryUpdate = useCallback(() => {
    setCategoryUpdateTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-6">
      <MockDataBanner />
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Expenses</h2>}
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
              onClick={() => setActiveTab('records')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'records' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Expense Records' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h3.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              ) : (
                'Expense Records'
              )}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'categories' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Category Management' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              ) : (
                'Category Management'
              )}
            </button>
          </nav>
        </aside>
        <main className="flex-1">
          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            {/* Expense Records Tab */}
            {activeTab === 'records' && (
              <ExpenseRecordsTab onCategoryUpdate={categoryUpdateTrigger} />
            )}

            {/* Category Management Tab */}
            {activeTab === 'categories' && (
              <ExpenseCategoryManagementTab onCategoryUpdate={handleCategoryUpdate} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExpenseTrackingPage;
