import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  apiGetCashAccounts,
  apiGetCashTransactions,
  apiRecordCashTransaction,
  apiReconcileCashAccount,
  apiTransferBetweenAccounts,
  apiGetVisaReloadsForPeriod,
  apiGetExpensesForPeriod,
  apiGetPaymentsForPeriod,
} from '../../services/api';
import { CashAccount, CashTransaction, VisaReload, Expense, Payment } from '../../types';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { useNotification } from '../../hooks/useNotification';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import MockDataBanner from '../facebook_ads/MockDataBanner';
import {
  notifyOperationWithData,
  notifyWarning,
} from '../../utils/notificationUtils';
import AccountManagementTab from './AccountManagementTab';
import FinanceTable from './shared/FinanceTable';
import { useSearchFilter, useDateRangeFilters } from '../../hooks/useFinanceFilters';
import { isDateInRange } from '../../utils/financeUtils';
import { getTodayInYangon, getDateInYangonTimezone, formatDateForDisplay } from '../../utils/dateUtils';

// Unified transaction type for display
type UnifiedTransaction = {
  id: string;
  date: string;
  accountId: string;
  type: 'inflow' | 'outflow';
  amount: number;
  currency: string;
  reference: string;
  description: string;
  source: 'cash_transaction' | 'visa_reload' | 'expense' | 'payment';
  originalId: string;
};

const CashManagementPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('cashManagementSidebarCollapsed');
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions'>('accounts');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    cashAccountId: '',
    type: 'inflow' as CashTransaction['type'],
    amount: 0,
    reference: '',
    description: '',
    transactionDate: getTodayInYangon(),
  });
  const [reconcileForm, setReconcileForm] = useState({ cashAccountId: '', statementBalance: 0 });
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    serviceFee: 0,
    transactionDate: getTodayInYangon(),
    description: '',
    reference: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get date range for fetching transactions (last 12 months)
      const endDate = getTodayInYangon();
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const startDateStr = getDateInYangonTimezone(startDate);

      const [cashAccounts, cashTransactions, visaReloads, expenses, payments] = await Promise.all([
        apiGetCashAccounts(),
        apiGetCashTransactions(),
        apiGetVisaReloadsForPeriod(startDateStr, endDate),
        apiGetExpensesForPeriod(startDateStr, endDate),
        apiGetPaymentsForPeriod(startDateStr, endDate),
      ]);
      
      setAccounts(cashAccounts);
      setTransactions(cashTransactions);

      // Convert all transactions to unified format
      const unified: UnifiedTransaction[] = [];

      // Cash Transactions
      cashTransactions.forEach(txn => {
        unified.push({
          id: `cash_${txn.id}`,
          date: txn.transactionDate,
          accountId: txn.cashAccountId,
          type: txn.type,
          amount: txn.amount,
          currency: txn.currency || 'MMK',
          reference: txn.reference || '',
          description: txn.description || 'Cash Transaction',
          source: 'cash_transaction',
          originalId: txn.id,
        });
      });

      // Visa Reloads (outflow from source account)
      visaReloads.forEach(reload => {
        if (reload.sourceAccountId) {
          unified.push({
            id: `visa_${reload.id}`,
            date: reload.reloadDate,
            accountId: reload.sourceAccountId,
            type: 'outflow',
            amount: reload.amountMMK,
            currency: 'MMK',
            reference: `Visa Reload - Card ${reload.cardId}`,
            description: `Visa card reload`,
            source: 'visa_reload',
            originalId: reload.id,
          });
        }
      });

      // Expenses (outflow from source account)
      expenses.forEach(expense => {
        if (expense.sourceAccountId) {
          unified.push({
            id: `expense_${expense.id}`,
            date: expense.expenseDate,
            accountId: expense.sourceAccountId,
            type: 'outflow',
            amount: expense.amountMMK,
            currency: 'MMK',
            reference: expense.category,
            description: expense.description || 'Expense',
            source: 'expense',
            originalId: expense.id,
          });
        }
      });

      // Payments (inflow to account - if payment method is linked to a cash account)
      // Note: Payments don't have sourceAccountId, but they represent money received
      // We'll need to match payment method to cash accounts or show them separately
      // For now, we'll show payments that might be deposited to accounts
      payments.forEach(payment => {
        const matchingAccount = payment.cashAccountId
          ? cashAccounts.find(acc => acc.id === payment.cashAccountId)
          : cashAccounts.find(acc => 
              payment.method.toLowerCase().includes(acc.name.toLowerCase()) ||
              (acc.accountNumber && payment.transactionLast4Digits && acc.accountNumber.endsWith(payment.transactionLast4Digits))
            );
        
        if (matchingAccount) {
          unified.push({
            id: `payment_${payment.id}`,
            date: payment.paymentDate,
            accountId: matchingAccount.id,
            type: 'inflow',
            amount: payment.amountMMK,
            currency: 'MMK',
            reference: payment.receiptNumber,
            description: `Payment received - ${payment.method}`,
            source: 'payment',
            originalId: payment.id,
          });
        }
      });

      // Sort by date (newest first)
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setUnifiedTransactions(unified);

      if (cashAccounts.length > 0) {
        setTransactionForm(form => ({ ...form, cashAccountId: cashAccounts[0].id }));
        setReconcileForm(form => ({ ...form, cashAccountId: cashAccounts[0].id }));
      }
    } catch (error) {
      addNotification((error as Error).message, 'error');
    }
    setIsLoading(false);
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transactionForm.cashAccountId || !transactionForm.amount) {
      notifyWarning(addNotification, 'Select an account and enter an amount.');
      return;
    }
    const txn = await notifyOperationWithData(
      addNotification,
      () =>
        apiRecordCashTransaction({
          ...transactionForm,
          amount: Number(transactionForm.amount),
          currency: 'MMK',
        }),
      `Cash transaction recorded (${transactionForm.type === 'inflow' ? 'Inflow' : 'Outflow'}).`,
      'Failed to record cash transaction',
    );
    if (!txn) return;
    await loadData(); // Reload all data to get updated transactions and accounts
    setTransactionForm(form => ({ ...form, amount: 0, reference: '', description: '' }));
    setIsTransactionModalOpen(false);
  };

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount || transferForm.amount <= 0) {
      notifyWarning(addNotification, 'Select both accounts and enter a valid amount.');
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      notifyWarning(addNotification, 'Cannot transfer to the same account.');
      return;
    }
    
    const result = await notifyOperationWithData(
      addNotification,
      () =>
        apiTransferBetweenAccounts(
          transferForm.fromAccountId,
          transferForm.toAccountId,
          Number(transferForm.amount),
          Number(transferForm.serviceFee) || 0,
          transferForm.transactionDate,
          transferForm.description || undefined,
          transferForm.reference || undefined
        ),
      `Transfer completed: ${transferForm.amount.toLocaleString()} MMK${transferForm.serviceFee > 0 ? ` (Fee: ${transferForm.serviceFee.toLocaleString()} MMK)` : ''}`,
      'Failed to transfer between accounts',
    );
    
    if (!result) return;
    await loadData(); // Reload all data
    setTransferForm({
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      serviceFee: 0,
      transactionDate: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
    });
    setIsTransferModalOpen(false);
  };

  const handleReconcile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reconcileForm.cashAccountId) {
      notifyWarning(addNotification, 'Select a cash account to reconcile.');
      return;
    }
    const account = await notifyOperationWithData(
      addNotification,
      () =>
        apiReconcileCashAccount(reconcileForm.cashAccountId, Number(reconcileForm.statementBalance)),
      'Statement reconciliation saved.',
      'Failed to reconcile account',
    );
    if (!account) return;
    setAccounts(prev => prev.map(acc => (acc.id === account.id ? account : acc)));
    setReconcileForm(form => ({ ...form, statementBalance: 0 }));
    setIsReconcileModalOpen(false);
  };

  // Filters
  const { searchTerm, setSearchTerm, filterBySearch } = useSearchFilter<CashTransaction>();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeFilters();
  const [filterAccountId, setFilterAccountId] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');

  const selectedAccount = accounts.find(acc => acc.id === transactionForm.cashAccountId);
  
  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = unifiedTransactions.filter(txn => {
      // Date filter
      if (startDate && endDate && !isDateInRange(txn.date, startDate, endDate)) {
        return false;
      }
      // Account filter
      if (filterAccountId && txn.accountId !== filterAccountId) {
        return false;
      }
      // Type filter
      if (filterType !== 'all' && txn.type !== filterType) {
        return false;
      }
      // Search filter
      const accountName = accounts.find(acc => acc.id === txn.accountId)?.name || '';
      return filterBySearch(txn, ['reference', 'description']) || 
             filterBySearch({ name: accountName }, ['name']);
    });
    return filtered;
  }, [unifiedTransactions, startDate, endDate, filterAccountId, filterType, filterBySearch, accounts]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalInflow = filteredTransactions
      .filter(txn => txn.type === 'inflow')
      .reduce((sum, txn) => sum + txn.amount, 0);
    const totalOutflow = filteredTransactions
      .filter(txn => txn.type === 'outflow')
      .reduce((sum, txn) => sum + txn.amount, 0);
    const netCashFlow = totalInflow - totalOutflow;
    const totalTransactions = filteredTransactions.length;
    
    return { totalInflow, totalOutflow, netCashFlow, totalTransactions };
  }, [filteredTransactions]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MockDataBanner />
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Cash & Treasury</h2>}
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
              onClick={() => setActiveTab('accounts')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'accounts' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Account Management' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              ) : (
                'Account Management'
              )}
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'transactions' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Transactions' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              ) : (
                'Transactions'
              )}
            </button>
          </nav>
        </aside>
        <main className="flex-1">
          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            {/* Account Management Tab */}
            {activeTab === 'accounts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Account Management</h1>
                    <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                      Register and manage bank accounts, mobile wallets, and payment methods.
                    </p>
                  </div>
                </div>
                <AccountManagementTab />
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Transactions</h1>
                    <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                      Record and track cash transactions, reconcile statements.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => setIsTransactionModalOpen(true)} variant="primary">+ Record Transaction</Button>
                    <Button onClick={() => setIsTransferModalOpen(true)} variant="primary">+ Transfer Between Accounts</Button>
                    <Button onClick={() => setIsReconcileModalOpen(true)} variant="primary">+ Reconcile Statement</Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                      <p className="text-sm text-text-secondary dark:text-slate-400">Total Inflow</p>
                      <p className="text-3xl font-bold text-status-success">{kpis.totalInflow.toLocaleString()} MMK</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                      <p className="text-sm text-text-secondary dark:text-slate-400">Total Outflow</p>
                      <p className="text-3xl font-bold text-status-danger">{kpis.totalOutflow.toLocaleString()} MMK</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                      <p className="text-sm text-text-secondary dark:text-slate-400">Net Cash Flow</p>
                      <p className={`text-3xl font-bold ${kpis.netCashFlow >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                        {kpis.netCashFlow.toLocaleString()} MMK
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                      <p className="text-sm text-text-secondary dark:text-slate-400">Total Transactions</p>
                      <p className="text-3xl font-bold text-primary-action">{kpis.totalTransactions}</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <Input
                        label="Search"
                        placeholder="Search by reference or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        containerClassName="mb-0"
                      />
                      <Input
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        containerClassName="mb-0"
                      />
                      <Input
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        containerClassName="mb-0"
                      />
                      <Select
                        label="Account"
                        value={filterAccountId}
                        onChange={(e) => setFilterAccountId(e.target.value)}
                        options={[
                          { value: '', label: 'All Accounts' },
                          ...accounts.map(acc => {
                            // Show bank name for Bank Accounts, wallet provider for Mobile Wallets
                            const displayName = acc.accountType === 'Bank Account' 
                              ? (acc.bankName || acc.name)
                              : (acc.walletProvider || acc.name);
                            // Get last 4 digits of account number or phone number
                            const last4Digits = acc.accountType === 'Bank Account' 
                              ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                              : (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '');
                            const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
                            return { 
                              value: acc.id, 
                              label: `${acc.name} - ${displayName}${digitsDisplay}` 
                            };
                          }),
                        ]}
                        containerClassName="mb-0"
                      />
                      <Select
                        label="Type"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'inflow' | 'outflow')}
                        options={[
                          { value: 'all', label: 'All Types' },
                          { value: 'inflow', label: 'Inflow' },
                          { value: 'outflow', label: 'Outflow' },
                        ]}
                        containerClassName="mb-0"
                      />
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <FinanceTable
                    columns={[
                      {
                        key: 'date',
                        label: 'Date',
                        render: (txn: UnifiedTransaction) => formatDateForDisplay(txn.date),
                      },
                      {
                        key: 'account',
                        label: 'Account',
                        render: (txn: UnifiedTransaction) => {
                          const account = accounts.find(acc => acc.id === txn.accountId);
                          return account ? account.name : txn.accountId;
                        },
                      },
                      {
                        key: 'source',
                        label: 'Source',
                        render: (txn: UnifiedTransaction) => {
                          const sourceLabels: Record<string, string> = {
                            'cash_transaction': 'Manual',
                            'visa_reload': 'Visa Reload',
                            'expense': 'Expense',
                            'payment': 'Payment',
                          };
                          return (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                              {sourceLabels[txn.source] || txn.source}
                            </span>
                          );
                        },
                      },
                      {
                        key: 'reference',
                        label: 'Reference',
                        render: (txn: UnifiedTransaction) => txn.reference || '-',
                      },
                      {
                        key: 'description',
                        label: 'Description',
                        render: (txn: UnifiedTransaction) => txn.description || '-',
                      },
                      {
                        key: 'amount',
                        label: 'Amount',
                        align: 'right',
                        render: (txn: UnifiedTransaction) => (
                          <span className="font-semibold">{txn.amount.toLocaleString()} {txn.currency}</span>
                        ),
                      },
                      {
                        key: 'type',
                        label: 'Type',
                        render: (txn: UnifiedTransaction) => (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              txn.type === 'inflow'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                            }`}
                          >
                            {txn.type === 'inflow' ? 'Inflow' : 'Outflow'}
                          </span>
                        ),
                      },
                    ]}
                    data={filteredTransactions}
                    isLoading={isLoading}
                    emptyMessage="No transactions found. Record a transaction to get started."
                    rowKey="id"
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Record Transaction Modal */}
      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title="Record Transaction">
        <form onSubmit={handleRecordTransaction} className="space-y-4">
          <Select
            label="Cash Account*"
            value={transactionForm.cashAccountId}
            onChange={e => setTransactionForm({ ...transactionForm, cashAccountId: e.target.value })}
            options={[
              { value: '', label: '-- Select Account --' },
              ...accounts
                .filter(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet' || acc.accountType === 'Cash')
                .map(acc => {
                  // Show bank name for Bank Accounts, wallet provider for Mobile Wallets, name for Cash
                  const displayName = acc.accountType === 'Bank Account' 
                    ? (acc.bankName || acc.name)
                    : acc.accountType === 'Mobile Wallet'
                    ? (acc.walletProvider || acc.name)
                    : acc.name;
                  // Get last 4 digits of account number or phone number (not applicable for Cash)
                  const last4Digits = acc.accountType === 'Bank Account' 
                    ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                    : acc.accountType === 'Mobile Wallet'
                    ? (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '')
                    : '';
                  const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
                  // For Cash accounts, just show the name without the extra formatting
                  const label = acc.accountType === 'Cash' 
                    ? acc.name
                    : `${acc.name} - ${displayName}${digitsDisplay}`;
                  return { 
                    value: acc.id, 
                    label: label
                  };
                }),
            ]}
            required
          />
          <Select
            label="Type"
            value={transactionForm.type}
            onChange={e => setTransactionForm({ ...transactionForm, type: e.target.value as CashTransaction['type'] })}
            options={[
              { label: 'Inflow', value: 'inflow' },
              { label: 'Outflow', value: 'outflow' },
            ]}
            required
          />
          <Input
            label="Reference"
            value={transactionForm.reference}
            onChange={e => setTransactionForm({ ...transactionForm, reference: e.target.value })}
          />
          <Input
            label="Amount"
            type="number"
            value={transactionForm.amount}
            onChange={e => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })}
            required
            min="0.01"
            step="0.01"
          />
          <Input
            label="Description"
            value={transactionForm.description}
            onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
            as="textarea"
            rows={3}
          />
          <Input
            label="Transaction Date"
            type="date"
            value={transactionForm.transactionDate}
            onChange={e => setTransactionForm({ ...transactionForm, transactionDate: e.target.value })}
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTransactionModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Transaction</Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Between Accounts Modal */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transfer Between Accounts" size="lg">
        <form onSubmit={handleTransfer} className="space-y-4">
          <Select
            label="From Account*"
            value={transferForm.fromAccountId}
            onChange={e => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
            options={accounts.map(acc => {
              const displayName = acc.accountType === 'Bank Account' 
                ? (acc.bankName || acc.name)
                : (acc.walletProvider || acc.name);
              const last4Digits = acc.accountType === 'Bank Account' 
                ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                : (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '');
              const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
              const labelText = acc.accountType === 'Cash' 
                ? `${acc.name}${digitsDisplay}`
                : `${acc.name} - ${displayName}${digitsDisplay}`;
              return { value: acc.id, label: labelText };
            })}
            required
          />
          <Select
            label="To Account*"
            value={transferForm.toAccountId}
            onChange={e => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
            options={accounts
              .filter(acc => acc.id !== transferForm.fromAccountId)
              .map(acc => {
                const displayName = acc.accountType === 'Bank Account' 
                  ? (acc.bankName || acc.name)
                  : (acc.walletProvider || acc.name);
                const last4Digits = acc.accountType === 'Bank Account' 
                  ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                  : (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '');
                const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
                const labelText = acc.accountType === 'Cash' 
                  ? `${acc.name}${digitsDisplay}`
                  : `${acc.name} - ${displayName}${digitsDisplay}`;
                return { value: acc.id, label: labelText };
              })}
            required
            disabled={!transferForm.fromAccountId}
          />
          <Input
            label="Transfer Amount (MMK)*"
            type="number"
            value={transferForm.amount}
            onChange={e => setTransferForm({ ...transferForm, amount: Number(e.target.value) })}
            required
            min="0.01"
            step="0.01"
          />
          <Input
            label="Service Fee/Cost (MMK)"
            type="number"
            value={transferForm.serviceFee}
            onChange={e => setTransferForm({ ...transferForm, serviceFee: Number(e.target.value) || 0 })}
            min="0"
            step="0.01"
            placeholder="Optional - e.g., bank transfer fee"
          />
          {transferForm.serviceFee > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Total deducted from source:</strong> {(transferForm.amount + transferForm.serviceFee).toLocaleString()} MMK
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                <strong>Amount received by destination:</strong> {transferForm.amount.toLocaleString()} MMK
              </p>
            </div>
          )}
          <Input
            label="Transaction Date*"
            type="date"
            value={transferForm.transactionDate}
            onChange={e => setTransferForm({ ...transferForm, transactionDate: e.target.value })}
            required
          />
          <Input
            label="Reference"
            value={transferForm.reference}
            onChange={e => setTransferForm({ ...transferForm, reference: e.target.value })}
            placeholder="Optional - e.g., Transfer reference number"
          />
          <Input
            label="Description"
            value={transferForm.description}
            onChange={e => setTransferForm({ ...transferForm, description: e.target.value })}
            as="textarea"
            rows={2}
            placeholder="Optional - e.g., Transfer from bank to mobile wallet"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
            <Button type="submit">Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* Reconcile Statement Modal */}
      <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Reconcile Statement">
        <form onSubmit={handleReconcile} className="space-y-4">
          <Select
            label="Cash Account*"
            value={reconcileForm.cashAccountId}
            onChange={e => setReconcileForm({ ...reconcileForm, cashAccountId: e.target.value })}
            options={accounts.map(acc => {
              // Show bank name for Bank Accounts, wallet provider for Mobile Wallets, or account name for Cash
              let displayName = acc.name;
              if (acc.accountType === 'Bank Account') {
                displayName = acc.bankName || acc.name;
              } else if (acc.accountType === 'Mobile Wallet') {
                displayName = acc.walletProvider || acc.name;
              }
              
              // Get last 4 digits of account number or phone number
              let last4Digits = '';
              if (acc.accountType === 'Bank Account' && acc.accountNumber) {
                last4Digits = acc.accountNumber.slice(-4);
              } else if (acc.accountType === 'Mobile Wallet' && acc.phoneNumber) {
                last4Digits = acc.phoneNumber.slice(-4);
              }
              
              const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
              const labelText = acc.accountType === 'Cash' 
                ? `${acc.name}${digitsDisplay}`
                : `${acc.name} - ${displayName}${digitsDisplay}`;
              
              return { 
                value: acc.id, 
                label: labelText
              };
            })}
            required
          />
          <Input
            label="Statement Balance"
            type="number"
            value={reconcileForm.statementBalance}
            onChange={e => setReconcileForm({ ...reconcileForm, statementBalance: Number(e.target.value) })}
            required
            step="0.01"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsReconcileModalOpen(false)}>Cancel</Button>
            <Button type="submit">Reconcile</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashManagementPage;
