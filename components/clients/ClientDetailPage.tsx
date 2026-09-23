// FIX: Completed component as the original file was truncated, which caused errors.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Client, Business, Invoice, SaleRecord, PurchaseHistoryItem, InvoiceStatus, Payment, User, PaymentMethodSetting, SaleStatus, Note, FacebookAdsSaleRecord, OtherServicesSaleRecord, Service, CampaignObjectiveSetting, Permission, Quotation, Refund, PaymentStatus, CreditNote, CreditNoteStatus, BalanceAdjustment, BalanceAdjustmentType, BadDebt, AllowanceForDoubtfulDebts, ClientBusinessBalance, MergeSnapshot, BusinessMergeSnapshot } from '../../types';
import { 
    apiGetClientById, 
    apiGetBusinessById, 
    apiGetInvoicesForClient, 
    apiGetSalesForClient, 
    apiGetInvoicesForBusiness, 
    apiGetSalesForBusiness,
    apiGetPaymentsForClient,
    apiGetPaymentsForBusiness,
    apiGetUsers,
    apiGetClients,
    apiGetBusinesses,
    apiGetClientsByIds,
    apiGetBusinessesByIds,
    apiRepairBusinessClientLinksFromSales,
    apiGetPaymentMethodSettings,
    apiGetCashAccounts,
    apiRecordPayment,
    apiUpdateClient,
    apiUpdateBusiness,
    apiGetNotes,
    apiAddNote,
    apiDeleteNote,
    apiGetServices,
    apiGetCampaignObjectiveSettings,
    apiGetCompanyProfile,
    apiGetQuotationsForClient,
    apiGetQuotationsForBusiness,
    apiGetRefundsForClient,
    apiGetRefundsForBusiness,
    apiGetCreditNotesForClient,
    apiGetCreditNotesForBusiness,
    apiGetBalanceAdjustmentsForClient,
    apiGetBalanceAdjustmentsForBusiness,
    apiRecalculateClientBalance,
    apiUpdateSaleRecord,
    apiApprovePayment,
    apiApproveCreditNote,
    apiGetClientTotalBalance,
    apiGetClientBusinessBalance,
    apiGetClientBusinessBalancesByClient,
    apiGetClientBusinessBalancesByBusiness,
    apiSetClientBusinessOpeningBalance,
    apiGetBadDebtsForClient,
    apiGetBadDebtsForBusiness,
    apiGetAllowanceProvisionsForClient,
    apiGetAllowanceProvisionsForBusiness,
    apiDeletePayment,
    apiDeleteSaleRecord,
    apiDeleteCreditNote,
    apiMergeClients,
    apiGetMergeSnapshotsForClient,
    apiUnmergeClients,
    apiMergeBusinesses,
    apiGetMergeSnapshotsForBusiness,
    apiUnmergeBusinesses
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import RecordPaymentModal from '../finance/modals/RecordPaymentModal';
import RecordCreditNoteModal from '../finance/modals/RecordCreditNoteModal';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { useConfirmation } from '../../hooks/useConfirmation';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { CLIENT_ID_PREFIX, BUSINESS_ID_PREFIX, STATUS_COLORS } from '../../constants';
import { formatDateForDisplay, formatDateTimeForDisplay, getDateInYangonTimezone } from '../../utils/dateUtils';
import AddSaleModal from '../sales_entry/modals/AddSaleModal';
import FacebookAdsPDFTemplate from './FacebookAdsPDFTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { flushSync } from 'react-dom';
import CreateInvoiceFromHistoryModal from './CreateInvoiceFromHistoryModal';
import PurchaseHistoryPDFTemplate from './PurchaseHistoryPDFTemplate';
import SalesRecordsPDFTemplate from './SalesRecordsPDFTemplate';
import DownloadPDFModal, { PDFDownloadType } from './modals/DownloadPDFModal';
import AddClientModal from './AddClientModal';
import AddBusinessModal from './AddBusinessModal';
import { addCanvasToPdfPaginated, getProtectTailCanvasPx } from '../../utils/pdfUtils';
import { filterSalesRecordsForPdf } from '../../utils/salesRecordsPdfFilter';
import { subscribeRefreshData, dispatchRefreshData } from '../../utils/refreshDataBus';
import { buildBoostingLineFromSale, isBoostingService, normalizeBoostingLineItem } from '../../utils/boostingServiceUtils';

interface ClientDetailPageProps {
  isBusinessView?: boolean;
}

// KPI Card Component
const BilledIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.875c-.372 0-.744.052-1.123.08C2.745 4.01 2.25 4.973 2.25 6.108v11.785c0 1.275 1.05 2.308 2.333 2.308H15a2.25 2.25 0 0 0 2.25-2.25Z" /></svg>;
const PaidIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6V9m18-3v3m-10.5-3H16.5m-3.75 0V3.75m0 0H10.5m2.25 0L12 2.25M4.5 20.25v-3.75m0 0A2.25 2.25 0 0 1 6.75 15h10.5a2.25 2.25 0 0 1 2.25 2.25m-15 0V15m0 2.25H15m0 0v3.75m0-3.75H9.75m0 0V15M12 9v6m-3-3h6" /></svg>;
const DueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;
const BadDebtIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
const AdjustIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>;
const DocumentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
const AllowanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6V9m18-3v3m-10.5-3H16.5m-3.75 0V3.75m0 0H10.5m2.25 0L12 2.25" /></svg>;


const KPICard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string; valueSuffix?: string }> = ({ title, value, icon, colorClass, valueSuffix = ' MMK' }) => (
    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-center border border-slate-200 dark:border-slate-700">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{value.toLocaleString()}{valueSuffix ? <span className="text-lg font-normal">{valueSuffix}</span> : null}</p>
        </div>
    </div>
);

type SalesServiceCategory = 'facebook' | 'tiktok' | 'other';

interface CategoryKpiStats {
  draftCount: number;
  draftAmount: number;
  approvedCount: number;
  approvedAmount: number;
}

const emptyCategoryKpiStats = (): CategoryKpiStats => ({
  draftCount: 0,
  draftAmount: 0,
  approvedCount: 0,
  approvedAmount: 0,
});

