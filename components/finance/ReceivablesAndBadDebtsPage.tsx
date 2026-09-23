import React, { useState } from 'react';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import FinancePageHeader from './shared/FinancePageHeader';
import AccountsReceivablePage from './AccountsReceivablePage';
import BadDebtManagementPage from './BadDebtManagementPage';
import type { ARTab } from './AccountsReceivablePage';
import type { BadDebtTab } from './BadDebtManagementPage';

export type ReceivablesTab = 'all' | 'overdue' | 'badDebts' | 'allowance';

const TAB_CONFIG: { id: ReceivablesTab; label: string; icon: string }[] = [
  { id: 'all', label: 'All Receivable', icon: '📋' },
  { id: 'overdue', label: 'Overdue', icon: '⚠️' },
  { id: 'badDebts', label: 'Bad debts', icon: '❌' },
  { id: 'allowance', label: 'Allowance (AFDD)', icon: '📈' },
];

const ReceivablesAndBadDebtsPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('receivablesBadDebtsSidebarCollapsed');
  const [activeTab, setActiveTab] = useState<ReceivablesTab>('all');

  const isARTab = activeTab === 'all' || activeTab === 'overdue';
  const isBadDebtTab = activeTab === 'badDebts' || activeTab === 'allowance';

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Receivables & Bad Debts"
        description="All receivables, overdue (with write-off), bad debts, and allowance for doubtful debts."
      />

      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && (
              <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Sections</h2>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" />
                </svg>
              )}
            </button>
          </div>
          <nav className="space-y-2">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg font-medium transition-colors duration-150
                  ${activeTab === tab.id
                    ? 'bg-primary-action text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                  }`}
                title={isSidebarCollapsed ? tab.label : ''}
              >
                {isSidebarCollapsed ? <span>{tab.icon}</span> : tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {isARTab && (
            <AccountsReceivablePage
              embedded
              forcedTab={activeTab as ARTab}
            />
          )}
          {isBadDebtTab && (
            <BadDebtManagementPage
              embedded
              forcedTab={activeTab as BadDebtTab}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default ReceivablesAndBadDebtsPage;
