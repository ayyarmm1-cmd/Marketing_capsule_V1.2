import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Invoice, InvoiceStatus, InvoiceItem, Client, Business, Service, SaleRecord, Quotation, SaleStatus,
  CompanyProfileSetting, QuotationStatus, CampaignObjectiveSetting
} from '../../../types';
import { apiAddDirectInvoice, apiUpdateInvoice, apiGetCompanyProfile, apiGetCampaignObjectiveSettings, apiAddSaleRecord, apiLinkSalesToInvoice, apiGetServices } from '../../../services/api';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { useNotification } from '../../../hooks/useNotification';
import SearchableSelect from '../../ui/SearchableSelect';
import { getTodayInYangon, getDateInYangonTimezone } from '../../../utils/dateUtils';
import { createBoostingInvoiceItem, isBudgetBasedService, invoiceItemToServiceSelection, hydrateInvoiceItemsWithServiceIds, stripBudgetSuffixFromDescription, isBoostingServiceId, isBoostingServiceName, resolveServicesForInvoiceEdit, isBoostingInvoiceLineItem, inferBoostingServiceIdFromItem, resolveBoostingRateFromInvoiceItem } from '../../../utils/boostingServiceUtils';

interface CreateEditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  clients: Client[];
  businesses: Business[];
  activeServices?: Service[];
  editingInvoice?: Invoice | null;
  loggedInUserId: string;
  pendingSales?: SaleRecord[];
  onCreateFromSale?: (saleId: string) => void;
  companyProfile?: CompanyProfileSetting | null; // Pass as prop to avoid fetching
  campaignObjectives?: CampaignObjectiveSetting[]; // Pass as prop to avoid fetching
}

interface ModalInvoiceItem extends InvoiceItem {
  serviceId?: string;
}

type InvoiceFormData = Omit<Partial<Invoice>, 'items' | 'subtotal' | 'tax' | 'grandTotal' | 'discount' | 'amountPaid' | 'otherFeesAmountMMK'> & {
    items: ModalInvoiceItem[];
    subtotal?: number;
    discount?: number | '';
    otherFeesAmountMMK?: number | '';
    taxPercentage?: number | '';
    taxAmount?: number;
    grandTotal?: number;
    amountPaid?: number;
};

interface ServiceSelection {
    id: string;
    serviceId: string;
    manualServiceRateMMK?: number | '';
    [key: string]: any;
}

