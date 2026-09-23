
import React, { useState } from 'react';
import QuotationsTab from './tabs/QuotationsTab';
import InvoicesTab from './tabs/InvoicesTab';
import PaymentsTab from './tabs/PaymentsTab';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';

type ActiveTab = 'quotations' | 'invoices' | 'payments';

const FinancialDocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quotations');
  const { hasPermission } = useAuth();

  const canViewQuotations = hasPermission(Permission.MANAGE_QUOTATIONS);
  const canViewInvoices = hasPermission(Permission.MANAGE_INVOICES);
  const canViewPayments = hasPermission(Permission.MANAGE_PAYMENTS_RECEIPTS);

  // Determine initial active tab based on permissions
  useState(() => {
    if (canViewQuotations) setActiveTab('quotations');
    else if (canViewInvoices) setActiveTab('invoices');
    else if (canViewPayments) setActiveTab('payments');
  });


  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'quotations':
        return canViewQuotations ? <QuotationsTab /> : <p>You do not have permission to view quotations.</p>;
      case 'invoices':
        return canViewInvoices ? <InvoicesTab /> : <p>You do not have permission to view invoices.</p>;
      case 'payments':
        return canViewPayments ? <PaymentsTab /> : <p>You do not have permission to view payments.</p>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Financial Documents</h1>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {canViewQuotations && (
            <button
              onClick={() => setActiveTab('quotations')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'quotations'
                  ? 'border-primary-action text-primary-action'
                  : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              Quotations
            </button>
          )}
          {canViewInvoices && (
            <button
              onClick={() => setActiveTab('invoices')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-primary-action text-primary-action'
                  : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              Invoices
            </button>
          )}
          {canViewPayments && (
            <button
              onClick={() => setActiveTab('payments')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-primary-action text-primary-action'
                  : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              Payments & Receipts
            </button>
          )}
        </nav>
      </div>

      <div>
        {renderActiveTabContent()}
      </div>
    </div>
  );
};

export default FinancialDocumentsPage;
