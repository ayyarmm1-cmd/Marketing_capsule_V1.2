import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Invoice, Client, Business, CompanyProfileSetting, Service, SaleRecord, PaymentMethodSetting, InvoiceStatus, CashAccount } from '../../../types';
import { 
    apiGetInvoiceById, 
    apiGetClientById, 
    apiGetBusinessById, 
    apiGetCompanyProfile,
    apiDeleteInvoice,
    apiGetServices,
    apiGetClients,
    apiGetBusinesses,
    apiGetSalesRecords,
    apiGetSalesForClient,
    apiGetSalesForBusiness,
    apiGetInvoices,
    apiGetInvoicesForClient,
    apiGetInvoicesForBusiness,
    apiGetPaymentMethodSettings,
    apiGetCashAccounts,
} from '../../../services/api';
import Spinner from '../../ui/Spinner';
import Button from '../../ui/Button';
import InvoicePDFTemplate from '../pdf_templates/InvoicePDFTemplate';
import { useNotification } from '../../../hooks/useNotification';
import { useConfirmation } from '../../../hooks/useConfirmation';
import CreateEditInvoiceModal from '../modals/CreateEditInvoiceModal';
import { useAuth } from '../../../hooks/useAuth';
import RecordPaymentModal from '../modals/RecordPaymentModal';
import RecordCreditNoteModal from '../modals/RecordCreditNoteModal';
import { formatDateForDisplay } from '../../../utils/dateUtils';

const KPICard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
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

const TotalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.875c-.372 0-.744.052-1.123.08C2.745 4.01 2.25 4.973 2.25 6.108v11.785c0 1.275 1.05 2.308 2.333 2.308H15a2.25 2.25 0 0 0 2.25-2.25Z" /></svg>;
const PaidIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const DueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;

