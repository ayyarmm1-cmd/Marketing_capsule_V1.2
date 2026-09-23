import React, { useState, useEffect, useMemo } from 'react';
import { Refund, Client, Business, RefundStatus, Service, SaleRecord, FacebookAdsSaleRecord } from '../../../types';
import { 
    apiRecordRefund, 
    apiUpdateRefund,
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
import { getTodayInYangon } from '../../../utils/dateUtils';

interface RecordRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  businesses: Business[];
  editingRefund?: Refund | null;
  defaultClientId?: string;
  defaultBusinessId?: string;
  calculatedOutstandingBalance?: number; // Pass calculated balance that includes refunds
}

const RecordRefundModal: React.FC<RecordRefundModalProps> = ({
  isOpen, onClose, onSuccess, clients, businesses, editingRefund,
  defaultClientId, defaultBusinessId, calculatedOutstandingBalance
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const isEditMode = !!editingRefund;

  const [clientId, setClientId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [amountMMK, setAmountMMK] = useState<number | ''>('');
  const [totalUSD, setTotalUSD] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [refundDate, setRefundDate] = useState(getTodayInYangon());
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBalance, setClientBalance] = useState<number | null>(null);
  const [clientBusinessBalance, setClientBusinessBalance] = useState<number | null>(null);
  const [clientTotalBalance, setClientTotalBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [clientSales, setClientSales] = useState<SaleRecord[]>([]);

  // Fetch services and client sales when modal opens
  useEffect(() => {
    if (isOpen) {
      apiGetServices().then(setAllServices).catch(err => console.error("Failed to fetch services:", err));
    }
  }, [isOpen]);

  // Fetch client sales when client is selected
  useEffect(() => {
    if (clientId && isOpen) {
      apiGetSalesForClient(clientId)
        .then(setClientSales)
        .catch(err => console.error("Failed to fetch client sales:", err));
    } else {
      setClientSales([]);
    }
  }, [clientId, isOpen]);

  // Find Facebook Boosting service
  const facebookBoostingService = useMemo(() => {
    return allServices.find(s => s.name.toLowerCase().includes('facebook boosting') || s.name.toLowerCase() === 'facebook boosting');
  }, [allServices]);

  // Check if selected service is Facebook Boosting
  const isFacebookBoosting = useMemo(() => {
    if (!serviceId || !facebookBoostingService) return false;
    return serviceId === facebookBoostingService.id;
  }, [serviceId, facebookBoostingService]);

  // Get latest Facebook Boosting rate from client's sales records
  useEffect(() => {
    if (isFacebookBoosting && clientSales.length > 0) {
      // Find the most recent Facebook Ads sale for this client
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

  // Auto-calculate amountMMK when USD or rate changes for Facebook Boosting
  useEffect(() => {
    if (isFacebookBoosting && totalUSD !== '' && rate !== '') {
      const calculated = Number(totalUSD) * Number(rate);
      setAmountMMK(calculated);
    } else if (!isFacebookBoosting) {
      // Reset USD and rate fields when not Facebook Boosting
      if (totalUSD !== '') setTotalUSD('');
      if (rate !== '') setRate('');
    }
  }, [isFacebookBoosting, totalUSD, rate]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && editingRefund) {
        setClientId(editingRefund.clientId);
        setBusinessId(editingRefund.businessId || '');
        setServiceId(editingRefund.serviceId || '');
        setAmountMMK(editingRefund.amountMMK);
        setTotalUSD(editingRefund.totalUSD || '');
        setRate(editingRefund.rate || '');
        setRefundDate(editingRefund.refundDate);
        setReason(editingRefund.reason || '');
        setDescription(editingRefund.description || '');
      } else {
        setClientId(defaultClientId || '');
        setBusinessId(defaultBusinessId || '');
        setServiceId('');
        setAmountMMK('');
        setTotalUSD('');
        setRate('');
        setRefundDate(getTodayInYangon());
        setReason('');
        setDescription('');
      }
    }
  }, [isOpen, isEditMode, editingRefund, defaultClientId, defaultBusinessId]);

  // Auto-update client when business is re-selected (business -> linked client)
  useEffect(() => {
    if (businessId) {
      const business = businesses.find(b => b.id === businessId);
      if (business && business.linkedClientIds && business.linkedClientIds.length > 0) {
        // Auto-update to the first linked client when business changes
        const firstLinkedClientId = business.linkedClientIds[0];
        if (clientId !== firstLinkedClientId) {
          setClientId(firstLinkedClientId);
        }
      } else if (business && (!business.linkedClientIds || business.linkedClientIds.length === 0)) {
        // If business has no linked clients, clear client selection
        if (clientId) {
          setClientId('');
        }
      }
    }
  }, [businessId, businesses]);

  // Auto-update business when client is re-selected (client -> linked business)
  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client && client.linkedBusinessIds && client.linkedBusinessIds.length > 0) {
        // Auto-update to the first linked business when client changes
        const firstLinkedBusinessId = client.linkedBusinessIds[0];
        if (businessId !== firstLinkedBusinessId) {
          setBusinessId(firstLinkedBusinessId);
        }
      } else if (client && (!client.linkedBusinessIds || client.linkedBusinessIds.length === 0)) {
        // If client has no linked businesses, clear business selection
        if (businessId) {
          setBusinessId('');
        }
      }
    }
  }, [clientId, clients]);

  useEffect(() => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    
    if (client) {
      // Use calculated outstanding balance if provided (includes refunds), otherwise fetch from API
      if (calculatedOutstandingBalance !== undefined) {
        setIsBalanceLoading(false);
        setClientBalance(calculatedOutstandingBalance);
        // If we have calculated balance but no businessId, we can't show client-business balance
        if (!businessId) {
          setClientBusinessBalance(null);
          setClientTotalBalance(calculatedOutstandingBalance);
        }
      } else {
        setIsBalanceLoading(true);
        setClientBalance(null);
        setClientBusinessBalance(null);
        setClientTotalBalance(null);
        
        const fetchBalances = async () => {
          try {
            // Always fetch client total balance
            const totalBalance = await apiGetClientTotalBalance(client.id);
            setClientTotalBalance(totalBalance);
            
            // If businessId is selected, also fetch client-business specific balance
            if (businessId) {
              const clientBusinessBalanceData = await apiGetClientBusinessBalance(client.id, businessId);
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
              const freshClient = await apiGetClientById(client.id);
              if (freshClient) {
                setClientBalance(Number(freshClient.balance) || 0);
              }
            }
          } catch (err) {
            console.error("Failed to fetch balances:", err);
            addNotification("Could not load balance information.", "error");
          } finally {
            setIsBalanceLoading(false);
          }
        };
        
        fetchBalances();
      }
    } else {
      setClientBalance(null);
      setClientBusinessBalance(null);
      setClientTotalBalance(null);
    }
  }, [clientId, businessId, clients, addNotification, calculatedOutstandingBalance]);

  const handleClearClientBusiness = () => { setClientId(''); setBusinessId(''); };

  // Business options - when client selected, show only linked; else all
  const businessOptions = useMemo(() => {
    const all = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client?.linkedBusinessIds?.length) {
        return all.filter(opt => client.linkedBusinessIds!.includes(opt.value));
      }
      return [];
    }
    return all;
  }, [businesses, clientId, clients]);

  // Client options - always show all clients, prioritize linked ones if business is selected
  const clientOptions = useMemo(() => {
    const allClientOptions = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    
    // If business is selected, prioritize linked clients at the top for better UX
    if (businessId) {
      const business = businesses.find(b => b.id === businessId);
      if (business && business.linkedClientIds && business.linkedClientIds.length > 0) {
        const linkedClientOptions = allClientOptions.filter(opt => 
          business.linkedClientIds.includes(opt.value)
        );
        const otherClientOptions = allClientOptions.filter(opt => 
          !business.linkedClientIds.includes(opt.value)
        );
        // Return linked clients first, then others - but show all
        return [...linkedClientOptions, ...otherClientOptions];
      }
    }
    
    // Always return all clients
    return allClientOptions;
  }, [clients, businessId, businesses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate basic required fields
    if (!businessId || !clientId) {
      addNotification("Business and Client are required.", "error");
      return;
    }

    // Validate Facebook Boosting fields if service is selected
    if (serviceId && isFacebookBoosting) {
      if (!totalUSD || totalUSD === '' || Number(totalUSD) <= 0) {
        addNotification("For Facebook Boosting, Total USD is required and must be greater than 0.", "error");
        return;
      }
      if (!rate || rate === '' || Number(rate) <= 0) {
        addNotification("For Facebook Boosting, Rate is required and must be greater than 0.", "error");
        return;
      }
      // Ensure amount is calculated
      if (amountMMK === '' || amountMMK <= 0) {
        const calculated = Number(totalUSD) * Number(rate);
        if (calculated <= 0) {
          addNotification("Calculated refund amount must be greater than 0.", "error");
          return;
        }
        setAmountMMK(calculated);
      }
    } else {
      // For non-Facebook Boosting, validate amountMMK directly
      if (amountMMK === '' || amountMMK <= 0) {
        addNotification("Refund Amount is required and must be greater than 0.", "error");
        return;
      }
    }

    setIsLoading(true);

    if (isEditMode && editingRefund) {
        const updatePayload: any = {
            amountMMK: Number(amountMMK),
            refundDate,
        };
        
        // Only include optional fields if they have values (Firestore doesn't accept undefined)
        if (serviceId && serviceId.trim()) {
            updatePayload.serviceId = serviceId;
        } else {
            // If serviceId is being cleared, we need to explicitly set it to null or remove it
            updatePayload.serviceId = null;
        }
        if (isFacebookBoosting && totalUSD && Number(totalUSD) > 0) {
            updatePayload.totalUSD = Number(totalUSD);
        } else if (isFacebookBoosting) {
            updatePayload.totalUSD = null;
        }
        if (isFacebookBoosting && rate && Number(rate) > 0) {
            updatePayload.rate = Number(rate);
        } else if (isFacebookBoosting) {
            updatePayload.rate = null;
        }
        if (reason && reason.trim()) {
            updatePayload.reason = reason.trim();
        } else {
            updatePayload.reason = null;
        }
        if (description && description.trim()) {
            updatePayload.description = description.trim();
        } else {
            updatePayload.description = null;
        }
        try {
            await apiUpdateRefund(editingRefund.id, updatePayload);
            addNotification(`Refund ${editingRefund.id} updated.`, "success");
            onSuccess();
        } catch (error) {
            addNotification(`Failed to update refund: ${(error as Error).message}`, "error");
        }
    } else {
        if (!user) {
            addNotification("Authentication error.", "error");
            setIsLoading(false);
            return;
        }
        const refundPayload: any = {
            clientId,
            businessId: businessId,
            amountMMK: Number(amountMMK),
            refundDate,
            recordedByUserId: user.id,
        };
        
        // Only include optional fields if they have values (Firestore doesn't accept undefined)
        if (serviceId && serviceId.trim()) {
            refundPayload.serviceId = serviceId;
        }
        if (isFacebookBoosting && totalUSD && Number(totalUSD) > 0) {
            refundPayload.totalUSD = Number(totalUSD);
        }
        if (isFacebookBoosting && rate && Number(rate) > 0) {
            refundPayload.rate = Number(rate);
        }
        if (reason && reason.trim()) {
            refundPayload.reason = reason.trim();
        }
        if (description && description.trim()) {
            refundPayload.description = description.trim();
        }
        try {
            await apiRecordRefund(refundPayload);
            addNotification("Credit note recorded successfully.", "success");
            onSuccess();
        } catch (error) {
            addNotification(`Failed to record credit note: ${(error as Error).message}`, "error");
        }
    }
    
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? `Edit Credit Note ${editingRefund?.id}` : "Credit Note"} size="md" closeOnOutsideClick={false}>
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
        
        {selectedClient && (
            <div className="space-y-2">
                {businessId && clientBusinessBalance !== null && (
                    <div className="p-3 bg-primary-action text-white rounded-md text-sm">
                        <div>
                            <span className="text-xs opacity-90">Current Balance ({businesses.find(b => b.id === businessId)?.name || 'Business'}):</span>
                            <div className="font-bold text-lg">
                                {isBalanceLoading ? 'Loading...' : `${clientBusinessBalance.toLocaleString()} MMK`}
                            </div>
                        </div>
                    </div>
                )}
                {clientTotalBalance !== null && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm">
                        <div className="text-text-secondary dark:text-slate-400">
                            <span className="text-xs">Client's Total Balance:</span>
                            <div className="font-semibold text-text-primary dark:text-slate-200">
                                {isBalanceLoading ? 'Loading...' : `${clientTotalBalance.toLocaleString()} MMK`}
                            </div>
                        </div>
                    </div>
                )}
                {!businessId && clientBalance !== null && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary dark:text-slate-400">Current Balance: 
                                {isBalanceLoading ? 
                                    <span className="italic text-xs"> Loading...</span> :
                                    <span className="font-bold text-lg text-text-primary dark:text-slate-200"> {(clientBalance ?? 0).toLocaleString()} MMK</span>
                                }
                            </span>
                        </div>
                    </div>
                )}
            </div>
        )}

        <Select
          label="Service (Optional)"
          value={serviceId}
          onChange={e => setServiceId(e.target.value)}
          options={[{ value: '', label: '-- Select Service (Optional) --' }, ...allServices.map(s => ({ value: s.id, label: s.name }))]}
        />

        {isFacebookBoosting && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Facebook Boosting Refund</p>
            <div className="space-y-2">
              <Input
                label="Total USD*"
                type="number"
                value={totalUSD}
                onChange={e => setTotalUSD(e.target.value === '' ? '' : Number(e.target.value))}
                required
                min="0.01"
                step="0.01"
              />
              <Input
                label="Rate (MMK per USD)*"
                type="number"
                value={rate}
                onChange={e => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                required
                min="1"
                step="any"
              />
              {totalUSD !== '' && rate !== '' && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Calculated Amount:</strong> {(Number(totalUSD) * Number(rate)).toLocaleString()} MMK
                </div>
              )}
            </div>
          </div>
        )}
        
        <Input 
          label="Refund Amount (MMK)*" 
          type="number" 
          value={amountMMK} 
          onChange={e => {
            if (!isFacebookBoosting) {
              setAmountMMK(e.target.value === '' ? '' : Number(e.target.value));
            }
          }} 
          required 
          min="0.01" 
          step="any"
          disabled={isFacebookBoosting}
          placeholder={isFacebookBoosting ? "Auto-calculated from USD × Rate" : ""}
        />
        
        <Input label="Refund Date*" type="date" value={refundDate} onChange={e => setRefundDate(e.target.value)} required />
        
        <Input 
          label="Reason (Optional)" 
          value={reason} 
          onChange={e => setReason(e.target.value)} 
          placeholder="Reason for refund"
        />
        
        <Input 
          label="Description (Optional)" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          as="textarea" 
          rows={2}
          placeholder="Additional details"
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditMode ? "Save Changes" : "Credit Note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordRefundModal;