const CreateEditInvoiceModal: React.FC<CreateEditInvoiceModalProps> = ({
  isOpen, onClose, onSubmit, clients, businesses, activeServices = [], loggedInUserId, editingInvoice,
  companyProfile: propsCompanyProfile, campaignObjectives: propsCampaignObjectives
}) => {
  const { addNotification } = useNotification();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(propsCompanyProfile || null);
  const [formData, setFormData] = useState<InvoiceFormData>({ items: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  const [serviceSelections, setServiceSelections] = useState<ServiceSelection[]>([]);
  const [campaignObjectives, setCampaignObjectives] = useState<CampaignObjectiveSetting[]>(propsCampaignObjectives || []);
  const [allServicesCatalog, setAllServicesCatalog] = useState<Service[]>([]);
  const [isHydratingEditForm, setIsHydratingEditForm] = useState(false);
  /** Skip auto-rebuild of items while hydrating edit form from saved invoice. */
  const userModifiedSelectionsRef = useRef(false);
  const hydratedInvoiceIdRef = useRef<string | null>(null);

  const servicesForModal = useMemo(() => {
    if (!editingInvoice) {
      return activeServices.filter(s => s.isActive !== false);
    }
    const catalog = allServicesCatalog.length > 0 ? allServicesCatalog : activeServices;
    return resolveServicesForInvoiceEdit(
      activeServices,
      catalog,
      editingInvoice.items || []
    );
  }, [activeServices, allServicesCatalog, editingInvoice]);

  const calculateFutureDate = (baseDateStr: string, daysToAdd: number): string => {
    if (!baseDateStr) return '';
    const baseDate = new Date(baseDateStr + 'T00:00:00');
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    return getDateInYangonTimezone(baseDate);
  };

  useEffect(() => {
    if (!isOpen) {
      userModifiedSelectionsRef.current = false;
      hydratedInvoiceIdRef.current = null;
      setAllServicesCatalog([]);
      setIsHydratingEditForm(false);
      return;
    }
    if (!editingInvoice && activeServices.length === 0) return;

        const loadDataAndInitialize = async () => {
            setIsHydratingEditForm(!!editingInvoice);
            try {
                let fetchedServices: Service[] = [];
                if (editingInvoice) {
                    fetchedServices = await apiGetServices();
                    setAllServicesCatalog(fetchedServices);
                }

                // Only fetch if not provided as props
                if (!propsCompanyProfile) {
                    const profile = await apiGetCompanyProfile();
                    setCompanyProfile(profile);
                } else {
                    setCompanyProfile(propsCompanyProfile);
                }

                if (!editingInvoice) {
                    // Only fetch if not provided as props
                    if (!propsCampaignObjectives) {
                        const objectives = await apiGetCampaignObjectiveSettings();
                        setCampaignObjectives(objectives.filter(s => s.isActive));
                    }
                }

                const defaultIssueDate = getTodayInYangon();
                const defaultDueDate = calculateFutureDate(defaultIssueDate, 7);
                const profile = propsCompanyProfile || companyProfile;

                if (editingInvoice) {
                    if (fetchedServices.length === 0) {
                        addNotification("Could not load services for invoice edit.", "error");
                        return;
                    }

                    userModifiedSelectionsRef.current = false;

                    const editServices = resolveServicesForInvoiceEdit(
                      fetchedServices.filter(s => s.isActive !== false),
                      fetchedServices,
                      editingInvoice.items || []
                    );

                    const hydratedItems = hydrateInvoiceItemsWithServiceIds(editingInvoice.items || [], editServices);
                    const selectionsFromItems: ServiceSelection[] = hydratedItems.map(item =>
                      invoiceItemToServiceSelection(item, editServices)
                    );

                    setServiceSelections(
                      selectionsFromItems.length > 0
                        ? selectionsFromItems
                        : [{ id: `sel-${Date.now()}`, serviceId: '' }]
                    );
                    setFormData({
                        ...editingInvoice,
                        clientId: editingInvoice.clientId,
                        businessId: editingInvoice.businessId,
                        issueDate: editingInvoice.issueDate.split('T')[0],
                        dueDate: editingInvoice.dueDate.split('T')[0],
                        items: hydratedItems.map(item => ({ ...item })),
                        subtotal: editingInvoice.subtotal,
                        grandTotal: editingInvoice.grandTotal,
                        discount: editingInvoice.discount || '',
                        taxPercentage: editingInvoice.subtotal && editingInvoice.tax && (editingInvoice.subtotal - (editingInvoice.discount || 0)) !== 0
                                       ? (((editingInvoice.tax) / (editingInvoice.subtotal - (editingInvoice.discount || 0))) * 100)
                                       : '',
                        otherFeesAmountMMK: editingInvoice.otherFeesAmountMMK || '',
                        otherFeesDescription: editingInvoice.otherFeesDescription || '',
                    });
                    hydratedInvoiceIdRef.current = editingInvoice.id;
                } else {
                    userModifiedSelectionsRef.current = false;
                    setServiceSelections([]);
                    const defaultInstructions = profile?.paymentInstructions || '';
                    const paymentMethodsLinkUrl = 'https://marketingcapsule.app/#/payments';
                    const paymentMethodsLinkText = `\n\nFor payment methods and details, please visit: ${paymentMethodsLinkUrl}`;
                    setFormData({
                        clientId: '',
                        businessId: '',
                        issueDate: defaultIssueDate,
                        dueDate: defaultDueDate,
                        items: [],
                        status: InvoiceStatus.DRAFT,
                        notes: '',
                        paymentInstructions: (defaultInstructions + paymentMethodsLinkText).trim(),
                        companyBankDetails: profile?.companyBankDetails || '',
                        discount: '',
                        taxPercentage: '',
                        otherFeesAmountMMK: '',
                        otherFeesDescription: '',
                    });
                }
            } catch (err) {
                addNotification("Failed to load data for invoice form.", "error");
            } finally {
                setIsHydratingEditForm(false);
            }
        };
        loadDataAndInitialize();
  }, [isOpen, editingInvoice?.id, addNotification, propsCompanyProfile, propsCampaignObjectives]);
  
  useEffect(() => {
    // While loading edit form, keep saved line items/totals — only rebuild after user edits selections.
    if (editingInvoice && !userModifiedSelectionsRef.current) return;

    const newItems: ModalInvoiceItem[] = [];
    serviceSelections.forEach(selection => {
        const service = servicesForModal.find(s => s.id === selection.serviceId);
        if (!service || !selection.serviceId) return;

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
        } else {
            const quantity = Number(selection.quantity) || 0;
            const matchedPackage = service.packages.find(p => p.unitsOrUSD === quantity);
            const unitPrice = matchedPackage?.priceMMK !== undefined 
                ? (quantity > 0 ? matchedPackage.priceMMK / quantity : 0) 
                : (service.unitPriceMMK || 0);
            const total = matchedPackage?.priceMMK !== undefined ? matchedPackage.priceMMK : quantity * (service.unitPriceMMK || 0);
            
            newItems.push({
                id: selection.id, serviceId: service.id,
                description: service.name + (matchedPackage ? ` (${matchedPackage.tierName})` : ''),
                quantity: quantity, unitPrice: unitPrice, total: total,
            });
        }
    });
    if (newItems.length > 0 || !editingInvoice) {
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  }, [serviceSelections, servicesForModal, editingInvoice, formData.clientId, formData.businessId, clients, businesses]);

  useEffect(() => {
    let subtotalCalc = formData.items?.reduce((sum, item) => sum + item.total, 0) || 0;
    const discountVal = Number(formData.discount) || 0;
    const otherFees = Number(formData.otherFeesAmountMMK) || 0;
    const subtotalAfterDiscount = subtotalCalc - discountVal;
    const taxRate = Number(formData.taxPercentage) || 0; 
    const taxAmountCalc = subtotalAfterDiscount * (taxRate / 100);
    const grandTotalCalc = subtotalAfterDiscount + otherFees + taxAmountCalc;
    setFormData(prev => ({ ...prev, subtotal: subtotalCalc, taxAmount: taxAmountCalc, grandTotal: grandTotalCalc }));
  }, [formData.items, formData.discount, formData.taxPercentage, formData.otherFeesAmountMMK]);

  const addServiceSelection = () => {
    userModifiedSelectionsRef.current = true;
    setServiceSelections(prev => [...prev, { id: `sel-${Date.now()}`, serviceId: '' }]);
  };
  const removeServiceSelection = (index: number) => {
    userModifiedSelectionsRef.current = true;
    setServiceSelections(prev => prev.filter((_, i) => i !== index));
  };

  const updateServiceSelection = (index: number, field: keyof ServiceSelection, value: any) => {
    userModifiedSelectionsRef.current = true;
    setServiceSelections(prev => {
        const newSelections = [...prev];
        const selection = { ...newSelections[index] };
        (selection as any)[field] = value;
        if (field === 'serviceId') {
            const service = servicesForModal.find(s => s.id === value);
            const newSelection: ServiceSelection = { id: selection.id, serviceId: value };
            if (isBudgetBasedService(service)) {
                newSelection.startDate = getTodayInYangon();
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

  const handleItemChange = (index: number, field: keyof ModalInvoiceItem, value: any) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index] };
    if (field === 'serviceId') {
      item.serviceId = String(value);
      const service = activeServices.find(s => s.id === item.serviceId);
      if (service) {
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
        if (name === 'issueDate' && !editingInvoice) {
            newState.dueDate = calculateFutureDate(value as string, 7);
        }
        return newState;
    });
  };

  useEffect(() => {
    if (formData.clientId && !editingInvoice && businesses.length > 0 && clients.length > 0) {
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
  }, [formData.clientId, clients, businesses, editingInvoice]);

  useEffect(() => {
    if (formData.businessId && !editingInvoice && businesses.length > 0 && clients.length > 0) {
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
  }, [formData.businessId, clients, businesses, editingInvoice]);

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value === '' ? '' : Number(e.target.value) }));

  const getDefaultFormData = useCallback((profile?: CompanyProfileSetting | null) => {
    const defaultIssueDate = getTodayInYangon();
    const defaultDueDate = calculateFutureDate(defaultIssueDate, 7);
    const defaultInstructions = profile?.paymentInstructions || '';
    const paymentMethodsLinkUrl = 'https://marketingcapsule.app/#/payments';
    const paymentMethodsLinkText = `\n\nFor payment methods and details, please visit: ${paymentMethodsLinkUrl}`;
    return {
        clientId: '',
        businessId: '',
        issueDate: defaultIssueDate,
        dueDate: defaultDueDate,
        items: [],
        status: InvoiceStatus.DRAFT,
        notes: '',
        paymentInstructions: (defaultInstructions + paymentMethodsLinkText).trim(),
        companyBankDetails: profile?.companyBankDetails || '',
        discount: '',
        taxPercentage: '',
        otherFeesAmountMMK: '',
        otherFeesDescription: '',
    } as InvoiceFormData;
  }, []);

  const resetForm = useCallback(() => {
    setServiceSelections([]);
    setFormData(getDefaultFormData(propsCompanyProfile || companyProfile));
  }, [getDefaultFormData, propsCompanyProfile, companyProfile]);


  const handleSubmit = async (e: React.FormEvent, continueAfterSave: boolean = false) => {
    e.preventDefault();
    if (!formData.clientId || !formData.businessId || !formData.items || formData.items.length === 0) {
      addNotification("Client, Business and at least one item are required.", "error"); return;
    }
    setIsLoading(true);
    
    const itemsToSave: InvoiceItem[] = formData.items.map(({ serviceId, ...restOfItem }) => ({
      ...restOfItem,
      ...(serviceId ? { serviceId } : {}),
    }));
    const payload = {
      ...formData,
      items: itemsToSave,
      discount: Number(formData.discount) || 0,
      tax: formData.taxAmount || 0,
      amountPaid: editingInvoice?.amountPaid || 0,
      otherFeesAmountMMK: Number(formData.otherFeesAmountMMK) || 0,
      otherFeesDescription: formData.otherFeesDescription || '',
    } as Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;

    if (!payload.notes) delete (payload as Partial<Invoice>).notes;
    if (!payload.paymentInstructions) delete (payload as Partial<Invoice>).paymentInstructions;
    if (!payload.companyBankDetails) delete (payload as Partial<Invoice>).companyBankDetails;
    if (!payload.saleRecordId) delete (payload as Partial<Invoice>).saleRecordId;
    if (!payload.quotationId) delete (payload as Partial<Invoice>).quotationId;

    try {
      let linkedSaleId = editingInvoice?.saleRecordId;
      let createdSaleIds: string[] = [];
      
      /**
       * INVOICE CREATION FLOW - BALANCE UPDATE LOGIC:
       * 
       * When creating a NEW invoice (not editing):
       * 1. First, create a Sale Record → This updates Client/Business balance
       * 2. Then, create Invoice with saleRecordId → This does NOT update balance (sale already did)
       * 
       * This prevents double-counting the same transaction in the balance.
       * 
       * When creating invoice from existing Sale Record (via apiCreateInvoiceFromSale):
       * - Invoice is created with saleRecordId → Balance NOT updated (sale already updated it)
       * 
       * This ensures:
       * - Manual invoice from Invoices Page → Creates sale → Creates invoice → Balance updated once by sale
       * - Invoice from Sales Record → Creates invoice with saleRecordId → Balance NOT updated (sale already did)
       * - Invoice from Client/Business detail pages → Same as manual invoice (creates sale first)
       */
      if (!editingInvoice) {
        // Step 1: Create Sale Records per invoice item (each sale updates balance)
        // Sales are auto-approved (status = APPROVED, not DRAFT) and update balance immediately
        createdSaleIds = [];
        const taxPercentageValue = formData.taxPercentage && Number(formData.taxPercentage) > 0 ? Number(formData.taxPercentage) : undefined;
        
        if (!formData.items || formData.items.length === 0) {
          addNotification("Please add at least one item to the invoice.", "error");
          setIsLoading(false);
          return;
        }
        
        // Calculate per-item tax and discount distribution
        // Total discount and tax should be distributed proportionally across items
        const itemSubtotal = formData.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const discountAmount = Number(formData.discount) || 0;
        const taxAmount = Number(formData.taxAmount) || 0;
        const otherFeesAmount = Number(formData.otherFeesAmountMMK) || 0;
        
        // Create one sale record per invoice item
        for (let i = 0; i < formData.items.length; i++) {
          const item = formData.items[i];
          const itemTotal = Number(item.total) || 0;
          
          // Distribute discount, tax, and other fees proportionally
          const itemProportion = itemSubtotal > 0 ? itemTotal / itemSubtotal : 1 / formData.items.length;
          const itemDiscount = discountAmount * itemProportion;
          const itemTax = taxAmount * itemProportion;
          const itemOtherFees = otherFeesAmount * itemProportion;
          
          const itemGrandTotal = itemTotal - itemDiscount + itemTax + itemOtherFees;
          
          // Determine service ID for this item
          const serviceId = item.serviceId || activeServices[0]?.id;
          if (!serviceId) {
            addNotification(`Please select a service for item "${item.description || `Item ${i + 1}`}".`, "error");
            setIsLoading(false);
            return;
          }
          
          const salePayload: any = {
            clientId: formData.clientId,
            businessId: formData.businessId,
            serviceId: serviceId,
            inChargeUserId: loggedInUserId,
            type: 'Other Services' as const,
            status: SaleStatus.CHECKED, // Auto-approve sales created from invoice (CHECKED = 'Approved')
            subtotalMMK: itemTotal,
            packageDiscountMMK: itemDiscount,
            manualDiscountMMK: 0,
            grandTotalMMK: itemGrandTotal,
            amountPaid: 0,
            taxAmountMMK: itemTax,
            quantity: Number(item.quantity) || 1,
            unitPriceMMK: Number(item.unitPrice) || 0,
          };
          
          // Only include optional fields if they have values
          if (formData.notes) salePayload.notes = formData.notes;
          if (taxPercentageValue !== undefined) salePayload.taxPercentage = taxPercentageValue;
          if (itemOtherFees > 0) {
            salePayload.otherFeesAmountMMK = itemOtherFees;
          }
          if (formData.otherFeesDescription) salePayload.otherFeesDescription = formData.otherFeesDescription;
          
          // Create sale record - this updates Client/Business balance immediately
          const newSale = await apiAddSaleRecord(salePayload as any);
          createdSaleIds.push(newSale.id);
        }
        
        // Link invoice to first sale (for backward compatibility)
        // TODO: Consider adding saleRecordIds array to Invoice interface for full support
        linkedSaleId = createdSaleIds[0];
      }

      if (editingInvoice?.id) {
        await apiUpdateInvoice({ ...payload, id: editingInvoice.id } as Invoice);
        addNotification("Invoice updated successfully!", "success");
      } else {
        // Step 2: Create Invoice with saleRecordId - this does NOT update balance (sale already did)
        if (linkedSaleId) {
          payload.saleRecordId = linkedSaleId;
        }
        const createdInvoice = await apiAddDirectInvoice(payload);
        if (createdSaleIds.length > 0) {
          await apiLinkSalesToInvoice(createdSaleIds, createdInvoice.id);
        }
        addNotification("Invoice created successfully!", "success");
      }
      if (continueAfterSave) {
        resetForm();
      } else {
        onSubmit();
      }
    } catch (error) {
      addNotification(`Failed to save invoice: ${(error as Error).message}`, "error");
    }
    setIsLoading(false);
  };

  const handleClearClientBusiness = () => setFormData(prev => ({ ...prev, clientId: '', businessId: '' }));

  // Business options - when client selected, show only linked; else all
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

  const serviceOptions = useMemo(() => {
    const sourceServices = editingInvoice ? servicesForModal : activeServices.filter(s => s.isActive !== false);
    const options = sourceServices.map(s => ({ value: s.id, label: s.name }));
    const knownIds = new Set(options.map(o => o.value));
    serviceSelections.forEach(sel => {
      const savedItem = editingInvoice?.items.find(i => i.id === sel.id)
        ?? formData.items?.find(i => i.id === sel.id);
      const sid =
        sel.serviceId ||
        savedItem?.serviceId ||
        (savedItem ? inferBoostingServiceIdFromItem(savedItem, servicesForModal) : '') ||
        '';
      if (!sid || knownIds.has(sid)) return;
      const label = stripBudgetSuffixFromDescription(savedItem?.description) || sid;
      options.push({ value: sid, label });
      knownIds.add(sid);
    });
    return [{ value: '', label: '-- Select a Service --' }, ...options];
  }, [activeServices, servicesForModal, serviceSelections, editingInvoice, formData.items]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingInvoice ? "Edit Invoice" : "Create New Invoice"} size="3xl">
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableSelect label="Client*" value={formData.clientId || ''} onChange={value => {
              const v = String(value);
              const client = clients.find(c => c.id === v);
              setFormData(prev => {
                const next = { ...prev, clientId: v };
                if (client?.linkedBusinessIds?.length && prev.businessId && !client.linkedBusinessIds.includes(prev.businessId)) {
                  next.businessId = client.linkedBusinessIds[0];
                }
                return next;
              });
            }}
              options={[{ value: '', label: '-- Select Client --' }, ...clientOptions]} placeholder="-- Search & Select Client --" required />
            {(formData.clientId || formData.businessId) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearClientBusiness} className="mt-1 text-xs">Clear & Reselect</Button>
            )}
          </div>
          <SearchableSelect label="Business*" value={formData.businessId || ''} onChange={value => {
            const v = String(value);
            const business = businesses.find(b => b.id === v);
            setFormData(prev => {
              const next = { ...prev, businessId: v };
              if (business?.linkedClientIds?.length && prev.clientId && !business.linkedClientIds.includes(prev.clientId)) {
                next.clientId = business.linkedClientIds[0];
              }
              return next;
            });
          }}
            options={[{ value: '', label: '-- Select Business --' }, ...businessOptions]}
            placeholder="-- Search & Select Business --"
            required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Issue Date*" type="date" name="issueDate" value={formData.issueDate || ''} onChange={handleChange} required />
          <Input label="Due Date*" type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} required />
        </div>

        <h3 className="text-md font-semibold mt-4 pt-2 border-t dark:border-slate-700">Invoice Items</h3>

        {isHydratingEditForm ? (
          <p className="text-sm text-text-secondary dark:text-slate-400 py-4">Loading invoice items...</p>
        ) : (
        <>
            {serviceSelections.map((selection, index) => {
                const savedItem = formData.items?.find(i => i.id === selection.id);
                const resolvedServiceId =
                  selection.serviceId ||
                  savedItem?.serviceId ||
                  (savedItem ? inferBoostingServiceIdFromItem(savedItem, servicesForModal) : '') ||
                  '';
                const service = servicesForModal.find(s => s.id === resolvedServiceId);
                const isBudgetLine =
                  isBoostingServiceId(resolvedServiceId) ||
                  isBudgetBasedService(service) ||
                  (savedItem ? isBoostingInvoiceLineItem(savedItem, servicesForModal) : false) ||
                  isBoostingServiceName(savedItem?.description) ||
                  isBoostingServiceName(service?.name);
                const budgetValue =
                  selection.budgetUSD !== undefined && selection.budgetUSD !== ''
                    ? selection.budgetUSD
                    : isBudgetLine && savedItem?.quantity != null
                      ? savedItem.quantity
                      : savedItem && resolveBoostingRateFromInvoiceItem(savedItem) > 0
                        ? Number((Number(savedItem.total) / resolveBoostingRateFromInvoiceItem(savedItem)).toFixed(2))
                        : '';
                const manualRateValue =
                  selection.manualServiceRateMMK !== undefined && selection.manualServiceRateMMK !== ''
                    ? String(selection.manualServiceRateMMK)
                    : savedItem && resolveBoostingRateFromInvoiceItem(savedItem) > 0
                      ? String(resolveBoostingRateFromInvoiceItem(savedItem))
                      : '';
                return (
                <div key={selection.id} className="p-4 border-2 rounded-lg relative space-y-3 bg-slate-50 dark:bg-slate-800/50">
                    <Button type="button" variant="danger" onClick={() => removeServiceSelection(index)} className="absolute top-2 right-2 !p-1 h-6 w-6">X</Button>
                    <Select options={serviceOptions} value={resolvedServiceId} onChange={(e) => updateServiceSelection(index, 'serviceId', e.target.value)} />
                    
                    {isBudgetLine && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Input label="Budget (USD)" type="number" value={budgetValue} onChange={e => updateServiceSelection(index, 'budgetUSD', e.target.value)} containerClassName="mb-0"/>
                                <Input label="Start Date" type="date" value={selection.startDate || ''} onChange={e => updateServiceSelection(index, 'startDate', e.target.value)} containerClassName="mb-0"/>
                                <Input label="Duration (Days)" type="number" value={selection.durationDays || ''} onChange={e => updateServiceSelection(index, 'durationDays', e.target.value)} containerClassName="mb-0"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t dark:border-slate-600">
                                <div>
                                    <label className="block text-xs text-text-secondary dark:text-slate-400 mb-1">
                                        System Rate (from Service)
                                    </label>
                                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-sm cursor-not-allowed opacity-75 select-none" contentEditable={false}>
                                        {(() => {
                                            let systemRate = service?.serviceRateMMK || service?.unitPriceMMK || resolveBoostingRateFromInvoiceItem(savedItem || {}) || 0;
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
                                            return `${Number(systemRate).toLocaleString()} MMK per USD`;
                                        })()}
                                    </div>
                                </div>
                                <Input 
                                    label="Manual Rate (MMK per USD)" 
                                    type="number" 
                                    value={manualRateValue} 
                                    onChange={e => updateServiceSelection(index, 'manualServiceRateMMK', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Leave empty to use system rate"
                                    containerClassName="mb-0"
                                />
                            </div>
                        </>
                    )}
                    {!isBudgetLine && (service?.unitPriceMMK != null || savedItem) && (
                         <Input label="Quantity" type="number" value={selection.quantity ?? savedItem?.quantity ?? ''} onChange={e => updateServiceSelection(index, 'quantity', e.target.value)} />
                    )}
                </div>
            )})}
            <Button type="button" variant="ghost" size="sm" onClick={addServiceSelection}>+ Add Service Item</Button>
        </>
        )}

        <h3 className="text-md font-semibold mt-4 pt-2 border-t dark:border-slate-700">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Subtotal (MMK)" value={formData.subtotal?.toLocaleString() || '0'} disabled />
            <Input label="Discount (MMK)" name="discount" type="number" value={formData.discount || ''} onChange={handleNumericChange} />
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
        
        <Input as="textarea" rows={4} label="Payment Instructions" name="paymentInstructions" value={formData.paymentInstructions || ''} onChange={handleChange} />

        <Select label="Status" name="status" value={formData.status || InvoiceStatus.DRAFT} onChange={handleChange}
          options={Object.values(InvoiceStatus).map(s => ({ value: s, label: s }))} />

        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          {editingInvoice ? (
            <Button type="submit" variant="primary" isLoading={isLoading}>Save Changes</Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={(e) => handleSubmit(e, true)} isLoading={isLoading}>
                Save and Add Another
              </Button>
              <Button type="button" variant="primary" onClick={(e) => handleSubmit(e, false)} isLoading={isLoading}>
                Save and Exit
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditInvoiceModal;