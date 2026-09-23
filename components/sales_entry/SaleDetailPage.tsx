import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subscribeRefreshData } from '../../utils/refreshDataBus';
import { 
    SaleRecord, Client, Business, Payment, User, PaymentMethodSetting, Invoice, SaleStatus, PaymentStatus,
    FacebookAdsSaleRecord, OtherServicesSaleRecord, Permission, CashAccount
} from '../../types';
import { 
    apiGetSaleById, 
    apiGetPaymentsForSale,
    apiGetPayments,
    apiGetPaymentsForClient,
    apiGetPaymentsForBusiness,
    apiGetClientById, 
    apiGetBusinessById, 
    apiGetUsers,
    apiGetPaymentMethodSettings,
    apiGetCashAccounts,
    apiGetInvoicesForClient,
    apiGetInvoicesForBusiness,
    apiRecordPayment,
    apiGetSalesForClient,
    apiGetSalesForBusiness,
    apiGetClients,
    apiGetBusinesses,
    apiCreateInvoiceFromSale,
    apiGetServices,
    apiGetCampaignObjectiveSettings
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import RecordPaymentModal from '../finance/modals/RecordPaymentModal';
import RecordCreditNoteModal from '../finance/modals/RecordCreditNoteModal';
import AddSaleModal from './modals/AddSaleModal';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { STATUS_COLORS } from '../../constants';
import { formatDateForDisplay } from '../../utils/dateUtils';

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; className?: string }> = ({ label, value, children, className }) => (
    <div className={`py-2 ${className}`}>
        <p className="text-sm font-medium text-text-secondary dark:text-slate-400">{label}</p>
        {children ? <div className="text-md text-text-primary dark:text-slate-200">{children}</div> : <p className="text-md text-text-primary dark:text-slate-200">{value || 'N/A'}</p>}
    </div>
);

const KPICard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string; }> = ({ title, value, icon, colorClass }) => (
    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-center border border-slate-200 dark:border-slate-700">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-text-primary dark:text-slate-200">{value.toLocaleString()} <span className="text-lg font-normal">MMK</span></p>
        </div>
    </div>
);
const BilledIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.875c-.372 0-.744.052-1.123.08C2.745 4.01 2.25 4.973 2.25 6.108v11.785c0 1.275 1.05 2.308 2.333 2.308H15a2.25 2.25 0 0 0 2.25-2.25Z" /></svg>;
const PaidIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const DueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;

const SaleDetailPage: React.FC = () => {
    const { saleId } = useParams<{ saleId: string }>();
    const { user: loggedInUser, hasPermission } = useAuth();
    const { addNotification } = useNotification();

    const canEditThisSale = (s: SaleRecord) => hasPermission(Permission.EDIT_ALL_SALE_RECORDS) || (hasPermission(Permission.EDIT_SALE_RECORD) && s?.inChargeUserId === loggedInUser?.id);
    
    const [sale, setSale] = useState<SaleRecord | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [clientOrBusinessPayments, setClientOrBusinessPayments] = useState<Payment[]>([]); // All payments for client/business
    const [users, setUsers] = useState<User[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
    const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]); 
    const [allBusinesses, setAllBusinesses] = useState<Business[]>([]); // Added state
    const [allSales, setAllSales] = useState<SaleRecord[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [allServices, setAllServices] = useState<any[]>([]);
    const [campaignObjectives, setCampaignObjectives] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    
    const fetchData = useCallback(async () => {
        if (!saleId) {
            addNotification("No Sale ID provided.", "error");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // Load critical data first (sale, payments, clients, businesses, invoices, sales) - needed immediately
            const [fSale, fPayments, fClients, fBusinesses] = await Promise.all([
                apiGetSaleById(saleId),
                apiGetPaymentsForSale(saleId),
                apiGetClients(),
                apiGetBusinesses(),
            ]);
            const [fInvoices, fSales] = fSale
                ? await Promise.all([
                    fSale.businessId ? apiGetInvoicesForBusiness(fSale.businessId) : apiGetInvoicesForClient(fSale.clientId || ''),
                    fSale.businessId ? apiGetSalesForBusiness(fSale.businessId) : apiGetSalesForClient(fSale.clientId || ''),
                ])
                : [[] as Invoice[], [] as SaleRecord[]];

            setSale(fSale);
            setPayments(fPayments);
            setAllClients(fClients); 
            setAllBusinesses(fBusinesses);
            setAllInvoices(fInvoices);
            setAllSales(fSales);

            if (fSale) {
                const foundClient = fClients.find(c => c.id === fSale.clientId) || null;
                const foundBusiness = fBusinesses.find(b => b.id === fSale.businessId) || null;
                setClient(foundClient);
                setBusiness(foundBusiness);
                
                // Fetch all payments for client/business to calculate paid amount correctly
                // This includes general payments that might be allocated to this sale
                if (foundClient) {
                    const clientPayments = await apiGetPaymentsForClient(fSale.clientId || '');
                    setClientOrBusinessPayments(clientPayments);
                } else if (foundBusiness) {
                    const businessPayments = await apiGetPaymentsForBusiness(fSale.businessId || '');
                    setClientOrBusinessPayments(businessPayments);
                } else {
                    setClientOrBusinessPayments([]);
                }
            }
            
            // Set loading to false so UI can render with critical data
            setIsLoading(false);
            
            // Load secondary data in background (scoped to client/business to reduce reads)
            const fetchPayments = fSale
                ? (fSale.businessId ? apiGetPaymentsForBusiness(fSale.businessId) : apiGetPaymentsForClient(fSale.clientId || ''))
                : Promise.resolve([]);
            Promise.all([
                apiGetUsers(),
                apiGetCashAccounts(),
                apiGetPaymentMethodSettings(),
                fetchPayments,
                apiGetServices(),
                apiGetCampaignObjectiveSettings()
            ]).then(([fUsers, fCashAccounts, fPaymentMethods, fAllPayments, fServices, fCampaignObjectives]) => {
                setUsers(fUsers);
                setAllPayments(fAllPayments);
                setCashAccounts(fCashAccounts || []);
                // Convert cash accounts to payment method format (for active accounts)
                const cashAccountMethods: PaymentMethodSetting[] = (fCashAccounts || [])
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
                const allMethods = [...cashAccountMethods, ...fPaymentMethods.filter((pm: PaymentMethodSetting) => pm.isActive)];
                setPaymentMethods(allMethods);
                setAllServices(fServices);
                setCampaignObjectives(fCampaignObjectives.filter(s => s.isActive));
            }).catch(error => {
                console.error("Failed to load secondary data:", error);
                // Don't show error notification for secondary data
            });
        } catch (error) {
            addNotification("Failed to load sale details.", "error");
        }
        setIsLoading(false);
    }, [saleId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Listen for global refresh events (debounced)
    useEffect(() => {
        return subscribeRefreshData(() => {
            fetchData();
        });
    }, [fetchData]);

    const handlePaymentSuccess = () => {
        fetchData();
        setIsPaymentModalOpen(false);
    };

    const formatDate = (dateString: string) => formatDateForDisplay(dateString);
    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown';
    
    const salePayments = useMemo(() => {
        if (!sale?.id) return [];
        return clientOrBusinessPayments.filter(payment => {
            if (payment.saleRecordId === sale.id) return true;
            return !!payment.saleAllocations?.some(allocation => allocation.saleRecordId === sale.id);
        });
    }, [clientOrBusinessPayments, sale?.id]);
    
    // Calculate paid amount similar to ClientDetailPage - includes direct payments and general payments allocated chronologically
    const computedAmountPaid = useMemo(() => {
      if (!sale || !sale.id) return 0;
      
      // Initialize paid amount map for all relevant sales
      const paidAmounts = new Map<string, number>();
      
      // Get all relevant sales for this client/business
      const relevantSales = allSales.filter(s => {
        if (!s.id) return false;
        if (sale.clientId && s.clientId === sale.clientId) return true;
        if (sale.businessId && s.businessId === sale.businessId) return true;
        return false;
      });
      
      // Initialize all sales with 0 paid
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
      
      // Invoice payments are allocated to sales when approved; no extra add here to avoid double counting.
      
      return paidAmounts.get(sale.id) || 0;
    }, [sale, clientOrBusinessPayments, allSales, allInvoices]);
    
    const storedAmountPaid = sale && typeof sale.amountPaid === 'number'
      ? sale.amountPaid
      : 0;
    const amountPaid = Math.max(storedAmountPaid, computedAmountPaid);
    
    const amountDue = sale ? (sale.grandTotalMMK || 0) - amountPaid : 0;
    const relatedInvoice = sale
      ? (sale.invoiceId
          ? allInvoices.find(inv => inv.id === sale.invoiceId)
          : allInvoices.find(inv => inv.saleRecordId === sale.id))
      : null;

    const handleGenerateInvoice = async () => {
        if (!sale?.id) return;
        setIsGeneratingInvoice(true);
        try {
            const invoice = await apiCreateInvoiceFromSale(sale.id);
            addNotification(`Invoice ${invoice.id} created from sale ${sale.id}.`, 'success');
            fetchData();
        } catch (error) {
            addNotification(`Failed to create invoice: ${(error as Error).message}`, 'error');
        } finally {
            setIsGeneratingInvoice(false);
        }
    };

    const renderServiceSpecificDetails = (sale: SaleRecord) => {
        switch (sale.type) {
            case 'Facebook Ads':
                const fbSale = sale as FacebookAdsSaleRecord;
                return (
                    <section>
                        <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-2 pt-4 border-t dark:border-slate-700">Campaign Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <DetailItem label="Campaign Objective" value={fbSale.campaignObjective} />
                            <DetailItem label="Budget" value={`$${(fbSale.budgetUSD || 0).toLocaleString()}`} />
                            <DetailItem label="Service Rate" value={`${(fbSale.serviceRateMMK || 0).toLocaleString()} MMK per USD`} />
                            <DetailItem label="Start Date" value={formatDate(fbSale.startDate)} />
                            <DetailItem label="Duration" value={`${fbSale.durationDays} days`} />
                        </div>
                    </section>
                );
            case 'Other Services':
                const otherSale = sale as OtherServicesSaleRecord;
                return (
                    <section>
                        <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-2 pt-4 border-t dark:border-slate-700">Service Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <DetailItem label="Sales Date" value={formatDate(otherSale.saleDate || sale.createdAt)} />
                            <DetailItem label="Quantity" value={otherSale.quantity} />
                            <DetailItem label="Unit Price" value={`${(otherSale.unitPriceMMK || 0).toLocaleString()} MMK`} />
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    if (!sale) return <div className="text-center text-text-primary p-8">Sale record not found.</div>;
    
    return (
        <div className="bg-app-bg dark:bg-slate-900 p-2 sm:p-6 space-y-6">
            <div className="bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">Sale Record: {sale.id}</h1>
                        {amountDue <= 0 && sale.grandTotalMMK > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-status-success text-white">PAID</span>
                          </div>
                        )}
                    </div>
                     <div className="flex flex-wrap items-center gap-3">
                        {sale && canEditThisSale(sale) && (
                            <Button
                                onClick={() => setIsEditModalOpen(true)}
                                variant="primary"
                                size="sm"
                            >
                                Edit
                            </Button>
                        )}
                        {!relatedInvoice && (
                            <Button
                                onClick={handleGenerateInvoice}
                                variant="secondary"
                                size="sm"
                                isLoading={isGeneratingInvoice}
                            >
                                Generate Invoice
                            </Button>
                        )}
                        {amountDue > 0 && <Button onClick={() => setIsPaymentModalOpen(true)} variant="success" size="sm">Record Payment</Button>}
                        {amountPaid > 0 && <Button onClick={() => setIsCreditNoteModalOpen(true)} variant="warning" size="sm">Credit Note</Button>}
                        <Link to="/sales" className="text-primary-action hover:text-blue-700 text-sm font-medium">&larr; Back to List</Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPICard title="Total Amount" value={sale.grandTotalMMK || 0} icon={<BilledIcon/>} colorClass="bg-blue-500" />
                <KPICard title="Total Paid" value={amountPaid} icon={<PaidIcon/>} colorClass="bg-green-500" />
                <KPICard title="Amount Due" value={amountDue} icon={<DueIcon/>} colorClass={amountDue > 0 ? "bg-red-500" : "bg-gray-500"} />
            </div>
            
             <div className="bg-container-bg dark:bg-slate-800 shadow-lg rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary hover:text-gray-700'}`}>Details</button>
                    <button onClick={() => setActiveTab('payments')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary hover:text-gray-700'}`}>Payment History ({salePayments.length})</button>
                    </nav>
                </div>
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-2">General Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <DetailItem label="Client" value={client?.name} />
                                <DetailItem label="Business" value={business?.name} />
                                <DetailItem label="In-Charge Staff" value={getUserName(sale.inChargeUserId)} />
                                {sale.lastEditedByUserId && (
                                    <DetailItem label="Last Edited By" value={`${getUserName(sale.lastEditedByUserId)} (${formatDate(sale.lastEditedAt || '')})`} />
                                )}
                                <DetailItem label="Sale Date" value={formatDate(
                                    sale.type === 'Other Services'
                                        ? ((sale as OtherServicesSaleRecord).saleDate || sale.createdAt)
                                        : sale.createdAt
                                )} />
                                <DetailItem
                                    label="Service Name"
                                    value={sale.serviceId
                                        ? (allServices.find(service => service.id === sale.serviceId)?.name || sale.type)
                                        : sale.type}
                                />
                                <DetailItem label="Related Invoice">
                                    {relatedInvoice ? <Link to={`/sales/invoices/${relatedInvoice.id}`} className="text-primary-action hover:underline">{relatedInvoice.id}</Link> : 'Not Invoiced'}
                                </DetailItem>
                            </div>
                        </section>
                        
                        {renderServiceSpecificDetails(sale)}

                        <section>
                            <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-2 pt-4 border-t dark:border-slate-700">Financial Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <DetailItem label="Subtotal" value={`${(sale.subtotalMMK || 0).toLocaleString()} MMK`} />
                                <DetailItem label="Discounts" value={`${((sale.packageDiscountMMK || 0) + (sale.manualDiscountMMK || 0)).toLocaleString()} MMK`} />
                                {sale.otherFeesAmountMMK && sale.otherFeesAmountMMK > 0 && (
                                    <DetailItem label={sale.otherFeesDescription || 'Other Fees'} value={`${sale.otherFeesAmountMMK.toLocaleString()} MMK`} />
                                )}
                                <DetailItem label="Tax" value={`${(sale.taxAmountMMK || 0).toLocaleString()} MMK`} />
                                <DetailItem label="Grand Total" className="font-bold">
                                    <span className="text-xl font-bold text-gray-900 dark:text-slate-100">{(sale.grandTotalMMK || 0).toLocaleString()} MMK</span>
                                </DetailItem>
                                <DetailItem label="Payment Status">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        amountDue <= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                        amountPaid > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' :
                                        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}>
                                        {amountDue <= 0 ? 'Fully Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid'}
                                    </span>
                                </DetailItem>
                                <DetailItem label="Paid Amount" value={`${amountPaid.toLocaleString()} MMK`} />
                                <DetailItem label="Amount Due" className={amountDue > 0 ? "font-semibold" : ""}>
                                    <span className={amountDue > 0 ? "text-lg font-semibold text-red-600 dark:text-red-400" : "text-lg font-semibold text-gray-900 dark:text-slate-100"}>{amountDue.toLocaleString()} MMK</span>
                                </DetailItem>
                            </div>
                        </section>

                        {sale.notes && (
                            <section>
                                <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-2 pt-4 border-t dark:border-slate-700">Notes</h3>
                                <p className="text-text-primary dark:text-slate-200 whitespace-pre-wrap">{sale.notes}</p>
                            </section>
                        )}
                    </div>
                )}
                {activeTab === 'payments' && (
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50"><tr><th className="px-4 py-2 text-left font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Receipt #</th><th className="px-4 py-2 text-left font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th><th className="px-4 py-2 text-right font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th><th className="px-4 py-2 text-left font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Method</th><th className="px-4 py-2 text-left font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Recorded By</th></tr></thead>
                            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {salePayments.map(p => <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50"><td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{p.receiptNumber}</td><td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{formatDate(p.paymentDate)}</td><td className="px-4 py-2 text-right text-sm text-text-primary dark:text-slate-200 font-medium">{p.amountMMK.toLocaleString()}</td><td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{p.method}</td><td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{getUserName(p.recordedByUserId)}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isPaymentModalOpen && loggedInUser && (
                <RecordPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                    clients={allClients}
                    businesses={allBusinesses}
                    invoices={allInvoices}
                    sales={allSales}
                    payments={allPayments}
                    paymentMethods={paymentMethods}
                    defaultClientId={sale.clientId}
                    defaultSaleId={sale.id}
                    defaultAmount={amountDue > 0 ? amountDue : undefined}
                />
            )}

            {isCreditNoteModalOpen && loggedInUser && (
                <RecordCreditNoteModal
                    isOpen={isCreditNoteModalOpen}
                    onClose={() => setIsCreditNoteModalOpen(false)}
                    onSuccess={() => { setIsCreditNoteModalOpen(false); fetchData(); }}
                    clients={allClients}
                    businesses={allBusinesses}
                    sales={allSales}
                    defaultClientId={sale.clientId}
                    defaultBusinessId={sale.businessId}
                    defaultSaleId={sale.id}
                />
            )}

            {isEditModalOpen && loggedInUser && sale && (
                <AddSaleModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={(newSale, shouldRecordPayment) => {
                        setIsEditModalOpen(false);
                        fetchData();
                        if (shouldRecordPayment && newSale) {
                            setIsPaymentModalOpen(true);
                        }
                    }}
                    onRecordPayment={(s) => {
                        setIsEditModalOpen(false);
                        fetchData();
                        setIsPaymentModalOpen(true);
                    }}
                    editingSale={sale}
                    clients={allClients}
                    businesses={allBusinesses}
                    allServices={allServices}
                    loggedInUser={loggedInUser}
                    allUsers={users}
                    campaignObjectives={campaignObjectives}
                    paymentMethods={paymentMethods}
                    cashAccounts={cashAccounts}
                />
            )}
        </div>
    );
};

export default SaleDetailPage;