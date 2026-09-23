import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quotation, QuotationStatus, QuotationItem, Client, Business, Service, CampaignObjectiveSetting } from '../../../types';
import { apiAddQuotation, apiUpdateQuotation, apiGetCampaignObjectiveSettings } from '../../../services/api';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { useNotification } from '../../../hooks/useNotification';
import SearchableSelect from '../../ui/SearchableSelect';
import { getTodayInYangon, getDateInYangonTimezone } from '../../../utils/dateUtils';
import { createBoostingInvoiceItem, isBudgetBasedService } from '../../../utils/boostingServiceUtils';

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

interface ModalQuotationItem extends QuotationItem {
  serviceId?: string; 
}

type QuotationFormData = Omit<Partial<Quotation>, 'items' | 'subtotal' | 'taxAmountMMK' | 'grandTotal' | 'manualDiscountMMK' | 'taxPercentage' | 'otherFeesAmountMMK'> & {
    items: ModalQuotationItem[];
    subtotal?: number;
    manualDiscountMMK?: number | '';
    otherFeesAmountMMK?: number | '';
    taxPercentage?: number | '';
    taxAmountMMK?: number;
    grandTotal?: number;
};

interface ServiceSelection {
    id: string;
    serviceId: string;
    campaignObjective?: string;
    budgetUSD?: number | '';
    startDate?: string;
    durationDays?: number | '';
    quantity?: number | '';
    manualServiceRateMMK?: number | '';
}


const CreateEditQuotationModal: React.FC<CreateEditQuotationModalProps> = ({
  isOpen, onClose, onSubmit, clients, businesses, activeServices, loggedInUserId, editingQuotation
}) => {
  const { addNotification } = useNotification();
  const [formData, setFormData] = useState<QuotationFormData>({ items: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  const [serviceSelections, setServiceSelections] = useState<ServiceSelection[]>([]);
  const [campaignObjectives, setCampaignObjectives] = useState<CampaignObjectiveSetting[]>([]);
    // Removed filteredBusinesses - always show all businesses to allow free re-selection

  const calculateInitialExpiryDate = (issueDateStr: string): string => {
    if (!issueDateStr) return '';
    const issueDate = new Date(issueDateStr + 'T00:00:00');
    issueDate.setDate(issueDate.getDate() + 7);
    return getDateInYangonTimezone(issueDate);
  };

  useEffect(() => {
    if (isOpen) {
        const loadDataAndInitialize = async () => {
            try {
                 if (!editingQuotation) {
                    const objectives = await apiGetCampaignObjectiveSettings();
                    setCampaignObjectives(objectives.filter(s => s.isActive));
                }

                const defaultIssueDate = getTodayInYangon();
                if (editingQuotation) {
                    const selectionsFromItems: ServiceSelection[] = (editingQuotation.items || []).map(item => {
                        const rawServiceId = (item as any).serviceId || '';
                        const normalizedDesc = (item.description || '').toLowerCase();
                        const matchedService = rawServiceId
                            ? activeServices.find(s => s.id === rawServiceId)
                            : activeServices.find(s => normalizedDesc.includes(s.name.toLowerCase()));
                        const serviceId = matchedService?.id || rawServiceId;
                        const service = matchedService;
                        if (service && (typeof service.serviceRateMMK === 'number' || isBudgetBasedService(service))) {
                            const rate = service.serviceRateMMK || service.unitPriceMMK || 0;
                            const budgetUSD = rate > 0 ? Number((item.total / rate).toFixed(2)) : (item.quantity || 0);
                            return {
                                id: item.id,
                                serviceId: service.id,
                                campaignObjective: campaignObjectives[0]?.name || '',
                                budgetUSD,
                                startDate: getTodayInYangon(),
                                durationDays: '',
                                manualServiceRateMMK: service.serviceRateMMK || undefined
                            };
                        }
                        return {
                            id: item.id,
                            serviceId: serviceId,
                            quantity: item.quantity || 1
                        };
                    });
                    setServiceSelections(selectionsFromItems);
                    setFormData({
                        ...editingQuotation,
                        items: editingQuotation.items.map(item => ({...item})),
                        manualDiscountMMK: editingQuotation.manualDiscountMMK || '',
                        taxPercentage: editingQuotation.taxPercentage || '',
                        otherFeesAmountMMK: editingQuotation.otherFeesAmountMMK || '',
                        otherFeesDescription: editingQuotation.otherFeesDescription || '',
                    });
                } else {
                    setServiceSelections([]);
                    setFormData({
                        clientId: '',
                        businessId: '',
                        issueDate: defaultIssueDate,
                        expiryDate: calculateInitialExpiryDate(defaultIssueDate),
                        items: [],
                        status: QuotationStatus.DRAFT,
                        notes: '',
                        termsAndConditions: '',
                        manualDiscountMMK: '',
                        taxPercentage: '',
                        otherFeesAmountMMK: '',
                        otherFeesDescription: '',
                    });
                }
            } catch (err) {
                addNotification("Failed to load data for quotation form.", "error");
            }
        };
        loadDataAndInitialize();
    }
  }, [isOpen, editingQuotation, addNotification]);
  
  useEffect(() => {
    const newItems: ModalQuotationItem[] = [];
    const terms = new Set<string>();

    serviceSelections.forEach(selection => {
        const service = activeServices.find(s => s.id === selection.serviceId);
        if (!service) return;
        if (service.termsAndConditions) terms.add(service.termsAndConditions);

        if (typeof service.serviceRateMMK === 'number' || isBudgetBasedService(service)) {
            // Use manual rate if provided, otherwise get custom rate from business/client, otherwise use global service rate
            let rateToUse = selection.manualServiceRateMMK !== undefined && selection.manualServiceRateMMK !== '' 
                ? Number(selection.manualServiceRateMMK) 
                : (service.serviceRateMMK || service.unitPriceMMK || 0);
            
            // Only check custom rates if manual rate is not set
            if (selection.manualServiceRateMMK === undefined || selection.manualServiceRateMMK === '') {
                if (formData.businessId) {
                    const business = businesses.find(b => b.id === formData.businessId);
                    if (business?.customFacebookAdsRateMMK) {
                        rateToUse = business.customFacebookAdsRateMMK;
                    }
                } else if (formData.clientId) {
                    const client = clients.find(c => c.id === formData.clientId);
                    if (client?.customFacebookAdsRateMMK) {
                        rateToUse = client.customFacebookAdsRateMMK;
                    }
                }
            }
            const budgetUSD = Number(selection.budgetUSD) || 0;
            newItems.push(createBoostingInvoiceItem({
                id: selection.id,
                serviceId: service.id,
                serviceName: service.name,
                budgetUSD,
                serviceRateMMK: rateToUse,
            }));
        } else { // Other services type
            const quantity = Number(selection.quantity) || 0;
            const matchedPackage = service.packages.find(p => p.unitsOrUSD === quantity);
            const unitPrice = matchedPackage?.priceMMK !== undefined 
                ? (quantity > 0 ? matchedPackage.priceMMK / quantity : 0) 
                : (service.unitPriceMMK || 0);
            const total = matchedPackage?.priceMMK !== undefined ? matchedPackage.priceMMK : quantity * (service.unitPriceMMK || 0);
            
            newItems.push({
                id: selection.id,
                serviceId: service.id,
                description: service.name + (matchedPackage ? ` (${matchedPackage.tierName})` : ''),
                quantity: quantity,
                unitPrice: unitPrice,
                total: total,
            });
        }
    });

    setFormData(prev => ({
        ...prev,
        items: newItems,
        termsAndConditions: Array.from(terms).join('\n\n---\n\n')
    }));
  }, [serviceSelections, activeServices, editingQuotation, formData.clientId, formData.businessId, clients, businesses]);

  useEffect(() => {
    let subtotalCalc = 0;
    formData.items?.forEach(item => { subtotalCalc += item.total; });
    
    const discount = Number(formData.manualDiscountMMK) || 0;
    const otherFees = Number(formData.otherFeesAmountMMK) || 0;
    const subtotalAfterDiscount = subtotalCalc - discount;
    const tax = subtotalAfterDiscount * (Number(formData.taxPercentage) || 0) / 100;
    const grandTotal = subtotalAfterDiscount + otherFees + tax;

    setFormData(prev => ({ ...prev, subtotal: subtotalCalc, taxAmountMMK: tax, grandTotal }));
  }, [formData.items, formData.manualDiscountMMK, formData.taxPercentage, formData.otherFeesAmountMMK]);

  const handleClearClientBusiness = () => setFormData(prev => ({ ...prev, clientId: '', businessId: '' }));

  const businessOptions = useMemo(() => {
    const allBusinessOptions = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    
    // If client is selected, prioritize linked businesses at the top for better UX
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      if (client?.linkedBusinessIds?.length) {
        return allBusinessOptions.filter(opt => client.linkedBusinessIds!.includes(opt.value));
      }
      return [];
    }
    return allBusinessOptions;
  }, [businesses, formData.clientId, clients]);

  const clientOptions = useMemo(() => {
    const allClientOptions = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    if (formData.businessId) {
        const business = businesses.find(b => b.id === formData.businessId);
        if (business?.linkedClientIds?.length) {
            return allClientOptions.filter(opt => business.linkedClientIds!.includes(opt.value));
        }
        return [];
    }
    return allClientOptions;
  }, [clients, formData.businessId, businesses]);

  const handleItemChange = (index: number, field: keyof ModalQuotationItem, value: string | number) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index] };
    if (field === 'serviceId') {
      item.serviceId = String(value);
      const service = activeServices.find(s => s.id === item.serviceId);
      if(service) {
        item.description = service.name;
        item.unitPrice = service.unitPriceMMK || 0;
      }
    } else if (field === 'quantity' || field === 'unitPrice') {
      (item as any)[field] = value === '' ? '' : Number(value);
    } else {
      (item as any)[field] = value;
    }
    item.total = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    newItems[index] = item;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => setFormData(prev => ({ ...prev, items: [...(prev.items || []), { id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0, serviceId: '' }] }));
  const removeItem = (index: number) => setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }));
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string, value: string | number }}) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newState = { ...prev, [name]: value as string };
        if (name === 'issueDate' && !editingQuotation) {
            newState.expiryDate = calculateInitialExpiryDate(value as string);
        }
        return newState;
    });
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

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value === '' ? '' : Number(e.target.value) }));
  
  const addServiceSelection = () => setServiceSelections(prev => [...prev, { id: `sel-${Date.now()}`, serviceId: '' }]);
  const removeServiceSelection = (index: number) => setServiceSelections(prev => prev.filter((_, i) => i !== index));

  const updateServiceSelection = (index: number, field: keyof ServiceSelection, value: any) => {
    setServiceSelections(prev => {
        const newSelections = [...prev];
        const selection = { ...newSelections[index] };
        (selection as any)[field] = value;
        if (field === 'serviceId') {
            const service = activeServices.find(s => s.id === value);
            const newSelection: ServiceSelection = { id: selection.id, serviceId: value };
            if (isBudgetBasedService(service)) {
                newSelection.manualServiceRateMMK = service?.serviceRateMMK || service?.unitPriceMMK || undefined;
            }
            if (typeof service?.unitPriceMMK === 'number') newSelection.quantity = 1;
            newSelections[index] = newSelection;
        } else {
            newSelections[index] = selection;
        }
        return newSelections;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.businessId || !formData.issueDate || !formData.items || formData.items.length === 0) {
      addNotification("Client, Business, Issue Date, and at least one item are required.", "error");
      return;
    }
    setIsLoading(true);
    
    const itemsToSave: QuotationItem[] = formData.items.map(({ serviceId, ...restOfItem }) => restOfItem);

    const payload = {
      ...formData,
      items: itemsToSave, 
      createdByUserId: loggedInUserId,
      manualDiscountMMK: Number(formData.manualDiscountMMK) || 0,
      manualDiscountDescription: formData.manualDiscountDescription || '',
      taxPercentage: Number(formData.taxPercentage) || 0,
      otherFeesAmountMMK: Number(formData.otherFeesAmountMMK) || 0,
      otherFeesDescription: formData.otherFeesDescription || '',
    } as Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>;

    if (!payload.notes) delete (payload as Partial<Quotation>).notes;
    if (!payload.termsAndConditions) delete (payload as Partial<Quotation>).termsAndConditions;
    if (!payload.saleRecordId) delete (payload as Partial<Quotation>).saleRecordId;
    if (!payload.invoiceId) delete (payload as Partial<Quotation>).invoiceId;

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
  
  const serviceOptions = [{ value: '', label: '-- Select a Service --' }, ...activeServices.map(s => ({ value: s.id, label: s.name }))];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingQuotation ? "Edit Quotation" : "Create New Quotation"} size="3xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableSelect label="Client*" value={formData.clientId || ''} onChange={value => handleChange({ target: { name: 'clientId', value: String(value) } })}
              options={[{ value: '', label: '-- Select Client --' }, ...clientOptions]} placeholder="-- Select Client --" required />
            {(formData.clientId || formData.businessId) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearClientBusiness} className="mt-1 text-xs">Clear & Reselect</Button>
            )}
          </div>
          <SearchableSelect label="Business*" value={formData.businessId || ''} onChange={value => handleChange({ target: { name: 'businessId', value: String(value) } })}
            options={[{ value: '', label: '-- Select Business --' }, ...businessOptions]}
            placeholder="-- Search & Select Business --"
            required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Issue Date*" type="date" name="issueDate" value={formData.issueDate || ''} onChange={handleChange} required />
          <Input label="Expiry Date" type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} />
        </div>

        <h3 className="text-md font-semibold mt-4 pt-2 border-t dark:border-slate-700">Quotation Items</h3>
        
        <>
            {serviceSelections.map((selection, index) => {
                const service = activeServices.find(s => s.id === selection.serviceId);
                return (
                <div key={selection.id} className="p-4 border-2 rounded-lg relative space-y-3 bg-slate-50">
                    <Button type="button" variant="danger" onClick={() => removeServiceSelection(index)} className="absolute top-2 right-2 !p-1 h-6 w-6">X</Button>
                    <Select options={serviceOptions} value={selection.serviceId} onChange={(e) => updateServiceSelection(index, 'serviceId', e.target.value)} />
                    
                    {isBudgetBasedService(service) && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Input label="Budget (USD)" name="budgetUSD" type="number" value={selection.budgetUSD || ''} onChange={e => updateServiceSelection(index, 'budgetUSD', e.target.value)} containerClassName="mb-0" />
                                <Input label="Start Date" name="startDate" type="date" value={selection.startDate || ''} onChange={e => updateServiceSelection(index, 'startDate', e.target.value)} containerClassName="mb-0" />
                                <Input label="Duration (Days)" name="durationDays" type="number" value={selection.durationDays || ''} onChange={e => updateServiceSelection(index, 'durationDays', e.target.value)} containerClassName="mb-0" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                                <div>
                                    <label className="block text-xs text-text-secondary dark:text-slate-400 mb-1">
                                        System Rate (from Service)
                                    </label>
                                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-sm cursor-not-allowed opacity-75 select-none" contentEditable={false}>
                                        {(() => {
                                            let systemRate = service?.serviceRateMMK || service?.unitPriceMMK || 0;
                                            if (formData.businessId) {
                                                const business = businesses.find(b => b.id === formData.businessId);
                                                if (business?.customFacebookAdsRateMMK) {
                                                    systemRate = business.customFacebookAdsRateMMK;
                                                }
                                            } else if (formData.clientId) {
                                                const client = clients.find(c => c.id === formData.clientId);
                                                if (client?.customFacebookAdsRateMMK) {
                                                    systemRate = client.customFacebookAdsRateMMK;
                                                }
                                            }
                                            return `${systemRate.toLocaleString()} MMK per USD`;
                                        })()}
                                    </div>
                                </div>
                                <Input 
                                    label="Manual Rate (MMK per USD)" 
                                    type="number" 
                                    value={selection.manualServiceRateMMK !== undefined ? String(selection.manualServiceRateMMK) : ''} 
                                    onChange={e => updateServiceSelection(index, 'manualServiceRateMMK', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Leave empty to use system rate"
                                    containerClassName="mb-0"
                                />
                            </div>
                        </>
                    )}
                    {typeof service?.unitPriceMMK === 'number' && (
                         <Input label="Quantity" name="quantity" type="number" value={selection.quantity || ''} onChange={e => updateServiceSelection(index, 'quantity', e.target.value)} />
                    )}
                </div>
            )})}
            <Button type="button" variant="ghost" size="sm" onClick={addServiceSelection}>+ Add Service Item</Button>
        </>

        <h3 className="text-md font-semibold mt-4 pt-2 border-t dark:border-slate-700">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Subtotal (MMK)" value={formData.subtotal?.toLocaleString() || '0'} disabled />
            <Input label="Discount (MMK)" name="manualDiscountMMK" type="number" value={formData.manualDiscountMMK || ''} onChange={handleNumericChange} />
            <Input label="Tax (%)" name="taxPercentage" type="number" value={formData.taxPercentage || ''} onChange={handleNumericChange} min="0" max="100" />
            <Input label="Grand Total (MMK)" value={formData.grandTotal?.toLocaleString('en-US', {maximumFractionDigits: 2}) || '0'} disabled className="font-bold text-lg" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-2 border-t dark:border-slate-600">
            <Input 
                label="Additional Fees Description" 
                name="otherFeesDescription" 
                value={formData.otherFeesDescription || ''} 
                onChange={handleChange} 
                placeholder="e.g., Delivery Charges"
                containerClassName="mb-0"
            />
            <Input 
                label="Additional Fees Amount (MMK)" 
                type="number" 
                name="otherFeesAmountMMK" 
                value={String(formData.otherFeesAmountMMK || '')} 
                onChange={handleNumericChange}
                containerClassName="mb-0"
            />
        </div>

        <Input as="textarea" rows={2} label="Notes" name="notes" value={formData.notes || ''} onChange={handleChange} />
        
        <Input as="textarea" rows={4} label="Terms & Conditions" name="termsAndConditions" value={formData.termsAndConditions || ''} onChange={handleChange} />
        
        <Select label="Status" name="status" value={formData.status || QuotationStatus.DRAFT} onChange={handleChange}
          options={Object.values(QuotationStatus).map(s => ({ value: s, label: s }))} />

        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{editingQuotation ? "Save Changes" : "Create Quotation"}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditQuotationModal;