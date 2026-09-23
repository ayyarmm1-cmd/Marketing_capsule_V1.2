import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Payment, Client, Invoice, SaleRecord, InvoiceStatus, SaleStatus, PaymentStatus, PaymentMethodSetting, Business, CreditNote, CreditNoteStatus, CashAccount } from '../../../types';
import { 
    apiRecordPayment, 
    apiUpdatePayment, 
    apiGetClientById,
    apiGetClientBusinessBalance,
    apiGetClientTotalBalance,
    apiGetClients,
    apiGetBusinesses,
    apiGetInvoices,
    apiGetSalesRecords,
    apiGetPayments,
    apiGetCreditNotes,
    apiGetCashAccounts,
    apiGetPaymentMethodSettings,
    apiPreviewClientWidePaymentAllocation,
} from '../../../services/api';
import { useFinanceDataMultiple } from '../../../hooks/useFinanceData';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import { logTiming } from '../../../utils/perf';
import { getTodayInYangon, getDateInYangonTimezone, formatDateForDisplay } from '../../../utils/dateUtils';
import SearchableSelect from '../../ui/SearchableSelect';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pass to skip modal's internal fetch (e.g. from ClientDetailPage) */
  clients?: Client[];
  businesses?: Business[];
  invoices?: Invoice[];
  sales?: SaleRecord[];
  payments?: Payment[];
  creditNotes?: CreditNote[];
  paymentMethods?: PaymentMethodSetting[];
  cashAccounts?: CashAccount[];
  editingPayment?: Payment | null;
  defaultClientId?: string;
  defaultBusinessId?: string;
  defaultSaleId?: string;
  defaultInvoiceId?: string;
  preselectedSaleIds?: string[]; // Pre-selected sale IDs from bulk selection
  defaultAmount?: number;
  calculatedOutstandingBalance?: number; // Pass calculated balance that includes refunds
}

type PaymentTarget = 'invoice' | 'sale' | 'general';

export type PaymentRow = {
  id: string;
  amountMMK: string;
  paymentDate: string;
  method: string;
  remark: string;
  transactionLast4Digits: string;
};

const createEmptyRow = (): PaymentRow => ({
  id: Math.random().toString(36).slice(2),
  amountMMK: '',
  paymentDate: getTodayInYangon(),
  method: '',
  remark: '',
  transactionLast4Digits: '',
});

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen, onClose, onSuccess, clients: clientsProp, businesses: businessesProp, invoices: invoicesProp, sales: salesProp, payments: paymentsProp, creditNotes: creditNotesProp, paymentMethods: paymentMethodsProp, cashAccounts: cashAccountsProp = [], editingPayment,
  defaultClientId, defaultBusinessId, defaultSaleId, defaultInvoiceId, preselectedSaleIds = [], defaultAmount,
  calculatedOutstandingBalance
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const isEditMode = !!editingPayment;

  // Lazy-load modal data only when opened; apply limits to reduce Firebase reads
  const RECORD_PAYMENT_MODAL_LIMIT = 500;
  const { data: fetchedData, isLoading: isDataLoading } = useFinanceDataMultiple({
    clients: apiGetClients,
    businesses: apiGetBusinesses,
    invoices: () => apiGetInvoices(RECORD_PAYMENT_MODAL_LIMIT),
    sales: () => apiGetSalesRecords(RECORD_PAYMENT_MODAL_LIMIT),
    payments: () => apiGetPayments(RECORD_PAYMENT_MODAL_LIMIT),
    creditNotes: () => apiGetCreditNotes(RECORD_PAYMENT_MODAL_LIMIT),
    cashAccounts: apiGetCashAccounts,
    legacyPaymentMethods: apiGetPaymentMethodSettings,
  }, [isOpen], { enabled: isOpen });

  const clients = clientsProp ?? (fetchedData.clients as Client[] | undefined) ?? [];
  const businesses = businessesProp ?? (fetchedData.businesses as Business[] | undefined) ?? [];
  const allInvoices = invoicesProp ?? (fetchedData.invoices as Invoice[] | undefined) ?? [];
  const allSales = salesProp ?? (fetchedData.sales as SaleRecord[] | undefined) ?? [];
  const allPayments = paymentsProp ?? (fetchedData.payments as Payment[] | undefined) ?? [];
  const allCreditNotes = creditNotesProp ?? (fetchedData.creditNotes as CreditNote[] | undefined) ?? [];
  const sales = allSales;
  const payments = allPayments;
  const creditNotes = allCreditNotes;
  const invoices = allInvoices;
  const cashAccounts = cashAccountsProp?.length ? cashAccountsProp : ((fetchedData.cashAccounts as CashAccount[] | undefined) ?? []);
  const legacyPaymentMethods = (fetchedData.legacyPaymentMethods as PaymentMethodSetting[] | undefined) ?? [];
  const paymentMethods: PaymentMethodSetting[] = paymentMethodsProp ?? (() => {
    const cashMapped = cashAccounts.filter((acc: any) => acc.isActive).map((acc: any) => ({
      id: acc.id, name: acc.name, accountNumber: acc.accountNumber || acc.phoneNumber || '', isActive: acc.isActive, showInPublic: acc.showInPublic, logoUrl: acc.logoUrl, qrCodeUrl: acc.qrCodeUrl,
    }));
    return [...cashMapped, ...legacyPaymentMethods.filter(pm => pm.isActive)];
  })();

  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>('general');
  const [clientId, setClientId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>(() => [createEmptyRow()]);
  const [amountMMK, setAmountMMK] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(getTodayInYangon());
  const [method, setMethod] = useState('');
  const [remark, setRemark] = useState('');
  const [transactionLast4Digits, setTransactionLast4Digits] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBalance, setClientBalance] = useState<number | null>(null);
  const [clientBusinessBalance, setClientBusinessBalance] = useState<number | null>(null);
  const [clientTotalBalance, setClientTotalBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [clientWidePreview, setClientWidePreview] = useState<Awaited<ReturnType<typeof apiPreviewClientWidePaymentAllocation>> | null>(null);
  const [isClientWidePreviewLoading, setIsClientWidePreviewLoading] = useState(false);
  
  const prevPreselectedSaleIdsRef = useRef<string[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);

  const getDefaultMethod = () => paymentMethods.length > 0 ? paymentMethods[0].name : (cashAccounts?.length ? (cashAccounts[0]?.name || '') : '');

  // Reset form function - clear ALL data including client and business
  const resetForm = useCallback(() => {
    setClientId('');
    setBusinessId('');
    setLinkIds([]);
    setPaymentRows([{ ...createEmptyRow(), method: getDefaultMethod() }]);
    setAmountMMK('');
    setPaymentDate(getTodayInYangon());
    setMethod(getDefaultMethod());
    setRemark('');
    setTransactionLast4Digits('');
    setPaymentTarget('general');
    setSelectedClient(null);
    setClientBalance(null);
    setClientWidePreview(null);
    prevPreselectedSaleIdsRef.current = [];
    setForceUpdate(0);
  }, [paymentMethods, cashAccounts]);

  // Reset payment fields but keep client and business for "Record Again"
  const resetFormKeepClientBusiness = useCallback(() => {
    setLinkIds([]);
    setPaymentRows([{ ...createEmptyRow(), method: getDefaultMethod() }]);
    setAmountMMK('');
    setPaymentDate(getTodayInYangon());
    setMethod(getDefaultMethod());
    setRemark('');
    setTransactionLast4Digits('');
    setPaymentTarget('general');
    prevPreselectedSaleIdsRef.current = [];
    setForceUpdate(prev => prev + 1);
  }, [paymentMethods, cashAccounts]);

  // Track if we've initialized the form for this modal open session
  const hasInitializedRef = useRef(false);
  const prevIsOpenRef = useRef(false);
  const initializationPropsRef = useRef({ defaultClientId, defaultBusinessId, defaultAmount, editingPayment });

  useEffect(() => {
    // Reset initialization flag when modal closes
    if (!isOpen && prevIsOpenRef.current) {
      hasInitializedRef.current = false;
      resetForm();
    }
    prevIsOpenRef.current = isOpen;

    // Only initialize when modal opens (not on every prop change)
    if (isOpen && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Store the props at initialization time
      initializationPropsRef.current = { defaultClientId, defaultBusinessId, defaultAmount, editingPayment };
      
      if (isEditMode && editingPayment) {
        let target: PaymentTarget = 'general';
        if (editingPayment.invoiceId) target = 'invoice';
        else if (editingPayment.saleRecordId) target = 'sale';
        
        setPaymentTarget(target);
        setClientId(editingPayment.clientId);
        setBusinessId(editingPayment.businessId || '');
        setLinkIds(editingPayment.invoiceId || editingPayment.saleRecordId ? [editingPayment.invoiceId || editingPayment.saleRecordId || ''] : []);
        setAmountMMK(String(editingPayment.amountMMK));
        setPaymentDate(editingPayment.paymentDate);
        setMethod(editingPayment.method);
        setRemark(editingPayment.remark || '');
        setTransactionLast4Digits(editingPayment.transactionLast4Digits || '');
      } else if (!isEditMode) {
        // Default payment target based on context
        const target: PaymentTarget = defaultInvoiceId ? 'invoice' : defaultSaleId ? 'sale' : 'general';
        setPaymentTarget(target);
        // Preserve defaults: use when provided and (data still loading OR exists in data)
        const validClientId = defaultClientId && (clients.length === 0 || clients.some(c => c.id === defaultClientId)) ? defaultClientId : '';
        const validBusinessId = defaultBusinessId && (businesses.length === 0 || businesses.some(b => b.id === defaultBusinessId)) ? defaultBusinessId : '';
        setClientId(validClientId);
        setBusinessId(validBusinessId);
        if (target === 'invoice' && defaultInvoiceId) {
          setLinkIds([defaultInvoiceId]);
        } else if (target === 'sale' && defaultSaleId) {
          setLinkIds([defaultSaleId]);
        } else {
          setLinkIds([]);
        }
        prevPreselectedSaleIdsRef.current = [];
        const firstAmount = defaultAmount !== undefined && defaultAmount !== null ? String(defaultAmount) : '';
        setAmountMMK(firstAmount);
        setPaymentDate(getTodayInYangon());
        setMethod(getDefaultMethod());
        setRemark('');
        setTransactionLast4Digits('');
        setPaymentRows([{
          ...createEmptyRow(),
          amountMMK: firstAmount,
          paymentDate: getTodayInYangon(),
          method: getDefaultMethod(),
        }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen to prevent unnecessary re-initializations

  // Update linkIds when preselectedSaleIds change (for auto-selection)
  // This ensures sales are auto-selected when modal opens with preselectedSaleIds
  useEffect(() => {
    if (isOpen && !isEditMode && preselectedSaleIds.length > 0) {
      // Always update if preselectedSaleIds is provided and modal is open
      // This handles cases where the prop arrives after modal opens
      const newLinkIds = [...preselectedSaleIds];
      const prevIds = prevPreselectedSaleIdsRef.current;
      const idsMatch = newLinkIds.length === prevIds.length &&
        newLinkIds.every((id, index) => id === prevIds[index]);
      
      // Check if current linkIds matches what we want
      const currentMatches = linkIds.length === newLinkIds.length &&
        linkIds.every(id => newLinkIds.includes(id));
      
      if (!idsMatch || !currentMatches) {
        // Force update linkIds - use sale-specific when preselected sales are provided
        setPaymentTarget('sale');
        setLinkIds(newLinkIds);
        prevPreselectedSaleIdsRef.current = newLinkIds;
      }
    } else if (!isOpen) {
      // Reset ref when modal closes
      prevPreselectedSaleIdsRef.current = [];
    }
  }, [isOpen, isEditMode, preselectedSaleIds, linkIds]);

  useEffect(() => {
    if (!isOpen || isEditMode) return;
    if (defaultInvoiceId) {
      setPaymentTarget('invoice');
      setLinkIds(prev => (prev.length === 0 ? [defaultInvoiceId] : prev));
      if (defaultAmount !== undefined && defaultAmount !== null && !amountMMK) {
        setAmountMMK(String(defaultAmount));
      }
      return;
    }
    if (defaultSaleId) {
      setPaymentTarget('sale');
      setLinkIds(prev => (prev.length === 0 ? [defaultSaleId] : prev));
      if (defaultAmount !== undefined && defaultAmount !== null && !amountMMK) {
        setAmountMMK(String(defaultAmount));
      }
    }
  }, [isOpen, isEditMode, defaultInvoiceId, defaultSaleId, defaultAmount, amountMMK]);

  // Auto-update client when business is selected (business -> linked client). User can change client later.
  useEffect(() => {
    if (!businessId || !businesses.length || !clients.length) return;
    const business = businesses.find(b => b.id === businessId);
    if (!business?.linkedClientIds?.length) return;
    const firstLinkedClientId = business.linkedClientIds[0];
    if (!clients.some(c => c.id === firstLinkedClientId)) return;
    const shouldSet = !clientId || !business.linkedClientIds.includes(clientId);
    if (shouldSet && clientId !== firstLinkedClientId) {
      setClientId(firstLinkedClientId);
    }
  }, [businessId, clientId, businesses, clients]);
  
  // Update client balance - fetch client-business balance and client total balance
  useEffect(() => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    
    if (!client) {
      setClientBalance(null);
      setClientBusinessBalance(null);
      setClientTotalBalance(null);
      return;
    }

    // Always use calculated outstanding balance if provided (includes refunds)
    // This ensures refunds are properly subtracted from the balance
    // Check both undefined and null, but allow 0 as a valid value
    if (calculatedOutstandingBalance !== undefined) {
      setIsBalanceLoading(false);
      // Allow 0 as valid balance (could be fully paid)
      setClientBalance(typeof calculatedOutstandingBalance === 'number' ? calculatedOutstandingBalance : 0);
      // If we have calculated balance but no businessId, we can't show client-business balance
      if (!businessId) {
        setClientBusinessBalance(null);
        setClientTotalBalance(calculatedOutstandingBalance);
      }
      return; // Exit early to avoid API call
    }
    
    // Fetch balances from Firebase
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
          setClientBalance(totalBalance);
        }
      } catch (err) {
        console.error("Failed to fetch balances:", err);
        addNotification("Could not load balance information.", "error");
      } finally {
        setIsBalanceLoading(false);
      }
    };
    
    fetchBalances();
  }, [clientId, businessId, clients, addNotification, calculatedOutstandingBalance]);

  const clientWidePreviewAmount = useMemo(() => {
    if (isEditMode || paymentTarget !== 'general' || businessId) return 0;
    return paymentRows.reduce((sum, row) => {
      const amt = Number(row.amountMMK);
      return sum + (row.amountMMK !== '' && !isNaN(amt) && amt > 0 ? amt : 0);
    }, 0);
  }, [isEditMode, paymentTarget, businessId, paymentRows]);

  useEffect(() => {
    if (!isOpen || isEditMode || paymentTarget !== 'general' || businessId || !clientId || clientWidePreviewAmount <= 0) {
      setClientWidePreview(null);
      setIsClientWidePreviewLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsClientWidePreviewLoading(true);
      try {
        const preview = await apiPreviewClientWidePaymentAllocation(clientId, clientWidePreviewAmount);
        if (!cancelled) setClientWidePreview(preview);
      } catch {
        if (!cancelled) setClientWidePreview(null);
      } finally {
        if (!cancelled) setIsClientWidePreviewLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, isEditMode, paymentTarget, businessId, clientId, clientWidePreviewAmount]);

  // Calculate remaining amounts for each sale (grandTotalMMK - payments made - credit notes)
  // Credit notes are applied to sales starting from the most recent payments
  // MUST be defined BEFORE availableSales since availableSales depends on it
  const saleRemainingAmounts = useMemo(() => {
    const amounts = new Map<string, number>();
    
    // First, calculate base remaining for each sale (without credit notes)
    const baseRemaining = new Map<string, number>();
    const salePaymentDates = new Map<string, Date>(); // Track most recent payment date per sale
    
    sales.forEach(sale => {
      if (!sale.id) return;
      if (sale.status === SaleStatus.DRAFT) {
        amounts.set(sale.id, 0);
        return;
      }
      // Priority: Use sale.amountPaid if available (most accurate as it's stored on the sale record)
      // Fallback: Calculate from payments array if sale.amountPaid is missing or 0
      let amountPaid = sale.amountPaid || 0;
      
      // If sale.amountPaid is not set, calculate from payments array
      if (!sale.amountPaid || sale.amountPaid === 0) {
        const salePayments = payments.filter(p => 
          p.status === PaymentStatus.APPROVED &&
          !p.refundId &&
          (p.saleRecordId === sale.id || (p.saleAllocations && p.saleAllocations.some(a => a.saleRecordId === sale.id)))
        );
        amountPaid = salePayments.reduce((sum, p) => {
          if (p.saleAllocations && p.saleAllocations.length > 0) {
            return sum + p.saleAllocations
              .filter(a => a.saleRecordId === sale.id)
              .reduce((allocSum, a) => allocSum + (a.amountMMK || 0), 0);
          }
          return sum + (p.amountMMK || 0);
        }, 0);
        
        // Find most recent payment date for this sale
        if (salePayments.length > 0) {
          const paymentDates = salePayments
            .map(p => new Date(p.paymentDate || p.createdAt || 0))
            .filter(d => !isNaN(d.getTime()));
          if (paymentDates.length > 0) {
            const mostRecentPayment = new Date(Math.max(...paymentDates.map(d => d.getTime())));
            salePaymentDates.set(sale.id, mostRecentPayment);
          }
        }
      } else {
        // If amountPaid exists, find most recent payment date from payments array
        const salePayments = payments.filter(p => 
          p.status === PaymentStatus.APPROVED &&
          !p.refundId &&
          (p.saleRecordId === sale.id || (p.saleAllocations && p.saleAllocations.some(a => a.saleRecordId === sale.id)))
        );
        if (salePayments.length > 0) {
          const paymentDates = salePayments
            .map(p => new Date(p.paymentDate || p.createdAt || 0))
            .filter(d => !isNaN(d.getTime()));
          if (paymentDates.length > 0) {
            const mostRecentPayment = new Date(Math.max(...paymentDates.map(d => d.getTime())));
            salePaymentDates.set(sale.id, mostRecentPayment);
          }
        }
      }
      
      const remaining = Math.max((sale.grandTotalMMK || 0) - amountPaid, 0);
      baseRemaining.set(sale.id, remaining);
      amounts.set(sale.id, remaining); // Initialize with base remaining
    });
    
    // Get approved credit notes for this client/business
    const approvedCreditNotes = creditNotes.filter(cn => 
      cn.status === CreditNoteStatus.APPROVED &&
      cn.clientId === clientId &&
      cn.businessId === businessId
    );
    
    if (approvedCreditNotes.length > 0 && clientId && businessId) {
      // Sort sales by most recent payment date (most recent first)
      // Sales without payments go to the end
      const salesWithRemaining = Array.from(baseRemaining.entries())
        .filter(([_, remaining]) => remaining > 0)
        .map(([saleId, remaining]) => ({
          saleId,
          remaining,
          lastPaymentDate: salePaymentDates.get(saleId) || new Date(0) // Use epoch if no payment
        }))
        .sort((a, b) => {
          // Sort by most recent payment date (descending)
          // If dates are equal, maintain original order
          return b.lastPaymentDate.getTime() - a.lastPaymentDate.getTime();
        });
      
      // Calculate total credit notes
      const totalCreditNotes = approvedCreditNotes.reduce((sum, cn) => sum + cn.amountMMK, 0);
      
      // Apply credit notes to sales starting from most recent payments
      let creditNotesToApply = totalCreditNotes;
      for (const { saleId, remaining } of salesWithRemaining) {
        if (creditNotesToApply <= 0) break;
        
        const creditNoteApplied = Math.min(creditNotesToApply, remaining);
        const newRemaining = remaining - creditNoteApplied;
        amounts.set(saleId, Math.max(newRemaining, 0));
        creditNotesToApply -= creditNoteApplied;
      }
    }
    
    return amounts;
  }, [sales, payments, creditNotes, clientId, businessId]);

  const getInvoiceTotals = useCallback((inv: Invoice) => {
    const linkedSalesMap = new Map<string, SaleRecord>();
    sales.forEach(sale => {
      if (sale.invoiceId === inv.id || (inv.saleRecordId && sale.id === inv.saleRecordId)) {
        if (sale.id) linkedSalesMap.set(sale.id, sale);
      }
    });
    const linkedSales = Array.from(linkedSalesMap.values());
    if (linkedSales.length === 0) {
      return {
        grandTotal: inv.grandTotal || 0,
        amountPaid: inv.amountPaid || 0,
        linkedSaleIds: [] as string[],
      };
    }
    return {
      grandTotal: linkedSales.reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0),
      amountPaid: linkedSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0),
      linkedSaleIds: linkedSales.map(sale => sale.id).filter((id): id is string => !!id),
    };
  }, [sales]);

  const availableInvoices = useMemo(() => {
    if (!clientId || !businessId) return [];
    return invoices.filter(inv => {
      if (inv.clientId !== clientId || inv.businessId !== businessId) return false;
      if (inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.CANCELLED) return false;
      // Only show invoices with outstanding balance > 0
      const totals = getInvoiceTotals(inv);
      const outstandingAmount = totals.grandTotal - totals.amountPaid;
      return outstandingAmount > 0;
    });
  }, [clientId, businessId, invoices, getInvoiceTotals]);

  const availableSales = useMemo(() => {
    if (!clientId || !businessId) return [];
    return sales.filter(sale => {
      // Filter by client and business
      if (sale.clientId !== clientId || sale.businessId !== businessId) return false;
      // Only approved sales can receive payment allocations
      if (sale.status === SaleStatus.DRAFT) return false;
      // Only show sales with remaining balance > 0
      const remaining = saleRemainingAmounts.get(sale.id) || 0;
      return remaining > 0;
    });
  }, [clientId, businessId, sales, saleRemainingAmounts]);

  // Helper function to format sale date
  const formatSaleDate = (dateString: string): string => formatDateForDisplay(dateString);

  // Helper function to get sale description preview
  const getSaleDescriptionPreview = (sale: SaleRecord): string => {
    switch (sale.type) {
      case 'Facebook Ads':
        const fbSale = sale as any;
        return fbSale.campaignName || fbSale.campaignObjective || 'Facebook Ads';
      case 'Other Services':
        return 'Other Services';
      default:
        return 'Sale';
    }
  };

  // Identify payment groups: sales that were paid together (same date, client, business, within same time window)
  const paymentGroups = useMemo(() => {
    if (!clientId || !businessId) return new Map<string, string[]>();
    
    const groups = new Map<string, string[]>(); // groupKey -> array of sale IDs
    
    // Group payments by date, client, business, and time window (within 30 seconds)
    const paymentGroupsByTime = new Map<string, Payment[]>();
    
    payments
      .filter(p => p.clientId === clientId && p.businessId === businessId && p.saleRecordId && p.status === PaymentStatus.APPROVED)
      .forEach(payment => {
        const datePart = getDateInYangonTimezone(new Date(payment.createdAt));
        const timeKey = `${datePart}_${Math.floor(new Date(payment.createdAt).getTime() / 30000)}`; // Group by Yangon date and 30-second window
        const key = `${timeKey}_${payment.clientId}_${payment.businessId}`;
        
        if (!paymentGroupsByTime.has(key)) {
          paymentGroupsByTime.set(key, []);
        }
        paymentGroupsByTime.get(key)!.push(payment);
      });
    
    // Create groups for payments that were made together (2+ sales on same date/time)
    paymentGroupsByTime.forEach((groupPayments, key) => {
      if (groupPayments.length > 1) {
        const saleIds = groupPayments
          .map(p => p.saleRecordId)
          .filter((id): id is string => !!id)
          .sort(); // Sort for consistent group key
        
        // Check if we have unique sale IDs (more than 1 different sale)
        const uniqueSaleIds = Array.from(new Set(saleIds));
        if (uniqueSaleIds.length > 1) {
          const groupKey = uniqueSaleIds.join(',');
          groups.set(groupKey, uniqueSaleIds);
        }
      }
    });
    
    return groups;
  }, [clientId, businessId, payments]);

  // Calculate remaining amounts for payment groups
  const groupRemainingAmounts = useMemo(() => {
    const amounts = new Map<string, number>();
    paymentGroups.forEach((saleIds, groupKey) => {
      const totalRemaining = saleIds.reduce((sum, saleId) => {
        return sum + (saleRemainingAmounts.get(saleId) || 0);
      }, 0);
      if (totalRemaining > 0) {
        amounts.set(groupKey, totalRemaining);
      }
    });
    return amounts;
  }, [paymentGroups, saleRemainingAmounts]);

  const linkedClientsForBusiness = useMemo(() => {
    // Ensure we always return an array, even if clients is empty
    if (!clients || clients.length === 0) {
      return [];
    }
    // If no business is selected, show all clients
    if (!businessId || businessId === '') {
      return clients;
    }
    const business = businesses.find(b => b.id === businessId);
    if (!business || !business.linkedClientIds || business.linkedClientIds.length === 0) {
      // If business has no linked clients, show all clients
      return clients;
    }
    const filtered = clients.filter(c => business.linkedClientIds.includes(c.id));
    // Always include the currently selected client if it exists, even if not in linked list
    if (clientId && clientId !== '') {
      const selectedClient = clients.find(c => c.id === clientId);
      if (selectedClient && !filtered.find(c => c.id === clientId)) {
        return [selectedClient, ...filtered];
      }
    }
    return filtered.length > 0 ? filtered : clients; // Fallback to all clients if filtered is empty
  }, [businessId, businesses, clients, clientId]);

  const linkedBusinessesForClient = useMemo(() => {
    // Ensure we always return an array, even if businesses is empty
    if (!businesses || businesses.length === 0) {
      return [];
    }
    // If no client is selected, show all businesses
    if (!clientId || clientId === '') {
      return businesses;
    }
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.linkedBusinessIds || client.linkedBusinessIds.length === 0) {
      // If client has no linked businesses, show all businesses
      return businesses;
    }
    const filtered = businesses.filter(b => client.linkedBusinessIds.includes(b.id));
    // Always include the currently selected business if it exists, even if not in linked list
    if (businessId && businessId !== '') {
      const selectedBusiness = businesses.find(b => b.id === businessId);
      if (selectedBusiness && !filtered.find(b => b.id === businessId)) {
        return [selectedBusiness, ...filtered];
      }
    }
    return filtered.length > 0 ? filtered : businesses; // Fallback to all businesses if filtered is empty
  }, [clientId, clients, businesses, businessId]);

  const handlePayFullBalance = () => {
    if (clientBalance !== null && clientBalance > 0) {
      setAmountMMK(String(clientBalance));
      setPaymentRows(prev => {
        const next = [...prev];
        if (next.length > 0) next[0] = { ...next[0], amountMMK: String(clientBalance) };
        return next;
      });
    }
  };

  const paymentMethodOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [{ value: '', label: '-- Select Account --' }];
    const processedMethods = new Set<string>();
    cashAccounts
      ?.filter(acc => acc.isActive && ['Bank Account', 'Mobile Wallet', 'Cash'].includes(acc.accountType || ''))
      ?.forEach(acc => {
        const displayName = acc.accountType === 'Bank Account' ? (acc.bankName || acc.name) : acc.accountType === 'Mobile Wallet' ? (acc.walletProvider || acc.name) : acc.name;
        const last4 = acc.accountType === 'Bank Account' ? (acc.accountNumber?.slice(-4) || '') : acc.accountType === 'Mobile Wallet' ? (acc.phoneNumber?.slice(-4) || '') : '';
        const label = acc.accountType === 'Cash' ? acc.name : `${acc.name} - ${displayName}${last4 ? ` (****${last4})` : ''}`;
        options.push({ value: acc.name, label });
        processedMethods.add(acc.name);
      });
    paymentMethods
      ?.filter(m => !processedMethods.has(m.name) && m.isActive)
      ?.forEach(m => {
        const suffix = m.accountNumber ? ` (${m.accountNumber.slice(-4)})` : '';
        options.push({ value: m.name, label: `${m.name}${suffix}` });
      });
    return options;
  }, [cashAccounts, paymentMethods]);

  const addPaymentRow = () => {
    setPaymentRows(prev => [...prev, { ...createEmptyRow(), paymentDate: getTodayInYangon(), method: getDefaultMethod() }]);
  };

  const updatePaymentRow = (id: string, updates: Partial<PaymentRow>) => {
    setPaymentRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removePaymentRow = (id: string) => {
    setPaymentRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  };

  const handleToggleLinkId = (id: string) => {
    setLinkIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(linkId => linkId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllLinks = () => {
    if (paymentTarget === 'invoice') {
      setLinkIds(availableInvoices.map(inv => inv.id));
    } else if (paymentTarget === 'sale') {
      // Include both individual sales and groups
      const allSaleIds = new Set<string>();
      availableSales.forEach(sale => allSaleIds.add(sale.id));
      // Add groups as selectable (they'll be handled specially)
      paymentGroups.forEach((saleIds) => {
        saleIds.forEach(id => allSaleIds.add(id));
      });
      setLinkIds(Array.from(allSaleIds));
    }
  };

  const handleToggleGroup = (groupKey: string) => {
    const groupSaleIds = paymentGroups.get(groupKey) || [];
    setLinkIds(prev => {
      const newSet = new Set(prev);
      const allSelected = groupSaleIds.every(id => newSet.has(id));
      if (allSelected) {
        // Deselect all in group
        groupSaleIds.forEach(id => newSet.delete(id));
      } else {
        // Select all in group
        groupSaleIds.forEach(id => newSet.add(id));
      }
      return Array.from(newSet);
    });
  };

  const isGroupSelected = (groupKey: string): boolean => {
    const groupSaleIds = paymentGroups.get(groupKey) || [];
    return groupSaleIds.length > 0 && groupSaleIds.every(id => linkIds.includes(id));
  };

  const handleDeselectAllLinks = () => {
    setLinkIds([]);
  };

  const resolveCashAccountId = () => {
    const matched = cashAccounts.find(acc => acc.name === method);
    return matched?.id;
  };

  const handleSave = async (closeAfterSave: boolean, resetMode: 'full' | 'keepClientBusiness' = 'full') => {
    const saveStart = performance.now();
    if (!clientId) {
      addNotification("Client is required.", "error");
      logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'validation_error' });
      return;
    }
    if ((paymentTarget === 'invoice' || paymentTarget === 'sale') && !businessId) {
      addNotification("Business is required for invoice or sale payments.", "error");
      logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'validation_error' });
      return;
    }
    if (isEditMode && !method) {
      addNotification("Payment method is required.", "error");
      logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'validation_error' });
      return;
    }
    // Payment For field removed - all payments are general (auto-allocates to sales)
    // No need to check for invoice/sale selection

    setIsLoading(true);

    if (isEditMode && editingPayment) {
        const updatePayload: Partial<Omit<Payment, 'id' | 'createdAt'>> = {
            amountMMK: Number(amountMMK),
            paymentDate,
            method,
            remark: remark.trim(),
        };
        const cashAccountId = resolveCashAccountId();
        if (cashAccountId) {
            updatePayload.cashAccountId = cashAccountId;
        }
        if (method !== 'Cash' && transactionLast4Digits.trim()) {
            updatePayload.transactionLast4Digits = transactionLast4Digits.trim();
        }
        try {
            const apiStart = performance.now();
            await apiUpdatePayment(editingPayment.id, updatePayload);
            logTiming('RecordPaymentModal.apiUpdatePayment', apiStart);
            addNotification(`Payment ${editingPayment.receiptNumber} updated.`, "success");
            if (closeAfterSave) {
              onSuccess();
              onClose();
            } else {
              resetForm();
            }
        } catch (error) {
            addNotification(`Failed to update payment: ${(error as Error).message}`, "error");
            logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'error', mode: 'edit' });
        } finally {
            setIsLoading(false);
        }
    } else {
        if (!user) {
            addNotification("Authentication error.", "error");
            setIsLoading(false);
            logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'auth_error' });
            return;
        }

        try {
            const validRows = paymentRows.filter(r => {
                const amt = Number(r.amountMMK);
                return r.amountMMK !== '' && !isNaN(amt) && amt > 0 && r.method;
            });
            if (validRows.length === 0) {
                addNotification("Add at least one payment with amount > 0 and method.", "error");
                setIsLoading(false);
                return;
            }
            if ((paymentTarget === 'invoice' || paymentTarget === 'sale') && linkIds.length === 0) {
                addNotification(`Select at least one ${paymentTarget === 'invoice' ? 'invoice' : 'sale'} to apply payment to.`, "error");
                setIsLoading(false);
                return;
            }

            if (paymentTarget === 'general') {
                if (!businessId) {
                    const client = clients.find(c => c.id === clientId);
                    if (!client?.linkedBusinessIds?.length) {
                        addNotification('Client has no linked businesses. Link at least one business or select a specific business.', 'error');
                        setIsLoading(false);
                        return;
                    }
                }
                const paymentPromises = validRows.map(row => {
                    const rowMethod = row.method;
                    const resolveRowCashAccount = () => cashAccounts.find(acc => acc.name === rowMethod)?.id;
                    const payload: Omit<Payment, 'id' | 'recordedByUserId' | 'receiptNumber' | 'createdAt' | 'status'> = {
                        clientId,
                        ...(businessId ? { businessId } : {}),
                        invoiceId: undefined,
                        saleRecordId: undefined,
                        amountMMK: Number(row.amountMMK),
                        paymentDate: row.paymentDate,
                        method: rowMethod,
                        remark: row.remark || undefined,
                        transactionLast4Digits: rowMethod !== 'Cash' && row.transactionLast4Digits ? row.transactionLast4Digits : undefined,
                        cashAccountId: resolveRowCashAccount(),
                    };
                    return apiRecordPayment({ ...payload, recordedByUserId: user.id });
                });
                const apiStart = performance.now();
                await Promise.all(paymentPromises);
                logTiming('RecordPaymentModal.apiRecordPaymentBatch', apiStart, { count: paymentPromises.length, target: 'general' });
                addNotification(`${validRows.length} payment(s) recorded successfully.`, "success");
            } else if (paymentTarget === 'invoice') {
                const totalAmountFromRows = validRows.reduce((sum, r) => sum + Number(r.amountMMK), 0);
                const totalOutstanding = linkIds.reduce((sum, id) => {
                    const inv = invoices.find(i => i.id === id);
                    if (!inv) return sum;
                    const totals = getInvoiceTotals(inv);
                    return sum + Math.max(totals.grandTotal - totals.amountPaid, 0);
                }, 0);
                const customAmount = totalAmountFromRows > 0 ? totalAmountFromRows : totalOutstanding;
                if (customAmount > totalOutstanding) {
                    addNotification(`Total amount (${customAmount.toLocaleString()} MMK) exceeds total outstanding (${totalOutstanding.toLocaleString()} MMK).`, "error");
                    setIsLoading(false);
                    return;
                }
                
                // Distribute custom amount proportionally or pay full for each
                const paymentPromises: Promise<Payment>[] = [];
                
                // Pay invoices
                linkIds.forEach(invoiceId => {
                    const invoice = invoices.find(inv => inv.id === invoiceId);
                    if (!invoice) {
                        throw new Error(`Invoice ${invoiceId} not found`);
                    }
                    const invoiceTotals = getInvoiceTotals(invoice);
                    const outstandingAmount = Math.max(invoiceTotals.grandTotal - invoiceTotals.amountPaid, 0);
                    if (outstandingAmount <= 0) {
                        throw new Error(`Invoice ${invoiceId} has no outstanding amount`);
                    }
                    // Use custom amount proportionally if less than total
                    const paymentAmount = customAmount >= totalOutstanding 
                        ? outstandingAmount 
                        : Math.round((outstandingAmount / totalOutstanding) * customAmount);
                    
                    const firstRow = validRows[0];
                    const paymentPayload: Omit<Payment, 'id' | 'recordedByUserId' | 'receiptNumber' | 'createdAt' | 'status'> = {
                        clientId,
                        businessId: businessId,
                        invoiceId: invoiceId,
                        saleRecordId: undefined,
                        amountMMK: paymentAmount,
                        paymentDate: firstRow.paymentDate,
                        method: firstRow.method,
                        remark: firstRow.remark || undefined,
                        transactionLast4Digits: firstRow.method !== 'Cash' && firstRow.transactionLast4Digits ? firstRow.transactionLast4Digits : undefined,
                        cashAccountId: cashAccounts.find(acc => acc.name === firstRow.method)?.id,
                    };
                    paymentPromises.push(apiRecordPayment({ ...paymentPayload, recordedByUserId: user.id }));
                });
                
                const apiStart = performance.now();
                await Promise.all(paymentPromises);
                logTiming('RecordPaymentModal.apiRecordPaymentBatch', apiStart, { count: paymentPromises.length, target: 'invoice' });
                addNotification(`${linkIds.length} payment(s) recorded successfully for ${linkIds.length} invoice(s).`, "success");
            } else if (paymentTarget === 'sale') {
                const totalAmountFromRows = validRows.reduce((sum, r) => sum + Number(r.amountMMK), 0);
                const totalRemaining = linkIds.reduce((sum, id) => sum + (saleRemainingAmounts.get(id) || 0), 0);
                const customAmount = totalAmountFromRows > 0 ? totalAmountFromRows : totalRemaining;
                if (customAmount > totalRemaining) {
                    addNotification(`Total amount (${customAmount.toLocaleString()} MMK) exceeds total remaining (${totalRemaining.toLocaleString()} MMK).`, "error");
                    setIsLoading(false);
                    return;
                }
                
                // Distribute custom amount proportionally or pay full for each
                const paymentPromises = linkIds.map(async (saleId) => {
                    const sale = sales.find(s => s.id === saleId);
                    if (!sale) {
                        throw new Error(`Sale ${saleId} not found`);
                    }
                    const remainingAmount = saleRemainingAmounts.get(saleId) || 0;
                    if (remainingAmount <= 0) {
                        throw new Error(`Sale ${saleId} has no remaining amount to pay`);
                    }
                    // Use custom amount proportionally if less than total remaining
                    const paymentAmount = customAmount >= totalRemaining 
                        ? remainingAmount 
                        : Math.round((remainingAmount / totalRemaining) * customAmount);
                    
                    const firstRow = validRows[0];
                    const paymentPayload: Omit<Payment, 'id' | 'recordedByUserId' | 'receiptNumber' | 'createdAt' | 'status'> = {
                        clientId,
                        businessId: businessId,
                        invoiceId: undefined,
                        saleRecordId: saleId,
                        amountMMK: paymentAmount,
                        paymentDate: firstRow.paymentDate,
                        method: firstRow.method,
                        remark: firstRow.remark || undefined,
                        transactionLast4Digits: firstRow.method !== 'Cash' && firstRow.transactionLast4Digits ? firstRow.transactionLast4Digits : undefined,
                        cashAccountId: cashAccounts.find(acc => acc.name === firstRow.method)?.id,
                    };
                    return apiRecordPayment({ ...paymentPayload, recordedByUserId: user.id });
                });
                const apiStart = performance.now();
                await Promise.all(paymentPromises);
                logTiming('RecordPaymentModal.apiRecordPaymentBatch', apiStart, { count: paymentPromises.length, target: 'sale' });
                addNotification(`${linkIds.length} payment(s) recorded successfully for ${linkIds.length} sale(s).`, "success");
            }

            if (closeAfterSave) {
              onSuccess();
              onClose();
            } else {
              if (resetMode === 'keepClientBusiness') {
                resetFormKeepClientBusiness();
              } else {
                resetForm();
              }
            }
        } catch (error) {
            addNotification(`Failed to record payment(s): ${(error as Error).message}`, "error");
            setIsLoading(false);
            logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'error', mode: 'create' });
        }
    }
    
    if (!isLoading) {
      setIsLoading(false);
    }
    logTiming('RecordPaymentModal.handleSave', saveStart, { result: 'success', mode: isEditMode ? 'edit' : 'create' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(true); // Default to save and exit
  };

  useEffect(() => {
    if (paymentTarget === 'general') {
        setLinkIds([]);
    }
  }, [paymentTarget]);

  // General payments default to client-wide when client is set without a specific business
  useEffect(() => {
    if (!isOpen || isEditMode || paymentTarget !== 'general') return;
    if (clientId && !defaultBusinessId && !defaultSaleId && !defaultInvoiceId) {
      setBusinessId('');
    }
  }, [isOpen, isEditMode, paymentTarget, clientId, defaultBusinessId, defaultSaleId, defaultInvoiceId]);
  
  const selectedInvoice = isEditMode ? invoices.find(inv => inv.id === editingPayment?.invoiceId) : null;
  const selectedSale = isEditMode ? sales.find(s => s.id === editingPayment?.saleRecordId) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? `Edit Payment ${editingPayment?.receiptNumber}` : "Record Client Payment"} size="xl" closeOnOutsideClick={false}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Recorded by" value={user?.name || ''} disabled />
        
        <div>
          <SearchableSelect
            label={paymentTarget === 'general' ? 'Business (optional)' : 'Business*'}
            value={businessId}
            onChange={value => {
              const stringValue = String(value);
              setBusinessId(stringValue);
              setForceUpdate(prev => prev + 1);
              const business = businesses.find(b => b.id === stringValue);
              if (business?.linkedClientIds?.length && clientId && !business.linkedClientIds.includes(clientId)) {
                setClientId(business.linkedClientIds[0]);
              }
            }}
            options={useMemo(() => {
              const all = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
              if (clientId) {
                const client = clients.find(c => c.id === clientId);
                if (client?.linkedBusinessIds?.length) {
                  const linked = all.filter(opt => client.linkedBusinessIds!.includes(opt.value));
                  if (paymentTarget === 'general' && linked.length > 0) {
                    return [{ value: '', label: 'All Linked Businesses (Client-wide)' }, ...linked];
                  }
                  return linked;
                }
                return [];
              }
              return all;
            }, [businesses, clientId, clients, forceUpdate, paymentTarget])}
            placeholder={businesses.length === 0 ? "Loading businesses..." : paymentTarget === 'general' ? "-- All Linked Businesses or Select One --" : "-- Search & Select Business --"}
            required={paymentTarget !== 'general'}
          />
          {(clientId || businessId) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setClientId(''); setBusinessId(''); setForceUpdate(prev => prev + 1); }} className="mt-1 text-xs">
              Clear & Reselect
            </Button>
          )}
        </div>

        <SearchableSelect
          label="Client*"
          value={clientId}
          onChange={value => {
            const stringValue = String(value);
            setClientId(stringValue);
            setForceUpdate(prev => prev + 1);
            if (paymentTarget === 'general') {
              // Default to client-wide allocation when client changes
              setBusinessId('');
            } else {
              const client = clients.find(c => c.id === stringValue);
              if (client?.linkedBusinessIds?.length && businessId && !client.linkedBusinessIds.includes(businessId)) {
                setBusinessId(client.linkedBusinessIds[0]);
              }
            }
          }}
          options={useMemo(() => {
            const all = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
            if (businessId) {
              const business = businesses.find(b => b.id === businessId);
              if (business?.linkedClientIds?.length) {
                return all.filter(opt => business.linkedClientIds!.includes(opt.value));
              }
              return [];
            }
            return all;
          }, [clients, businessId, businesses, forceUpdate])}
          placeholder={clients.length === 0 ? "Loading clients..." : "-- Search & Select Client --"}
          required
        />
        
        {selectedClient && !isEditMode && (
            <div className="space-y-2">
                {businessId && clientBusinessBalance !== null && (
                    <div className="p-3 bg-primary-action text-white rounded-md text-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs opacity-90">Current Balance ({businesses.find(b => b.id === businessId)?.name || 'Business'}):</span>
                                <div className="font-bold text-lg">
                                    {isBalanceLoading ? 'Loading...' : `${clientBusinessBalance.toLocaleString()} MMK`}
                                </div>
                            </div>
                            {clientBusinessBalance > 0 && !isBalanceLoading && (
                                <Button type="button" variant="ghost" size="sm" onClick={handlePayFullBalance} className="!text-white hover:!bg-white/20">
                                    Pay Full
                                </Button>
                            )}
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
                    <div className="p-3 bg-primary-action text-white rounded-md text-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs opacity-90">Client-wide Balance (all linked businesses):</span>
                                <div className="font-bold text-lg">
                                    {isBalanceLoading ? 'Loading...' : `${clientBalance.toLocaleString()} MMK`}
                                </div>
                            </div>
                            {clientBalance > 0 && !isBalanceLoading && (
                                <Button type="button" variant="ghost" size="sm" onClick={handlePayFullBalance} className="!text-white hover:!bg-white/20">
                                    Pay Full
                                </Button>
                            )}
                        </div>
                        {paymentTarget === 'general' && (
                            <p className="text-xs opacity-90 mt-1">
                                Payment will apply to opening balances first, then oldest approved sales across all linked businesses.
                            </p>
                        )}
                    </div>
                )}
            </div>
        )}

        <Select
          label="Payment For*"
          value={paymentTarget}
          onChange={(e) => setPaymentTarget(e.target.value as PaymentTarget)}
          options={[
            { value: 'general', label: 'General (Auto-allocate to oldest sales)' },
            { value: 'invoice', label: 'Invoice (Specific)' },
            { value: 'sale', label: 'Sale (Specific)' }
          ]}
          disabled={isEditMode}
        />

        {paymentTarget === 'invoice' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">
                Select Invoice(s)* <span className="text-xs text-text-secondary dark:text-slate-500">({linkIds.length} selected)</span>
              </label>
              {!isEditMode && availableInvoices.length > 0 && (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllLinks} disabled={linkIds.length === availableInvoices.length}>
                    Select All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleDeselectAllLinks} disabled={linkIds.length === 0}>
                    Deselect All
                  </Button>
                </div>
              )}
            </div>
            {!businessId || !clientId ? (
              <p className="text-sm text-text-secondary dark:text-slate-400 py-2">-- Select Business & Client --</p>
            ) : availableInvoices.length === 0 ? (
              <p className="text-sm text-text-secondary dark:text-slate-400 py-2">No pending invoices</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700">
                {availableInvoices.map(inv => {
                  const totals = getInvoiceTotals(inv);
                  const outstandingAmount = Math.max(totals.grandTotal - totals.amountPaid, 0);
                  return (
                    <label
                      key={inv.id}
                      className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                        linkIds.includes(inv.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-600 border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={linkIds.includes(inv.id)}
                        onChange={() => handleToggleLinkId(inv.id)}
                        disabled={isEditMode}
                        className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                      />
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-text-primary dark:text-slate-200">
                          INV: {inv.id}
                        </span>
                        <span className="ml-2 text-sm text-text-secondary dark:text-slate-400">
                          (Outstanding: {outstandingAmount.toLocaleString()} MMK)
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {paymentTarget === 'sale' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">
                Select Sale Record(s)* <span className="text-xs text-text-secondary dark:text-slate-500">({linkIds.length} selected)</span>
              </label>
              {!isEditMode && (availableSales.length > 0 || Array.from(groupRemainingAmounts.keys()).length > 0) && (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllLinks} disabled={false}>
                    Select All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={handleDeselectAllLinks} disabled={linkIds.length === 0}>
                    Deselect All
                  </Button>
                </div>
              )}
            </div>
            {!businessId || !clientId ? (
              <p className="text-sm text-text-secondary dark:text-slate-400 py-2">-- Select Business & Client --</p>
            ) : availableSales.length === 0 && Array.from(groupRemainingAmounts.keys()).length === 0 ? (
              <p className="text-sm text-text-secondary dark:text-slate-400 py-2">No applicable sales or groups with remaining balance</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700">
                {/* Display Payment Groups First */}
                {Array.from(paymentGroups.entries()).map(([groupKey, groupSaleIds]) => {
                  const groupRemaining = groupRemainingAmounts.get(groupKey) || 0;
                  if (groupRemaining <= 0) return null; // Don't show fully paid groups
                  
                  const isSelected = isGroupSelected(groupKey);
                  const groupSales = groupSaleIds.map(id => sales.find(s => s.id === id)).filter((s): s is SaleRecord => !!s);
                  
                  // Only allow selection if group has remaining balance
                  const canSelect = groupRemaining > 0;
                  
                  return (
                    <label
                      key={`group-${groupKey}`}
                      className={`flex items-start p-3 rounded-lg transition-colors mb-2 border-2 ${
                        !canSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : canSelect
                          ? 'hover:bg-gray-50 dark:hover:bg-slate-600 border-transparent'
                          : 'border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => canSelect && handleToggleGroup(groupKey)}
                        disabled={isEditMode || !canSelect}
                        className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action mt-1 mr-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minWidth: '16px', minHeight: '16px' }}
                      />
                      <div className="flex-1">
                        {(() => {
                          // Calculate date range for the group
                          const groupDates = groupSales
                            .map(s => s.createdAt ? new Date(s.createdAt) : null)
                            .filter((d): d is Date => d !== null);
                          const minDate = groupDates.length > 0 ? new Date(Math.min(...groupDates.map(d => d.getTime()))) : null;
                          const maxDate = groupDates.length > 0 ? new Date(Math.max(...groupDates.map(d => d.getTime()))) : null;
                          const dateRangeText = minDate && maxDate 
                            ? minDate.getTime() === maxDate.getTime()
                              ? formatSaleDate(minDate.toISOString())
                              : `${formatSaleDate(minDate.toISOString())} to ${formatSaleDate(maxDate.toISOString())}`
                            : '';
                          
                          // Calculate total for the group
                          const groupTotal = groupSales.reduce((sum, s) => sum + (s.grandTotalMMK || 0), 0);
                          const groupPaid = groupSales.reduce((sum, s) => {
                            const paid = s.amountPaid || 0;
                            return sum + paid;
                          }, 0);
                          
                          return (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                  {dateRangeText ? `Group Payment From ${dateRangeText}` : 'Payment Group'}
                          </span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
                                  {groupSaleIds.length} sales
                                </span>
                        </div>
                              <div className="text-xs text-text-secondary dark:text-slate-400 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Sales:</span>
                                  <span>{groupSales.map(s => s.id).join(', ')}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                  <div>
                                    <div className="text-xs text-text-tertiary dark:text-slate-500">Total</div>
                                    <div className="font-semibold text-text-primary dark:text-slate-200">{groupTotal.toLocaleString()} MMK</div>
                          </div>
                                  <div>
                                    <div className="text-xs text-text-tertiary dark:text-slate-500">Paid</div>
                                    <div className="font-semibold text-green-600 dark:text-green-400">{groupPaid.toLocaleString()} MMK</div>
                        </div>
                                  <div>
                                    <div className="text-xs text-text-tertiary dark:text-slate-500">Remaining</div>
                                    <div className="font-semibold text-orange-600 dark:text-orange-400">{groupRemaining.toLocaleString()} MMK</div>
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </label>
                  );
                })}
                
                {/* Display Individual Sales (excluding those already in groups with remaining balance) */}
                {availableSales.map(sale => {
                  // Check if this sale is part of an active group (with remaining balance)
                  const isInActiveGroup = Array.from(paymentGroups.entries()).some(([groupKey, groupSaleIds]) => {
                    if (!groupSaleIds.includes(sale.id)) return false;
                    const groupRemaining = groupRemainingAmounts.get(groupKey) || 0;
                    return groupRemaining > 0; // Only hide if group is active (has remaining)
                  });
                  
                  // Don't show individual sales that are in active groups (they're shown as groups)
                  if (isInActiveGroup) return null;
                  
                  const remaining = saleRemainingAmounts.get(sale.id) || 0;
                  const amountPaid = (sale.grandTotalMMK || 0) - remaining;
                  const saleDate = formatSaleDate(sale.createdAt);
                  const descriptionPreview = getSaleDescriptionPreview(sale);
                  return (
                    <label
                      key={sale.id}
                      className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                        linkIds.includes(sale.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-600 border-2 border-transparent'
                      } ${remaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={linkIds.includes(sale.id)}
                        onChange={() => handleToggleLinkId(sale.id)}
                        disabled={isEditMode || remaining <= 0}
                        className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary dark:text-slate-200">
                            Sale: {sale.id}
                          </span>
                          {remaining <= 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-semibold">(Paid)</span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary dark:text-slate-400 mt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{saleDate}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]" title={descriptionPreview}>{descriptionPreview}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-orange-600 dark:text-orange-400">Remaining: {remaining.toLocaleString()} MMK</span>
                          {amountPaid > 0 && (
                            <> • Paid: {amountPaid.toLocaleString()} MMK</>
                          )}
                            {' • '}
                            <span className="text-text-secondary dark:text-slate-500">Total: {sale.grandTotalMMK.toLocaleString()} MMK</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {isEditMode ? (
          <>
            <Input label="Amount (MMK)*" type="number" value={amountMMK} onChange={e => setAmountMMK(e.target.value)} required min="0.01" step="any" />
            <Input label="Payment Date*" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
            <Select label="Source Account*" value={method} onChange={e => setMethod(e.target.value)} options={paymentMethodOptions} required />
            {method !== 'Cash' && <Input label="Last 4 Digits of Txn ID" value={transactionLast4Digits} onChange={e => setTransactionLast4Digits(e.target.value)} maxLength={4} />}
            <Input label="Remark" value={remark} onChange={e => setRemark(e.target.value)} as="textarea" rows={2} />
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary dark:text-slate-200">Payment Entries</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addPaymentRow}>
                + Add another payment
              </Button>
            </div>
            <p className="text-xs text-text-secondary dark:text-slate-400">
              {paymentTarget === 'general'
                ? businessId
                  ? 'Each payment will auto-allocate to unpaid opening balance, then oldest sales for this business.'
                  : 'Each payment will apply opening balances first (linked order), then oldest approved sales across all linked businesses.'
                : paymentTarget === 'invoice'
                ? 'Total amount will be distributed across selected invoice(s).'
                : 'Total amount will be distributed across selected sale(s).'}
            </p>
            {paymentTarget === 'general' && !businessId && clientId && clientWidePreviewAmount > 0 && (
              <div className="p-3 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 text-sm">
                <div className="font-medium text-text-primary dark:text-slate-200 mb-2">
                  Client-wide allocation preview
                  {isClientWidePreviewLoading && <span className="ml-2 text-xs font-normal text-text-secondary">(loading…)</span>}
                </div>
                {clientWidePreview && !isClientWidePreviewLoading ? (
                  <div className="space-y-2 text-xs text-text-secondary dark:text-slate-400">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>Opening: <strong className="text-text-primary dark:text-slate-200">{clientWidePreview.totalOpeningApplied.toLocaleString()} MMK</strong></span>
                      <span>Sales: <strong className="text-text-primary dark:text-slate-200">{clientWidePreview.totalSalesApplied.toLocaleString()} MMK</strong></span>
                      {clientWidePreview.unallocatedCredit > 0 && (
                        <span>Prepayment credit: <strong className="text-green-600 dark:text-green-400">{clientWidePreview.unallocatedCredit.toLocaleString()} MMK</strong> (first linked business)</span>
                      )}
                    </div>
                    {clientWidePreview.businessAllocations.length > 0 && (
                      <div>
                        <span className="font-medium">By business:</span>
                        <ul className="mt-1 list-disc list-inside">
                          {clientWidePreview.businessAllocations.map(b => (
                            <li key={b.businessId}>
                              {businesses.find(x => x.id === b.businessId)?.name || b.businessId}: {b.amountMMK.toLocaleString()} MMK
                              {b.openingBalanceApplied > 0 ? ` (${b.openingBalanceApplied.toLocaleString()} opening)` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {clientWidePreview.allocations.length > 0 && (
                      <div>
                        <span className="font-medium">Sales ({clientWidePreview.allocations.length}):</span>
                        <span className="ml-1">oldest-first across {clientWidePreview.linkedBusinessIds.length} linked business(es)</span>
                      </div>
                    )}
                  </div>
                ) : !isClientWidePreviewLoading ? (
                  <p className="text-xs text-text-secondary">Could not preview allocation. Ensure client has verified linked businesses.</p>
                ) : null}
              </div>
            )}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {paymentRows.map((row, idx) => (
                <div key={row.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-medium text-text-secondary dark:text-slate-400 mt-2 flex-shrink-0">#{idx + 1}</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                      <Input label="Amount (MMK)*" type="number" value={row.amountMMK} onChange={e => updatePaymentRow(row.id, { amountMMK: e.target.value })} min="0.01" step="any" containerClassName="mb-0" />
                      <Input label="Date*" type="date" value={row.paymentDate} onChange={e => updatePaymentRow(row.id, { paymentDate: e.target.value })} containerClassName="mb-0" />
                      <Select label="Method*" value={row.method} onChange={e => updatePaymentRow(row.id, { method: e.target.value })} options={paymentMethodOptions} containerClassName="mb-0" />
                      {row.method && row.method !== 'Cash' && (
                        <Input label="Last 4 Digits" value={row.transactionLast4Digits} onChange={e => updatePaymentRow(row.id, { transactionLast4Digits: e.target.value })} maxLength={4} containerClassName="mb-0" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {paymentRows.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePaymentRow(row.id)} className="text-status-danger hover:bg-red-50 dark:hover:bg-red-900/20">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Input label="Remark" value={row.remark} onChange={e => updatePaymentRow(row.id, { remark: e.target.value })} containerClassName="mb-0" placeholder="Optional" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          {!isEditMode && (
            <>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => handleSave(false, 'full')}
                isLoading={isLoading}
              >
                Save and Record Another
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={isLoading}
              >
                Save and Exit
              </Button>
            </>
          )}
          {isEditMode && (
            <Button type="submit" variant="primary" isLoading={isLoading}>Approve Changes</Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default RecordPaymentModal;
