import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Refund, Client, Business, RefundStatus, CashAccount, User } from '../../types';
import { 
  apiGetRefunds,
  apiGetRefundsForPeriod,
  apiDeleteRefund,
  apiProcessRefund,
  apiGetClients,
  apiGetBusinesses,
  apiGetCashAccounts,
  apiGetUsers,
} from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAuth } from '../../hooks/useAuth';
import RecordRefundModal from './modals/RecordRefundModal';
import Modal from '../ui/Modal';
import { formatDateForDisplay, getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';

const RefundsTab: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingRefund, setEditingRefund] = useState<Refund | null>(null);
  const [processingRefund, setProcessingRefund] = useState<Refund | null>(null);
  const [selectedCashAccount, setSelectedCashAccount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filters - default last 90 days to reduce Firestore reads
  const [statusFilter, setStatusFilter] = useState<'all' | RefundStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 90);
    return getDateInYangonTimezone(start);
  });
  const [endDate, setEndDate] = useState(() => getTodayInYangon());
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usePeriodFilter = startDate && endDate;
      const [
        fetchedRefunds,
        fetchedClients,
        fetchedBusinesses,
        fetchedCashAccounts,
        fetchedUsers,
      ] = await Promise.all([
        usePeriodFilter ? apiGetRefundsForPeriod(startDate, endDate) : apiGetRefunds(),
        apiGetClients(),
        apiGetBusinesses(),
        apiGetCashAccounts(),
        apiGetUsers(),
      ]);
      
      setRefunds(fetchedRefunds);
      setClients(fetchedClients);
      setBusinesses(fetchedBusinesses);
      setCashAccounts(fetchedCashAccounts.filter(acc => acc.isActive));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading refunds:', error);
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRefunds = useMemo(() => {
    let filtered = [...refunds];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const client = clients.find(c => c.id === r.clientId);
        const business = r.businessId ? businesses.find(b => b.id === r.businessId) : null;
        
        return (
          r.id.toLowerCase().includes(searchLower) ||
          (client?.name || '').toLowerCase().includes(searchLower) ||
          (business?.name || '').toLowerCase().includes(searchLower) ||
          (r.reason || '').toLowerCase().includes(searchLower) ||
          (r.description || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(r => r.refundDate >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => r.refundDate <= endDate);
    }

    return filtered.sort((a, b) => new Date(b.refundDate).getTime() - new Date(a.refundDate).getTime());
  }, [refunds, statusFilter, searchTerm, startDate, endDate, clients, businesses]);

  const totalPages = Math.max(1, Math.ceil(filteredRefunds.length / ITEMS_PER_PAGE));
  const paginatedRefunds = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRefunds.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRefunds, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, startDate, endDate]);

  const handleOpenModal = (refund: Refund | null = null) => {
    setEditingRefund(refund);
    setIsModalOpen(true);
  };

  const handleOpenProcessModal = (refund: Refund) => {
    setProcessingRefund(refund);
    setSelectedCashAccount(cashAccounts.find(acc => acc.accountType === 'Bank Account')?.id || cashAccounts[0]?.id || '');
    setIsProcessModalOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!processingRefund || !selectedCashAccount || !user) {
      addNotification('Please select a cash account.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await apiProcessRefund(processingRefund.id, selectedCashAccount, user.id);
      addNotification('Refund processed successfully.', 'success');
      setIsProcessModalOpen(false);
      setProcessingRefund(null);
      fetchData();
    } catch (error) {
      addNotification(`Failed to process refund: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRefund = async (refund: Refund) => {
    const confirmed = await showConfirmation({
      title: 'Delete Refund',
      message: `Are you sure you want to delete refund ${refund.id}? This will reverse the balance changes.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    
    if (confirmed) {
      try {
        await apiDeleteRefund(refund.id);
        addNotification('Refund deleted successfully.', 'success');
        fetchData();
      } catch (error) {
        addNotification(`Failed to delete refund: ${(error as Error).message}`, 'error');
      }
    }
  };

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || clientId;
  const getBusinessName = (businessId: string) => businesses.find(b => b.id === businessId)?.name || businessId;
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;
  const getCashAccountName = (accountId?: string) => accountId ? (cashAccounts.find(a => a.id === accountId)?.name || accountId) : '-';

  const refundKpis = useMemo(() => {
    const pendingTotal = filteredRefunds.filter(r => r.status === RefundStatus.PENDING).reduce((sum, r) => sum + r.amountMMK, 0);
    const processedTotal = filteredRefunds.filter(r => r.status === RefundStatus.PROCESSED).reduce((sum, r) => sum + r.amountMMK, 0);
    const pendingCount = filteredRefunds.filter(r => r.status === RefundStatus.PENDING).length;
    const processedCount = filteredRefunds.filter(r => r.status === RefundStatus.PROCESSED).length;
    return { count: filteredRefunds.length, pendingTotal, processedTotal, pendingCount, processedCount };
  }, [filteredRefunds]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Refunds</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Manage refunds. Refunds increase client/business balances and create Accounts Payable entries.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary">+ Record Refund</Button>
      </div>

      {/* Summary Cards (KPI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Refunds</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{refundKpis.count}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl shadow p-4 border-2 border-yellow-400 dark:border-yellow-600">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pending Refunds</p>
          <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
            {refundKpis.pendingTotal.toLocaleString()} MMK
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            {refundKpis.pendingCount} refund(s)
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl shadow p-4 border-2 border-green-400 dark:border-green-600">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Processed Refunds</p>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">
            {refundKpis.processedTotal.toLocaleString()} MMK
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {refundKpis.processedCount} refund(s)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by ID, client, reason..."
            containerClassName="lg:col-span-2 mb-0"
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | RefundStatus)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: RefundStatus.PENDING, label: 'Pending' },
              { value: RefundStatus.PROCESSED, label: 'Processed' },
              { value: RefundStatus.CANCELLED, label: 'Cancelled' },
            ]}
            containerClassName="mb-0"
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
        </div>
        {(searchTerm || statusFilter !== 'all' || startDate || endDate) && (
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Pagination bar */}
      {filteredRefunds.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredRefunds.length)} of {filteredRefunds.length} refunds
          </div>
          {filteredRefunds.length > ITEMS_PER_PAGE && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
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
                    p === 'ellipsis' ? <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span> : (
                      <Button key={p} variant={currentPage === p ? 'primary' : 'secondary'} size="sm" className="min-w-[2rem]" onClick={() => setCurrentPage(p)}>{p}</Button>
                    )
                  );
                })()}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
            </nav>
          )}
        </div>
      )}

      {/* Refunds Table */}
      {filteredRefunds.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-12 text-center">
          <p className="text-text-secondary dark:text-slate-400">
            {refunds.length === 0 ? 'No refunds recorded yet.' : 'No refunds match the current filters.'}
          </p>
          {refunds.length === 0 && (
            <Button onClick={() => handleOpenModal()} variant="primary" className="mt-4">
              + Record First Refund
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Refund Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Business</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Cash Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recorded By</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedRefunds.map(refund => (
                  <tr key={refund.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                      {formatDateForDisplay(refund.refundDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                      {getClientName(refund.clientId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                      {getBusinessName(refund.businessId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-text-primary dark:text-slate-200">
                      {refund.amountMMK.toLocaleString()} MMK
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          refund.status === RefundStatus.PROCESSED
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : refund.status === RefundStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                      {getCashAccountName(refund.cashAccountId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                      {getUserName(refund.recordedByUserId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-1">
                      {refund.status === RefundStatus.PENDING && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(refund)}>Edit</Button>
                          <Button variant="primary" size="sm" onClick={() => handleOpenProcessModal(refund)}>Process</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteRefund(refund)}>Delete</Button>
                        </>
                      )}
                      {refund.status === RefundStatus.PROCESSED && (
                        <span className="text-xs text-text-secondary dark:text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record/Edit Refund Modal */}
      <RecordRefundModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRefund(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingRefund(null);
          fetchData();
        }}
                    clients={clients}
                    businesses={businesses}
                    editingRefund={editingRefund}
      />

      {/* Process Refund Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false);
          setProcessingRefund(null);
        }}
        title={`Process Refund ${processingRefund?.id}`}
      >
        <div className="space-y-4">
          {processingRefund && (
            <>
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-text-secondary dark:text-slate-400">Refund Amount</p>
                <p className="text-2xl font-bold text-text-primary dark:text-slate-200">
                  {processingRefund.amountMMK.toLocaleString()} MMK
                </p>
              </div>
              <Select
                label="Cash Account*"
                value={selectedCashAccount}
                onChange={e => setSelectedCashAccount(e.target.value)}
                options={[
                  { value: '', label: '-- Select Account --' },
                  ...cashAccounts
                    .filter(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet' || acc.accountType === 'Cash')
                    .map(acc => {
                      // Calculate balance using formula: (initialBalance + totalInflow) - totalOutflow
                      const calculatedBalance = ((acc.initialBalance || 0) + (acc.totalInflow || 0)) - (acc.totalOutflow || 0);
                      const displayName = acc.accountType === 'Bank Account' 
                        ? (acc.bankName || acc.name)
                        : acc.accountType === 'Mobile Wallet'
                        ? (acc.walletProvider || acc.name)
                        : acc.name;
                      const last4Digits = acc.accountType === 'Bank Account' 
                        ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                        : acc.accountType === 'Mobile Wallet'
                        ? (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '')
                        : '';
                      const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
                      const accountLabel = acc.accountType === 'Cash'
                        ? acc.name
                        : `${acc.name} - ${displayName}${digitsDisplay}`;
                      return {
                        value: acc.id,
                        label: `${accountLabel} (Balance: ${calculatedBalance.toLocaleString()} MMK)`
                      };
                    })
                ]}
                required
              />
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsProcessModalOpen(false);
                    setProcessingRefund(null);
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleProcessRefund}
                  isLoading={isProcessing}
                  disabled={!selectedCashAccount}
                >
                  Process Refund
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RefundsTab;







