import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus, Client, Business, SaleRecord, Service } from '../../../types';
import { 
    apiGetInvoices, 
    apiGetClients, 
    apiGetBusinesses, 
    apiCreateInvoiceFromSale, 
    apiGetSalesRecords, 
    apiUpdateInvoice, 
    apiGetServices, 
    apiDeleteInvoice 
} from '../../../services/api';
import Button from '../../ui/Button';
import CreateEditInvoiceModal from '../modals/CreateEditInvoiceModal';
import { resolveServicesForInvoiceEdit } from '../../../utils/boostingServiceUtils';
import { STATUS_COLORS } from '../../../constants';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import { useConfirmation } from '../../../hooks/useConfirmation';
import { useFinanceDataMultiple } from '../../../hooks/useFinanceData';
import { useFinanceFilters } from '../../../hooks/useFinanceFilters';
import { formatDate, getClientName, getBusinessName } from '../../../utils/financeUtils';
import FinanceFilters from '../shared/FinanceFilters';
import FinanceTable from '../shared/FinanceTable';
import { Link } from 'react-router-dom';


const InvoicesTab: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Use shared data fetching hook
  const { data, isLoading, refetch } = useFinanceDataMultiple({
    invoices: apiGetInvoices,
    clients: apiGetClients,
    businesses: apiGetBusinesses,
    sales: apiGetSalesRecords,
    services: apiGetServices,
  });

  const invoices = (data.invoices as Invoice[]) || [];
  const clients = (data.clients as Client[]) || [];
  const businesses = (data.businesses as Business[]) || [];
  const allSales = (data.sales as SaleRecord[]) || [];
  const allServices = (data.services as Service[]) || [];
  const activeServices = useMemo(() => {
    const base = allServices.filter(s => s.isActive);
    if (!editingInvoice) return base;
    return resolveServicesForInvoiceEdit(base, allServices, editingInvoice.items || []);
  }, [allServices, editingInvoice]);
  
  const pendingSales = useMemo(() => {
    const invoicedSaleIds = new Set(invoices.map(inv => inv.saleRecordId).filter(Boolean));
    return allSales.filter(sale => !invoicedSaleIds.has(sale.id));
  }, [invoices, allSales]);

  // Use shared filters hook
  const filters = useFinanceFilters<Invoice>();

  const invoicesWithDerived = useMemo(() => {
    return invoices.map(inv => ({
      ...inv,
      amountPaid: inv.amountPaid || 0,
      status: inv.status,
    }));
  }, [invoices]);

  const handleModalSubmit = () => {
    refetch();
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleCreateInvoiceFromSale = async (saleId: string) => {
     try {
        const newInvoice = await apiCreateInvoiceFromSale(saleId);
        addNotification(`Invoice ${newInvoice.id} created from Sale ${saleId}.`, "success");
        refetch();
     } catch(error) {
        addNotification(`Failed to create invoice from sale: ${(error as Error).message}`, "error");
     }
  }
  
  const handleUpdateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      await apiUpdateInvoice({ id: invoiceId, status });
      addNotification(`Invoice ${invoiceId} status updated to ${status}.`, "success");
      refetch();
    } catch (error) {
      addNotification(`Failed to update invoice status: ${(error as Error).message}`, "error");
    }
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
            refetch();
        } catch (error) {
            addNotification(`Failed to delete invoice: ${(error as Error).message}`, "error");
        }
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoicesWithDerived.filter(inv => {
      // Status filter
      if (!filters.filterByStatus(inv)) {
        return false;
      }
      
      // Search filter
      if (!filters.filterBySearch(inv, [
        'id',
        'notes',
        'saleRecordId',
        'quotationId',
        (item) => getClientName(item.clientId, clients),
        (item) => getBusinessName(item.businessId, businesses),
      ])) {
        return false;
      }
      
      return true;
    });
  }, [invoicesWithDerived, filters, clients, businesses]);
  
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    ...Object.values(InvoiceStatus).map(s => ({ value: s, label: s }))
  ], []);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-text-primary">Manage Invoices</h2>
            <Button onClick={() => { setEditingInvoice(null); setIsModalOpen(true);}} variant="primary">
            + New Invoice (Manual)
            </Button>
        </div>
        {isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">Loading services...</p>}
        {!isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">No active services available to create a new invoice.</p>}

        <FinanceFilters
          searchTerm={filters.searchTerm}
          onSearchChange={filters.setSearchTerm}
          searchPlaceholder="ID, Client, Business, Notes, Sale/Quote ID..."
          searchLabel="Search Invoices"
          showStatusFilter={true}
          filterStatus={filters.filterStatus}
          onStatusChange={filters.setFilterStatus}
          statusOptions={statusOptions}
        />

      <FinanceTable
        columns={[
          { key: 'id', label: 'ID', render: (inv: Invoice) => inv.id },
          { key: 'client', label: 'Client', render: (inv: Invoice) => getClientName(inv.clientId, clients) },
          { key: 'issueDate', label: 'Issue Date', render: (inv: Invoice) => formatDate(inv.issueDate) },
          { key: 'grandTotal', label: 'Total (MMK)', align: 'right', render: (inv: Invoice) => inv.grandTotal.toLocaleString() },
          { key: 'amountPaid', label: 'Paid (MMK)', align: 'right', render: (inv: Invoice) => inv.amountPaid.toLocaleString() },
          {
            key: 'status',
            label: 'Status',
            render: (inv: Invoice) => (
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[inv.status] || 'bg-gray-200 text-gray-700'}`}>
                {inv.status}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (inv: Invoice) => (
              <div className="space-x-1">
                <Link to={`/finance/invoices/${inv.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(inv)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteInvoice(inv.id)} disabled={inv.amountPaid > 0} title={inv.amountPaid > 0 ? "Cannot delete invoices with payments" : "Delete Invoice"}>Delete</Button>
              </div>
            ),
          },
        ]}
        data={filteredInvoices}
        isLoading={isLoading}
        emptyMessage="No invoices found matching your criteria."
        rowKey="id"
      />

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
          loggedInUserId={user.id} // Added loggedInUserId
        />
      )}
    </div>
  );
};

export default InvoicesTab;