const SalesCategoryKPICard: React.FC<{
  title: string;
  stats: CategoryKpiStats;
  accentClass: string;
  highlighted?: boolean;
}> = ({ title, stats, accentClass, highlighted = false }) => {
  const totalCount = stats.draftCount + stats.approvedCount;
  const totalAmount = stats.draftAmount + stats.approvedAmount;
  return (
    <div
      className={`rounded-lg border bg-container-bg dark:bg-slate-800 p-4 shadow-sm transition-shadow ${
        highlighted
          ? 'ring-2 ring-primary-action border-primary-action shadow-md'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1.5 h-9 rounded-full ${accentClass}`} />
        <h4 className="font-semibold text-text-primary dark:text-slate-100">{title}</h4>
      </div>
      <div className="space-y-0 text-sm">
        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/80">
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Draft
          </span>
          <div className="text-right">
            <span className="text-xs text-text-secondary dark:text-slate-400 mr-2">{stats.draftCount} rec</span>
            <span className="font-semibold tabular-nums text-text-primary dark:text-slate-200">{stats.draftAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/80">
          <span className="inline-flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Approved
          </span>
          <div className="text-right">
            <span className="text-xs text-text-secondary dark:text-slate-400 mr-2">{stats.approvedCount} rec</span>
            <span className="font-semibold tabular-nums text-text-primary dark:text-slate-200">{stats.approvedAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="font-medium text-text-secondary dark:text-slate-400">Total</span>
          <div className="text-right">
            <span className="text-xs text-text-secondary dark:text-slate-400 mr-2">{totalCount} rec</span>
            <span className="font-bold tabular-nums text-text-primary dark:text-slate-100">{totalAmount.toLocaleString()} MMK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// SetOpeningBalanceModal Component
const SetOpeningBalanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentItem: Client | Business;
    onSave: (amount: number) => Promise<void>;
}> = ({ isOpen, onClose, currentItem, onSave }) => {
    const [amount, setAmount] = useState<number | ''>(currentItem.openingBalance || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setAmount(currentItem.openingBalance || '');
    }, [currentItem]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave(Number(amount) || 0);
        setIsLoading(false);
        // Parent will close modal on success
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Set Opening Balance for ${currentItem.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-text-secondary">
                    Set an initial balance for this account. This amount will be added to the total outstanding balance calculation. Use a negative number for a credit balance.
                </p>
                <Input 
                    label="Opening Balance Amount (MMK)"
                    type="number"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                />
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={isLoading}>Save Balance</Button>
                </div>
            </form>
        </Modal>
    );
};

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; className?: string }> = ({ label, value, children, className }) => (
    <div className={`py-1 ${className} flex`}>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-40 flex-shrink-0">{label}: </span>
        {children ? (
             <div className="text-sm text-slate-800 dark:text-slate-200 min-w-0">{children}</div>
        ) : (
            <span className="text-sm text-slate-800 dark:text-slate-200 break-words">{value || 'N/A'}</span>
        )}
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {children}
        </div>
    </section>
);


export const ClientDetailPage: React.FC<ClientDetailPageProps> = ({ isBusinessView = false }) => {
  const { clientId: routeClientId, businessId: routeBusinessId } = useParams<{ clientId?: string; businessId?: string }>();
  const id = isBusinessView ? routeBusinessId : routeClientId;
  const navigate = useNavigate();
  const { user: loggedInUser, hasPermission, companyProfile: authCompanyProfile } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();

  const [item, setItem] = useState<Client | Business | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [purchaseHistoryRecords, setPurchaseHistoryRecords] = useState<Array<{ type: 'Sale' | 'Invoice' | 'Quotation'; record: SaleRecord | Invoice | Quotation }>>([]);
  const [selectedSalesRecordIds, setSelectedSalesRecordIds] = useState<Set<string>>(new Set());
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [clientOrBusinessPayments, setClientOrBusinessPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [allQuotations, setAllQuotations] = useState<Quotation[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'salesRecords' | 'documents' | 'payments' | 'openingBalance' | 'balanceAdjustments' | 'badDebts' | 'allowanceProvisions' | 'notes' | 'facebookAds'>('details');
  
  // Modal states
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isRecordCreditNoteModalOpen, setIsRecordCreditNoteModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editingCreditNote, setEditingCreditNote] = useState<CreditNote | null>(null);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isEditBusinessModalOpen, setIsEditBusinessModalOpen] = useState(false);
  const [isMergeClientsModalOpen, setIsMergeClientsModalOpen] = useState(false);
  const [mergeSearchTerm, setMergeSearchTerm] = useState('');
  const [mergeSelectedClientIds, setMergeSelectedClientIds] = useState<Set<string>>(new Set());
  const [isMergingClients, setIsMergingClients] = useState(false);
  const [mergeSnapshots, setMergeSnapshots] = useState<MergeSnapshot[]>([]);
  const [isUnmergeModalOpen, setIsUnmergeModalOpen] = useState(false);
  const [selectedUnmergeSnapshot, setSelectedUnmergeSnapshot] = useState<MergeSnapshot | null>(null);
  const [isUnmerging, setIsUnmerging] = useState(false);
  const [isMergeBusinessesModalOpen, setIsMergeBusinessesModalOpen] = useState(false);
  const [mergeBusinessSearchTerm, setMergeBusinessSearchTerm] = useState('');
  const [mergeSelectedBusinessIds, setMergeSelectedBusinessIds] = useState<Set<string>>(new Set());
  const [isMergingBusinesses, setIsMergingBusinesses] = useState(false);
  const [businessMergeSnapshots, setBusinessMergeSnapshots] = useState<BusinessMergeSnapshot[]>([]);
  const [isUnmergeBusinessModalOpen, setIsUnmergeBusinessModalOpen] = useState(false);
  const [selectedUnmergeBusinessSnapshot, setSelectedUnmergeBusinessSnapshot] = useState<BusinessMergeSnapshot | null>(null);
  const [isUnmergingBusinesses, setIsUnmergingBusinesses] = useState(false);

  // Data for modals
  const [paymentModalDefaults, setPaymentModalDefaults] = useState<Partial<Parameters<typeof RecordPaymentModal>[0]>>({});
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [campaignObjectives, setCampaignObjectives] = useState<CampaignObjectiveSetting[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(authCompanyProfile);
  
  const [balanceData, setBalanceData] = useState({ totalBilled: 0, totalPaid: 0, outstanding: 0 });
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadPDFModalOpen, setIsDownloadPDFModalOpen] = useState(false);
  const [pdfDownloadType, setPdfDownloadType] = useState<PDFDownloadType>('all');
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfDateRange, setPdfDateRange] = useState({ start: '', end: ''});
  
  // Filter states for Sales & Credits
  const [salesRecordsStartDate, setSalesRecordsStartDate] = useState<string>('');
  const [salesRecordsEndDate, setSalesRecordsEndDate] = useState<string>('');
  const [salesRecordsStatusFilter, setSalesRecordsStatusFilter] = useState<string>('All');
  const [salesRecordsSubTab, setSalesRecordsSubTab] = useState<'all' | 'facebookBoosting' | 'tiktokBoosting' | 'otherServices' | 'payments' | 'balanceAdjustments'>('all');
  // Multi-select Linked Business filter (client view only). Empty = show all; non-empty = filter to selected businesses.
  const [linkedBusinessFilterIds, setLinkedBusinessFilterIds] = useState<Set<string>>(new Set());
  const [clientRefunds, setClientRefunds] = useState<Refund[]>([]);
  const [clientCreditNotes, setClientCreditNotes] = useState<CreditNote[]>([]);
  const [clientBalanceAdjustments, setClientBalanceAdjustments] = useState<BalanceAdjustment[]>([]);
  const [clientBadDebts, setClientBadDebts] = useState<BadDebt[]>([]);
  const [clientAllowanceProvisions, setClientAllowanceProvisions] = useState<AllowanceForDoubtfulDebts[]>([]);
  const [openingBalanceRecords, setOpeningBalanceRecords] = useState<ClientBusinessBalance[]>([]);
  const [openingBalanceFormCounterparty, setOpeningBalanceFormCounterparty] = useState<string>('');
  const [openingBalanceFormAmount, setOpeningBalanceFormAmount] = useState<number | ''>('');
  const [openingBalanceFormLoading, setOpeningBalanceFormLoading] = useState(false);
  const [salesRecordsSortOrder, setSalesRecordsSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Filter states for Documents
  const [documentsStartDate, setDocumentsStartDate] = useState<string>('');
  const [documentsEndDate, setDocumentsEndDate] = useState<string>('');
  const [documentsTypeFilter, setDocumentsTypeFilter] = useState<'All' | 'Invoice' | 'Quotation'>('All');
  const [documentsStatusFilter, setDocumentsStatusFilter] = useState<string>('All');
  
  // Filter states for Payments Received
  const [paymentsStartDate, setPaymentsStartDate] = useState<string>('');
  const [paymentsEndDate, setPaymentsEndDate] = useState<string>('');
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState<string>('All');

  const loadedBadDebtsRef = useRef(false);
  const loadedAllowanceProvisionsRef = useRef(false);
  const modalCatalogLoadedRef = useRef(false);
  const loadedQuotationsRef = useRef(false);

  const applyQuotationsToHistory = useCallback((quotationList: Quotation[]) => {
    setAllQuotations(quotationList);
    setPurchaseHistoryRecords((prev) => {
      const base = prev.filter((r) => r.type !== 'Quotation');
      const records = [
        ...base,
        ...quotationList.map((q) => ({ type: 'Quotation' as const, record: q })),
      ];
      return records.sort((a, b) => {
        const dateOf = (r: typeof records[number]) => {
          if (r.type === 'Sale') return (r.record as SaleRecord).createdAt || (r.record as SaleRecord).updatedAt || '';
          if (r.type === 'Quotation') return (r.record as Quotation).issueDate || '';
          return (r.record as Invoice).issueDate || '';
        };
        return new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime();
      });
    });
    setPurchaseHistory((prev) => {
      const base = prev.filter((h) => !h.service?.startsWith('Quotation:'));
      const added: PurchaseHistoryItem[] = quotationList.map((q) => ({
        id: q.id,
        date: q.issueDate,
        service: `Quotation: ${q.id}`,
        amount: q.grandTotal,
        status: q.status as PurchaseHistoryItem['status'],
        type: 'Invoice',
      }));
      return [...base, ...added].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const ensureModalCatalogData = useCallback(async () => {
    if (modalCatalogLoadedRef.current) return;
    modalCatalogLoadedRef.current = true;
    try {
      const [clients, businesses] = await Promise.all([apiGetClients(), apiGetBusinesses()]);
      setAllClients(clients);
      setAllBusinesses(businesses);
    } catch (error) {
      modalCatalogLoadedRef.current = false;
      console.warn('Failed to load client/business catalog for modals:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    loadedBadDebtsRef.current = false;
    loadedAllowanceProvisionsRef.current = false;
    loadedQuotationsRef.current = false;
    modalCatalogLoadedRef.current = false;
    if (!id) {
        setError("No ID provided in the URL.");
        setIsLoading(false);
        return;
    }
    if (isBusinessView && !id.startsWith(BUSINESS_ID_PREFIX)) {
        setError(`Invalid Business ID format. Expected ID to start with "${BUSINESS_ID_PREFIX}".`);
        setIsLoading(false);
        return;
    }
    if (!isBusinessView && !id.startsWith(CLIENT_ID_PREFIX)) {
        setError(`Invalid Client ID format. Expected ID to start with "${CLIENT_ID_PREFIX}".`);
        setIsLoading(false);
        return;
    }

    setError(null);
    setIsLoading(true);

    try {
      let fetchedItem: Client | Business | null = null;
      let sales: SaleRecord[] = [];
      let invoices: Invoice[] = [];
      let payments: Payment[] = [];

      const [
        fetchedItemDoc,
        fetchedSales,
        fetchedInvoices,
        fetchedNotes,
        fetchedOpeningBalances,
      ] = await Promise.all([
        isBusinessView ? apiGetBusinessById(id) : apiGetClientById(id),
        isBusinessView ? apiGetSalesForBusiness(id) : apiGetSalesForClient(id),
        isBusinessView ? apiGetInvoicesForBusiness(id) : apiGetInvoicesForClient(id),
        apiGetNotes(id),
        isBusinessView ? apiGetClientBusinessBalancesByBusiness(id) : apiGetClientBusinessBalancesByClient(id),
      ]);

      fetchedItem = fetchedItemDoc;
      sales = fetchedSales;
      invoices = fetchedInvoices;

      if (fetchedItem) {
        if (isBusinessView) {
          let business = fetchedItem as Business;
          const saleClientIds = [...new Set(sales.map(s => s.clientId).filter(Boolean))];
          const linkedBefore = business.linkedClientIds || [];
          const missingFromSales = saleClientIds.filter(cid => !linkedBefore.includes(cid));
          if (missingFromSales.length > 0) {
            try {
              const repaired = await apiRepairBusinessClientLinksFromSales(id);
              if (repaired.length > 0) {
                const refreshed = await apiGetBusinessById(id);
                if (refreshed) {
                  business = refreshed;
                  fetchedItem = refreshed;
                }
                addNotification(`Restored ${repaired.length} missing client link(s) from sales history.`, 'success');
              }
            } catch (repairErr) {
              console.warn('Failed to repair business client links from sales:', repairErr);
            }
          }
          const linkedClients = await apiGetClientsByIds(business.linkedClientIds || []);
          setAllClients(linkedClients);
          setAllBusinesses([business]);
          setItem(business);
          payments = await apiGetPaymentsForBusiness(id);
        } else {
          const client = fetchedItem as Client;
          const linkedBusinesses = await apiGetBusinessesByIds(client.linkedBusinessIds || []);
          setAllClients([client]);
          setAllBusinesses(linkedBusinesses);
          payments = await apiGetPaymentsForClient(id);
        }
      } else {
        setAllClients([]);
        setAllBusinesses([]);
      }

      setAllInvoices(fetchedInvoices);
      setAllSales(fetchedSales);
      setAllQuotations([]);
      setNotes(fetchedNotes);
      setOpeningBalanceRecords(fetchedOpeningBalances.filter(r => (r.openingBalance ?? 0) !== 0));

      setIsLoading(false);

      Promise.all([
        apiGetUsers(),
        apiGetCashAccounts(),
        apiGetPaymentMethodSettings(),
        apiGetServices(),
        apiGetCampaignObjectiveSettings(),
        apiGetCompanyProfile(),
      ]).then(([fetchedUsers, fetchedCashAccounts, fetchedPaymentMethods, fServices, fCampObjs, fetchedCompanyProfile]) => {
        setUsers(fetchedUsers);

        const cashAccountMethods: PaymentMethodSetting[] = fetchedCashAccounts
          .filter((acc: { isActive?: boolean }) => acc.isActive)
          .map((acc: { id: string; name: string; accountNumber?: string; phoneNumber?: string; isActive?: boolean; showInPublic?: boolean; logoUrl?: string; qrCodeUrl?: string }) => ({
            id: acc.id,
            name: acc.name,
            accountNumber: acc.accountNumber || acc.phoneNumber || '',
            isActive: acc.isActive,
            showInPublic: acc.showInPublic,
            logoUrl: acc.logoUrl,
            qrCodeUrl: acc.qrCodeUrl,
          }));

        const allMethods = [...cashAccountMethods, ...fetchedPaymentMethods.filter(pm => pm.isActive)];
        setPaymentMethods(allMethods);
        setCashAccounts(fetchedCashAccounts);
        setAllServices(fServices);
        setCampaignObjectives(fCampObjs);
        setCompanyProfile(fetchedCompanyProfile);
      }).catch(error => {
        console.error("Failed to load secondary data:", error);
      });

      setItem(fetchedItem);
      setClientOrBusinessPayments(payments);
      
      // Outstanding balance: use stored balance from Firebase (client_business_balances)
      // Same source as Record Payment modal so detail page and modal always match
      let outstandingBalance = 0;
      if (fetchedItem) {
        if (isBusinessView) {
          const cbbList = await apiGetClientBusinessBalancesByBusiness(fetchedItem.id);
          outstandingBalance = cbbList.reduce((s, cbb) => s + (cbb.openingBalance ?? 0) + (cbb.balance ?? 0), 0);
        } else {
          outstandingBalance = await apiGetClientTotalBalance(fetchedItem.id);
        }
      }
      
      // Only count APPROVED payments (PENDING payments don't affect balances until approved)
      const totalPaid = payments
        .filter(p => p.status === PaymentStatus.APPROVED && !p.refundId) // Exclude refunded payments
        .reduce((sum, p) => sum + p.amountMMK, 0);

      // Load refunds, credit notes, balance adjustments in background; compute balanceData when complete
      Promise.all([
        isBusinessView ? apiGetRefundsForBusiness(id) : apiGetRefundsForClient(id),
        isBusinessView ? apiGetCreditNotesForBusiness(id) : apiGetCreditNotesForClient(id),
        isBusinessView ? apiGetBalanceAdjustmentsForBusiness(id) : apiGetBalanceAdjustmentsForClient(id),
      ]).then(([fetchedRefunds, fetchedCreditNotes, fetchedBalanceAdjustments]) => {
        setClientRefunds(fetchedRefunds);
        setClientCreditNotes(fetchedCreditNotes);
        setClientBalanceAdjustments(fetchedBalanceAdjustments);
        const sumSales = sales
          .filter((s): s is SaleRecord => s.status !== SaleStatus.DRAFT)
          .reduce((sum, s) => sum + (s.grandTotalMMK || 0), 0);
        const sumCreditNotes = fetchedCreditNotes.filter(cn => cn.status === CreditNoteStatus.APPROVED).reduce((sum, cn) => sum + cn.amountMMK, 0);
        const sumRefunds = fetchedRefunds.reduce((sum, r) => sum + r.amountMMK, 0);
        const sumAdjInc = fetchedBalanceAdjustments.filter(adj => adj.type === BalanceAdjustmentType.INCREASE).reduce((sum, adj) => sum + (adj.amountMMK || 0), 0);
        const sumAdjDec = fetchedBalanceAdjustments.filter(adj => adj.type === BalanceAdjustmentType.DECREASE).reduce((sum, adj) => sum + (adj.amountMMK || 0), 0);
        const totalOpeningFromCBB = fetchedOpeningBalances.reduce((s, cbb) => s + (cbb.openingBalance ?? 0), 0);
        const totalBilled = totalOpeningFromCBB + sumSales + sumAdjInc - sumCreditNotes - sumAdjDec - sumRefunds;
        setBalanceData({ totalBilled, totalPaid, outstanding: outstandingBalance });
      }).catch(err => console.warn('Failed to load refunds/credits/adjustments:', err));

      // Set totalPaid and outstanding immediately; totalBilled comes from background callback
      setBalanceData(prev => ({ ...prev, totalPaid, outstanding: outstandingBalance }));

      const history: PurchaseHistoryItem[] = [];
      const records: Array<{ type: 'Sale' | 'Invoice' | 'Quotation'; record: SaleRecord | Invoice | Quotation }> = [];
      
      sales.forEach(s => {
        history.push({
        id: s.id, date: s.createdAt, service: `Sale: ${s.id}`, amount: s.grandTotalMMK, status: s.status, type: 'Sale'
        });
        records.push({ type: 'Sale', record: s });
      });
      invoices.forEach(i => {
        history.push({
        id: i.id, date: i.issueDate, service: `Invoice: ${i.id}`, amount: i.grandTotal, status: i.status, type: 'Invoice'
        });
        records.push({ type: 'Invoice', record: i });
      });
      
      history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      records.sort((a,b) => {
        try {
          let dateA: string;
          let dateB: string;
          
          if (a.type === 'Sale') {
            dateA = (a.record as SaleRecord)?.createdAt || (a.record as SaleRecord)?.updatedAt || new Date().toISOString();
          } else if (a.type === 'Quotation') {
            dateA = (a.record as Quotation)?.issueDate || new Date().toISOString();
          } else {
            dateA = (a.record as Invoice)?.issueDate || new Date().toISOString();
          }
          
          if (b.type === 'Sale') {
            dateB = (b.record as SaleRecord)?.createdAt || (b.record as SaleRecord)?.updatedAt || new Date().toISOString();
          } else if (b.type === 'Quotation') {
            dateB = (b.record as Quotation)?.issueDate || new Date().toISOString();
          } else {
            dateB = (b.record as Invoice)?.issueDate || new Date().toISOString();
          }
          
          const timeA = new Date(dateA).getTime();
          const timeB = new Date(dateB).getTime();
          
          // Handle invalid dates
          if (isNaN(timeA) && isNaN(timeB)) return 0;
          if (isNaN(timeA)) return 1;
          if (isNaN(timeB)) return -1;
          
          return timeB - timeA;
        } catch (error) {
          console.error('Error sorting records:', error, a, b);
          return 0;
        }
      });
      setPurchaseHistory(history);
      setPurchaseHistoryRecords(records);
      
      // Set default date range to last 30 days if not set
      if (!salesRecordsStartDate && !salesRecordsEndDate) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        setSalesRecordsEndDate(getDateInYangonTimezone(endDate));
        setSalesRecordsStartDate(getDateInYangonTimezone(startDate));
      }
      
      if (!documentsStartDate && !documentsEndDate) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        setDocumentsEndDate(getDateInYangonTimezone(endDate));
        setDocumentsStartDate(getDateInYangonTimezone(startDate));
      }
      
      if (!paymentsStartDate && !paymentsEndDate) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        setPaymentsEndDate(getDateInYangonTimezone(endDate));
        setPaymentsStartDate(getDateInYangonTimezone(startDate));
      }

    } catch (error) {
      console.error("Failed to fetch item details:", error);
      addNotification("Failed to load details.", "error");
    }
    setIsLoading(false);
  }, [id, isBusinessView, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!id || isBusinessView) return;
        apiGetMergeSnapshotsForClient(id).then(setMergeSnapshots).catch(() => setMergeSnapshots([]));
    }, [id, isBusinessView]);

    useEffect(() => {
        if (!id || !isBusinessView) return;
        apiGetMergeSnapshotsForBusiness(id).then(setBusinessMergeSnapshots).catch(() => setBusinessMergeSnapshots([]));
    }, [id, isBusinessView]);

    // Listen for global refresh events (debounced)
    useEffect(() => {
        return subscribeRefreshData(() => {
            fetchData();
        });
    }, [fetchData]);

  useEffect(() => {
    if (
      isRecordPaymentModalOpen ||
      isAddSaleModalOpen ||
      isRecordCreditNoteModalOpen ||
      isEditBusinessModalOpen ||
      isEditClientModalOpen
    ) {
      void ensureModalCatalogData();
    }
  }, [
    isRecordPaymentModalOpen,
    isAddSaleModalOpen,
    isRecordCreditNoteModalOpen,
    isEditBusinessModalOpen,
    isEditClientModalOpen,
    ensureModalCatalogData,
  ]);

  useEffect(() => {
    if (isMergeClientsModalOpen && !isBusinessView) {
      void apiGetClients().then(setAllClients);
    }
  }, [isMergeClientsModalOpen, isBusinessView]);

  useEffect(() => {
    if (isMergeBusinessesModalOpen && isBusinessView) {
      void apiGetBusinesses().then(setAllBusinesses);
    }
  }, [isMergeBusinessesModalOpen, isBusinessView]);

  useEffect(() => {
    if (activeTab !== 'documents' || !id || loadedQuotationsRef.current) return;
    loadedQuotationsRef.current = true;
    const load = isBusinessView ? apiGetQuotationsForBusiness(id) : apiGetQuotationsForClient(id);
    load
      .then(applyQuotationsToHistory)
      .catch((err) => {
        loadedQuotationsRef.current = false;
        console.warn('Failed to load quotations:', err);
      });
  }, [activeTab, id, isBusinessView, applyQuotationsToHistory]);

  // Defer bad debts & allowance until those tabs — also load when Sales & Credits is open so PDF download includes them
  useEffect(() => {
    if (!id) return;
    const loadBadDebts = activeTab === 'badDebts' || activeTab === 'salesRecords';
    const loadAllowance = activeTab === 'allowanceProvisions' || activeTab === 'salesRecords';
    if (loadBadDebts && !loadedBadDebtsRef.current) {
      loadedBadDebtsRef.current = true;
      (isBusinessView ? apiGetBadDebtsForBusiness(id) : apiGetBadDebtsForClient(id)).then(setClientBadDebts).catch(() => {});
    }
    if (loadAllowance && !loadedAllowanceProvisionsRef.current) {
      loadedAllowanceProvisionsRef.current = true;
      (isBusinessView ? apiGetAllowanceProvisionsForBusiness(id) : apiGetAllowanceProvisionsForClient(id)).then(setClientAllowanceProvisions).catch(() => {});
    }
  }, [id, isBusinessView, activeTab]);

  // Permission check for approving sales
  const canApproveSales = hasPermission(Permission.CHECK_SALE_RECORD);
  const canApproveCreditNotes = hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE);
  const canEditThisSale = (sale: SaleRecord) => hasPermission(Permission.EDIT_ALL_SALE_RECORDS) || (hasPermission(Permission.EDIT_SALE_RECORD) && sale?.inChargeUserId === loggedInUser?.id);
  const canDeleteSales = (sale: SaleRecord) => hasPermission(Permission.DELETE_ALL_SALE_RECORDS) || (hasPermission(Permission.DELETE_SALE_RECORD) && sale?.inChargeUserId === loggedInUser?.id);
  const canDeleteCreditNotes = hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE);
  /** Legacy Firestore values may use "Checked" like approved sales; treat as approved for delete/edit selection. */
  const creditNoteIsApprovedLike = (status: CreditNote['status'] | string) =>
    status === CreditNoteStatus.APPROVED || status === 'Checked';
  const creditNoteCanBeDeleted = (cn: CreditNote) =>
    cn.status === CreditNoteStatus.PENDING || creditNoteIsApprovedLike(cn.status);
  const creditNoteRowSelectable = (cn: CreditNote) =>
    (cn.status === CreditNoteStatus.PENDING && canApproveCreditNotes) ||
    (canDeleteCreditNotes && creditNoteCanBeDeleted(cn));
  const canEditClient = hasPermission(Permission.EDIT_CLIENT);
  const canEditBusiness = hasPermission(Permission.EDIT_BUSINESS);
  const canMergeClients = hasPermission(Permission.MERGE_CLIENTS) || hasPermission(Permission.DELETE_CLIENT);
  const canMergeBusinesses = hasPermission(Permission.MERGE_BUSINESSES) || hasPermission(Permission.DELETE_BUSINESS);
  const canManagePayments = hasPermission(Permission.MANAGE_PAYMENTS_RECEIPTS);
  const canEditPayments = canManagePayments
    || (!isBusinessView && canEditClient)
    || (isBusinessView && canEditBusiness);

  const linkedClientsKeyForBusiness = useMemo(() => {
    if (!isBusinessView || !item || !('linkedClientIds' in item)) return '';
    return JSON.stringify([...((item as Business).linkedClientIds || [])].sort());
  }, [isBusinessView, item]);

  const mergeableBusinessesList = useMemo(() => {
    if (!linkedClientsKeyForBusiness) return [];
    return allBusinesses.filter(b => JSON.stringify([...(b.linkedClientIds || [])].sort()) === linkedClientsKeyForBusiness);
  }, [allBusinesses, linkedClientsKeyForBusiness]);


  // Handle individual sale approval
  const handleStatusChange = async (sale: SaleRecord, newStatus: SaleStatus) => {
    if (!canApproveSales) {
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

  const handleApproveCreditNote = async (creditNote: CreditNote) => {
    if (!canApproveCreditNotes) {
      addNotification("You don't have permission to approve credit notes.", "error");
      return;
    }

    if (!loggedInUser) {
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
      await apiApproveCreditNote(creditNote.id, loggedInUser.id);
      addNotification(`Credit note ${creditNote.id} approved successfully.`, "success");
      fetchData();
    } catch (error) {
      addNotification(`Failed to approve credit note: ${(error as Error).message}`, "error");
    }
  };


  // Handle bulk approval of selected payments
  const handleBulkApprovePayments = async () => {
    if (!loggedInUser) {
      addNotification("You must be logged in to approve payments.", "error");
      return;
    }

    const pendingPayments = Array.from(selectedPaymentIds)
      .map(id => clientOrBusinessPayments.find(p => p.id === id))
      .filter((p): p is Payment => p !== undefined && p.status === PaymentStatus.PENDING);
    
    if (pendingPayments.length === 0) {
      addNotification("No pending payments selected. Only pending payments can be approved.", "error");
      return;
    }
    
    const confirmed = await showConfirmation({
      title: 'Approve Payments',
      message: `Are you sure you want to approve ${pendingPayments.length} selected payment(s)?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      confirmVariant: 'success',
    });
    
    if (!confirmed) return;
    
    try {
      await Promise.all(pendingPayments.map(p => apiApprovePayment(p.id, loggedInUser.id)));
      addNotification(`${pendingPayments.length} payment(s) approved successfully.`, "success");
      setSelectedPaymentIds(new Set());
      fetchData();
    } catch (error) {
      addNotification(`Failed to approve payments: ${(error as Error).message}`, "error");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmed = await showConfirmation({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record? This will update client balances and cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeletePayment(paymentId);
        addNotification('Payment deleted successfully.', 'success');
        setEditingPayment(null);
        fetchData();
      } catch (error) {
        addNotification(`Failed to delete payment: ${(error as Error).message}`, 'error');
      }
    }
  };

  // Handle bulk approval of selected draft sales
  const handleBulkApprove = async () => {
    if (!canApproveSales && !canApproveCreditNotes) {
      addNotification("You don't have permission to approve sales or credit notes.", "error");
      return;
    }

    const selectedSales = filteredSalesRecords
      .filter(entry => {
        if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
        const sale = entry.sale;
        return selectedSalesRecordIds.has(entry.id) && sale && sale.status === SaleStatus.DRAFT;
      })
      .map(entry => entry.sale)
      .filter((sale): sale is SaleRecord => sale !== null && sale !== undefined);

    const selectedCreditNotes = filteredSalesRecords
      .filter(entry => {
        if (!(entry as any).isCreditNote || !(entry as any).creditNote) return false;
        const creditNote = (entry as any).creditNote as CreditNote;
        return selectedSalesRecordIds.has(entry.id) && creditNote.status === CreditNoteStatus.PENDING;
      })
      .map(entry => (entry as any).creditNote as CreditNote)
      .filter((cn): cn is CreditNote => cn !== null && cn !== undefined);

    if (selectedSales.length === 0 && selectedCreditNotes.length === 0) {
      addNotification("No draft sales or pending credit notes selected.", "error");
      return;
    }

    const salesCount = selectedSales.length;
    const creditNotesCount = selectedCreditNotes.length;
    let message = '';
    if (salesCount > 0 && creditNotesCount > 0) {
      message = `Are you sure you want to approve ${salesCount} sale(s) and ${creditNotesCount} credit note(s)?`;
    } else if (salesCount > 0) {
      message = `Are you sure you want to approve ${salesCount} sale(s)?`;
    } else {
      message = `Are you sure you want to approve ${creditNotesCount} credit note(s)?`;
    }

    const confirmed = await showConfirmation({
      title: 'Approve',
      message,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });

    if (!confirmed) return;

    try {
      const promises: Promise<any>[] = [];
      
      // Approve sales (filter out any with missing id to avoid Firestore empty path error)
      const salesToApprove = selectedSales.filter(s => s?.id?.trim?.());
      if (salesToApprove.length > 0 && canApproveSales) {
        promises.push(...salesToApprove.map(sale => 
          apiUpdateSaleRecord({
            id: sale.id,
            status: SaleStatus.CHECKED,
          })
        ));
      }
      
      // Approve credit notes
      if (selectedCreditNotes.length > 0 && canApproveCreditNotes) {
        promises.push(...selectedCreditNotes.map(creditNote => 
          apiApproveCreditNote(creditNote.id, loggedInUser!.id)
        ));
      }
      
      await Promise.all(promises);
      
      let successMessage = '';
      if (salesCount > 0 && creditNotesCount > 0) {
        successMessage = `${salesCount} sale(s) and ${creditNotesCount} credit note(s) approved successfully.`;
      } else if (salesCount > 0) {
        successMessage = `${salesCount} sale(s) approved successfully.`;
      } else {
        successMessage = `${creditNotesCount} credit note(s) approved successfully.`;
      }
      
      addNotification(successMessage, "success");
      setSelectedSalesRecordIds(new Set());
      fetchData();
    } catch (error) {
      addNotification(`Failed to approve: ${(error as Error).message}`, "error");
    }
  };

  const handleApproveAllFilteredDraftsAndPending = async () => {
    if (!canApproveSales && !canApproveCreditNotes) {
      addNotification("You don't have permission to approve sales or credit notes.", "error");
      return;
    }

    const draftSales = filteredSalesRecords
      .filter(entry => {
        if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
        return entry.sale && entry.sale.status === SaleStatus.DRAFT;
      })
      .map(entry => entry.sale!)
      .filter((sale): sale is SaleRecord => !!sale?.id);

    const pendingCreditNotes = filteredSalesRecords
      .filter(entry => {
        if (!(entry as any).isCreditNote || !(entry as any).creditNote) return false;
        return (entry as any).creditNote.status === CreditNoteStatus.PENDING;
      })
      .map(entry => (entry as any).creditNote as CreditNote)
      .filter((cn): cn is CreditNote => !!cn?.id);

    if (draftSales.length === 0 && pendingCreditNotes.length === 0) {
      addNotification("No draft sales or pending credit notes in the current filter.", "info");
      return;
    }

    const salesCount = canApproveSales ? draftSales.length : 0;
    const creditNotesCount = canApproveCreditNotes ? pendingCreditNotes.length : 0;
    if (salesCount === 0 && creditNotesCount === 0) {
      addNotification("You don't have permission to approve the available records.", "error");
      return;
    }

    let message = '';
    if (salesCount > 0 && creditNotesCount > 0) {
      message = `Approve all ${salesCount} draft sale(s) and ${creditNotesCount} pending credit note(s) in the current filter?`;
    } else if (salesCount > 0) {
      message = `Approve all ${salesCount} draft sale(s) in the current filter?`;
    } else {
      message = `Approve all ${creditNotesCount} pending credit note(s) in the current filter?`;
    }

    const confirmed = await showConfirmation({
      title: 'Approve All Drafts',
      message,
      confirmText: 'Approve All',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });

    if (!confirmed) return;

    try {
      const promises: Promise<any>[] = [];
      if (salesCount > 0) {
        promises.push(...draftSales.map(sale =>
          apiUpdateSaleRecord({ id: sale.id, status: SaleStatus.CHECKED })
        ));
      }
      if (creditNotesCount > 0) {
        promises.push(...pendingCreditNotes.map(cn =>
          apiApproveCreditNote(cn.id, loggedInUser!.id)
        ));
      }
      await Promise.all(promises);
      addNotification(`${salesCount + creditNotesCount} record(s) approved successfully.`, "success");
      setSelectedSalesRecordIds(new Set());
      fetchData();
    } catch (error) {
      addNotification(`Failed to approve: ${(error as Error).message}`, "error");
    }
  };

  const handleBulkDeleteSalesAndCreditNotes = async () => {
    if (!canDeleteSales({} as SaleRecord) && !canDeleteCreditNotes) {
      addNotification("You don't have permission to delete sales or credit notes.", "error");
      return;
    }

    const salesToDelete = filteredSalesRecords
      .filter(entry => {
        if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
        const sale = entry.sale;
        return sale && selectedSalesRecordIds.has(entry.id) && canDeleteSales(sale) && !salesWithInvoices.has(entry.id);
      })
      .map(entry => entry.sale!)
      .filter((s): s is SaleRecord => s !== null && s !== undefined);

    const creditNotesToDelete = filteredSalesRecords
      .filter(entry => {
        if (!(entry as any).isCreditNote || !(entry as any).creditNote) return false;
        const creditNote = (entry as any).creditNote as CreditNote;
        return selectedSalesRecordIds.has(entry.id) && canDeleteCreditNotes &&
          creditNoteCanBeDeleted(creditNote);
      })
      .map(entry => (entry as any).creditNote as CreditNote)
      .filter((cn): cn is CreditNote => cn !== null && cn !== undefined);

    if (salesToDelete.length === 0 && creditNotesToDelete.length === 0) {
      addNotification("No deletable sales or credit notes selected.", "error");
      return;
    }

    const salesCount = salesToDelete.length;
    const creditNotesCount = creditNotesToDelete.length;
    let message = '';
    if (salesCount > 0 && creditNotesCount > 0) {
      message = `Are you sure you want to delete ${salesCount} sale(s) and ${creditNotesCount} credit note(s)? This cannot be undone.`;
    } else if (salesCount > 0) {
      message = `Are you sure you want to delete ${salesCount} sale(s)? This cannot be undone.`;
    } else {
      message = `Are you sure you want to delete ${creditNotesCount} credit note(s)? This cannot be undone.`;
    }

    const confirmed = await showConfirmation({
      title: 'Delete Selected',
      message,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });

    if (!confirmed) return;

    try {
      const promises: Promise<any>[] = [];
      if (salesToDelete.length > 0) {
        promises.push(...salesToDelete.map(sale => apiDeleteSaleRecord(sale.id)));
      }
      if (creditNotesToDelete.length > 0) {
        promises.push(...creditNotesToDelete.map(cn => apiDeleteCreditNote(cn.id)));
      }
      await Promise.all(promises);

      let successMessage = '';
      if (salesCount > 0 && creditNotesCount > 0) {
        successMessage = `Deleted ${salesCount} sale(s) and ${creditNotesCount} credit note(s) successfully.`;
      } else if (salesCount > 0) {
        successMessage = `Deleted ${salesCount} sale(s) successfully.`;
      } else {
        successMessage = `Deleted ${creditNotesCount} credit note(s) successfully.`;
      }
      addNotification(successMessage, "success");
      setSelectedSalesRecordIds(new Set());
      fetchData();
    } catch (error) {
      addNotification(`Failed to delete: ${(error as Error).message}`, "error");
    }
  };

  // Get campaign start date for sales (display in Date column)
  const getCampaignStartDate = (sale: SaleRecord): string | undefined => {
    if (sale.type === 'Facebook Ads') return (sale as FacebookAdsSaleRecord).startDate;
    if (sale.type === 'Other Services') return (sale as OtherServicesSaleRecord).saleDate;
    return undefined;
  };

  // Detailed Sales & Credits with item information
  const detailedSalesRecords = useMemo(() => {
    if (!purchaseHistoryRecords || purchaseHistoryRecords.length === 0) return [];
    
    return purchaseHistoryRecords
      .filter(r => r && r.type === 'Sale' && r.record)
      .map(r => {
        try {
          const sale = r.record as SaleRecord;
          if (!sale || !sale.id) return null;
          
          const service = allServices.find(s => s && s.id === sale.serviceId);
          const serviceName = service?.name || sale.type || 'Unknown Service';
          const items: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            total: number;
            isBudget?: boolean;
          }> = [];

          if (sale.type === 'Facebook Ads') {
            const fbSale = sale as FacebookAdsSaleRecord;
            const quantity = fbSale.actualSpendUSD || fbSale.budgetUSD || 1;
            items.push({
              description: `${serviceName} - ${fbSale.campaignName || 'N/A'} (${fbSale.campaignObjective || 'N/A'})`,
              quantity: quantity,
              unitPrice: fbSale.serviceRateMMK || 0,
              total: fbSale.grandTotalMMK || 0,
              isBudget: true
            });
          } else if (sale.type === 'Other Services') {
            const otherSale = sale as OtherServicesSaleRecord;

            if (isBoostingService(service)) {
              const linkedInvoice = sale.invoiceId ? allInvoices.find(inv => inv.id === sale.invoiceId) : undefined;
              const matchedItem = linkedInvoice?.items?.find(item =>
                (item as { serviceId?: string }).serviceId === sale.serviceId ||
                (item.description || '').toLowerCase().includes(serviceName.toLowerCase())
              );
              const line = matchedItem
                ? normalizeBoostingLineItem(matchedItem, { grandTotalMMK: otherSale.grandTotalMMK, serviceRateMMK: service?.serviceRateMMK ?? service?.unitPriceMMK })
                : buildBoostingLineFromSale(otherSale, service, serviceName);
              items.push({
                description: line.description,
                quantity: line.quantityUsd,
                unitPrice: line.unitPriceMMK,
                total: line.totalMMK,
                isBudget: true,
              });
            } else {
              items.push({
                description: serviceName,
                quantity: otherSale.quantity || 0,
                unitPrice: otherSale.unitPriceMMK || 0,
                total: otherSale.grandTotalMMK || 0,
              });
            }
          }

          const displayDate = getCampaignStartDate(sale) || sale.createdAt || sale.updatedAt || new Date().toISOString();
          return {
            sale,
            items,
            date: displayDate,
            id: sale.id,
            status: (sale.status === SaleStatus.CHECKED ? 'Approved' : sale.status) || 'Pending', // Normalize "Checked" to "Approved"
            grandTotal: sale.grandTotalMMK || 0
          };
        } catch (error) {
          console.error('Error processing sale record:', error, r);
          return null;
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [purchaseHistoryRecords, allServices]);

  // Get set of sale IDs that already have invoices
  const salesWithInvoices = useMemo(() => {
    const saleIds = new Set<string>();
    allInvoices.forEach(inv => {
      if (inv.saleRecordId) saleIds.add(inv.saleRecordId);
    });
    detailedSalesRecords.forEach(entry => {
      if (entry.sale?.id && entry.sale.invoiceId) saleIds.add(entry.sale.id);
    });
    return saleIds;
  }, [allInvoices, detailedSalesRecords]);

  // Find Facebook & TikTok Boosting services by service code
  // S_001: Facebook Boosting, S_002: TikTok Boosting
  const facebookBoostingService = useMemo(() => {
    return allServices.find(s => s.id === 'S_001');
  }, [allServices]);

  const tiktokBoostingService = useMemo(() => {
    return allServices.find(s => s.id === 'S_002');
  }, [allServices]);

  // Helper: when linkedBusinessFilterIds is empty = all pass; when non-empty = only selected businesses pass
  const passesLinkedBusinessFilter = useCallback((businessId: string | undefined, isClientWidePayment = false): boolean => {
    if (isClientWidePayment || !businessId) return true; // Client-wide payments always visible on client detail
    if (linkedBusinessFilterIds.size === 0) return true;
    return linkedBusinessFilterIds.has(businessId);
  }, [linkedBusinessFilterIds]);

  // Filtered Sales & Credits - with service filtering
  const filteredSalesRecords = useMemo(() => {
    let filtered = detailedSalesRecords.filter(entry => {
      if (!entry || !entry.date) return false;

      // Linked Business filter (only when viewing a client)
      if (!isBusinessView && !passesLinkedBusinessFilter(entry.sale?.businessId)) {
        return false;
      }
      
      // Service filter (Facebook Boosting vs TikTok Boosting vs Other Services)
      if (salesRecordsSubTab !== 'all') {
        const service = allServices.find(s => s.id === entry.sale.serviceId);
        const isFacebookBoosting = facebookBoostingService && service?.id === facebookBoostingService.id;
        const isTikTokBoosting = tiktokBoostingService && service?.id === tiktokBoostingService.id;
        
        if (salesRecordsSubTab === 'facebookBoosting' && !isFacebookBoosting) {
          return false;
        }
        if (salesRecordsSubTab === 'tiktokBoosting' && !isTikTokBoosting) {
          return false;
        }
        if (salesRecordsSubTab === 'otherServices' && (isFacebookBoosting || isTikTokBoosting)) {
          return false;
        }
      }
      
      // Date filter
      if (salesRecordsStartDate || salesRecordsEndDate) {
        const entryDate = new Date(entry.date);
        if (isNaN(entryDate.getTime())) return false;
        
        if (salesRecordsStartDate) {
          const start = new Date(salesRecordsStartDate);
          start.setHours(0, 0, 0, 0);
          if (entryDate < start) return false;
        }
        if (salesRecordsEndDate) {
          const end = new Date(salesRecordsEndDate);
          end.setHours(23, 59, 59, 999);
          if (entryDate > end) return false;
        }
      }
      
      // Status filter - normalize "Checked" to "Approved" for comparison
      if (salesRecordsStatusFilter !== 'All') {
        const normalizedEntryStatus = entry.status === 'Checked' ? 'Approved' : entry.status;
        const normalizedFilterStatus = salesRecordsStatusFilter === 'Checked' ? 'Approved' : salesRecordsStatusFilter;
        if (normalizedEntryStatus !== normalizedFilterStatus) {
          return false;
        }
      }
      
      return true;
    });

    // Add refunds to the list (only for current client/business)
    const refundsAsRecords = clientRefunds
      .filter(refund => {
        // Linked Business filter (only when viewing a client)
        if (!isBusinessView && !passesLinkedBusinessFilter(refund.businessId)) {
          return false;
        }
        
        // Filter refunds by service sub-tab
        if (salesRecordsSubTab !== 'all') {
          const isFacebookBoostingRefund = !!(refund.serviceId && facebookBoostingService && refund.serviceId === facebookBoostingService.id);
          const isTikTokBoostingRefund = !!(refund.serviceId && tiktokBoostingService && refund.serviceId === tiktokBoostingService.id);
          if (salesRecordsSubTab === 'facebookBoosting' && !isFacebookBoostingRefund) return false;
          if (salesRecordsSubTab === 'tiktokBoosting' && !isTikTokBoostingRefund) return false;
          if (salesRecordsSubTab === 'otherServices' && (isFacebookBoostingRefund || isTikTokBoostingRefund)) return false;
        }
        
        // Date filter
        if (salesRecordsStartDate || salesRecordsEndDate) {
          const refundDate = new Date(refund.refundDate);
          if (isNaN(refundDate.getTime())) return false;
          
          if (salesRecordsStartDate) {
            const start = new Date(salesRecordsStartDate);
            start.setHours(0, 0, 0, 0);
            if (refundDate < start) return false;
          }
          if (salesRecordsEndDate) {
            const end = new Date(salesRecordsEndDate);
            end.setHours(23, 59, 59, 999);
            if (refundDate > end) return false;
          }
        }
        
        // Status filter - normalize "Checked" to "Approved" for comparison
        if (salesRecordsStatusFilter !== 'All') {
          const normalizedRefundStatus = refund.status === 'Checked' ? 'Approved' : refund.status;
          const normalizedFilterStatus = salesRecordsStatusFilter === 'Checked' ? 'Approved' : salesRecordsStatusFilter;
          if (normalizedRefundStatus !== normalizedFilterStatus) {
            return false;
          }
        }
        
        return true;
      })
      .map(refund => ({
        id: refund.id,
        date: (refund as any).createdAt || refund.refundDate, // Use createdAt for proper timestamp sorting
        status: refund.status,
        grandTotal: -refund.amountMMK, // Negative to show as reduction
        sale: null,
        items: [{
          description: refund.serviceId 
            ? `${allServices.find(s => s.id === refund.serviceId)?.name || 'Unknown Service'} - Refund${refund.totalUSD && refund.rate ? ` (${refund.totalUSD} USD × ${refund.rate.toLocaleString()} MMK/USD)` : ''}`
            : 'Refund',
          quantity: 1,
          unitPrice: -refund.amountMMK,
          total: -refund.amountMMK
        }],
        isRefund: true,
        refund
      }));

    // Add credit notes to the list (only for current client/business)
    const creditNotesAsRecords = clientCreditNotes
      .filter(creditNote => {
        // Linked Business filter (only when viewing a client)
        if (!isBusinessView && !passesLinkedBusinessFilter(creditNote.businessId)) {
          return false;
        }
        
        // Filter credit notes by service sub-tab
        if (salesRecordsSubTab !== 'all') {
          const isFacebookBoostingCreditNote = !!(creditNote.serviceId && facebookBoostingService && creditNote.serviceId === facebookBoostingService.id);
          const isTikTokBoostingCreditNote = !!(creditNote.serviceId && tiktokBoostingService && creditNote.serviceId === tiktokBoostingService.id);
          if (salesRecordsSubTab === 'facebookBoosting' && !isFacebookBoostingCreditNote) return false;
          if (salesRecordsSubTab === 'tiktokBoosting' && !isTikTokBoostingCreditNote) return false;
          if (salesRecordsSubTab === 'otherServices' && (isFacebookBoostingCreditNote || isTikTokBoostingCreditNote)) return false;
        }
        
        // Date filter
        if (salesRecordsStartDate || salesRecordsEndDate) {
          const creditNoteDate = new Date(creditNote.creditNoteDate);
          if (isNaN(creditNoteDate.getTime())) return false;
          
          if (salesRecordsStartDate) {
            const start = new Date(salesRecordsStartDate);
            start.setHours(0, 0, 0, 0);
            if (creditNoteDate < start) return false;
          }
          if (salesRecordsEndDate) {
            const end = new Date(salesRecordsEndDate);
            end.setHours(23, 59, 59, 999);
            if (creditNoteDate > end) return false;
          }
        }
        
        // Status filter - normalize "Checked" to "Approved" for comparison
        if (salesRecordsStatusFilter !== 'All') {
          const normalizedCreditNoteStatus = creditNote.status === 'Checked' ? 'Approved' : creditNote.status;
          const normalizedFilterStatus = salesRecordsStatusFilter === 'Checked' ? 'Approved' : salesRecordsStatusFilter;
          if (normalizedCreditNoteStatus !== normalizedFilterStatus) {
            return false;
          }
        }
        
        return true;
      })
      .map(creditNote => {
        const serviceName = creditNote.serviceId
          ? (allServices.find(s => s.id === creditNote.serviceId)?.name || 'Unknown Service')
          : 'Credit Note';
        const lowerServiceName = serviceName.toLowerCase();
        const isBoostingService = lowerServiceName.includes('facebook boosting') ||
          lowerServiceName.includes('tik tok boosting') ||
          lowerServiceName.includes('tiktok boosting');
        return ({
        id: creditNote.id,
        date: (creditNote as any).createdAt || creditNote.creditNoteDate, // Use createdAt for proper timestamp sorting
        status: creditNote.status,
        grandTotal: -creditNote.amountMMK, // Negative to show as reduction
        sale: null,
        items: [{
          description: creditNote.serviceId 
            ? `${serviceName} - Credit Note${creditNote.totalUSD && creditNote.rate ? ` (${creditNote.totalUSD} USD × ${creditNote.rate.toLocaleString()} MMK/USD)` : ''}`
            : 'Credit Note',
          quantity: creditNote.totalUSD || 1,
          unitPrice: -creditNote.amountMMK,
          total: -creditNote.amountMMK,
          isBudget: isBoostingService || !!creditNote.totalUSD
        }],
        isCreditNote: true,
        creditNote
      });
      });

    // Combine and sort by date and time (using full timestamps)
    const combined = [...filtered, ...refundsAsRecords, ...creditNotesAsRecords];
    return combined.sort((a, b) => {
      // Get full timestamp for proper sorting (date + time)
      let timestampA: number;
      let timestampB: number;
      
      // For sales, use createdAt or updatedAt (full timestamp)
      if (a.sale && !(a as any).isRefund && !(a as any).isCreditNote) {
        const sale = a.sale as SaleRecord;
        const saleTimestamp = sale.createdAt || sale.updatedAt || a.date;
        timestampA = new Date(saleTimestamp).getTime();
      } else if ((a as any).isRefund && (a as any).refund) {
        // For refunds, use createdAt if available, otherwise refundDate
        const refund = (a as any).refund as Refund;
        const refundTimestamp = (refund as any).createdAt || refund.refundDate || a.date;
        timestampA = new Date(refundTimestamp).getTime();
      } else if ((a as any).isCreditNote && (a as any).creditNote) {
        // For credit notes, use createdAt if available, otherwise creditNoteDate
        const creditNote = (a as any).creditNote as CreditNote;
        const creditNoteTimestamp = (creditNote as any).createdAt || creditNote.creditNoteDate || a.date;
        timestampA = new Date(creditNoteTimestamp).getTime();
      } else {
        timestampA = new Date(a.date).getTime();
      }
      
      if (b.sale && !(b as any).isRefund && !(b as any).isCreditNote) {
        const sale = b.sale as SaleRecord;
        const saleTimestamp = sale.createdAt || sale.updatedAt || b.date;
        timestampB = new Date(saleTimestamp).getTime();
      } else if ((b as any).isRefund && (b as any).refund) {
        // For refunds, use createdAt if available, otherwise refundDate
        const refund = (b as any).refund as Refund;
        const refundTimestamp = (refund as any).createdAt || refund.refundDate || b.date;
        timestampB = new Date(refundTimestamp).getTime();
      } else if ((b as any).isCreditNote && (b as any).creditNote) {
        // For credit notes, use createdAt if available, otherwise creditNoteDate
        const creditNote = (b as any).creditNote as CreditNote;
        const creditNoteTimestamp = (creditNote as any).createdAt || creditNote.creditNoteDate || b.date;
        timestampB = new Date(creditNoteTimestamp).getTime();
      } else {
        timestampB = new Date(b.date).getTime();
      }
      
      // Handle invalid dates
      if (isNaN(timestampA) && isNaN(timestampB)) return 0;
      if (isNaN(timestampA)) return 1;
      if (isNaN(timestampB)) return -1;
      
      // Default is newest to oldest (timestampB - timestampA), toggle for oldest to newest
      return salesRecordsSortOrder === 'newest' ? timestampB - timestampA : timestampA - timestampB;
    });
  }, [detailedSalesRecords, salesRecordsStartDate, salesRecordsEndDate, salesRecordsStatusFilter, salesRecordsSubTab, allServices, facebookBoostingService, tiktokBoostingService, clientRefunds, clientCreditNotes, salesRecordsSortOrder, isBusinessView, passesLinkedBusinessFilter]);

  const filteredApprovableTotalCount = useMemo(() => {
    const draftSalesCount = filteredSalesRecords.filter(entry => {
      if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
      return entry.sale?.status === SaleStatus.DRAFT;
    }).length;
    const pendingCreditNotesCount = filteredSalesRecords.filter(entry => {
      if (!(entry as any).isCreditNote || !(entry as any).creditNote) return false;
      return (entry as any).creditNote.status === CreditNoteStatus.PENDING;
    }).length;
    return draftSalesCount + pendingCreditNotesCount;
  }, [filteredSalesRecords]);

  const classifySaleServiceCategory = useCallback((serviceId?: string, saleType?: SaleRecord['type']): SalesServiceCategory => {
    if (facebookBoostingService && serviceId === facebookBoostingService.id) return 'facebook';
    if (tiktokBoostingService && serviceId === tiktokBoostingService.id) return 'tiktok';
    if (saleType === 'Facebook Ads') return 'facebook';
    return 'other';
  }, [facebookBoostingService, tiktokBoostingService]);

  const passesSalesDateFilter = useCallback((dateStr?: string) => {
    if (!salesRecordsStartDate && !salesRecordsEndDate) return true;
    if (!dateStr) return false;
    const entryDate = new Date(dateStr);
    if (isNaN(entryDate.getTime())) return false;
    if (salesRecordsStartDate) {
      const start = new Date(salesRecordsStartDate);
      start.setHours(0, 0, 0, 0);
      if (entryDate < start) return false;
    }
    if (salesRecordsEndDate) {
      const end = new Date(salesRecordsEndDate);
      end.setHours(23, 59, 59, 999);
      if (entryDate > end) return false;
    }
    return true;
  }, [salesRecordsStartDate, salesRecordsEndDate]);

  /** Sales only — date + linked-business filters (no status/sub-tab) for Draft vs Approved breakdown. */
  const salesForCategoryKpis = useMemo(() => {
    return detailedSalesRecords.filter(entry => {
      if (!entry?.sale || !entry.date) return false;
      if (!isBusinessView && !passesLinkedBusinessFilter(entry.sale.businessId)) return false;
      return passesSalesDateFilter(entry.date);
    });
  }, [detailedSalesRecords, isBusinessView, passesLinkedBusinessFilter, passesSalesDateFilter]);

  const salesCategoryKpis = useMemo(() => {
    const stats: Record<SalesServiceCategory, CategoryKpiStats> = {
      facebook: emptyCategoryKpiStats(),
      tiktok: emptyCategoryKpiStats(),
      other: emptyCategoryKpiStats(),
    };

    salesForCategoryKpis.forEach(entry => {
      const category = classifySaleServiceCategory(entry.sale?.serviceId, entry.sale?.type);
      const amount = entry.grandTotal || 0;
      const saleStatus = entry.sale?.status ?? entry.status;
      const isApproved = saleStatus === SaleStatus.CHECKED || saleStatus === 'Approved' || saleStatus === 'Checked';
      const isDraft = saleStatus === SaleStatus.DRAFT || saleStatus === 'Draft';

      if (isApproved) {
        stats[category].approvedCount += 1;
        stats[category].approvedAmount += amount;
      } else if (isDraft) {
        stats[category].draftCount += 1;
        stats[category].draftAmount += amount;
      }
    });

    return stats;
  }, [salesForCategoryKpis, classifySaleServiceCategory]);

  /** Summary totals from fully filtered list (sub-tab + status + date + business). */
  const salesFilteredSummaryKpis = useMemo(() => {
    const salesEntries = filteredSalesRecords.filter(e => !(e as { isRefund?: boolean }).isRefund && !(e as { isCreditNote?: boolean }).isCreditNote);
    const refundEntries = filteredSalesRecords.filter(e => (e as { isRefund?: boolean }).isRefund);
    const creditNoteEntries = filteredSalesRecords.filter(e => (e as { isCreditNote?: boolean }).isCreditNote);

    const totalSales = salesEntries.reduce((sum, e) => sum + (e.grandTotal || 0), 0);
    const totalRefunds = refundEntries.reduce((sum, e) => sum + Math.abs(e.grandTotal || 0), 0);
    const totalCreditNotes = creditNoteEntries.reduce((sum, e) => sum + Math.abs(e.grandTotal || 0), 0);

    return {
      totalSales,
      totalRefunds,
      totalCreditNotes,
      netAmount: totalSales - totalRefunds - totalCreditNotes,
      recordCount: filteredSalesRecords.length,
      salesCount: salesEntries.length,
      refundCount: refundEntries.length,
      creditNoteCount: creditNoteEntries.length,
    };
  }, [filteredSalesRecords]);

  const salesKpiFilterActive = Boolean(
    salesRecordsStartDate ||
    salesRecordsEndDate ||
    salesRecordsStatusFilter !== 'All' ||
    (!isBusinessView && linkedBusinessFilterIds.size > 0) ||
    salesRecordsSubTab !== 'all'
  );

  const filteredBalanceAdjustments = useMemo(() => {
    let filtered = clientBalanceAdjustments.filter(adjustment => {
      if (!adjustment) return false;

      // Linked Business filter (only when viewing a client)
      if (!isBusinessView && !passesLinkedBusinessFilter(adjustment.businessId)) {
        return false;
      }

      // Date filter
      if (salesRecordsStartDate || salesRecordsEndDate) {
        const adjustmentDate = new Date(adjustment.adjustmentDate || adjustment.createdAt || '');
        if (isNaN(adjustmentDate.getTime())) return false;

        if (salesRecordsStartDate) {
          const start = new Date(salesRecordsStartDate);
          start.setHours(0, 0, 0, 0);
          if (adjustmentDate < start) return false;
        }
        if (salesRecordsEndDate) {
          const end = new Date(salesRecordsEndDate);
          end.setHours(23, 59, 59, 999);
          if (adjustmentDate > end) return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.adjustmentDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.adjustmentDate || b.createdAt || 0).getTime();
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return salesRecordsSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [clientBalanceAdjustments, isBusinessView, passesLinkedBusinessFilter, salesRecordsStartDate, salesRecordsEndDate, salesRecordsSortOrder]);


  // Calculate paid amounts per sale chronologically (oldest payments first)
  const salePaidAmounts = useMemo(() => {
    const paidAmounts = new Map<string, number>();
    
    if (!item) return paidAmounts;
    
    // Filter sales for this client/business
    const relevantSales = allSales.filter(sale => {
      if (!sale.id) return false;
      if (isBusinessView) {
        return sale.businessId === item.id;
      } else {
        return sale.clientId === item.id;
      }
    });
    
    // Initialize all relevant sales with 0 paid
    relevantSales.forEach(sale => {
      if (sale.id) {
        paidAmounts.set(sale.id, 0);
      }
    });
    
    // Apply approved allocations recorded on payments
    clientOrBusinessPayments
      .filter(p => 
        p.status === PaymentStatus.APPROVED && 
        !p.refundId &&
        p.saleAllocations &&
        p.saleAllocations.length > 0
      )
      .forEach(payment => {
        payment.saleAllocations?.forEach(allocation => {
          const currentPaid = paidAmounts.get(allocation.saleRecordId) || 0;
          paidAmounts.set(allocation.saleRecordId, currentPaid + (allocation.amountMMK || 0));
        });
      });
    
    // General payments: backend allocates OPENING BALANCE FIRST, then remainder to OLDEST UNPAID SALES.
    // Empty saleAllocations = entire payment went to opening (0 for sales). Non-empty = remainder went to sales.
    // Do NOT re-allocate empty-saleAllocation general payments to sales (would double-count).

    // Add direct payments (payments linked to specific sales)
    // clientOrBusinessPayments is already filtered for this client/business
    clientOrBusinessPayments
      .filter(p => 
        p.status === PaymentStatus.APPROVED && 
        !p.refundId &&
        p.saleRecordId && // Direct payments to sales
        (!p.saleAllocations || p.saleAllocations.length === 0)
      )
      .forEach(payment => {
        if (payment.saleRecordId) {
          const currentPaid = paidAmounts.get(payment.saleRecordId) || 0;
          paidAmounts.set(payment.saleRecordId, currentPaid + payment.amountMMK);
        }
      });

    return paidAmounts;
  }, [allSales, clientOrBusinessPayments, item, isBusinessView]);

  // Calculate remaining amounts per sale (only for this client/business's sales)
  const saleRemainingAmounts = useMemo(() => {
    const amounts = new Map<string, number>();
    if (!item) return amounts;
    const relevantSales = allSales.filter(sale => {
      if (!sale.id) return false;
      return isBusinessView ? sale.businessId === item.id : sale.clientId === item.id;
    });
    relevantSales.forEach(sale => {
      if (!sale.id) return;
      const paid = salePaidAmounts.get(sale.id) || 0;
      const remaining = Math.max((sale.grandTotalMMK || 0) - paid, 0);
      amounts.set(sale.id, remaining);
    });
    return amounts;
  }, [allSales, item, isBusinessView, salePaidAmounts]);

  // Filtered Documents (Invoices and Quotations)
  const filteredDocuments = useMemo(() => {
    if (!purchaseHistory || purchaseHistory.length === 0) return [];
    
    return purchaseHistory
      .filter(entry => {
        if (!entry || !entry.id) return false;
        try {
          const isInvoice = entry.type === 'Invoice';
          const isQuotation = entry.service?.startsWith('Quotation:') || false;
          return isInvoice || isQuotation;
        } catch (error) {
          console.error('Error filtering document entry:', error, entry);
          return false;
        }
      })
      .filter(entry => {
        if (!entry || !entry.date) return false;
        
        try {
          // Linked Business filter (only when viewing a client)
          if (!isBusinessView) {
            const docBusinessId = entry.service?.startsWith('Quotation:')
              ? allQuotations.find(q => q.id === entry.id)?.businessId
              : allInvoices.find(i => i.id === entry.id)?.businessId;
            if (!passesLinkedBusinessFilter(docBusinessId)) return false;
          }
          
          // Date filter
          if (documentsStartDate || documentsEndDate) {
            const entryDate = new Date(entry.date);
            if (isNaN(entryDate.getTime())) return false;
            
            if (documentsStartDate) {
              const start = new Date(documentsStartDate);
              if (isNaN(start.getTime())) return true; // If start date is invalid, don't filter
              start.setHours(0, 0, 0, 0);
              if (entryDate < start) return false;
            }
            if (documentsEndDate) {
              const end = new Date(documentsEndDate);
              if (isNaN(end.getTime())) return true; // If end date is invalid, don't filter
              end.setHours(23, 59, 59, 999);
              if (entryDate > end) return false;
            }
          }
          
          // Type filter
          if (documentsTypeFilter !== 'All') {
            const isQuotation = entry.service?.startsWith('Quotation:') || false;
            if (documentsTypeFilter === 'Invoice' && isQuotation) return false;
            if (documentsTypeFilter === 'Quotation' && !isQuotation) return false;
          }
          
          // Status filter
          if (documentsStatusFilter !== 'All' && entry.status !== documentsStatusFilter) {
            return false;
          }
          
          return true;
        } catch (error) {
          console.error('Error filtering document by date/type/status:', error, entry);
          return false;
        }
      });
  }, [purchaseHistory, documentsStartDate, documentsEndDate, documentsTypeFilter, documentsStatusFilter, isBusinessView, passesLinkedBusinessFilter, allQuotations, allInvoices]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return clientOrBusinessPayments.filter(payment => {
      // Linked Business filter (only when viewing a client)
      if (!isBusinessView && !passesLinkedBusinessFilter(payment.businessId)) {
        return false;
      }
      // Date filter
      if (paymentsStartDate || paymentsEndDate) {
        const paymentDate = new Date(payment.paymentDate);
        if (paymentsStartDate) {
          const start = new Date(paymentsStartDate);
          start.setHours(0, 0, 0, 0);
          if (paymentDate < start) return false;
        }
        if (paymentsEndDate) {
          const end = new Date(paymentsEndDate);
          end.setHours(23, 59, 59, 999);
          if (paymentDate > end) return false;
        }
      }
      
      // Method filter
      if (paymentsMethodFilter !== 'All' && payment.method !== paymentsMethodFilter) {
        return false;
      }
      
      return true;
    });
  }, [clientOrBusinessPayments, paymentsStartDate, paymentsEndDate, paymentsMethodFilter, isBusinessView, passesLinkedBusinessFilter]);

  // Filtered Opening Balance records (by Linked Business when in client view)
  const filteredOpeningBalanceRecords = useMemo(() => {
    if (!openingBalanceRecords || openingBalanceRecords.length === 0) return [];
    if (isBusinessView) return openingBalanceRecords;
    if (linkedBusinessFilterIds.size === 0) return openingBalanceRecords;
    return openingBalanceRecords.filter(rec => rec.businessId && linkedBusinessFilterIds.has(rec.businessId));
  }, [openingBalanceRecords, isBusinessView, linkedBusinessFilterIds]);

  // Filtered Bad Debts (by Linked Business when in client view)
  const filteredBadDebts = useMemo(() => {
    if (!clientBadDebts || clientBadDebts.length === 0) return [];
    if (isBusinessView) return clientBadDebts;
    return clientBadDebts.filter(bd => passesLinkedBusinessFilter(bd.businessId));
  }, [clientBadDebts, isBusinessView, passesLinkedBusinessFilter]);

  // Allowance provisions for PDF / filters (same linked-business + date rules as balance adjustments)
  const filteredAllowanceProvisions = useMemo(() => {
    if (!clientAllowanceProvisions || clientAllowanceProvisions.length === 0) return [];
    let list = isBusinessView
      ? clientAllowanceProvisions
      : clientAllowanceProvisions.filter(ap => passesLinkedBusinessFilter(ap.businessId));
    if (salesRecordsStartDate || salesRecordsEndDate) {
      list = list.filter(ap => {
        const d = new Date(ap.provisionDate);
        if (isNaN(d.getTime())) return false;
        if (salesRecordsStartDate) {
          const start = new Date(salesRecordsStartDate);
          start.setHours(0, 0, 0, 0);
          if (d < start) return false;
        }
        if (salesRecordsEndDate) {
          const end = new Date(salesRecordsEndDate);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    }
    return list;
  }, [clientAllowanceProvisions, isBusinessView, passesLinkedBusinessFilter, salesRecordsStartDate, salesRecordsEndDate]);

  /** Opening balance rows for PDF timeline (date filter on set date when range is active) */
  const openingBalanceRowsForPdf = useMemo(() => {
    const rows = filteredOpeningBalanceRecords || [];
    if (!salesRecordsStartDate && !salesRecordsEndDate) return rows;
    return rows.filter(rec => {
      const d = new Date(rec.openingBalanceSetDate || rec.createdAt || '');
      if (isNaN(d.getTime())) return false;
      if (salesRecordsStartDate) {
        const start = new Date(salesRecordsStartDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (salesRecordsEndDate) {
        const end = new Date(salesRecordsEndDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [filteredOpeningBalanceRecords, salesRecordsStartDate, salesRecordsEndDate]);

  // Opening balance from CBB for PDF (sum of pair openingBalance for filtered scope)
  const openingBalanceFromCBB = useMemo(() => {
    return (filteredOpeningBalanceRecords || []).reduce((s, r) => s + (r.openingBalance ?? 0), 0);
  }, [filteredOpeningBalanceRecords]);

  // PDF Download Handlers
  const salesRecordsPdfRef = useRef<HTMLDivElement>(null);
  const documentsPdfRef = useRef<HTMLDivElement>(null);

  // Filtered data for the hidden PDF template (driven by pdfDownloadType)
  const getFilteredPDFData = useMemo(
    () => filterSalesRecordsForPdf(filteredSalesRecords, pdfDownloadType),
    [filteredSalesRecords, pdfDownloadType]
  );

  const pdfTemplateBalanceAdjustments = useMemo(
    () => (pdfDownloadType === 'payments' || pdfDownloadType === 'sales' ? [] : filteredBalanceAdjustments),
    [pdfDownloadType, filteredBalanceAdjustments]
  );

  const pdfTemplateBadDebts = useMemo(
    () => (pdfDownloadType === 'payments' || pdfDownloadType === 'sales' ? [] : filteredBadDebts),
    [pdfDownloadType, filteredBadDebts]
  );

  const pdfTemplateOpeningBalanceRows = useMemo(
    () => (pdfDownloadType === 'payments' ? [] : openingBalanceRowsForPdf),
    [pdfDownloadType, openingBalanceRowsForPdf]
  );

  const pdfTemplateAllowanceProvisions = useMemo(
    () => (pdfDownloadType === 'payments' || pdfDownloadType === 'sales' ? [] : filteredAllowanceProvisions),
    [pdfDownloadType, filteredAllowanceProvisions]
  );

  // Payments for PDF template (paid-amount math; timeline filtering is in SalesRecordsPDFTemplate)
  const getFilteredPayments = useMemo(() => {
    let filtered = clientOrBusinessPayments.filter(p => {
      // Filter payments by date range if set
      if (salesRecordsStartDate || salesRecordsEndDate) {
        const paymentDate = new Date(p.paymentDate);
        if (salesRecordsStartDate) {
          const start = new Date(salesRecordsStartDate);
          start.setHours(0, 0, 0, 0);
          if (paymentDate < start) return false;
        }
        if (salesRecordsEndDate) {
          const end = new Date(salesRecordsEndDate);
          end.setHours(23, 59, 59, 999);
          if (paymentDate > end) return false;
        }
      }
      return true;
    });
    
    // Sort payments oldest first (consistent with data sorting)
    filtered.sort((a, b) => {
      const timestampA = new Date(a.paymentDate || a.createdAt || 0).getTime();
      const timestampB = new Date(b.paymentDate || b.createdAt || 0).getTime();
      if (isNaN(timestampA) && isNaN(timestampB)) return 0;
      if (isNaN(timestampA)) return 1;
      if (isNaN(timestampB)) return -1;
      return timestampA - timestampB; // Oldest first
    });
    
    return filtered;
  }, [clientOrBusinessPayments, salesRecordsStartDate, salesRecordsEndDate]);

  const handleDownloadSalesRecordsPDF = async (downloadType: PDFDownloadType = 'all') => {
    if (!item) return;

    setIsDownloadPDFModalOpen(false);

    flushSync(() => {
      setIsDownloadingPdf(true);
      setPdfDownloadType(downloadType);
    });

    // Wait for layout/paint after synchronous state flush
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    if (!salesRecordsPdfRef.current) {
      setIsDownloadingPdf(false);
      setPdfDownloadType('all');
      return;
    }
    
    try {
      const canvasScale = 2;
      const protectTailBelowCanvasPx = getProtectTailCanvasPx(
        salesRecordsPdfRef.current,
        '[data-pdf-protect-tail]',
        canvasScale
      );
      const canvas = await html2canvas(salesRecordsPdfRef.current, {
        scale: canvasScale,
        backgroundColor: '#ffffff',
        scrollY: 0,
        windowHeight: salesRecordsPdfRef.current.scrollHeight + 100,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      addCanvasToPdfPaginated(pdf, canvas, {
        continuationTopMm: 15,
        pageBottomMm: 10,
        protectTailBelowCanvasPx,
      });

      const typeLabel = downloadType === 'sales' ? 'Sales' : 
                       downloadType === 'salesAndCredit' ? 'Sales_Credit' :
                       downloadType === 'payments' ? 'Payments' :
                       'All';
      const fileName = `${isBusinessView ? 'Business' : 'Client'}_${item.id}_${typeLabel}_${salesRecordsStartDate || 'all'}_${salesRecordsEndDate || 'all'}.pdf`;
      pdf.save(fileName);
      addNotification("PDF downloaded successfully.", "success");
    } catch (error) {
      addNotification(`Failed to generate PDF: ${(error as Error).message}`, "error");
    } finally {
      setIsDownloadingPdf(false);
      setPdfDownloadType('all'); // Reset to default
    }
  };

  const handleDownloadDocumentsPDF = async () => {
    if (!documentsPdfRef.current || !item) return;
    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(documentsPdfRef.current, { scale: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      addCanvasToPdfPaginated(pdf, canvas, {
        continuationTopMm: 15,
        pageBottomMm: 10,
      });

      const fileName = `${isBusinessView ? 'Business' : 'Client'}_${item.id}_Documents_${documentsStartDate || 'all'}_${documentsEndDate || 'all'}.pdf`;
      pdf.save(fileName);
      addNotification("PDF downloaded successfully.", "success");
    } catch (error) {
      addNotification(`Failed to generate PDF: ${(error as Error).message}`, "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  };


  // Helper functions to get names by ID
  const getClientNameById = useCallback((cId: string): string => {
    return allClients.find(c => c.id === cId)?.name || cId;
  }, [allClients]);

  const getBusinessNameById = useCallback((bId: string): string => {
    return allBusinesses.find(b => b.id === bId)?.name || bId;
  }, [allBusinesses]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }
  
  if (!item) {
    return <div className="text-center text-text-primary p-8">{isBusinessView ? "Business" : "Client"} not found.</div>;
  }

  // Get linked items
  const linkedClients = isBusinessView && (item as Business).linkedClientIds 
    ? (item as Business).linkedClientIds.map(cId => ({ id: cId, name: getClientNameById(cId) }))
    : [];
  const linkedBusinesses = !isBusinessView && (item as Client).linkedBusinessIds
    ? (item as Client).linkedBusinessIds.map(bId => ({ id: bId, name: getBusinessNameById(bId) }))
    : [];

  return <div className="bg-app-bg dark:bg-slate-900 p-2 sm:p-6 space-y-6">
      <div className="bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">{item.name}</h1>
                <p className="text-md text-text-secondary dark:text-slate-400">{isBusinessView ? 'Business Profile' : 'Client Profile'} - ID: {item.id}</p>
                
                {/* Linked Clients/Businesses */}
                {linkedClients.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">Linked Clients:</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedClients.map((client) => (
                        <Link
                          key={client.id}
                          to={`/clients/${client.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-action dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                        >
                          <span className="font-semibold">{client.name}</span>
                          <span className="ml-2 text-xs text-text-secondary dark:text-slate-500">({client.id})</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {linkedBusinesses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">Linked Businesses:</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedBusinesses.map((business) => (
                        <Link
                          key={business.id}
                          to={`/businesses/${business.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-action dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                        >
                          <span className="font-semibold">{business.name}</span>
                          <span className="ml-2 text-xs text-text-secondary dark:text-slate-500">({business.id})</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            <div className="flex items-center space-x-3 flex-wrap gap-2">
                {!isBusinessView && (canEditClient || canMergeClients) && (
                  <>
                    {canEditClient && <Button onClick={() => setIsEditClientModalOpen(true)} variant="secondary" size="sm">Edit</Button>}
                    {canMergeClients && (
                      <>
                        <Button onClick={() => { setMergeSelectedClientIds(new Set(id ? [id] : [])); setIsMergeClientsModalOpen(true); }} variant="secondary" size="sm">Merge Clients</Button>
                        {mergeSnapshots.length > 0 && (
                          <Button onClick={() => { setSelectedUnmergeSnapshot(null); setIsUnmergeModalOpen(true); }} variant="secondary" size="sm">Unmerge</Button>
                        )}
                      </>
                    )}
                  </>
                )}
                {isBusinessView && (canEditBusiness || canMergeBusinesses) && (
                  <>
                    {canEditBusiness && (
                      <Button onClick={async () => {
                        await ensureModalCatalogData();
                        setIsEditBusinessModalOpen(true);
                      }} variant="secondary" size="sm">Edit</Button>
                    )}
                    {canMergeBusinesses && mergeableBusinessesList.length >= 2 && (
                      <Button
                        onClick={() => {
                          setMergeSelectedBusinessIds(new Set(id ? [id] : []));
                          setMergeBusinessSearchTerm('');
                          setIsMergeBusinessesModalOpen(true);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Merge Businesses
                      </Button>
                    )}
                    {canMergeBusinesses && businessMergeSnapshots.length > 0 && (
                      <Button
                        onClick={() => {
                          setSelectedUnmergeBusinessSnapshot(null);
                          setIsUnmergeBusinessModalOpen(true);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Unmerge Businesses
                      </Button>
                    )}
                  </>
                )}
                <Button onClick={() => { setEditingPayment(null); setIsRecordPaymentModalOpen(true); }} variant="success" size="sm">Record Payment</Button>
                <Button onClick={() => { setEditingCreditNote(null); setIsRecordCreditNoteModalOpen(true); }} variant="warning" size="sm">Credit Note</Button>
                <Button onClick={() => { setEditingSale(null); setIsAddSaleModalOpen(true); }} variant="primary" size="sm">+ New Sale</Button>
                <Link to={isBusinessView ? '/businesses' : '/clients'} className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">&larr; Back to List</Link>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard title="Total Billed" value={balanceData.totalBilled} icon={<BilledIcon/>} colorClass="bg-blue-500" />
        <KPICard title="Payments Received" value={balanceData.totalPaid} icon={<PaidIcon/>} colorClass="bg-green-500" />
        <KPICard title="Outstanding Balance" value={balanceData.outstanding} icon={<DueIcon/>} colorClass={balanceData.outstanding > 0 ? "bg-red-500" : "bg-gray-500"} />
        <KPICard title="Balance Adjustments" value={clientBalanceAdjustments.reduce((sum, adj) => {
          const sign = adj.type === BalanceAdjustmentType.INCREASE ? 1 : -1;
          return sum + (sign * (adj.amountMMK || 0));
        }, 0)} icon={<AdjustIcon/>} colorClass={clientBalanceAdjustments.length > 0 ? "bg-amber-500" : "bg-gray-400"} />
        <KPICard title="Bad Debts Written Off" value={clientBadDebts.reduce((sum, bd) => sum + (bd.writtenOffAmount || 0), 0)} icon={<BadDebtIcon/>} colorClass={clientBadDebts.length > 0 ? "bg-orange-500" : "bg-gray-400"} />
      </div>

       <div className="bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
              <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Details
              </button>
              <button onClick={() => setActiveTab('salesRecords')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'salesRecords' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Sales & Credits ({filteredSalesRecords ? filteredSalesRecords.length : (purchaseHistory ? purchaseHistory.filter(h => h && h.type === 'Sale').length : 0)})
              </button>
              <button onClick={() => setActiveTab('documents')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Documents ({filteredDocuments?.length ?? 0})
              </button>
              <button onClick={() => setActiveTab('payments')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Payments ({filteredPayments?.length ?? 0})
              </button>
              <button onClick={() => setActiveTab('openingBalance')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'openingBalance' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Opening Balance ({filteredOpeningBalanceRecords?.length ?? 0})
              </button>
              <button onClick={() => setActiveTab('balanceAdjustments')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'balanceAdjustments' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Balance Adj. ({filteredBalanceAdjustments?.length ?? 0})
              </button>
              <button onClick={() => setActiveTab('badDebts')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'badDebts' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Bad Debts ({filteredBadDebts?.length ?? 0})
              </button>
              <button onClick={() => setActiveTab('allowanceProvisions')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'allowanceProvisions' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Allowance Prov. ({clientAllowanceProvisions?.length || 0})
              </button>
            </nav>
          </div>
          {/* Linked Business filter - client view only, shown on filterable tabs */}
          {!isBusinessView && linkedBusinesses.length > 0 && ['salesRecords', 'documents', 'payments', 'openingBalance', 'balanceAdjustments', 'badDebts'].includes(activeTab) && (
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-text-secondary dark:text-slate-400">Filter by Linked Business:</span>
                <div className="flex flex-wrap gap-3">
                  {linkedBusinesses.map(b => (
                    <label key={b.id} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkedBusinessFilterIds.has(b.id)}
                        onChange={e => {
                          setLinkedBusinessFilterIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(b.id);
                            else next.delete(b.id);
                            return next;
                          });
                        }}
                        className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                      />
                      <span className="text-sm text-text-primary dark:text-slate-200">{b.name}</span>
                    </label>
                  ))}
                </div>
                {linkedBusinessFilterIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setLinkedBusinessFilterIds(new Set())}>
                    Clear filter
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="min-h-[200px]">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <Section title={isBusinessView ? 'Business Information' : 'Client Information'}>
                  <DetailItem label="Name" value={item.name} />
                  {!isBusinessView && (
                    <>
                      <DetailItem label="Primary Email" value={(item as Client).email} />
                      <DetailItem label="Phone" value={(item as Client).phone} />
                    </>
                  )}
                  {isBusinessView && (
                    <>
                      <DetailItem label="Contact Email" value={(item as Business).email} />
                      <DetailItem label="Contact Phone" value={(item as Business).phone} />
                      <DetailItem label="Industry" value={(item as Business).industry} />
                    </>
                  )}
                  <DetailItem label="Address" value={item.address} className="col-span-2" />
                  <DetailItem label="Created" value={formatDateTimeForDisplay(item.createdAt || undefined)} />
                  <DetailItem label="Updated" value={formatDateTimeForDisplay(item.updatedAt || undefined)} />
                </Section>
                <Section title="Facebook Ads Rate Settings">
                  <div className="col-span-2">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Custom Facebook Ads Rate (MMK per USD)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="any"
                            value={item.customFacebookAdsRateMMK || ''}
                            onChange={e => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              setItem(prev => prev ? { ...prev, customFacebookAdsRateMMK: value } : null);
                            }}
                            placeholder="Leave empty to use global rate"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              if (!item) return;
                              try {
                                const updatePayload = { 
                                  id: item.id, 
                                  customFacebookAdsRateMMK: item.customFacebookAdsRateMMK 
                                };
                                if (isBusinessView) {
                                  await apiUpdateBusiness(updatePayload as any);
                                } else {
                                  await apiUpdateClient(updatePayload as any);
                                }
                                addNotification("Custom Facebook Ads rate saved successfully.", "success");
                                fetchData();
                              } catch (e) {
                                addNotification(`Failed to save custom rate: ${(e as Error).message}`, "error");
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {(() => {
                            const globalService = allServices.find(s => typeof s.serviceRateMMK === 'number');
                            const globalRate = globalService?.serviceRateMMK || 0;
                            const customRate = item.customFacebookAdsRateMMK;
                            if (customRate) {
                              return `Using custom rate: ${customRate.toLocaleString()} MMK/USD (Global rate: ${globalRate.toLocaleString()} MMK/USD)`;
                            } else {
                              return `Using global rate: ${globalRate.toLocaleString()} MMK/USD`;
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'salesRecords' && (
              <div>
                {/* Sub-tabs for service categories */}
                <div className="mb-4 border-b border-gray-200 dark:border-slate-700">
                  <nav className="-mb-px flex space-x-4" aria-label="Sales & Credits Tabs">
                    <button
                      onClick={() => setSalesRecordsSubTab('all')}
                      className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        salesRecordsSubTab === 'all'
                          ? 'border-primary-action text-primary-action'
                          : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      All ({detailedSalesRecords.length + clientRefunds.length + clientCreditNotes.length})
                    </button>
                    <button
                      onClick={() => setSalesRecordsSubTab('facebookBoosting')}
                      className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        salesRecordsSubTab === 'facebookBoosting'
                          ? 'border-primary-action text-primary-action'
                          : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      Facebook Boosting ({detailedSalesRecords.filter(e => {
                        const service = allServices.find(s => s.id === e.sale.serviceId);
                        return facebookBoostingService && service?.id === facebookBoostingService.id;
                      }).length + clientRefunds.filter(r => r.serviceId === facebookBoostingService?.id).length})
                    </button>
                    <button
                      onClick={() => setSalesRecordsSubTab('tiktokBoosting')}
                      className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        salesRecordsSubTab === 'tiktokBoosting'
                          ? 'border-primary-action text-primary-action'
                          : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      TikTok Boosting ({detailedSalesRecords.filter(e => {
                        const service = allServices.find(s => s.id === e.sale.serviceId);
                        return tiktokBoostingService && service?.id === tiktokBoostingService.id;
                      }).length + clientRefunds.filter(r => r.serviceId === tiktokBoostingService?.id).length})
                    </button>
                    <button
                      onClick={() => setSalesRecordsSubTab('otherServices')}
                      className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        salesRecordsSubTab === 'otherServices'
                          ? 'border-primary-action text-primary-action'
                          : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      Other Services ({detailedSalesRecords.filter(e => {
                        const service = allServices.find(s => s.id === e.sale.serviceId);
                        const isFacebook = facebookBoostingService && service?.id === facebookBoostingService.id;
                        const isTikTok = tiktokBoostingService && service?.id === tiktokBoostingService.id;
                        return !isFacebook && !isTikTok;
                      }).length + clientRefunds.filter(r => {
                        const isFacebook = !!(r.serviceId && facebookBoostingService && r.serviceId === facebookBoostingService.id);
                        const isTikTok = !!(r.serviceId && tiktokBoostingService && r.serviceId === tiktokBoostingService.id);
                        return !isFacebook && !isTikTok;
                      }).length})
                    </button>
                    <button
                      onClick={() => setSalesRecordsSubTab('payments')}
                      className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        salesRecordsSubTab === 'payments'
                          ? 'border-primary-action text-primary-action'
                          : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      Payment Received ({filteredPayments.length})
                    </button>
                    <button
                      onClick={() => setSalesRecordsSubTab('balanceAdjustments')}
                      className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        salesRecordsSubTab === 'balanceAdjustments'
                          ? 'border-primary-action text-primary-action'
                          : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      Balance Adjustments ({filteredBalanceAdjustments.length})
                    </button>
                  </nav>
                </div>

                {salesRecordsSubTab === 'payments' ? (
                  <div>
                    {/* Payments Table */}
                    {filteredPayments.length === 0 ? (
                      <p className="text-text-secondary">No payments received.</p>
                    ) : (
                      <div>
                        {/* Action buttons for bulk approval */}
                        <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-text-secondary dark:text-slate-400">
                              {selectedPaymentIds.size > 0 && (
                                <span>{selectedPaymentIds.size} payment(s) selected</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {(() => {
                                const pendingSelectedCount = Array.from(selectedPaymentIds)
                                  .filter(id => clientOrBusinessPayments.find(p => p.id === id)?.status === PaymentStatus.PENDING)
                                  .length;
                                return canApproveSales && pendingSelectedCount > 0 && (
                                  <Button 
                                    onClick={handleBulkApprovePayments}
                                    variant="success" 
                                    size="sm"
                                  >
                                    Approve Selected ({pendingSelectedCount})
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                                  <input
                                    type="checkbox"
                                    checked={filteredPayments.length > 0 && selectedPaymentIds.size === filteredPayments.length}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPaymentIds(new Set(filteredPayments.map(p => p.id)));
                                      } else {
                                        setSelectedPaymentIds(new Set());
                                      }
                                    }}
                                    className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                                  />
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Applied Sales ID</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Method</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Recorded By</th>
                                {(canApproveSales || canEditPayments) && <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                              {filteredPayments
                                .sort((a, b) => {
                                  const dateA = new Date(a.paymentDate).getTime();
                                  const dateB = new Date(b.paymentDate).getTime();
                                  return salesRecordsSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                                })
                                .map(payment => (
                                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedPaymentIds.has(payment.id)}
                                        onChange={(e) => {
                                          const newSet = new Set(selectedPaymentIds);
                                          if (e.target.checked) {
                                            newSet.add(payment.id);
                                          } else {
                                            newSet.delete(payment.id);
                                          }
                                          setSelectedPaymentIds(newSet);
                                        }}
                                        className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">
                                      {payment.invoiceId ? (
                                        `Invoice: ${payment.invoiceId}${payment.saleAllocations && payment.saleAllocations.length > 0 ? ` (${payment.saleAllocations.map(a => a.saleRecordId).join(', ')})` : ''}`
                                      ) : payment.saleAllocations && payment.saleAllocations.length > 0 ? (
                                        payment.saleAllocations.map(a => a.saleRecordId).join(', ')
                                      ) : payment.saleRecordId ? (
                                        payment.saleRecordId
                                      ) : (
                                        <span className="text-text-secondary dark:text-slate-400">General{payment.status === PaymentStatus.APPROVED && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(auto-allocated)</span>}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDateForDisplay(payment.paymentDate)}</td>
                                    <td className="px-4 py-2 text-right text-sm text-text-primary dark:text-slate-200 font-medium">{payment.amountMMK.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{payment.method || '—'}</td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        payment.status === PaymentStatus.APPROVED 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          : payment.status === PaymentStatus.PENDING
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      }`}>
                                        {payment.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                      {users.find(u => u.id === payment.recordedByUserId)?.name || 'Unknown'}
                                    </td>
                                    {(canApproveSales || canEditPayments) && (
                                      <td className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1">
                                          {canEditPayments && (
                                            <>
                                              <Button variant="secondary" size="sm" onClick={() => { setEditingPayment(payment); setIsRecordPaymentModalOpen(true); }}>
                                                Edit
                                              </Button>
                                              <Button variant="danger" size="sm" onClick={() => handleDeletePayment(payment.id)}>
                                                Delete
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : salesRecordsSubTab === 'balanceAdjustments' ? (
                  <div>
                    <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Start Date"
                          type="date"
                          value={salesRecordsStartDate}
                          onChange={e => setSalesRecordsStartDate(e.target.value)}
                        />
                        <Input
                          label="End Date"
                          type="date"
                          value={salesRecordsEndDate}
                          onChange={e => setSalesRecordsEndDate(e.target.value)}
                        />
                        <Select
                          label="Sort Order"
                          value={salesRecordsSortOrder}
                          onChange={e => setSalesRecordsSortOrder(e.target.value as 'newest' | 'oldest')}
                          options={[
                            { value: 'newest', label: 'Newest First' },
                            { value: 'oldest', label: 'Oldest First' }
                          ]}
                        />
                      </div>
                    </div>
                    {filteredBalanceAdjustments.length === 0 ? (
                      <p className="text-text-secondary">No balance adjustments.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Adjustment ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Service</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Employee</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reason</th>
                              {!isBusinessView && (
                                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business</th>
                              )}
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Recorded By</th>
                            </tr>
                          </thead>
                          <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {filteredBalanceAdjustments.map(adjustment => {
                              const serviceName = adjustment.serviceId
                                ? (allServices.find(s => s.id === adjustment.serviceId)?.name || 'Unknown Service')
                                : 'N/A';
                              const rateDetails = adjustment.totalUSD && adjustment.rate
                                ? ` (${adjustment.totalUSD} USD × ${adjustment.rate.toLocaleString()} MMK/USD)`
                                : '';
                              const amount = adjustment.type === BalanceAdjustmentType.DECREASE
                                ? -adjustment.amountMMK
                                : adjustment.amountMMK;
                              const amountClass = adjustment.type === BalanceAdjustmentType.DECREASE
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-green-600 dark:text-green-400';
                              return (
                                <tr key={adjustment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                    {adjustment.adjustmentDate ? formatDateForDisplay(adjustment.adjustmentDate) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">
                                    <Link className="text-primary-action hover:underline" to={`/finance/balance-adjustments/${adjustment.id}`}>
                                      {adjustment.id}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      adjustment.type === BalanceAdjustmentType.DECREASE
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                      {adjustment.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                    {serviceName}{rateDetails}
                                  </td>
                                  <td className={`px-4 py-2 text-right text-sm font-medium ${amountClass}`}>
                                    {amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                    {adjustment.employeeId ? (users.find(u => u.id === adjustment.employeeId)?.name || 'Unknown') : 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                    {adjustment.reason || '-'}
                                  </td>
                                  {!isBusinessView && (
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                      {getBusinessNameById(adjustment.businessId)}
                                    </td>
                                  )}
                                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                    {users.find(u => u.id === adjustment.recordedByUserId)?.name || 'Unknown'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : !purchaseHistory || (purchaseHistory.filter(h => h && h.type === 'Sale').length === 0 && clientRefunds.length === 0 && clientCreditNotes.length === 0) ? (
                  <p className="text-text-secondary">No sales records, refunds, or credit notes available.</p>
                ) : (
                  <div>
                    {/* Filters */}
                    <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <Input
                          label="Start Date"
                          type="date"
                          value={salesRecordsStartDate}
                          onChange={e => setSalesRecordsStartDate(e.target.value)}
                          containerClassName="mb-0"
                        />
                        <Input
                          label="End Date"
                          type="date"
                          value={salesRecordsEndDate}
                          onChange={e => setSalesRecordsEndDate(e.target.value)}
                          containerClassName="mb-0"
                        />
                        <Select
                          label="Status"
                          value={salesRecordsStatusFilter}
                          onChange={e => setSalesRecordsStatusFilter(e.target.value)}
                          options={[
                            { value: 'All', label: 'All Statuses' },
                            ...Array.from(new Set(purchaseHistory.filter(h => h.type === 'Sale').map(h => {
                              // Normalize "Checked" to "Approved" for display
                              return h.status === 'Checked' ? 'Approved' : h.status;
                            }))).map(status => ({
                              value: status,
                              label: status
                            }))
                          ]}
                          containerClassName="mb-0"
                        />
                        <div className="flex flex-col">
                          <label className="block text-sm font-medium text-text-primary dark:text-slate-300 mb-1">
                            Sort Order
                          </label>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSalesRecordsSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                            className="w-full justify-center"
                          >
                            {salesRecordsSortOrder === 'newest' ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12.75" />
                                </svg>
                                Newest First
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12.75m0 0l-3-3m3 3l3-3" />
                                </svg>
                                Oldest First
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Filter-aware KPI summary + service category breakdown */}
                      <div className="mb-4 space-y-4">
                        {salesKpiFilterActive && (
                          <p className="text-xs text-text-secondary dark:text-slate-400 px-1">
                            KPIs reflect active filters
                            {salesRecordsStartDate || salesRecordsEndDate
                              ? ` · ${salesRecordsStartDate || '…'} → ${salesRecordsEndDate || '…'}`
                              : ''}
                            {salesRecordsStatusFilter !== 'All' ? ` · Status: ${salesRecordsStatusFilter}` : ''}
                            {salesRecordsSubTab !== 'all'
                              ? ` · Tab: ${salesRecordsSubTab === 'facebookBoosting' ? 'Facebook' : salesRecordsSubTab === 'tiktokBoosting' ? 'TikTok' : salesRecordsSubTab === 'otherServices' ? 'Other Services' : salesRecordsSubTab}`
                              : ''}
                          </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          <KPICard title="Filtered Sales" value={salesFilteredSummaryKpis.totalSales} icon={<BilledIcon/>} colorClass="bg-blue-500" />
                          <KPICard title="Refunds" value={salesFilteredSummaryKpis.totalRefunds} icon={<PaidIcon/>} colorClass="bg-slate-500" />
                          <KPICard title="Credit Notes" value={salesFilteredSummaryKpis.totalCreditNotes} icon={<AdjustIcon/>} colorClass="bg-amber-500" />
                          <KPICard title="Net Amount" value={salesFilteredSummaryKpis.netAmount} icon={<DueIcon/>} colorClass="bg-indigo-500" />
                          <KPICard title="Records" value={salesFilteredSummaryKpis.recordCount} icon={<DocumentIcon/>} colorClass="bg-cyan-500" valueSuffix="" />
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-text-secondary dark:text-slate-400 mb-2 uppercase tracking-wide">
                            Sales by Service — Draft &amp; Approved
                            {(salesRecordsStartDate || salesRecordsEndDate || (!isBusinessView && linkedBusinessFilterIds.size > 0)) && (
                              <span className="normal-case font-normal text-xs ml-1">(date &amp; business filters applied)</span>
                            )}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <SalesCategoryKPICard
                              title="Facebook Ads"
                              stats={salesCategoryKpis.facebook}
                              accentClass="bg-blue-500"
                              highlighted={salesRecordsSubTab === 'facebookBoosting'}
                            />
                            <SalesCategoryKPICard
                              title="TikTok Ads"
                              stats={salesCategoryKpis.tiktok}
                              accentClass="bg-pink-500"
                              highlighted={salesRecordsSubTab === 'tiktokBoosting'}
                            />
                            <SalesCategoryKPICard
                              title="Other Services"
                              stats={salesCategoryKpis.other}
                              accentClass="bg-violet-500"
                              highlighted={salesRecordsSubTab === 'otherServices'}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-text-secondary dark:text-slate-400">
                          {selectedSalesRecordIds.size > 0 && (
                            <span>{selectedSalesRecordIds.size} record(s) selected</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(canApproveSales || canApproveCreditNotes) && filteredApprovableTotalCount > 0 && (
                            <Button
                              onClick={handleApproveAllFilteredDraftsAndPending}
                              variant="primary"
                              size="sm"
                            >
                              Approve All Drafts ({filteredApprovableTotalCount})
                            </Button>
                          )}
                          <Button 
                            onClick={() => setIsDownloadPDFModalOpen(true)} 
                            variant="secondary" 
                            size="sm"
                            isLoading={isDownloadingPdf}
                            className="flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                          </Button>
                          <Button 
                            onClick={() => setIsCreateInvoiceModalOpen(true)} 
                            variant="primary" 
                            size="sm"
                            disabled={
                              selectedSalesRecordIds.size === 0 || 
                              selectedSalesRecordIds.size > 1 ||  // Only allow single sale selection to prevent balance double-counting
                              Array.from(selectedSalesRecordIds).some(id => salesWithInvoices.has(id))
                            }
                            title={
                              selectedSalesRecordIds.size > 1 
                                ? "Please select only one sale record to create an invoice. Multiple sales would cause balance double-counting." 
                                : Array.from(selectedSalesRecordIds).some(id => salesWithInvoices.has(id)) 
                                  ? "Some selected sales already have invoices" 
                                  : ""
                            }
                          >
                            Create Invoice ({selectedSalesRecordIds.size})
                          </Button>
                          <Button 
                            onClick={() => {
                              // Filter out credit note IDs (they start with "CN") and refund IDs
                              const saleIds = Array.from(selectedSalesRecordIds).filter((id: string) => {
                                // Exclude credit notes (CN prefix) and ensure it's a valid sale ID
                                if (id.startsWith('CN')) return false;
                                // Check if it's actually a sale in filteredSalesRecords
                                const entry = filteredSalesRecords.find(e => e.id === id);
                                if (!entry) return false;
                                // Exclude refunds and credit notes
                                if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
                                return true;
                              });
                              setPaymentModalDefaults({
                                preselectedSaleIds: saleIds,
                              });
                              // Use setTimeout to ensure state is set before modal opens
                              setTimeout(() => {
                                setEditingPayment(null);
                                setIsRecordPaymentModalOpen(true);
                              }, 0);
                            }}
                            variant="success" 
                            size="sm"
                            disabled={selectedSalesRecordIds.size === 0}
                          >
                            Record Payment ({selectedSalesRecordIds.size})
                          </Button>
                          {(() => {
                            const draftSalesCount = filteredSalesRecords.filter(entry => {
                              if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
                              return selectedSalesRecordIds.has(entry.id) && entry.sale && entry.sale.status === SaleStatus.DRAFT;
                            }).length;
                            
                            const pendingCreditNotesCount = filteredSalesRecords.filter(entry => {
                              if (!(entry as any).isCreditNote || !(entry as any).creditNote) return false;
                              const creditNote = (entry as any).creditNote as CreditNote;
                              return selectedSalesRecordIds.has(entry.id) && creditNote.status === CreditNoteStatus.PENDING;
                            }).length;
                            
                            const totalApprovableCount = draftSalesCount + pendingCreditNotesCount;
                            
                            const deletableSalesCount = filteredSalesRecords.filter(entry => {
                              if ((entry as any).isRefund || (entry as any).isCreditNote) return false;
                              const sale = entry.sale;
                              return sale && selectedSalesRecordIds.has(entry.id) && canDeleteSales(sale) && !salesWithInvoices.has(entry.id);
                            }).length;
                            
                            const deletableCreditNotesCount = filteredSalesRecords.filter(entry => {
                              if (!(entry as any).isCreditNote || !(entry as any).creditNote) return false;
                              const creditNote = (entry as any).creditNote as CreditNote;
                              return selectedSalesRecordIds.has(entry.id) && canDeleteCreditNotes &&
                                creditNoteCanBeDeleted(creditNote);
                            }).length;
                            
                            const totalDeletableCount = deletableSalesCount + deletableCreditNotesCount;
                            
                            return (
                              <>
                                {selectedSalesRecordIds.size === 1 && (() => {
                                  const selId = Array.from(selectedSalesRecordIds)[0];
                                  const entry = filteredSalesRecords.find(e => e.id === selId);
                                  if (!entry) return null;
                                  if ((entry as any).isCreditNote && (entry as any).creditNote) {
                                    const cn = (entry as any).creditNote as CreditNote;
                                    const canEdit = creditNoteCanBeDeleted(cn) && canDeleteCreditNotes;
                                    return canEdit ? (
                                      <Button variant="ghost" size="sm" onClick={() => { setEditingCreditNote(cn); setIsRecordCreditNoteModalOpen(true); }}>
                                        Edit Credit Note
                                      </Button>
                                    ) : null;
                                  }
                                  if (entry.sale && !(entry as any).isRefund && canEditThisSale(entry.sale)) {
                                    return (
                                      <Button variant="ghost" size="sm" onClick={() => { setEditingSale(entry.sale!); setIsAddSaleModalOpen(true); }}>
                                        Edit Sale
                                      </Button>
                                    );
                                  }
                                  return null;
                                })()}
                                {(canApproveSales || canApproveCreditNotes) && totalApprovableCount > 0 && (
                                  <Button 
                                    onClick={handleBulkApprove}
                                    variant="primary" 
                                    size="sm"
                                    disabled={selectedSalesRecordIds.size === 0}
                                  >
                                    Approve ({totalApprovableCount})
                                  </Button>
                                )}
                                {(canDeleteSales({} as SaleRecord) || canDeleteCreditNotes) && totalDeletableCount > 0 && (
                                  <Button 
                                    onClick={handleBulkDeleteSalesAndCreditNotes}
                                    variant="danger" 
                                    size="sm"
                                    disabled={selectedSalesRecordIds.size === 0}
                                  >
                                    Delete Selected ({totalDeletableCount})
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={(() => {
                                  const selectableRecords = filteredSalesRecords.filter(h => {
                                    if ((h as any).isRefund) return false;
                                    if ((h as any).isCreditNote) {
                                      const creditNote = (h as any).creditNote as CreditNote;
                                      const canApprove = creditNote.status === CreditNoteStatus.PENDING && canApproveCreditNotes;
                                      const canDelete = canDeleteCreditNotes && creditNoteCanBeDeleted(creditNote);
                                      return canApprove || canDelete;
                                    }
                                    if (!salesWithInvoices.has(h.id)) {
                                      const sale = (h as any).sale as SaleRecord;
                                      const canApprove = sale?.status === SaleStatus.DRAFT && canApproveSales;
                                      const canDelete = sale && canDeleteSales(sale);
                                      return canApprove || canDelete;
                                    }
                                    return false;
                                  });
                                  return selectableRecords.length > 0 && selectedSalesRecordIds.size === selectableRecords.length;
                                })()}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const selectableIds = filteredSalesRecords
                                      .filter(h => {
                                        if ((h as any).isRefund) return false;
                                        if ((h as any).isCreditNote) {
                                          const creditNote = (h as any).creditNote as CreditNote;
                                          const canApprove = creditNote.status === CreditNoteStatus.PENDING && canApproveCreditNotes;
                                          const canDelete = canDeleteCreditNotes && creditNoteCanBeDeleted(creditNote);
                                          return canApprove || canDelete;
                                        }
                                        if (!salesWithInvoices.has(h.id)) {
                                          const sale = (h as any).sale as SaleRecord;
                                          const canApprove = sale?.status === SaleStatus.DRAFT && canApproveSales;
                                          const canDelete = sale && canDeleteSales(sale);
                                          return canApprove || canDelete;
                                        }
                                        return false;
                                      })
                                      .map(h => h.id)
                                      .filter(Boolean);
                                    setSelectedSalesRecordIds(new Set(selectableIds));
                                  } else {
                                    setSelectedSalesRecordIds(new Set());
                                  }
                                }}
                                className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Sale/Refund ID</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Service Description</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Qty</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Rate/Unit Price</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total (MMK)</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Paid Amount (MMK)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                          {(!filteredSalesRecords || filteredSalesRecords.length === 0) ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-text-secondary dark:text-slate-400">
                                No sales records or credit notes match the selected filters.
                              </td>
                            </tr>
                          ) : filteredSalesRecords.map((entry) => {
                              // Handle refund entries
                              if ((entry as any).isRefund && (entry as any).refund) {
                                const refund = (entry as any).refund as Refund;
                                return (
                                  <tr key={`refund-${refund.id}`} className="hover:bg-red-50 dark:hover:bg-red-900/20 bg-red-50/50 dark:bg-red-900/10">
                                    <td className="px-4 py-2"></td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                      {refund.refundDate ? formatDateForDisplay(refund.refundDate) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400">
                                      {refund.id} (Refund)
                                    </td>
                                    <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                                      {refund.serviceId 
                                        ? `${allServices.find(s => s.id === refund.serviceId)?.name || 'Unknown Service'} - Refund${refund.totalUSD && refund.rate ? ` (${refund.totalUSD} USD × ${refund.rate.toLocaleString()} MMK/USD)` : ''}`
                                        : 'Refund'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400">-</td>
                                    <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400">-</td>
                                    <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                                      -{refund.amountMMK.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400">
                                      -
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[refund.status as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {refund.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2"></td>
                                  </tr>
                                );
                              }
                              
                              // Handle credit note entries
                              if ((entry as any).isCreditNote && (entry as any).creditNote) {
                                const creditNote = (entry as any).creditNote as CreditNote;
                                return (
                                  <tr key={`creditnote-${creditNote.id}`} className="hover:bg-orange-50 dark:hover:bg-orange-900/20 bg-orange-50/50 dark:bg-orange-900/10">
                                    <td className="px-4 py-2">
                                      {creditNoteRowSelectable(creditNote) && (
                                        <input
                                          type="checkbox"
                                          checked={selectedSalesRecordIds.has(entry.id)}
                                          onChange={(e) => {
                                            const newSet = new Set(selectedSalesRecordIds);
                                            if (e.target.checked && entry.id) {
                                              newSet.add(entry.id);
                                            } else if (entry.id) {
                                              newSet.delete(entry.id);
                                            }
                                            setSelectedSalesRecordIds(newSet);
                                          }}
                                          className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                                        />
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                      {creditNote.creditNoteDate ? formatDateForDisplay(creditNote.creditNoteDate) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                                      <div className="flex items-center gap-2">
                                        <span>{creditNote.id}</span>
                                        {creditNote.saleRecordId && (
                                          <Link to={`/sales/${creditNote.saleRecordId}`} className="text-primary-action hover:text-blue-700 dark:hover:text-blue-400 text-xs">
                                            For: {creditNote.saleRecordId}
                                          </Link>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-orange-600 dark:text-orange-400">
                                      {creditNote.serviceId 
                                        ? `${allServices.find(s => s.id === creditNote.serviceId)?.name || 'Unknown Service'} - Credit Note${creditNote.totalUSD && creditNote.rate ? ` (${creditNote.totalUSD} USD × ${creditNote.rate.toLocaleString()} MMK/USD)` : ''}`
                                        : 'Credit Note'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-orange-600 dark:text-orange-400">
                                      {creditNote.totalUSD ? creditNote.totalUSD.toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-orange-600 dark:text-orange-400">
                                      {creditNote.rate ? creditNote.rate.toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-orange-600 dark:text-orange-400 font-medium">
                                      -{creditNote.amountMMK.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-orange-600 dark:text-orange-400">
                                      -
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[creditNote.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {creditNote.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">
                                      {creditNoteCanBeDeleted(creditNote) && canDeleteCreditNotes && (
                                        <Button variant="ghost" size="sm" onClick={() => { setEditingCreditNote(creditNote); setIsRecordCreditNoteModalOpen(true); }}>
                                          Edit
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }
                              
                              // Handle sale entries
                              if (entry.items && entry.items.length > 0) {
                                return entry.items.map((item: any, itemIndex: number) => (
                                  <tr key={`${entry.id}-${itemIndex}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-2">
                                      {itemIndex === 0 && !(entry as any).isRefund && !(entry as any).isCreditNote && (
                                        <input
                                          type="checkbox"
                                          checked={selectedSalesRecordIds.has(entry.id)}
                                          onChange={(e) => {
                                            const newSet = new Set(selectedSalesRecordIds);
                                            if (e.target.checked && entry.id && !salesWithInvoices.has(entry.id)) {
                                              newSet.add(entry.id);
                                            } else if (entry.id) {
                                              newSet.delete(entry.id);
                                            }
                                            setSelectedSalesRecordIds(newSet);
                                          }}
                                          disabled={salesWithInvoices.has(entry.id)}
                                          className="rounded border-gray-300 text-primary-action focus:ring-primary-action disabled:opacity-50 disabled:cursor-not-allowed"
                                          title={salesWithInvoices.has(entry.id) ? "Invoice already created for this sale" : ""}
                                        />
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">
                                      {itemIndex === 0 && (entry.date ? formatDateForDisplay(entry.date) : 'N/A')}
                                    </td>
                                    <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">
                                      {itemIndex === 0 && entry.id && !(entry as any).isRefund && !(entry as any).isCreditNote && (
                                        <div className="flex items-center gap-2">
                                          <Link to={`/sales/${entry.id}`} className="text-primary-action hover:text-blue-700 dark:hover:text-blue-400">
                                            {entry.id}
                                          </Link>
                                          {salesWithInvoices.has(entry.id) && (
                                            <span className="text-xs text-status-success dark:text-green-400" title="Invoice already created">
                                              (Invoice)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{item.description}</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">
                                      {item.isBudget ? `${(item.quantity || 0).toLocaleString()}$` : (item.quantity || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">{(item.unitPrice || 0).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200 font-medium">{(item.total || 0).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">
                                      {itemIndex === 0 && entry.sale && entry.sale.id ? (
                                        (salePaidAmounts.get(entry.sale.id) || 0).toLocaleString()
                                      ) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      {itemIndex === 0 && (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[(entry.status === 'Checked' ? 'Approved' : entry.status) as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                          {entry.status === 'Checked' ? 'Approved' : entry.status}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      {itemIndex === 0 && entry.sale && entry.sale.id && !(entry as any).isRefund && !(entry as any).isCreditNote && entry.status !== SaleStatus.DRAFT && (() => {
                                        const paidAmount = salePaidAmounts.get(entry.sale.id) || 0;
                                        const remainingAmount = Math.max((entry.sale.grandTotalMMK || 0) - paidAmount, 0);
                                        const isFullyPaid = remainingAmount <= 0;
                                        
                                        return (
                                          <div className="flex items-center gap-1">
                                            {!isFullyPaid && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setPaymentModalDefaults({
                                                    defaultClientId: entry.sale?.clientId,
                                                    defaultBusinessId: entry.sale?.businessId,
                                                    defaultSaleId: entry.sale?.id,
                                                    defaultAmount: remainingAmount,
                                                  });
                                                  setTimeout(() => {
                                                    setEditingPayment(null);
                                                    setIsRecordPaymentModalOpen(true);
                                                  }, 0);
                                                }}
                                              >
                                                Record Pymt
                                              </Button>
                                            )}
                                            {canEditThisSale(entry.sale) && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setEditingSale(entry.sale!); setIsAddSaleModalOpen(true); }}
                                              >
                                                Edit
                                              </Button>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                ));
                              } else {
                                // No items case
                                return (
                                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-2">
                                      {!(entry as any).isRefund && !(entry as any).isCreditNote && (
                                        <input
                                          type="checkbox"
                                          checked={selectedSalesRecordIds.has(entry.id)}
                                          onChange={(e) => {
                                            const newSet = new Set(selectedSalesRecordIds);
                                            if (e.target.checked && entry.id && !salesWithInvoices.has(entry.id)) {
                                              newSet.add(entry.id);
                                            } else if (entry.id) {
                                              newSet.delete(entry.id);
                                            }
                                            setSelectedSalesRecordIds(newSet);
                                          }}
                                          disabled={salesWithInvoices.has(entry.id)}
                                          className="rounded border-gray-300 text-primary-action focus:ring-primary-action disabled:opacity-50 disabled:cursor-not-allowed"
                                          title={salesWithInvoices.has(entry.id) ? "Invoice already created for this sale" : ""}
                                        />
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{entry.date ? formatDateForDisplay(entry.date) : 'N/A'}</td>
                                    <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">
                                      {entry.id && !(entry as any).isRefund && (
                                        <div className="flex items-center gap-2">
                                          <Link to={`/sales/${entry.id}`} className="text-primary-action hover:text-blue-700 dark:hover:text-blue-400">
                                            {entry.id}
                                          </Link>
                                          {salesWithInvoices.has(entry.id) && (
                                            <span className="text-xs text-status-success dark:text-green-400" title="Invoice already created">
                                              (Invoice)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">No items</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">-</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">-</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200 font-medium">{(entry.grandTotal || 0).toLocaleString()}</td>
                                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">
                                      {entry.sale && entry.sale.id ? (
                                        (salePaidAmounts.get(entry.sale.id) || 0).toLocaleString()
                                      ) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[(entry.status === 'Checked' ? 'Approved' : entry.status) as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {entry.status === 'Checked' ? 'Approved' : entry.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      {entry.sale && entry.sale.id && !(entry as any).isRefund && !(entry as any).isCreditNote && entry.status !== SaleStatus.DRAFT && (() => {
                                        const paidAmount = salePaidAmounts.get(entry.sale.id) || 0;
                                        const remainingAmount = Math.max((entry.sale.grandTotalMMK || 0) - paidAmount, 0);
                                        const isFullyPaid = remainingAmount <= 0;
                                        
                                        return (
                                          <div className="flex items-center gap-1">
                                            {!isFullyPaid && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setPaymentModalDefaults({
                                                    defaultClientId: entry.sale?.clientId,
                                                    defaultBusinessId: entry.sale?.businessId,
                                                    defaultSaleId: entry.sale?.id,
                                                    defaultAmount: remainingAmount,
                                                  });
                                                  setTimeout(() => {
                                                    setEditingPayment(null);
                                                    setIsRecordPaymentModalOpen(true);
                                                  }, 0);
                                                }}
                                              >
                                                Record Pymt
                                              </Button>
                                            )}
                                            {canEditThisSale(entry.sale) && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setEditingSale(entry.sale!); setIsAddSaleModalOpen(true); }}
                                              >
                                                Edit
                                              </Button>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                );
                              }
                            })}
                        </tbody>
                      </table>
                    </div>
                    {/* Hidden PDF Template — off-screen with full height for html2canvas */}
                    <div
                      style={{
                        position: 'fixed',
                        left: '-10000px',
                        top: 0,
                        width: '210mm',
                        overflow: 'visible',
                        pointerEvents: 'none',
                        zIndex: -1,
                      }}
                      aria-hidden
                    >
                      <SalesRecordsPDFTemplate
                        ref={salesRecordsPdfRef}
                        payments={getFilteredPayments}
                        pdfDownloadType={pdfDownloadType}
                        data={[...getFilteredPDFData].sort((a, b) => {
                          // Sort oldest to newest for PDF
                          let timestampA: number;
                          let timestampB: number;
                          
                          if (a.sale && !(a as any).isRefund && !(a as any).isCreditNote) {
                            const sale = a.sale as SaleRecord;
                            const saleTimestamp = sale.createdAt || sale.updatedAt || a.date;
                            timestampA = new Date(saleTimestamp).getTime();
                          } else if ((a as any).isRefund && (a as any).refund) {
                            const refund = (a as any).refund as Refund;
                            const refundTimestamp = (refund as any).createdAt || refund.refundDate || a.date;
                            timestampA = new Date(refundTimestamp).getTime();
                          } else if ((a as any).isCreditNote && (a as any).creditNote) {
                            const creditNote = (a as any).creditNote as CreditNote;
                            const creditNoteTimestamp = (creditNote as any).createdAt || creditNote.creditNoteDate || a.date;
                            timestampA = new Date(creditNoteTimestamp).getTime();
                          } else {
                            timestampA = new Date(a.date).getTime();
                          }
                          
                          if (b.sale && !(b as any).isRefund && !(b as any).isCreditNote) {
                            const sale = b.sale as SaleRecord;
                            const saleTimestamp = sale.createdAt || sale.updatedAt || b.date;
                            timestampB = new Date(saleTimestamp).getTime();
                          } else if ((b as any).isRefund && (b as any).refund) {
                            const refund = (b as any).refund as Refund;
                            const refundTimestamp = (refund as any).createdAt || refund.refundDate || b.date;
                            timestampB = new Date(refundTimestamp).getTime();
                          } else if ((b as any).isCreditNote && (b as any).creditNote) {
                            const creditNote = (b as any).creditNote as CreditNote;
                            const creditNoteTimestamp = (creditNote as any).createdAt || creditNote.creditNoteDate || b.date;
                            timestampB = new Date(creditNoteTimestamp).getTime();
                          } else {
                            timestampB = new Date(b.date).getTime();
                          }
                          
                          if (isNaN(timestampA) && isNaN(timestampB)) return 0;
                          if (isNaN(timestampA)) return 1;
                          if (isNaN(timestampB)) return -1;
                          
                          // Oldest to newest (timestampA - timestampB)
                          return timestampA - timestampB;
                        })}
                        clientOrBusiness={item}
                        companyProfile={companyProfile}
                        dateRange={{ start: salesRecordsStartDate, end: salesRecordsEndDate }}
                        filters={{ type: salesRecordsSubTab, status: salesRecordsStatusFilter }}
                        allServices={allServices}
                        allBusinesses={allBusinesses}
                        allClients={allClients}
                        balanceAdjustments={pdfTemplateBalanceAdjustments}
                        badDebts={pdfTemplateBadDebts}
                        calculatedOutstanding={balanceData.outstanding}
                        openingBalanceFromCBB={openingBalanceFromCBB}
                        openingBalanceCbbRows={pdfTemplateOpeningBalanceRows}
                        allowanceProvisions={pdfTemplateAllowanceProvisions}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                {/* Documents tab KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <KPICard title="Total Amount" value={filteredDocuments?.reduce((s, e) => s + (e.amount || 0), 0) ?? 0} icon={<DocumentIcon/>} colorClass="bg-slate-500" />
                  <KPICard title="Invoices" value={filteredDocuments?.filter(e => e.type === 'Invoice').length ?? 0} icon={<BilledIcon/>} colorClass="bg-blue-500" valueSuffix="" />
                  <KPICard title="Quotations" value={filteredDocuments?.filter(e => e.service?.startsWith('Quotation:')).length ?? 0} icon={<DocumentIcon/>} colorClass="bg-indigo-500" valueSuffix="" />
                </div>
                {!purchaseHistory || purchaseHistory.filter(h => h && h.id && (h.type === 'Invoice' || h.service?.startsWith('Quotation:'))).length === 0 ? (
                  <p className="text-text-secondary">No documents available.</p>
                ) : (
                  <div>
                    {/* Filters */}
                    <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <Input
                          label="Start Date"
                          type="date"
                          value={documentsStartDate}
                          onChange={e => setDocumentsStartDate(e.target.value)}
                          containerClassName="mb-0"
                        />
                        <Input
                          label="End Date"
                          type="date"
                          value={documentsEndDate}
                          onChange={e => setDocumentsEndDate(e.target.value)}
                          containerClassName="mb-0"
                        />
                        <Select
                          label="Type"
                          value={documentsTypeFilter}
                          onChange={e => setDocumentsTypeFilter(e.target.value as 'All' | 'Invoice' | 'Quotation')}
                          options={[
                            { value: 'All', label: 'All Types' },
                            { value: 'Invoice', label: 'Invoices Only' },
                            { value: 'Quotation', label: 'Quotations Only' }
                          ]}
                          containerClassName="mb-0"
                        />
                        <Select
                          label="Status"
                          value={documentsStatusFilter}
                          onChange={e => setDocumentsStatusFilter(e.target.value)}
                          options={[
                            { value: 'All', label: 'All Statuses' },
                            ...Array.from(new Set(purchaseHistory.filter(h => h && (h.type === 'Invoice' || h.service?.startsWith('Quotation:'))).map(h => h.status).filter(Boolean))).map(status => ({
                              value: status,
                              label: status
                            }))
                          ]}
                          containerClassName="mb-0"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => handleDownloadDocumentsPDF()} 
                          variant="secondary" 
                          size="sm"
                          isLoading={isDownloadingPdf}
                        >
                          Download PDF
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reference</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                          {(!filteredDocuments || filteredDocuments.length === 0) ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-text-secondary dark:text-slate-400">
                                No documents match the selected filters.
                              </td>
                            </tr>
                          ) : (
                            filteredDocuments.map(entry => {
                              if (!entry || !entry.id) return null;
                              const isQuotation = entry.service?.startsWith('Quotation:') || false;
                              const recordId = entry.id;
                              return (
                                <tr key={`${entry.type}-${entry.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{entry.date ? formatDateForDisplay(entry.date) : 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{isQuotation ? 'Quotation' : entry.type}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">{entry.service || 'N/A'}</td>
                                  <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200 font-medium">{entry.amount.toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {isQuotation ? (
                                      <Link to={`/sales/quotations/${recordId}`} className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                        View
                                      </Link>
                                    ) : (
                                      <Link to={`/sales/invoices/${recordId}`} className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                        View
                                      </Link>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Hidden PDF Template */}
                    <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                      <PurchaseHistoryPDFTemplate
                        ref={documentsPdfRef}
                        data={filteredDocuments}
                        clientOrBusiness={item}
                        companyProfile={companyProfile}
                        dateRange={{ start: documentsStartDate, end: documentsEndDate }}
                        filters={{ type: documentsTypeFilter, status: documentsStatusFilter }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div>
                {/* Payments tab KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <KPICard title="Total Received" value={filteredPayments?.filter(p => p.status === PaymentStatus.APPROVED).reduce((s, p) => s + (p.amountMMK || 0), 0) ?? 0} icon={<PaidIcon/>} colorClass="bg-green-500" />
                  <KPICard title="Approved" value={filteredPayments?.filter(p => p.status === PaymentStatus.APPROVED).length ?? 0} icon={<BilledIcon/>} colorClass="bg-blue-500" valueSuffix="" />
                  <KPICard title="Pending" value={filteredPayments?.filter(p => p.status === PaymentStatus.PENDING).length ?? 0} icon={<DueIcon/>} colorClass="bg-amber-500" valueSuffix="" />
                </div>
                {!filteredPayments || filteredPayments.length === 0 ? (
                  <p className="text-text-secondary dark:text-slate-400">No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Applied Sales ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Method</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Notes</th>
                          {canEditPayments && <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredPayments.map(payment => (
                          <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{formatDateForDisplay(payment.paymentDate)}</td>
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">
                              {payment.saleAllocations && payment.saleAllocations.length > 0
                                ? payment.saleAllocations.map(a => a.saleRecordId).join(', ')
                                : payment.saleRecordId || '—'}
                            </td>
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{payment.method || '—'}</td>
                            <td className="px-4 py-3 text-right font-medium text-text-primary dark:text-slate-200">{payment.amountMMK?.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.status === PaymentStatus.APPROVED ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : payment.status === PaymentStatus.PENDING ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-secondary dark:text-slate-400 max-w-xs truncate">{payment.remark || '—'}</td>
                            {canEditPayments && (
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Button variant="secondary" size="sm" onClick={() => { setEditingPayment(payment); setIsRecordPaymentModalOpen(true); }}>
                                    Edit
                                  </Button>
                                  <Button variant="danger" size="sm" onClick={() => handleDeletePayment(payment.id)}>
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'openingBalance' && (
              <div className="space-y-4">
                {/* Opening Balance tab KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <KPICard title="Total Opening Balance" value={filteredOpeningBalanceRecords?.reduce((s, r) => s + (r.openingBalance ?? 0), 0) ?? 0} icon={<DueIcon/>} colorClass="bg-indigo-500" />
                  <KPICard title="Records" value={filteredOpeningBalanceRecords?.length ?? 0} icon={<DocumentIcon/>} colorClass="bg-slate-500" valueSuffix="" />
                </div>
                {/* Create form for opening balance */}
                {item && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-text-secondary dark:text-slate-300 mb-3">Add Opening Balance</h4>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!id || !openingBalanceFormCounterparty) return;
                        setOpeningBalanceFormLoading(true);
                        try {
                          const clientId = isBusinessView ? openingBalanceFormCounterparty : id;
                          const businessId = isBusinessView ? id : openingBalanceFormCounterparty;
                          await apiSetClientBusinessOpeningBalance(clientId, businessId, Number(openingBalanceFormAmount) || 0);
                          addNotification('Opening balance saved.', 'success');
                          fetchData();
                          setOpeningBalanceFormAmount('');
                          setOpeningBalanceFormCounterparty('');
                        } catch (err) {
                          addNotification(`Failed: ${(err as Error).message}`, 'error');
                        } finally {
                          setOpeningBalanceFormLoading(false);
                        }
                      }}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <div className="min-w-[200px]">
                        <label className="block text-xs font-medium text-text-secondary dark:text-slate-400 mb-1">
                          {isBusinessView ? 'Client' : 'Business'}
                        </label>
                        <Select
                          value={openingBalanceFormCounterparty}
                          onChange={e => setOpeningBalanceFormCounterparty(e.target.value)}
                          options={[
                            { value: '', label: `Select ${isBusinessView ? 'client' : 'business'}...` },
                            ...(isBusinessView
                              ? ((item as Business).linkedClientIds?.length
                                  ? allClients.filter(c => (item as Business).linkedClientIds!.includes(c.id))
                                  : allClients
                                ).map(c => ({ value: c.id, label: c.name }))
                              : ((item as Client).linkedBusinessIds?.length
                                  ? allBusinesses.filter(b => (item as Client).linkedBusinessIds!.includes(b.id))
                                  : allBusinesses
                                ).map(b => ({ value: b.id, label: b.name }))
                            )
                          ]}
                        />
                      </div>
                      <div className="min-w-[140px]">
                        <label className="block text-xs font-medium text-text-secondary dark:text-slate-400 mb-1">Amount (MMK)</label>
                        <Input
                          type="number"
                          step="any"
                          value={openingBalanceFormAmount}
                          onChange={e => setOpeningBalanceFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0"
                          required
                        />
                      </div>
                      <Button type="submit" variant="primary" size="sm" isLoading={openingBalanceFormLoading}>Add</Button>
                    </form>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Use a negative number for a credit balance. Opening balances from manual entry and Excel import appear below.
                    </p>
                  </div>
                )}
                {/* Records table */}
                {!filteredOpeningBalanceRecords || filteredOpeningBalanceRecords.length === 0 ? (
                  <p className="text-text-secondary dark:text-slate-400">No opening balance records yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">{isBusinessView ? 'Client' : 'Business'}</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Opening Balance (MMK)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Paid (MMK)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Set Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredOpeningBalanceRecords.map(rec => {
                          const counterparty = isBusinessView
                            ? allClients.find(c => c.id === rec.clientId)
                            : allBusinesses.find(b => b.id === rec.businessId);
                          return (
                            <tr key={rec.id || `${rec.clientId}_${rec.businessId}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3 text-text-primary dark:text-slate-200">{counterparty?.name ?? (isBusinessView ? rec.clientId : rec.businessId)}</td>
                              <td className="px-4 py-3 text-right font-medium text-text-primary dark:text-slate-200">{(rec.openingBalance ?? 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-text-secondary dark:text-slate-400">{(rec.openingBalancePaid ?? 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-text-secondary dark:text-slate-400">{rec.openingBalanceSetDate ? formatDateForDisplay(rec.openingBalanceSetDate) : '—'}</td>
                              <td className="px-4 py-3 text-text-secondary dark:text-slate-400 text-xs">Manual / Import</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'balanceAdjustments' && (
              <div>
                {/* Balance Adj. tab KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <KPICard title="Net Adjustment" value={filteredBalanceAdjustments?.reduce((s, adj) => s + (adj.type === BalanceAdjustmentType.INCREASE ? (adj.amountMMK || 0) : -(adj.amountMMK || 0)), 0) ?? 0} icon={<AdjustIcon/>} colorClass={filteredBalanceAdjustments?.length ? 'bg-amber-500' : 'bg-gray-400'} />
                  <KPICard title="Records" value={filteredBalanceAdjustments?.length ?? 0} icon={<DocumentIcon/>} colorClass="bg-slate-500" valueSuffix="" />
                </div>
                {!filteredBalanceAdjustments || filteredBalanceAdjustments.length === 0 ? (
                  <p className="text-text-secondary dark:text-slate-400">No balance adjustments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reason</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredBalanceAdjustments.map(adj => (
                          <tr key={adj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{formatDateForDisplay(adj.adjustmentDate)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${adj.type === BalanceAdjustmentType.INCREASE ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                                {adj.type === BalanceAdjustmentType.INCREASE ? 'Increase' : 'Decrease'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-text-primary dark:text-slate-200">{adj.amountMMK?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-text-secondary dark:text-slate-400 max-w-xs truncate">{adj.reason}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${adj.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                {adj.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'badDebts' && (
              <div>
                {/* Bad Debts tab KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <KPICard title="Total Written Off" value={filteredBadDebts?.reduce((s, bd) => s + (bd.writtenOffAmount || 0), 0) ?? 0} icon={<BadDebtIcon/>} colorClass={filteredBadDebts?.length ? 'bg-orange-500' : 'bg-gray-400'} />
                  <KPICard title="Records" value={filteredBadDebts?.length ?? 0} icon={<DocumentIcon/>} colorClass="bg-slate-500" valueSuffix="" />
                </div>
                {!filteredBadDebts || filteredBadDebts.length === 0 ? (
                  <p className="text-text-secondary dark:text-slate-400">No bad debts recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Write-Off Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reference</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Original Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Written Off</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Recovered</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reason</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredBadDebts.map(bd => (
                          <tr key={bd.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{formatDateForDisplay(bd.writeOffDate)}</td>
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{bd.id}</td>
                            <td className="px-4 py-3 text-right font-medium text-text-primary dark:text-slate-200">{bd.originalAmount?.toLocaleString()} MMK</td>
                            <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{bd.writtenOffAmount?.toLocaleString()} MMK</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">{bd.recoveredAmount?.toLocaleString()} MMK</td>
                            <td className="px-4 py-3 text-text-secondary dark:text-slate-400 max-w-xs truncate">{bd.reason}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bd.status === 'fully_recovered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : bd.status === 'partially_recovered' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                {bd.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'allowanceProvisions' && (
              <div>
                {/* Allowance Prov. tab KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <KPICard title="Total Provision" value={clientAllowanceProvisions?.reduce((s, ap) => s + (ap.provisionAmount || 0), 0) ?? 0} icon={<AllowanceIcon/>} colorClass={clientAllowanceProvisions?.length ? 'bg-cyan-500' : 'bg-gray-400'} />
                  <KPICard title="Records" value={clientAllowanceProvisions?.length ?? 0} icon={<DocumentIcon/>} colorClass="bg-slate-500" valueSuffix="" />
                </div>
                {!clientAllowanceProvisions || clientAllowanceProvisions.length === 0 ? (
                  <p className="text-text-secondary dark:text-slate-400">No allowance provisions linked to this {isBusinessView ? 'business' : 'client'} yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reference</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Provision Date</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Provision Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total Receivables</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {clientAllowanceProvisions.map(ap => (
                          <tr key={ap.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{ap.id}</td>
                            <td className="px-4 py-3 text-text-primary dark:text-slate-200">{formatDateForDisplay(ap.provisionDate)}</td>
                            <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">{ap.provisionAmount?.toLocaleString()} MMK</td>
                            <td className="px-4 py-3 text-right text-text-secondary dark:text-slate-400">{ap.totalReceivables?.toLocaleString()} MMK</td>
                            <td className="px-4 py-3 text-text-secondary dark:text-slate-400 max-w-xs truncate">{ap.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {isRecordPaymentModalOpen && loggedInUser && (
            <RecordPaymentModal 
                isOpen={isRecordPaymentModalOpen}
                onClose={() => {
                  setIsRecordPaymentModalOpen(false);
                  setEditingPayment(null);
                  setPaymentModalDefaults({});
                  setSelectedSalesRecordIds(new Set());
                }}
                onSuccess={() => {
                  setIsRecordPaymentModalOpen(false);
                  setEditingPayment(null);
                  setPaymentModalDefaults({});
                  setSelectedSalesRecordIds(new Set());
                  fetchData();
                }}
                clients={allClients}
                businesses={allBusinesses}
                invoices={allInvoices}
                sales={allSales}
                payments={clientOrBusinessPayments}
                creditNotes={clientCreditNotes}
                paymentMethods={paymentMethods}
                cashAccounts={cashAccounts}
                editingPayment={editingPayment ?? undefined}
                defaultClientId={editingPayment ? undefined : (isBusinessView ? undefined : item.id)}
                defaultBusinessId={editingPayment ? undefined : (isBusinessView ? item.id : undefined)}
                defaultAmount={undefined}
                calculatedOutstandingBalance={balanceData.outstanding}
                {...(editingPayment ? {} : paymentModalDefaults)}
            />
        )}
        {isRecordCreditNoteModalOpen && (
            <RecordCreditNoteModal
                isOpen={isRecordCreditNoteModalOpen}
                onClose={() => {
                  setIsRecordCreditNoteModalOpen(false);
                  setEditingCreditNote(null);
                  setPaymentModalDefaults({});
                }}
                onSuccess={() => {
                  setIsRecordCreditNoteModalOpen(false);
                  setEditingCreditNote(null);
                  setPaymentModalDefaults({});
                  fetchData();
                }}
                clients={allClients}
                businesses={allBusinesses}
                sales={allSales}
                allServices={allServices}
                editingCreditNote={editingCreditNote}
                defaultClientId={editingCreditNote?.clientId || (isBusinessView ? ((item as Business).linkedClientIds && (item as Business).linkedClientIds.length > 0 ? (item as Business).linkedClientIds[0] : undefined) : item.id)}
                defaultBusinessId={editingCreditNote?.businessId || (isBusinessView ? item.id : ((item as Client).linkedBusinessIds && (item as Client).linkedBusinessIds.length > 0 ? (item as Client).linkedBusinessIds[0] : undefined))}
                defaultSaleId={editingCreditNote?.saleRecordId || (paymentModalDefaults as any).defaultSaleId}
                calculatedOutstandingBalance={balanceData.outstanding}
            />
        )}
       {isAddSaleModalOpen && loggedInUser && (
            <AddSaleModal 
                isOpen={isAddSaleModalOpen}
                onClose={() => { setIsAddSaleModalOpen(false); setEditingSale(null); }}
                onSuccess={(newSale, shouldPay) => { setIsAddSaleModalOpen(false); setEditingSale(null); fetchData(); if (shouldPay) { setEditingPayment(null); setIsRecordPaymentModalOpen(true); } }}
                onRecordPayment={(sale) => {
                    setEditingPayment(null);
                    setPaymentModalDefaults({
                        defaultSaleId: sale.id,
                        defaultClientId: sale.clientId,
                        defaultBusinessId: sale.businessId,
                        defaultAmount: Math.max((sale.grandTotalMMK || 0) - (clientOrBusinessPayments.filter(p => p.saleRecordId === sale.id).reduce((s, p) => s + (p.amountMMK || 0), 0)), 0),
                    });
                    setIsAddSaleModalOpen(false);
                    setIsRecordPaymentModalOpen(true);
                }}
                editingSale={editingSale}
                clients={allClients}
                businesses={allBusinesses}
                allServices={allServices}
                loggedInUser={loggedInUser}
                allUsers={users}
                campaignObjectives={campaignObjectives}
                paymentMethods={paymentMethods}
                cashAccounts={cashAccounts}
                defaultClientId={isBusinessView ? ((item as Business).linkedClientIds && (item as Business).linkedClientIds.length > 0 ? (item as Business).linkedClientIds[0] : undefined) : item.id}
                defaultBusinessId={isBusinessView ? item.id : ((item as Client).linkedBusinessIds && (item as Client).linkedBusinessIds.length > 0 ? (item as Client).linkedBusinessIds[0] : undefined)}
            />
        )}
        {isBalanceModalOpen && (
            <SetOpeningBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                currentItem={item}
                onSave={async (amount) => {
                    // This logic is simplified; a real app might need more complex balance recalculation
                    const updatePayload = { id: item.id, openingBalance: amount, openingBalanceSetDate: new Date().toISOString() };
                    try {
                        if(isBusinessView) {
                            await apiUpdateBusiness(updatePayload as any);
                        } else {
                            await apiUpdateClient(updatePayload as any);
                        }
                        addNotification("Opening balance set.", "success");
                        fetchData();
                        setIsBalanceModalOpen(false);
                    } catch (e) {
                        addNotification(`Failed: ${(e as Error).message}`, "error");
                    }
                }}
            />
        )}
        {isCreateInvoiceModalOpen && item && (
            <CreateInvoiceFromHistoryModal
                isOpen={isCreateInvoiceModalOpen}
                onClose={() => {
                    setIsCreateInvoiceModalOpen(false);
                    setSelectedSalesRecordIds(new Set());
                }}
                onSuccess={() => {
                    fetchData();
                    setSelectedSalesRecordIds(new Set());
                }}
                selectedRecords={purchaseHistoryRecords.filter(r => r.type === 'Sale' && selectedSalesRecordIds.has(r.record.id))}
                client={item}
                isBusinessView={isBusinessView}
            />
        )}
        <DownloadPDFModal
          isOpen={isDownloadPDFModalOpen}
          onClose={() => setIsDownloadPDFModalOpen(false)}
          onConfirm={handleDownloadSalesRecordsPDF}
          isLoading={isDownloadingPdf}
        />
        {isEditClientModalOpen && item && !isBusinessView && (
          <AddClientModal
            isOpen={isEditClientModalOpen}
            onClose={() => setIsEditClientModalOpen(false)}
            onSuccess={() => { setIsEditClientModalOpen(false); fetchData(); }}
            existingBusinesses={allBusinesses}
            existingClient={item as Client}
          />
        )}
        {isEditBusinessModalOpen && item && isBusinessView && (
          <AddBusinessModal
            isOpen={isEditBusinessModalOpen}
            onClose={() => setIsEditBusinessModalOpen(false)}
            onSuccess={() => { setIsEditBusinessModalOpen(false); fetchData(); }}
            existingClients={allClients}
            existingBusiness={item as Business}
          />
        )}
        <Modal
          isOpen={isMergeClientsModalOpen}
          onClose={() => { if (!isMergingClients) { setIsMergeClientsModalOpen(false); setMergeSearchTerm(''); } }}
          title="Merge Clients"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setIsMergeClientsModalOpen(false); setMergeSearchTerm(''); }} disabled={isMergingClients}>Cancel</Button>
              <Button
                variant="primary"
                isLoading={isMergingClients}
                disabled={mergeSelectedClientIds.size < 2}
                onClick={async () => {
                  if (mergeSelectedClientIds.size < 2) return;
                  const confirmed = await showConfirmation({
                    title: 'Merge Clients',
                    message: `Merge ${mergeSelectedClientIds.size} clients? The client with the lowest ID will be kept. All others will be deleted and their data moved to the remaining client.`,
                    confirmText: 'Merge',
                    cancelText: 'Cancel',
                    confirmVariant: 'primary',
                  });
                  if (!confirmed) return;
                  setIsMergingClients(true);
                  try {
                    const { remainingClientId } = await apiMergeClients(Array.from(mergeSelectedClientIds));
                    addNotification(`Successfully merged ${mergeSelectedClientIds.size} clients.`, 'success');
                    setIsMergeClientsModalOpen(false);
                    setMergeSelectedClientIds(new Set());
                    navigate(`/clients/${remainingClientId}`);
                  } catch (err) {
                    addNotification(`Failed to merge: ${(err as Error).message}`, 'error');
                  } finally {
                    setIsMergingClients(false);
                  }
                }}
              >
                Merge Selected
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
            Select clients to merge. The client with the <strong>lowest ID</strong> will be kept. All others will be deleted and their transactions, businesses, and balances moved to the remaining client.
          </p>
          <input
            type="text"
            placeholder="Search by client name, client ID, linked business name or ID..."
            value={mergeSearchTerm}
            onChange={e => setMergeSearchTerm(e.target.value)}
            className="w-full mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-action focus:border-primary-action"
          />
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-1">
            {(() => {
              const term = mergeSearchTerm.trim().toLowerCase();
              const filtered = term
                ? allClients.filter(client => {
                    const nameMatch = (client.name ?? '').toLowerCase().includes(term);
                    const idMatch = (client.id ?? '').toLowerCase().includes(term);
                    const linkedMatch = (client.linkedBusinessIds ?? []).some(bId => {
                      const biz = allBusinesses.find(b => b.id === bId);
                      return (biz?.name ?? '').toLowerCase().includes(term) || (biz?.id ?? '').toLowerCase().includes(term);
                    });
                    return nameMatch || idMatch || linkedMatch;
                  })
                : allClients;
              return filtered.map((client) => (
                <label key={client.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeSelectedClientIds.has(client.id)}
                    onChange={(e) => {
                      const next = new Set(mergeSelectedClientIds);
                      if (e.target.checked) next.add(client.id);
                      else next.delete(client.id);
                      setMergeSelectedClientIds(next);
                    }}
                    className="rounded text-primary-action"
                  />
                  <span className="font-medium text-gray-900 dark:text-slate-200">{(client.name || 'N/A').trim() || 'N/A'}</span>
                  <span className="text-xs text-gray-600 dark:text-slate-500">({client.id})</span>
                </label>
              ));
            })()}
          </div>
          {mergeSelectedClientIds.size > 0 && (
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-2">
              {mergeSelectedClientIds.size} selected. {mergeSelectedClientIds.size < 2 ? 'Select at least 2 to merge.' : `Will keep: ${[...mergeSelectedClientIds].sort((a, b) => a.localeCompare(b))[0]}`}
            </p>
          )}
        </Modal>
        <Modal
          isOpen={isUnmergeModalOpen}
          onClose={() => { if (!isUnmerging) { setIsUnmergeModalOpen(false); setSelectedUnmergeSnapshot(null); } }}
          title="Unmerge Clients"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setIsUnmergeModalOpen(false); setSelectedUnmergeSnapshot(null); }} disabled={isUnmerging}>Cancel</Button>
              <Button
                variant="primary"
                isLoading={isUnmerging}
                disabled={!selectedUnmergeSnapshot}
                onClick={async () => {
                  if (!selectedUnmergeSnapshot) return;
                  const confirmed = await showConfirmation({
                    title: 'Unmerge Clients',
                    message: `Restore ${selectedUnmergeSnapshot.toMergeIds.length} client(s) (${selectedUnmergeSnapshot.toMergeIds.join(', ')})? All data moved during merge will be reverted.`,
                    confirmText: 'Unmerge',
                    cancelText: 'Cancel',
                    confirmVariant: 'primary',
                  });
                  if (!confirmed) return;
                  setIsUnmerging(true);
                  try {
                    await apiUnmergeClients(selectedUnmergeSnapshot.id);
                    addNotification(`Successfully unmerged. Restored: ${selectedUnmergeSnapshot.toMergeIds.join(', ')}`, 'success');
                    setIsUnmergeModalOpen(false);
                    setSelectedUnmergeSnapshot(null);
                    fetchData();
                    apiGetMergeSnapshotsForClient(id!).then(setMergeSnapshots).catch(() => setMergeSnapshots([]));
                    dispatchRefreshData();
                  } catch (err) {
                    addNotification(`Failed to unmerge: ${(err as Error).message}`, 'error');
                  } finally {
                    setIsUnmerging(false);
                  }
                }}
              >
                Unmerge Selected
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
            Select a merge to reverse. This will restore the merged clients and move their data back.
          </p>
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-2">
            {mergeSnapshots.map((snap) => (
              <label
                key={snap.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${
                  selectedUnmergeSnapshot?.id === snap.id
                    ? 'border-primary-action bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="unmerge-snapshot"
                  checked={selectedUnmergeSnapshot?.id === snap.id}
                  onChange={() => setSelectedUnmergeSnapshot(snap)}
                  className="text-primary-action"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-slate-200">
                    Kept: {snap.remainingClientId} → Merged: {snap.toMergeIds.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    {new Date(snap.createdAt).toLocaleString()}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </Modal>
        <Modal
          isOpen={isMergeBusinessesModalOpen}
          onClose={() => { if (!isMergingBusinesses) { setIsMergeBusinessesModalOpen(false); setMergeBusinessSearchTerm(''); } }}
          title="Merge Businesses"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setIsMergeBusinessesModalOpen(false); setMergeBusinessSearchTerm(''); }} disabled={isMergingBusinesses}>Cancel</Button>
              <Button
                variant="primary"
                isLoading={isMergingBusinesses}
                disabled={mergeSelectedBusinessIds.size < 2}
                onClick={async () => {
                  if (mergeSelectedBusinessIds.size < 2) return;
                  const confirmed = await showConfirmation({
                    title: 'Merge Businesses',
                    message: `Merge ${mergeSelectedBusinessIds.size} businesses? The business with the lowest ID will be kept. All others will be deleted and their data moved to the remaining business.`,
                    confirmText: 'Merge',
                    cancelText: 'Cancel',
                    confirmVariant: 'primary',
                  });
                  if (!confirmed) return;
                  setIsMergingBusinesses(true);
                  try {
                    const { remainingBusinessId } = await apiMergeBusinesses(Array.from(mergeSelectedBusinessIds));
                    addNotification(`Successfully merged ${mergeSelectedBusinessIds.size} businesses.`, 'success');
                    setIsMergeBusinessesModalOpen(false);
                    setMergeSelectedBusinessIds(new Set());
                    navigate(`/businesses/${remainingBusinessId}`);
                  } catch (err) {
                    addNotification(`Failed to merge: ${(err as Error).message}`, 'error');
                  } finally {
                    setIsMergingBusinesses(false);
                  }
                }}
              >
                Merge Selected
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
            Select businesses to merge. Only businesses linked to the <strong>same client(s)</strong> can be merged. The business with the <strong>lowest ID</strong> will be kept. All others will be deleted and their transactions, notes, and balances moved to the remaining business.
          </p>
          <input
            type="text"
            placeholder="Search by business name, ID, or linked client name..."
            value={mergeBusinessSearchTerm}
            onChange={e => setMergeBusinessSearchTerm(e.target.value)}
            className="w-full mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 px-3 py-2 text-sm placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary-action focus:border-primary-action"
          />
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-1">
            {(() => {
              const term = mergeBusinessSearchTerm.trim().toLowerCase();
              const filtered = term
                ? mergeableBusinessesList.filter(biz => {
                    const nameMatch = (biz.name ?? '').toLowerCase().includes(term);
                    const idMatch = (biz.id ?? '').toLowerCase().includes(term);
                    const clientMatch = (biz.linkedClientIds ?? []).some(cId => {
                      const cl = allClients.find(c => c.id === cId);
                      return (cl?.name ?? '').toLowerCase().includes(term) || (cId ?? '').toLowerCase().includes(term);
                    });
                    return nameMatch || idMatch || clientMatch;
                  })
                : mergeableBusinessesList;
              return filtered.map((biz) => (
                <label key={biz.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeSelectedBusinessIds.has(biz.id)}
                    onChange={(e) => {
                      const next = new Set(mergeSelectedBusinessIds);
                      if (e.target.checked) next.add(biz.id);
                      else next.delete(biz.id);
                      setMergeSelectedBusinessIds(next);
                    }}
                    className="rounded text-primary-action"
                  />
                  <span className="font-medium text-gray-900 dark:text-slate-200">{(biz.name || 'N/A').trim() || 'N/A'}</span>
                  <span className="text-xs text-gray-600 dark:text-slate-500">({biz.id})</span>
                </label>
              ));
            })()}
          </div>
          {mergeSelectedBusinessIds.size > 0 && (
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-2">
              {mergeSelectedBusinessIds.size} selected. {mergeSelectedBusinessIds.size < 2 ? 'Select at least 2 to merge.' : `Will keep: ${[...mergeSelectedBusinessIds].sort((a, b) => a.localeCompare(b))[0]}`}
            </p>
          )}
        </Modal>
        <Modal
          isOpen={isUnmergeBusinessModalOpen}
          onClose={() => { if (!isUnmergingBusinesses) { setIsUnmergeBusinessModalOpen(false); setSelectedUnmergeBusinessSnapshot(null); } }}
          title="Unmerge Businesses"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setIsUnmergeBusinessModalOpen(false); setSelectedUnmergeBusinessSnapshot(null); }} disabled={isUnmergingBusinesses}>Cancel</Button>
              <Button
                variant="primary"
                isLoading={isUnmergingBusinesses}
                disabled={!selectedUnmergeBusinessSnapshot}
                onClick={async () => {
                  if (!selectedUnmergeBusinessSnapshot) return;
                  const confirmed = await showConfirmation({
                    title: 'Unmerge Businesses',
                    message: `Restore ${selectedUnmergeBusinessSnapshot.toMergeIds.length} business(es) (${selectedUnmergeBusinessSnapshot.toMergeIds.join(', ')})? All data moved during merge will be reverted.`,
                    confirmText: 'Unmerge',
                    cancelText: 'Cancel',
                    confirmVariant: 'primary',
                  });
                  if (!confirmed) return;
                  setIsUnmergingBusinesses(true);
                  try {
                    await apiUnmergeBusinesses(selectedUnmergeBusinessSnapshot.id);
                    addNotification(`Successfully unmerged. Restored: ${selectedUnmergeBusinessSnapshot.toMergeIds.join(', ')}`, 'success');
                    setIsUnmergeBusinessModalOpen(false);
                    setSelectedUnmergeBusinessSnapshot(null);
                    fetchData();
                    apiGetMergeSnapshotsForBusiness(id!).then(setBusinessMergeSnapshots).catch(() => setBusinessMergeSnapshots([]));
                    dispatchRefreshData();
                  } catch (err) {
                    addNotification(`Failed to unmerge: ${(err as Error).message}`, 'error');
                  } finally {
                    setIsUnmergingBusinesses(false);
                  }
                }}
              >
                Unmerge Selected
              </Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
            Select a merge to reverse. This will restore the merged businesses and move their data back.
          </p>
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-2">
            {businessMergeSnapshots.map((snap) => (
              <label
                key={snap.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${
                  selectedUnmergeBusinessSnapshot?.id === snap.id
                    ? 'border-primary-action bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="unmerge-business-snapshot"
                  checked={selectedUnmergeBusinessSnapshot?.id === snap.id}
                  onChange={() => setSelectedUnmergeBusinessSnapshot(snap)}
                  className="text-primary-action"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-slate-200">
                    Kept: {snap.remainingBusinessId} → Merged: {snap.toMergeIds.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    {new Date(snap.createdAt).toLocaleString()}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </Modal>
  </div>;
};

export default ClientDetailPage;
