import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Client, Business, Service, SaleStatus, User, SaleRecord, CampaignObjectiveSetting, Permission, Invoice, Refund, CreditNote, CreditNoteStatus, RefundStatus, Payment, PaymentStatus } from '../../types';
import { 
    apiGetClients, apiGetBusinesses, apiGetServices, apiGetUsers, apiGetSalesForPeriod, apiGetSalesForCampaignUiDateRange,
    apiGetCampaignObjectiveSettings, apiGetPaymentMethodSettings, apiGetCashAccounts, apiGetInvoicesForPeriod,
    apiUpdateSaleRecord, apiDeleteSaleRecord, apiCreateInvoiceFromSale,
    apiGetRefundsForPeriod, apiGetCreditNotesForPeriod, apiGetCreditNotesForPeriodByCreatedAt, apiApproveCreditNote, apiDeleteCreditNote, apiGetPaymentsForPeriod,
    apiGetClientBusinessBalance
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { Link } from 'react-router-dom';
import { STATUS_COLORS, FACEBOOK_BOOSTING_SERVICE_ID, TIKTOK_BOOSTING_SERVICE_ID } from '../../constants';
import { getTodayInYangon, getDateInYangonTimezone, formatDateForExport } from '../../utils/dateUtils';
import { subscribeRefreshData } from '../../utils/refreshDataBus';
import {
    getReportDatesForSale,
    getReportDatesForCreditNote,
    getReportDatesForRefund,
    getCampaignStartDateFromSale,
    getSaleDateFromSale,
    getFacebookAdsUsdFromSale,
    getBoostingUsdFromSale,
    getCreditNoteUsd,
} from '../../utils/salesReportDates';
import * as XLSX from 'xlsx';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import RefreshButton from '../ui/RefreshButton';
import RecordPaymentModal from '../finance/modals/RecordPaymentModal';
import RecordCreditNoteModal from '../finance/modals/RecordCreditNoteModal';
import AddSaleModal from './modals/AddSaleModal';

type SalesServiceCategory = 'facebook' | 'tiktok' | 'other';

const classifySaleServiceCategory = (sale: SaleRecord): SalesServiceCategory => {
    if (sale.serviceId === FACEBOOK_BOOSTING_SERVICE_ID) return 'facebook';
    if (sale.serviceId === TIKTOK_BOOSTING_SERVICE_ID) return 'tiktok';
    if (sale.type === 'Facebook Ads') return 'facebook';
    return 'other';
};

const classifyCreditNoteServiceCategory = (creditNote: CreditNote, sales: SaleRecord[]): SalesServiceCategory => {
    if (creditNote.serviceId === FACEBOOK_BOOSTING_SERVICE_ID) return 'facebook';
    if (creditNote.serviceId === TIKTOK_BOOSTING_SERVICE_ID) return 'tiktok';
    if (creditNote.saleRecordId) {
        const linked = sales.find(s => s.id === creditNote.saleRecordId);
        if (linked) return classifySaleServiceCategory(linked);
    }
    return 'other';
};

/** Map sale status filter to credit note / refund equivalents for table filtering. */
const creditNoteMatchesStatusFilter = (creditNote: CreditNote, statusFilter: string): boolean => {
    if (!statusFilter) return true;
    if (statusFilter === SaleStatus.DRAFT) return creditNote.status === CreditNoteStatus.PENDING;
    if (statusFilter === SaleStatus.CHECKED) return creditNote.status === CreditNoteStatus.APPROVED;
    return creditNote.status === statusFilter;
};

const refundMatchesStatusFilter = (refund: Refund, statusFilter: string): boolean => {
    if (!statusFilter) return true;
    if (statusFilter === SaleStatus.DRAFT) return refund.status === RefundStatus.PENDING;
    if (statusFilter === SaleStatus.CHECKED) return refund.status === RefundStatus.PROCESSED;
    return refund.status === statusFilter;
};

const matchesRecordDateRange = (
    dateStr: string | undefined,
    recordStartDate: string,
    recordEndDate: string
): boolean => {
    if (!recordStartDate && !recordEndDate) return true;
    if (!dateStr) return false;
    const recordDate = new Date(dateStr);
    if (isNaN(recordDate.getTime())) return false;
    const recStr = getDateInYangonTimezone(recordDate);
    if (recordStartDate && recStr < recordStartDate) return false;
    if (recordEndDate && recStr > recordEndDate) return false;
    return true;
};

interface CategorySalesKpi {
    draftCount: number;
    draftTotalMMK: number;
    draftTotalUSD: number;
    approvedCount: number;
    netApprovedMMK: number;
    netApprovedUSD: number;
    approvedCreditNotesMMK: number;
}

const emptyCategoryKpi = (): CategorySalesKpi => ({
    draftCount: 0,
    draftTotalMMK: 0,
    draftTotalUSD: 0,
    approvedCount: 0,
    netApprovedMMK: 0,
    netApprovedUSD: 0,
    approvedCreditNotesMMK: 0,
});

const SalesEntryCategoryKpiCard: React.FC<{
    title: string;
    stats: CategorySalesKpi;
    accentBarClass: string;
    showUsd: boolean;
    categoryKey: SalesServiceCategory;
    activeStatusFilter: string;
    activeCategoryFilter: string;
    onSelectDraft: () => void;
    onSelectApproved: () => void;
    onClearFilter: () => void;
}> = ({
    title,
    stats,
    accentBarClass,
    showUsd,
    categoryKey,
    activeStatusFilter,
    activeCategoryFilter,
    onSelectDraft,
    onSelectApproved,
    onClearFilter,
}) => {
    const draftActive = activeStatusFilter === SaleStatus.DRAFT && activeCategoryFilter === categoryKey;
    const approvedActive = activeStatusFilter === SaleStatus.CHECKED && activeCategoryFilter === categoryKey;

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className={`h-1.5 ${accentBarClass}`} />
            <div className="p-4">
                <h3 className="text-sm font-bold text-text-primary dark:text-slate-100 mb-3 uppercase tracking-wide">{title}</h3>

                <button
                    type="button"
                    onClick={draftActive ? onClearFilter : onSelectDraft}
                    className={`w-full text-left rounded-lg p-3 mb-2 border transition-all ${
                        draftActive
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 ring-2 ring-gray-400/50'
                            : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Draft</span>
                    </div>
                    <p className="text-xl font-bold text-gray-800 dark:text-slate-200 tabular-nums">
                        {stats.draftTotalMMK.toLocaleString()} <span className="text-sm font-normal">MMK</span>
                    </p>
                    {showUsd && (
                        <p className="text-sm font-semibold text-gray-600 dark:text-slate-400 tabular-nums mt-0.5">
                            {stats.draftTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{stats.draftCount} sale{stats.draftCount !== 1 ? 's' : ''}</p>
                    {draftActive && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">Click to clear filter</p>}
                </button>

                <button
                    type="button"
                    onClick={approvedActive ? onClearFilter : onSelectApproved}
                    className={`w-full text-left rounded-lg p-3 border transition-all ${
                        approvedActive
                            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 ring-2 ring-blue-400/50'
                            : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Approved (Net)</span>
                    </div>
                    <p className="text-xl font-bold text-blue-800 dark:text-blue-200 tabular-nums">
                        {stats.netApprovedMMK.toLocaleString()} <span className="text-sm font-normal">MMK</span>
                    </p>
                    {showUsd && (
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 tabular-nums mt-0.5">
                            {stats.netApprovedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            {stats.approvedCreditNotesMMK > 0 && (
                                <span className="text-xs font-normal text-blue-600/80 dark:text-blue-400/80 ml-1">(after credits)</span>
                            )}
                        </p>
                    )}
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{stats.approvedCount} sale{stats.approvedCount !== 1 ? 's' : ''}</p>
                    {approvedActive && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">Click to clear filter</p>}
                </button>
            </div>
        </div>
    );
};

const SalesEntryPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
    
    // Data for modals
    const [clients, setClients] = useState<Client[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [campaignObjectives, setCampaignObjectives] = useState<CampaignObjectiveSetting[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [cashAccounts, setCashAccounts] = useState<any[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    
    // Payment Modal State
    const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
    const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<SaleRecord | null>(null);
    const [invoiceGeneratingSaleId, setInvoiceGeneratingSaleId] = useState<string | null>(null);
    
    // Refund Modal State
    const [isRecordCreditNoteModalOpen, setIsRecordCreditNoteModalOpen] = useState(false);
    const [editingCreditNote, setEditingCreditNote] = useState<CreditNote | null>(null);

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const getTodayStr = () => getTodayInYangon();
    const [recordStartDate, setRecordStartDate] = useState(() => getTodayInYangon());
    const [recordEndDate, setRecordEndDate] = useState(() => getTodayInYangon());
    const [campaignStartDate, setCampaignStartDate] = useState('');
    const [campaignEndDate, setCampaignEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [serviceFilter, setServiceFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<SalesServiceCategory | ''>('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'creditNote'>('all');
    
    // Refunds State
    const [refunds, setRefunds] = useState<Refund[]>([]);
    
    // Credit Notes State
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);

    // Selection State
    const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
    const [selectedCreditNoteIds, setSelectedCreditNoteIds] = useState<Set<string>>(new Set());
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    
    // Sort State (default: latest first)
    type SortKey = 'id' | 'status' | 'businessClient' | 'service' | 'balance' | 'total' | 'date';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc',
    });
    
    // Pagination state (Google-style page-by-page)
    const ITEMS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    // Client-business balance cache for table display
    const [clientBusinessBalanceMap, setClientBusinessBalanceMap] = useState<Record<string, number>>({});
    const balanceRequestInFlight = useRef<Set<string>>(new Set());

    const canEditThisSale = (sale: SaleRecord) => hasPermission(Permission.EDIT_ALL_SALE_RECORDS) || (hasPermission(Permission.EDIT_SALE_RECORD) && sale.inChargeUserId === user?.id);
    const canDeleteThisSale = (sale: SaleRecord) => hasPermission(Permission.DELETE_ALL_SALE_RECORDS) || (hasPermission(Permission.DELETE_SALE_RECORD) && sale.inChargeUserId === user?.id);
    const canDeleteCreditNote = () => hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE);
    const canChangeStatus = (sale: SaleRecord) => hasPermission(Permission.CHECK_SALE_RECORD);

    const getInitialSortDirection = (key: SortKey): 'asc' | 'desc' => {
        if (key === 'total' || key === 'balance' || key === 'date') return 'desc';
        return 'asc';
    };

    const toggleSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: getInitialSortDirection(key) };
        });
    };

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Use server-side date filter to reduce Firestore reads.
            // Record From/To: use record date (createdAt). Campaign From/To: use campaign/creditNote/refund dates.
            const useRecordFilter = !!(recordStartDate || recordEndDate);
            const useCampaignFilter = !!(campaignStartDate || campaignEndDate);
            const start = campaignStartDate || recordStartDate || getTodayStr();
            const end = campaignEndDate || recordEndDate || getTodayStr();
            // Sales API filters by createdAt. When Campaign filter: expand fetch window so we capture sales
            // whose campaign start is in range but createdAt is outside; client filters by campaign date.
            let salesStart = start;
            let salesEnd = end;
            if (useCampaignFilter && (campaignStartDate || campaignEndDate)) {
                const addDays = (s: string, n: number) => {
                    const d = new Date(s + 'T12:00:00');
                    d.setDate(d.getDate() + n);
                    return getDateInYangonTimezone(d);
                };
                const campStart = campaignStartDate || campaignEndDate;
                const campEnd = campaignEndDate || campaignStartDate;
                salesStart = addDays(campStart, -90);
                salesEnd = addDays(campEnd, 30);
            }

            const salesFetchLimit = useCampaignFilter ? 5000 : 2000;
            // Load critical data first (clients, businesses, sales) - these are needed immediately
            const [ fSalesByCreated, fClients, fBusinesses ] = await Promise.all([
                apiGetSalesForPeriod(salesStart, salesEnd, salesFetchLimit),
                apiGetClients(),
                apiGetBusinesses()
            ]);
            let fSales = fSalesByCreated;
            if (useCampaignFilter && (campaignStartDate || campaignEndDate)) {
                const cs = campaignStartDate || campaignEndDate;
                const ce = campaignEndDate || campaignStartDate;
                try {
                    const byCampaign = await apiGetSalesForCampaignUiDateRange(cs, ce);
                    const merged = new Map<string, SaleRecord>();
                    fSalesByCreated.forEach(s => merged.set(s.id, s));
                    byCampaign.forEach(s => merged.set(s.id, s));
                    fSales = Array.from(merged.values());
                } catch (e) {
                    console.error('apiGetSalesForCampaignUiDateRange failed (deploy sales composite indexes if missing):', e);
                    addNotification(
                        'Could not load sales by campaign date (indexes may still be building). Showing sales from the record window only.',
                        'warning'
                    );
                }
            }
            setSales(fSales);
            setClients(fClients);
            setBusinesses(fBusinesses);
            
            // Set loading to false so UI can render with critical data
            setIsLoading(false);
            
            // Load secondary data in background (period-filtered to reduce reads)
            // Credit notes: Record filter uses createdAt; Campaign filter uses creditNoteDate
            const creditNotesFetch = useRecordFilter
                ? apiGetCreditNotesForPeriodByCreatedAt(start, end)
                : apiGetCreditNotesForPeriod(start, end);
            Promise.all([
                apiGetServices(),
                apiGetUsers(),
                apiGetCampaignObjectiveSettings(),
                apiGetCashAccounts(),
                apiGetPaymentMethodSettings(),
                apiGetInvoicesForPeriod(start, end),
                apiGetRefundsForPeriod(start, end),
                creditNotesFetch,
                apiGetPaymentsForPeriod(start, end)
            ]).then(([fServices, fUsers, fCampObjs, fCashAccounts, fPayMethods, fInvoices, fRefunds, fCreditNotes, fPayments]) => {
                setAllServices(fServices);
                setAllUsers(fUsers);
                setCampaignObjectives(fCampObjs.filter(s => s.isActive));
                setRefunds(fRefunds);
                setCreditNotes(fCreditNotes);
                setAllPayments(fPayments);
                
                // Convert cash accounts to payment method format (for active accounts)
                const cashAccountMethods: any[] = fCashAccounts
                    .filter((acc: any) => acc.isActive)
                    .map((acc: any) => ({
                        id: acc.id,
                        name: acc.name,
                        accountNumber: acc.accountNumber || acc.phoneNumber || '',
                        isActive: acc.isActive,
                        showInPublic: acc.showInPublic,
                        logoUrl: acc.logoUrl,
                        qrCodeUrl: acc.qrCodeUrl,
                    }));
                
                // Combine cash accounts (prioritized) with legacy payment methods
                const allMethods = [...cashAccountMethods, ...fPayMethods.filter((s: any) => s.isActive)];
                setPaymentMethods(allMethods);
                setCashAccounts(fCashAccounts);
                setAllInvoices(fInvoices);
            }).catch(error => {
                console.error("Failed to load secondary data:", error);
                // Don't show error notification for secondary data to avoid noise
            });
        } catch (error) {
            console.error("Failed to load critical data for sales page:", error);
            addNotification("Failed to load sales data.", "error");
            setIsLoading(false);
        }
    }, [addNotification, recordStartDate, recordEndDate, campaignStartDate, campaignEndDate]);

    const handleStatusChange = async (sale: SaleRecord, newStatus: SaleStatus) => {
        if (!canChangeStatus(sale)) {
            addNotification("You don't have permission to change sale status.", "error");
            return;
        }

        try {
            await apiUpdateSaleRecord({
                id: sale.id,
                status: newStatus,
            });
            const statusMessage = newStatus === SaleStatus.CHECKED ? 'approved' : newStatus.toLowerCase();
            addNotification(`Sale ${sale.id} ${statusMessage}.`, "success");
            fetchData();
        } catch (error) {
            addNotification(`Failed to update status: ${(error as Error).message}`, "error");
        }
    };

    // Listen for global refresh events (debounced)
    useEffect(() => {
        return subscribeRefreshData(() => {
            fetchData();
        });
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getClientName = useCallback((clientId?: string) => {
        if (!clientId) return 'N/A';
        return clients.find(c => c.id === clientId)?.name || clientId;
    }, [clients]);

    const getBusinessName = useCallback((businessId?: string) => {
        if (!businessId) return 'N/A';
        return businesses.find(b => b.id === businessId)?.name || businessId;
    }, [businesses]);

    const getUserName = useCallback((userId?: string) => {
        if (!userId) return 'N/A';
        return allUsers.find(u => u.id === userId)?.name || userId;
    }, [allUsers]);

    const formatDate = (dateString?: string) => formatDateForExport(dateString);

    const saleById = useMemo(() => {
        const map = new Map<string, SaleRecord>();
        sales.forEach(s => { if (s.id) map.set(s.id, s); });
        return map;
    }, [sales]);

    const buildExportDateColumns = (dates: {
        createdDate?: string;
        campaignStartDate?: string;
        campaignEndDate?: string;
        creditNoteDate?: string;
    }) => ({
        'Created Date': formatDate(dates.createdDate),
        'Campaign Start Date': formatDate(dates.campaignStartDate),
        'Campaign End Date': formatDate(dates.campaignEndDate),
        'Credit Note Date': formatDate(dates.creditNoteDate),
    });

    const renderDateCells = (dates: {
        createdDate?: string;
        campaignStartDate?: string;
        campaignEndDate?: string;
        creditNoteDate?: string;
    }, className = 'text-text-secondary dark:text-slate-400') => (
        <>
            <td className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}>{formatDate(dates.createdDate) || '—'}</td>
            <td className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}>{formatDate(dates.campaignStartDate) || '—'}</td>
            <td className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}>{formatDate(dates.campaignEndDate) || '—'}</td>
            <td className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}>{formatDate(dates.creditNoteDate) || '—'}</td>
        </>
    );

    const getCreditNoteInCharge = useCallback((creditNote: CreditNote) => {
        if (creditNote.saleRecordId) {
            const linkedSale = sales.find(s => s.id === creditNote.saleRecordId);
            if (linkedSale?.inChargeUserId) {
                return getUserName(linkedSale.inChargeUserId);
            }
        }
        return getUserName(creditNote.recordedByUserId);
    }, [sales, getUserName]);

    const getCampaignStartDate = (sale: SaleRecord): string | undefined =>
        getSaleDateFromSale(sale);

    /** Same date shown in the Sales & Credits table sort (campaign start, else record date). */
    const getSaleRecordDate = (sale: SaleRecord): string | undefined =>
        getCampaignStartDate(sale) || sale.createdAt || sale.updatedAt;

    const invoiceMapBySaleId = useMemo(() => {
        const map = new Map<string, Invoice>();
        const invoiceById = new Map<string, Invoice>();
        allInvoices.forEach(inv => {
            invoiceById.set(inv.id, inv);
            if (inv.saleRecordId) {
                map.set(inv.saleRecordId, inv);
            }
        });
        sales.forEach(sale => {
            if (!sale.id || !sale.invoiceId) return;
            const invoice = invoiceById.get(sale.invoiceId);
            if (invoice) {
                map.set(sale.id, invoice);
            }
        });
        return map;
    }, [allInvoices, sales]);

    // Calculate paid amounts for each sale
    const salePaidAmounts = useMemo(() => {
        const computedPaid = new Map<string, number>();
        const storedPaid = new Map<string, number>();
        
        sales.forEach(sale => {
            if (!sale.id) return;
            storedPaid.set(sale.id, sale.amountPaid || 0);
            computedPaid.set(sale.id, 0);
        });
        
        // Apply approved allocations recorded on payments
        allPayments
            .filter(p =>
                p.status === PaymentStatus.APPROVED &&
                !p.refundId &&
                p.saleAllocations &&
                p.saleAllocations.length > 0
            )
            .forEach(payment => {
                payment.saleAllocations?.forEach(allocation => {
                    const currentPaid = computedPaid.get(allocation.saleRecordId) || 0;
                    computedPaid.set(allocation.saleRecordId, currentPaid + (allocation.amountMMK || 0));
                });
            });
        
        // General payments: backend allocates OPENING BALANCE FIRST, then remainder to OLDEST UNPAID SALES.
        // Empty saleAllocations = entire payment went to opening (0 for sales). Do NOT re-allocate to sales.

        // Add direct payments (payments linked to specific sales)
        allPayments
            .filter(p => 
                p.status === PaymentStatus.APPROVED && 
                !p.refundId &&
                p.saleRecordId && // Direct payments to sales
                (!p.saleAllocations || p.saleAllocations.length === 0)
            )
            .forEach(payment => {
                if (payment.saleRecordId) {
                    const currentPaid = computedPaid.get(payment.saleRecordId) || 0;
                    computedPaid.set(payment.saleRecordId, currentPaid + payment.amountMMK);
                }
            });
        
        const finalPaid = new Map<string, number>();
        storedPaid.forEach((paid, saleId) => {
            const computed = computedPaid.get(saleId) || 0;
            finalPaid.set(saleId, Math.max(paid, computed));
        });
        
        return finalPaid;
    }, [sales, allPayments, allInvoices]);

    /** Date / service / search scope for KPI cards — excludes status, category, and type filters. */
    const salesForKpiBase = useMemo(() => {
        return sales.filter(sale => {
            if (!sale) return false;

            if (!matchesRecordDateRange(sale.createdAt || sale.updatedAt, recordStartDate, recordEndDate)) {
                return false;
            }

            if (campaignStartDate || campaignEndDate) {
                const campaignDateStr = getCampaignStartDate(sale) || sale.createdAt || sale.updatedAt || '';
                if (!campaignDateStr) return false;
                const campaignDate = new Date(campaignDateStr);
                if (isNaN(campaignDate.getTime())) return false;
                const campStr = getDateInYangonTimezone(campaignDate);
                if (campaignStartDate && campStr < campaignStartDate) return false;
                if (campaignEndDate && campStr > campaignEndDate) return false;
            }

            if (serviceFilter && sale.serviceId !== serviceFilter) {
                return false;
            }

            const term = searchTerm.toLowerCase();
            if (term) {
                const searchMatch =
                    (sale.id || '').toLowerCase().includes(term) ||
                    (sale.clientId || '').toLowerCase().includes(term) ||
                    (sale.businessId || '').toLowerCase().includes(term) ||
                    (getBusinessName(sale.businessId) || '').toLowerCase().includes(term) ||
                    (getClientName(sale.clientId) || '').toLowerCase().includes(term) ||
                    (sale.type || '').toLowerCase().includes(term);
                if (!searchMatch) return false;
            }

            return true;
        });
    }, [sales, recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, searchTerm, serviceFilter, getClientName, getBusinessName]);

    const creditNotesForKpiBase = useMemo(() => {
        return creditNotes.filter(creditNote => {
            if (!creditNote) return false;

            const recordDateStr = (creditNote as CreditNote & { createdAt?: string }).createdAt || creditNote.creditNoteDate || '';
            if (!matchesRecordDateRange(recordDateStr, recordStartDate, recordEndDate)) {
                return false;
            }

            if (campaignStartDate || campaignEndDate) {
                if (!creditNote.creditNoteDate) return false;
                const cnDate = new Date(creditNote.creditNoteDate);
                if (isNaN(cnDate.getTime())) return false;
                const cnStr = getDateInYangonTimezone(cnDate);
                if (campaignStartDate && cnStr < campaignStartDate) return false;
                if (campaignEndDate && cnStr > campaignEndDate) return false;
            }

            if (serviceFilter && creditNote.serviceId !== serviceFilter) {
                return false;
            }

            const term = searchTerm.toLowerCase();
            if (term) {
                const searchMatch =
                    (creditNote.id || '').toLowerCase().includes(term) ||
                    (creditNote.clientId || '').toLowerCase().includes(term) ||
                    (creditNote.businessId || '').toLowerCase().includes(term) ||
                    (getBusinessName(creditNote.businessId) || '').toLowerCase().includes(term) ||
                    (getClientName(creditNote.clientId) || '').toLowerCase().includes(term) ||
                    (creditNote.saleRecordId || '').toLowerCase().includes(term);
                if (!searchMatch) return false;
            }

            return true;
        });
    }, [creditNotes, recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, searchTerm, serviceFilter, getClientName, getBusinessName]);

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            if (!sale) return false;

            // Record date filter (default: today)
            if (!matchesRecordDateRange(sale.createdAt || sale.updatedAt, recordStartDate, recordEndDate)) {
                return false;
            }

            // Campaign start date filter (optional - only when set)
            // Use campaign start date for FB Ads; fallback to createdAt for Other Services (no campaign date)
            if (campaignStartDate || campaignEndDate) {
                const campaignDateStr = getCampaignStartDate(sale) || sale.createdAt || sale.updatedAt || '';
                if (!campaignDateStr) return false;
                const campaignDate = new Date(campaignDateStr);
                if (isNaN(campaignDate.getTime())) return false;
                const campStr = getDateInYangonTimezone(campaignDate);
                if (campaignStartDate && campStr < campaignStartDate) return false;
                if (campaignEndDate && campStr > campaignEndDate) return false;
            }

            // Status filter
            if (statusFilter && sale.status !== statusFilter) {
                return false;
            }

            // Service filter
            if (serviceFilter && sale.serviceId !== serviceFilter) {
                return false;
            }

            // Category filter (from KPI cards)
            if (categoryFilter && classifySaleServiceCategory(sale) !== categoryFilter) {
                return false;
            }

            // Type filter - only show sales
            if (typeFilter === 'creditNote') {
                return false;
            }

            const term = searchTerm.toLowerCase();
            const searchMatch = !term ||
                (sale.id || '').toLowerCase().includes(term) ||
                (sale.clientId || '').toLowerCase().includes(term) ||
                (sale.businessId || '').toLowerCase().includes(term) ||
                (getBusinessName(sale.businessId) || '').toLowerCase().includes(term) ||
                (getClientName(sale.clientId) || '').toLowerCase().includes(term) ||
                (sale.type || '').toLowerCase().includes(term);

            return searchMatch;
        });
    }, [sales, recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, searchTerm, statusFilter, serviceFilter, categoryFilter, typeFilter, getClientName, getBusinessName]);

    const filteredRefunds = useMemo(() => {
        return refunds.filter(refund => {
            if (!refund) return false;
            // Record date filter (Record From/To): use createdAt (when record was created)
            const recordDateStr = (refund as Refund & { createdAt?: string }).createdAt || refund.refundDate || '';
            if (!matchesRecordDateRange(recordDateStr, recordStartDate, recordEndDate)) {
                return false;
            }
            // Campaign filter: when Campaign From/To are set, filter by refundDate
            if (campaignStartDate || campaignEndDate) {
                if (!refund.refundDate) return false;
                const rd = new Date(refund.refundDate);
                if (isNaN(rd.getTime())) return false;
                const recStr = getDateInYangonTimezone(rd);
                if (campaignStartDate && recStr < campaignStartDate) return false;
                if (campaignEndDate && recStr > campaignEndDate) return false;
            }

            // Status filter
            if (statusFilter && !refundMatchesStatusFilter(refund, statusFilter)) {
                return false;
            }

            // Service filter
            if (serviceFilter && refund.serviceId !== serviceFilter) {
                return false;
            }

            if (categoryFilter) {
                const cat = refund.serviceId === FACEBOOK_BOOSTING_SERVICE_ID ? 'facebook'
                    : refund.serviceId === TIKTOK_BOOSTING_SERVICE_ID ? 'tiktok'
                    : 'other';
                if (cat !== categoryFilter) return false;
            }

            // Type filter - refunds only shown when 'all' is selected
            if (typeFilter === 'sale' || typeFilter === 'creditNote') {
                return false;
            }

            const term = searchTerm.toLowerCase();
            const searchMatch = !term ||
                (refund.id || '').toLowerCase().includes(term) ||
                (refund.clientId || '').toLowerCase().includes(term) ||
                (refund.businessId || '').toLowerCase().includes(term) ||
                (getBusinessName(refund.businessId) || '').toLowerCase().includes(term) ||
                (getClientName(refund.clientId) || '').toLowerCase().includes(term);

            return searchMatch;
        });
    }, [refunds, recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, searchTerm, statusFilter, serviceFilter, categoryFilter, typeFilter, getClientName, getBusinessName]);

    const filteredCreditNotes = useMemo(() => {
        return creditNotes.filter(creditNote => {
            if (!creditNote) return false;
            // Record date filter (Record From/To): use createdAt (when record was created, same as sales)
            const recordDateStr = (creditNote as CreditNote & { createdAt?: string }).createdAt || creditNote.creditNoteDate || '';
            if (!matchesRecordDateRange(recordDateStr, recordStartDate, recordEndDate)) {
                return false;
            }
            // Campaign filter: when Campaign From/To are set, filter by Credit Note Date (not createdAt)
            if (campaignStartDate || campaignEndDate) {
                if (!creditNote.creditNoteDate) return false;
                const cnDate = new Date(creditNote.creditNoteDate);
                if (isNaN(cnDate.getTime())) return false;
                const cnStr = getDateInYangonTimezone(cnDate);
                if (campaignStartDate && cnStr < campaignStartDate) return false;
                if (campaignEndDate && cnStr > campaignEndDate) return false;
            }

            // Status filter
            if (statusFilter && !creditNoteMatchesStatusFilter(creditNote, statusFilter)) {
                return false;
            }

            // Service filter
            if (serviceFilter && creditNote.serviceId !== serviceFilter) {
                return false;
            }

            if (categoryFilter && classifyCreditNoteServiceCategory(creditNote, sales) !== categoryFilter) {
                return false;
            }

            // Type filter - only show credit notes
            if (typeFilter === 'sale' || typeFilter === 'refund') {
                return false;
            }

            const term = searchTerm.toLowerCase();
            const searchMatch = !term ||
                (creditNote.id || '').toLowerCase().includes(term) ||
                (creditNote.clientId || '').toLowerCase().includes(term) ||
                (creditNote.businessId || '').toLowerCase().includes(term) ||
                (getBusinessName(creditNote.businessId) || '').toLowerCase().includes(term) ||
                (getClientName(creditNote.clientId) || '').toLowerCase().includes(term) ||
                (creditNote.saleRecordId || '').toLowerCase().includes(term);

            return searchMatch;
        });
    }, [creditNotes, sales, recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, searchTerm, statusFilter, serviceFilter, categoryFilter, typeFilter, getClientName, getBusinessName]);

    const combinedEntries = useMemo(() => {
        const allEntries: Array<{ type: 'sale' | 'refund' | 'creditNote'; data: SaleRecord | Refund | CreditNote; date: Date }> = [];
        
        filteredSales.forEach(sale => {
            const dateStr = getCampaignStartDate(sale) || sale.createdAt || sale.updatedAt || '0';
            allEntries.push({
                type: 'sale',
                data: sale,
                date: new Date(dateStr)
            });
        });
        
        filteredRefunds.forEach(refund => {
            allEntries.push({
                type: 'refund',
                data: refund,
                date: new Date((refund as any).createdAt || refund.refundDate || 0)
            });
        });
        
        filteredCreditNotes.forEach(creditNote => {
            allEntries.push({
                type: 'creditNote',
                data: creditNote,
                date: new Date(creditNote.creditNoteDate || (creditNote as any).createdAt || 0)
            });
        });
        
        const getStatusValue = (entry: typeof allEntries[number]) => {
            if (entry.type === 'sale') return (entry.data as SaleRecord).status || '';
            if (entry.type === 'refund') return (entry.data as Refund).status || '';
            return (entry.data as CreditNote).status || '';
        };

        const getServiceName = (entry: typeof allEntries[number]) => {
            const data = entry.data as any;
            if (data?.serviceId) {
                return allServices.find(s => s.id === data.serviceId)?.name || 'Unknown';
            }
            if (entry.type === 'refund') return 'Refund';
            if (entry.type === 'creditNote') return 'Credit Note';
            return data?.type || 'Unknown';
        };

        const getBusinessClientName = (entry: typeof allEntries[number]) => {
            const data = entry.data as any;
            const businessName = getBusinessName(data?.businessId) || '';
            const clientName = getClientName(data?.clientId) || '';
            return `${businessName} ${clientName}`.trim();
        };

        const getBalanceValue = (entry: typeof allEntries[number]) => {
            const data = entry.data as any;
            if (!data?.clientId || !data?.businessId) return 0;
            const key = `${data.clientId}_${data.businessId}`;
            return clientBusinessBalanceMap[key] ?? 0;
        };

        const getTotalValue = (entry: typeof allEntries[number]) => {
            if (entry.type === 'sale') {
                return (entry.data as SaleRecord).grandTotalMMK || 0;
            }
            if (entry.type === 'refund') {
                return -(entry.data as Refund).amountMMK || 0;
            }
            return -(entry.data as CreditNote).amountMMK || 0;
        };

        const getSortValue = (entry: typeof allEntries[number]) => {
            switch (sortConfig.key) {
                case 'id':
                    return (entry.data as any).id || '';
                case 'status':
                    return getStatusValue(entry);
                case 'businessClient':
                    return getBusinessClientName(entry);
                case 'service':
                    return getServiceName(entry);
                case 'balance':
                    return getBalanceValue(entry);
                case 'total':
                    return getTotalValue(entry);
                case 'date':
                default:
                    return entry.date.getTime();
            }
        };

        const compareValues = (aValue: any, bValue: any) => {
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return aValue - bValue;
            }
            return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
        };

        allEntries.sort((a, b) => {
            const aValue = getSortValue(a);
            const bValue = getSortValue(b);
            const result = compareValues(aValue, bValue);
            return sortConfig.direction === 'asc' ? result : -result;
        });
        
        return allEntries;
    }, [filteredSales, filteredRefunds, filteredCreditNotes, sortConfig, allServices, clientBusinessBalanceMap, getBusinessName, getClientName]);

    const totalPages = Math.max(1, Math.ceil(combinedEntries.length / ITEMS_PER_PAGE));
    const visibleEntries = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return combinedEntries.slice(start, start + ITEMS_PER_PAGE);
    }, [combinedEntries, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, statusFilter, serviceFilter, categoryFilter, typeFilter, searchTerm, sortConfig]);

    useEffect(() => {
        setCurrentPage(p => Math.min(p, Math.max(1, totalPages)));
    }, [totalPages]);

    // Clear balance cache when sales, refunds, or credit notes change so Total Current Balance refetches and shows updated balance after every transaction
    useEffect(() => {
        setClientBusinessBalanceMap({});
    }, [sales, refunds, creditNotes]);

    useEffect(() => {
        const keysToFetch = new Set<string>();
        visibleEntries.forEach(entry => {
            const data = entry.data as any;
            if (data?.clientId && data?.businessId) {
                const key = `${data.clientId}_${data.businessId}`;
                if (!(key in clientBusinessBalanceMap) && !balanceRequestInFlight.current.has(key)) {
                    keysToFetch.add(key);
                }
            }
        });

        if (keysToFetch.size === 0) return;

        const fetchBalances = async () => {
            const results = await Promise.all(Array.from(keysToFetch).map(async (key) => {
                const [clientId, businessId] = key.split('_');
                try {
                    const balanceData = await apiGetClientBusinessBalance(clientId, businessId);
                    const openingBalance = balanceData?.openingBalance || 0;
                    const totalBalance = openingBalance + (balanceData?.balance || 0);
                    return { key, totalBalance };
                } catch (error) {
                    console.error(`Failed to fetch balance for ${key}:`, error);
                    return { key, totalBalance: 0 };
                }
            }));

            setClientBusinessBalanceMap(prev => {
                const next = { ...prev };
                results.forEach(({ key, totalBalance }) => {
                    next[key] = totalBalance;
                    balanceRequestInFlight.current.delete(key);
                });
                return next;
            });
        };

        keysToFetch.forEach(key => balanceRequestInFlight.current.add(key));
        void fetchBalances();
    }, [visibleEntries, clientBusinessBalanceMap]);

    const serviceById = useMemo(() => new Map(allServices.map(s => [s.id, s])), [allServices]);

    const salesCategoryKpis = useMemo(() => {
        const stats: Record<SalesServiceCategory, CategorySalesKpi> = {
            facebook: emptyCategoryKpi(),
            tiktok: emptyCategoryKpi(),
            other: emptyCategoryKpi(),
        };

        salesForKpiBase.forEach(sale => {
            const cat = classifySaleServiceCategory(sale);
            const service = sale.serviceId ? serviceById.get(sale.serviceId) : undefined;
            const usd = getBoostingUsdFromSale(sale, service);
            const mmk = sale.grandTotalMMK || 0;

            if (sale.status === SaleStatus.DRAFT) {
                stats[cat].draftCount += 1;
                stats[cat].draftTotalMMK += mmk;
                stats[cat].draftTotalUSD += usd;
            } else if (sale.status === SaleStatus.CHECKED) {
                stats[cat].approvedCount += 1;
                stats[cat].netApprovedMMK += mmk;
                stats[cat].netApprovedUSD += usd;
            }
        });

        creditNotesForKpiBase
            .filter(cn => cn.status === CreditNoteStatus.APPROVED)
            .forEach(cn => {
                const cat = classifyCreditNoteServiceCategory(cn, sales);
                const linked = cn.saleRecordId ? saleById.get(cn.saleRecordId) : undefined;
                const linkedService = linked?.serviceId ? serviceById.get(linked.serviceId) : undefined;
                stats[cat].approvedCreditNotesMMK += cn.amountMMK || 0;
                stats[cat].netApprovedMMK -= cn.amountMMK || 0;
                stats[cat].netApprovedUSD -= getCreditNoteUsd(cn, linked, linkedService);
            });

        return stats;
    }, [salesForKpiBase, creditNotesForKpiBase, sales, saleById, serviceById]);
    
    const handleDownloadExcel = () => {
        if (filteredSales.length === 0 && filteredRefunds.length === 0 && filteredCreditNotes.length === 0) {
            addNotification("No data to download for the selected period.", "info");
            return;
        }
        const dataToExport: Record<string, string | number>[] = [];
        
        // Add sales
        filteredSales.forEach(sale => {
            dataToExport.push({
                'Type': 'Sale',
                'ID': sale.id,
                'Status': sale.status,
                'Business': getBusinessName(sale.businessId),
                'Client': getClientName(sale.clientId),
                'Service Name': sale.serviceId ? (allServices.find(s => s.id === sale.serviceId)?.name || 'Unknown') : (sale.type || 'Unknown'),
                'Total (MMK)': sale.grandTotalMMK,
                'In-Charge': getUserName(sale.inChargeUserId),
                ...buildExportDateColumns(getReportDatesForSale(sale)),
            });
        });
        
        // Add refunds
        filteredRefunds.forEach(refund => {
            dataToExport.push({
                'Type': 'Refund',
                'ID': refund.id,
                'Status': refund.status,
                'Business': getBusinessName(refund.businessId),
                'Client': getClientName(refund.clientId),
                'Service Name': refund.serviceId ? (allServices.find(s => s.id === refund.serviceId)?.name || 'Unknown') : 'Refund',
                'Total (MMK)': -refund.amountMMK,
                'In-Charge': '-',
                ...buildExportDateColumns(getReportDatesForRefund(refund)),
            });
        });
        
        // Add credit notes
        filteredCreditNotes.forEach(creditNote => {
            const linkedSale = creditNote.saleRecordId ? saleById.get(creditNote.saleRecordId) : undefined;
            dataToExport.push({
                'Type': 'Credit Note',
                'ID': creditNote.id,
                'Status': creditNote.status,
                'Business': getBusinessName(creditNote.businessId),
                'Client': getClientName(creditNote.clientId),
                'Service Name': creditNote.serviceId ? (allServices.find(s => s.id === creditNote.serviceId)?.name || 'Unknown') : 'Credit Note',
                'Total (MMK)': -creditNote.amountMMK,
                'In-Charge': getCreditNoteInCharge(creditNote),
                ...buildExportDateColumns(getReportDatesForCreditNote(creditNote, linkedSale)),
            });
        });
        
        const dateSuffix = (recordStartDate || recordEndDate) ? `_${recordStartDate || ''}_to_${recordEndDate || ''}` : (campaignStartDate && campaignEndDate ? `_camp_${campaignStartDate}_to_${campaignEndDate}` : '');
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales & Credits');
        XLSX.writeFile(wb, `sales_and_credits${dateSuffix}.xlsx`);
    };

    const handleGenerateInvoice = async (sale: SaleRecord) => {
        if (!sale?.id) return;
        setInvoiceGeneratingSaleId(sale.id);
        try {
            const invoice = await apiCreateInvoiceFromSale(sale.id);
            addNotification(`Invoice ${invoice.id} created from sale ${sale.id}.`, 'success');
            fetchData();
        } catch (error) {
            addNotification(`Failed to create invoice: ${(error as Error).message}`, 'error');
        } finally {
            setInvoiceGeneratingSaleId(null);
        }
    };

    const handleModalSuccess = (newSale?: SaleRecord, shouldRecordPayment?: boolean) => {
        setIsAddModalOpen(false);
        setEditingSale(null);
        fetchData(); // This will refresh the list of sales in the background
    
        if (shouldRecordPayment && newSale) {
            setSelectedSaleForPayment(newSale);
            setIsRecordPaymentModalOpen(true);
        }
    };

    const handlePaymentSuccess = () => {
        fetchData();
        setIsRecordPaymentModalOpen(false);
    };
    
    const handleEditSale = (sale: SaleRecord) => {
        setEditingSale(sale);
        setIsAddModalOpen(true);
    };

    const handleDeleteSale = async (sale: SaleRecord) => {
        const confirmed = await showConfirmation({
          title: 'Delete Sale Record',
          message: `Are you sure you want to delete sale record ${sale.id}? This will also adjust client/business balances.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteSaleRecord(sale.id);
                addNotification(`Sale ${sale.id} deleted successfully.`, "success");
                setSelectedSaleIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(sale.id);
                    return newSet;
                });
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete sale: ${(error as Error).message}`, "error");
            }
        }
    };

    // Selection handlers
    const handleSelectSale = (saleId: string, checked: boolean) => {
        setSelectedSaleIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(saleId);
            } else {
                newSet.delete(saleId);
            }
            return newSet;
        });
    };

    const handleSelectCreditNote = (creditNoteId: string, checked: boolean) => {
        setSelectedCreditNoteIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(creditNoteId);
            } else {
                newSet.delete(creditNoteId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const selectableSaleIds = filteredSales
                .filter(sale => (sale.status === SaleStatus.DRAFT && canChangeStatus(sale)) || canDeleteThisSale(sale))
                .map(s => s.id);
            const selectableCreditNoteIds = filteredCreditNotes
                .filter(cn =>
                    cn.status === CreditNoteStatus.PENDING ||
                    (canDeleteCreditNote() && (cn.status === CreditNoteStatus.PENDING || cn.status === CreditNoteStatus.APPROVED))
                )
                .map(cn => cn.id);
            setSelectedSaleIds(new Set(selectableSaleIds));
            setSelectedCreditNoteIds(new Set(selectableCreditNoteIds));
        } else {
            setSelectedSaleIds(new Set());
            setSelectedCreditNoteIds(new Set());
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setTypeFilter('all');
        setServiceFilter('');
        setCategoryFilter('');
        setStatusFilter('');
        setRecordStartDate(getTodayStr());
        setRecordEndDate(getTodayStr());
        setCampaignStartDate('');
        setCampaignEndDate('');
    };

    const handleSelectToday = () => {
        const today = getTodayStr();
        setRecordStartDate(today);
        setRecordEndDate(today);
        setCampaignStartDate('');
        setCampaignEndDate('');
        const todaySales = sales.filter(sale => {
            const saleDate = sale.createdAt ? getDateInYangonTimezone(new Date(sale.createdAt)) : '';
            return saleDate === today;
        });
        setSelectedSaleIds(new Set(todaySales.map(s => s.id)));
    };

    const isAllSelected = (() => {
        const selectableSaleIds = filteredSales
            .filter(sale => (sale.status === SaleStatus.DRAFT && canChangeStatus(sale)) || canDeleteThisSale(sale))
            .map(s => s.id);
        const selectableCreditNoteIds = filteredCreditNotes
            .filter(cn =>
                cn.status === CreditNoteStatus.PENDING ||
                (canDeleteCreditNote() && (cn.status === CreditNoteStatus.PENDING || cn.status === CreditNoteStatus.APPROVED))
            )
            .map(cn => cn.id);
        const totalSelectable = selectableSaleIds.length + selectableCreditNoteIds.length;
        if (totalSelectable === 0) return false;
        return selectableSaleIds.every(id => selectedSaleIds.has(id)) &&
            selectableCreditNoteIds.every(id => selectedCreditNoteIds.has(id));
    })();
    const isSomeSelected = filteredSales.some(sale => selectedSaleIds.has(sale.id)) || 
        filteredCreditNotes.some(cn => selectedCreditNoteIds.has(cn.id));

    // Count all approvable items in the current filter (not just selected)
    const filteredApprovableDraftSalesCount = filteredSales.filter(s => s.status === SaleStatus.DRAFT).length;
    const filteredApprovablePendingCreditNotesCount = filteredCreditNotes.filter(cn => cn.status === CreditNoteStatus.PENDING).length;
    const filteredApprovableTotalCount = filteredApprovableDraftSalesCount + filteredApprovablePendingCreditNotesCount;

    // Count actionable items for bulk actions (selected only)
    const draftSalesCount = filteredSales.filter(s => selectedSaleIds.has(s.id) && s.status === SaleStatus.DRAFT).length;
    const pendingCreditNotesCount = filteredCreditNotes.filter(cn => selectedCreditNoteIds.has(cn.id) && cn.status === CreditNoteStatus.PENDING).length;
    const deletableSalesCount = filteredSales.filter(s => selectedSaleIds.has(s.id) && canDeleteThisSale(s)).length;
    const deletableCreditNotesCount = filteredCreditNotes.filter(cn =>
        selectedCreditNoteIds.has(cn.id) && canDeleteCreditNote() &&
        (cn.status === CreditNoteStatus.PENDING || cn.status === CreditNoteStatus.APPROVED)
    ).length;

    // Bulk actions
    const handleApproveAllDraftsAndPending = async () => {
        const draftSales = filteredSales.filter(s => s.status === SaleStatus.DRAFT);
        const pendingCreditNotes = filteredCreditNotes.filter(cn => cn.status === CreditNoteStatus.PENDING);

        if (draftSales.length === 0 && pendingCreditNotes.length === 0) {
            addNotification("No draft sales or pending credit notes in the current filter.", "info");
            return;
        }

        if (draftSales.length > 0 && !canChangeStatus({} as SaleRecord)) {
            addNotification("You don't have permission to approve sales.", "error");
            return;
        }

        if (pendingCreditNotes.length > 0 && !user) {
            addNotification("User information is required.", "error");
            return;
        }

        let message = '';
        if (draftSales.length > 0 && pendingCreditNotes.length > 0) {
            message = `Approve all ${draftSales.length} draft sale(s) and ${pendingCreditNotes.length} pending credit note(s) in the current filter?`;
        } else if (draftSales.length > 0) {
            message = `Approve all ${draftSales.length} draft sale(s) in the current filter?`;
        } else {
            message = `Approve all ${pendingCreditNotes.length} pending credit note(s) in the current filter?`;
        }

        const confirmed = await showConfirmation({
            title: 'Approve All Drafts',
            message,
            confirmText: 'Approve All',
            cancelText: 'Cancel',
            confirmVariant: 'primary',
        });

        if (!confirmed) return;

        setIsBulkActionLoading(true);
        try {
            const promises: Promise<unknown>[] = [];
            if (draftSales.length > 0 && canChangeStatus({} as SaleRecord)) {
                promises.push(...draftSales.map(sale =>
                    apiUpdateSaleRecord({ id: sale.id, status: SaleStatus.CHECKED })
                ));
            }
            if (pendingCreditNotes.length > 0 && user) {
                promises.push(...pendingCreditNotes.map(cn => apiApproveCreditNote(cn.id, user.id)));
            }
            await Promise.all(promises);

            const totalApproved = (draftSales.length > 0 && canChangeStatus({} as SaleRecord) ? draftSales.length : 0) +
                (pendingCreditNotes.length > 0 && user ? pendingCreditNotes.length : 0);
            addNotification(`${totalApproved} record(s) approved successfully.`, "success");
            setSelectedSaleIds(new Set());
            setSelectedCreditNoteIds(new Set());
            fetchData();
        } catch (error) {
            addNotification(`Failed to approve: ${(error as Error).message}`, "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkApproveSelected = async () => {
        const selectedDraftSales = filteredSales.filter(s => selectedSaleIds.has(s.id) && s.status === SaleStatus.DRAFT);
        const selectedPendingCreditNotes = filteredCreditNotes.filter(cn =>
            selectedCreditNoteIds.has(cn.id) && cn.status === CreditNoteStatus.PENDING
        );

        if (selectedDraftSales.length === 0 && selectedPendingCreditNotes.length === 0) {
            addNotification("No draft sales or pending credit notes selected.", "error");
            return;
        }

        if (selectedDraftSales.length > 0 && !canChangeStatus({} as SaleRecord)) {
            addNotification("You don't have permission to approve sales.", "error");
            return;
        }

        if (selectedPendingCreditNotes.length > 0 && !user) {
            addNotification("User information is required.", "error");
            return;
        }

        let message = '';
        if (selectedDraftSales.length > 0 && selectedPendingCreditNotes.length > 0) {
            message = `Are you sure you want to approve ${selectedDraftSales.length} sale(s) and ${selectedPendingCreditNotes.length} credit note(s)?`;
        } else if (selectedDraftSales.length > 0) {
            message = `Are you sure you want to approve ${selectedDraftSales.length} sale(s)?`;
        } else {
            message = `Are you sure you want to approve ${selectedPendingCreditNotes.length} credit note(s)?`;
        }

        const confirmed = await showConfirmation({
            title: 'Approve Selected',
            message,
            confirmText: 'Approve',
            cancelText: 'Cancel',
            confirmVariant: 'primary',
        });

        if (!confirmed) return;

        setIsBulkActionLoading(true);
        try {
            const promises: Promise<unknown>[] = [];
            if (selectedDraftSales.length > 0 && canChangeStatus({} as SaleRecord)) {
                promises.push(...selectedDraftSales.map(sale =>
                    apiUpdateSaleRecord({ id: sale.id, status: SaleStatus.CHECKED })
                ));
            }
            if (selectedPendingCreditNotes.length > 0 && user) {
                promises.push(...selectedPendingCreditNotes.map(cn => apiApproveCreditNote(cn.id, user.id)));
            }
            await Promise.all(promises);
            addNotification(`${selectedDraftSales.length + selectedPendingCreditNotes.length} record(s) approved successfully.`, "success");
            setSelectedSaleIds(new Set());
            setSelectedCreditNoteIds(new Set());
            fetchData();
        } catch (error) {
            addNotification(`Failed to approve: ${(error as Error).message}`, "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkMarkAsChecked = async () => {
        if (selectedSaleIds.size === 0) {
            addNotification("Please select at least one sale to update.", "error");
            return;
        }

        if (!canChangeStatus({} as SaleRecord)) {
            addNotification("You don't have permission to change sale status.", "error");
            return;
        }

        const selectedSales = filteredSales.filter(s => selectedSaleIds.has(s.id) && s.status === SaleStatus.DRAFT);
        if (selectedSales.length === 0) {
            addNotification("No draft sales selected. Only draft sales can be approved.", "error");
            return;
        }

        const confirmed = await showConfirmation({
            title: 'Approve Sales',
            message: `Are you sure you want to approve ${selectedSales.length} sale(s)?`,
            confirmText: 'Approve',
            cancelText: 'Cancel',
            confirmVariant: 'primary',
        });

        if (!confirmed) return;

        setIsBulkActionLoading(true);
        try {
            const updatePromises = selectedSales.map(sale => 
                apiUpdateSaleRecord({
                    id: sale.id,
                    status: SaleStatus.CHECKED,
                })
            );
            await Promise.all(updatePromises);
            addNotification(`${selectedSales.length} sale(s) approved successfully.`, "success");
            setSelectedSaleIds(new Set());
            fetchData();
        } catch (error) {
            addNotification(`Failed to update sales: ${(error as Error).message}`, "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSaleIds.size === 0) {
            addNotification("Please select at least one sale to delete.", "error");
            return;
        }

        const selectedSales = filteredSales.filter(s => selectedSaleIds.has(s.id));
        const canDeleteCount = selectedSales.filter(s => canDeleteThisSale(s)).length;

        if (canDeleteCount === 0) {
            addNotification("You don't have permission to delete the selected sales.", "error");
            return;
        }

        const confirmed = await showConfirmation({
            title: 'Delete Sales',
            message: `Are you sure you want to delete ${canDeleteCount} selected sale(s)? This will also adjust client/business balances.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmVariant: 'danger',
        });

        if (!confirmed) return;

        setIsBulkActionLoading(true);
        try {
            const deletePromises = selectedSales
                .filter(s => canDeleteThisSale(s))
                .map(sale => apiDeleteSaleRecord(sale.id));
            await Promise.all(deletePromises);
            addNotification(`${canDeleteCount} sale(s) deleted successfully.`, "success");
            setSelectedSaleIds(new Set());
            fetchData();
        } catch (error) {
            addNotification(`Failed to delete sales: ${(error as Error).message}`, "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Bulk approve credit notes
    const handleBulkApproveCreditNotes = async () => {
        if (selectedCreditNoteIds.size === 0) {
            addNotification("Please select at least one credit note to approve.", "error");
            return;
        }

        if (!user) {
            addNotification("User information is required.", "error");
            return;
        }

        const selectedCreditNotes = filteredCreditNotes.filter(cn => 
            selectedCreditNoteIds.has(cn.id) && cn.status === CreditNoteStatus.PENDING
        );
        
        if (selectedCreditNotes.length === 0) {
            addNotification("No pending credit notes selected. Only pending credit notes can be approved.", "error");
            return;
        }

        const confirmed = await showConfirmation({
            title: 'Approve Credit Notes',
            message: `Are you sure you want to approve ${selectedCreditNotes.length} credit note(s)?`,
            confirmText: 'Approve',
            cancelText: 'Cancel',
            confirmVariant: 'primary',
        });

        if (!confirmed) return;

        setIsBulkActionLoading(true);
        try {
            const approvePromises = selectedCreditNotes.map(cn => 
                apiApproveCreditNote(cn.id, user.id)
            );
            await Promise.all(approvePromises);
            addNotification(`${selectedCreditNotes.length} credit note(s) approved successfully.`, "success");
            setSelectedCreditNoteIds(new Set());
            fetchData();
        } catch (error) {
            addNotification(`Failed to approve credit notes: ${(error as Error).message}`, "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Approve individual credit note
    const handleApproveCreditNote = async (creditNote: CreditNote) => {
        if (!user) {
            addNotification("User information is required.", "error");
            return;
        }

        if (creditNote.status !== CreditNoteStatus.PENDING) {
            addNotification(`Cannot approve credit note with status ${creditNote.status}. Only PENDING credit notes can be approved.`, "error");
            return;
        }

        const confirmed = await showConfirmation({
            title: 'Approve Credit Note',
            message: `Are you sure you want to approve credit note ${creditNote.id}?`,
            confirmText: 'Approve',
            cancelText: 'Cancel',
            confirmVariant: 'primary',
        });

        if (!confirmed) return;

        try {
            await apiApproveCreditNote(creditNote.id, user.id);
            addNotification(`Credit note ${creditNote.id} approved successfully.`, "success");
            fetchData();
        } catch (error) {
            addNotification(`Failed to approve credit note: ${(error as Error).message}`, "error");
        }
    };

    const handleDeleteCreditNote = async (creditNote: CreditNote) => {
        if (!canDeleteCreditNote()) {
            addNotification("You don't have permission to delete credit notes.", "error");
            return;
        }
        if (creditNote.status !== CreditNoteStatus.PENDING && creditNote.status !== CreditNoteStatus.APPROVED) {
            addNotification(`Cannot delete credit note with status ${creditNote.status}. Only PENDING or APPROVED credit notes can be deleted.`, "error");
            return;
        }
        const warningMessage = creditNote.status === CreditNoteStatus.APPROVED
            ? "This will permanently delete the APPROVED credit note and reverse its balance effect. This action cannot be undone."
            : "This action cannot be undone. This will permanently remove the credit note record.";
        const confirmed = await showConfirmation({
            title: `Delete Credit Note ${creditNote.id}?`,
            message: warningMessage,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteCreditNote(creditNote.id);
                addNotification(`Credit note ${creditNote.id} deleted successfully.`, "success");
                setSelectedCreditNoteIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(creditNote.id);
                    return newSet;
                });
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete credit note: ${(error as Error).message}`, "error");
            }
        }
    };

    const handleBulkDeleteCreditNotes = async () => {
        if (selectedCreditNoteIds.size === 0) {
            addNotification("Please select at least one credit note to delete.", "error");
            return;
        }
        if (!canDeleteCreditNote()) {
            addNotification("You don't have permission to delete credit notes.", "error");
            return;
        }
        const selectedCreditNotes = filteredCreditNotes.filter(cn =>
            selectedCreditNoteIds.has(cn.id) && (cn.status === CreditNoteStatus.PENDING || cn.status === CreditNoteStatus.APPROVED)
        );
        if (selectedCreditNotes.length === 0) {
            addNotification("No deletable credit notes selected. Only PENDING or APPROVED credit notes can be deleted.", "error");
            return;
        }
        const confirmed = await showConfirmation({
            title: 'Delete Credit Notes',
            message: `Are you sure you want to delete ${selectedCreditNotes.length} credit note(s)? This will also adjust client/business balances.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmVariant: 'danger',
        });
        if (!confirmed) return;
        setIsBulkActionLoading(true);
        try {
            await Promise.all(selectedCreditNotes.map(cn => apiDeleteCreditNote(cn.id)));
            addNotification(`${selectedCreditNotes.length} credit note(s) deleted successfully.`, "success");
            setSelectedCreditNoteIds(new Set());
            fetchData();
        } catch (error) {
            addNotification(`Failed to delete credit notes: ${(error as Error).message}`, "error");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Clear selection when filters change
    useEffect(() => {
        setSelectedSaleIds(new Set());
        setSelectedCreditNoteIds(new Set());
    }, [recordStartDate, recordEndDate, campaignStartDate, campaignEndDate, statusFilter, searchTerm, serviceFilter, categoryFilter, typeFilter]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Sales & Credits</h1>
                <div className="flex items-center gap-2">
                    <RefreshButton onClick={fetchData} isLoading={isLoading} />
                    {filteredApprovableTotalCount > 0 && (
                        <Button
                            onClick={handleApproveAllDraftsAndPending}
                            variant="primary"
                            isLoading={isBulkActionLoading}
                        >
                            Approve All Drafts ({filteredApprovableTotalCount})
                        </Button>
                    )}
                    <Button onClick={() => setIsRecordCreditNoteModalOpen(true)} variant="warning">Credit Note</Button>
                    <Button onClick={() => { setEditingSale(null); setIsAddModalOpen(true); }} variant="primary">+ Add Sale</Button>
                </div>
            </div>

            <div className="mb-6">
                <p className="text-xs font-medium text-text-secondary dark:text-slate-400 mb-3 uppercase tracking-wide">
                    Sales by service — click Draft or Approved to filter the table. Totals use date, campaign, service &amp; search filters only.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SalesEntryCategoryKpiCard
                        title="Facebook Ads"
                        stats={salesCategoryKpis.facebook}
                        accentBarClass="bg-blue-500"
                        showUsd
                        categoryKey="facebook"
                        activeStatusFilter={statusFilter}
                        activeCategoryFilter={categoryFilter}
                        onSelectDraft={() => { setStatusFilter(SaleStatus.DRAFT); setCategoryFilter('facebook'); setServiceFilter(''); }}
                        onSelectApproved={() => { setStatusFilter(SaleStatus.CHECKED); setCategoryFilter('facebook'); setServiceFilter(''); }}
                        onClearFilter={() => { setStatusFilter(''); setCategoryFilter(''); }}
                    />
                    <SalesEntryCategoryKpiCard
                        title="TikTok Ads"
                        stats={salesCategoryKpis.tiktok}
                        accentBarClass="bg-pink-500"
                        showUsd
                        categoryKey="tiktok"
                        activeStatusFilter={statusFilter}
                        activeCategoryFilter={categoryFilter}
                        onSelectDraft={() => { setStatusFilter(SaleStatus.DRAFT); setCategoryFilter('tiktok'); setServiceFilter(''); }}
                        onSelectApproved={() => { setStatusFilter(SaleStatus.CHECKED); setCategoryFilter('tiktok'); setServiceFilter(''); }}
                        onClearFilter={() => { setStatusFilter(''); setCategoryFilter(''); }}
                    />
                    <SalesEntryCategoryKpiCard
                        title="Other Services"
                        stats={salesCategoryKpis.other}
                        accentBarClass="bg-violet-500"
                        showUsd={false}
                        categoryKey="other"
                        activeStatusFilter={statusFilter}
                        activeCategoryFilter={categoryFilter}
                        onSelectDraft={() => { setStatusFilter(SaleStatus.DRAFT); setCategoryFilter('other'); setServiceFilter(''); }}
                        onSelectApproved={() => { setStatusFilter(SaleStatus.CHECKED); setCategoryFilter('other'); setServiceFilter(''); }}
                        onClearFilter={() => { setStatusFilter(''); setCategoryFilter(''); }}
                    />
                </div>
            </div>

            <div className="mb-4 p-3 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <div className="flex flex-nowrap gap-4 items-end min-w-max">
                    <div className="flex-1 min-w-0 max-w-xl">
                        <Input label="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} containerClassName="mb-0" placeholder="ID, client, business..." />
                    </div>
                    <Select
                        label="Type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'all' | 'sale' | 'creditNote')}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'sale', label: 'Sales' },
                            { value: 'creditNote', label: 'Credit Notes' }
                        ]}
                        containerClassName="mb-0 w-32 flex-shrink-0"
                    />
                    <Select
                        label="Service"
                        value={serviceFilter}
                        onChange={(e) => { setServiceFilter(e.target.value); setCategoryFilter(''); }}
                        options={[
                            { value: '', label: 'All Services' },
                            ...allServices.map(s => ({ value: s.id, label: s.name }))
                        ]}
                        containerClassName="mb-0 w-40 flex-shrink-0"
                    />
                    <Input label="Record From" type="date" value={recordStartDate} onChange={e => { setRecordStartDate(e.target.value); setCampaignStartDate(''); setCampaignEndDate(''); }} containerClassName="mb-0 w-36 flex-shrink-0" />
                    <Input label="Record To" type="date" value={recordEndDate} onChange={e => { setRecordEndDate(e.target.value); setCampaignStartDate(''); setCampaignEndDate(''); }} containerClassName="mb-0 w-36 flex-shrink-0" />
                    <Input label="Campaign From" type="date" value={campaignStartDate} onChange={e => { setCampaignStartDate(e.target.value); setRecordStartDate(''); setRecordEndDate(''); }} containerClassName="mb-0 w-36 flex-shrink-0" />
                    <Input label="Campaign To" type="date" value={campaignEndDate} onChange={e => { setCampaignEndDate(e.target.value); setRecordStartDate(''); setRecordEndDate(''); }} containerClassName="mb-0 w-36 flex-shrink-0" />
                    <div className="flex gap-2 flex-shrink-0">
                        <Button onClick={handleResetFilters} variant="ghost" size="sm">Reset</Button>
                        <Button onClick={handleSelectToday} variant="secondary" size="sm">Today</Button>
                        <Button onClick={handleDownloadExcel} variant="secondary" size="sm">Excel</Button>
                    </div>
                </div>
            </div>

            {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
                (filteredSales.length > 0 || filteredRefunds.length > 0 || filteredCreditNotes.length > 0) ? (
                <>
                {/* Bulk Action Buttons */}
                {(selectedSaleIds.size > 0 || selectedCreditNoteIds.size > 0) && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {selectedSaleIds.size > 0 && `${selectedSaleIds.size} sale(s)`}
                                    {selectedSaleIds.size > 0 && selectedCreditNoteIds.size > 0 && ' and '}
                                    {selectedCreditNoteIds.size > 0 && `${selectedCreditNoteIds.size} credit note(s)`} selected
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                {(() => {
                                    if (selectedSaleIds.size === 1 && selectedCreditNoteIds.size === 0) {
                                        const selectedSale = filteredSales.find(s => selectedSaleIds.has(s.id));
                                        if (!selectedSale) return null;
                                        const paidAmount = salePaidAmounts.get(selectedSale.id) || 0;
                                        const remainingAmount = Math.max((selectedSale.grandTotalMMK || 0) - paidAmount, 0);
                                        const isFullyPaid = remainingAmount <= 0;
                                        const invoice = invoiceMapBySaleId.get(selectedSale.id);
                                        return (
                                            <>
                                                {selectedSale.status !== SaleStatus.DRAFT && !isFullyPaid && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedSaleForPayment(selectedSale);
                                                            setIsRecordPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        Record Pymt
                                                    </Button>
                                                )}
                                                {invoice ? (
                                                    <Link to={`/sales/invoices/${invoice.id}`} className="inline-block">
                                                        <Button variant="ghost" size="sm">View Invoice</Button>
                                                    </Link>
                                                ) : selectedSale.status !== SaleStatus.DRAFT ? (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleGenerateInvoice(selectedSale)}
                                                        isLoading={invoiceGeneratingSaleId === selectedSale.id}
                                                    >
                                                        Generate Invoice
                                                    </Button>
                                                ) : null}
                                                {canEditThisSale(selectedSale) && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditSale(selectedSale)}>
                                                        Edit
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    }
                                    if (selectedCreditNoteIds.size === 1 && selectedSaleIds.size === 0) {
                                        const selectedCreditNote = filteredCreditNotes.find(cn => selectedCreditNoteIds.has(cn.id));
                                        if (!selectedCreditNote) return null;
                                        const canEditOrDelete = (selectedCreditNote.status === CreditNoteStatus.PENDING || selectedCreditNote.status === CreditNoteStatus.APPROVED);
                                        return canEditOrDelete ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingCreditNote(selectedCreditNote);
                                                        setIsRecordCreditNoteModalOpen(true);
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                {canDeleteCreditNote() && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCreditNote(selectedCreditNote)}>
                                                        Delete
                                                    </Button>
                                                )}
                                            </>
                                        ) : null;
                                    }
                                    return null;
                                })()}
                                {((canChangeStatus({} as SaleRecord) && draftSalesCount > 0) || pendingCreditNotesCount > 0) && (draftSalesCount > 0 || pendingCreditNotesCount > 0) && (
                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        onClick={handleBulkApproveSelected}
                                        isLoading={isBulkActionLoading}
                                    >
                                        Approve Selected ({draftSalesCount + pendingCreditNotesCount})
                                    </Button>
                                )}
                                {deletableSalesCount > 0 && (
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        onClick={handleBulkDelete}
                                        isLoading={isBulkActionLoading}
                                    >
                                        Delete Sales ({deletableSalesCount})
                                    </Button>
                                )}
                                {deletableCreditNotesCount > 0 && (
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        onClick={handleBulkDeleteCreditNotes}
                                        isLoading={isBulkActionLoading}
                                    >
                                        Delete Credits ({deletableCreditNotesCount})
                                    </Button>
                                )}
                                {(selectedSaleIds.size > 0 || selectedCreditNoteIds.size > 0) && (
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={() => {
                                            setSelectedSaleIds(new Set());
                                            setSelectedCreditNoteIds(new Set());
                                        }}
                                        disabled={isBulkActionLoading}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                    <div className="text-sm text-text-secondary dark:text-slate-400">
                        {combinedEntries.length > 0
                            ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, combinedEntries.length)} of ${combinedEntries.length} entries`
                            : 'No entries'}
                    </div>
                    {combinedEntries.length > ITEMS_PER_PAGE && (
                        <nav className="flex items-center gap-1" aria-label="Pagination">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1 mx-2">
                                {(() => {
                                    const pages: (number | 'ellipsis')[] = [];
                                    const showPages = 5;
                                    if (totalPages <= 9) {
                                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                                    } else {
                                        let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                                        const end = Math.min(totalPages, start + showPages - 1);
                                        if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);
                                        if (start > 1) pages.push(1, 'ellipsis');
                                        for (let i = start; i <= end; i++) pages.push(i);
                                        if (end < totalPages) pages.push('ellipsis', totalPages);
                                    }
                                    return pages.map((p, idx) =>
                                        p === 'ellipsis' ? (
                                            <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span>
                                        ) : (
                                            <Button
                                                key={p}
                                                variant={currentPage === p ? 'primary' : 'secondary'}
                                                size="sm"
                                                className="min-w-[2rem]"
                                                onClick={() => setCurrentPage(p)}
                                            >
                                                {p}
                                            </Button>
                                        )
                                    );
                                })()}
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                            </Button>
                        </nav>
                    )}
                </div>
                <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    <div className="overflow-auto flex-1 min-h-0">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 table-fixed">
                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(input) => {
                                            if (input) input.indeterminate = isSomeSelected && !isAllSelected;
                                        }}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center space-x-2">
                                        <span>Sale/Refund/Credit Note ID</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('id')}
                                            className="!p-1 h-6 w-6"
                                            title={`Sort by ID (${sortConfig.key === 'id' ? sortConfig.direction : getInitialSortDirection('id')})`}
                                        >
                                            {getSortIndicator('id')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center space-x-2">
                                        <span>Status</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('status')}
                                            className="!p-1 h-6 w-6"
                                            title={`Sort by Status (${sortConfig.key === 'status' ? sortConfig.direction : getInitialSortDirection('status')})`}
                                        >
                                            {getSortIndicator('status')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider w-[140px] min-w-[140px] max-w-[140px]">
                                    <div className="flex items-center space-x-2">
                                        <span>Business / Client</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('businessClient')}
                                            className="!p-1 h-6 w-6 flex-shrink-0"
                                            title={`Sort by Business/Client (${sortConfig.key === 'businessClient' ? sortConfig.direction : getInitialSortDirection('businessClient')})`}
                                        >
                                            {getSortIndicator('businessClient')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center space-x-2">
                                        <span>Service Name</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('service')}
                                            className="!p-1 h-6 w-6"
                                            title={`Sort by Service (${sortConfig.key === 'service' ? sortConfig.direction : getInitialSortDirection('service')})`}
                                        >
                                            {getSortIndicator('service')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center justify-end space-x-2">
                                        <span>Total Current Balance (MMK)</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('balance')}
                                            className="!p-1 h-6 w-6"
                                            title={`Sort by Balance (${sortConfig.key === 'balance' ? sortConfig.direction : getInitialSortDirection('balance')})`}
                                        >
                                            {getSortIndicator('balance')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center justify-end space-x-2">
                                        <span>Total (MMK)</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('total')}
                                            className="!p-1 h-6 w-6"
                                            title={`Sort by Total (${sortConfig.key === 'total' ? sortConfig.direction : getInitialSortDirection('total')})`}
                                        >
                                            {getSortIndicator('total')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center space-x-2">
                                        <span>Created Date</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center space-x-2">
                                        <span>Campaign Start</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleSort('date')}
                                            className="!p-1 h-6 w-6"
                                            title={`Sort by Date (${sortConfig.key === 'date' ? sortConfig.direction : getInitialSortDirection('date')})`}
                                        >
                                            {getSortIndicator('date')}
                                        </Button>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <span>Campaign End</span>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                    <span>Credit Note Date</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {visibleEntries.map((entry) => {
                                if (entry.type === 'creditNote') {
                                    const creditNote = entry.data as CreditNote;
                                const balanceKey = creditNote.clientId && creditNote.businessId
                                    ? `${creditNote.clientId}_${creditNote.businessId}`
                                    : null;
                                const hasBalance = balanceKey ? Object.prototype.hasOwnProperty.call(clientBusinessBalanceMap, balanceKey) : false;
                                const balanceValue = balanceKey ? clientBusinessBalanceMap[balanceKey] : undefined;
                                    return (
                                        <tr key={`creditnote-${creditNote.id}`} className="hover:bg-orange-50 dark:hover:bg-orange-900/20 bg-orange-50/50 dark:bg-orange-900/10">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCreditNoteIds.has(creditNote.id)}
                                                    onChange={(e) => handleSelectCreditNote(creditNote.id, e.target.checked)}
                                                    className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-orange-600 dark:text-orange-400">
                                                {creditNote.id}
                                                {creditNote.saleRecordId && (
                                                    <Link to={`/sales/${creditNote.saleRecordId}`} className="ml-2 text-xs text-primary-action hover:text-blue-700 dark:hover:text-blue-400">
                                                        For: {creditNote.saleRecordId}
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[creditNote.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {creditNote.status}
                                                </span>
                                                {creditNote.status === CreditNoteStatus.PENDING && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="ml-2"
                                                        onClick={() => handleApproveCreditNote(creditNote)}
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                                {(creditNote.status === CreditNoteStatus.PENDING || creditNote.status === CreditNoteStatus.APPROVED) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="ml-2"
                                                        onClick={() => {
                                                            setEditingCreditNote(creditNote);
                                                            setIsRecordCreditNoteModalOpen(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                )}
                                                {(creditNote.status === CreditNoteStatus.PENDING || creditNote.status === CreditNoteStatus.APPROVED) && canDeleteCreditNote() && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                        onClick={() => handleDeleteCreditNote(creditNote)}
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400 w-[140px] min-w-[140px] max-w-[140px] overflow-hidden" title={`${getBusinessName(creditNote.businessId)} / ${getClientName(creditNote.clientId)}`}>
                                                <div className="truncate font-medium">
                                                    {creditNote.businessId ? (
                                                        <Link to={`/businesses/${creditNote.businessId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>{getBusinessName(creditNote.businessId)}</Link>
                                                    ) : (
                                                        getBusinessName(creditNote.businessId)
                                                    )}
                                                </div>
                                                <div className="truncate text-xs">
                                                    {creditNote.clientId ? (
                                                        <Link to={`/clients/${creditNote.clientId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>{getClientName(creditNote.clientId)}</Link>
                                                    ) : (
                                                        getClientName(creditNote.clientId)
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400">
                                                {creditNote.serviceId ? (allServices.find(s => s.id === creditNote.serviceId)?.name || 'Unknown Service') : 'Credit Note'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 text-right font-medium">
                                                {balanceKey ? (hasBalance ? (balanceValue || 0).toLocaleString() : 'Loading...') : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 text-right font-medium">
                                                -{creditNote.amountMMK.toLocaleString()}
                                            </td>
                                            {renderDateCells(
                                                getReportDatesForCreditNote(
                                                    creditNote,
                                                    creditNote.saleRecordId ? saleById.get(creditNote.saleRecordId) : undefined
                                                ),
                                                'text-orange-600 dark:text-orange-400'
                                            )}
                                        </tr>
                                    );
                                } else if (entry.type === 'refund') {
                                    const refund = entry.data as Refund;
                                    const balanceKey = refund.clientId && refund.businessId
                                        ? `${refund.clientId}_${refund.businessId}`
                                        : null;
                                    const hasBalance = balanceKey ? Object.prototype.hasOwnProperty.call(clientBusinessBalanceMap, balanceKey) : false;
                                    const balanceValue = balanceKey ? clientBusinessBalanceMap[balanceKey] : undefined;
                                    return (
                                        <tr key={`refund-${refund.id}`} className="hover:bg-red-50 dark:hover:bg-red-900/20 bg-red-50/50 dark:bg-red-900/10">
                                            <td className="px-4 py-3 whitespace-nowrap"></td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                                                {refund.id} <span className="text-xs">(Refund)</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[refund.status as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700'}`}>
                                                    {refund.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 w-[140px] min-w-[140px] max-w-[140px] overflow-hidden" title={`${getBusinessName(refund.businessId)} / ${getClientName(refund.clientId)}`}>
                                                <div className="truncate font-medium">
                                                    {refund.businessId ? (
                                                        <Link to={`/businesses/${refund.businessId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>{getBusinessName(refund.businessId)}</Link>
                                                    ) : (
                                                        getBusinessName(refund.businessId)
                                                    )}
                                                </div>
                                                <div className="truncate text-xs">
                                                    {refund.clientId ? (
                                                        <Link to={`/clients/${refund.clientId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>{getClientName(refund.clientId)}</Link>
                                                    ) : (
                                                        getClientName(refund.clientId)
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                                {refund.serviceId ? (allServices.find(s => s.id === refund.serviceId)?.name || 'Unknown Service') : 'Refund'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 text-right font-medium">
                                                {balanceKey ? (hasBalance ? (balanceValue || 0).toLocaleString() : 'Loading...') : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 text-right font-medium">
                                                -{refund.amountMMK.toLocaleString()}
                                            </td>
                                            {renderDateCells(getReportDatesForRefund(refund), 'text-red-600 dark:text-red-400')}
                                        </tr>
                                    );
                                } else {
                                    const sale = entry.data as SaleRecord;
                                    const balanceKey = sale.clientId && sale.businessId
                                        ? `${sale.clientId}_${sale.businessId}`
                                        : null;
                                    const hasBalance = balanceKey ? Object.prototype.hasOwnProperty.call(clientBusinessBalanceMap, balanceKey) : false;
                                    const balanceValue = balanceKey ? clientBusinessBalanceMap[balanceKey] : undefined;
                                    return (
                                        <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSaleIds.has(sale.id)}
                                                    onChange={(e) => handleSelectSale(sale.id, e.target.checked)}
                                                    className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-action hover:underline dark:text-blue-400">
                                                <Link to={`/sales/${sale.id}`}>{sale.id}</Link>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[sale.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {sale.status}
                                                </span>
                                                {sale.status === SaleStatus.DRAFT && canChangeStatus(sale) && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="ml-2"
                                                        onClick={() => handleStatusChange(sale, SaleStatus.CHECKED)}
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                                {canEditThisSale(sale) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="ml-2"
                                                        onClick={() => handleEditSale(sale)}
                                                    >
                                                        Edit
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200 w-[140px] min-w-[140px] max-w-[140px] overflow-hidden" title={`${getBusinessName(sale.businessId)} / ${getClientName(sale.clientId)}`}>
                                                <div className="truncate font-medium">
                                                    {sale.businessId ? (
                                                        <Link to={`/businesses/${sale.businessId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>{getBusinessName(sale.businessId)}</Link>
                                                    ) : (
                                                        getBusinessName(sale.businessId)
                                                    )}
                                                </div>
                                                <div className="truncate text-xs text-text-secondary dark:text-slate-400">
                                                    {sale.clientId ? (
                                                        <Link to={`/clients/${sale.clientId}`} className="text-primary-action hover:underline" onClick={e => e.stopPropagation()}>{getClientName(sale.clientId)}</Link>
                                                    ) : (
                                                        getClientName(sale.clientId)
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                {sale.serviceId ? (allServices.find(s => s.id === sale.serviceId)?.name || 'Unknown') : (sale.type || 'Unknown')}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right font-medium">
                                                {balanceKey ? (hasBalance ? (balanceValue || 0).toLocaleString() : 'Loading...') : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right font-medium">{(sale.grandTotalMMK || 0).toLocaleString()}</td>
                                            {renderDateCells(getReportDatesForSale(sale))}
                                        </tr>
                                    );
                                }
                            })}
                        </tbody>
                        </table>
                    </div>
                </div>
                </>
                ) : <p className="text-center text-text-secondary py-8">No sales records, refunds, or credit notes found for the selected period. Add a new sale to get started.</p>
            )}

            {isAddModalOpen && (
                <AddSaleModal 
                    isOpen={isAddModalOpen} 
                    onClose={() => { setIsAddModalOpen(false); setEditingSale(null); }}
                    onSuccess={handleModalSuccess}
                    onRecordPayment={(sale) => {
                        setSelectedSaleForPayment(sale);
                        setIsAddModalOpen(false);
                        setIsRecordPaymentModalOpen(true);
                    }}
                    editingSale={editingSale}
                    clients={clients}
                    businesses={businesses}
                    allServices={allServices}
                    loggedInUser={user}
                    allUsers={allUsers}
                    campaignObjectives={campaignObjectives}
                    paymentMethods={paymentMethods}
                    cashAccounts={cashAccounts}
                />
            )}
            {isRecordPaymentModalOpen && selectedSaleForPayment && user && (
                <RecordPaymentModal 
                    isOpen={isRecordPaymentModalOpen}
                    onClose={() => setIsRecordPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                    clients={clients}
                    businesses={businesses}
                    invoices={allInvoices}
                    sales={sales}
                    paymentMethods={paymentMethods}
                    cashAccounts={cashAccounts}
                    defaultClientId={selectedSaleForPayment.clientId}
                    defaultBusinessId={selectedSaleForPayment.businessId}
                    defaultSaleId={selectedSaleForPayment.id}
                    defaultAmount={(() => {
                        const paidAmount = salePaidAmounts.get(selectedSaleForPayment.id) || 0;
                        return Math.max((selectedSaleForPayment.grandTotalMMK || 0) - paidAmount, 0);
                    })()}
                />
            )}
            {isRecordCreditNoteModalOpen && user && (
                <RecordCreditNoteModal
                    isOpen={isRecordCreditNoteModalOpen}
                    onClose={() => {
                      setIsRecordCreditNoteModalOpen(false);
                      setSelectedSaleForPayment(null);
                      setEditingCreditNote(null);
                    }}
                    onSuccess={() => {
                      setIsRecordCreditNoteModalOpen(false);
                      setSelectedSaleForPayment(null);
                      setEditingCreditNote(null);
                      fetchData();
                    }}
                    clients={clients}
                    businesses={businesses}
                    sales={sales}
                    allServices={allServices}
                    editingCreditNote={editingCreditNote}
                    defaultClientId={editingCreditNote?.clientId || selectedSaleForPayment?.clientId}
                    defaultBusinessId={editingCreditNote?.businessId || selectedSaleForPayment?.businessId}
                    defaultSaleId={editingCreditNote?.saleRecordId || selectedSaleForPayment?.id}
                />
            )}
        </div>
    );
};

export default SalesEntryPage;