const InvoiceDetailPage: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const { showConfirmation } = useConfirmation();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
    const [activeServices, setActiveServices] = useState<Service[]>([]);
    const [pendingSales, setPendingSales] = useState<SaleRecord[]>([]);
    const [allSales, setAllSales] = useState<SaleRecord[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
    const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pendingPaymentModalOpen, setPendingPaymentModalOpen] = useState(false);
    const [paymentModalExpectedSalesCount, setPaymentModalExpectedSalesCount] = useState<number | null>(null);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [withLetterhead, setWithLetterhead] = useState(true); // New state for letterhead toggle

    const pdfTemplateRef = useRef<HTMLDivElement>(null);
    const linkedSaleIds = useMemo(() => {
        if (!invoice) return [];
        const ids = new Set<string>();
        if (invoice.saleRecordId) ids.add(invoice.saleRecordId);
        allSales.forEach(sale => {
            if (sale.id && sale.invoiceId === invoice.id) {
                ids.add(sale.id);
            }
        });
        return Array.from(ids);
    }, [invoice, allSales]);

    const fetchData = useCallback(async () => {
        if (!invoiceId) return;
        setIsLoading(true);
        try {
            const fetchedInvoice = await apiGetInvoiceById(invoiceId);
            if (fetchedInvoice) {
                setInvoice(fetchedInvoice);
                const [fetchedClient, fetchedBusiness, fetchedProfile, fetchedSales] = await Promise.all([
                    apiGetClientById(fetchedInvoice.clientId),
                    apiGetBusinessById(fetchedInvoice.businessId),
                    apiGetCompanyProfile(),
                    fetchedInvoice.businessId
                        ? apiGetSalesForBusiness(fetchedInvoice.businessId)
                        : apiGetSalesForClient(fetchedInvoice.clientId),
                ]);
                setClient(fetchedClient);
                setBusiness(fetchedBusiness);
                setCompanyProfile(fetchedProfile);
                setAllSales(fetchedSales);
            } else {
                addNotification("Invoice not found.", "error");
            }
        } catch (error) {
            addNotification("Failed to load invoice details.", "error");
        }
        setIsLoading(false);
    }, [invoiceId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (dateString?: string) => formatDateForDisplay(dateString);

    const handlePrint = () => {
        if (!pdfTemplateRef.current || !invoice) return;
    
        const printContent = pdfTemplateRef.current.outerHTML;
        const printWindow = window.open('', '_blank');
    
        if (!printWindow) {
            addNotification("Could not open print window. Please check your browser's popup blocker.", "error");
            return;
        }
    
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Invoice ${invoice.id}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        body { margin: 0; }
                        @page { size: A4; margin: 0; }
                    </style>
                </head>
                <body>${printContent}</body>
            </html>
        `);
        printWindow.document.close();
    
        const imagePromises: Promise<void>[] = [];
    
        // Preload letterhead background image
        if (withLetterhead && companyProfile?.letterheadImageUrl) {
            const bgImg = new Image();
            const promise = new Promise<void>((resolve) => {
                bgImg.onload = () => resolve();
                bgImg.onerror = () => {
                    console.error("Letterhead image failed to load for printing.");
                    resolve(); // Resolve anyway to not block printing
                };
            });
            bgImg.src = companyProfile.letterheadImageUrl;
            imagePromises.push(promise);
        }
        
        // Check for other images inside the content
        const imagesInContent = printWindow.document.getElementsByTagName('img');
        for (const img of Array.from(imagesInContent)) {
            if (!img.complete) {
                const promise = new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
                imagePromises.push(promise);
            }
        }
    
        Promise.all(imagePromises).then(() => {
            // Use requestAnimationFrame to ensure the browser has painted the images
            printWindow.requestAnimationFrame(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            });
        });
    };
    
    const handleDelete = async () => {
        if (!invoice) return;
        
        // Check if invoice has linked sales and show warning
        const hasLinkedSales = linkedSaleIds.length > 0;
        const salesWarning = hasLinkedSales 
            ? `\n\nWARNING: This invoice has linked sale record(s) (${linkedSaleIds.join(', ')}). Deleting this invoice will also delete the linked sale(s), and client-business balance will be updated accordingly.`
            : '';
        
        const confirmed = await showConfirmation({
          title: 'Delete Invoice',
          message: `Are you sure you want to delete this invoice? This cannot be undone and will update client balances.${salesWarning}`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                const result = await apiDeleteInvoice(invoice.id);
                if (result.hasLinkedSales && result.deletedSalesIds.length > 0) {
                    addNotification(`Invoice and ${result.deletedSalesIds.length} linked sale(s) (${result.deletedSalesIds.join(', ')}) deleted successfully. Client-business balance has been updated.`, "success");
                } else {
                    addNotification("Invoice deleted successfully.", "success");
                }
                navigate('/sales/invoices');
            } catch (error) {
                addNotification(`Failed to delete invoice: ${(error as Error).message}`, "error");
            }
        }
    };
    
    const handleEdit = async () => {
        if (!invoice) return;
        try {
            const fetchSales = invoice.businessId ? apiGetSalesForBusiness(invoice.businessId) : apiGetSalesForClient(invoice.clientId);
            const fetchInvoices = invoice.businessId ? apiGetInvoicesForBusiness(invoice.businessId) : apiGetInvoicesForClient(invoice.clientId);
            const [fetchedClients, fetchedBusinesses, fetchedServices, allSales, allInvoices] = await Promise.all([apiGetClients(), apiGetBusinesses(), apiGetServices(), fetchSales, fetchInvoices]);
            setAllClients(fetchedClients);
            setAllBusinesses(fetchedBusinesses);
            const itemServiceIds = new Set(
              (invoice.items || []).map(i => (i as { serviceId?: string }).serviceId).filter(Boolean) as string[]
            );
            setActiveServices(fetchedServices.filter(s => s.isActive || itemServiceIds.has(s.id)));
            const invoicedSaleIds = new Set(allInvoices.map(inv => inv.saleRecordId).filter(Boolean) as string[]);
            setPendingSales(allSales.filter(sale => !invoicedSaleIds.has(sale.id)));
            setIsEditModalOpen(true);
        } catch (error) {
            addNotification("Could not open editor. Failed to load necessary data.", "error");
        }
    };

    const handleRecordPayment = async () => {
        if (!invoice) return;
        try {
            const fetchSales = invoice.businessId ? apiGetSalesForBusiness(invoice.businessId) : apiGetSalesForClient(invoice.clientId);
            const fetchInvoices = invoice.businessId ? apiGetInvoicesForBusiness(invoice.businessId) : apiGetInvoicesForClient(invoice.clientId);
            const [
                fetchedClients,
                fetchedBusinesses,
                fetchedServices,
                allSales,
                allInvoices,
                fPayMethods,
                fetchedCashAccounts
            ] = await Promise.all([
                apiGetClients(),
                apiGetBusinesses(),
                apiGetServices(),
                fetchSales,
                fetchInvoices,
                apiGetPaymentMethodSettings(),
                apiGetCashAccounts(),
            ]);
            setAllClients(fetchedClients);
            setAllBusinesses(fetchedBusinesses);
            setActiveServices(fetchedServices);
            setAllInvoices(allInvoices);
            setAllSales(allSales);
            setPaymentMethods(fPayMethods.filter(pm => pm.isActive));
            setCashAccounts(fetchedCashAccounts);
            setPaymentModalExpectedSalesCount(allSales.length);
            setPendingPaymentModalOpen(true);
        } catch (error) {
            addNotification("Could not open payment modal. Failed to load necessary data.", "error");
        }
    };

    useEffect(() => {
        if (!pendingPaymentModalOpen || paymentModalExpectedSalesCount === null) return;
        if (allSales.length !== paymentModalExpectedSalesCount) return;
        setIsPaymentModalOpen(true);
        setPendingPaymentModalOpen(false);
        setPaymentModalExpectedSalesCount(null);
    }, [pendingPaymentModalOpen, paymentModalExpectedSalesCount, allSales, invoice]);

    const handleOpenCreditNoteModal = async () => {
        try {
            const [fetchedClients, fetchedBusinesses] = await Promise.all([
                apiGetClients(), 
                apiGetBusinesses()
            ]);
            setAllClients(fetchedClients);
            setAllBusinesses(fetchedBusinesses);
            setIsCreditNoteModalOpen(true);
        } catch (error) {
            addNotification("Could not open credit note modal. Failed to load necessary data.", "error");
        }
    };


    const linkedSales = linkedSaleIds
        .map(saleId => allSales.find(sale => sale.id === saleId))
        .filter((sale): sale is SaleRecord => !!sale);
    const derivedInvoice = useMemo(() => {
        if (!invoice) {
            return {
                normalizedPaid: 0,
                normalizedGrandTotal: 0,
                derivedStatus: InvoiceStatus.DRAFT,
                amountDue: 0,
                invoiceForDisplay: null as Invoice | null,
            };
        }
        const linkedSalesTotal = linkedSales.reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0);
        const linkedSalesPaid = linkedSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
        const normalizedGrandTotal = linkedSalesTotal > 0 ? linkedSalesTotal : (invoice.grandTotal || 0);
        const normalizedPaid = linkedSalesTotal > 0
            ? Math.min(linkedSalesPaid, normalizedGrandTotal)
            : (invoice.amountPaid || 0);
        const derivedStatus = normalizedPaid >= normalizedGrandTotal
            ? InvoiceStatus.PAID
            : (normalizedPaid > 0 ? InvoiceStatus.PARTIALLY_PAID : invoice.status);
        const amountDue = Math.max(normalizedGrandTotal - normalizedPaid, 0);
        const invoiceForDisplay = { ...invoice, amountPaid: normalizedPaid, status: derivedStatus, grandTotal: normalizedGrandTotal };
        return { normalizedPaid, normalizedGrandTotal, derivedStatus, amountDue, invoiceForDisplay };
    }, [invoice, linkedSales]);

    const isSyncingRef = useRef(false);

    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    if (!invoice || !derivedInvoice.invoiceForDisplay) return <div className="text-center p-8">Invoice not found.</div>;

    const { normalizedPaid, normalizedGrandTotal, derivedStatus, amountDue, invoiceForDisplay } = derivedInvoice;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                 <h1 className="text-2xl font-semibold text-text-primary">Invoice: {invoice.id}</h1>
                 <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={withLetterhead}
                            onChange={(e) => setWithLetterhead(e.target.checked)}
                            className="h-4 w-4 rounded text-primary-action focus:ring-primary-action"
                        />
                        <span>With Letterhead</span>
                    </label>
                    <Link to="/sales/invoices" className="text-sm text-primary-action hover:underline">&larr; Back to List</Link>
                    {amountDue > 0 && <Button onClick={handleRecordPayment} variant="success">Record Payment</Button>}
                    {normalizedPaid > 0 && <Button onClick={handleOpenCreditNoteModal} variant="warning">Credit Note</Button>}
                    <Button onClick={handleEdit} variant="primary">Edit</Button>
                    <Button onClick={handleDelete} variant="danger">Delete</Button>
                    <Button onClick={handlePrint} variant="secondary">Print / Download PDF</Button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard title="Grand Total" value={normalizedGrandTotal} icon={<TotalIcon />} colorClass="bg-blue-500" />
                <KPICard title="Amount Paid" value={normalizedPaid} icon={<PaidIcon />} colorClass="bg-green-500" />
                <KPICard title="Amount Due" value={amountDue} icon={<DueIcon />} colorClass={amountDue > 0 ? "bg-red-500" : "bg-gray-500"} />
            </div>

            <div className="bg-slate-200 dark:bg-slate-900 p-4 sm:p-8 rounded-lg">
                <div ref={pdfTemplateRef}>
                    <InvoicePDFTemplate invoice={invoiceForDisplay} companyProfile={companyProfile} client={client} business={business} withLetterhead={withLetterhead}/>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Invoice Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-text-secondary">Client</p>
                        <p className="font-medium">{client?.name || invoice.clientId}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Business</p>
                        <p className="font-medium">{business?.name || invoice.businessId || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Issue Date</p>
                        <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Due Date</p>
                        <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Payment Status</p>
                        <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                            amountDue <= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            normalizedPaid > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                            {amountDue <= 0 ? 'Fully Paid' : normalizedPaid > 0 ? 'Partially Paid' : 'Unpaid'}
                        </span>
                    </div>
                    <div>
                        <p className="text-text-secondary">Grand Total</p>
                        <p className="font-medium">{normalizedGrandTotal.toLocaleString()} MMK</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Amount Paid</p>
                        <p className="font-medium">{normalizedPaid.toLocaleString()} MMK</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Amount Due</p>
                        <p className={`font-medium ${amountDue > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                            {amountDue.toLocaleString()} MMK
                        </p>
                    </div>
                    {linkedSaleIds.length > 0 && (
                        <div className="md:col-span-2">
                            <p className="text-text-secondary">Linked Sales</p>
                            <div className="flex flex-wrap gap-2">
                                {linkedSaleIds.map(saleId => (
                                    <Link key={saleId} to={`/sales/${saleId}`} className="font-medium text-primary-action hover:underline">
                                        {saleId}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                    {invoice.quotationId && (
                        <div>
                            <p className="text-text-secondary">Linked Quotation</p>
                            <Link to={`/finance/quotations/${invoice.quotationId}`} className="font-medium text-primary-action hover:underline">
                                {invoice.quotationId}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {isEditModalOpen && user && (
                <CreateEditInvoiceModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSubmit={() => { setIsEditModalOpen(false); fetchData(); }}
                    clients={allClients}
                    businesses={allBusinesses}
                    activeServices={activeServices}
                    editingInvoice={invoice}
                    loggedInUserId={user.id}
                    pendingSales={pendingSales}
                />
            )}

            {isPaymentModalOpen && user && (
                <RecordPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={() => { setIsPaymentModalOpen(false); fetchData(); }}
                    sales={allSales}
                    invoices={allInvoices}
                    clients={allClients}
                    businesses={allBusinesses}
                    paymentMethods={paymentMethods}
                    cashAccounts={cashAccounts}
                    defaultInvoiceId={invoice.id}
                    defaultClientId={invoice.clientId}
                    defaultBusinessId={invoice.businessId}
                    defaultAmount={amountDue > 0 ? amountDue : undefined}
                />
            )}

            {isCreditNoteModalOpen && (
                <RecordCreditNoteModal
                    isOpen={isCreditNoteModalOpen}
                    onClose={() => setIsCreditNoteModalOpen(false)}
                    onSuccess={() => { setIsCreditNoteModalOpen(false); fetchData(); }}
                    clients={allClients}
                    businesses={allBusinesses}
                    defaultClientId={invoice.clientId}
                    defaultBusinessId={invoice.businessId}
                />
            )}
        </div>
    );
};

export default InvoiceDetailPage;