import React, { useEffect, useState, useCallback } from 'react';
import {
  apiGetFinanceVendors,
  apiGetAPInvoices,
  apiSaveAPInvoice,
  apiRunVendorPayment,
} from '../../services/api';
import { AccountsPayableInvoice, InvoiceStatus, Vendor } from '../../types';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { useNotification } from '../../hooks/useNotification';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import MockDataBanner from '../facebook_ads/MockDataBanner';
import {
  notifyOperationWithData,
  notifyWarning,
} from '../../utils/notificationUtils';
import VendorManagementTab from './VendorManagementTab';
import RefundsTab from './RefundsTab';

const AccountsPayablePage: React.FC = () => {
  const { addNotification } = useNotification();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<AccountsPayableInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vendors' | 'payables' | 'refunds'>('vendors');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('accountsPayableSidebarCollapsed');
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, boolean>>({});
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    vendorId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    currency: 'MMK',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vendorData, invoiceData] = await Promise.all([apiGetFinanceVendors(), apiGetAPInvoices()]);
      setVendors(vendorData);
      setInvoices(invoiceData);
      setInvoiceForm(form => {
        if (!form.vendorId && vendorData.length > 0) {
          return { ...form, vendorId: vendorData[0].id };
        }
        return form;
      });
    } catch (error) {
      console.error('Error loading Accounts Payable data:', error);
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invoiceForm.vendorId || !invoiceForm.invoiceNumber || !invoiceForm.amount) {
      notifyWarning(addNotification, 'Fill in vendor, invoice number, and amount.');
      return;
    }
    const invoice = await notifyOperationWithData(
      addNotification,
      () =>
        apiSaveAPInvoice({
          ...invoiceForm,
          status: InvoiceStatus.SENT,
        }),
      `AP invoice ${invoiceForm.invoiceNumber} captured.`,
      'Failed to capture AP invoice',
    );
    if (!invoice) return;
    setInvoices(prev => [invoice, ...prev]);
    setInvoiceForm(form => ({ ...form, invoiceNumber: '', amount: 0, description: '' }));
    setIsInvoiceModalOpen(false);
  };

  const handleRunPayments = async () => {
    const invoicesToPay = Object.entries(selectedInvoices)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    if (invoicesToPay.length === 0) {
      notifyWarning(addNotification, 'Select at least one invoice to pay.');
      return;
    }
    const result = await notifyOperationWithData(
      addNotification,
      () => apiRunVendorPayment(invoicesToPay, new Date().toISOString().split('T')[0]),
      `Paid ${invoicesToPay.length} invoice(s).`,
      'Failed to run vendor payment batch',
    );
    if (!result) return;
    const updated = invoices.map(inv => result.paidInvoices.find(paid => paid.id === inv.id) || inv);
    setInvoices(updated);
    setSelectedInvoices({});
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MockDataBanner />
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6">
            {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Accounts Payable</h2>}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" /></svg>
              )}
            </button>
          </div>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'vendors' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Vendor Management' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.75-5.25T21 12a9 9 0 1 0-9 9 9.094 9.094 0 0 0 5.25-1.23m0 0L11.25 11.25m0 0L8.25 15l7.5-7.5" />
                </svg>
              ) : (
                'Vendor Management'
              )}
            </button>
            <button
              onClick={() => setActiveTab('payables')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'payables' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Open Payables' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h3.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              ) : (
                'Open Payables'
              )}
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                ${activeTab === 'refunds' 
                  ? 'bg-primary-action text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                }`}
              title={isSidebarCollapsed ? 'Refunds' : ''}
            >
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
              ) : (
                'Refunds'
              )}
            </button>
          </nav>
        </aside>
        <main className="flex-1">
          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            {/* Vendor Management Tab */}
            {activeTab === 'vendors' && <VendorManagementTab />}

            {/* Open Payables Tab */}
            {activeTab === 'payables' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Open Payables</h1>
                    <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                      Capture supplier invoices, monitor balances, and run controlled payment batches.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => setIsInvoiceModalOpen(true)} variant="primary">+ Capture Invoice</Button>
                    <Button variant="primary" onClick={handleRunPayments}>
                      Run Payment Batch
                    </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <p className="text-sm text-text-secondary dark:text-slate-400">Total Vendors</p>
                    <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{vendors.length}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                    <p className="text-sm text-text-secondary dark:text-slate-400">Outstanding Invoices</p>
                    <p className="text-2xl font-bold text-text-primary dark:text-slate-100">
                      {invoices.filter(inv => inv.status !== InvoiceStatus.PAID).length}
                    </p>
                  </div>
                </div>

                {/* Invoices Table */}
                {invoices.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-12 text-center">
                    <p className="text-text-secondary dark:text-slate-400">No AP invoices captured yet.</p>
                    <Button
                      onClick={() => setIsInvoiceModalOpen(true)}
                      variant="primary"
                      className="mt-4"
                    >
                      + Capture First Invoice
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-4 py-3">
                              <input
                                type="checkbox"
                                onChange={e =>
                                  setSelectedInvoices(
                                    invoices.reduce(
                                      (acc, inv) => ({ ...acc, [inv.id]: e.target.checked }),
                                      {},
                                    ),
                                  )
                                }
                              />
                            </th>
                            <th className="px-4 py-3 text-left">Vendor</th>
                            <th className="px-4 py-3 text-left">Invoice #</th>
                            <th className="px-4 py-3 text-left">Invoice Date</th>
                            <th className="px-4 py-3 text-left">Due Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {invoices.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  disabled={invoice.status === InvoiceStatus.PAID}
                                  checked={!!selectedInvoices[invoice.id]}
                                  onChange={e =>
                                    setSelectedInvoices(prev => ({ ...prev, [invoice.id]: e.target.checked }))
                                  }
                                />
                              </td>
                              <td className="px-4 py-3">
                                {vendors.find(v => v.id === invoice.vendorId)?.name || invoice.vendorId}
                              </td>
                              <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                              <td className="px-4 py-3">{invoice.invoiceDate}</td>
                              <td className="px-4 py-3">{invoice.dueDate}</td>
                              <td className="px-4 py-3 text-right font-medium">
                                {invoice.amount.toLocaleString()} {invoice.currency}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    invoice.status === InvoiceStatus.PAID
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  }`}
                                >
                                  {invoice.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Refunds Tab */}
            {activeTab === 'refunds' && <RefundsTab />}
          </div>
        </main>
      </div>

      {/* Capture Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Capture Invoice">
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select
            label="Vendor"
            value={invoiceForm.vendorId}
            onChange={e => setInvoiceForm({ ...invoiceForm, vendorId: e.target.value })}
            options={vendors.map(vendor => ({ label: vendor.name, value: vendor.id }))}
            required
          />
          <Input
            label="Invoice Number"
            value={invoiceForm.invoiceNumber}
            onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Invoice Date"
              type="date"
              value={invoiceForm.invoiceDate}
              onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={invoiceForm.dueDate}
              onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Amount"
            type="number"
            value={invoiceForm.amount}
            onChange={e => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
            required
            min="0.01"
            step="0.01"
          />
          <Input
            label="Description"
            value={invoiceForm.description}
            onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
            as="textarea"
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Invoice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AccountsPayablePage;

