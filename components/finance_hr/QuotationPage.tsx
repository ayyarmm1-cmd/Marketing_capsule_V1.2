import React, { useState, useEffect, useCallback } from 'react';
import { Quotation, QuotationStatus, Client, Business, Service } from '../../types'; // Added Service
import { 
    apiGetQuotations, 
    apiUpdateQuotation, 
    apiCreateInvoiceFromQuotation, 
    apiGetClients, 
    apiGetBusinesses,
    apiGetServices // Added apiGetServices
} from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import CreateEditQuotationModal from '../finance/modals/CreateEditQuotationModal';
import { STATUS_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { alert as showAlert } from '../../utils/dialogUtils';
import Input from '../ui/Input'; 
import Select from '../ui/Select'; 

const QuotationPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeServices, setActiveServices] = useState<Service[]>([]); // New state for services
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<QuotationStatus | ''>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedQuotations, fetchedClients, fetchedBusinesses, fetchedServices] = await Promise.all([
        apiGetQuotations(),
        apiGetClients(),
        apiGetBusinesses(),
        apiGetServices(), // Fetch services
      ]);
      setQuotations(fetchedQuotations);
      setClients(fetchedClients);
      setBusinesses(fetchedBusinesses);
      setActiveServices(fetchedServices.filter(s => s.isActive)); // Store active services
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
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
      fetchData();
    } catch (error) {
      await showAlert(`Failed to update status: ${(error as Error).message}`, 'Error');
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
      addNotification(`Invoice ${newInvoice.id} created successfully!`, 'success');
      fetchData();
    } catch (error) {
      await showAlert(`Failed to convert to invoice: ${(error as Error).message}`, 'Error');
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
        addNotification("Quotation marked as 'Converted to Sale'. Please create the corresponding sale record in Sales Management.", 'success');
        fetchData();
    } catch (error) {
        await showAlert(`Failed to update status: ${(error as Error).message}`, 'Error');
    }
  };

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || clientId;
  const getBusinessName = (businessId: string) => businesses.find(b => b.id === businessId)?.name || businessId;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

  const filteredQuotations = quotations.filter(q => {
    const statusMatch = !filterStatus || q.status === filterStatus;
    const term = searchTerm.toLowerCase();
    const searchMatch = !term ||
      q.id.toLowerCase().includes(term) ||
      getClientName(q.clientId).toLowerCase().includes(term) ||
      getBusinessName(q.businessId).toLowerCase().includes(term) ||
      q.notes?.toLowerCase().includes(term);
    return statusMatch && searchMatch;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Quotations Management</h1>
        <Button onClick={() => { setEditingQuotation(null); setIsModalOpen(true); }} variant="primary" disabled={activeServices.length === 0 && !isLoading}>
          + New Quotation
        </Button>
      </div>
       {isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">Loading services for quotation...</p>}
      {!isLoading && activeServices.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">No active services available to create a new quotation.</p>}


      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Search Quotations"
            placeholder="ID, Client, Business, Notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : filteredQuotations.length > 0 ? (
        <div className="bg-container-bg shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Business</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Total (MMK)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Issue Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Expiry Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Linked Doc</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg divide-y divide-gray-200">
              {filteredQuotations.map(q => (
                <tr key={q.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{q.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary">{getClientName(q.clientId)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{getBusinessName(q.businessId)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary text-right">{q.grandTotal.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[q.status] || 'bg-gray-200 text-gray-700'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{formatDate(q.issueDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{q.expiryDate ? formatDate(q.expiryDate) : 'N/A'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {q.invoiceId && <span className="text-teal-600">Inv: {q.invoiceId}</span>}
                    {q.saleRecordId && <span className="text-cyan-600 ml-1">Sale: {q.saleRecordId}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditQuotation(q)}>View/Edit</Button>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">No quotations found.</p>
      )}
      {isModalOpen && user && (
        <CreateEditQuotationModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingQuotation(null); }}
          onSubmit={handleAddOrUpdateQuotation}
          clients={clients}
          businesses={businesses}
          activeServices={activeServices} // Pass active services
          loggedInUserId={user.id}
          editingQuotation={editingQuotation}
        />
      )}
    </div>
  );
};

export default QuotationPage;