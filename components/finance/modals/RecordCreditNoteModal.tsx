import React, { useState, useEffect, useMemo } from 'react';
import { CreditNote, Client, Business, CreditNoteStatus, Service, SaleRecord, FacebookAdsSaleRecord, Permission, SaleStatus } from '../../../types';
import { 
    apiRecordCreditNote, 
    apiUpdateCreditNote,
    apiApproveCreditNote,
    apiGetClientById,
    apiGetServices,
    apiGetSalesForClient,
    apiGetClientBusinessBalance,
    apiGetClientTotalBalance
} from '../../../services/api';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import SearchableSelect from '../../ui/SearchableSelect';
import { logTiming } from '../../../utils/perf';
import { getTodayInYangon, formatDateForDisplay } from '../../../utils/dateUtils';
import { dispatchRefreshData } from '../../../utils/refreshDataBus';

interface RecordCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  businesses: Business[];
  sales?: SaleRecord[]; // Pass sales to allow selection
  allServices?: Service[]; // Pass services as props to avoid fetching
  editingCreditNote?: CreditNote | null;
  defaultClientId?: string;
  defaultBusinessId?: string;
  defaultSaleId?: string; // Pre-select a sale record
  calculatedOutstandingBalance?: number;
}

const RecordCreditNoteModal: React.FC<RecordCreditNoteModalProps> = ({
  isOpen, onClose, onSuccess, clients, businesses, sales = [], allServices: propsServices, editingCreditNote,
  defaultClientId, defaultBusinessId, defaultSaleId, calculatedOutstandingBalance
}) => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const isEditMode = !!editingCreditNote;
  const [autoApproveOnCreate, setAutoApproveOnCreate] = useState(false);

  const [clientId, setClientId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [saleRecordId, setSaleRecordId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [amountMMK, setAmountMMK] = useState<number | ''>('');
  const [totalUSD, setTotalUSD] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [creditNoteDate, setCreditNoteDate] = useState(getTodayInYangon());
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBalance, setClientBalance] = useState<number | null>(null);
  const [clientBusinessBalance, setClientBusinessBalance] = useState<number | null>(null);
  const [clientTotalBalance, setClientTotalBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>(propsServices || []);
  const [clientSales, setClientSales] = useState<SaleRecord[]>([]);

  // Only fetch services if not provided as props
  useEffect(() => {
    if (isOpen && !propsServices) {
      apiGetServices().then(setAllServices).catch(err => console.error("Failed to fetch services:", err));
    } else if (propsServices) {
      setAllServices(propsServices);
    }
  }, [isOpen, propsServices]);

  // Use sales from props if available, otherwise fetch when client is selected
  useEffect(() => {
    if (clientId && isOpen) {
      // If sales are passed as props, filter them by clientId instead of fetching
      if (sales.length > 0) {
        const filteredSales = sales.filter(sale => sale.clientId === clientId);
        setClientSales(filteredSales);
      } else {
        // Only fetch if sales prop is not provided
        apiGetSalesForClient(clientId)
          .then(setClientSales)
          .catch(err => console.error("Failed to fetch client sales:", err));
      }
    } else {
      setClientSales([]);
    }
  }, [clientId, isOpen, sales]);

  // Auto-update client when business is selected (business -> linked client). User can change client later. Skip in edit mode.
  useEffect(() => {
    if (isEditMode || !businessId || !businesses.length || !clients.length) return;
    const selectedBusiness = businesses.find(b => b.id === businessId);
    if (!selectedBusiness?.linkedClientIds?.length) return;
    const firstLinkedClientId = selectedBusiness.linkedClientIds[0];
    if (!clients.some(c => c.id === firstLinkedClientId)) return;
    const shouldSet = !clientId || !selectedBusiness.linkedClientIds.includes(clientId);
    if (shouldSet && clientId !== firstLinkedClientId) {
      setClientId(firstLinkedClientId);
    }
  }, [isEditMode, businessId, clientId, businesses, clients]);

  // Auto-update business when client is selected (client -> linked business). User can change business later. Skip in edit mode.
  useEffect(() => {
    if (isEditMode || !clientId || !clients.length || !businesses.length) return;
    const selectedClient = clients.find(c => c.id === clientId);
    if (!selectedClient?.linkedBusinessIds?.length) return;
    const firstLinkedBusinessId = selectedClient.linkedBusinessIds[0];
    if (!businesses.some(b => b.id === firstLinkedBusinessId)) return;
    const shouldSet = !businessId || !selectedClient.linkedBusinessIds.includes(businessId);
    if (shouldSet && businessId !== firstLinkedBusinessId) {
      setBusinessId(firstLinkedBusinessId);
    }
  }, [isEditMode, clientId, businessId, clients, businesses]);

  // Auto-select service when saleRecordId is set (including from defaultSaleId)
  useEffect(() => {
    if (saleRecordId && sales.length > 0 && clientId && businessId) {
      // Filter sales by client and business to match availableSales logic
      const availableSales = sales.filter(sale => {
        if (clientId && sale.clientId !== clientId) return false;
        if (businessId && sale.businessId !== businessId) return false;
        return sale.status !== SaleStatus.DRAFT;
      });
      
      const selectedSale = availableSales.find(s => s.id === saleRecordId);
      if (selectedSale) {
        // Always set service if sale has a serviceId
        if (selectedSale.serviceId) {
          setServiceId(selectedSale.serviceId);
        } else {
          setServiceId('');
        }
        // Also auto-fill amount if not already set
        if (!amountMMK) {
          const remaining = (selectedSale.grandTotalMMK || 0) - (selectedSale.amountPaid || 0);
          if (remaining > 0) {
            setAmountMMK(remaining);
          }
        }
      }
    } else if (!saleRecordId && !editingCreditNote && !serviceId) {
      // Auto-select Facebook Boosting if no sale is selected and no service is set
      // This will be handled by the auto-select useEffect
    }
  }, [saleRecordId, sales, clientId, businessId, editingCreditNote, serviceId]);

  // Find Facebook Boosting service
  const facebookBoostingService = useMemo(() => {
    return allServices.find(s => s.name.toLowerCase().includes('facebook boosting') || s.name.toLowerCase() === 'facebook boosting');
  }, [allServices]);

  // Check if selected service is Facebook Boosting
  const isFacebookBoosting = useMemo(() => {
    if (!serviceId || !facebookBoostingService) return false;
    return serviceId === facebookBoostingService.id;
  }, [serviceId, facebookBoostingService]);

  // Auto-select Facebook Boosting service when modal opens (if not in edit mode and no sale/service selected)
  useEffect(() => {
    if (isOpen && !isEditMode && !editingCreditNote && facebookBoostingService && !serviceId && !saleRecordId && allServices.length > 0) {
      setServiceId(facebookBoostingService.id);
    }
  }, [isOpen, isEditMode, editingCreditNote, facebookBoostingService, serviceId, saleRecordId, allServices]);

  // Get latest Facebook Boosting rate from client's sales records
  useEffect(() => {
    if (isFacebookBoosting && clientSales.length > 0) {
      const facebookAdsSales = clientSales
        .filter(sale => sale.type === 'Facebook Ads')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (facebookAdsSales.length > 0) {
        const latestSale = facebookAdsSales[0] as FacebookAdsSaleRecord;
        if (latestSale.serviceRateMMK) {
          setRate(latestSale.serviceRateMMK);
        }
      }
    }
  }, [isFacebookBoosting, clientSales]);

  // Load editing credit note data
  useEffect(() => {
    if (editingCreditNote) {
      setClientId(editingCreditNote.clientId);
      setBusinessId(editingCreditNote.businessId);
      setSaleRecordId(editingCreditNote.saleRecordId || '');
      setServiceId(editingCreditNote.serviceId || '');
      setAmountMMK(editingCreditNote.amountMMK);
      setTotalUSD(editingCreditNote.totalUSD || '');
      setRate(editingCreditNote.rate || '');
      setCreditNoteDate(editingCreditNote.creditNoteDate);
      setReason(editingCreditNote.reason || '');
      setDescription(editingCreditNote.description || '');
    } else {
      // Reset form
      setClientId(defaultClientId || '');
      setBusinessId(defaultBusinessId || '');
      setSaleRecordId(defaultSaleId || '');
      // Auto-select Facebook Boosting if available and no sale is selected
      // This will be set by the auto-select useEffect after services load
      setServiceId('');
      setAmountMMK('');
      setTotalUSD('');
      setRate('');
      setCreditNoteDate(getTodayInYangon());
      setReason('');
      setDescription('');
    }
  }, [editingCreditNote, defaultClientId, defaultBusinessId, defaultSaleId]);

  // Fetch client balance when client changes
  useEffect(() => {
    if (clientId && isOpen) {
      setIsBalanceLoading(true);
      const fetchBalances = async () => {
        try {
          const client = await apiGetClientById(clientId);
          if (client) {
            setSelectedClient(client);
            
            // Always fetch client total balance
            const totalBalance = await apiGetClientTotalBalance(clientId);
            setClientTotalBalance(totalBalance);
            
            // If businessId is selected, also fetch client-business specific balance
            if (businessId) {
              const clientBusinessBalanceData = await apiGetClientBusinessBalance(clientId, businessId);
              if (clientBusinessBalanceData) {
                const openingBalance = clientBusinessBalanceData.openingBalance || 0;
                const outstanding = openingBalance + clientBusinessBalanceData.balance;
                setClientBusinessBalance(outstanding);
                // Use client-business balance as the primary balance for display
                setClientBalance(outstanding);
              } else {
                setClientBusinessBalance(0);
                setClientBalance(0);
              }
            } else {
              // No business selected - use client total balance
              setClientBalance(totalBalance);
            }
          }
        } catch (err) {
          console.error("Failed to fetch balances:", err);
          setClientBalance(null);
          setClientBusinessBalance(null);
          setClientTotalBalance(null);
        } finally {
          setIsBalanceLoading(false);
        }
      };
      
      fetchBalances();
    } else {
      setClientBalance(null);
      setClientBusinessBalance(null);
      setClientTotalBalance(null);
      setSelectedClient(null);
    }
  }, [clientId, businessId, isOpen]);

  // Calculate amountMMK when totalUSD and rate change (for Facebook Boosting)
  useEffect(() => {
    if (isFacebookBoosting && totalUSD && rate) {
      const calculated = Number(totalUSD) * Number(rate);
      setAmountMMK(calculated);
    }
  }, [totalUSD, rate, isFacebookBoosting]);

  const resetForm = () => {
    // Reset form but keep default values if provided
    setClientId(defaultClientId || '');
    setBusinessId(defaultBusinessId || '');
    setSaleRecordId(defaultSaleId || '');
    // Auto-select Facebook Boosting if available, otherwise clear
    setServiceId(facebookBoostingService?.id || '');
    setAmountMMK('');
    setTotalUSD('');
    setRate('');
    setCreditNoteDate(getTodayInYangon());
    setReason('');
    setDescription('');
    // Clear client balance and sales since they're client-specific
    setClientBalance(null);
    setSelectedClient(null);
    setClientSales([]);
  };

  const handleSubmit = async (e: React.FormEvent, continueAfterSave: boolean = false) => {
    e.preventDefault();
    const submitStart = performance.now();
    
    if (!clientId || !businessId || !amountMMK || !user) {
      addNotification("Client, Business, Amount, and User are required.", "error");
      logTiming('RecordCreditNoteModal.handleSubmit', submitStart, { result: 'validation_error' });
      return;
    }

    setIsLoading(true);
    try {
      const creditNotePayload: Omit<CreditNote, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        creditNoteDate,
        clientId,
        businessId,
        amountMMK: Number(amountMMK),
        recordedByUserId: user.id,
        ...(saleRecordId && { saleRecordId }),
        ...(serviceId && { serviceId }),
        ...(isFacebookBoosting && totalUSD && { totalUSD: Number(totalUSD) }),
        ...(isFacebookBoosting && rate && { rate: Number(rate) }),
        ...(reason && { reason }),
        ...(description && { description }),
      };

      if (isEditMode && editingCreditNote) {
        const apiStart = performance.now();
        await apiUpdateCreditNote(editingCreditNote.id, creditNotePayload);
        logTiming('RecordCreditNoteModal.apiUpdateCreditNote', apiStart);
        addNotification("Credit note updated successfully.", "success");
        dispatchRefreshData();
        onSuccess();
      } else {
        const apiStart = performance.now();
        const createdCreditNote = await apiRecordCreditNote(creditNotePayload);
        logTiming('RecordCreditNoteModal.apiRecordCreditNote', apiStart);
        addNotification("Credit note recorded successfully.", "success");
        
        if (autoApproveOnCreate && hasPermission(Permission.AUTO_APPROVE_SALES_CREDIT_NOTES)) {
          try {
            await apiApproveCreditNote(createdCreditNote.id, user.id);
            addNotification("Credit note auto-approved.", "success");
          } catch (err) {
            addNotification(`Credit note recorded but auto-approve failed: ${(err as Error).message}`, "warning");
          }
        }
        
        if (continueAfterSave) {
          // Reset form for another credit note but keep modal open
          setAutoApproveOnCreate(false);
          resetForm();
        } else {
          onSuccess();
        }
      }
    } catch (error) {
      addNotification(`Failed to record credit note: ${(error as Error).message}`, "error");
      logTiming('RecordCreditNoteModal.handleSubmit', submitStart, { result: 'error', mode: isEditMode ? 'edit' : 'create' });
    } finally {
      setIsLoading(false);
      logTiming('RecordCreditNoteModal.handleSubmit', submitStart, { result: 'success', mode: isEditMode ? 'edit' : 'create' });
    }
  };

  const serviceOptions = allServices.map(s => ({ value: s.id, label: s.name }));

  const handleClearClientBusiness = () => { setClientId(''); setBusinessId(''); };

  // Business options - when client selected, show only linked; else all
  const businessOptions = useMemo(() => {
    const allBusinessOptions = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    
    // If client is selected, prioritize linked businesses at the top for better UX
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client?.linkedBusinessIds?.length) {
        return allBusinessOptions.filter(opt => client.linkedBusinessIds!.includes(opt.value));
      }
      return [];
    }
    return allBusinessOptions;
  }, [businesses, clientId, clients]);

  // Client options - always show all clients, prioritize linked ones if business is selected
  const clientOptions = useMemo(() => {
    const allClientOptions = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    
    // If business is selected, prioritize linked clients at the top for better UX
    if (businessId) {
      const business = businesses.find(b => b.id === businessId);
      if (business?.linkedClientIds?.length) {
        return allClientOptions.filter(opt => business.linkedClientIds!.includes(opt.value));
      }
      return [];
    }
    return allClientOptions;
  }, [clients, businessId, businesses]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? `Edit Credit Note ${editingCreditNote?.id}` : "Credit Note"} size="md" closeOnOutsideClick={false}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Recorded by" value={user?.name || ''} disabled />
        
        <div>
          <SearchableSelect
            label="Business*"
            value={businessId}
            onChange={value => {
              const v = String(value);
              setBusinessId(v);
              const business = businesses.find(b => b.id === v);
              if (business?.linkedClientIds?.length && clientId && !business.linkedClientIds.includes(clientId)) {
                setClientId(business.linkedClientIds[0]);
              }
            }}
            options={businessOptions}
            placeholder="-- Search & Select Business --"
            required
          />
          {(clientId || businessId) && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearClientBusiness} className="mt-1 text-xs">
              Clear & Reselect
            </Button>
          )}
        </div>

        <SearchableSelect
          label="Client*"
          value={clientId}
          onChange={value => {
            const v = String(value);
            setClientId(v);
            const client = clients.find(c => c.id === v);
            if (client?.linkedBusinessIds?.length && businessId && !client.linkedBusinessIds.includes(businessId)) {
              setBusinessId(client.linkedBusinessIds[0]);
            }
          }}
          options={clientOptions}
          placeholder="-- Search & Select Client --"
          required
        />

        {clientId && !isBalanceLoading && (
          <div className="space-y-2">
            {businessId && clientBusinessBalance !== null && (
              <div className="p-3 bg-primary-action text-white rounded-md text-sm">
                <div>
                  <span className="text-xs opacity-90">Current Balance ({businesses.find(b => b.id === businessId)?.name || 'Business'}):</span>
                  <div className="font-bold text-lg">
                    {clientBusinessBalance.toLocaleString()} MMK
                  </div>
                </div>
              </div>
            )}
            {clientTotalBalance !== null && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm">
                <div className="text-text-secondary dark:text-slate-400">
                  <span className="text-xs">Client's Total Balance:</span>
                  <div className="font-semibold text-text-primary dark:text-slate-200">
                    {clientTotalBalance.toLocaleString()} MMK
                  </div>
                </div>
              </div>
            )}
            {!businessId && clientBalance !== null && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-text-secondary dark:text-slate-400">Current Balance</p>
                <p className="text-lg font-semibold text-text-primary dark:text-slate-100">
                  {clientBalance.toLocaleString()} MMK
                </p>
                {calculatedOutstandingBalance !== undefined && (
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                    Outstanding: {calculatedOutstandingBalance.toLocaleString()} MMK
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter sales by client and business */}
        {(() => {
          const availableSales = sales.filter(sale => {
            if (clientId && sale.clientId !== clientId) return false;
            if (businessId && sale.businessId !== businessId) return false;
            return sale.status !== SaleStatus.DRAFT;
          });

          return (
            <SearchableSelect
              label="Sale Record (Optional)"
              value={saleRecordId}
              onChange={value => {
                setSaleRecordId(String(value));
                // Auto-fill service and amount from selected sale
                const selectedSale = availableSales.find(s => s.id === value);
                if (selectedSale) {
                  // Always set service if sale has a serviceId
                  if (selectedSale.serviceId) {
                    setServiceId(selectedSale.serviceId);
                  } else {
                    // Clear service if sale doesn't have one
                    setServiceId('');
                  }
                  // Optionally set amount to remaining balance
                  const remaining = (selectedSale.grandTotalMMK || 0) - (selectedSale.amountPaid || 0);
                  if (remaining > 0 && !amountMMK) {
                    setAmountMMK(remaining);
                  }
                } else if (!value) {
                  // Clear service if no sale is selected
                  setServiceId('');
                }
              }}
              options={[
                { value: '', label: '-- No Sale Record --' },
                ...availableSales.map(sale => ({
                  value: sale.id,
                  label: `${sale.id} - ${formatDateForDisplay(sale.createdAt)} - ${(sale.grandTotalMMK || 0).toLocaleString()} MMK`
                }))
              ]}
              placeholder="-- Search & Select Sale Record --"
              disabled={!clientId || !businessId}
            />
          );
        })()}

        <Select
          label="Service (Optional)"
          value={serviceId}
          onChange={e => {
            setServiceId(e.target.value);
            if (!e.target.value) {
              setTotalUSD('');
              setRate('');
              setAmountMMK('');
            }
          }}
          options={[{ value: '', label: '-- No Service --' }, ...serviceOptions]}
        />

        {isFacebookBoosting ? (
          <>
            <Input
              label="Total (USD)*"
              type="number"
              value={totalUSD}
              onChange={e => setTotalUSD(e.target.value === '' ? '' : Number(e.target.value))}
              required
              min="0.01"
              step="0.01"
            />
            <Input
              label="Rate (MMK/USD)*"
              type="number"
              value={rate}
              onChange={e => setRate(e.target.value === '' ? '' : Number(e.target.value))}
              required
              min="1"
              step="1"
            />
            <Input
              label="Amount (MMK)"
              type="number"
              value={amountMMK}
              disabled
              containerClassName="opacity-75"
            />
          </>
        ) : (
          <Input
            label="Amount (MMK)*"
            type="number"
            value={amountMMK}
            onChange={e => setAmountMMK(e.target.value === '' ? '' : Number(e.target.value))}
            required
            min="0.01"
            step="any"
          />
        )}

        <Input
          label="Credit Note Date*"
          type="date"
          value={creditNoteDate}
          onChange={e => setCreditNoteDate(e.target.value)}
          required
        />

        <Input
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g., Service cancellation, adjustment, etc."
        />

        <Input
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Additional details (optional)"
        />

        {!isEditMode && hasPermission(Permission.AUTO_APPROVE_SALES_CREDIT_NOTES) && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoApproveCreditNote"
              checked={autoApproveOnCreate}
              onChange={(e) => setAutoApproveOnCreate(e.target.checked)}
              className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
            />
            <label htmlFor="autoApproveCreditNote" className="ml-2 block text-sm text-text-primary">
              Auto-approve this credit note when created
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          {isEditMode ? (
            <Button type="button" variant="primary" isLoading={isLoading} onClick={(e) => handleSubmit(e, false)}>
              Save Changes
            </Button>
          ) : (
            <>
              <Button type="button" variant="primary" isLoading={isLoading} onClick={(e) => handleSubmit(e, false)}>
                Save and Exit
              </Button>
              <Button type="button" variant="secondary" isLoading={isLoading} onClick={(e) => handleSubmit(e, true)}>
                Save and Record Another
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default RecordCreditNoteModal;

