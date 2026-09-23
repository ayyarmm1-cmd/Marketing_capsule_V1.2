import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Quotation, Client, Business, CompanyProfileSetting, Service, ClientOrBusiness, SaleRecord } from '../../../types';
import { 
    apiGetQuotationById, 
    apiGetClientById, 
    apiGetBusinessById, 
    apiGetCompanyProfile,
    apiDeleteQuotation,
    apiGetServices,
    apiGetClients,
    apiGetBusinesses,
    apiGetSalesForClient,
    apiGetSalesForBusiness,
} from '../../../services/api';
import Spinner from '../../ui/Spinner';
import Button from '../../ui/Button';
import QuotationPDFTemplate from '../pdf_templates/QuotationPDFTemplate';
import { useNotification } from '../../../hooks/useNotification';
import { useConfirmation } from '../../../hooks/useConfirmation';
import CreateEditQuotationModal from '../modals/CreateEditQuotationModal';
import { useAuth } from '../../../hooks/useAuth';
import { formatDateForDisplay } from '../../../utils/dateUtils';

const QuotationDetailPage: React.FC = () => {
    const { quotationId } = useParams<{ quotationId: string }>();
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const { showConfirmation } = useConfirmation();
    const navigate = useNavigate();

    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(null);
    const [allClients, setAllClients] = useState<Client[]>([]); // For modal
    const [allBusinesses, setAllBusinesses] = useState<Business[]>([]); // For modal
    const [activeServices, setActiveServices] = useState<Service[]>([]); // For modal
    const [allSales, setAllSales] = useState<SaleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [withLetterhead, setWithLetterhead] = useState(true); // New state for letterhead toggle

    const pdfTemplateRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        if (!quotationId) return;
        setIsLoading(true);
        try {
            const fetchedQuotation = await apiGetQuotationById(quotationId);
            if (fetchedQuotation) {
                setQuotation(fetchedQuotation);
                const [fetchedClient, fetchedBusiness, fetchedProfile] = await Promise.all([
                    apiGetClientById(fetchedQuotation.clientId),
                    apiGetBusinessById(fetchedQuotation.businessId),
                    apiGetCompanyProfile(),
                ]);
                const fetchedSales = await (fetchedQuotation.businessId
                    ? apiGetSalesForBusiness(fetchedQuotation.businessId)
                    : apiGetSalesForClient(fetchedQuotation.clientId));
                setClient(fetchedClient);
                setBusiness(fetchedBusiness);
                setCompanyProfile(fetchedProfile);
                setAllSales(fetchedSales);
            } else {
                addNotification("Quotation not found.", "error");
            }
        } catch (error) {
            addNotification("Failed to load quotation details.", "error");
        }
        setIsLoading(false);
    }, [quotationId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePrint = () => {
        if (!pdfTemplateRef.current || !quotation) return;
    
        const printContent = pdfTemplateRef.current.outerHTML;
        const printWindow = window.open('', '_blank');
    
        if (!printWindow) {
            addNotification("Could not open print window. Please check your browser's popup blocker.", "error");
            return;
        }
    
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Quotation ${quotation.id}</title>
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
                    resolve();
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
            printWindow.requestAnimationFrame(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            });
        });
    };
    
    const handleDelete = async () => {
        if (!quotation) return;
        const confirmed = await showConfirmation({
          title: 'Delete Quotation',
          message: "Are you sure you want to delete this quotation? This cannot be undone.",
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteQuotation(quotation.id);
                addNotification("Quotation deleted successfully.", "success");
                navigate('/sales/quotations');
            } catch (error) {
                addNotification(`Failed to delete quotation: ${(error as Error).message}`, "error");
            }
        }
    };
    
    const handleEdit = async () => {
        // Fetch data needed for the modal
        try {
            const [fetchedClients, fetchedBusinesses, fetchedServices] = await Promise.all([apiGetClients(), apiGetBusinesses(), apiGetServices()]);
            setAllClients(fetchedClients);
            setAllBusinesses(fetchedBusinesses);
            setActiveServices(fetchedServices.filter(s => s.isActive));
            setIsEditModalOpen(true);
        } catch (error) {
            addNotification("Could not open editor. Failed to load necessary data.", "error");
        }
    };


    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    if (!quotation) return <div className="text-center p-8">Quotation not found.</div>;

    const linkedSales = quotation.invoiceId
        ? allSales.filter(sale => sale.invoiceId === quotation.invoiceId)
        : (quotation.saleRecordId ? allSales.filter(sale => sale.id === quotation.saleRecordId) : []);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                 <h1 className="text-2xl font-semibold text-text-primary">Quotation: {quotation.id}</h1>
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
                    <Link to="/sales/quotations" className="text-sm text-primary-action hover:underline">&larr; Back to List</Link>
                    <Button onClick={handleEdit} variant="primary">Edit</Button>
                    <Button onClick={handleDelete} variant="danger">Delete</Button>
                    <Button onClick={handlePrint} variant="secondary">Print / Download PDF</Button>
                 </div>
            </div>

            <div className="bg-slate-200 dark:bg-slate-900 p-4 sm:p-8 rounded-lg">
                <div ref={pdfTemplateRef}>
                    <QuotationPDFTemplate quotation={quotation} companyProfile={companyProfile} client={client} business={business} withLetterhead={withLetterhead}/>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Quotation Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-text-secondary">Client</p>
                        <p className="font-medium">{client?.name || quotation.clientId}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Business</p>
                        <p className="font-medium">{business?.name || quotation.businessId || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary">Issue Date</p>
                        <p className="font-medium">{formatDateForDisplay(quotation.issueDate)}</p>
                    </div>
                    {quotation.expiryDate && (
                        <div>
                            <p className="text-text-secondary">Expiry Date</p>
                            <p className="font-medium">{formatDateForDisplay(quotation.expiryDate)}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-text-secondary">Status</p>
                        <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                            quotation.status === 'Accepted' ? 'bg-status-success text-white' : 
                            quotation.status === 'Rejected' ? 'bg-status-danger text-white' :
                            quotation.status === 'Sent' ? 'bg-blue-500 text-white' :
                            'bg-slate-200 text-text-primary'
                        }`}>
                            {quotation.status}
                        </span>
                    </div>
                    <div>
                        <p className="text-text-secondary">Grand Total</p>
                        <p className="font-medium">{quotation.grandTotal.toLocaleString()} MMK</p>
                    </div>
                    {quotation.invoiceId && (
                        <div>
                            <p className="text-text-secondary">Linked Invoice</p>
                            <Link to={`/sales/invoices/${quotation.invoiceId}`} className="font-medium text-primary-action hover:underline">
                                {quotation.invoiceId}
                            </Link>
                        </div>
                    )}
                    {linkedSales.length > 0 && (
                        <div className="md:col-span-2">
                            <p className="text-text-secondary">Linked Sales</p>
                            <div className="flex flex-wrap gap-2">
                                {linkedSales.map(sale => (
                                    <Link key={sale.id} to={`/sales/${sale.id}`} className="font-medium text-primary-action hover:underline">
                                        {sale.id}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isEditModalOpen && user && (
                <CreateEditQuotationModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSubmit={() => { setIsEditModalOpen(false); fetchData(); }}
                    clients={allClients}
                    businesses={allBusinesses}
                    activeServices={activeServices}
                    loggedInUserId={user.id}
                    editingQuotation={quotation}
                />
            )}
        </div>
    );
};

export default QuotationDetailPage;