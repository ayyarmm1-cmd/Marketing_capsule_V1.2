import React, { useState, useMemo, useEffect } from 'react';
import {
  apiGetClients,
  apiGetBusinesses,
  apiGetPayments,
  apiGetInvoices,
  apiGetSalesRecords,
  apiGetDailyExchangeRates,
  apiGetUsers,
  apiWriteOffBadDebt,
  apiGetClientBusinessBalancesForOverdue,
  apiGetClientBusinessBalancesReceivable,
} from '../../services/api';
import { Client, Business, Payment, Invoice, SaleRecord, SaleStatus, PaymentStatus, DailyExchangeRate, User } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import SearchableSelect from '../ui/SearchableSelect';
import { useFinanceDataMultiple } from '../../hooks/useFinanceData';
import { useSearchFilter } from '../../hooks/useFinanceFilters';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import FinancePageHeader from './shared/FinancePageHeader';
import FinanceTable from './shared/FinanceTable';
import MockDataBanner from '../facebook_ads/MockDataBanner';
import { Link } from 'react-router-dom';
import { formatDateForDisplay, getTodayInYangon } from '../../utils/dateUtils';

interface OutstandingClient {
  clientId: string;
  clientName: string;
  businessId?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  balance: number;
  lastPaymentDate?: string;
  daysSinceLastPayment?: number;
  isOverdue?: boolean;
  overdueAmount?: number;
  overdueDate?: string;
  daysOverdue?: number;
  /** 'pair' | 'clientOnly' | 'businessOnly' - for unique row key and display */
  source?: 'pair' | 'clientOnly' | 'businessOnly';
}

export type ARTab = 'all' | 'overdue';

interface AccountsReceivablePageProps {
  /** When true, hide page header and sidebar (used inside Receivables & Bad Debts unified page) */
  embedded?: boolean;
  /** When set, overrides internal tab (used when embedded) */
  forcedTab?: ARTab;
}

