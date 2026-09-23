import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  apiGetClients,
  apiGetBusinesses,
  apiGetPayments,
  apiGetBadDebts,
  apiWriteOffBadDebt,
  apiRecoverBadDebt,
  apiGetAllowanceForDoubtfulDebts,
  apiCalculateDoubtfulDebtProvision,
  apiCreateAllowanceProvision,
  apiGetLatestAllowanceBalance,
  apiGetDailyExchangeRates,
  apiGetUsers,
} from '../../services/api';
import { Client, Business, Payment, BadDebt, BadDebtStatus, AllowanceForDoubtfulDebts, DailyExchangeRate, User } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { useFinanceDataMultiple } from '../../hooks/useFinanceData';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import FinancePageHeader from './shared/FinancePageHeader';
import FinanceTable from './shared/FinanceTable';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Link } from 'react-router-dom';
import SearchableSelect from '../ui/SearchableSelect';
import { getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';

interface OutstandingItem {
  id: string;
  clientId?: string;
  clientName?: string;
  businessId?: string;
  businessName?: string;
  balance: number;
  daysSinceLastPayment: number;
  lastPaymentDate?: string;
}

export type BadDebtTab = 'badDebts' | 'allowance';

interface BadDebtManagementPageProps {
  /** When true, hide page header and sidebar (used inside Receivables & Bad Debts unified page) */
  embedded?: boolean;
  /** When set, overrides internal tab (used when embedded) */
  forcedTab?: BadDebtTab;
}

const BadDebtManagementPage: React.FC<BadDebtManagementPageProps> = ({ embedded = false, forcedTab }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('badDebtSidebarCollapsed');
  const [activeTab, setActiveTab] = useState<BadDebtTab>('badDebts');
  const effectiveTab = embedded && forcedTab !== undefined ? forcedTab : activeTab;
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OutstandingItem | null>(null);
  const [selectedBadDebt, setSelectedBadDebt] = useState<BadDebt | null>(null);
  
  // Form states
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffUsdAmount, setWriteOffUsdAmount] = useState('');
  const [writeOffExchangeRate, setWriteOffExchangeRate] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffDate, setWriteOffDate] = useState(getTodayInYangon());
  const [writeOffResponsiblePersonUserId, setWriteOffResponsiblePersonUserId] = useState('');
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryDate, setRecoveryDate] = useState(getTodayInYangon());
  const [provisionAmount, setProvisionAmount] = useState('');
  const [provisionNotes, setProvisionNotes] = useState('');
  const [provisionDate, setProvisionDate] = useState(getTodayInYangon());
  const [provisionClientId, setProvisionClientId] = useState('');
  const [provisionBusinessId, setProvisionBusinessId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionCalculation, setProvisionCalculation] = useState<{
    totalReceivables: number;
    suggestedProvision: number;
    breakdown: Array<{ bracket: string; amount: number; provision: number }>;
  } | null>(null);

  // Data fetching
  const { data, isLoading, refetch } = useFinanceDataMultiple({
    clients: apiGetClients,
    businesses: apiGetBusinesses,
    payments: apiGetPayments,
    badDebts: apiGetBadDebts,
    allowances: apiGetAllowanceForDoubtfulDebts,
    dailyExchangeRates: apiGetDailyExchangeRates,
    users: apiGetUsers,
  });

  const clients = (data.clients as Client[]) || [];
  const businesses = (data.businesses as Business[]) || [];
  const payments = (data.payments as Payment[]) || [];
  const badDebts = (data.badDebts as BadDebt[]) || [];
  const allowances = (data.allowances as AllowanceForDoubtfulDebts[]) || [];
  const dailyExchangeRates = (data.dailyExchangeRates as DailyExchangeRate[]) || [];
  const users = (data.users as User[]) || [];
  const latestExchangeRate = dailyExchangeRates.length > 0 ? dailyExchangeRates[0].rate : null;

  // Client/business options for provision modal (must be after clients, businesses)
  const provisionBusinessOptions = useMemo(() => {
    const all = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    if (provisionClientId) {
      const client = clients.find(c => c.id === provisionClientId);
      if (client?.linkedBusinessIds?.length) {
        const linked = all.filter(o => client.linkedBusinessIds!.includes(o.value));
        const rest = all.filter(o => !client.linkedBusinessIds!.includes(o.value));
        return [...linked, ...rest];
      }
    }
    return all;
  }, [businesses, provisionClientId, clients]);

  const provisionClientOptions = useMemo(() => {
    const all = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    if (provisionBusinessId) {
      const biz = businesses.find(b => b.id === provisionBusinessId);
      if (biz?.linkedClientIds?.length) {
        const linked = all.filter(o => biz.linkedClientIds!.includes(o.value));
        const rest = all.filter(o => !biz.linkedClientIds!.includes(o.value));
        return [...linked, ...rest];
      }
    }
    return all;
  }, [clients, provisionBusinessId, businesses]);

  // Calculate outstanding items with aging
  const outstandingItems = useMemo((): OutstandingItem[] => {
    const result: OutstandingItem[] = [];
    const now = Date.now();

    // Process clients
    clients.forEach(client => {
      const balance = client.balance ?? 0;
      if (balance <= 0) return;

      const clientPayments = payments.filter(p => p.clientId === client.id);
      const lastPaymentDate = clientPayments.length > 0
        ? Math.max(...clientPayments.map(p => new Date(p.paymentDate).getTime()))
        : new Date(client.createdAt || now).getTime();
      
      const daysSinceLastPayment = Math.floor((now - lastPaymentDate) / (1000 * 60 * 60 * 24));

      result.push({
        id: `client-${client.id}`,
        clientId: client.id,
        clientName: client.name,
        balance,
        daysSinceLastPayment,
        lastPaymentDate: getDateInYangonTimezone(new Date(lastPaymentDate)),
      });
    });

    // Process businesses
    businesses.forEach(business => {
      const balance = business.balance ?? 0;
      if (balance <= 0) return;

      const businessPayments = payments.filter(p => p.businessId === business.id);
      const lastPaymentDate = businessPayments.length > 0
        ? Math.max(...businessPayments.map(p => new Date(p.paymentDate).getTime()))
        : new Date(business.createdAt || now).getTime();
      
      const daysSinceLastPayment = Math.floor((now - lastPaymentDate) / (1000 * 60 * 60 * 24));

      // Check if already counted via client
      const linkedClientId = business.linkedClientIds?.[0];
      if (linkedClientId) {
        const existingClient = result.find(r => r.clientId === linkedClientId);
        if (existingClient) return; // Skip if already counted
      }

      result.push({
        id: `business-${business.id}`,
        businessId: business.id,
        businessName: business.name,
        balance,
        daysSinceLastPayment,
        lastPaymentDate: getDateInYangonTimezone(new Date(lastPaymentDate)),
      });
    });

    return result.sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment);
  }, [clients, businesses, payments]);

  // Filter outstanding items
  const filteredOutstanding = useMemo(() => {
    if (!searchTerm) return outstandingItems;
    const term = searchTerm.toLowerCase();
    return outstandingItems.filter(item =>
      (item.clientName?.toLowerCase().includes(term)) ||
      (item.businessName?.toLowerCase().includes(term)) ||
      (item.clientId?.toLowerCase().includes(term)) ||
      (item.businessId?.toLowerCase().includes(term))
    );
  }, [outstandingItems, searchTerm]);

  // Filter bad debts
  const filteredBadDebts = useMemo(() => {
    if (!searchTerm) return badDebts;
    const term = searchTerm.toLowerCase();
    return badDebts.filter(bd =>
      (bd.clientId?.toLowerCase().includes(term)) ||
      (bd.businessId?.toLowerCase().includes(term)) ||
      (bd.reason?.toLowerCase().includes(term))
    );
  }, [badDebts, searchTerm]);

  // Summary stats
  const totalOutstanding = useMemo(() => 
    outstandingItems.reduce((sum, item) => sum + item.balance, 0), [outstandingItems]);
  
  const totalBadDebts = useMemo(() => 
    badDebts.reduce((sum, bd) => sum + bd.writtenOffAmount, 0), [badDebts]);
  
  const totalRecovered = useMemo(() => 
    badDebts.reduce((sum, bd) => sum + bd.recoveredAmount, 0), [badDebts]);
  
  const currentAllowanceBalance = useMemo(() => 
    allowances.length > 0 ? allowances[0].currentBalance : 0, [allowances]);

  // Handlers
  const handleOpenWriteOff = (item: OutstandingItem) => {
    setSelectedItem(item);
    const defaultRate = latestExchangeRate ? latestExchangeRate.toString() : '';
    const defaultUsd = latestExchangeRate ? (item.balance / latestExchangeRate).toFixed(2) : '';
    const computedMMK = latestExchangeRate ? (Number(defaultUsd) * latestExchangeRate).toFixed(0) : item.balance.toString();
    setWriteOffExchangeRate(defaultRate);
    setWriteOffUsdAmount(defaultUsd);
    setWriteOffAmount(computedMMK);
    setWriteOffReason('');
    setWriteOffDate(getTodayInYangon());
    setShowWriteOffModal(true);
  };

  useEffect(() => {
    const usd = parseFloat(writeOffUsdAmount);
    const rate = parseFloat(writeOffExchangeRate);
    if (!Number.isNaN(usd) && !Number.isNaN(rate) && usd >= 0 && rate > 0) {
      setWriteOffAmount((usd * rate).toFixed(0));
    }
  }, [writeOffUsdAmount, writeOffExchangeRate]);

  const handleWriteOff = async () => {
    if (!selectedItem || !user) return;

    const usdAmount = parseFloat(writeOffUsdAmount);
    const exchangeRate = parseFloat(writeOffExchangeRate);
    const amount = parseFloat(writeOffAmount);
    if (Number.isNaN(usdAmount) || usdAmount <= 0) {
      addNotification('Please enter a valid USD amount', 'error');
      return;
    }
    if (Number.isNaN(exchangeRate) || exchangeRate <= 0) {
      addNotification('Please enter a valid exchange rate', 'error');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      addNotification('Please enter a valid MMK amount', 'error');
      return;
    }
    if (!writeOffReason.trim()) {
      addNotification('Please enter a reason for write-off', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiWriteOffBadDebt({
        clientId: selectedItem.clientId,
        businessId: selectedItem.businessId,
        amount,
        usdAmount,
        exchangeRate,
        reason: writeOffReason,
        writeOffDate,
        ...(writeOffResponsiblePersonUserId && { responsiblePersonUserId: writeOffResponsiblePersonUserId }),
      }, user.id);
      
      addNotification('Bad debt written off successfully', 'success');
      setShowWriteOffModal(false);
      refetch();
    } catch (error) {
      addNotification(`Failed to write off: ${(error as Error).message}`, 'error');
    }
    setIsSubmitting(false);
  };

  const handleOpenRecovery = (badDebt: BadDebt) => {
    setSelectedBadDebt(badDebt);
    setRecoveryAmount('');
    setRecoveryDate(getTodayInYangon());
    setShowRecoveryModal(true);
  };

  const handleRecovery = async () => {
    if (!selectedBadDebt || !user) return;
    
    const amount = parseFloat(recoveryAmount);
    if (isNaN(amount) || amount <= 0) {
      addNotification('Please enter a valid recovery amount', 'error');
      return;
    }
    const maxRecoverable = selectedBadDebt.writtenOffAmount - selectedBadDebt.recoveredAmount;
    if (amount > maxRecoverable) {
      addNotification(`Maximum recoverable amount is ${maxRecoverable.toLocaleString()} MMK`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRecoverBadDebt(selectedBadDebt.id, {
        recoveryAmount: amount,
        recoveryDate,
      }, user.id);
      
      addNotification('Bad debt recovery recorded successfully', 'success');
      setShowRecoveryModal(false);
      refetch();
    } catch (error) {
      addNotification(`Failed to record recovery: ${(error as Error).message}`, 'error');
    }
    setIsSubmitting(false);
  };

  const handleCalculateProvision = useCallback(async (clientId?: string, businessId?: string) => {
    try {
      const options = clientId && businessId ? { clientId, businessId } : undefined;
      const calculation = await apiCalculateDoubtfulDebtProvision(undefined, options);
      setProvisionCalculation(calculation);
      setProvisionAmount(calculation.suggestedProvision.toFixed(0));
    } catch (error) {
      addNotification(`Failed to calculate provision: ${(error as Error).message}`, 'error');
    }
  }, [addNotification]);

  // Auto-link client when business changes, and vice versa (like AddSaleModal)
  useEffect(() => {
    if (!showProvisionModal) return;
    if (provisionClientId && businesses.length && clients.length) {
      const client = clients.find(c => c.id === provisionClientId);
      if (client?.linkedBusinessIds?.length) {
        const first = client.linkedBusinessIds[0];
        if (businesses.some(b => b.id === first) && provisionBusinessId !== first) {
          setProvisionBusinessId(first);
        }
      } else if (provisionBusinessId) setProvisionBusinessId('');
    }
  }, [provisionClientId, clients, businesses, showProvisionModal]);

  useEffect(() => {
    if (!showProvisionModal) return;
    if (provisionBusinessId && businesses.length && clients.length) {
      const biz = businesses.find(b => b.id === provisionBusinessId);
      if (biz?.linkedClientIds?.length) {
        const first = biz.linkedClientIds[0];
        if (clients.some(c => c.id === first) && provisionClientId !== first) {
          setProvisionClientId(first);
        }
      } else if (provisionClientId) setProvisionClientId('');
    }
  }, [provisionBusinessId, businesses, clients, showProvisionModal]);

  // Recalculate provision when modal opens or client/business selection changes
  useEffect(() => {
    if (!showProvisionModal) return;
    if (provisionClientId && provisionBusinessId) {
      handleCalculateProvision(provisionClientId, provisionBusinessId);
    } else {
      handleCalculateProvision();
    }
  }, [showProvisionModal, provisionClientId, provisionBusinessId, handleCalculateProvision]);

  const handleOpenProvision = () => {
    setProvisionDate(getTodayInYangon());
    setProvisionNotes('');
    setProvisionClientId('');
    setProvisionBusinessId('');
    setProvisionCalculation(null);
    setShowProvisionModal(true);
    // Recalculation triggered by useEffect when modal opens
  };

  const handleCreateProvision = async () => {
    if (!user || !provisionCalculation) return;
    
    const amount = parseFloat(provisionAmount);
    if (isNaN(amount) || amount < 0) {
      addNotification('Please enter a valid provision amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const percentage = provisionCalculation.totalReceivables > 0
        ? (amount / provisionCalculation.totalReceivables) * 100
        : 0;
        
      await apiCreateAllowanceProvision({
        provisionDate,
        provisionAmount: amount,
        provisionPercentage: percentage,
        totalReceivables: provisionCalculation.totalReceivables,
        notes: provisionNotes,
        ...(provisionClientId && { clientId: provisionClientId }),
        ...(provisionBusinessId && { businessId: provisionBusinessId }),
      }, user.id);
      
      addNotification('Allowance provision created successfully', 'success');
      setShowProvisionModal(false);
      refetch();
    } catch (error) {
      addNotification(`Failed to create provision: ${(error as Error).message}`, 'error');
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: BadDebtStatus) => {
    const colors = {
      [BadDebtStatus.WRITTEN_OFF]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      [BadDebtStatus.RECOVERED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      [BadDebtStatus.PARTIALLY_RECOVERED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const getAgingBadge = (days: number) => {
    if (days >= 365) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Over 1 year</span>;
    if (days >= 180) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">6+ months</span>;
    if (days >= 90) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">3+ months</span>;
    if (days >= 30) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">1+ month</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Current</span>;
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <FinancePageHeader
          title="Bad Debt Management"
          description="Manage bad debts, write-offs, recoveries, and allowance for doubtful debts."
        />
      )}

      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        {!embedded && (
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Bad Debt</h2>}
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
            {[
              { id: 'badDebts', label: 'Bad Debts', icon: '❌' },
              { id: 'allowance', label: 'Allowance (AFDD)', icon: '📈' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as BadDebtTab)}
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
        )}

        <main className="flex-1">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                <p className="text-sm text-text-secondary">Total Outstanding</p>
                <p className="text-2xl font-bold text-primary-action">{totalOutstanding.toLocaleString()} MMK</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                <p className="text-sm text-text-secondary">Total Bad Debts</p>
                <p className="text-2xl font-bold text-status-danger">{totalBadDebts.toLocaleString()} MMK</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                <p className="text-sm text-text-secondary">Total Recovered</p>
                <p className="text-2xl font-bold text-status-success">{totalRecovered.toLocaleString()} MMK</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                <p className="text-sm text-text-secondary">Allowance Balance</p>
                <p className="text-2xl font-bold text-status-warning">{currentAllowanceBalance.toLocaleString()} MMK</p>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
              <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
                <Input
                  label="Search"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  containerClassName="flex-1 mb-0"
                />
                {effectiveTab === 'allowance' && (
                  <Button variant="primary" onClick={handleOpenProvision}>
                    Create Provision
                  </Button>
                )}
              </div>
            </div>

            {/* Bad Debts Tab */}
            {effectiveTab === 'badDebts' && (
              <FinanceTable
                columns={[
                  {
                    key: 'entity',
                    label: 'Client / Business',
                    render: (item: BadDebt) => {
                      const client = clients.find(c => c.id === item.clientId);
                      const business = businesses.find(b => b.id === item.businessId);
                      return (
                        <div>
                          {client && <span className="font-medium">{client.name}</span>}
                          {business && <span className="font-medium">{business.name}</span>}
                          {!client && !business && <span className="text-text-secondary">Unknown</span>}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'amount',
                    label: 'Written Off',
                    align: 'right',
                    render: (item: BadDebt) => (
                      <span className="font-semibold text-status-danger">{item.writtenOffAmount.toLocaleString()} MMK</span>
                    ),
                  },
                  {
                    key: 'recovered',
                    label: 'Recovered',
                    align: 'right',
                    render: (item: BadDebt) => (
                      <span className="font-semibold text-status-success">{item.recoveredAmount.toLocaleString()} MMK</span>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (item: BadDebt) => getStatusBadge(item.status),
                  },
                  {
                    key: 'responsible',
                    label: 'Responsible Person',
                    render: (item: BadDebt) => {
                      const responsible = item.responsiblePersonUserId ? users.find(u => u.id === item.responsiblePersonUserId) : null;
                      return responsible ? (
                        <Link to={`/hr/staff/${item.responsiblePersonUserId}`} className="text-primary-action hover:underline">
                          {responsible.name || responsible.email || item.responsiblePersonUserId}
                        </Link>
                      ) : <span className="text-text-secondary">—</span>;
                    },
                  },
                  {
                    key: 'reason',
                    label: 'Reason',
                    render: (item: BadDebt) => (
                      <span className="text-text-secondary text-sm truncate max-w-[200px] block" title={item.reason}>
                        {item.reason}
                      </span>
                    ),
                  },
                  {
                    key: 'date',
                    label: 'Write-off Date',
                    render: (item: BadDebt) => <span className="text-text-secondary">{item.writeOffDate}</span>,
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    align: 'center',
                    render: (item: BadDebt) => (
                      item.status !== BadDebtStatus.RECOVERED && (
                        <Button variant="success" size="sm" onClick={() => handleOpenRecovery(item)}>
                          Record Recovery
                        </Button>
                      )
                    ),
                  },
                ]}
                data={filteredBadDebts}
                isLoading={isLoading}
                emptyMessage="No bad debts recorded."
                rowKey={(item) => item.id}
              />
            )}

            {/* Allowance Tab */}
            {effectiveTab === 'allowance' && (
              <FinanceTable
                columns={[
                  {
                    key: 'period',
                    label: 'Period',
                    render: (item: AllowanceForDoubtfulDebts) => (
                      <span className="font-medium">{item.period}</span>
                    ),
                  },
                  {
                    key: 'totalReceivables',
                    label: 'Total Receivables',
                    align: 'right',
                    render: (item: AllowanceForDoubtfulDebts) => (
                      <span>{item.totalReceivables.toLocaleString()} MMK</span>
                    ),
                  },
                  {
                    key: 'percentage',
                    label: 'Provision %',
                    align: 'right',
                    render: (item: AllowanceForDoubtfulDebts) => (
                      <span>{item.provisionPercentage.toFixed(2)}%</span>
                    ),
                  },
                  {
                    key: 'adjustment',
                    label: 'Adjustment',
                    align: 'right',
                    render: (item: AllowanceForDoubtfulDebts) => (
                      <span className={item.adjustmentAmount >= 0 ? 'text-status-danger' : 'text-status-success'}>
                        {item.adjustmentAmount >= 0 ? '+' : ''}{item.adjustmentAmount.toLocaleString()} MMK
                      </span>
                    ),
                  },
                  {
                    key: 'balance',
                    label: 'Allowance Balance',
                    align: 'right',
                    render: (item: AllowanceForDoubtfulDebts) => (
                      <span className="font-semibold text-status-warning">{item.currentBalance.toLocaleString()} MMK</span>
                    ),
                  },
                  {
                    key: 'date',
                    label: 'Date',
                    render: (item: AllowanceForDoubtfulDebts) => <span className="text-text-secondary">{item.provisionDate}</span>,
                  },
                  {
                    key: 'notes',
                    label: 'Notes',
                    render: (item: AllowanceForDoubtfulDebts) => (
                      <span className="text-text-secondary text-sm truncate max-w-[200px] block" title={item.notes}>
                        {item.notes || '-'}
                      </span>
                    ),
                  },
                ]}
                data={allowances}
                isLoading={isLoading}
                emptyMessage="No allowance provisions recorded. Create one to start tracking doubtful debts."
                rowKey={(item) => item.id}
              />
            )}
          </div>
        </main>
      </div>

      {/* Write-Off Modal */}
      <Modal isOpen={showWriteOffModal} onClose={() => { setShowWriteOffModal(false); setWriteOffResponsiblePersonUserId(''); }} title="Write Off Bad Debt">
        <div className="space-y-4">
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-text-secondary">Writing off for:</p>
            <p className="font-semibold">{selectedItem?.clientName || selectedItem?.businessName}</p>
            <p className="text-sm text-text-secondary">Outstanding Balance: {selectedItem?.balance.toLocaleString()} MMK</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Write-Off Amount (USD)"
              type="number"
              value={writeOffUsdAmount}
              onChange={(e) => setWriteOffUsdAmount(e.target.value)}
              placeholder="Enter USD amount"
            />
            <Input
              label="Exchange Rate (MMK/USD)"
              type="number"
              value={writeOffExchangeRate}
              onChange={(e) => setWriteOffExchangeRate(e.target.value)}
              placeholder={latestExchangeRate ? `Latest: ${latestExchangeRate}` : 'Enter exchange rate'}
            />
          </div>
          <Input
            label="Write-Off Amount (MMK) = USD x Rate"
            type="number"
            value={writeOffAmount}
            onChange={() => {}}
            disabled
          />
          
          <Input
            label="Write-Off Date"
            type="date"
            value={writeOffDate}
            onChange={(e) => setWriteOffDate(e.target.value)}
          />

          <SearchableSelect
            label="Responsible Person (Optional)"
            value={writeOffResponsiblePersonUserId}
            onChange={(value) => setWriteOffResponsiblePersonUserId(String(value))}
            options={[{ value: '', label: '-- None --' }, ...users.map(u => ({ value: u.id, label: u.name || u.email || u.id }))]}
            placeholder="Search & Select Employee"
            containerClassName="mb-4"
          />
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Reason for Write-Off *</label>
            <textarea
              value={writeOffReason}
              onChange={(e) => setWriteOffReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-text-primary dark:text-slate-200"
              rows={3}
              placeholder="Enter reason for writing off this debt..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowWriteOffModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleWriteOff} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Write Off'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Recovery Modal */}
      <Modal isOpen={showRecoveryModal} onClose={() => setShowRecoveryModal(false)} title="Record Bad Debt Recovery">
        <div className="space-y-4">
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-text-secondary">Original Write-Off:</p>
            <p className="font-semibold text-status-danger">{selectedBadDebt?.writtenOffAmount.toLocaleString()} MMK</p>
            <p className="text-sm text-text-secondary">Already Recovered: <span className="text-status-success">{selectedBadDebt?.recoveredAmount.toLocaleString()} MMK</span></p>
            <p className="text-sm text-text-secondary">Remaining: <span className="font-medium">{((selectedBadDebt?.writtenOffAmount || 0) - (selectedBadDebt?.recoveredAmount || 0)).toLocaleString()} MMK</span></p>
          </div>
          
          <Input
            label="Recovery Amount (MMK)"
            type="number"
            value={recoveryAmount}
            onChange={(e) => setRecoveryAmount(e.target.value)}
            placeholder="Enter recovery amount"
          />
          
          <Input
            label="Recovery Date"
            type="date"
            value={recoveryDate}
            onChange={(e) => setRecoveryDate(e.target.value)}
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRecoveryModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleRecovery} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Record Recovery'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Provision Modal */}
      <Modal isOpen={showProvisionModal} onClose={() => setShowProvisionModal(false)} title="Create Allowance Provision">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Business (Optional)"
              value={provisionBusinessId}
              onChange={(v) => setProvisionBusinessId(String(v || ''))}
              options={provisionBusinessOptions}
              placeholder="-- All receivables --"
            />
            <SearchableSelect
              label="Client (Optional)"
              value={provisionClientId}
              onChange={(v) => setProvisionClientId(String(v || ''))}
              options={provisionClientOptions}
              placeholder="-- All receivables --"
            />
          </div>
          <p className="text-xs text-text-secondary dark:text-slate-400">Select Business and Client to scope provision to that pair. Leave empty for global provision.</p>
          {provisionCalculation && (
            <>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Aging Analysis:</p>
                <div className="space-y-1">
                  {provisionCalculation.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-700 dark:text-slate-200">
                      <span className="text-slate-600 dark:text-slate-300">{item.bracket}</span>
                      <span className="text-slate-700 dark:text-slate-200">{item.amount.toLocaleString()} MMK → <span className="text-amber-600 dark:text-amber-400 font-medium">{item.provision.toLocaleString()} MMK</span></span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-300 dark:border-slate-500 mt-2 pt-2">
                  <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-100">
                    <span>Total Receivables:</span>
                    <span>{provisionCalculation.totalReceivables.toLocaleString()} MMK</span>
                  </div>
                  <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-400">
                    <span>Suggested Provision:</span>
                    <span>{provisionCalculation.suggestedProvision.toLocaleString()} MMK</span>
                  </div>
                </div>
              </div>
              
              <Input
                label="Provision Amount (MMK)"
                type="number"
                value={provisionAmount}
                onChange={(e) => setProvisionAmount(e.target.value)}
                placeholder="Enter provision amount"
              />
              
              <Input
                label="Provision Date"
                type="date"
                value={provisionDate}
                onChange={(e) => setProvisionDate(e.target.value)}
              />
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={provisionNotes}
                  onChange={(e) => setProvisionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-text-primary dark:text-slate-200"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
            </>
          )}
          
          {!provisionCalculation && (
            <div className="text-center py-8 text-text-secondary">
              Calculating provision...
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowProvisionModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateProvision} disabled={isSubmitting || !provisionCalculation}>
              {isSubmitting ? 'Creating...' : 'Create Provision'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BadDebtManagementPage;
