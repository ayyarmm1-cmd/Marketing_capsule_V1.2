import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Client, Business, Service, SaleStatus, User, SaleRecord, CampaignObjectiveSetting, FacebookCampaignStatus, Permission, PaymentMethodSetting, CashAccount } from '../../../types';
import { apiAddSaleRecord, apiUpdateSaleRecord, apiRecordPayment } from '../../../services/api';
import { logTiming } from '../../../utils/perf';
import { getTodayInYangon, getDateInYangonTimezone } from '../../../utils/dateUtils';
import { dispatchRefreshData } from '../../../utils/refreshDataBus';
import { isBudgetBasedService } from '../../../utils/boostingServiceUtils';
import { useNotification } from '../../../hooks/useNotification';
import { useAuth } from '../../../hooks/useAuth';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import SearchableSelect from '../../ui/SearchableSelect';

interface AddSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newSale?: SaleRecord, shouldRecordPayment?: boolean) => void;
    onRecordPayment?: (sale: SaleRecord) => void;
    editingSale: SaleRecord | null;
    clients: Client[];
    businesses: Business[];
    allServices: Service[];
    loggedInUser: User | null;
    allUsers: User[];
    campaignObjectives: CampaignObjectiveSetting[];
    paymentMethods?: PaymentMethodSetting[];
    cashAccounts?: CashAccount[];
    defaultServiceType?: SaleRecord['type'];
    defaultClientId?: string;
    defaultBusinessId?: string;
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ 
    isOpen, onClose, onSuccess, onRecordPayment, editingSale, clients, businesses, allServices, 
    loggedInUser, allUsers, campaignObjectives, paymentMethods = [], cashAccounts = [],
    defaultServiceType, defaultClientId, defaultBusinessId
}) => {
    const { addNotification } = useNotification();
    const { user, hasPermission } = useAuth();
    const [autoApproveOnCreate, setAutoApproveOnCreate] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Removed filteredBusinesses - always show all businesses to allow free re-selection
    const [financials, setFinancials] = useState({ subtotal: 0, taxAmount: 0, grandTotal: 0, otherFees: 0 });
    const [recordPaymentImmediately, setRecordPaymentImmediately] = useState(false);
    const [createdSale, setCreatedSale] = useState<SaleRecord | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState(getTodayInYangon);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentRemark, setPaymentRemark] = useState('');
    const [transactionLast4Digits, setTransactionLast4Digits] = useState('');


    useEffect(() => {
        if (isOpen && !editingSale) {
            setCreatedSale(null);
        }
    }, [isOpen, editingSale]);

    const initializeForm = useCallback(() => {
        let serviceToUse: Service | null = null;

        if (defaultServiceType) {
            const serviceTypeName = defaultServiceType;
            if (serviceTypeName === 'Facebook Ads') serviceToUse = allServices.find(s => typeof s.serviceRateMMK === 'number') || null;
        } else {
            serviceToUse = allServices.find(s => s.id === editingSale?.serviceId) || (allServices.length > 0 ? allServices[0] : null);
        }

        setSelectedService(serviceToUse);

        const baseData = {
            clientId: editingSale?.clientId || defaultClientId || '',
            businessId: editingSale?.businessId || defaultBusinessId || '',
            serviceId: editingSale?.serviceId || serviceToUse?.id || '',
            inChargeUserId: editingSale?.inChargeUserId || loggedInUser?.id || '',
            notes: editingSale?.notes || '',
            manualDiscountMMK: editingSale?.manualDiscountMMK || 0,
            manualDiscountDescription: editingSale?.manualDiscountDescription || '',
            taxPercentage: editingSale?.taxPercentage || 0,
            otherFeesDescription: editingSale?.otherFeesDescription || '',
            otherFeesAmountMMK: editingSale?.otherFeesAmountMMK || 0,
        };

        let typeSpecificData = {};
        if (editingSale) {
             if (editingSale.type === 'Facebook Ads') {
                const fbSale = editingSale as any;
                typeSpecificData = { 
                    campaignName: editingSale.campaignName, 
                    campaignObjective: editingSale.campaignObjective, 
                    budgetUSD: editingSale.budgetUSD, 
                    startDate: editingSale.startDate, 
                    durationDays: editingSale.durationDays, 
                    campaignStatus: editingSale.campaignStatus,
                    manualServiceRateMMK: fbSale.serviceRateMMK || serviceToUse?.serviceRateMMK || undefined
                };
            } else if (editingSale.type === 'Other Services') {
                const otherSale = editingSale as any;
                typeSpecificData = { 
                    quantity: editingSale.quantity,
                    manualUnitPriceMMK: otherSale.unitPriceMMK || serviceToUse?.unitPriceMMK || undefined,
                    saleDate: otherSale.saleDate
                        || (editingSale.createdAt ? getDateInYangonTimezone(new Date(editingSale.createdAt)) : getTodayInYangon()),
                };
            }
        } else if (serviceToUse) {
            // Set initial data for new sale based on selected service
            const type = getSaleType(serviceToUse);
            if (type === 'Facebook Ads') {
                 typeSpecificData = { 
                    campaignObjective: campaignObjectives[0]?.name || '', 
                    budgetUSD: '', 
                    startDate: getTodayInYangon(), 
                    durationDays: '', 
                    campaignName: '',
                    manualServiceRateMMK: serviceToUse.serviceRateMMK || undefined
                };
            } else { // Other services
                typeSpecificData = { 
                    quantity: 1,
                    manualUnitPriceMMK: serviceToUse.unitPriceMMK || undefined,
                    saleDate: getTodayInYangon(),
                };
            }
        }
        
        setFormData({ ...baseData, ...typeSpecificData });
        setRecordPaymentImmediately(false);
        setPaymentAmount('');
        setPaymentDate(getTodayInYangon());
        setPaymentMethod('');
        setPaymentRemark('');
        setTransactionLast4Digits('');
    }, [editingSale, allServices, loggedInUser, defaultServiceType, defaultClientId, defaultBusinessId, campaignObjectives, paymentMethods]);

    useEffect(() => {
        if(isOpen) {
            initializeForm();
        }
    }, [isOpen, initializeForm]);

    // Auto-update business when client is selected (client -> linked business). User can change business later. Skip in edit mode.
    useEffect(() => {
        if (editingSale || !formData.clientId || businesses.length === 0 || clients.length === 0) return;
        const selectedClient = clients.find(c => c.id === formData.clientId);
        if (!selectedClient?.linkedBusinessIds?.length) return;
        const firstLinkedBusinessId = selectedClient.linkedBusinessIds[0];
        if (!businesses.some(b => b.id === firstLinkedBusinessId)) return;
        // Auto-set only when business is empty or current business is not linked to this client
        const shouldSet = !formData.businessId || !selectedClient.linkedBusinessIds.includes(formData.businessId);
        if (shouldSet && formData.businessId !== firstLinkedBusinessId) {
            setFormData((prev: any) => ({ ...prev, businessId: firstLinkedBusinessId }));
        }
    }, [editingSale, formData.clientId, formData.businessId, clients, businesses]);

    // Auto-update client when business is selected (business -> linked client). User can change client later. Skip in edit mode.
    useEffect(() => {
        if (editingSale || !formData.businessId || businesses.length === 0 || clients.length === 0) return;
        const selectedBusiness = businesses.find(b => b.id === formData.businessId);
        if (!selectedBusiness?.linkedClientIds?.length) return;
        const firstLinkedClientId = selectedBusiness.linkedClientIds[0];
        if (!clients.some(c => c.id === firstLinkedClientId)) return;
        // Auto-set only when client is empty or current client is not linked to this business
        const shouldSet = !formData.clientId || !selectedBusiness.linkedClientIds.includes(formData.clientId);
        if (shouldSet && formData.clientId !== firstLinkedClientId) {
            setFormData((prev: any) => ({ ...prev, clientId: firstLinkedClientId }));
        }
    }, [editingSale, formData.businessId, formData.clientId, businesses, clients]);

    // No longer need filteredBusinesses - businessOptions now handles all businesses

    const getSaleType = (service: Service | null): SaleRecord['type'] | null => {
        if (!service) return null;
        if (isBudgetBasedService(service)) return 'Facebook Ads';
        return 'Other Services';
    };

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const serviceId = e.target.value;
        const service = allServices.find(s => s.id === serviceId) || null;
        
        const serviceSpecificData: any = {
            serviceId: service?.id || '',
            campaignName: undefined, campaignObjective: undefined, budgetUSD: undefined, startDate: undefined, durationDays: undefined,
            quantity: undefined,
            saleDate: undefined,
            manualServiceRateMMK: undefined,
            manualUnitPriceMMK: undefined,
        };
        
        const type = getSaleType(service);

        if (type === 'Facebook Ads') {
            serviceSpecificData.campaignObjective = campaignObjectives[0]?.name || '';
            serviceSpecificData.budgetUSD = '';
            serviceSpecificData.startDate = new Date().toISOString().split('T')[0];
            serviceSpecificData.durationDays = '';
            serviceSpecificData.campaignName = '';
            serviceSpecificData.manualServiceRateMMK = service?.serviceRateMMK || service?.unitPriceMMK || undefined;
        } else if (type === 'Other Services') { // Other
            serviceSpecificData.quantity = 1;
            serviceSpecificData.manualUnitPriceMMK = service?.unitPriceMMK || undefined;
            serviceSpecificData.saleDate = getTodayInYangon();
        }

        setFormData((prev: any) => ({
            ...prev,
            ...serviceSpecificData
        }));
        setSelectedService(service);
    };

    const handleClearClientBusiness = () => {
        setFormData((prev: any) => ({ ...prev, clientId: '', businessId: '' }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string, value: string | number }}) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'clientId') {
                const client = clients.find(c => c.id === value);
                const currentBusinessValid = client?.linkedBusinessIds?.includes(prev.businessId || '');
                if (!currentBusinessValid && prev.businessId) {
                    const firstLinked = client?.linkedBusinessIds?.[0];
                    next.businessId = firstLinked || '';
                }
            } else if (name === 'businessId') {
                const business = businesses.find(b => b.id === value);
                const currentClientValid = business?.linkedClientIds?.includes(prev.clientId || '');
                if (!currentClientValid && prev.clientId) {
                    const firstLinked = business?.linkedClientIds?.[0];
                    next.clientId = firstLinked || '';
                }
            }
            return next;
        });
    };


    const handleSubmit = async (e: React.FormEvent, continueAfterSave: boolean = false) => {
        e.preventDefault();
        const submitStart = performance.now();
        setIsLoading(true);
        const type = getSaleType(selectedService);
        if (!type || !formData.businessId || !formData.clientId) {
            addNotification("Client, Business and Service Type are required.", "error");
            setIsLoading(false);
            logTiming('AddSaleModal.handleSubmit', submitStart, { result: 'validation_error' });
            return;
        }
        if (recordPaymentImmediately && !continueAfterSave) {
            const amount = Number(paymentAmount);
            if (paymentAmount === '' || isNaN(amount) || amount <= 0) {
                addNotification("Payment amount must be greater than 0.", "error");
                setIsLoading(false);
                return;
            }
            if (!paymentMethod) {
                addNotification("Payment method is required when recording payment.", "error");
                setIsLoading(false);
                return;
            }
            if (!paymentDate) {
                addNotification("Payment date is required when recording payment.", "error");
                setIsLoading(false);
                return;
            }
        }

        let salePayload: any = {
            id: editingSale?.id,
            clientId: formData.clientId,
            serviceId: formData.serviceId,
            inChargeUserId: formData.inChargeUserId,
            status: editingSale?.status || (autoApproveOnCreate && hasPermission(Permission.AUTO_APPROVE_SALES_CREDIT_NOTES) ? SaleStatus.CHECKED : SaleStatus.DRAFT), // Auto-approve if permission and checkbox checked
            notes: formData.notes,
            manualDiscountMMK: Number(formData.manualDiscountMMK) || 0,
            manualDiscountDescription: formData.manualDiscountDescription,
            taxPercentage: Number(formData.taxPercentage) || 0,
            otherFeesAmountMMK: Number(formData.otherFeesAmountMMK) || 0,
            otherFeesDescription: formData.otherFeesDescription,
            subtotalMMK: financials.subtotal,
            taxAmountMMK: financials.taxAmount,
            grandTotalMMK: financials.grandTotal,
            type: type,
        };
        
        if (formData.businessId) {
            salePayload.businessId = formData.businessId;
        }

        if (type === 'Facebook Ads') {
            // Use manual rate if provided, otherwise get custom rate from business/client, otherwise use global service rate
            let rateToUse = formData.manualServiceRateMMK !== undefined && formData.manualServiceRateMMK !== '' 
                ? Number(formData.manualServiceRateMMK) 
                : (selectedService?.serviceRateMMK || selectedService?.unitPriceMMK || 0);
            
            // Only check custom rates if manual rate is not set
            if (formData.manualServiceRateMMK === undefined || formData.manualServiceRateMMK === '') {
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
            salePayload = { 
                ...salePayload, 
                campaignName: formData.campaignName, 
                campaignObjective: formData.campaignObjective, 
                budgetUSD: Number(formData.budgetUSD), 
                startDate: formData.startDate, 
                durationDays: Number(formData.durationDays), 
                campaignStatus: editingSale ? formData.campaignStatus : FacebookCampaignStatus.ACTIVE,
                serviceRateMMK: rateToUse // Store the rate used (manual, custom, or global)
            };
        } else if (type === 'Other Services') {
            if (!formData.saleDate) {
                addNotification("Sales Date is required.", "error");
                setIsLoading(false);
                logTiming('AddSaleModal.handleSubmit', submitStart, { result: 'validation_error' });
                return;
            }
            // Use manual unit price if provided, otherwise use system unit price
            const unitPriceToUse = formData.manualUnitPriceMMK !== undefined && formData.manualUnitPriceMMK !== ''
                ? Number(formData.manualUnitPriceMMK)
                : (selectedService?.unitPriceMMK || 0);
            salePayload = { 
                ...salePayload, 
                quantity: Number(formData.quantity),
                unitPriceMMK: unitPriceToUse, // Store the unit price used (manual or system)
                saleDate: formData.saleDate,
            };
        }
        
        try {
            if (editingSale) {
                const apiStart = performance.now();
                await apiUpdateSaleRecord(salePayload);
                logTiming('AddSaleModal.apiUpdateSaleRecord', apiStart);
                addNotification("Sale record updated successfully.", "success");
                dispatchRefreshData();
                onSuccess();
            } else {
                delete salePayload.id;
                salePayload.amountPaid = 0; // Initialize amountPaid for new sales
                const apiStart = performance.now();
                const addedSale = await apiAddSaleRecord(salePayload);
                logTiming('AddSaleModal.apiAddSaleRecord', apiStart);
                addNotification("Sale record added successfully.", "success");
                
                if (continueAfterSave) {
                    // Reset form for another sale but keep modal open
                    setCreatedSale(null);
                    setRecordPaymentImmediately(false);
                    setAutoApproveOnCreate(false);
                    
                    // Keep only the service, clear everything else so user can reselect
                    const currentServiceId = formData.serviceId;
                    
                    // Reset form to initial state based on current service
                    const service = allServices.find(s => s.id === currentServiceId) || null;
                    setSelectedService(service);
                    
                    const baseData = {
                        clientId: '', // Clear client so user can reselect
                        businessId: '', // Clear business so user can reselect
                        serviceId: currentServiceId, // Keep the service
                        inChargeUserId: loggedInUser?.id || '', // Reset to logged-in user
                        notes: '',
                        manualDiscountMMK: 0,
                        manualDiscountDescription: '',
                        taxPercentage: 0,
                        otherFeesDescription: '',
                        otherFeesAmountMMK: 0,
                    };
                    
                    const type = getSaleType(service);
                    let typeSpecificData: any = {};
                    
                    if (type === 'Facebook Ads') {
                        typeSpecificData = {
                            campaignObjective: campaignObjectives[0]?.name || '',
                            budgetUSD: '',
                            startDate: getTodayInYangon(),
                            durationDays: '',
                            campaignName: '',
                            manualServiceRateMMK: service?.serviceRateMMK || undefined
                        };
                    } else if (type === 'Other Services') {
                        typeSpecificData = {
                            quantity: 1,
                            manualUnitPriceMMK: service?.unitPriceMMK || undefined,
                            saleDate: getTodayInYangon(),
                        };
                    }
                    
                    setFormData({ ...baseData, ...typeSpecificData });
                } else {
                    // Normal flow - record payment inline if checkbox was checked
                    if (recordPaymentImmediately && user && paymentMethods.length > 0) {
                        try {
                            const amount = Number(paymentAmount);
                            const paymentPayload = {
                                clientId: formData.clientId,
                                businessId: formData.businessId || undefined,
                                saleRecordId: addedSale.id,
                                invoiceId: undefined,
                                amountMMK: amount,
                                paymentDate,
                                method: paymentMethod,
                                remark: paymentRemark || undefined,
                                transactionLast4Digits: paymentMethod !== 'Cash' && transactionLast4Digits ? transactionLast4Digits : undefined,
                                cashAccountId: resolveCashAccountId(),
                                recordedByUserId: user.id,
                            };
                            await apiRecordPayment(paymentPayload);
                            addNotification("Sale created and payment recorded successfully.", "success");
                        } catch (paymentError) {
                            addNotification(`Sale created but failed to record payment: ${(paymentError as Error).message}`, "error");
                        }
                        setCreatedSale(null);
                        onSuccess(addedSale, false);
                        onClose();
                    } else if (recordPaymentImmediately && (!user || paymentMethods.length === 0)) {
                        // Fallback: open RecordPaymentModal if payment methods not available
                        setCreatedSale(addedSale);
                        onSuccess(addedSale, false);
                        if (onRecordPayment) {
                            setTimeout(() => {
                                onRecordPayment(addedSale);
                                setCreatedSale(null);
                                onClose();
                            }, 100);
                        }
                    } else {
                        setCreatedSale(addedSale);
                        onSuccess(addedSale, false);
                    }
                }
            }
        } catch (error) {
            addNotification(`Failed to save sale record: ${(error as Error).message}`, "error");
            logTiming('AddSaleModal.handleSubmit', submitStart, { result: 'error' });
        }
        setIsLoading(false);
        logTiming('AddSaleModal.handleSubmit', submitStart, { result: 'success', mode: editingSale ? 'edit' : 'create' });
    };

    useEffect(() => {
        let subtotal = 0;
        const type = getSaleType(selectedService);
        if (type === 'Facebook Ads' && selectedService) {
            // Use manual rate if provided, otherwise get custom rate from business/client, otherwise use global service rate
            let rateToUse = formData.manualServiceRateMMK !== undefined && formData.manualServiceRateMMK !== '' 
                ? Number(formData.manualServiceRateMMK) 
                : (selectedService.serviceRateMMK || selectedService.unitPriceMMK || 0);
            
            // Only check custom rates if manual rate is not set
            if (formData.manualServiceRateMMK === undefined || formData.manualServiceRateMMK === '') {
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
            subtotal = (Number(formData.budgetUSD) || 0) * rateToUse;
        } else if (type === 'Other Services' && selectedService) {
             const quantity = Number(formData.quantity) || 0;
            const matchedPackage = selectedService.packages.find(p => p.unitsOrUSD === quantity);
            // Use manual unit price if provided, otherwise use system unit price
            const unitPriceToUse = formData.manualUnitPriceMMK !== undefined && formData.manualUnitPriceMMK !== ''
                ? Number(formData.manualUnitPriceMMK)
                : (selectedService.unitPriceMMK || 0);
            subtotal = matchedPackage?.priceMMK !== undefined ? matchedPackage.priceMMK : quantity * unitPriceToUse;
        }
        
        const discount = Number(formData.manualDiscountMMK) || 0;
        const otherFees = Number(formData.otherFeesAmountMMK) || 0;
        const tax = (subtotal - discount) * (Number(formData.taxPercentage) || 0) / 100;
        const grandTotal = subtotal - discount + tax + otherFees;

        setFinancials({ subtotal, taxAmount: tax, grandTotal, otherFees });
    }, [formData, selectedService, clients, businesses]);

    const resolveCashAccountId = () => {
        const matched = cashAccounts.find((acc: { name: string }) => acc.name === paymentMethod);
        return matched?.id;
    };

    const paymentMethodOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const processed = new Set<string>();
        (cashAccounts || [])
            .filter((acc: { isActive?: boolean; accountType?: string }) => acc.isActive && ['Bank Account', 'Mobile Wallet', 'Cash'].includes(acc.accountType || ''))
            .forEach((acc: { name: string; accountType?: string; bankName?: string; accountNumber?: string; walletProvider?: string; phoneNumber?: string }) => {
                const displayName = acc.accountType === 'Bank Account' ? (acc.bankName || acc.name) : acc.accountType === 'Mobile Wallet' ? (acc.walletProvider || acc.name) : acc.name;
                const last4 = acc.accountType === 'Bank Account' ? (acc.accountNumber?.slice(-4) || '') : acc.accountType === 'Mobile Wallet' ? (acc.phoneNumber?.slice(-4) || '') : '';
                const label = acc.accountType === 'Cash' ? acc.name : `${acc.name} - ${displayName}${last4 ? ` (****${last4})` : ''}`;
                options.push({ value: acc.name, label });
                processed.add(acc.name);
            });
        (paymentMethods || [])
            .filter((m: { isActive?: boolean }) => m.isActive && !processed.has(m.name))
            .forEach((m: { name: string; accountNumber?: string }) => {
                const suffix = m.accountNumber ? ` (${m.accountNumber.slice(-4)})` : '';
                options.push({ value: m.name, label: `${m.name}${suffix}` });
            });
        return options;
    }, [cashAccounts, paymentMethods]);
    
    // Business options - when client selected, show only linked; else show all
    const businessOptions = useMemo(() => {
        const allBusinessOptions = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
        if (formData.clientId) {
            const client = clients.find(c => c.id === formData.clientId);
            if (client?.linkedBusinessIds?.length) {
                return allBusinessOptions.filter(opt => client.linkedBusinessIds!.includes(opt.value));
            }
            return [];
        }
        return allBusinessOptions;
    }, [businesses, formData.clientId, clients]);

    // Client options - when business selected, show only linked; else show all
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingSale ? "Edit Sale Record" : "Add New Sale Record"} size="3xl" closeOnOutsideClick={false}>
            <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-2 p-2 max-h-[85vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                        <SearchableSelect
                            label="Business*"
                            value={formData.businessId || ''}
                            onChange={value => handleChange({target: {name: 'businessId', value: String(value)}})}
                            options={businessOptions}
                            placeholder="-- Search & Select Business --"
                            required
                        />
                        {(formData.clientId || formData.businessId) && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleClearClientBusiness} className="mt-1 text-xs">
                                Clear & Reselect
                            </Button>
                        )}
                    </div>
                    <SearchableSelect 
                        label="Client*" 
                        value={formData.clientId || ''} 
                        onChange={value => handleChange({target: {name: 'clientId', value: String(value)}})} 
                        options={clientOptions}
                        placeholder="-- Search & Select Client --" 
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Select label="Service*" name="serviceId" value={formData.serviceId} onChange={handleServiceChange} options={allServices.map(s => ({value: s.id, label: s.name}))} required disabled={!!defaultServiceType && !editingSale} />
                    <Select label="In-Charge Staff*" name="inChargeUserId" value={formData.inChargeUserId} onChange={handleChange} options={allUsers.map(u => ({value: u.id, label: u.name}))} required disabled />
                </div>

                {/* --- RENDER SERVICE SPECIFIC FIELDS --- */}
                {selectedService && getSaleType(selectedService) === 'Facebook Ads' && (
                    <div className="p-2 border rounded-md space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            <Input label="Campaign Name*" name="campaignName" value={formData.campaignName} onChange={handleChange} required containerClassName="md:col-span-2 lg:col-span-2"/>
                            <Select label="Objective" name="campaignObjective" value={formData.campaignObjective} onChange={handleChange} options={campaignObjectives.map(o => ({value: o.name, label: o.name}))} containerClassName="md:col-span-1 lg:col-span-1"/>
                            <Input label="Budget (USD)" type="number" name="budgetUSD" value={formData.budgetUSD} onChange={handleChange} containerClassName="md:col-span-1 lg:col-span-1"/>
                            <Input label="Start Date" type="date" name="startDate" value={formData.startDate} onChange={handleChange} containerClassName="md:col-span-1 lg:col-span-1"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t">
                            <div>
                                <label className="block text-xs text-text-secondary dark:text-slate-400 mb-1">
                                    System Rate (from Service)
                                </label>
                                <div className="px-2 py-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-xs cursor-not-allowed opacity-75 select-none" contentEditable={false}>
                                    {(() => {
                                        let systemRate = selectedService?.serviceRateMMK || selectedService?.unitPriceMMK || 0;
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
                                name="manualServiceRateMMK" 
                                value={formData.manualServiceRateMMK !== undefined ? String(formData.manualServiceRateMMK) : ''} 
                                onChange={handleChange}
                                placeholder="Leave empty to use system rate"
                            />
                        </div>
                    </div>
                )}
                {selectedService && getSaleType(selectedService) === 'Other Services' && (
                    <div className="p-2 border rounded-md space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Input label="Quantity" type="number" name="quantity" value={formData.quantity} onChange={handleChange} />
                            <Input label="Sales Date*" type="date" name="saleDate" value={formData.saleDate || getTodayInYangon()} onChange={handleChange} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t">
                            <div>
                                <label className="block text-xs text-text-secondary dark:text-slate-400 mb-1">
                                    System Unit Price (from Service)
                                </label>
                                <div className="px-2 py-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-xs cursor-not-allowed opacity-75 select-none" contentEditable={false}>
                                    {(selectedService?.unitPriceMMK || 0).toLocaleString()} MMK
                                </div>
                            </div>
                            <Input 
                                label="Manual Unit Price (MMK)" 
                                type="number" 
                                name="manualUnitPriceMMK" 
                                value={formData.manualUnitPriceMMK !== undefined ? String(formData.manualUnitPriceMMK) : ''} 
                                onChange={handleChange}
                                placeholder="Leave empty to use system unit price"
                            />
                        </div>
                    </div>
                )}
                
                {/* Financials */}
                <h3 className="text-sm font-semibold mt-2 pt-2 border-t">Financials</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    <Input label="Subtotal (MMK)" value={financials.subtotal.toLocaleString()} disabled />
                    <Input label="Discount (MMK)" type="number" name="manualDiscountMMK" value={String(formData.manualDiscountMMK || '')} onChange={handleChange} />
                    <Input label="Tax (%)" type="number" name="taxPercentage" value={String(formData.taxPercentage || '')} onChange={handleChange} />
                    <Input label="Grand Total (MMK)" value={financials.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 2})} disabled className="font-bold" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input label="Discount Description" name="manualDiscountDescription" value={formData.manualDiscountDescription || ''} onChange={handleChange} />
                    <Input label="Other Fees (MMK)" type="number" name="otherFeesAmountMMK" value={String(formData.otherFeesAmountMMK || '')} onChange={handleChange} />
                </div>
                <Input label="Other Fees Description" name="otherFeesDescription" value={formData.otherFeesDescription || ''} onChange={handleChange} />


                <Input as="textarea" rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} />

                {!editingSale && (
                    <div className="flex flex-col gap-2 pt-4 border-t space-y-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="recordPaymentImmediately"
                                name="recordPaymentImmediately"
                                checked={recordPaymentImmediately}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setRecordPaymentImmediately(checked);
                                    if (checked) {
                                        setPaymentAmount(String(financials.grandTotal));
                                        setPaymentDate(getTodayInYangon());
                                        setPaymentMethod(paymentMethodOptions.length > 0 ? paymentMethodOptions[0].value : '');
                                        setPaymentRemark('');
                                        setTransactionLast4Digits('');
                                    } else {
                                        setPaymentAmount('');
                                    }
                                }}
                                className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                            />
                            <label htmlFor="recordPaymentImmediately" className="ml-2 block text-sm text-text-primary">
                                Record payment for this sale
                            </label>
                        </div>
                        {recordPaymentImmediately && (
                            <div className="mt-4 p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 space-y-3">
                                <h4 className="text-sm font-semibold text-text-primary dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
                                    Payment Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Input
                                        label="Amount (MMK)*"
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        required
                                        min={1}
                                    />
                                    <Input
                                        label="Payment Date*"
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        required
                                    />
                                    <Select
                                        label="Payment Method*"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        options={[
                                            { value: '', label: '-- Select Method --' },
                                            ...paymentMethodOptions
                                        ]}
                                        required
                                    />
                                    {paymentMethod && paymentMethod !== 'Cash' && (
                                        <Input
                                            label="Transaction Last 4 Digits"
                                            value={transactionLast4Digits}
                                            onChange={(e) => setTransactionLast4Digits(e.target.value)}
                                            placeholder="e.g. 1234"
                                            maxLength={4}
                                        />
                                    )}
                                </div>
                                <Input
                                    as="textarea"
                                    rows={2}
                                    label="Remark"
                                    value={paymentRemark}
                                    onChange={(e) => setPaymentRemark(e.target.value)}
                                    placeholder="Optional payment note"
                                />
                            </div>
                        )}
                        {hasPermission(Permission.AUTO_APPROVE_SALES_CREDIT_NOTES) && (
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="autoApproveOnCreate"
                                    name="autoApproveOnCreate"
                                    checked={autoApproveOnCreate}
                                    onChange={(e) => setAutoApproveOnCreate(e.target.checked)}
                                    className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                                />
                                <label htmlFor="autoApproveOnCreate" className="ml-2 block text-sm text-text-primary">
                                    Auto-approve this sale when created
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {!createdSale && (
                    <div className="flex justify-end space-x-2 pt-2 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        {editingSale ? (
                            <Button type="button" isLoading={isLoading} onClick={(e) => handleSubmit(e, false)}>Save Changes</Button>
                        ) : (
                            <>
                                <Button type="button" variant="primary" isLoading={isLoading} onClick={(e) => handleSubmit(e, false)}>
                                    Save and Exit
                                </Button>
                                <Button type="button" variant="secondary" onClick={(e) => handleSubmit(e, true)} isLoading={isLoading}>
                                    Save and Record Another
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </form>

            {createdSale && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Sale Created Successfully!</h3>
                        <Button variant="secondary" size="sm" onClick={() => { setCreatedSale(null); onClose(); }}>Close</Button>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="font-medium text-text-secondary">Sale ID:</span>
                                <span className="ml-2 text-text-primary">{createdSale.id}</span>
                            </div>
                            <div>
                                <span className="font-medium text-text-secondary">Client:</span>
                                <span className="ml-2 text-text-primary">{clients.find(c => c.id === createdSale.clientId)?.name || createdSale.clientId}</span>
                            </div>
                            <div>
                                <span className="font-medium text-text-secondary">Service Type:</span>
                                <span className="ml-2 text-text-primary">{createdSale.type}</span>
                            </div>
                            <div>
                                <span className="font-medium text-text-secondary">Grand Total:</span>
                                <span className="ml-2 text-text-primary font-bold">{createdSale.grandTotalMMK.toLocaleString()} MMK</span>
                            </div>
                        </div>
                        <div>
                            <span className="font-medium text-text-secondary">Amount Due:</span>
                            <span className="ml-2 text-text-primary font-bold text-lg">
                                {(createdSale.grandTotalMMK - (createdSale.amountPaid || 0)).toLocaleString()} MMK
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-2 border-t border-green-200 dark:border-green-800">
                        <Button variant="secondary" onClick={() => { setCreatedSale(null); onClose(); }}>Done</Button>
                        {onRecordPayment && (
                            <Button 
                                variant="primary" 
                                onClick={() => {
                                    onRecordPayment(createdSale);
                                    setCreatedSale(null);
                                    onClose();
                                }}
                            >
                                Record Payment for this Sale
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default AddSaleModal;