const AccountsReceivablePage: React.FC<AccountsReceivablePageProps> = ({ embedded = false, forcedTab }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('accountsReceivableSidebarCollapsed');
  const [activeTab, setActiveTab] = useState<ARTab>('all');
  const effectiveTab = embedded && forcedTab !== undefined ? forcedTab : activeTab;
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Max to Min, 'asc' = Min to Max
  type AllSortKey = 'client' | 'business' | 'phone' | 'email' | 'lastPayment' | 'balance';
  const [allSortConfig, setAllSortConfig] = useState<{ key: AllSortKey; direction: 'asc' | 'desc' }>({
    key: 'balance',
    direction: 'desc',
  });
  const [durationFilter, setDurationFilter] = useState<string>('all'); // 'all', '7', '14', '30', '90', '180', '365'
  const [overdueDaysFilter, setOverdueDaysFilter] = useState<string>('all'); // 'all', '7-14', '15-30', '31-60', '61-90', '90+'
  const [overdueAmountMin, setOverdueAmountMin] = useState<string>('');
  const [overdueAmountMax, setOverdueAmountMax] = useState<string>('');
  const [checkedOverdueKeys, setCheckedOverdueKeys] = useState<Set<string>>(new Set());
  type OverdueSortKey = 'checked' | 'client' | 'business' | 'phone' | 'email' | 'overdueSince' | 'overdueAmount';
  const [overdueSortConfig, setOverdueSortConfig] = useState<{ key: OverdueSortKey; direction: 'asc' | 'desc' }>({
    key: 'overdueSince',
    direction: 'desc',
  });

  // Write-off modal state (for Overdue tab)
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [selectedOverdueItem, setSelectedOverdueItem] = useState<OutstandingClient | null>(null);
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffUsdAmount, setWriteOffUsdAmount] = useState('');
  const [writeOffExchangeRate, setWriteOffExchangeRate] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffDate, setWriteOffDate] = useState(getTodayInYangon());
  const [writeOffResponsiblePersonUserId, setWriteOffResponsiblePersonUserId] = useState('');
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = useState(false);

  // Use shared data fetching hook
  const { data, isLoading, refetch } = useFinanceDataMultiple({
    clients: apiGetClients,
    businesses: apiGetBusinesses,
    payments: apiGetPayments,
    invoices: apiGetInvoices,
    salesRecords: apiGetSalesRecords,
    dailyExchangeRates: apiGetDailyExchangeRates,
    users: apiGetUsers,
    clientBusinessBalances: apiGetClientBusinessBalancesForOverdue,
    clientBusinessBalancesReceivable: apiGetClientBusinessBalancesReceivable,
  });

  const clients = (data.clients as Client[]) || [];
  const businesses = (data.businesses as Business[]) || [];
  const payments = (data.payments as Payment[]) || [];
  const invoices = (data.invoices as Invoice[]) || [];
  const salesRecords = (data.salesRecords as SaleRecord[]) || [];
  const dailyExchangeRates = (data.dailyExchangeRates as DailyExchangeRate[]) || [];
  const users = (data.users as User[]) || [];
  const clientBusinessBalances = (data.clientBusinessBalances as Array<{ clientId: string; businessId: string; outstanding: number; openingBalance: number }>) || [];
  const clientBusinessBalancesReceivable = (data.clientBusinessBalancesReceivable as Array<{ clientId: string; businessId: string; outstanding: number; openingBalance: number }>) || [];
  const latestExchangeRate = dailyExchangeRates.length > 0 ? dailyExchangeRates[0].rate : null;

  // Use shared search filter hook
  const { searchTerm, setSearchTerm, filterBySearch } = useSearchFilter<OutstandingClient>();

  // Calculate last payment date for each client and business
  const entityLastPayments = useMemo(() => {
    const lastPaymentsMap = new Map<string, { date: string; daysAgo: number }>();
    
    payments.forEach(payment => {
      // Track payments by client ID
      if (payment.clientId) {
        const existing = lastPaymentsMap.get(`client-${payment.clientId}`);
        if (!existing || new Date(payment.paymentDate) > new Date(existing.date)) {
          const paymentDate = new Date(payment.paymentDate);
          const daysAgo = Math.floor((Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
          lastPaymentsMap.set(`client-${payment.clientId}`, {
            date: payment.paymentDate,
            daysAgo
          });
        }
      }
      // Track payments by business ID
      if (payment.businessId) {
        const existing = lastPaymentsMap.get(`business-${payment.businessId}`);
        if (!existing || new Date(payment.paymentDate) > new Date(existing.date)) {
          const paymentDate = new Date(payment.paymentDate);
          const daysAgo = Math.floor((Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
          lastPaymentsMap.set(`business-${payment.businessId}`, {
            date: payment.paymentDate,
            daysAgo
          });
        }
      }
    });
    
    return lastPaymentsMap;
  }, [payments]);

  // Create a map of businesses by ID for quick lookup
  const businessMap = useMemo(() => {
    const map = new Map<string, Business>();
    businesses.forEach(business => map.set(business.id, business));
    return map;
  }, [businesses]);

  const salePaidAmounts = useMemo(() => {
    const paidMap = new Map<string, number>();
    payments
      .filter(p => p.status === PaymentStatus.APPROVED && !p.refundId)
      .forEach(payment => {
        if (payment.saleRecordId && (!payment.saleAllocations || payment.saleAllocations.length === 0)) {
          paidMap.set(payment.saleRecordId, (paidMap.get(payment.saleRecordId) || 0) + payment.amountMMK);
        }
        if (payment.saleAllocations && payment.saleAllocations.length > 0) {
          payment.saleAllocations.forEach(allocation => {
            if (!allocation.saleRecordId) return;
            paidMap.set(allocation.saleRecordId, (paidMap.get(allocation.saleRecordId) || 0) + allocation.amountMMK);
          });
        }
      });
    return paidMap;
  }, [payments]);

  // Calculate overdue status based on sales records only (not invoices)
  // Logic: If a sale is older than 7 days and still not fully paid, it's overdue
  const overdueFromSalesRecords = useMemo(() => {
    const overdueMap = new Map<string, { 
      amount: number; 
      date: string; 
      daysOverdue: number;
      saleId: string;
      saleType: string;
    }>();
    const now = Date.now();

    // Process sales records only
    salesRecords.forEach(sale => {
      if (sale.status === SaleStatus.DRAFT) return;
      const saleDate = new Date(sale.createdAt).getTime();
      const saleAmount = sale.grandTotalMMK || 0;
      
      if (saleAmount <= 0) return;
      const daysSinceSale = Math.floor((now - saleDate) / (1000 * 60 * 60 * 24));
      if (daysSinceSale < 7) return;
      
      const totalPaid = salePaidAmounts.get(sale.id) || 0;
      
      // If total payment doesn't cover the sale amount, it's overdue
      if (totalPaid < saleAmount) {
        const key = sale.businessId ? `business-${sale.businessId}` : `client-${sale.clientId}`;
        const daysOverdue = daysSinceSale;
        
        // Keep the most overdue sale for each client/business
        const existing = overdueMap.get(key);
        if (!existing || daysOverdue > existing.daysOverdue) {
          overdueMap.set(key, {
            amount: saleAmount - totalPaid,
            date: sale.createdAt,
            daysOverdue,
            saleId: sale.id,
            saleType: sale.type,
          });
        }
      }
    });

    return overdueMap;
  }, [salesRecords, salePaidAmounts]);

  // All Receivable: pair balances (outstanding > 0) + clients/businesses with balance but no pair (avoid double count)
  const outstandingClients = useMemo((): OutstandingClient[] => {
    const result: OutstandingClient[] = [];
    const clientIdsInPairs = new Set<string>();
    const businessIdsInPairs = new Set<string>();

    // 1. Add all pair balances (one row per pair - no double counting)
    clientBusinessBalancesReceivable.forEach((cb) => {
      clientIdsInPairs.add(cb.clientId);
      businessIdsInPairs.add(cb.businessId);
      const client = clients.find(c => c.id === cb.clientId);
      const business = businessMap.get(cb.businessId);
      if (!client || !business) return;
      const overdueInfo = overdueFromSalesRecords.get(`business-${cb.businessId}`) ||
                         overdueFromSalesRecords.get(`client-${cb.clientId}`);
      result.push({
        source: 'pair' as const,
        clientId: cb.clientId,
        clientName: client.name,
        businessId: cb.businessId,
        businessName: business.name,
        phone: client.phone || business.phone,
        email: client.email || business.email,
        balance: cb.outstanding,
        lastPaymentDate: entityLastPayments.get(`business-${cb.businessId}`)?.date ||
                         entityLastPayments.get(`client-${cb.clientId}`)?.date,
        daysSinceLastPayment: entityLastPayments.get(`business-${cb.businessId}`)?.daysAgo ??
                             entityLastPayments.get(`client-${cb.clientId}`)?.daysAgo,
        isOverdue: !!overdueInfo,
        overdueAmount: overdueInfo?.amount,
        overdueDate: overdueInfo?.date,
        daysOverdue: overdueInfo?.daysOverdue,
      });
    });

    // 2. Add clients with balance > 0 but no pair with outstanding (standalone - avoid double count)
    clients.forEach((client) => {
      const bal = client.balance ?? 0;
      if (bal <= 0) return;
      if (clientIdsInPairs.has(client.id)) return; // already shown via pair(s)
      const overdueInfo = overdueFromSalesRecords.get(`client-${client.id}`);
      result.push({
        source: 'clientOnly' as const,
        clientId: client.id,
        clientName: client.name || client.id,
        businessId: undefined,
        businessName: undefined,
        phone: client.phone,
        email: client.email,
        balance: bal,
        lastPaymentDate: entityLastPayments.get(`client-${client.id}`)?.date,
        daysSinceLastPayment: entityLastPayments.get(`client-${client.id}`)?.daysAgo,
        isOverdue: !!overdueInfo,
        overdueAmount: overdueInfo?.amount,
        overdueDate: overdueInfo?.date,
        daysOverdue: overdueInfo?.daysOverdue,
      });
    });

    // 3. Add businesses with balance > 0 but no pair with outstanding (standalone - avoid double count)
    businesses.forEach((business) => {
      const bal = business.balance ?? 0;
      if (bal <= 0) return;
      if (businessIdsInPairs.has(business.id)) return; // already shown via pair(s)
      const linkedClientId = business.linkedClientIds?.[0];
      const linkedClient = linkedClientId ? clients.find(c => c.id === linkedClientId) : undefined;
      const overdueInfo = overdueFromSalesRecords.get(`business-${business.id}`);
      result.push({
        source: 'businessOnly' as const,
        clientId: linkedClientId,
        clientName: linkedClient?.name || 'N/A',
        businessId: business.id,
        businessName: business.name || business.id,
        phone: business.phone,
        email: business.email,
        balance: bal,
        lastPaymentDate: entityLastPayments.get(`business-${business.id}`)?.date,
        daysSinceLastPayment: entityLastPayments.get(`business-${business.id}`)?.daysAgo,
        isOverdue: !!overdueInfo,
        overdueAmount: overdueInfo?.amount,
        overdueDate: overdueInfo?.date,
        daysOverdue: overdueInfo?.daysOverdue,
      });
    });

    return result;
  }, [clientBusinessBalancesReceivable, clients, businesses, businessMap, entityLastPayments, overdueFromSalesRecords]);

  // Calculate overdue items: sales 7+ days unpaid + all opening balance client-business pairs
  const overdueItems = useMemo((): OutstandingClient[] => {
    const result: OutstandingClient[] = [];
    const processedEntities = new Set<string>();
    const processedPairs = new Set<string>();

    const addPairKey = (clientId: string, businessId: string) =>
      processedPairs.add(`${clientId}_${businessId || ''}`);

    const getPairKey = (clientId: string, businessId?: string) =>
      `${clientId}_${businessId || ''}`;

    // 1. Add all overdue from sales records (7+ days unpaid)
    overdueFromSalesRecords.forEach((overdueInfo, key) => {
      const isBusiness = key.startsWith('business-');
      const entityId = key.replace(/^(client|business)-/, '');
      
      if (processedEntities.has(key)) return;
      processedEntities.add(key);

      if (isBusiness) {
        const business = businesses.find(b => b.id === entityId);
        if (business) {
          const linkedClientId = business.linkedClientIds?.[0];
          const linkedClient = linkedClientId ? clients.find(c => c.id === linkedClientId) : undefined;
          addPairKey(linkedClientId || '', business.id);
          
          result.push({
            clientId: linkedClientId || '',
            clientName: linkedClient?.name || 'N/A',
            businessId: business.id,
            businessName: business.name,
            phone: business.phone,
            email: business.email,
            balance: overdueInfo.amount,
            lastPaymentDate: entityLastPayments.get(`business-${business.id}`)?.date,
            daysSinceLastPayment: entityLastPayments.get(`business-${business.id}`)?.daysAgo,
            isOverdue: true,
            overdueAmount: overdueInfo.amount,
            overdueDate: overdueInfo.date,
            daysOverdue: overdueInfo.daysOverdue,
          });
        }
      } else {
        const client = clients.find(c => c.id === entityId);
        if (client) {
          const linkedBusinessId = client.linkedBusinessIds?.[0];
          const linkedBusiness = linkedBusinessId ? businessMap.get(linkedBusinessId) : undefined;
          addPairKey(client.id, linkedBusinessId);
          
          result.push({
            clientId: client.id,
            clientName: client.name,
            businessId: linkedBusinessId,
            businessName: linkedBusiness?.name,
            phone: client.phone,
            email: client.email,
            balance: overdueInfo.amount,
            lastPaymentDate: entityLastPayments.get(`client-${client.id}`)?.date,
            daysSinceLastPayment: entityLastPayments.get(`client-${client.id}`)?.daysAgo,
            isOverdue: true,
            overdueAmount: overdueInfo.amount,
            overdueDate: overdueInfo.date,
            daysOverdue: overdueInfo.daysOverdue,
          });
        }
      }
    });

    // 2. Add all opening balance client-business pairs (not already in from sales)
    clientBusinessBalances.forEach((cb) => {
      const pairKey = getPairKey(cb.clientId, cb.businessId);
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const client = clients.find(c => c.id === cb.clientId);
      const business = businessMap.get(cb.businessId);
      if (!client || !business) return;

      result.push({
        clientId: cb.clientId,
        clientName: client.name,
        businessId: cb.businessId,
        businessName: business.name,
        phone: client.phone || business.phone,
        email: client.email || business.email,
        balance: cb.outstanding,
        lastPaymentDate: entityLastPayments.get(`business-${cb.businessId}`)?.date || entityLastPayments.get(`client-${cb.clientId}`)?.date,
        daysSinceLastPayment: entityLastPayments.get(`business-${cb.businessId}`)?.daysAgo ?? entityLastPayments.get(`client-${cb.clientId}`)?.daysAgo,
        isOverdue: true,
        overdueAmount: cb.outstanding,
        overdueDate: undefined,
        daysOverdue: 999, // Opening balance: no sale date, show in "90+" filter
      });
    });

    return result;
  }, [overdueFromSalesRecords, clientBusinessBalances, clients, businesses, businessMap, entityLastPayments]);

  const filteredPendingClients = useMemo(() => {
    const sourceData = effectiveTab === 'overdue' ? overdueItems : outstandingClients;
    
    let filtered = sourceData.filter(item => 
      filterBySearch(item, [
        'clientName',
        'clientId',
        'businessName',
        'businessId',
        'phone',
        'email',
      ])
    );

    // Apply duration filter based on last payment date (only for "all" tab)
    if (effectiveTab === 'all' && durationFilter !== 'all') {
      const daysThreshold = parseInt(durationFilter);
      
      filtered = filtered.filter(item => {
        if (!item.lastPaymentDate) {
          // If no payment history, include it (it's been overdue since forever)
          return true;
        }
        
        const daysSinceLastPayment = item.daysSinceLastPayment ?? 0;
        return daysSinceLastPayment >= daysThreshold;
      });
    }

    if (effectiveTab === 'overdue') {
      if (overdueDaysFilter !== 'all') {
        filtered = filtered.filter(item => {
          const daysOverdue = item.daysOverdue ?? 0;
          switch (overdueDaysFilter) {
            case '7-14':
              return daysOverdue >= 7 && daysOverdue <= 14;
            case '15-30':
              return daysOverdue >= 15 && daysOverdue <= 30;
            case '31-60':
              return daysOverdue >= 31 && daysOverdue <= 60;
            case '61-90':
              return daysOverdue >= 61 && daysOverdue <= 90;
            case '90+':
              return daysOverdue >= 90;
            default:
              return true;
          }
        });
      }

      const minAmount = overdueAmountMin ? Number(overdueAmountMin) : null;
      const maxAmount = overdueAmountMax ? Number(overdueAmountMax) : null;
      if (minAmount !== null && !Number.isNaN(minAmount)) {
        filtered = filtered.filter(item => (item.overdueAmount || item.balance) >= minAmount);
      }
      if (maxAmount !== null && !Number.isNaN(maxAmount)) {
        filtered = filtered.filter(item => (item.overdueAmount || item.balance) <= maxAmount);
      }
    }

    // Sort by balance or days overdue
    return [...filtered].sort((a, b) => {
      if (effectiveTab === 'overdue') {
        const getValue = (item: OutstandingClient) => {
          switch (overdueSortConfig.key) {
            case 'checked': {
              const key = `${item.clientId}-${item.businessId || ''}`;
              return checkedOverdueKeys.has(key) ? 1 : 0;
            }
            case 'client':
              return item.clientName || '';
            case 'business':
              return item.businessName || '';
            case 'phone':
              return item.phone || '';
            case 'email':
              return item.email || '';
            case 'overdueAmount':
              return item.overdueAmount || item.balance || 0;
            case 'overdueSince':
            default:
              return item.daysOverdue ?? 0;
          }
        };
        const aValue = getValue(a);
        const bValue = getValue(b);
        const compare = typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
        return overdueSortConfig.direction === 'asc' ? compare : -compare;
      }
      // All tab: sort by allSortConfig
      const getValue = (item: OutstandingClient) => {
        switch (allSortConfig.key) {
          case 'client':
            return item.clientName || '';
          case 'business':
            return item.businessName || '';
          case 'phone':
            return item.phone || '';
          case 'email':
            return item.email || '';
          case 'lastPayment':
            return item.daysSinceLastPayment ?? -1;
          case 'balance':
          default:
            return item.balance ?? 0;
        }
      };
      const aValue = getValue(a);
      const bValue = getValue(b);
      const compare = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
      return allSortConfig.direction === 'asc' ? compare : -compare;
    });
  }, [effectiveTab, outstandingClients, overdueItems, filterBySearch, sortOrder, durationFilter, overdueDaysFilter, overdueAmountMin, overdueAmountMax, overdueSortConfig, checkedOverdueKeys, allSortConfig]);

  const totalOutstanding = useMemo(() => {
    return outstandingClients.reduce((sum, client) => sum + client.balance, 0);
  }, [outstandingClients]);

  const overdueCount = useMemo(() => {
    return overdueItems.length;
  }, [overdueItems]);

  const totalOverdueAmount = useMemo(() => {
    return overdueItems.reduce((sum, item) => sum + (item.overdueAmount || 0), 0);
  }, [overdueItems]);

  const getOverdueSortIndicator = (key: OverdueSortKey) => {
    if (overdueSortConfig.key !== key) return '↕';
    return overdueSortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getAllSortIndicator = (key: AllSortKey) => {
    if (allSortConfig.key !== key) return '↕';
    return allSortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const toggleAllSort = (key: AllSortKey) => {
    setAllSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      const direction = key === 'balance' || key === 'lastPayment' ? 'desc' : 'asc';
      return { key, direction };
    });
  };

  // Write-off handlers for Overdue tab
  const handleOpenWriteOff = (item: OutstandingClient) => {
    setSelectedOverdueItem(item);
    const amount = item.overdueAmount ?? item.balance;
    const defaultRate = latestExchangeRate ? latestExchangeRate.toString() : '';
    const defaultUsd = latestExchangeRate ? (amount / latestExchangeRate).toFixed(2) : '';
    const computedMMK = latestExchangeRate ? (Number(defaultUsd) * latestExchangeRate).toFixed(0) : amount.toString();
    setWriteOffExchangeRate(defaultRate);
    setWriteOffUsdAmount(defaultUsd);
    setWriteOffAmount(computedMMK);
    setWriteOffReason('');
    setWriteOffDate(getTodayInYangon());
    setWriteOffResponsiblePersonUserId('');
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
    if (!selectedOverdueItem || !user) return;
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
    setIsSubmittingWriteOff(true);
    try {
      await apiWriteOffBadDebt({
        clientId: selectedOverdueItem.clientId,
        businessId: selectedOverdueItem.businessId,
        amount,
        usdAmount,
        exchangeRate,
        reason: writeOffReason,
        writeOffDate,
        ...(writeOffResponsiblePersonUserId && { responsiblePersonUserId: writeOffResponsiblePersonUserId }),
      }, user.id);
      addNotification('Bad debt written off successfully', 'success');
      setShowWriteOffModal(false);
      setSelectedOverdueItem(null);
      refetch();
    } catch (error) {
      addNotification(`Failed to write off: ${(error as Error).message}`, 'error');
    }
    setIsSubmittingWriteOff(false);
  };

  const toggleOverdueSort = (key: OverdueSortKey) => {
    setOverdueSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      const direction = key === 'overdueSince' || key === 'overdueAmount' ? 'desc' : 'asc';
      return { key, direction };
    });
  };


  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <MockDataBanner />
          <FinancePageHeader
            title="Accounts Receivable"
            description="Monitor outstanding balances and track pending payments from customers."
          />
        </>
      )}

      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        {!embedded && (
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Accounts Receivable</h2>}
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
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${effectiveTab === 'all' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'All Receivable' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              ) : (
                'All Receivable'
              )}
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${effectiveTab === 'overdue' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Overdue' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              ) : (
                'Overdue'
              )}
            </button>
          </nav>
        </aside>
        )}
        <main className="flex-1">
          <div className="space-y-6">
            {effectiveTab === 'all' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <p className="text-sm text-text-secondary">Total Outstanding Amount</p>
                    <p className="text-3xl font-bold text-status-danger">{totalOutstanding.toLocaleString()} MMK</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <p className="text-sm text-text-secondary">Clients with Balance</p>
                    <p className="text-3xl font-bold text-primary-action">{outstandingClients.length}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <Input
                      label="Search Client/Business by Name, ID, Phone, or Email"
                      placeholder="Type to search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      containerClassName="flex-1 mb-0"
                    />
                    <Select
                      label="Filter by Last Payment"
                      value={durationFilter}
                      onChange={(e) => setDurationFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: '7', label: '7+ days since last payment' },
                        { value: '14', label: '14+ days since last payment' },
                        { value: '30', label: '1+ month since last payment' },
                        { value: '90', label: '3+ months since last payment' },
                        { value: '180', label: '6+ months since last payment' },
                        { value: '365', label: '1+ year since last payment' },
                      ]}
                      containerClassName="mb-0 min-w-[250px]"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary whitespace-nowrap">Sort by Balance:</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        title={sortOrder === 'desc' ? 'Currently: Max to Min. Click to sort Min to Max' : 'Currently: Min to Max. Click to sort Max to Min'}
                        className="min-w-[120px]"
                      >
                        {sortOrder === 'desc' ? 'Max to Min ↓' : 'Min to Max ↑'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {effectiveTab === 'overdue' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <p className="text-sm text-text-secondary">Total Overdue Amount</p>
                    <p className="text-3xl font-bold text-status-danger">{totalOverdueAmount.toLocaleString()} MMK</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <p className="text-sm text-text-secondary">Overdue Accounts</p>
                    <p className="text-3xl font-bold text-status-warning">{overdueCount}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                  <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <Input
                      label="Search Client/Business by Name, ID, Phone, or Email"
                      placeholder="Type to search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      containerClassName="flex-1 mb-0"
                    />
                    <Select
                      label="Overdue Days"
                      value={overdueDaysFilter}
                      onChange={(e) => setOverdueDaysFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All overdue (7+ days)' },
                        { value: '7-14', label: '7-14 days' },
                        { value: '15-30', label: '15-30 days' },
                        { value: '31-60', label: '31-60 days' },
                        { value: '61-90', label: '61-90 days' },
                        { value: '90+', label: '90+ days' },
                      ]}
                      containerClassName="mb-0 min-w-[200px]"
                    />
                    <Input
                      label="Min Overdue Amount (MMK)"
                      type="number"
                      value={overdueAmountMin}
                      onChange={(e) => setOverdueAmountMin(e.target.value)}
                      containerClassName="mb-0 min-w-[200px]"
                    />
                    <Input
                      label="Max Overdue Amount (MMK)"
                      type="number"
                      value={overdueAmountMax}
                      onChange={(e) => setOverdueAmountMax(e.target.value)}
                      containerClassName="mb-0 min-w-[200px]"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary whitespace-nowrap">Sort by Days Overdue:</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        title={sortOrder === 'desc' ? 'Currently: Most to Least. Click to sort Least to Most' : 'Currently: Least to Most. Click to sort Most to Least'}
                        className="min-w-[120px]"
                      >
                        {sortOrder === 'desc' ? 'Most to Least ↓' : 'Least to Most ↑'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <FinanceTable
              columns={[
                ...(effectiveTab === 'overdue'
                  ? [
                      {
                        key: 'checked',
                        label: (
                          <div className="flex items-center justify-center space-x-2">
                            <span>Checked</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOverdueSort('checked')}
                              className="!p-1 h-6 w-6"
                              title={`Sort by Checked (${overdueSortConfig.key === 'checked' ? overdueSortConfig.direction : 'asc'})`}
                            >
                              {getOverdueSortIndicator('checked')}
                            </Button>
                          </div>
                        ),
                        align: 'center' as const,
                        render: (item: OutstandingClient) => {
                          const key = `${item.clientId}-${item.businessId || ''}`;
                          const isChecked = checkedOverdueKeys.has(key);
                          return (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(checkedOverdueKeys);
                                if (e.target.checked) {
                                  next.add(key);
                                } else {
                                  next.delete(key);
                                }
                                setCheckedOverdueKeys(next);
                              }}
                              className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                            />
                          );
                        },
                      },
                    ]
                  : []),
                {
                  key: 'client',
                  label: (
                    <div className="flex items-center space-x-2">
                      <span>Client</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); (effectiveTab === 'overdue' ? toggleOverdueSort('client') : toggleAllSort('client')); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Client (${effectiveTab === 'overdue' ? (overdueSortConfig.key === 'client' ? overdueSortConfig.direction : 'asc') : (allSortConfig.key === 'client' ? allSortConfig.direction : 'asc')})`}
                      >
                        {effectiveTab === 'overdue' ? getOverdueSortIndicator('client') : getAllSortIndicator('client')}
                      </Button>
                    </div>
                  ),
                  render: (item: OutstandingClient) =>
                    item.clientId ? (
                      <Link to={`/clients/${item.clientId}`} className="text-primary-action hover:underline font-medium" onClick={e => e.stopPropagation()}>
                        {item.clientName} ({item.clientId})
                      </Link>
                    ) : (
                      <span>{item.clientName || '-'}</span>
                    ),
                },
                {
                  key: 'business',
                  label: (
                    <div className="flex items-center space-x-2">
                      <span>Business</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); (effectiveTab === 'overdue' ? toggleOverdueSort('business') : toggleAllSort('business')); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Business (${effectiveTab === 'overdue' ? (overdueSortConfig.key === 'business' ? overdueSortConfig.direction : 'asc') : (allSortConfig.key === 'business' ? allSortConfig.direction : 'asc')})`}
                      >
                        {effectiveTab === 'overdue' ? getOverdueSortIndicator('business') : getAllSortIndicator('business')}
                      </Button>
                    </div>
                  ),
                  render: (item: OutstandingClient) => {
                    if (item.businessId && item.businessName) {
                      return (
                        <Link to={`/businesses/${item.businessId}`} className="text-primary-action hover:underline font-medium" onClick={e => e.stopPropagation()}>
                          {item.businessName} ({item.businessId})
                        </Link>
                      );
                    }
                    return <span className="text-text-secondary">-</span>;
                  },
                },
                {
                  key: 'phone',
                  label: (
                    <div className="flex items-center space-x-2">
                      <span>Phone</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); (effectiveTab === 'overdue' ? toggleOverdueSort('phone') : toggleAllSort('phone')); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Phone (${effectiveTab === 'overdue' ? (overdueSortConfig.key === 'phone' ? overdueSortConfig.direction : 'asc') : (allSortConfig.key === 'phone' ? allSortConfig.direction : 'asc')})`}
                      >
                        {effectiveTab === 'overdue' ? getOverdueSortIndicator('phone') : getAllSortIndicator('phone')}
                      </Button>
                    </div>
                  ),
                  render: (item: OutstandingClient) => item.phone || '-',
                },
                {
                  key: 'email',
                  label: (
                    <div className="flex items-center space-x-2">
                      <span>Email</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); (effectiveTab === 'overdue' ? toggleOverdueSort('email') : toggleAllSort('email')); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Email (${effectiveTab === 'overdue' ? (overdueSortConfig.key === 'email' ? overdueSortConfig.direction : 'asc') : (allSortConfig.key === 'email' ? allSortConfig.direction : 'asc')})`}
                      >
                        {effectiveTab === 'overdue' ? getOverdueSortIndicator('email') : getAllSortIndicator('email')}
                      </Button>
                    </div>
                  ),
                  render: (item: OutstandingClient) => item.email || '-',
                },
                {
                  key: effectiveTab === 'overdue' ? 'overdue' : 'lastPayment',
                  label: effectiveTab === 'overdue' ? (
                    <div className="flex items-center space-x-2">
                      <span>Overdue Since</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleOverdueSort('overdueSince'); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Overdue Days (${overdueSortConfig.key === 'overdueSince' ? overdueSortConfig.direction : 'desc'})`}
                      >
                        {getOverdueSortIndicator('overdueSince')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Last Payment</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleAllSort('lastPayment'); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Last Payment (${allSortConfig.key === 'lastPayment' ? allSortConfig.direction : 'desc'})`}
                      >
                        {getAllSortIndicator('lastPayment')}
                      </Button>
                    </div>
                  ),
                  render: (item: OutstandingClient) => {
                    if (effectiveTab === 'overdue') {
                      if (!item.overdueDate) {
                        return <span className="text-text-secondary">-</span>;
                      }
                      const daysOverdue = item.daysOverdue ?? 0;
                      const colorClass = daysOverdue >= 90 ? 'text-status-danger' : daysOverdue >= 30 ? 'text-status-warning' : 'text-status-warning';
                      return (
                        <div>
                          <div className={colorClass}>{formatDateForDisplay(item.overdueDate)}</div>
                          <div className="text-xs text-text-secondary">{daysOverdue} days overdue</div>
                        </div>
                      );
                    } else {
                      if (!item.lastPaymentDate) {
                        return <span className="text-text-secondary">No payment history</span>;
                      }
                      const daysAgo = item.daysSinceLastPayment ?? 0;
                      const colorClass = daysAgo >= 90 ? 'text-status-danger' : daysAgo >= 30 ? 'text-status-warning' : 'text-text-secondary';
                      return (
                        <div>
                          <div className={colorClass}>{formatDateForDisplay(item.lastPaymentDate)}</div>
                          <div className="text-xs text-text-secondary">{daysAgo} days ago</div>
                        </div>
                      );
                    }
                  },
                },
                {
                  key: 'balance',
                  label: effectiveTab === 'overdue' ? (
                    <div className="flex items-center justify-end space-x-2">
                      <span>Overdue Amount</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleOverdueSort('overdueAmount'); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Overdue Amount (${overdueSortConfig.key === 'overdueAmount' ? overdueSortConfig.direction : 'desc'})`}
                      >
                        {getOverdueSortIndicator('overdueAmount')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end space-x-2">
                      <span>Outstanding Balance</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleAllSort('balance'); }}
                        className="!p-1 h-6 w-6"
                        title={`Sort by Balance (${allSortConfig.key === 'balance' ? allSortConfig.direction : 'desc'})`}
                      >
                        {getAllSortIndicator('balance')}
                      </Button>
                    </div>
                  ),
                  align: 'right',
                  render: (item: OutstandingClient) => (
                    <span className="font-semibold text-status-danger">
                      {effectiveTab === 'overdue' ? (item.overdueAmount || item.balance).toLocaleString() : item.balance.toLocaleString()} MMK
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  align: 'center',
                  render: (item: OutstandingClient) => (
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="danger" size="sm" onClick={() => handleOpenWriteOff(item)}>
                        Write Off as Bad Debt
                      </Button>
                      <Link to={item.clientId ? `/clients/${item.clientId}` : item.businessId ? `/businesses/${item.businessId}` : '#'}>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </Link>
                    </div>
                  ),
                },
              ]}
              data={filteredPendingClients}
              isLoading={isLoading}
              emptyMessage={effectiveTab === 'overdue' ? 'No overdue accounts found based on sales records.' : 'No clients with outstanding payments found.'}
              rowKey={(item) => item.source === 'clientOnly' ? `client-${item.clientId}` : item.source === 'businessOnly' ? `business-${item.businessId}` : `${item.clientId}-${item.businessId}`}
            />
          </div>
        </main>
      </div>

      {/* Write-Off Modal (Overdue tab) */}
      <Modal
        isOpen={showWriteOffModal}
        onClose={() => { setShowWriteOffModal(false); setSelectedOverdueItem(null); setWriteOffResponsiblePersonUserId(''); }}
        title="Write Off Bad Debt"
      >
        <div className="space-y-4">
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
            <p className="text-sm text-text-secondary">Writing off for:</p>
            <p className="font-semibold">{selectedOverdueItem?.clientName || selectedOverdueItem?.businessName}</p>
            <p className="text-sm text-text-secondary">
              Outstanding Balance: {(selectedOverdueItem?.overdueAmount ?? selectedOverdueItem?.balance ?? 0).toLocaleString()} MMK
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Write-Off Amount (USD)" type="number" value={writeOffUsdAmount} onChange={(e) => setWriteOffUsdAmount(e.target.value)} placeholder="Enter USD amount" />
            <Input label="Exchange Rate (MMK/USD)" type="number" value={writeOffExchangeRate} onChange={(e) => setWriteOffExchangeRate(e.target.value)} placeholder={latestExchangeRate ? `Latest: ${latestExchangeRate}` : 'Enter exchange rate'} />
          </div>
          <Input label="Write-Off Amount (MMK) = USD x Rate" type="number" value={writeOffAmount} onChange={() => {}} disabled />
          <Input label="Write-Off Date" type="date" value={writeOffDate} onChange={(e) => setWriteOffDate(e.target.value)} />
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
            <Button variant="secondary" onClick={() => setShowWriteOffModal(false)} disabled={isSubmittingWriteOff}>Cancel</Button>
            <Button variant="danger" onClick={handleWriteOff} disabled={isSubmittingWriteOff}>{isSubmittingWriteOff ? 'Processing...' : 'Write Off'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountsReceivablePage;
