import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeRefreshData } from '../../utils/refreshDataBus';
import { Payment, Client, User, PaymentMethodSetting, Business, PaymentStatus, Invoice, SaleRecord, CreditNote } from '../../types';
import {
  apiGetPaymentsForPeriod,
  apiGetPayments,
  apiGetClients,
  apiGetUsers,
  apiGetPaymentMethodSettings,
  apiGetCashAccounts,
  apiGetBusinesses,
  apiDeletePayment,
  apiApprovePayment,
  apiRejectPayment,
  apiGetInvoicesForPeriod,
  apiGetInvoices,
  apiGetSalesForPeriod,
  apiGetSalesRecords,
  apiGetCreditNotesForPeriod,
  apiGetCreditNotes,
} from '../../services/api';
import Button from '../ui/Button';
import RefreshButton from '../ui/RefreshButton';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import MockDataBanner from '../facebook_ads/MockDataBanner';
import { useFinanceDataMultiple } from '../../hooks/useFinanceData';
import { useFinanceFilters } from '../../hooks/useFinanceFilters';
import { formatDate, getClientName, getBusinessName, getUserName, matchesSearchTerm } from '../../utils/financeUtils';
import { getTodayInYangon, getDateInYangonTimezoneFromISO } from '../../utils/dateUtils';
import FinancePageHeader from './shared/FinancePageHeader';
import { STATUS_COLORS } from '../../constants';
import { Permission } from '../../types';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import RecordPaymentModal from './modals/RecordPaymentModal';

const formatPaymentBusinessLabel = (payment: Payment, businesses: Business[]): string => {
  if (payment.businessId) return getBusinessName(payment.businessId, businesses);
  if (payment.clientWide || (payment.businessAllocations && payment.businessAllocations.length > 0)) {
    return 'All linked businesses';
  }
  return '—';
};

// KPI card component
const KPICard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass?: string; isCurrency?: boolean }> = ({ title, value, icon, colorClass = 'bg-primary-action', isCurrency = false }) => (
  <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-xl shadow-md flex items-center space-x-4 border border-slate-200 dark:border-slate-700">
    <div className={`p-3 rounded-full ${colorClass} text-white`}>{icon}</div>
    <div>
      <p className="text-sm text-text-secondary dark:text-slate-400 font-medium">{title}</p>
      <p className="text-xl font-bold text-text-primary dark:text-slate-100">
        {isCurrency && typeof value === 'number' ? `${value.toLocaleString()} MMK` : value}
      </p>
    </div>
  </div>
);

const TotalAmountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18v-.008Zm-12 0h.008v.008H6v-.008Z" /></svg>;
const ApprovedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const PendingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const CountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>;

const PaymentsReceiptsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [startDate, setStartDate] = useState(() => getTodayInYangon());
  const [endDate, setEndDate] = useState(() => getTodayInYangon());
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  // Pagination (same as Sales entry page)
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  // Use shared data fetching hook - period-filtered APIs to reduce Firestore reads
  const usePeriodFilter = startDate && endDate;
  const { data, isLoading, refetch } = useFinanceDataMultiple({
    payments: usePeriodFilter
      ? () => apiGetPaymentsForPeriod(startDate, endDate)
      : apiGetPayments,
    clients: apiGetClients,
    users: apiGetUsers,
    cashAccounts: apiGetCashAccounts,
    legacyPaymentMethods: apiGetPaymentMethodSettings,
    businesses: apiGetBusinesses,
    invoices: usePeriodFilter
      ? () => apiGetInvoicesForPeriod(startDate, endDate)
      : apiGetInvoices,
    sales: usePeriodFilter
      ? () => apiGetSalesForPeriod(startDate, endDate)
      : apiGetSalesRecords,
    creditNotes: usePeriodFilter
      ? () => apiGetCreditNotesForPeriod(startDate, endDate)
      : apiGetCreditNotes,
  }, [startDate, endDate]);

  const allPayments = (data.payments as Payment[]) || [];

  const clients = (data.clients as Client[]) || [];
  const businesses = (data.businesses as Business[]) || [];
  const users = (data.users as User[]) || [];
  const cashAccounts = (data.cashAccounts as any[]) || [];
  const legacyPaymentMethods = (data.legacyPaymentMethods as PaymentMethodSetting[]) || [];
  const allInvoices = (data.invoices as Invoice[]) || [];
  const allSales = (data.sales as SaleRecord[]) || [];
  const allCreditNotes = (data.creditNotes as CreditNote[]) || [];

  // Listen for global refresh events (debounced)
  useEffect(() => {
    return subscribeRefreshData(() => {
      refetch();
    });
  }, [refetch]);
  
  // Convert cash accounts to payment method format (for active accounts)
  const cashAccountMethods: PaymentMethodSetting[] = cashAccounts
    .filter((acc: any) => acc.isActive)
    .map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      accountNumber: acc.accountNumber || acc.phoneNumber || '',
      isActive: acc.isActive,
      showInPublic: acc.showInPublic,
      logoUrl: acc.logoUrl,
      qrCodeUrl: acc.qrCodeUrl,
    }));
  
  // Combine cash accounts (prioritized) with legacy payment methods
  const paymentMethods = [...cashAccountMethods, ...legacyPaymentMethods.filter(pm => pm.isActive)];

  // Use shared filters hook
  const filters = useFinanceFilters<Payment>();

  const paymentMethodFilterOptions = useMemo(() => {
    return [{ value: '', label: 'All Methods' }, ...paymentMethods.map(m => ({ value: m.name, label: m.name }))];
  }, [paymentMethods]);

  const canManagePayments = hasPermission(Permission.MANAGE_PAYMENTS_RECEIPTS);
  const canEditPayments = canManagePayments
    || hasPermission(Permission.EDIT_CLIENT)
    || hasPermission(Permission.EDIT_BUSINESS);

  const handleDeletePayment = async (paymentId: string) => {
    if (!canEditPayments) {
      addNotification("You don't have permission to delete payments.", "error");
      return;
    }
    const confirmed = await showConfirmation({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record? This will update client balances and cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeletePayment(paymentId);
        addNotification('Payment deleted successfully.', 'success');
        refetch();
      } catch (error) {
        addNotification(`Failed to delete payment: ${(error as Error).message}`, 'error');
      }
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    if (!user) return;
    const confirmed = await showConfirmation({
      title: 'Approve Payment',
      message: 'Are you sure you want to approve this payment? This will update client/business balances and company financials.',
      confirmText: 'Approve',
      cancelText: 'Cancel',
    });
    if (confirmed) {
      try {
        await apiApprovePayment(paymentId, user.id);
        addNotification('Payment approved successfully.', 'success');
        refetch();
      } catch (error) {
        addNotification(`Failed to approve payment: ${(error as Error).message}`, 'error');
      }
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!user) return;
    if (!rejectReason.trim()) {
      addNotification('Please provide a rejection reason.', 'error');
      return;
    }
    try {
      await apiRejectPayment(paymentId, user.id, rejectReason);
      addNotification('Payment rejected successfully.', 'success');
      setRejectReason('');
      setRejectingPaymentId(null);
      refetch();
    } catch (error) {
      addNotification(`Failed to reject payment: ${(error as Error).message}`, 'error');
    }
  };

  // Group payments that were made together (same date, client/business, within time window)
  const paymentGroups = useMemo(() => {
    const groups = new Map<string, Payment[]>(); // groupKey -> array of payments
    
    // Group payments by date, client, business, and time window (within 30 seconds)
    const paymentGroupsByTime = new Map<string, Payment[]>();
    
    allPayments
      .filter(p => p.saleRecordId) // Only group payments linked to sales
      .forEach(payment => {
        // Use Yangon date from createdAt for grouping
        const datePart = getDateInYangonTimezoneFromISO(payment.createdAt);
        const timeKey = `${datePart}_${Math.floor(new Date(payment.createdAt).getTime() / 30000)}`;
        const key = `${timeKey}_${payment.clientId}_${payment.businessId || ''}`;
        
        if (!paymentGroupsByTime.has(key)) {
          paymentGroupsByTime.set(key, []);
        }
        paymentGroupsByTime.get(key)!.push(payment);
      });
    
    // Create groups for payments that were made together (2+ payments on same date/time)
    paymentGroupsByTime.forEach((groupPayments, key) => {
      if (groupPayments.length > 1) {
        // Sort payments by createdAt to ensure consistent group key
        const sortedPayments = [...groupPayments].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // Use first payment's ID as group key (or create a composite key)
        const groupKey = sortedPayments.map(p => p.id).sort().join(',');
        groups.set(groupKey, sortedPayments);
      }
    });
    
    return groups;
  }, [allPayments]);

  // Map payment ID to group key
  const paymentToGroup = useMemo(() => {
    const map = new Map<string, string>();
    paymentGroups.forEach((payments, groupKey) => {
      payments.forEach(payment => {
        map.set(payment.id, groupKey);
      });
    });
    return map;
  }, [paymentGroups]);

  // Handle bulk approval of selected payments
  const handleBulkApprovePayments = async () => {
    if (!user) {
      addNotification("You must be logged in to approve payments.", "error");
      return;
    }

    if (!hasPermission(Permission.APPROVE_PAYMENT)) {
      addNotification("You don't have permission to approve payments.", "error");
      return;
    }

    const pendingPayments = Array.from(selectedPaymentIds)
      .map(id => filteredPayments.find(p => p.id === id))
      .filter((p): p is Payment => p !== undefined && p.status === PaymentStatus.PENDING);
    
    if (pendingPayments.length === 0) {
      addNotification("No pending payments selected. Only pending payments can be approved.", "error");
      return;
    }
    
    const confirmed = await showConfirmation({
      title: 'Approve Payments',
      message: `Are you sure you want to approve ${pendingPayments.length} selected payment(s)? This will update client/business balances and company financials.`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      confirmVariant: 'success',
    });
    
    if (!confirmed) return;
    
    try {
      await Promise.all(pendingPayments.map(p => apiApprovePayment(p.id, user.id)));
      addNotification(`${pendingPayments.length} payment(s) approved successfully.`, "success");
      setSelectedPaymentIds(new Set());
      refetch();
    } catch (error) {
      addNotification(`Failed to approve payments: ${(error as Error).message}`, "error");
    }
  };

  const handleBulkDeletePayments = async () => {
    if (selectedPaymentIds.size === 0) {
      addNotification("Please select at least one payment to delete.", "error");
      return;
    }
    const confirmed = await showConfirmation({
      title: 'Delete Payments',
      message: `Are you sure you want to delete ${selectedPaymentIds.size} selected payment(s)? This will update client balances and cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    try {
      await Promise.all(selectedPayments.map(p => apiDeletePayment(p.id)));
      addNotification(`${selectedPaymentIds.size} payment(s) deleted successfully.`, "success");
      setSelectedPaymentIds(new Set());
      refetch();
    } catch (error) {
      addNotification(`Failed to delete payments: ${(error as Error).message}`, "error");
    }
  };

  // Handle group approval (approve all payments in a group)
  const handleApprovePaymentGroup = async (groupKey: string) => {
    if (!user) {
      addNotification("You must be logged in to approve payments.", "error");
      return;
    }

    if (!hasPermission(Permission.APPROVE_PAYMENT)) {
      addNotification("You don't have permission to approve payments.", "error");
      return;
    }

    const groupPayments = paymentGroups.get(groupKey) || [];
    const pendingPayments = groupPayments.filter(p => p.status === PaymentStatus.PENDING);
    
    if (pendingPayments.length === 0) {
      addNotification("No pending payments in this group.", "error");
      return;
    }
    
    const confirmed = await showConfirmation({
      title: 'Approve Payment Group',
      message: `Are you sure you want to approve ${pendingPayments.length} payment(s) in this group?`,
      confirmText: 'Approve Group',
      cancelText: 'Cancel',
      confirmVariant: 'success',
    });
    
    if (!confirmed) return;
    
    try {
      await Promise.all(pendingPayments.map(p => apiApprovePayment(p.id, user.id)));
      addNotification(`${pendingPayments.length} payment(s) approved successfully.`, "success");
      setSelectedPaymentIds(new Set());
      refetch();
    } catch (error) {
      addNotification(`Failed to approve payments: ${(error as Error).message}`, "error");
    }
  };

  const filteredPayments = useMemo(() => {
    let filtered = allPayments.filter(p => {
      if (!p || !p.paymentDate) {
        return false;
      }
      
      const paymentDate = new Date(p.paymentDate);
      if (isNaN(paymentDate.getTime())) {
        return false;
      }
      
      // Period filter (startDate and endDate)
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        
        const dateMatch = (!start || paymentDate >= start) && (!end || paymentDate <= end);
        if (!dateMatch) return false;
      }
      
      // Method filter
      if (!filters.filterByMethod(p.method)) {
        return false;
      }
      
      // Status filter
      if (statusFilter && p.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (!filters.filterBySearch(p, [
        'id',
        'receiptNumber',
        'invoiceId',
        'saleRecordId',
        'remark',
        'transactionLast4Digits',
        (item) => item.saleAllocations?.map(a => a.saleRecordId).join(' ') || '',
        (item) => getClientName(item.clientId, clients),
      ])) {
        return false;
      }
      
      return true;
    });
    
    // Sort by date (latest first by default, or oldest first if sortOrder is 'oldest')
    // Use createdAt for "latest" to show most recently recorded payments first
    // Use paymentDate as fallback if createdAt is not available
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.paymentDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.paymentDate || 0).getTime();
      if (sortOrder === 'latest') {
        return dateB - dateA; // Latest first (newest created/recorded first)
      } else {
        return dateA - dateB; // Oldest first
      }
    });
    
    return filtered;
  }, [allPayments, filters, clients, businesses, statusFilter, startDate, endDate, sortOrder]);

  // Build display rows (groups + ungrouped) for pagination - same order as table render
  type DisplayRow = { type: 'group'; groupKey: string; payments: Payment[] } | { type: 'single'; payment: Payment };
  const displayRows = useMemo(() => {
    const rows: DisplayRow[] = [];
    const processedGroupKeys = new Set<string>();
    const processedPaymentIds = new Set<string>();
    const sortedPayments = filteredPayments;

    sortedPayments.forEach(payment => {
      const groupKey = paymentToGroup.get(payment.id);
      if (groupKey && !processedGroupKeys.has(groupKey)) {
        processedGroupKeys.add(groupKey);
        const groupPayments = paymentGroups.get(groupKey) || [];
        const filteredGroupPayments = groupPayments.filter(p => filteredPayments.some(fp => fp.id === p.id));
        if (filteredGroupPayments.length > 0) {
          filteredGroupPayments.forEach(p => processedPaymentIds.add(p.id));
          rows.push({ type: 'group', groupKey, payments: filteredGroupPayments });
        }
      }
    });

    sortedPayments.forEach(payment => {
      if (!processedPaymentIds.has(payment.id)) {
        rows.push({ type: 'single', payment });
      }
    });

    return rows;
  }, [filteredPayments, paymentGroups, paymentToGroup]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / ITEMS_PER_PAGE));
  const visibleDisplayRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayRows.slice(start, start + ITEMS_PER_PAGE);
  }, [displayRows, currentPage]);

  // Reset page when filters change; clamp page when totalPages shrinks
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, statusFilter, filters.searchTerm, filters.selectedMethodFilter, sortOrder]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  // IDs of payments visible on current page (for header "select all")
  const visiblePaymentIds = useMemo(() => {
    const ids = new Set<string>();
    visibleDisplayRows.forEach(row => {
      if (row.type === 'group') row.payments.forEach(p => ids.add(p.id));
      else ids.add(row.payment.id);
    });
    return ids;
  }, [visibleDisplayRows]);

  const isAllVisibleSelected = visiblePaymentIds.size > 0 && Array.from(visiblePaymentIds).every(id => selectedPaymentIds.has(id));
  const isSomeVisibleSelected = Array.from(visiblePaymentIds).some(id => selectedPaymentIds.has(id));
  const handleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedPaymentIds(prev => new Set([...prev, ...visiblePaymentIds]));
    } else {
      setSelectedPaymentIds(prev => {
        const next = new Set(prev);
        visiblePaymentIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const selectedPayments = filteredPayments.filter(p => selectedPaymentIds.has(p.id));
  const selectedPayment = selectedPayments.length === 1 ? selectedPayments[0] : null;
  const pendingSelectedCount = selectedPayments.filter(p => p.status === PaymentStatus.PENDING).length;

  // KPI stats from filtered payments
  const kpiStats = useMemo(() => {
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amountMMK, 0);
    const approvedPayments = filteredPayments.filter(p => p.status === PaymentStatus.APPROVED);
    const pendingPayments = filteredPayments.filter(p => p.status === PaymentStatus.PENDING);
    const approvedAmount = approvedPayments.reduce((sum, p) => sum + p.amountMMK, 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amountMMK, 0);
    return {
      totalAmount,
      approvedAmount,
      pendingAmount,
      count: filteredPayments.length,
      pendingCount: pendingPayments.length,
    };
  }, [filteredPayments]);

  return (
      <div className="space-y-6">
      <MockDataBanner />
      <div className="flex justify-between items-start">
        <FinancePageHeader
          title="Payments & Receipts"
          description="Record and manage customer payments, track receipts, and monitor payment history."
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={refetch} isLoading={isLoading} />
          {selectedPaymentIds.size > 0 && (
            <>
              {selectedPayment && (
                <>
                  {selectedPayment.status === PaymentStatus.PENDING && hasPermission(Permission.APPROVE_PAYMENT) && (
                    <>
                      <Button variant="primary" onClick={() => handleApprovePayment(selectedPayment.id)}>
                        Approve
                      </Button>
                      <Button variant="danger" onClick={() => setRejectingPaymentId(selectedPayment.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {canEditPayments && (
                    <Button variant="danger" onClick={() => handleDeletePayment(selectedPayment.id)}>
                      Delete
                    </Button>
                  )}
                </>
              )}
              {!selectedPayment && (
                <>
                  {pendingSelectedCount > 0 && hasPermission(Permission.APPROVE_PAYMENT) && (
                    <Button variant="primary" onClick={handleBulkApprovePayments}>
                      Approve ({pendingSelectedCount})
                    </Button>
                  )}
                  {canEditPayments && (
                    <Button variant="danger" onClick={handleBulkDeletePayments}>
                      Delete ({selectedPaymentIds.size})
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          <Button 
            onClick={() => { setEditingPayment(null); setIsRecordPaymentModalOpen(true); }} 
            variant="primary"
            disabled={paymentMethods.length === 0}
          >
            + Record Payment
          </Button>
        </div>
      </div>

      {!isLoading && paymentMethods.length === 0 && (
        <p className="text-xs text-status-warning mb-2 text-right">No active payment methods. Configure in Settings.</p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Amount" value={kpiStats.totalAmount} icon={<TotalAmountIcon />} colorClass="bg-primary-action" isCurrency />
        <KPICard title="Approved Amount" value={kpiStats.approvedAmount} icon={<ApprovedIcon />} colorClass="bg-green-600" isCurrency />
        <KPICard title="Pending Amount" value={kpiStats.pendingAmount} icon={<PendingIcon />} colorClass="bg-amber-600" isCurrency />
        <KPICard title="Total Count" value={kpiStats.count} icon={<CountIcon />} colorClass="bg-slate-600" />
      </div>

      <div className="mb-4 p-3 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="flex flex-nowrap gap-4 items-end min-w-max">
          <div className="flex-1 min-w-0 max-w-xl">
            <Input 
              label="Search by ID, Client, Invoice/Sale ID, Receipt No..." 
              value={filters.searchTerm} 
              onChange={e => filters.setSearchTerm(e.target.value)} 
              containerClassName="mb-0" 
              placeholder="Search by Payment ID, Client ID, Receipt No, Invoice/Sale ID..." 
            />
          </div>
          <Input 
            label="Start Date" 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            containerClassName="mb-0 w-36 flex-shrink-0" 
          />
          <Input 
            label="End Date" 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            containerClassName="mb-0 w-36 flex-shrink-0" 
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: PaymentStatus.PENDING, label: 'Pending' },
              { value: PaymentStatus.APPROVED, label: 'Approved' },
              { value: PaymentStatus.NOT_APPROVED, label: 'Not Approved' },
            ]}
            containerClassName="mb-0 w-36 flex-shrink-0"
          />
          <Select
            label="Method"
            value={filters.selectedMethodFilter}
            onChange={(e) => filters.setSelectedMethodFilter(e.target.value)}
            options={paymentMethodFilterOptions}
            containerClassName="mb-0 w-40 flex-shrink-0"
          />
          <div className="flex flex-col flex-shrink-0">
            <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">
              Sort
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
              className="w-full justify-center min-w-[7rem]"
            >
              {sortOrder === 'latest' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12.75" />
                  </svg>
                  Latest First
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12.75m0 0l-3-3m3 3l3-3" />
                  </svg>
                  Oldest First
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={() => { const today = getTodayInYangon(); setStartDate(today); setEndDate(today); setStatusFilter(''); filters.resetAllFilters?.(); setCurrentPage(1); }} variant="ghost" size="sm">Reset</Button>
            <Button onClick={() => { const today = getTodayInYangon(); setStartDate(today); setEndDate(today); setCurrentPage(1); }} variant="secondary" size="sm">Today</Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div className="text-sm text-text-secondary dark:text-slate-400">
          {displayRows.length > 0
            ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, displayRows.length)} of ${displayRows.length} entries`
            : 'No entries'}
        </div>
        {displayRows.length > ITEMS_PER_PAGE && (
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const showPages = 5;
                if (totalPages <= 9) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                  const end = Math.min(totalPages, start + showPages - 1);
                  if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);
                  if (start > 1) pages.push(1, 'ellipsis');
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages) pages.push('ellipsis', totalPages);
                }
                return pages.map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={currentPage === p ? 'primary' : 'secondary'}
                      size="sm"
                      className="min-w-[2rem]"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  )
                );
              })()}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
      <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {isLoading && filteredPayments.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No client payments found for the selected criteria.</p>
        ) : (
          <div className="overflow-auto flex-1 min-h-0">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 table-fixed">
              <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={(e) => handleSelectAllVisible(e.target.checked)}
                      className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Receipt No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business / Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Applied To</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Date</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
                        className="!p-1 h-6 w-6"
                        title={sortOrder === 'latest' ? 'Sort: Latest First (click for Oldest First)' : 'Sort: Oldest First (click for Latest First)'}
                      >
                        {sortOrder === 'latest' ? '↓' : '↑'}
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Remark</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {visibleDisplayRows.map((row) => {
                  if (row.type === 'group') {
                    const { groupKey, payments: filteredGroupPayments } = row;
                    const hasPendingPayments = filteredGroupPayments.some(p => p.status === PaymentStatus.PENDING);
                    const groupTotal = filteredGroupPayments.reduce((sum, p) => sum + p.amountMMK, 0);
                    const groupPaymentDate = filteredGroupPayments[0]?.paymentDate || '';
                    const saleIds = filteredGroupPayments.map(p => p.saleRecordId).filter(Boolean);
                    const receiptNumbers = filteredGroupPayments.map(p => p.receiptNumber || p.id).filter(Boolean);
                    const uniqueMethods = Array.from(new Set(filteredGroupPayments.map(p => p.method))).join(', ');
                    const allStatuses = Array.from(new Set(filteredGroupPayments.map(p => p.status)));
                    const isAllApproved = allStatuses.length === 1 && allStatuses[0] === PaymentStatus.APPROVED;
                    const isAllPending = allStatuses.length === 1 && allStatuses[0] === PaymentStatus.PENDING;
                    const allPaymentIds = filteredGroupPayments.map(p => p.id);
                    const allSelected = allPaymentIds.every(id => selectedPaymentIds.has(id));
                    const firstPayment = filteredGroupPayments[0];

                    return (
                          <tr key={`group-${groupKey}`} className="bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600">
                            <td className="pl-6 pr-4 py-3">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const newSet = new Set(selectedPaymentIds);
                                  if (e.target.checked) {
                                    allPaymentIds.forEach(id => newSet.add(id));
                                  } else {
                                    allPaymentIds.forEach(id => newSet.delete(id));
                                  }
                                  setSelectedPaymentIds(newSet);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <div>
                                  <div className="font-semibold">{receiptNumbers.join(', ')}</div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400">Group ({filteredGroupPayments.length} payments)</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {isAllApproved ? (
                                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[PaymentStatus.APPROVED] || 'bg-gray-100 text-gray-700'}`}>
                                  Approved
                                </span>
                              ) : isAllPending ? (
                                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[PaymentStatus.PENDING] || 'bg-gray-100 text-gray-700'}`}>
                                  Pending
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  Mixed
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div>
                                <div className="font-medium text-text-primary dark:text-slate-200">
                                  {firstPayment.businessId ? (
                                    <Link to={`/businesses/${firstPayment.businessId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>
                                      {getBusinessName(firstPayment.businessId, businesses)}
                                    </Link>
                                  ) : formatPaymentBusinessLabel(firstPayment, businesses)}
                                </div>
                                <div className="text-xs text-text-secondary dark:text-slate-400">
                                  {firstPayment.clientId ? (
                                    <Link to={`/clients/${firstPayment.clientId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>
                                      {getClientName(firstPayment.clientId, clients)}
                                    </Link>
                                  ) : getClientName(firstPayment.clientId, clients)}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                              <div className="font-medium">{saleIds.join(', ')}</div>
                              <div className="text-xs text-text-tertiary dark:text-slate-500">({saleIds.length} sale{saleIds.length > 1 ? 's' : ''})</div>
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-text-primary dark:text-slate-200 font-semibold">{groupTotal.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDate(groupPaymentDate)}</td>
                            <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{uniqueMethods}</td>
                            <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                              <span className="truncate max-w-xs" title={firstPayment.remark}>{firstPayment.remark || '-'}</span>
                            </td>
                            <td className="px-4 py-2">
                              {canEditPayments && (
                              <div className="flex flex-wrap gap-1">
                                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setEditingPayment(firstPayment); setIsRecordPaymentModalOpen(true); }}>
                                  Edit
                                </Button>
                                {hasPendingPayments && hasPermission(Permission.APPROVE_PAYMENT) && (
                                  <Button variant="success" size="sm" onClick={(e) => { e.stopPropagation(); handleApprovePaymentGroup(groupKey); }}>
                                    Approve Group
                                  </Button>
                                )}
                                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePayment(filteredGroupPayments[0].id); }}>
                                  Delete
                                </Button>
                              </div>
                              )}
                            </td>
                          </tr>
                    );
                  }

                  // Single payment row
                  const payment = row.payment;
                  return (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedPaymentIds.has(payment.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(selectedPaymentIds);
                                if (e.target.checked) {
                                  newSet.add(payment.id);
                                } else {
                                  newSet.delete(payment.id);
                                }
                                setSelectedPaymentIds(newSet);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{payment.receiptNumber || payment.id}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                              {payment.status}
              </span>
                          </td>
                          <td className="px-4 py-2">
              <div>
                <div className="font-medium text-text-primary dark:text-slate-200">
                                {payment.businessId ? (
                                  <Link to={`/businesses/${payment.businessId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>
                                    {getBusinessName(payment.businessId, businesses)}
                                  </Link>
                                ) : formatPaymentBusinessLabel(payment, businesses)}
                </div>
                <div className="text-xs text-text-secondary dark:text-slate-400">
                                {payment.clientId ? (
                                  <Link to={`/clients/${payment.clientId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>
                                    {getClientName(payment.clientId, clients)}
                                  </Link>
                                ) : getClientName(payment.clientId, clients)}
                </div>
              </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                            {payment.invoiceId ? (
                              <div className="font-medium">
                                Invoice:{' '}
                                <Link
                                  to={`/sales/invoices/${payment.invoiceId}`}
                                  className="text-primary-action hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {payment.invoiceId}
                                </Link>
                                {payment.saleAllocations && payment.saleAllocations.length > 0 && (
                                  <div className="text-xs text-text-secondary dark:text-slate-400 mt-1">
                                    Sales:{' '}
                                    {payment.saleAllocations.map((allocation, idx) => (
                                      <span key={`${payment.id}-alloc-${allocation.saleRecordId}`}>
                                        <Link
                                          to={`/sales/${allocation.saleRecordId}`}
                                          className="text-primary-action hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {allocation.saleRecordId}
                                        </Link>
                                        {idx < payment.saleAllocations!.length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : payment.saleAllocations && payment.saleAllocations.length > 0 ? (
                              <div className="font-medium">
                                Sales:{' '}
                                {payment.saleAllocations.map((allocation, idx) => (
                                  <span key={`${payment.id}-alloc-${allocation.saleRecordId}`}>
                                    <Link
                                      to={`/sales/${allocation.saleRecordId}`}
                                      className="text-primary-action hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {allocation.saleRecordId}
                                    </Link>
                                    {idx < payment.saleAllocations!.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            ) : payment.saleRecordId ? (
                              <div className="font-medium">
                                Sale:{' '}
                                <Link
                                  to={`/sales/${payment.saleRecordId}`}
                                  className="text-primary-action hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {payment.saleRecordId}
                                </Link>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium">General Payment</div>
                                {payment.status === PaymentStatus.APPROVED && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    ✓ Auto-allocated to sales (oldest first)
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-text-primary dark:text-slate-200 font-medium">{payment.amountMMK.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDate(payment.paymentDate)}</td>
                          <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{payment.method}</td>
                          <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                            <span className="truncate max-w-xs" title={payment.remark}>{payment.remark || '-'}</span>
                          </td>
                          <td className="px-4 py-2">
                            {canEditPayments && (
                            <div className="flex flex-wrap gap-1">
                              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setEditingPayment(payment); setIsRecordPaymentModalOpen(true); }}>
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePayment(payment.id); }}>
                                Delete
                              </Button>
                            </div>
                            )}
                          </td>
                        </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectingPaymentId && (
        <Modal
          isOpen={!!rejectingPaymentId}
          onClose={() => {
            setRejectingPaymentId(null);
            setRejectReason('');
          }}
          title="Reject Payment"
        >
          <div className="space-y-4">
            <Input
              label="Rejection Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              required
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectingPaymentId(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleRejectPayment(rejectingPaymentId)}
                disabled={!rejectReason.trim()}
              >
                Reject Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {isRecordPaymentModalOpen && user && (
        <RecordPaymentModal 
          isOpen={isRecordPaymentModalOpen}
          onClose={() => { setEditingPayment(null); setIsRecordPaymentModalOpen(false); }}
          onSuccess={() => {
            setEditingPayment(null);
            setIsRecordPaymentModalOpen(false);
            refetch();
          }}
          clients={clients}
          businesses={businesses}
          invoices={allInvoices}
          sales={allSales}
          payments={allPayments}
          creditNotes={allCreditNotes}
          paymentMethods={paymentMethods}
          cashAccounts={cashAccounts}
          editingPayment={editingPayment ?? undefined}
        />
      )}
    </div>
  );
};

export default PaymentsReceiptsPage;

