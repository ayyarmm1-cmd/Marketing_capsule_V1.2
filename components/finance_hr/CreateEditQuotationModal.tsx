import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quotation, QuotationStatus, QuotationItem, Client, Business, Service } from '../../types';
import { apiAddQuotation, apiUpdateQuotation } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import { useNotification } from '../../hooks/useNotification';
import { getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';

interface CreateEditQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void; // Callback to refresh parent list
  clients: Client[];
  businesses: Business[];
  activeServices: Service[];
  loggedInUserId: string;
  editingQuotation?: Quotation | null;
}

// Extended item type for modal state, to include serviceId for selection
interface ModalQuotationItem extends QuotationItem {
  serviceId?: string; 
}

// Define a more robust type for the form data state
type QuotationFormData = Omit<Partial<Quotation>, 'items' | 'subtotal' | 'taxAmountMMK' | 'grandTotal' | 'manualDiscountMMK' | 'taxPercentage'> & {
    items: ModalQuotationItem[];
    subtotal?: number;
    manualDiscountMMK?: number | '';
    taxPercentage?: number | '';
    taxAmountMMK?: number;
    grandTotal?: number;
};


function CreateEditQuotationModal({
  isOpen, onClose, onSubmit, clients, businesses, activeServices, loggedInUserId, editingQuotation
}: CreateEditQuotationModalProps) {
  const { addNotification } = useNotification();
  
  const calculateInitialExpiryDate = (issueDateStr: string): string => {
    if (!issueDateStr) return '';
    const issueDate = new Date(issueDateStr + 'T00:00:00');
    issueDate.setDate(issueDate.getDate() + 7);
    return getDateInYangonTimezone(issueDate);
  };

  // Initialize with empty form data, then update via useEffect to avoid initialization order issues
  const [formData, setFormData] = useState<QuotationFormData>({ items: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when modal opens or editingQuotation changes
  useEffect(() => {
    if (isOpen) {
      const defaultIssueDate = getTodayInYangon();
      const initialItems: ModalQuotationItem[] = editingQuotation?.items?.map((item: QuotationItem) => ({ 
          ...item,
          id: item.id || `item-${Date.now()}-${Math.random()}`, 
          serviceId: item.serviceId || '', 
      })) || [{ id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0, serviceId: '' }];

      // Base data excluding items
      const baseQuotationData: Omit<Partial<Quotation>, 'items'> = {
          clientId: editingQuotation?.clientId || '',
          businessId: editingQuotation?.businessId || '',
          issueDate: editingQuotation?.issueDate || defaultIssueDate,
          expiryDate: editingQuotation?.expiryDate || calculateInitialExpiryDate(editingQuotation?.issueDate || defaultIssueDate),
          subtotal: editingQuotation?.subtotal || 0,
          manualDiscountMMK: editingQuotation?.manualDiscountMMK || 0,
          manualDiscountDescription: editingQuotation?.manualDiscountDescription || '',
          taxPercentage: editingQuotation?.taxPercentage || 0,
          taxAmountMMK: editingQuotation?.taxAmountMMK || 0,
          grandTotal: editingQuotation?.grandTotal || 0,
          status: editingQuotation?.status || QuotationStatus.DRAFT,
          notes: editingQuotation?.notes || '',
          saleRecordId: editingQuotation?.saleRecordId || '',
      };
      
      setFormData({
          ...baseQuotationData,
          items: initialItems,
      });
    }
  }, [isOpen, editingQuotation]);
  
  useEffect(() => {
    // Auto-update expiry date if issue date changes, but only if not manually set or if it's a new quotation
    if (formData.issueDate && (!editingQuotation || formData.expiryDate === calculateInitialExpiryDate(editingQuotation.issueDate || ''))) {
        setFormData(prev => ({
            ...prev,
            expiryDate: calculateInitialExpiryDate(prev.issueDate!)
        }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.issueDate, editingQuotation]); 

  useEffect(() => {
    let subtotalCalc = 0;
    formData.items?.forEach(item => { subtotalCalc += item.total; });
    
    const discount = Number(formData.manualDiscountMMK) || 0;
    const subtotalAfterDiscount = subtotalCalc - discount;
    const tax = subtotalAfterDiscount * (Number(formData.taxPercentage) || 0) / 100;
    const grandTotal = subtotalAfterDiscount + tax;

    setFormData(prev => ({ ...prev, subtotal: subtotalCalc, taxAmountMMK: tax, grandTotal }));
  }, [formData.items, formData.manualDiscountMMK, formData.taxPercentage]);

  const handleItemChange = (index: number, field: keyof ModalQuotationItem, value: string | number) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index] };
    let selectedService = activeServices.find(s => s.id === item.serviceId);

    if (field === 'serviceId') {
        item.serviceId = String(value);
        selectedService = activeServices.find(s => s.id === item.serviceId);
        if (selectedService) {
            item.description = selectedService.name;
            item.unitPrice = selectedService.unitPriceMMK ?? 0;
        } else {
            item.description = ''; 
        }
    } else if (field === 'quantity' || field === 'unitPrice') {
        (item[field as ('quantity' | 'unitPrice')] ) = Number(value) || 0; 
    } else if (field === 'description') {
        (item[field as 'description'] ) = String(value); 
    } else if (field === 'total') { 
        (item[field as 'total']) = Number(value) || 0;
    } else if (field === 'id') { 
         (item[field as 'id']) = String(value);
    }


    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { id: `item-${Date.now()}-${Math.random()}`, serviceId: '', description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (formData.clientId && !editingQuotation && businesses.length > 0 && clients.length > 0) {
        const selectedClient = clients.find(c => c.id === formData.clientId);
        if (selectedClient && selectedClient.linkedBusinessIds && selectedClient.linkedBusinessIds.length > 0) {
            const firstLinkedBusinessId = selectedClient.linkedBusinessIds[0];
            const businessExists = businesses.some(b => b.id === firstLinkedBusinessId);
            if (businessExists && formData.businessId !== firstLinkedBusinessId) {
                setFormData(prev => ({ ...prev, businessId: firstLinkedBusinessId }));
            }
        } else if (selectedClient && (!selectedClient.linkedBusinessIds || selectedClient.linkedBusinessIds.length === 0)) {
            if (formData.businessId) {
                setFormData(prev => ({ ...prev, businessId: '' }));
            }
        }
    }
  }, [formData.clientId, clients, businesses, editingQuotation]);

  useEffect(() => {
    if (formData.businessId && !editingQuotation && businesses.length > 0 && clients.length > 0) {
        const selectedBusiness = businesses.find(b => b.id === formData.businessId);
        if (selectedBusiness && selectedBusiness.linkedClientIds && selectedBusiness.linkedClientIds.length > 0) {
            const firstLinkedClientId = selectedBusiness.linkedClientIds[0];
            const clientExists = clients.some(c => c.id === firstLinkedClientId);
            if (clientExists && formData.clientId !== firstLinkedClientId) {
                setFormData(prev => ({ ...prev, clientId: firstLinkedClientId }));
            }
        } else if (selectedBusiness && (!selectedBusiness.linkedClientIds || selectedBusiness.linkedClientIds.length === 0)) {
            if (formData.clientId) {
                setFormData(prev => ({ ...prev, clientId: '' }));
            }
        }
    }
  }, [formData.businessId, clients, businesses, editingQuotation]);
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : Number(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.businessId || !formData.issueDate || !formData.items || formData.items.length === 0) {
      alert("Client, Business, Issue Date, and at least one item are required.");
      return;
    }
    if (formData.items.some(item => !item.description.trim())) {
        alert("All quotation items must have a description.");
        return;
    }
    setIsLoading(true);
    
    const itemsToSave: QuotationItem[] = formData.items.map(({ serviceId, ...restOfItem }) => restOfItem);

    const payload = {
      ...formData,
      items: itemsToSave, 
      createdByUserId: loggedInUserId,
    } as Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>;

    try {
      if (editingQuotation?.id) {
        await apiUpdateQuotation({ ...payload, id: editingQuotation.id } as Quotation);
        addNotification("Quotation updated successfully!", "success");
      } else {
        await apiAddQuotation(payload);
        addNotification("Quotation created successfully!", "success");
      }
      onSubmit(); 
    } catch (error) {
      addNotification(`Failed to save quotation: ${(error as Error).message}`, "error");
    }
    setIsLoading(false);
  };
  
  const businessOptions = useMemo(() => {
    const allBusinessOptions = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    if (formData.clientId) {
        const client = clients.find(c => c.id === formData.clientId);
        if (client && client.linkedBusinessIds && client.linkedBusinessIds.length > 0) {
            const linkedBusinessOptions = allBusinessOptions.filter(opt => 
                client.linkedBusinessIds.includes(opt.value)
            );
            const otherBusinessOptions = allBusinessOptions.filter(opt => 
                !client.linkedBusinessIds.includes(opt.value)
            );
            return [...linkedBusinessOptions, ...otherBusinessOptions];
        }
    }
    return allBusinessOptions;
  }, [businesses, formData.clientId, clients]);

  const clientOptions = useMemo(() => {
    const allClientOptions = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    if (formData.businessId) {
        const business = businesses.find(b => b.id === formData.businessId);
        if (business && business.linkedClientIds && business.linkedClientIds.length > 0) {
            const linkedClientOptions = allClientOptions.filter(opt => 
                business.linkedClientIds.includes(opt.value)
            );
            const otherClientOptions = allClientOptions.filter(opt => 
                !business.linkedClientIds.includes(opt.value)
            );
            return [...linkedClientOptions, ...otherClientOptions];
        }
    }
    return allClientOptions;
  }, [clients, formData.businessId, businesses]);

  const serviceOptions = [{ value: '', label: '-- Select Service --' }, ...activeServices.map(s => ({ value: s.id, label: s.name }))];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingQuotation ? "Edit Quotation" : "Create New Quotation"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="Client*"
            value={formData.clientId || ''}
            onChange={(value) => handleChange({ target: { name: 'clientId', value: String(value) } } as any)}
            options={[{ value: '', label: '-- Select Client --' }, ...clientOptions]}
            placeholder="-- Search & Select Client --"
            required
          />
          <SearchableSelect
            label="Business*"
            value={formData.businessId || ''}
            onChange={(value) => handleChange({ target: { name: 'businessId', value: String(value) } } as any)}
            options={businessOptions}
            placeholder="-- Search & Select Business --"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Issue Date*" type="date" name="issueDate" value={formData.issueDate || ''} onChange={handleChange} required />
          <Input label="Expiry Date" type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} />
        </div>

        <h3 className="text-md font-semibold mt-4 pt-2 border-t">Quotation Items</h3>
        {formData.items?.map((item: ModalQuotationItem, index: number) => ( 
          <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end p-2 border rounded-md bg-slate-50">
            <Select label="Service" options={serviceOptions} value={item.serviceId || ''} onChange={(e) => handleItemChange(index, 'serviceId', e.target.value)} containerClassName="lg:col-span-4 mb-0" />
            <Input label="Description" name={`item_desc_${index}`} value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} containerClassName="lg:col-span-3 mb-0" required/>
            <Input label="Qty" type="number" name={`item_qty_${index}`} value={item.quantity.toString()} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} min="1" containerClassName="lg:col-span-1 mb-0" />
            <Input label="Unit Price" type="number" name={`item_price_${index}`} value={item.unitPrice.toString()} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} min="0" step="0.01" containerClassName="lg:col-span-2 mb-0" />
            <Input label="Total" name={`item_total_${index}`} value={item.total.toLocaleString()} disabled containerClassName="lg:col-span-1 mb-0" />
            <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)} className="lg:col-span-1 !p-2 self-end mb-0">X</Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addItem}>+ Add Item</Button>

        <h3 className="text-md font-semibold mt-4 pt-2 border-t">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Subtotal (MMK)" value={formData.subtotal?.toLocaleString() || '0'} disabled />
            <Input label="Manual Discount (MMK)" type="number" name="manualDiscountMMK" value={formData.manualDiscountMMK?.toString() || ''} onChange={handleNumericChange} />
        </div>
        <Input label="Discount Description" name="manualDiscountDescription" value={formData.manualDiscountDescription || ''} onChange={handleChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Tax (%)" type="number" name="taxPercentage" value={formData.taxPercentage?.toString() || ''} onChange={handleNumericChange} min="0" max="100" />
            <Input label="Tax Amount (MMK)" value={formData.taxAmountMMK?.toLocaleString() || '0'} disabled />
        </div>
        <Input label="Grand Total (MMK)" value={formData.grandTotal?.toLocaleString() || '0'} disabled className="font-bold text-lg"/>

        <Input label="Notes" name="notes" value={formData.notes || ''} onChange={handleChange} as="textarea" rows={2} />
        <Input label="Linked Sale ID (Optional)" name="saleRecordId" value={formData.saleRecordId || ''} onChange={handleChange} placeholder="e.g., FBA-010124-01"/>
        <Select label="Status" name="status" value={formData.status || QuotationStatus.DRAFT} onChange={handleChange}
          options={Object.values(QuotationStatus).map(s => ({ value: s, label: s }))} />

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{editingQuotation ? "Save Changes" : "Create Quotation"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateEditQuotationModal;