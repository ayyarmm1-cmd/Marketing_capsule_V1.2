
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Client, Business, Invoice, SaleRecord, PurchaseHistoryItem, InvoiceStatus, Payment, User, PaymentMethodSetting, SaleStatus, PaymentStatus, CreditNote, CreditNoteStatus, BalanceAdjustment, BalanceAdjustmentType, Service } from '../../types';
import { 
    apiGetClientById, 
    apiGetBusinessById, 
    apiGetInvoicesForClient, 
    apiGetSalesForClient, 
    apiGetInvoicesForBusiness,
    apiGetSalesForBusiness,
    apiGetPaymentsForClient,
    apiGetPaymentsForBusiness,
    apiGetCreditNotesForClient,
    apiGetCreditNotesForBusiness,
    apiGetBalanceAdjustmentsForClient,
    apiGetBalanceAdjustmentsForBusiness,
    apiGetUsers,
    apiGetClients,
    apiGetBusinesses,
    apiGetPaymentMethodSettings,
    apiRecordPayment,
    apiUpdateClient,
    apiUpdateBusiness,
    apiGetServices
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import RecordPaymentModal from '../finance/modals/RecordPaymentModal';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { CLIENT_ID_PREFIX, BUSINESS_ID_PREFIX } from '../../constants';
import { formatDateForDisplay } from '../../utils/dateUtils';

interface ClientDetailPageProps {
  isBusinessView?: boolean;
}

// KPI Card Component
const BilledIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.875c-.372 0-.744.052-1.123.08C2.745 4.01 2.25 4.973 2.25 6.108v11.785c0 1.275 1.05 2.308 2.333 2.308H15a2.25 2.25 0 0 0 2.25-2.25Z" /></svg>;
const PaidIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6V9m18-3v3m-10.5-3H16.5m-3.75 0V3.75m0 0H10.5m2.25 0L12 2.25M4.5 20.25v-3.75m0 0A2.25 2.25 0 0 1 6.75 15h10.5a2.25 2.25 0 0 1 2.25 2.25m-15 0V15m0 2.25H15m0 0v3.75m0-3.75H9.75m0 0V15M12 9v6m-3-3h6" /></svg>;
const DueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;
const AdjustIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>;


const KPICard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string; }> = ({ title, value, icon, colorClass }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center">
        <div className={`p-3 rounded-full mr-4 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()} <span className="text-lg font-normal">MMK</span></p>
        </div>
    </div>
);

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


const ClientDetailPage: React.FC<ClientDetailPageProps> = ({ isBusinessView = false }) => {
  const { clientId: routeClientId, businessId: routeBusinessId } = useParams<{ clientId?: string; businessId?: string }>();
  const id = isBusinessView ? routeBusinessId : routeClientId;
  const { user: loggedInUser } = useAuth();
  const { addNotification } = useNotification();

  const [item, setItem] = useState<Client | Business | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [clientOrBusinessPayments, setClientOrBusinessPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'purchaseHistory' | 'paymentsReceived' | 'balanceAdjustments'>('details');
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [paymentModalDefaults, setPaymentModalDefaults] = useState<Partial<Parameters<typeof RecordPaymentModal>[0]>>({});
  const [balanceData, setBalanceData] = useState({ totalBilled: 0, totalPaid: 0, outstanding: 0 });


  const fetchData = useCallback(async () => {
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
    if(!item) setIsLoading(true);
    
    try {
      let fetchedItem: Client | Business | null = null;
      let sales: SaleRecord[] = [];
      let invoices: Invoice[] = [];
      let payments: Payment[] = [];
      let creditNotes: CreditNote[] = [];
      
      const [
        fetchedUsers, fetchedAllClients, fetchedAllBusinesses, 
        fetchedPaymentMethods, fetchedInvoices, fetchedSales, fetchedServices
      ] = await Promise.all([
        apiGetUsers(), apiGetClients(), apiGetBusinesses(), 
        apiGetPaymentMethodSettings(),
        isBusinessView ? apiGetInvoicesForBusiness(id) : apiGetInvoicesForClient(id),
        isBusinessView ? apiGetSalesForBusiness(id) : apiGetSalesForClient(id),
        apiGetServices()
      ]);
      setUsers(fetchedUsers);
      setAllClients(fetchedAllClients);
      setAllBusinesses(fetchedAllBusinesses);
      setPaymentMethods(fetchedPaymentMethods.filter(pm => pm.isActive));
      setAllInvoices(fetchedInvoices);
      setAllSales(fetchedSales);
      setAllServices(fetchedServices);

      sales = fetchedSales;
      invoices = fetchedInvoices;
      let fetchedBalanceAdjustments: BalanceAdjustment[] = [];
      if (isBusinessView) {
        fetchedItem = await apiGetBusinessById(id);
        if (fetchedItem) {
          payments = await apiGetPaymentsForBusiness(id);
          creditNotes = await apiGetCreditNotesForBusiness(id);
          fetchedBalanceAdjustments = await apiGetBalanceAdjustmentsForBusiness(id);
          setBalanceAdjustments(fetchedBalanceAdjustments);
        }
      } else {
        fetchedItem = await apiGetClientById(id);
        if (fetchedItem) {
          payments = await apiGetPaymentsForClient(id);
          creditNotes = await apiGetCreditNotesForClient(id);
          fetchedBalanceAdjustments = await apiGetBalanceAdjustmentsForClient(id);
          setBalanceAdjustments(fetchedBalanceAdjustments);
        }
      }
      setItem(fetchedItem);
      setClientOrBusinessPayments(payments);
      
      // Total Billed = (opening + sales + adj_inc) - (credit_notes + adj_dec)
      const sumSales = (isBusinessView ? sales.filter(s => s.businessId === id) : sales.filter(s => s.clientId === id))
          .reduce((sum, s) => sum + s.grandTotalMMK, 0);

      const sumCreditNotes = creditNotes
          .filter(cn => cn.status === CreditNoteStatus.APPROVED)
          .reduce((sum, cn) => sum + cn.amountMMK, 0);

      const sumAdjInc = fetchedBalanceAdjustments
          .filter(adj => adj.type === BalanceAdjustmentType.INCREASE)
          .reduce((sum, adj) => sum + (adj.amountMMK || 0), 0);
      const sumAdjDec = fetchedBalanceAdjustments
          .filter(adj => adj.type === BalanceAdjustmentType.DECREASE)
          .reduce((sum, adj) => sum + (adj.amountMMK || 0), 0);

      const totalBilled = (fetchedItem?.openingBalance || 0) + sumSales + sumAdjInc - sumCreditNotes - sumAdjDec;

      const totalPaid = payments.reduce((sum, p) => sum + p.amountMMK, 0);
      
      setBalanceData({
        totalBilled,
        totalPaid,
        outstanding: fetchedItem?.balance || 0
      });

      const history: PurchaseHistoryItem[] = [];
      sales.forEach(s => history.push({
        id: s.id, date: s.createdAt, service: `Sale: ${s.id}`, amount: s.grandTotalMMK, status: s.status, type: 'Sale'
      }));
      invoices.forEach(i => history.push({
        id: i.id, date: i.issueDate, service: `Invoice: ${i.id}`, amount: i.grandTotal, status: i.status, type: 'Invoice'
      }));
      
      history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPurchaseHistory(history);

    } catch (error) {
      console.error("Failed to fetch item details:", error);
      addNotification("Failed to load details.", "error");
    }
    setIsLoading(false);
  }, [id, isBusinessView, addNotification, item]);

  const salesWithInvoices = new Set<string>();
  allInvoices.forEach(inv => {
    if (inv.saleRecordId) salesWithInvoices.add(inv.saleRecordId);
  });
  allSales.forEach(sale => {
    if (sale.id && sale.invoiceId) salesWithInvoices.add(sale.id);
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleOpenRecordPaymentModal = (relatedId?: string, type?: 'Invoice' | 'Sale') => {
    if (!item) return;
    let defaults: Partial<Parameters<typeof RecordPaymentModal>[0]> = {
        defaultClientId: isBusinessView ? (item as Business).linkedClientIds[0] || undefined : item.id,
    };
    if (type === 'Invoice' && relatedId) {
        const inv = allInvoices.find(i => i.id === relatedId);
        if(inv) defaults = {...defaults, defaultInvoiceId: relatedId, defaultAmount: inv.grandTotal - inv.amountPaid};
    }
    if (type === 'Sale' && relatedId) {
        const sale = allSales.find(s => s.id === relatedId);
        if (sale) defaults = {...defaults, defaultSaleId: relatedId, defaultAmount: sale.grandTotalMMK};
    }
    setPaymentModalDefaults(defaults);
    setIsRecordPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
      fetchData();
      setIsRecordPaymentModalOpen(false);
  };

  const handleSetOpeningBalance = async (amount: number) => {
    if (!item) return;
    try {
        const updatePayload = {
            id: item.id,
            openingBalance: amount,
            openingBalanceSetDate: new Date().toISOString(),
        };
        if (isBusinessView) {
            await apiUpdateBusiness(updatePayload as Partial<Business> & {id: string});
        } else {
            await apiUpdateClient(updatePayload as Partial<Client> & {id: string});
        }
        addNotification("Opening balance set successfully.", "success");
        fetchData(); // Refresh all data
        setIsBalanceModalOpen(false);
    } catch(e) {
        addNotification(`Failed to set opening balance: ${(e as Error).message}`, 'error');
    }
  };


  const formatDate = (dateString: string) => formatDateForDisplay(dateString);
  const getUserName = useCallback((userId: string): string => users.find(u => u.id === userId)?.name || userId, [users]);
  const getClientNameById = useCallback((cId: string): string => allClients.find(c => c.id === cId)?.name || cId, [allClients]);
  const getBusinessNameById = useCallback((bId: string): string => allBusinesses.find(b => b.id === bId)?.name || bId, [allBusinesses]);
  const getServiceNameById = useCallback((sId?: string): string => allServices.find(s => s.id === sId)?.name || (sId || '-'), [allServices]);


  if (error) {
    return <div className="text-center text-status-danger p-8">{error}</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (!item) {
    return <div className="text-center text-text-primary p-8">{(isBusinessView ? "Business" : "Client") + " not found."}</div>;
  }
  
  return (
    <div className="bg-app-bg dark:bg-slate-900 p-2 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">{item.name}</h1>
                <p className="text-md text-text-secondary dark:text-slate-400">{isBusinessView ? 'Business Profile' : 'Client Profile'} - ID: {item.id}</p>
            </div>
            <div className="flex items-center space-x-3">
                <Button onClick={() => setIsBalanceModalOpen(true)} variant="secondary" size="sm">Set Opening Balance</Button>
                <Button onClick={() => handleOpenRecordPaymentModal()} variant="success" size="sm">Record Payment</Button>
                <Link to="/clients" className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">&larr; Back to List</Link>
            </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Billed" value={balanceData.totalBilled} icon={<BilledIcon/>} colorClass="bg-blue-500" />
        <KPICard title="Payments Received" value={balanceData.totalPaid} icon={<PaidIcon/>} colorClass="bg-green-500" />
        <KPICard title="Outstanding Balance" value={balanceData.outstanding} icon={<DueIcon/>} colorClass={balanceData.outstanding > 0 ? "bg-red-500" : "bg-gray-500"} />
        <KPICard title="Balance Adjustments" value={balanceAdjustments.reduce((sum, adj) => {
          const sign = adj.type === BalanceAdjustmentType.INCREASE ? 1 : -1;
          return sum + (sign * (adj.amountMMK || 0));
        }, 0)} icon={<AdjustIcon/>} colorClass={balanceAdjustments.length > 0 ? "bg-amber-500" : "bg-gray-400"} />
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6">
          <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Details
              </button>
              <button onClick={() => setActiveTab('purchaseHistory')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'purchaseHistory' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Purchase History ({purchaseHistory.length})
              </button>
              <button onClick={() => setActiveTab('paymentsReceived')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'paymentsReceived' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Payments Received ({clientOrBusinessPayments.length})
              </button>
              <button onClick={() => setActiveTab('balanceAdjustments')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'balanceAdjustments' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                Balance Adjustments ({balanceAdjustments.length})
              </button>
            </nav>
          </div>
          <div>
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">ID:</strong> {item.id}</p>
                <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Name:</strong> {item.name}</p>
                <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Phone:</strong> {item.phone || 'N/A'}</p>
                <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Email:</strong> {item.email || 'N/A'}</p>
                {isBusinessView && <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Industry:</strong> {(item as Business).industry || 'N/A'}</p>}
                {isBusinessView && <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Address:</strong> {(item as Business).address || 'N/A'}</p>}
                {!isBusinessView && <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Joined:</strong> {formatDate(item.createdAt)}</p>}
                {isBusinessView && <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Created:</strong> {formatDate(item.createdAt)}</p>}
                <p><strong className="text-text-secondary dark:text-slate-400 w-32 inline-block">Opening Balance:</strong> {(item.openingBalance || 0).toLocaleString()} MMK</p>


                {isBusinessView && (item as Business).linkedClientIds.length > 0 && (
                    <div className="md:col-span-2 mt-2">
                        <strong className="text-text-secondary dark:text-slate-400 block mb-1">Linked Clients:</strong>
                        <ul className="list-disc list-inside">
                            {(item as Business).linkedClientIds.map(cId => <li key={cId}><Link to={`/clients/${cId}`} className="text-primary-action dark:text-blue-400 hover:underline">{getClientNameById(cId)}</Link></li>)}
                        </ul>
                    </div>
                )}
                {!isBusinessView && (item as Client).linkedBusinessIds.length > 0 && (
                    <div className="md:col-span-2 mt-2">
                        <strong className="text-text-secondary dark:text-slate-400 block mb-1">Linked Businesses:</strong>
                        <ul className="list-disc list-inside">
                            {(item as Client).linkedBusinessIds.map(busId => <li key={busId}><Link to={`/businesses/${busId}`} className="text-primary-action dark:text-blue-400 hover:underline">{getBusinessNameById(busId)}</Link></li>)}
                        </ul>
                    </div>
                )}
              </div>
            )}
            {activeTab === 'purchaseHistory' && (
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Document ID</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Type</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Amount (MMK)</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {purchaseHistory.map(ph => (
                                <tr key={ph.id}>
                                    <td className="px-4 py-2">{formatDate(ph.date)}</td>
                                    <td className="px-4 py-2">
                                        {ph.type === 'Invoice' ? (
                                            <Link to={`/sales/invoices/${ph.id}`} className="text-primary-action hover:underline">{ph.id}</Link>
                                        ) : (
                                            <Link to={`/sales/${ph.id}`} className="text-primary-action hover:underline">{ph.id}</Link>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{ph.type}</td>
                                    <td className="px-4 py-2 text-right">{ph.amount.toLocaleString()}</td>
                                    <td className="px-4 py-2">{ph.status}</td>
                                    <td className="px-4 py-2">
                                        {(ph.type === 'Invoice' && ph.status !== InvoiceStatus.PAID) && 
                                            <Button size="sm" variant="success" onClick={() => handleOpenRecordPaymentModal(ph.id, 'Invoice')}>Pay</Button>}
                                        {(ph.type === 'Sale' && !salesWithInvoices.has(ph.id)) && 
                                            <Button size="sm" variant="info" onClick={() => addNotification("Create invoice from Sales page.", "info")}>Create Invoice</Button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )}
            {activeTab === 'paymentsReceived' && (
                 <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                         <thead className="bg-gray-50 dark:bg-slate-700/50">
                             <tr>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Receipt #</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Payment Date</th>
                                 <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Amount (MMK)</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Method</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Applied To</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Recorded By</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {clientOrBusinessPayments.map(p => (
                                <tr key={p.id}>
                                    <td className="px-4 py-2">{p.receiptNumber}</td>
                                    <td className="px-4 py-2">{formatDate(p.paymentDate)}</td>
                                    <td className="px-4 py-2 text-right">{p.amountMMK.toLocaleString()}</td>
                                    <td className="px-4 py-2">{p.method}</td>
                                    <td className="px-4 py-2">
                                      {p.invoiceId ? (
                                        `Invoice: ${p.invoiceId}${p.saleAllocations && p.saleAllocations.length > 0 ? ` (Sales: ${p.saleAllocations.map(a => a.saleRecordId).join(', ')})` : ''}`
                                      ) : p.saleAllocations && p.saleAllocations.length > 0 ? (
                                        `Sales: ${p.saleAllocations.map(a => a.saleRecordId).join(', ')}`
                                      ) : p.saleRecordId ? (
                                        `Sale: ${p.saleRecordId}`
                                      ) : (
                                        <div>
                                          <div className="font-medium">General</div>
                                          {p.status === PaymentStatus.APPROVED && (
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                              Auto-allocated
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2">{getUserName(p.recordedByUserId)}</td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                 </div>
            )}
            {activeTab === 'balanceAdjustments' && (
                 <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                         <thead className="bg-gray-50 dark:bg-slate-700/50">
                             <tr>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Type</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Service</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Employee</th>
                                 <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Amount (MMK)</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Reason</th>
                                 <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Recorded By</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {balanceAdjustments.map(adj => (
                                <tr key={adj.id}>
                                    <td className="px-4 py-2">{formatDate(adj.adjustmentDate)}</td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-1 rounded-full text-xs ${adj.type === BalanceAdjustmentType.INCREASE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {adj.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">{getServiceNameById(adj.serviceId)}</td>
                                    <td className="px-4 py-2">{adj.employeeId ? getUserName(adj.employeeId) : '-'}</td>
                                    <td className="px-4 py-2 text-right">{adj.amountMMK.toLocaleString()}</td>
                                    <td className="px-4 py-2">{adj.reason || '-'}</td>
                                    <td className="px-4 py-2">{getUserName(adj.recordedByUserId)}</td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                 </div>
            )}
          </div>
      </div>
       {isBalanceModalOpen && (
           <SetOpeningBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                currentItem={item}
                onSave={handleSetOpeningBalance}
           />
       )}
       {isRecordPaymentModalOpen && loggedInUser && (
            <RecordPaymentModal 
                isOpen={isRecordPaymentModalOpen}
                onClose={() => setIsRecordPaymentModalOpen(false)}
                onSuccess={handlePaymentSuccess}
                clients={allClients}
                businesses={allBusinesses}
                invoices={allInvoices}
                sales={allSales}
                paymentMethods={paymentMethods}
                {...paymentModalDefaults}
            />
       )}
    </div>
  );
};

export default ClientDetailPage;
