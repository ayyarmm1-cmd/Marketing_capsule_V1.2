import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Invoice, InvoiceStatus, Client, Business, SaleRecord, Service, PaymentMethodSetting, UserRole } from '../../types';
import { 
    apiGetInvoices, 
    apiGetInvoicesForPeriod, 
    apiGetClients, 
    apiGetBusinesses, 
    apiCreateInvoiceFromSale, 
    apiGetSalesRecords, 
    apiGetSalesForPeriod, 
    apiUpdateInvoice, 
    apiGetServices, 
    apiDeleteInvoice,
    apiGetPaymentMethodSettings,
    apiGetCashAccounts,
    apiRepairInvoicesFromPayments,
} from '../../services/api';
import Button from '../ui/Button';
import RefreshButton from '../ui/RefreshButton';
import Spinner from '../ui/Spinner';
import CreateEditInvoiceModal from '../finance/modals/CreateEditInvoiceModal';
import RecordPaymentModal from '../finance/modals/RecordPaymentModal';
import { STATUS_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/Input'; 
import Select from '../ui/Select'; 
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { Link, useNavigate } from 'react-router-dom';
import { getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';
import { subscribeRefreshData } from '../../utils/refreshDataBus';

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [pendingSales, setPendingSales] = useState<SaleRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [activeServices, setActiveServices] = useState<Service[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Latest to Oldest
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    return getDateInYangonTimezone(start);
  });
  const [endDate, setEndDate] = useState(() => getTodayInYangon());
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isRecalcLoading, setIsRecalcLoading] = useState(false);
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use period-filtered APIs when dates are set to reduce Firestore reads
      const usePeriodFilter = startDate && endDate;
      const [fetchedInvoices, fetchedClients, fetchedBusinesses, fetchedSales] = await Promise.all([
        usePeriodFilter ? apiGetInvoicesForPeriod(startDate, endDate) : apiGetInvoices(),
        apiGetClients(),
        apiGetBusinesses(),
        usePeriodFilter ? apiGetSalesForPeriod(startDate, endDate) : apiGetSalesRecords()
      ]);
      setInvoices(fetchedInvoices);
      setClients(fetchedClients);
      setBusinesses(fetchedBusinesses);
      setAllSales(fetchedSales);
      
      const invoicedSaleIds = new Set(fetchedInvoices.map(inv => inv.saleRecordId).filter(Boolean));
      setPendingSales(fetchedSales.filter(sale => !invoicedSaleIds.has(sale.id)));
      
      // Set loading to false so UI can render with critical data
      setIsLoading(false);
      
      // Load secondary data in background (non-blocking)
      Promise.all([
        apiGetServices(),
        apiGetCashAccounts(),
        apiGetPaymentMethodSettings()
      ]).then(([fetchedServices, fetchedCashAccounts, fetchedPaymentMethods]) => {
        setActiveServices(fetchedServices.filter(s => s.isActive));
        
        // Convert cash accounts to payment method format (for active accounts)
        const cashAccountMethods: PaymentMethodSetting[] = fetchedCashAccounts
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
        const allMethods = [...cashAccountMethods, ...fetchedPaymentMethods.filter(pm => pm.isActive)];
        setPaymentMethods(allMethods);
        setCashAccounts(fetchedCashAccounts);
      }).catch(error => {
        console.error("Failed to load secondary data:", error);
        // Don't show error notification for secondary data
      });

    } catch (error) {
      console.error("Failed to fetch critical data for invoices:", error);
      addNotification("Failed to load invoice data.", "error");
      setIsLoading(false);
    }
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

  const handleModalSubmit = () => {
    fetchData();
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    try {
      const fetchedServices = await apiGetServices();
      const itemServiceIds = new Set(
        (invoice.items || []).map(i => i.serviceId).filter(Boolean) as string[]
      );
      setActiveServices(fetchedServices.filter(s => s.isActive || itemServiceIds.has(s.id)));
      setEditingInvoice(invoice);
      setIsModalOpen(true);
    } catch {
      setEditingInvoice(invoice);
      setIsModalOpen(true);
    }
  };

  const handleCreateInvoiceFromSale = async (saleId: string) => {
     setIsLoading(true);
     try {
        const newInvoice = await apiCreateInvoiceFromSale(saleId);
        addNotification(`Invoice ${newInvoice.id} created from Sale ${saleId}.`, "success");
        fetchData();
     } catch(error) {
        addNotification(`Failed to create invoice from sale: ${(error as Error).message}`, "error");
     }
     setIsLoading(false);
  }
  
  const handleUpdateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    setIsLoading(true);
    try {
      await apiUpdateInvoice({ id: invoiceId, status });
      addNotification(`Invoice ${invoiceId} status updated to ${status}.`, "success");
      fetchData();
    } catch (error) {
      addNotification(`Failed to update invoice status: ${(error as Error).message}`, "error");
    }
    setIsLoading(false);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const confirmed = await showConfirmation({
      title: 'Delete Invoice',
      message: "Are you sure you want to delete this invoice? This cannot be undone and will update client balances.",
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
        try {
            await apiDeleteInvoice(invoiceId);
            addNotification("Invoice deleted successfully.", "success");
            setSelectedInvoiceIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(invoiceId);
                return newSet;
            });
            fetchData();
        } catch (error) {
            addNotification(`Failed to delete invoice: ${(error as Error).message}`, "error");
        }
    }
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setInvoiceForPayment(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setInvoiceForPayment(null);
    fetchData();
  };

  // Invoice Filters
  const getClientName = useCallback((clientId: string) => clients.find(c => c.id === clientId)?.name || clientId, [clients]);
  const getBusinessName = useCallback((businessId: string) => businesses.find(b => b.id === businessId)?.name || businessId, [businesses]);

  const invoiceDerivedMap = useMemo(() => {
    const map = new Map<string, { amountPaid: number; amountDue: number; status: InvoiceStatus }>();
    invoices.forEach(inv => {
      const amountPaid = inv.amountPaid || 0;
      const amountDue = Math.max((inv.grandTotal || 0) - amountPaid, 0);
      map.set(inv.id, { amountPaid, amountDue, status: inv.status });
    });
    return map;
  }, [invoices]);


  const filteredInvoices = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const derived = invoiceDerivedMap.get(inv.id);
      const statusMatch = !filterStatus || (derived?.status || inv.status) === filterStatus;
      const invoiceDate = new Date(inv.issueDate);
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        const dateMatch = (!start || invoiceDate >= start) && (!end || invoiceDate <= end);
        if (!dateMatch) return false;
      }
      const term = searchTerm.toLowerCase();
      const searchMatch = !term ||
        inv.id.toLowerCase().includes(term) ||
        getClientName(inv.clientId).toLowerCase().includes(term) ||
        getBusinessName(inv.businessId).toLowerCase().includes(term) ||
        inv.notes?.toLowerCase().includes(term) ||
        inv.saleRecordId?.toLowerCase().includes(term) ||
        inv.quotationId?.toLowerCase().includes(term);
      return statusMatch && searchMatch;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.issueDate).getTime();
      const dateB = new Date(b.issueDate).getTime();
      if (dateA !== dateB) {
        return invoiceSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return invoiceSortOrder === 'desc'
        ? b.id.localeCompare(a.id)
        : a.id.localeCompare(b.id);
    });
  }, [invoices, filterStatus, searchTerm, invoiceSortOrder, getClientName, getBusinessName, invoiceDerivedMap, startDate, endDate]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedInvoiceIds.size === 0) return;
    
    const invoicesToDelete = filteredInvoices.filter(inv => selectedInvoiceIds.has(inv.id));
    const hasPayments = invoicesToDelete.some(inv => (invoiceDerivedMap.get(inv.id)?.amountPaid || 0) > 0);
    
    if (hasPayments) {
      addNotification("Cannot delete invoices with payments. Please deselect invoices that have payments.", "error");
      return;
    }

    const confirmed = await showConfirmation({
      title: 'Bulk Delete Invoices',
      message: `Are you sure you want to delete ${selectedInvoiceIds.size} invoice(s)? This cannot be undone and will update client balances.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    
    if (!confirmed) return;
    
    setIsBulkActionLoading(true);
    try {
      const deletePromises = Array.from(selectedInvoiceIds).map(id => apiDeleteInvoice(id));
      await Promise.all(deletePromises);
      addNotification(`${selectedInvoiceIds.size} invoice(s) deleted successfully.`, "success");
      setSelectedInvoiceIds(new Set());
      fetchData();
    } catch (error) {
      addNotification(`Failed to delete invoices: ${(error as Error).message}`, "error");
    } finally {
      setIsBulkActionLoading(false);
    }
  }, [selectedInvoiceIds, filteredInvoices, addNotification, showConfirmation, fetchData]);

  const handleSelectInvoice = useCallback((invoiceId: string, checked: boolean) => {
    setSelectedInvoiceIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(invoiceId);
      } else {
        newSet.delete(invoiceId);
      }
      return newSet;
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedInvoiceIds(prev => {
        const next = new Set(prev);
        paginatedInvoices.forEach(inv => next.add(inv.id));
        return next;
      });
    } else {
      setSelectedInvoiceIds(prev => {
        const next = new Set(prev);
        paginatedInvoices.forEach(inv => next.delete(inv.id));
        return next;
      });
    }
  }, [paginatedInvoices]);

  const handleRecalculateInvoices = useCallback(async () => {
    const confirmed = await showConfirmation({
      title: 'Recalculate Invoice Payments',
      message: 'This will recompute all invoices from linked sales and approved payments. Continue?',
      confirmText: 'Recalculate',
      cancelText: 'Cancel',
      confirmVariant: 'warning',
    });
    if (!confirmed) return;
    setIsRecalcLoading(true);
    try {
      const result = await apiRepairInvoicesFromPayments();
      addNotification(`Recalculated ${result.processed} invoice(s).`, 'success');
      fetchData();
    } catch (error) {
      addNotification(`Failed to recalculate invoices: ${(error as Error).message}`, 'error');
    }
    setIsRecalcLoading(false);
  }, [addNotification, fetchData, showConfirmation]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, startDate, endDate, invoiceSortOrder]);

  const invoiceKpis = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalDue = totalAmount - totalPaid;
    return { count: filteredInvoices.length, totalAmount, totalDue };
  }, [filteredInvoices]);

  const isAllSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoiceIds.has(inv.id));
  const isSomeSelected = paginatedInvoices.some(inv => selectedInvoiceIds.has(inv.id)) && !isAllSelected;
  const selectedInvoices = filteredInvoices.filter(inv => selectedInvoiceIds.has(inv.id));
  const selectedInvoice = selectedInvoices.length === 1 ? selectedInvoices[0] : null;
  const selectedDerived = selectedInvoice
    ? (invoiceDerivedMap.get(selectedInvoice.id) || {
        amountPaid: selectedInvoice.amountPaid,
        amountDue: selectedInvoice.grandTotal - selectedInvoice.amountPaid,
        status: selectedInvoice.status,
      })
    : null;

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');
  
  if (isLoading && invoices.length === 0) { 
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Invoices</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchData} isLoading={isLoading} />
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER) && (
            <Button variant="secondary" onClick={handleRecalculateInvoices} isLoading={isRecalcLoading}>
              Recalculate Invoice Payments
            </Button>
          )}
          {selectedInvoiceIds.size > 0 && (
            <>
              {selectedInvoice && (
                <>
                  <Button variant="secondary" onClick={() => handleEditInvoice(selectedInvoice)}>
                    Edit
                  </Button>
                  {selectedDerived && selectedDerived.amountDue > 0 && (
                    <Button variant="primary" onClick={() => handleRecordPayment(selectedInvoice)}>
                      Record Payment
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => handleDeleteInvoice(selectedInvoice.id)}>
                    Delete
                  </Button>
                </>
              )}
              {!selectedInvoice && (
                <Button 
                  variant="danger" 
                  onClick={handleBulkDelete}
                  isLoading={isBulkActionLoading}
                >
                  Delete ({selectedInvoiceIds.size})
                </Button>
              )}
            </>
          )}
          <Button onClick={() => { setEditingInvoice(null); setIsModalOpen(true);}} variant="primary" disabled={activeServices.length === 0}>
            + New Invoice
          </Button>
        </div>
      </div>

      {isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">Loading services...</p>}
      {!isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">No active services available to create a new invoice.</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Invoices</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{invoiceKpis.count}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Amount</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{invoiceKpis.totalAmount.toLocaleString()} MMK</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Due Amount</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{invoiceKpis.totalDue.toLocaleString()} MMK</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Search Invoices"
            placeholder="ID, Client, Business, Notes, Sale/Quote ID..."
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
            onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | '')}
            options={[{ value: '', label: 'All Statuses' }, ...Object.values(InvoiceStatus).map(s => ({ value: s, label: s }))]}
            containerClassName="mb-0"
          />
          <div className="mb-0 md:col-span-4 lg:col-span-1">
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Sort by Date</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInvoiceSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="w-full !py-2"
            >
              {invoiceSortOrder === 'desc' ? 'Latest to Oldest ↓' : 'Oldest to Latest ↑'}
            </Button>
          </div>
        </div>
      </div>
      
      {isLoading && invoices.length > 0 ? <div className="text-center py-4"><Spinner/> Loading more...</div> : null}

      {/* Pagination bar */}
      {filteredInvoices.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </div>
          {filteredInvoices.length > ITEMS_PER_PAGE && (
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

      {filteredInvoices.length > 0 ? (
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
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total (MMK)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Paid (MMK)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {paginatedInvoices.map(inv => {
                const derived = invoiceDerivedMap.get(inv.id) || {
                  amountPaid: inv.amountPaid,
                  amountDue: inv.grandTotal - inv.amountPaid,
                  status: inv.status,
                };
                return (
                <tr 
                  key={inv.id} 
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                  onClick={() => navigate(`/sales/invoices/${inv.id}`)}
                >
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedInvoiceIds.has(inv.id)}
                      onChange={(e) => handleSelectInvoice(inv.id, e.target.checked)}
                      disabled={derived.amountPaid > 0}
                      className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action disabled:opacity-50 disabled:cursor-not-allowed"
                      title={derived.amountPaid > 0 ? "Cannot delete invoices with payments" : ""}
                    />
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">{inv.id}</td>
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">
                    <div>
                      <div className="font-medium">{getBusinessName(inv.businessId)}</div>
                      <div className="text-xs text-text-secondary dark:text-slate-400">{getClientName(inv.clientId)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200 text-right">{inv.grandTotal.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200 text-right">{derived.amountPaid.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[derived.status] || 'bg-gray-200 text-gray-700'}`}>
                      {derived.status}
                    </span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-text-secondary dark:text-slate-400 py-8">No invoices found matching your criteria.</p>
      )}

      {isModalOpen && user && (
        <CreateEditInvoiceModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingInvoice(null); }}
          onSubmit={handleModalSubmit}
          clients={clients}
          businesses={businesses}
          activeServices={activeServices}
          editingInvoice={editingInvoice}
          pendingSales={pendingSales}
          onCreateFromSale={handleCreateInvoiceFromSale}
          loggedInUserId={user.id}
        />
      )}

      {isPaymentModalOpen && invoiceForPayment && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentModalClose}
          onSuccess={handlePaymentModalClose}
          sales={[]}
          invoices={invoices}
          clients={clients}
          businesses={businesses}
          paymentMethods={paymentMethods}
          cashAccounts={cashAccounts}
          defaultInvoiceId={invoiceForPayment.id}
          defaultClientId={invoiceForPayment.clientId}
          defaultBusinessId={invoiceForPayment.businessId}
          defaultAmount={(invoiceDerivedMap.get(invoiceForPayment.id)?.amountDue ?? (invoiceForPayment.grandTotal - invoiceForPayment.amountPaid))}
        />
      )}
    </div>
  );
};

export default InvoicesPage;

