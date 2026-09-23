import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Quotation, QuotationStatus, Client, Business, Service } from '../../types';
import { 
    apiGetQuotations, 
    apiGetQuotationsForPeriod, 
    apiUpdateQuotation, 
    apiCreateInvoiceFromQuotation, 
    apiGetClients, 
    apiGetBusinesses,
    apiGetServices,
    apiDeleteQuotation
} from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import RefreshButton from '../ui/RefreshButton';
const CreateEditQuotationModal = lazy(() => import('../finance/modals/CreateEditQuotationModal'));
// Removed STATUS_COLORS import to avoid circular dependency
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/Input'; 
import Select from '../ui/Select'; 
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { formatDateForDisplay, getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';
import { subscribeRefreshData } from '../../utils/refreshDataBus';
import { Link, useNavigate } from 'react-router-dom';

const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeServices, setActiveServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuotationStatus | ''>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Latest to Oldest (default)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    return getDateInYangonTimezone(start);
  });
  const [endDate, setEndDate] = useState(() => getTodayInYangon());
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usePeriodFilter = startDate && endDate;
      const [fetchedQuotations, fetchedClients, fetchedBusinesses, fetchedServices] = await Promise.all([
        usePeriodFilter ? apiGetQuotationsForPeriod(startDate, endDate) : apiGetQuotations(),
        apiGetClients(),
        apiGetBusinesses(),
        apiGetServices(),
      ]);
      setQuotations(fetchedQuotations);
      setClients(fetchedClients);
      setBusinesses(fetchedBusinesses);
      setActiveServices(fetchedServices.filter(s => s.isActive));
    } catch (error) {
      addNotification("Failed to load quotations data.", "error");
      console.error("Failed to fetch data:", error);
    }
    setIsLoading(false);
  }, [addNotification, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for global refresh events (debounced)
  useEffect(() => {
    return subscribeRefreshData(() => {
      fetchData();
    });
  }, [fetchData]);

  const handleAddOrUpdateQuotation = () => {
    fetchData();
    setIsModalOpen(false);
    setEditingQuotation(null);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (quotationId: string, status: QuotationStatus) => {
    if (!user) return;
    try {
      await apiUpdateQuotation({ id: quotationId, status });
      addNotification(`Quotation status updated to ${status}.`, "success");
      fetchData();
    } catch (error) {
      addNotification(`Failed to update status: ${(error as Error).message}`, "error");
    }
  };

  const handleConvertToInvoice = async (quotationId: string) => {
    if (!user) return;
    const confirmed = await showConfirmation({
      title: 'Convert to Invoice',
      message: "Are you sure you want to convert this quotation to an invoice? This cannot be undone.",
      confirmText: 'Convert',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });
    if (!confirmed) return;
    try {
      const newInvoice = await apiCreateInvoiceFromQuotation(quotationId);
      addNotification(`Invoice ${newInvoice.id} created successfully from quotation!`, "success");
      fetchData();
    } catch (error) {
      addNotification(`Failed to convert to invoice: ${(error as Error).message}`, "error");
    }
  };
  
  const handleDeleteQuotation = async (quotationId: string) => {
    const confirmed = await showConfirmation({
      title: 'Delete Quotation',
      message: "Are you sure you want to delete this quotation? This cannot be undone.",
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeleteQuotation(quotationId);
        addNotification("Quotation deleted successfully.", "success");
        setSelectedQuotationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(quotationId);
          return newSet;
        });
        fetchData();
      } catch (error) {
        addNotification(`Failed to delete quotation: ${(error as Error).message}`, "error");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuotationIds.size === 0) return;
    
    const quotationsToDelete = filteredQuotations.filter(q => selectedQuotationIds.has(q.id));
    const hasConverted = quotationsToDelete.some(q => 
      (q.status === QuotationStatus.CONVERTED_TO_INVOICE || q.status === QuotationStatus.CONVERTED_TO_SALE) &&
      !!q.invoiceId
    );
    
    if (hasConverted) {
      addNotification("Cannot delete quotations that have been converted and linked. Please deselect those quotations.", "error");
      return;
    }

    const confirmed = await showConfirmation({
      title: 'Bulk Delete Quotations',
      message: `Are you sure you want to delete ${selectedQuotationIds.size} quotation(s)? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    
    if (!confirmed) return;
    
    setIsBulkActionLoading(true);
    try {
      const deletePromises = [...selectedQuotationIds].map((id: string) => apiDeleteQuotation(id));
      await Promise.all(deletePromises);
      addNotification(`${selectedQuotationIds.size} quotation(s) deleted successfully.`, "success");
      setSelectedQuotationIds(new Set());
      fetchData();
    } catch (error) {
      addNotification(`Failed to delete quotations: ${(error as Error).message}`, "error");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSelectQuotation = (quotationId: string, checked: boolean) => {
    setSelectedQuotationIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(quotationId);
      } else {
        newSet.delete(quotationId);
      }
      return newSet;
    });
  };

  // Define helper functions BEFORE filteredQuotations (fixes temporal dead zone error)
  const getClientName = useCallback((clientId: string) => {
    if (!clientId) return 'N/A';
    return clients.find(c => c.id === clientId)?.name || clientId;
  }, [clients]);
  
  const getBusinessName = useCallback((businessId: string) => {
    if (!businessId) return 'N/A';
    return businesses.find(b => b.id === businessId)?.name || businessId;
  }, [businesses]);
  
  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return formatDateForDisplay(dateString);
    } catch (error) {
      return 'Invalid Date';
    }
  }, []);
  
  // Local status color function to avoid circular dependency with constants
  const getStatusColor = useCallback((status: QuotationStatus | string): string => {
    const statusColors: Record<string, string> = {
      [QuotationStatus.DRAFT]: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200',
      [QuotationStatus.ACCEPTED]: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      [QuotationStatus.CONVERTED_TO_INVOICE]: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
      [QuotationStatus.CONVERTED_TO_SALE]: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    };
    return statusColors[status] || 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200';
  }, []);

  // Define filteredQuotations AFTER helper functions (fixes temporal dead zone error)
  const filteredQuotations = useMemo(() => {
    if (!quotations || quotations.length === 0) return [];
    
    const filtered = quotations.filter(q => {
      if (!q || !q.id) return false;
      
      const statusMatch = !filterStatus || q.status === filterStatus;
      const quoteDate = new Date(q.issueDate);
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        const dateMatch = (!start || quoteDate >= start) && (!end || quoteDate <= end);
        if (!dateMatch) return false;
      }
      const term = searchTerm.toLowerCase();
      const searchMatch = !term ||
        (q.id && q.id.toLowerCase().includes(term)) ||
        (q.clientId && getClientName(q.clientId).toLowerCase().includes(term)) ||
        (q.businessId && getBusinessName(q.businessId).toLowerCase().includes(term)) ||
        (q.notes && q.notes.toLowerCase().includes(term));
      return statusMatch && searchMatch;
    });

    // Sort by issue date
    return [...filtered].sort((a, b) => {
      if (!a.issueDate || !b.issueDate) return 0;
      const dateA = new Date(a.issueDate).getTime();
      const dateB = new Date(b.issueDate).getTime();
      if (isNaN(dateA) || isNaN(dateB)) return 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [quotations, filterStatus, searchTerm, sortOrder, getClientName, getBusinessName, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE));
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotations, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, startDate, endDate, sortOrder]);

  const quoteKpis = useMemo(() => {
    const totalValue = filteredQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const pendingCount = filteredQuotations.filter(q => q.status === QuotationStatus.DRAFT || q.status === QuotationStatus.SENT).length;
    return { count: filteredQuotations.length, totalValue, pendingCount };
  }, [filteredQuotations]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotationIds(prev => {
        const next = new Set(prev);
        paginatedQuotations.forEach(q => next.add(q.id));
        return next;
      });
    } else {
      setSelectedQuotationIds(prev => {
        const next = new Set(prev);
        paginatedQuotations.forEach(q => next.delete(q.id));
        return next;
      });
    }
  };

  const isAllSelected = paginatedQuotations.length > 0 && paginatedQuotations.every(q => selectedQuotationIds.has(q.id));
  const isSomeSelected = paginatedQuotations.some(q => selectedQuotationIds.has(q.id)) && !isAllSelected;
  const selectedQuotations = filteredQuotations.filter(q => selectedQuotationIds.has(q.id));
  const selectedQuotation = selectedQuotations.length === 1 ? selectedQuotations[0] : null;
  const selectedIsConverted = selectedQuotation
    ? [QuotationStatus.CONVERTED_TO_INVOICE, QuotationStatus.CONVERTED_TO_SALE].includes(selectedQuotation.status)
    : false;

  if (isLoading && quotations.length === 0) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Quotations</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchData} isLoading={isLoading} />
          {selectedQuotationIds.size > 0 && (
            <>
              {selectedQuotation && (
                <>
                  <Button variant="secondary" onClick={() => handleEditQuotation(selectedQuotation)}>
                    Edit
                  </Button>
                  {(selectedQuotation.status === QuotationStatus.DRAFT || selectedQuotation.status === QuotationStatus.SENT) && (
                    <>
                      <Button variant="success" onClick={() => handleUpdateStatus(selectedQuotation.id, QuotationStatus.ACCEPTED)}>
                        Accept
                      </Button>
                      <Button variant="danger" onClick={() => handleUpdateStatus(selectedQuotation.id, QuotationStatus.REJECTED)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {selectedQuotation.status === QuotationStatus.ACCEPTED && (
                    <Button variant="primary" onClick={() => handleConvertToInvoice(selectedQuotation.id)}>
                      Convert to Invoice
                    </Button>
                  )}
                  {(!selectedIsConverted || (selectedQuotation.status === QuotationStatus.CONVERTED_TO_INVOICE && !selectedQuotation.invoiceId)) && (
                    <Button variant="danger" onClick={() => handleDeleteQuotation(selectedQuotation.id)}>
                      Delete
                    </Button>
                  )}
                </>
              )}
              {!selectedQuotation && (
                <Button 
                  variant="danger" 
                  onClick={handleBulkDelete}
                  isLoading={isBulkActionLoading}
                >
                  Delete ({selectedQuotationIds.size})
                </Button>
              )}
            </>
          )}
          <Button onClick={() => { setEditingQuotation(null); setIsModalOpen(true); }} variant="primary" disabled={activeServices.length === 0 && !isLoading}>
            + New Quotation
          </Button>
        </div>
      </div>

      {isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">Loading services for quotation...</p>}
      {!isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">No active services available to create a new quotation.</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Quotations</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{quoteKpis.count}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Value</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{quoteKpis.totalValue.toLocaleString()} MMK</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Pending / Sent</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{quoteKpis.pendingCount}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Search Quotations"
            placeholder="ID, Client, Business, Notes..."
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
            label="Filter by Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as QuotationStatus | '')}
            options={[
              { value: '', label: 'All Statuses' },
              ...Object.values(QuotationStatus).map(s => ({ value: s, label: s }))
            ]}
            containerClassName="mb-0"
          />
          <div className="mb-0 md:col-span-4 lg:col-span-1">
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Sort by Date</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="w-full !py-2"
            >
              {sortOrder === 'desc' ? 'Latest to Oldest ↓' : 'Oldest to Latest ↑'}
            </Button>
          </div>
        </div>
      </div>

      {isLoading && quotations.length > 0 ? (
        <div className="text-center py-4"><Spinner /> Loading more...</div>
      ) : null}

      {/* Pagination bar */}
      {filteredQuotations.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotations.length)} of {filteredQuotations.length} quotations
          </div>
          {filteredQuotations.length > ITEMS_PER_PAGE && (
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

      {filteredQuotations.length > 0 ? (
        <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected && !isAllSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                  />
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business / Client</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Issue Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Expiry Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total (MMK)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {paginatedQuotations.map(q => {
                const canDelete = !(q.status === QuotationStatus.CONVERTED_TO_INVOICE || q.status === QuotationStatus.CONVERTED_TO_SALE) || !q.invoiceId;
                return (
                  <tr 
                    key={q.id} 
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => navigate(`/sales/quotations/${q.id}`)}
                  >
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedQuotationIds.has(q.id)}
                        onChange={(e) => handleSelectQuotation(q.id, e.target.checked)}
                        disabled={!canDelete}
                        className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!canDelete ? "Cannot delete converted quotations" : ""}
                      />
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">{q.id}</td>
                    <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">
                      <div>
                        <div className="font-medium">{getBusinessName(q.businessId)}</div>
                        <div className="text-xs text-text-secondary dark:text-slate-400">{getClientName(q.clientId)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDate(q.issueDate)}</td>
                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{q.expiryDate ? formatDate(q.expiryDate) : 'N/A'}</td>
                    <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200 text-right">{(q.grandTotal || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-text-secondary dark:text-slate-400 py-8">No quotations found matching your criteria.</p>
      )}

      {isModalOpen && user && (
        <Suspense fallback={<Spinner />}>
          <CreateEditQuotationModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingQuotation(null); }}
            onSubmit={handleAddOrUpdateQuotation}
            clients={clients}
            businesses={businesses}
            activeServices={activeServices}
            loggedInUserId={user.id}
            editingQuotation={editingQuotation}
          />
        </Suspense>
      )}
    </div>
  );
};

export default QuotationsPage;

