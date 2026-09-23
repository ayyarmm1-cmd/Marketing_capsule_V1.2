import React, { useState, useMemo } from 'react';
import { Quotation, QuotationStatus, Client, Business, Service } from '../../../types';
import { 
    apiGetQuotations, 
    apiUpdateQuotation, 
    apiCreateInvoiceFromQuotation, 
    apiGetClients, 
    apiGetBusinesses,
    apiGetServices
} from '../../../services/api';
import Button from '../../ui/Button';
import CreateEditQuotationModal from '../modals/CreateEditQuotationModal';
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


const QuotationsTab: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Use shared data fetching hook
  const { data, isLoading, refetch } = useFinanceDataMultiple({
    quotations: apiGetQuotations,
    clients: apiGetClients,
    businesses: apiGetBusinesses,
    services: apiGetServices,
  });

  const quotations = (data.quotations as Quotation[]) || [];
  const clients = (data.clients as Client[]) || [];
  const businesses = (data.businesses as Business[]) || [];
  const allServices = (data.services as Service[]) || [];
  const activeServices = allServices.filter(s => s.isActive);

  // Use shared filters hook
  const filters = useFinanceFilters<Quotation>();

  const handleAddOrUpdateQuotation = () => {
    refetch();
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
      addNotification(`Quotation ${quotationId} status updated to ${status}.`, "success");
      refetch();
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
      addNotification(`Invoice ${newInvoice.id} created successfully!`, "success");
      refetch();
    } catch (error) {
      addNotification(`Failed to convert to invoice: ${(error as Error).message}`, "error");
    }
  };
  
  const handleConvertToSale = async (quotationId: string) => {
    if(!user) return;
    const confirmed = await showConfirmation({
      title: 'Convert to Sale',
      message: "This will mark the quotation as 'Converted to Sale'. You will need to manually create the sale record. Continue?",
      confirmText: 'Continue',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });
    if (!confirmed) return;
    try {
        await apiUpdateQuotation({id: quotationId, status: QuotationStatus.CONVERTED_TO_SALE});
        addNotification("Quotation marked as 'Converted to Sale'. Please create the corresponding sale record in Sales Management.", "success");
        refetch();
    } catch (error) {
        addNotification(`Failed to update status: ${(error as Error).message}`, "error");
    }
  };

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      // Status filter
      if (!filters.filterByStatus(q)) {
        return false;
      }
      
      // Search filter
      if (!filters.filterBySearch(q, [
        'id',
        'notes',
        (item) => getClientName(item.clientId, clients),
        (item) => getBusinessName(item.businessId, businesses),
      ])) {
        return false;
      }
      
      return true;
    });
  }, [quotations, filters, clients, businesses]);
  
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    ...Object.values(QuotationStatus).map(s => ({ value: s, label: s }))
  ], []);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-text-primary">Manage Quotations</h2>
            <Button onClick={() => { setEditingQuotation(null); setIsModalOpen(true); }} variant="primary" disabled={activeServices.length === 0 && !isLoading}>
            + New Quotation
            </Button>
        </div>
        {isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">Loading services...</p>}
        {!isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">No active services available to create a new quotation.</p>}

        <FinanceFilters
          searchTerm={filters.searchTerm}
          onSearchChange={filters.setSearchTerm}
          searchPlaceholder="ID, Client, Business, Notes..."
          searchLabel="Search Quotations"
          showStatusFilter={true}
          filterStatus={filters.filterStatus}
          onStatusChange={filters.setFilterStatus}
          statusOptions={statusOptions}
        />

        <FinanceTable
          columns={[
            { key: 'id', label: 'ID', render: (q: Quotation) => q.id },
            { key: 'client', label: 'Client', render: (q: Quotation) => getClientName(q.clientId, clients) },
            { key: 'business', label: 'Business', render: (q: Quotation) => getBusinessName(q.businessId, businesses) },
            { key: 'grandTotal', label: 'Total (MMK)', align: 'right', render: (q: Quotation) => q.grandTotal.toLocaleString() },
            {
              key: 'status',
              label: 'Status',
              render: (q: Quotation) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[q.status] || 'bg-gray-200 text-gray-700'}`}>
                  {q.status}
                </span>
              ),
            },
            { key: 'issueDate', label: 'Issue Date', render: (q: Quotation) => formatDate(q.issueDate) },
            { key: 'expiryDate', label: 'Expiry Date', render: (q: Quotation) => q.expiryDate ? formatDate(q.expiryDate) : 'N/A' },
            {
              key: 'linkedDoc',
              label: 'Linked Doc',
              render: (q: Quotation) => (
                <>
                  {q.invoiceId && <span className="text-teal-600">Inv: {q.invoiceId}</span>}
                  {q.saleRecordId && <span className="text-cyan-600 ml-1">Sale: {q.saleRecordId}</span>}
                </>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (q: Quotation) => (
                <div className="space-x-1">
                  <Link to={`/finance/quotations/${q.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                  <Button variant="ghost" size="sm" onClick={() => handleEditQuotation(q)}>Edit</Button>
                  {(q.status === QuotationStatus.DRAFT || q.status === QuotationStatus.SENT) && (
                    <>
                      <Button variant="success" size="sm" onClick={() => handleUpdateStatus(q.id, QuotationStatus.ACCEPTED)}>Accept</Button>
                      <Button variant="danger" size="sm" onClick={() => handleUpdateStatus(q.id, QuotationStatus.REJECTED)}>Reject</Button>
                    </>
                  )}
                  {q.status === QuotationStatus.ACCEPTED && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => handleConvertToInvoice(q.id)}>To Invoice</Button>
                      <Button variant="info" size="sm" onClick={() => handleConvertToSale(q.id)}>To Sale</Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredQuotations}
          isLoading={isLoading}
          emptyMessage="No quotations found matching your criteria."
          rowKey="id"
        />

        {isModalOpen && user && (
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
        )}
    </div>
  );
};

export default QuotationsTab;
