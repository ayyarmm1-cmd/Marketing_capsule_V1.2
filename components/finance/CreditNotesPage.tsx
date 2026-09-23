import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CreditNote, Client, Business, CreditNoteStatus, CashAccount, User, SaleRecord, Permission } from '../../types';
import { 
  apiGetCreditNotes,
  apiGetCreditNotesForPeriod,
  apiDeleteCreditNote,
  apiApproveCreditNote,
  apiGetClients,
  apiGetBusinesses,
  apiGetCashAccounts,
  apiGetUsers,
  apiGetSalesForPeriod,
} from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAuth } from '../../hooks/useAuth';
import RecordCreditNoteModal from './modals/RecordCreditNoteModal';
import Modal from '../ui/Modal';
import { formatDateForDisplay, getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';

const CreditNotesPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  
  const canManageAccountsPayable = hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE);
  
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCreditNote, setEditingCreditNote] = useState<CreditNote | null>(null);
  
  // Filters - default to last 30 days to reduce Firestore reads
  const [statusFilter, setStatusFilter] = useState<'all' | CreditNoteStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    return getDateInYangonTimezone(start);
  });
  const [endDate, setEndDate] = useState(() => getTodayInYangon());
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use period-filtered API when dates are set to reduce Firestore reads
      const usePeriodFilter = startDate && endDate;
      const salesStart = usePeriodFilter ? startDate : getDateInYangonTimezone(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
      const salesEnd = usePeriodFilter ? endDate : getTodayInYangon();
      const [
        fetchedCreditNotes,
        fetchedClients,
        fetchedBusinesses,
        fetchedCashAccounts,
        fetchedUsers,
        fetchedSales,
      ] = await Promise.all([
        usePeriodFilter ? apiGetCreditNotesForPeriod(startDate, endDate) : apiGetCreditNotes(500),
        apiGetClients(),
        apiGetBusinesses(),
        apiGetCashAccounts(),
        apiGetUsers(),
        apiGetSalesForPeriod(salesStart, salesEnd),
      ]);
      setCreditNotes(fetchedCreditNotes);
      setClients(fetchedClients);
      setBusinesses(fetchedBusinesses);
      setCashAccounts(fetchedCashAccounts.filter(acc => acc.isActive));
      setUsers(fetchedUsers);
      setSales(fetchedSales);
    } catch (error) {
      console.error('Error loading credit notes:', error);
      addNotification('Failed to load credit notes.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = async () => {
    try {
      if (clients.length === 0 || businesses.length === 0) {
        const [fetchedClients, fetchedBusinesses] = await Promise.all([
          apiGetClients(),
          apiGetBusinesses(),
        ]);
        setClients(fetchedClients);
        setBusinesses(fetchedBusinesses);
      }
      setEditingCreditNote(null);
      setIsModalOpen(true);
    } catch (error) {
      addNotification('Failed to load necessary data.', 'error');
    }
  };

  const handleEdit = (creditNote: CreditNote) => {
    setEditingCreditNote(creditNote);
    setIsModalOpen(true);
  };

  const handleDelete = async (creditNote: CreditNote) => {
    if (!canManageAccountsPayable) {
      addNotification('You do not have permission to delete credit notes.', 'error');
      return;
    }

    if (creditNote.status !== CreditNoteStatus.PENDING && creditNote.status !== CreditNoteStatus.APPROVED) {
      addNotification(`Cannot delete credit note with status ${creditNote.status}. Only PENDING or APPROVED credit notes can be deleted.`, 'error');
      return;
    }

    const warningMessage = creditNote.status === CreditNoteStatus.APPROVED
      ? `This will permanently delete the APPROVED credit note and reverse its balance effect. This action cannot be undone.`
      : 'This action cannot be undone. This will permanently remove the credit note record.';

    const confirmed = await showConfirmation(
      `Delete Credit Note ${creditNote.id}?`,
      warningMessage
    );
    if (!confirmed) return;

    try {
      await apiDeleteCreditNote(creditNote.id);
      addNotification('Credit note deleted successfully.', 'success');
      fetchData();
    } catch (error) {
      addNotification(`Failed to delete credit note: ${(error as Error).message}`, 'error');
    }
  };

  const handleApproveCreditNote = async (creditNoteId: string) => {
    if (!user) {
      addNotification('User information is required.', 'error');
      return;
    }

    try {
      await apiApproveCreditNote(creditNoteId, user.id);
      addNotification('Credit note approved successfully.', 'success');
      fetchData();
    } catch (error) {
      addNotification(`Failed to approve credit note: ${(error as Error).message}`, 'error');
    }
  };

  const handleBulkApproveCreditNotes = async () => {
    if (!user) {
      addNotification('User information is required.', 'error');
      return;
    }

    const pendingCreditNotes = filteredCreditNotes.filter(cn => cn.status === CreditNoteStatus.PENDING);
    if (pendingCreditNotes.length === 0) {
      addNotification('No pending credit notes to approve.', 'warning');
      return;
    }

    try {
      await Promise.all(pendingCreditNotes.map(cn => apiApproveCreditNote(cn.id, user!.id)));
      addNotification(`Approved ${pendingCreditNotes.length} credit note(s) successfully.`, 'success');
      fetchData();
    } catch (error) {
      addNotification(`Failed to approve credit notes: ${(error as Error).message}`, 'error');
    }
  };

  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter(creditNote => {
      if (statusFilter !== 'all' && creditNote.status !== statusFilter) return false;
      if (searchTerm && !creditNote.id.toLowerCase().includes(searchTerm.toLowerCase())) {
        const client = clients.find(c => c.id === creditNote.clientId);
        const business = businesses.find(b => b.id === creditNote.businessId);
        if (!client?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !business?.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      if (startDate && creditNote.creditNoteDate < startDate) return false;
      if (endDate && creditNote.creditNoteDate > endDate) return false;
      return true;
    });
  }, [creditNotes, statusFilter, searchTerm, startDate, endDate, clients, businesses]);

  const totalPages = Math.max(1, Math.ceil(filteredCreditNotes.length / ITEMS_PER_PAGE));
  const paginatedCreditNotes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCreditNotes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCreditNotes, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, startDate, endDate]);

  const totalAmount = useMemo(() => {
    return filteredCreditNotes.reduce((sum, creditNote) => sum + creditNote.amountMMK, 0);
  }, [filteredCreditNotes]);

  const pendingAmount = useMemo(() => {
    return filteredCreditNotes
      .filter(cn => cn.status === CreditNoteStatus.PENDING)
      .reduce((sum, creditNote) => sum + creditNote.amountMMK, 0);
  }, [filteredCreditNotes]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Credit Notes</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Manage credit notes for sales adjustments. Credit notes increase client/business balances and create Accounts Payable entries.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary">+ Credit Note</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Credit Notes</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{filteredCreditNotes.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Amount</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{totalAmount.toLocaleString()} MMK</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Pending Amount</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingAmount.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by ID, client, business..."
            containerClassName="mb-0"
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | CreditNoteStatus)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: CreditNoteStatus.PENDING, label: 'Pending' },
              { value: CreditNoteStatus.APPROVED, label: 'Approved' },
              { value: CreditNoteStatus.CANCELLED, label: 'Cancelled' },
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
      </div>

      {/* Pagination bar */}
      {filteredCreditNotes.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredCreditNotes.length)} of {filteredCreditNotes.length} credit notes
          </div>
          {filteredCreditNotes.length > ITEMS_PER_PAGE && (
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

      {/* Table */}
      <div className="bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Credit Note Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Client</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Sale Record</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Service</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Recorded By</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredCreditNotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-sm text-text-secondary dark:text-slate-400">
                    No credit notes found.
                  </td>
                </tr>
              ) : (
                paginatedCreditNotes.map(creditNote => {
                  const client = clients.find(c => c.id === creditNote.clientId);
                  const business = businesses.find(b => b.id === creditNote.businessId);
                  const recordedBy = users.find(u => u.id === creditNote.recordedByUserId);

                  return (
                    <tr key={creditNote.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">
                        {creditNote.id}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                        {formatDateForDisplay(creditNote.creditNoteDate)}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                        {creditNote.clientId ? (
                          <Link to={`/clients/${creditNote.clientId}`} className="text-primary-action hover:underline">
                            {client?.name || creditNote.clientId}
                          </Link>
                        ) : (
                          client?.name || creditNote.clientId
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                        {creditNote.businessId ? (
                          <Link to={`/businesses/${creditNote.businessId}`} className="text-primary-action hover:underline">
                            {business?.name || creditNote.businessId}
                          </Link>
                        ) : (
                          business?.name || creditNote.businessId
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                        {creditNote.saleRecordId ? (
                          <Link to={`/sales/${creditNote.saleRecordId}`} className="text-primary-action hover:text-blue-700 dark:hover:text-blue-400">
                            {creditNote.saleRecordId}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                        {creditNote.serviceId || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-text-primary dark:text-slate-200">
                        {creditNote.amountMMK.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          creditNote.status === CreditNoteStatus.APPROVED
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : creditNote.status === CreditNoteStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {creditNote.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                        {recordedBy?.name || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {creditNote.status === CreditNoteStatus.PENDING && canManageAccountsPayable && (
                            <Button
                              onClick={() => handleApproveCreditNote(creditNote.id)}
                              variant="success"
                              size="sm"
                            >
                              Approve
                            </Button>
                          )}
                          {(creditNote.status === CreditNoteStatus.PENDING || creditNote.status === CreditNoteStatus.APPROVED) && canManageAccountsPayable && (
                            <Button
                              onClick={() => handleEdit(creditNote)}
                              variant="secondary"
                              size="sm"
                            >
                              Edit
                            </Button>
                          )}
                          {canManageAccountsPayable && (
                            <Button
                              onClick={() => handleDelete(creditNote)}
                              variant="danger"
                              size="sm"
                              disabled={creditNote.status !== CreditNoteStatus.PENDING && creditNote.status !== CreditNoteStatus.APPROVED}
                              title={creditNote.status !== CreditNoteStatus.PENDING && creditNote.status !== CreditNoteStatus.APPROVED ? `Cannot delete credit note with status ${creditNote.status}. Only PENDING or APPROVED credit notes can be deleted.` : creditNote.status === CreditNoteStatus.APPROVED ? 'Delete credit note (will reverse balance effect)' : 'Delete credit note'}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Credit Note Modal */}
      {isModalOpen && (
        <RecordCreditNoteModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCreditNote(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingCreditNote(null);
            fetchData();
          }}
          clients={clients}
          businesses={businesses}
          sales={sales}
          editingCreditNote={editingCreditNote}
        />
      )}

    </div>
  );
};

export default CreditNotesPage;

