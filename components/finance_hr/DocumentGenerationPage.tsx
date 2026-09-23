import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Invoice, SaleRecord, InvoiceStatus, Client, Business, Service, InvoiceItem, SaleStatus } from '../../types';
import { apiGetInvoicesForPeriod, apiGetSalesForPeriod, apiCreateInvoiceFromSale, apiGetClients, apiGetBusinesses, apiGetServices, apiAddDirectInvoice, apiUpdateInvoice } from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

// --- Re-engineered Create/Edit Invoice Modal ---

interface CreateEditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  clients: Client[];
  businesses: Business[];
  activeServices: Service[];
  editingInvoice?: Invoice | null;
  loggedInUserId: string;
}

interface ModalInvoiceItem extends InvoiceItem {
  serviceId?: string;
}

type InvoiceFormData = Omit<Partial<Invoice>, 'items' | 'subtotal' | 'tax' | 'grandTotal' | 'discount' | 'amountPaid'> & {
    items: ModalInvoiceItem[];
    subtotal?: number;
    discount?: number | '';
    taxPercentage?: number | '';
    taxAmount?: number;
    grandTotal?: number;
    amountPaid?: number;
};

const CreateEditInvoiceModal: React.FC<CreateEditInvoiceModalProps> = ({
  isOpen, onClose, onSubmit, clients, businesses, activeServices, editingInvoice, loggedInUserId
}) => {
  const { addNotification } = useNotification();

  const getInitialFormData = useCallback((): InvoiceFormData => {
    const defaultIssueDate = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const initialItems: ModalInvoiceItem[] = editingInvoice?.items?.map(item => ({
      ...item, id: item.id || `item-${Date.now()}-${Math.random()}`, serviceId: item.serviceId || ''
    })) || [{ id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0, serviceId: '' }];

    return {
      clientId: editingInvoice?.clientId || '',
      businessId: editingInvoice?.businessId || '',
      issueDate: editingInvoice?.issueDate || defaultIssueDate,
      dueDate: editingInvoice?.dueDate || defaultDueDate,
      items: initialItems,
      subtotal: editingInvoice?.subtotal || 0,
      discount: editingInvoice?.discount || '',
      taxPercentage: editingInvoice ? ((editingInvoice.tax / (editingInvoice.subtotal - (editingInvoice.discount || 0))) * 100) || '' : '',
      grandTotal: editingInvoice?.grandTotal || 0,
      status: editingInvoice?.status || InvoiceStatus.DRAFT,
      notes: editingInvoice?.notes || '',
    };
  }, [editingInvoice]);

  const [formData, setFormData] = useState<InvoiceFormData>(getInitialFormData());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setFormData(getInitialFormData());
  }, [isOpen, getInitialFormData]);

  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = Number(formData.discount) || 0;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * (Number(formData.taxPercentage) || 0) / 100;
    const grandTotal = subtotalAfterDiscount + tax;
    setFormData(prev => ({ ...prev, subtotal, taxAmount: tax, grandTotal }));
  }, [formData.items, formData.discount, formData.taxPercentage]);

  const handleItemChange = (index: number, field: keyof ModalInvoiceItem, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    if (field === 'serviceId') {
      item.serviceId = value;
      const service = activeServices.find(s => s.id === value);
      item.description = service?.name || '';
      item.unitPrice = service?.unitPriceMMK || 0;
    } else {
        (item as any)[field] = value;
    }
    item.total = (item.quantity || 0) * (item.unitPrice || 0);
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0, serviceId: '' }] }));
  const removeItem = (index: number) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value === '' ? '' : Number(e.target.value) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.businessId || formData.items.some(i => !i.description)) {
      addNotification("Client, Business and item descriptions are required.", "error");
      return;
    }
    setIsLoading(true);
    const payload = {
      ...formData,
      discount: Number(formData.discount) || 0,
      tax: formData.taxAmount || 0,
      amountPaid: editingInvoice?.amountPaid || 0,
      items: formData.items.map(({ serviceId, ...item }) => item)
    };
    try {
      if (editingInvoice?.id) {
        await apiUpdateInvoice({ ...payload, id: editingInvoice.id } as Invoice);
        addNotification("Invoice updated.", "success");
      } else {
        await apiAddDirectInvoice(payload as Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>);
        addNotification("Invoice created.", "success");
      }
      onSubmit();
    } catch (err) {
      addNotification(`Error: ${(err as Error).message}`, "error");
    }
    setIsLoading(false);
  };
  
  const businessesForSelectedClient = formData.clientId ? businesses.filter(b => clients.find(c => c.id === formData.clientId)?.linkedBusinessIds?.includes(b.id)) : [];
  const invoiceBusinessOptions = formData.clientId ? businessesForSelectedClient : businesses;
  const serviceOptions = [{ value: '', label: '-- Select Service --' }, ...activeServices.map(s => ({ value: s.id, label: s.name }))];


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingInvoice ? "Edit Invoice" : "Create Manual Invoice"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
        {/* Client, Business, Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Client*" name="clientId" value={formData.clientId || ''} onChange={handleChange} options={[{ value: '', label: '-- Select Client --' }, ...clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))]} required />
          <Select label="Business*" name="businessId" value={formData.businessId || ''} onChange={handleChange} options={invoiceBusinessOptions.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Issue Date*" type="date" name="issueDate" value={formData.issueDate || ''} onChange={handleChange} required />
          <Input label="Due Date*" type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} required />
        </div>

        {/* Items */}
        <h3 className="text-md font-semibold mt-4 pt-2 border-t">Invoice Items</h3>
        {formData.items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end p-2 border rounded-md bg-slate-50">
            <Select label="Service" options={serviceOptions} value={item.serviceId || ''} onChange={e => handleItemChange(index, 'serviceId', e.target.value)} containerClassName="lg:col-span-4 mb-0" />
            <Input label="Description*" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} containerClassName="lg:col-span-3 mb-0" required/>
            <Input label="Qty*" type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} min="1" containerClassName="lg:col-span-1 mb-0" />
            <Input label="Unit Price*" type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} min="0" step="any" containerClassName="lg:col-span-2 mb-0" />
            <Input label="Total" value={item.total.toLocaleString()} disabled containerClassName="lg:col-span-1 mb-0" />
            <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)} className="lg:col-span-1 !p-2 self-end mb-0">X</Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addItem}>+ Add Item</Button>

        {/* Summary */}
        <h3 className="text-md font-semibold mt-4 pt-2 border-t">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Subtotal (MMK)" value={formData.subtotal?.toLocaleString() || '0'} disabled />
          <Input label="Discount (MMK)" name="discount" type="number" value={formData.discount || ''} onChange={handleNumericChange} />
          <Input label="Tax (%)" name="taxPercentage" type="number" value={formData.taxPercentage || ''} onChange={handleNumericChange} />
          <Input label="Grand Total (MMK)" value={formData.grandTotal?.toLocaleString() || '0'} disabled className="font-bold text-lg" />
        </div>

        {/* Footer */}
        <Select label="Status" name="status" value={formData.status || ''} onChange={handleChange} options={Object.values(InvoiceStatus).map(s => ({ value: s, label: s }))} />
        <Input as="textarea" label="Notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={2} />

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{editingInvoice ? "Save Changes" : "Create Invoice"}</Button>
        </div>
      </form>
    </Modal>
  );
};


// --- Original Page Component ---

const DocumentGenerationPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeServices, setActiveServices] = useState<Service[]>([]);
  const [pendingSales, setPendingSales] = useState<SaleRecord[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice|null>(null);
  
  const [saleToConvert, setSaleToConvert] = useState<string>('');
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 90);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = today.toISOString().slice(0, 10);
      const [fetchedInvoices, fetchedSales, fClients, fBusinesses, fServices] = await Promise.all([
        apiGetInvoicesForPeriod(startStr, endStr),
        apiGetSalesForPeriod(startStr, endStr),
        apiGetClients(),
        apiGetBusinesses(),
        apiGetServices()
      ]);
      setInvoices(fetchedInvoices);
      setClients(fClients);
      setBusinesses(fBusinesses);
      setActiveServices(fServices.filter(s => s.isActive));
      const invoicedSaleIds = new Set(fetchedInvoices.map(inv => inv.saleRecordId));
      setPendingSales(fetchedSales.filter(sale => !invoicedSaleIds.has(sale.id)));
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateInvoiceFromSale = async () => {
    if(!saleToConvert) {
        alert("Please select a sale record.");
        return;
    }
    await apiCreateInvoiceFromSale(saleToConvert);
    setIsConvertModalOpen(false);
    setSaleToConvert('');
    fetchData();
  };
  
  const handleModalSubmit = () => {
      fetchData();
      setIsModalOpen(false);
      setEditingInvoice(null);
  };

  const handleDownloadPDF = (invoiceId: string, status: InvoiceStatus) => {
    alert(`Download PDF for invoice ${invoiceId}. (Not implemented)`);
  };
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      inv.id.toLowerCase().includes(term) ||
      (clients.find(c => c.id === inv.clientId)?.name || '').toLowerCase().includes(term) ||
      (businesses.find(b => b.id === inv.businessId)?.name || '').toLowerCase().includes(term)
    );
  }, [invoices, searchTerm, clients, businesses]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const docKpis = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    return { count: filteredInvoices.length, totalAmount };
  }, [filteredInvoices]);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || id;
  const getBusinessName = (id: string) => businesses.find(b => b.id === id)?.name || id;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Invoices</h1>
        <div className="flex gap-2">
            <Button onClick={() => setIsConvertModalOpen(true)} variant="info" disabled={pendingSales.length === 0}>
            + Create From Sale
            </Button>
            <Button onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} variant="primary">
            + Create Manual Invoice
            </Button>
        </div>
      </div>
      <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">Quotes functionality has been moved to the Financial Documents page.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Invoices</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{docKpis.count}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Amount</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{docKpis.totalAmount.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          label="Search Invoices"
          placeholder="ID, Client, Business..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          containerClassName="max-w-md mb-0"
        />
      </div>

      {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
        filteredInvoices.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-3 text-sm text-text-secondary dark:text-slate-400">
            <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length} invoices</span>
            {filteredInvoices.length > ITEMS_PER_PAGE && (
              <nav className="flex items-center gap-1">
                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
              </nav>
            )}
          </div>
          <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Client / Business</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Issue Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Total (MMK)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {paginatedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-2 text-sm font-medium text-primary-action">
                      <Link to={`/sales/invoices/${inv.id}`} className="hover:underline">{inv.id}</Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">
                      <div>{getBusinessName(inv.businessId)}</div>
                      <div className="text-xs text-text-secondary dark:text-slate-400">{getClientName(inv.clientId)}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-2 text-sm font-medium text-right">{(inv.grandTotal || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
        ) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">No invoices generated yet.</p>
      )}
      
      {/* Modal for creating from sale */}
      <Modal isOpen={isConvertModalOpen} onClose={() => setIsConvertModalOpen(false)} title="Create Invoice from Sale">
          <Select label="Select Sale Record*" value={saleToConvert} onChange={e => setSaleToConvert(e.target.value)}
              options={pendingSales.map(s => ({ value: s.id, label: `${s.id} - ${s.grandTotalMMK.toLocaleString()} MMK (Client: ${clients.find(c=>c.id === s.clientId)?.name})` }))}
              placeholder="-- Select Sale Record --" required />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="secondary" onClick={() => setIsConvertModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoiceFromSale}>Create Invoice</Button>
          </div>
      </Modal>

      {/* Re-engineered Modal for manual creation/editing */}
      {isModalOpen && user && (
          <CreateEditInvoiceModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleModalSubmit}
            clients={clients}
            businesses={businesses}
            activeServices={activeServices}
            editingInvoice={editingInvoice}
            loggedInUserId={user.id}
          />
      )}
    </div>
  );
};

export default DocumentGenerationPage;