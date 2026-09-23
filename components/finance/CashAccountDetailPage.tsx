import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CashAccount, CashTransaction, VisaReload, Expense, Payment } from '../../types';
import {
    apiGetCashAccounts,
    apiGetCashTransactions,
    apiGetVisaReloadsForPeriod,
    apiGetExpensesForPeriod,
    apiGetPaymentsForPeriod,
    apiUpdateCashAccount,
    apiDeleteCashAccount,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDateInYangonTimezone, getTodayInYangon, formatDateForDisplay, formatDatePartInYangon } from '../../utils/dateUtils';

type UnifiedTransaction = {
    id: string;
    date: string;
    type: 'inflow' | 'outflow';
    amount: number;
    currency: string;
    reference: string;
    description: string;
    source: 'cash_transaction' | 'visa_reload' | 'expense' | 'payment';
    originalId: string;
    relatedEntity?: string; // Card name, expense category, etc.
};

const CashAccountDetailPage: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();

    const [account, setAccount] = useState<CashAccount | null>(null);
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedTransaction[]>([]);
    const [visaReloads, setVisaReloads] = useState<VisaReload[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics'>('overview');
    
    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        accountType: 'Bank Account' as 'Bank Account' | 'Mobile Wallet',
        currency: 'MMK',
        bankName: '',
        accountNumber: '',
        walletProvider: '',
        phoneNumber: '',
        initialBalance: '',
        isActive: true,
        showInPublic: false,
    });

    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const today = new Date();
        const firstDay = getDateInYangonTimezone(new Date(today.getFullYear(), today.getMonth(), 1));
        const lastDay = getDateInYangonTimezone(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        setStartDate(firstDay);
        setEndDate(lastDay);
    }, []);

    const fetchData = useCallback(async () => {
        if (!accountId) return;
        
        setIsLoading(true);
        try {
            // Get date range for fetching transactions (last 12 months)
            const endDateStr = endDate || getTodayInYangon();
            const startDateStr = startDate || getDateInYangonTimezone(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));

            const [fetchedAccounts, fetchedTransactions, fetchedReloads, fetchedExpenses, fetchedPayments] = await Promise.all([
                apiGetCashAccounts(),
                apiGetCashTransactions(),
                apiGetVisaReloadsForPeriod(startDateStr, endDateStr),
                apiGetExpensesForPeriod(startDateStr, endDateStr),
                apiGetPaymentsForPeriod(startDateStr, endDateStr),
            ]);

            const foundAccount = fetchedAccounts.find(a => a.id === accountId);
            if (!foundAccount) {
                addNotification('Account not found.', 'error');
                navigate('/finance/cash');
                return;
            }

            setAccount(foundAccount);
            setTransactions(fetchedTransactions.filter(t => t.cashAccountId === accountId));
            setVisaReloads(fetchedReloads.filter(r => r.sourceAccountId === accountId));
            setExpenses(fetchedExpenses.filter(e => e.sourceAccountId === accountId));
            // Payments don't have sourceAccountId, so match by payment method name to account name
            setPayments(fetchedPayments.filter(payment => {
                const paymentMethodLower = payment.method.toLowerCase();
                const accountNameLower = foundAccount.name.toLowerCase();
                return paymentMethodLower.includes(accountNameLower) || 
                       accountNameLower.includes(paymentMethodLower) ||
                       (foundAccount.accountNumber && payment.transactionLast4Digits && 
                        foundAccount.accountNumber.endsWith(payment.transactionLast4Digits));
            }));

            // Build unified transactions
            const unified: UnifiedTransaction[] = [];

            // Cash Transactions
            fetchedTransactions
                .filter(t => t.cashAccountId === accountId)
                .forEach(txn => {
                    unified.push({
                        id: `cash_${txn.id}`,
                        date: txn.transactionDate,
                        type: txn.type,
                        amount: txn.amount,
                        currency: txn.currency || 'MMK',
                        reference: txn.reference || '',
                        description: txn.description || 'Cash Transaction',
                        source: 'cash_transaction',
                        originalId: txn.id,
                    });
                });

            // Visa Reloads (outflow)
            fetchedReloads
                .filter(r => r.sourceAccountId === accountId)
                .forEach(reload => {
                    unified.push({
                        id: `visa_${reload.id}`,
                        date: reload.reloadDate,
                        type: 'outflow',
                        amount: reload.amountMMK,
                        currency: 'MMK',
                        reference: `Visa Reload - ${reload.cardId}`,
                        description: 'Visa card reload',
                        source: 'visa_reload',
                        originalId: reload.id,
                        relatedEntity: reload.cardId,
                    });
                });

            // Expenses (outflow)
            fetchedExpenses
                .filter(e => e.sourceAccountId === accountId)
                .forEach(expense => {
                    unified.push({
                        id: `expense_${expense.id}`,
                        date: expense.expenseDate,
                        type: 'outflow',
                        amount: expense.amountMMK,
                        currency: 'MMK',
                        reference: expense.category || '',
                        description: expense.description || 'Expense',
                        source: 'expense',
                        originalId: expense.id,
                        relatedEntity: expense.category,
                    });
                });

            // Payments (inflow)
            fetchedPayments
                .filter(payment => {
                    if (payment.cashAccountId) {
                        return payment.cashAccountId === foundAccount.id;
                    }
                    const paymentMethodLower = payment.method.toLowerCase();
                    const accountNameLower = foundAccount.name.toLowerCase();
                    return paymentMethodLower.includes(accountNameLower) || 
                           accountNameLower.includes(paymentMethodLower) ||
                           (foundAccount.accountNumber && payment.transactionLast4Digits && 
                            foundAccount.accountNumber.endsWith(payment.transactionLast4Digits));
                })
                .forEach(payment => {
                    unified.push({
                        id: `payment_${payment.id}`,
                        date: payment.paymentDate,
                        type: 'inflow',
                        amount: payment.amountMMK || 0,
                        currency: 'MMK',
                        reference: payment.receiptNumber || '',
                        description: payment.remark || `Payment received - ${payment.method}`,
                        source: 'payment',
                        originalId: payment.id,
                    });
                });

            // Sort by date descending
            unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setUnifiedTransactions(unified);
        } catch (error) {
            console.error("Failed to load account data:", error);
            addNotification("Failed to load account data.", "error");
        }
        setIsLoading(false);
    }, [accountId, startDate, endDate, navigate, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenEditModal = () => {
        if (!account) return;
        setEditForm({
            name: account.name,
            accountType: account.accountType === 'Bank Account' ? 'Bank Account' : 'Mobile Wallet',
            currency: account.currency,
            bankName: account.bankName || '',
            accountNumber: account.accountNumber || '',
            walletProvider: account.walletProvider || '',
            phoneNumber: account.phoneNumber || '',
            initialBalance: (account.initialBalance || account.balance || 0).toString(),
            isActive: account.isActive,
            showInPublic: account.showInPublic || false,
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!account || !user) return;
        
        try {
            const initialBalanceValue = editForm.initialBalance ? parseFloat(editForm.initialBalance) : 0;
            if (isNaN(initialBalanceValue)) {
                addNotification("Initial balance must be a valid number.", "error");
                return;
            }
            
            await apiUpdateCashAccount(
                account.id,
                {
                    name: editForm.name,
                    accountType: editForm.accountType,
                    currency: editForm.currency,
                    bankName: editForm.accountType === 'Bank Account' ? editForm.bankName : undefined,
                    accountNumber: editForm.accountType === 'Bank Account' ? editForm.accountNumber : undefined,
                    walletProvider: editForm.accountType === 'Mobile Wallet' ? editForm.walletProvider : undefined,
                    phoneNumber: editForm.accountType === 'Mobile Wallet' ? editForm.phoneNumber : undefined,
                    initialBalance: initialBalanceValue,
                    isActive: editForm.isActive,
                    showInPublic: editForm.showInPublic,
                }
            );
            addNotification("Account updated successfully!", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addNotification(`Failed to update account: ${errorMessage}`, "error");
        }
    };

    const handleDeleteAccount = async () => {
        if (!account) return;
        
        const confirmed = await showConfirmation({
            title: 'Delete Account',
            message: `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmVariant: 'danger',
        });
        
        if (confirmed) {
            try {
                await apiDeleteCashAccount(account.id);
                addNotification("Account deleted successfully!", "success");
                navigate('/finance/cash');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                addNotification(`Failed to delete account: ${errorMessage}`, "error");
            }
        }
    };

    // Calculate statistics
    const accountStats = useMemo(() => {
        const filtered = unifiedTransactions.filter(t => {
            const inRange = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
            const matchesType = transactionTypeFilter === 'all' || t.type === transactionTypeFilter;
            const matchesSearch = !searchTerm || 
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.reference.toLowerCase().includes(searchTerm.toLowerCase());
            return inRange && matchesType && matchesSearch;
        });

        const totalInflow = filtered.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
        const totalOutflow = filtered.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
        const netFlow = totalInflow - totalOutflow;
        const transactionCount = filtered.length;

        return {
            totalInflow,
            totalOutflow,
            netFlow,
            transactionCount,
        };
    }, [unifiedTransactions, startDate, endDate, transactionTypeFilter, searchTerm]);

    // Prepare chart data (monthly balance trend)
    const chartData = useMemo(() => {
        if (!account) return [];
        
        const monthlyData: Record<string, { month: string; balance: number; inflow: number; outflow: number }> = {};
        
        unifiedTransactions.forEach(txn => {
            const date = new Date(txn.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = formatDatePartInYangon(date, { month: 'short', year: 'numeric' });
            
            if (!monthlyData[monthKey]) {
                // Calculate balance using formula: (initialBalance + totalInflow) - totalOutflow
                const calculatedBalance = ((account.initialBalance || 0) + (account.totalInflow || 0)) - (account.totalOutflow || 0);
                monthlyData[monthKey] = {
                    month: monthLabel,
                    balance: calculatedBalance,
                    inflow: 0,
                    outflow: 0,
                };
            }
            
            if (txn.type === 'inflow') {
                monthlyData[monthKey].inflow += txn.amount;
            } else {
                monthlyData[monthKey].outflow += txn.amount;
            }
        });

        // Calculate running balance starting from calculated balance
        // Formula: (initialBalance + totalInflow) - totalOutflow
        const calculatedBalance = ((account.initialBalance || 0) + (account.totalInflow || 0)) - (account.totalOutflow || 0);
        let runningBalance = calculatedBalance;
        const sortedMonths = Object.keys(monthlyData).sort();
        sortedMonths.forEach(monthKey => {
            const data = monthlyData[monthKey];
            runningBalance = runningBalance - data.inflow + data.outflow;
            data.balance = runningBalance;
        });

        return sortedMonths.map(key => monthlyData[key]);
    }, [unifiedTransactions, account]);

    // Filtered transactions
    const filteredTransactions = useMemo(() => {
        return unifiedTransactions.filter(t => {
            const inRange = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
            const matchesType = transactionTypeFilter === 'all' || t.type === transactionTypeFilter;
            const matchesSearch = !searchTerm || 
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.reference.toLowerCase().includes(searchTerm.toLowerCase());
            return inRange && matchesType && matchesSearch;
        });
    }, [unifiedTransactions, startDate, endDate, transactionTypeFilter, searchTerm]);

    const formatDate = (dateString: string) => formatDateForDisplay(dateString);
    const formatCurrency = (amount: number, currency: string = 'MMK') => `${amount.toLocaleString()} ${currency}`;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!account) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <p className="text-text-secondary dark:text-slate-400 mb-4">Account not found.</p>
                    <Link to="/finance/cash">
                        <Button variant="primary">Back to Cash & Treasury</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const canManage = hasPermission('MANAGE_TREASURY' as any);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/finance/cash">
                        <Button variant="ghost" size="sm">← Back</Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">
                            {account.name}
                        </h1>
                        <p className="text-text-secondary dark:text-slate-400 mt-1">
                            {account.accountType} • {account.currency}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {canManage && (
                        <>
                            <Button variant="secondary" onClick={handleOpenEditModal}>
                                Edit Account
                            </Button>
                            <Button variant="danger" onClick={handleDeleteAccount}>
                                Delete Account
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-container-bg dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary dark:text-slate-400">Current Balance</div>
                    <div className="text-2xl font-bold mt-1 text-text-primary dark:text-slate-200">
                        {formatCurrency(
                            // Calculate balance using formula: (initialBalance + totalInflow) - totalOutflow
                            ((account.initialBalance || 0) + (account.totalInflow || 0)) - (account.totalOutflow || 0),
                            account.currency
                        )}
                    </div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary dark:text-slate-400">Total Inflow</div>
                    <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                        {formatCurrency(accountStats.totalInflow, account.currency)}
                    </div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary dark:text-slate-400">Total Outflow</div>
                    <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                        {formatCurrency(accountStats.totalOutflow, account.currency)}
                    </div>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-text-secondary dark:text-slate-400">Transactions</div>
                    <div className="text-2xl font-bold mt-1 text-text-primary dark:text-slate-200">
                        {accountStats.transactionCount}
                    </div>
                </div>
            </div>

            {/* Account Information */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg p-6 shadow mb-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold mb-4 text-text-primary dark:text-slate-100">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-text-secondary dark:text-slate-400">Account Type</div>
                        <div className="font-medium text-text-primary dark:text-slate-200">{account.accountType}</div>
                    </div>
                    <div>
                        <div className="text-sm text-text-secondary dark:text-slate-400">Currency</div>
                        <div className="font-medium text-text-primary dark:text-slate-200">{account.currency}</div>
                    </div>
                    {account.bankName && (
                        <div>
                            <div className="text-sm text-text-secondary dark:text-slate-400">Bank Name</div>
                            <div className="font-medium text-text-primary dark:text-slate-200">{account.bankName}</div>
                        </div>
                    )}
                    {account.accountNumber && (
                        <div>
                            <div className="text-sm text-text-secondary dark:text-slate-400">Account Number</div>
                            <div className="font-medium text-text-primary dark:text-slate-200">{account.accountNumber}</div>
                        </div>
                    )}
                    {account.walletProvider && (
                        <div>
                            <div className="text-sm text-text-secondary dark:text-slate-400">Wallet Provider</div>
                            <div className="font-medium text-text-primary dark:text-slate-200">{account.walletProvider}</div>
                        </div>
                    )}
                    {account.phoneNumber && (
                        <div>
                            <div className="text-sm text-text-secondary dark:text-slate-400">Phone Number</div>
                            <div className="font-medium text-text-primary dark:text-slate-200">{account.phoneNumber}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-sm text-text-secondary dark:text-slate-400">Status</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            account.isActive 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                        }`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div>
                        <div className="text-sm text-text-secondary dark:text-slate-400">Public Visibility</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            account.showInPublic 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-300'
                        }`}>
                            {account.showInPublic ? 'Public' : 'Private'}
                        </span>
                    </div>
                    {account.lastActivityDate && (
                        <div>
                            <div className="text-sm text-text-secondary dark:text-slate-400">Last Activity</div>
                            <div className="font-medium text-text-primary dark:text-slate-200">
                                {formatDate(account.lastActivityDate)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow mb-6 border border-slate-200 dark:border-slate-700">
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        {(['overview', 'transactions', 'analytics'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab
                                        ? 'border-primary-action text-primary-action'
                                        : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Transaction Summary */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-text-primary dark:text-slate-100">Transaction Summary</h3>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary dark:text-slate-400">Total Inflow</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">
                                            {formatCurrency(accountStats.totalInflow, account.currency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary dark:text-slate-400">Total Outflow</span>
                                        <span className="font-medium text-red-600 dark:text-red-400">
                                            {formatCurrency(accountStats.totalOutflow, account.currency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-semibold text-text-primary dark:text-slate-200">Net Flow</span>
                                        <span className={`font-semibold ${
                                            accountStats.netFlow >= 0 
                                                ? 'text-green-600 dark:text-green-400' 
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {formatCurrency(accountStats.netFlow, account.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-text-primary dark:text-slate-100">Recent Transactions</h3>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Description</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                            {filteredTransactions.slice(0, 10).map(txn => (
                                                <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200">
                                                        {formatDate(txn.date)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                            txn.type === 'inflow'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                        }`}>
                                                            {txn.type === 'inflow' ? 'Inflow' : 'Outflow'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                                        {txn.description}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm text-right font-semibold ${
                                                        txn.type === 'inflow'
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {txn.type === 'inflow' ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredTransactions.length === 0 && (
                                        <div className="px-4 py-8 text-center text-text-secondary dark:text-slate-400">
                                            No transactions found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Transactions Tab */}
                    {activeTab === 'transactions' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                    <Input
                                        label="Search"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search transactions..."
                                        containerClassName="lg:col-span-2 mb-0"
                                    />
                                    <Input
                                        label="Start Date"
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        containerClassName="mb-0"
                                    />
                                    <Input
                                        label="End Date"
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        containerClassName="mb-0"
                                    />
                                    <Select
                                        label="Type"
                                        value={transactionTypeFilter}
                                        onChange={e => setTransactionTypeFilter(e.target.value as 'all' | 'inflow' | 'outflow')}
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
                            <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Source</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Reference</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                        {filteredTransactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200">
                                                    {formatDate(txn.date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                        txn.type === 'inflow'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                    }`}>
                                                        {txn.type === 'inflow' ? 'Inflow' : 'Outflow'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                                    {txn.source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                                    {txn.description}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                                    {txn.reference || '-'}
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-right font-semibold ${
                                                    txn.type === 'inflow'
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {txn.type === 'inflow' ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredTransactions.length === 0 && (
                                    <div className="px-4 py-8 text-center text-text-secondary dark:text-slate-400">
                                        No transactions found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6">
                            {/* Balance Trend Chart */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-text-primary dark:text-slate-100">Balance Trend</h3>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                                <XAxis 
                                                    dataKey="month" 
                                                    stroke="#64748b" 
                                                    className="dark:stroke-slate-400 dark:fill-slate-400"
                                                    tick={{ fill: '#64748b' }}
                                                />
                                                <YAxis 
                                                    stroke="#64748b" 
                                                    className="dark:stroke-slate-400 dark:fill-slate-400"
                                                    tick={{ fill: '#64748b' }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px'
                                                    }}
                                                    className="dark:bg-slate-800 dark:border-slate-700"
                                                />
                                                <Legend />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="balance" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth={2}
                                                    name="Balance"
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="inflow" 
                                                    stroke="#10b981" 
                                                    strokeWidth={2}
                                                    name="Inflow"
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="outflow" 
                                                    stroke="#ef4444" 
                                                    strokeWidth={2}
                                                    name="Outflow"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-12 text-text-secondary dark:text-slate-400">
                                            No data available for chart
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Transaction Breakdown by Source */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-text-primary dark:text-slate-100">Transaction Breakdown by Source</h3>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="space-y-2">
                                        {['cash_transaction', 'visa_reload', 'expense', 'payment'].map(source => {
                                            const sourceTransactions = filteredTransactions.filter(t => t.source === source);
                                            const sourceTotal = sourceTransactions.reduce((sum, t) => sum + t.amount, 0);
                                            const sourceCount = sourceTransactions.length;
                                            
                                            if (sourceCount === 0) return null;
                                            
                                            return (
                                                <div key={source} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                                    <div>
                                                        <div className="font-medium text-text-primary dark:text-slate-200">
                                                            {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </div>
                                                        <div className="text-sm text-text-secondary dark:text-slate-400">
                                                            {sourceCount} transaction{sourceCount !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-text-primary dark:text-slate-200">
                                                            {formatCurrency(sourceTotal, account.currency)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Account Modal */}
            {isEditModalOpen && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit Account"
                >
                    <div className="space-y-4">
                        <Input
                            label="Account Name *"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        />
                        <Select
                            label="Account Type *"
                            value={editForm.accountType}
                            onChange={e => setEditForm({ ...editForm, accountType: e.target.value as 'Bank Account' | 'Mobile Wallet' })}
                            options={[
                                { value: 'Bank Account', label: 'Bank Account' },
                                { value: 'Mobile Wallet', label: 'Mobile Wallet' },
                            ]}
                        />
                        <Select
                            label="Currency *"
                            value={editForm.currency}
                            onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                            options={[
                                { value: 'MMK', label: 'MMK' },
                                { value: 'USD', label: 'USD' },
                            ]}
                        />
                        {editForm.accountType === 'Bank Account' && (
                            <>
                                <Input
                                    label="Bank Name"
                                    value={editForm.bankName}
                                    onChange={e => setEditForm({ ...editForm, bankName: e.target.value })}
                                />
                                <Input
                                    label="Account Number"
                                    value={editForm.accountNumber}
                                    onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })}
                                />
                            </>
                        )}
                        {editForm.accountType === 'Mobile Wallet' && (
                            <>
                                <Input
                                    label="Wallet Provider"
                                    value={editForm.walletProvider}
                                    onChange={e => setEditForm({ ...editForm, walletProvider: e.target.value })}
                                />
                                <Input
                                    label="Phone Number"
                                    value={editForm.phoneNumber}
                                    onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                />
                            </>
                        )}
                        <Input
                            label="Initial Balance"
                            type="number"
                            value={editForm.initialBalance}
                            onChange={e => setEditForm({ ...editForm, initialBalance: e.target.value })}
                            placeholder="0"
                            helpText="Set the initial/starting balance for this account"
                        />
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editForm.isActive}
                                    onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm text-text-secondary dark:text-slate-400">Active</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editForm.showInPublic}
                                    onChange={e => setEditForm({ ...editForm, showInPublic: e.target.checked })}
                                    className="rounded"
                                />
                                <span className="text-sm text-text-secondary dark:text-slate-400">Show in Public</span>
                            </label>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveEdit}>Save Changes</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CashAccountDetailPage;















