import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, InvoiceItem, SaleRecord, InvoiceStatus, Client, Business, Service, OtherServicesSaleRecord } from '../../types';
import { apiAddDirectInvoice, apiGetServices, apiGetInvoices, apiGetInvoicesForClient, apiGetInvoicesForBusiness } from '../../services/api';
import { logTiming } from '../../utils/perf';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import { getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';
import { buildBoostingLineFromSale, isBoostingService } from '../../utils/boostingServiceUtils';

interface CreateInvoiceFromHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedRecords: Array<{ type: 'Sale' | 'Invoice'; record: SaleRecord | Invoice }>;
  client: Client | Business;
  isBusinessView: boolean;
}

interface CombinedItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sourceRecords: Array<{ type: 'Sale' | 'Invoice'; id: string }>;
}

const CreateInvoiceFromHistoryModal: React.FC<CreateInvoiceFromHistoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedRecords,
  client,
  isBusinessView
}) => {
  const { addNotification } = useNotification();
  const [issueDate, setIssueDate] = useState(getTodayInYangon());
  const [dueDate, setDueDate] = useState(() => getDateInYangonTimezone(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [discount, setDiscount] = useState<number | ''>(0);
  const [taxPercentage, setTaxPercentage] = useState<number | ''>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (isOpen && client?.id) {
      apiGetServices().then(setServices).catch(() => {});
      (isBusinessView ? apiGetInvoicesForBusiness(client.id) : apiGetInvoicesForClient(client.id))
        .then(setAllInvoices).catch(() => {});
    }
  }, [isOpen, client?.id, isBusinessView]);

  // Filter out sales that already have invoices
  const validSelectedRecords = useMemo(() => {
    const invoicedSaleIds = new Set(allInvoices.map(inv => inv.saleRecordId).filter(Boolean));
    return selectedRecords.filter(({ type, record }) => {
      if (type === 'Sale') {
        return !invoicedSaleIds.has(record.id);
      }
      return true; // Invoices can be included
    });
  }, [selectedRecords, allInvoices]);

  // Extract and combine items from selected records (only valid ones)
  const combinedItems = useMemo<CombinedItem[]>(() => {
    const itemMap = new Map<string, CombinedItem>();

    validSelectedRecords.forEach(({ type, record }) => {
      let items: InvoiceItem[] = [];

      if (type === 'Invoice') {
        items = (record as Invoice).items || [];
      } else {
        // Extract items from SaleRecord
        const sale = record as SaleRecord;
        
        if (sale.type === 'Facebook Ads') {
          const fbSale = sale as any;
          const budgetUSD = fbSale.budgetUSD || 0;
          const actualSpendUSD = fbSale.actualSpendUSD || budgetUSD;
          const serviceName = 'Facebook Ads';
          const service = services.find(s => s.id === sale.serviceId);
          const serviceRateMMK = fbSale.serviceRateMMK || service?.serviceRateMMK || 0;
          const unitPrice = serviceRateMMK; // Unit price per USD
          const total = actualSpendUSD * unitPrice;
          
          items = [{
            id: `fb_${sale.id}`,
            description: serviceName,
            quantity: actualSpendUSD,
            unitPrice: unitPrice,
            total: total
          }];
        } else if (sale.type === 'Other Services') {
          const otherSale = sale as OtherServicesSaleRecord;
          const service = services.find(s => s.id === sale.serviceId);
          const serviceName = service?.name || 'Other Services';

          if (isBoostingService(service)) {
            const line = buildBoostingLineFromSale(otherSale, service, serviceName);
            items = [{
              id: `other_${sale.id}`,
              description: line.description,
              quantity: line.quantityUsd,
              unitPrice: line.unitPriceMMK,
              total: line.totalMMK,
            }];
          } else {
            const quantity = otherSale.quantity || 1;
            const unitPrice = otherSale.unitPriceMMK || 0;
            items = [{
              id: `other_${sale.id}`,
              description: serviceName,
              quantity,
              unitPrice,
              total: otherSale.grandTotalMMK || quantity * unitPrice,
            }];
          }
        }
      }

      // Process each item and combine by description + unitPrice
      items.forEach(item => {
        const key = `${item.description}|${item.unitPrice}`;
        
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += item.quantity;
          existing.total += item.total;
          existing.sourceRecords.push({ type, id: record.id });
        } else {
          itemMap.set(key, {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            sourceRecords: [{ type, id: record.id }]
          });
        }
      });
    });

    return Array.from(itemMap.values());
  }, [validSelectedRecords, services]);

  const subtotal = useMemo(() => {
    return combinedItems.reduce((sum, item) => sum + item.total, 0);
  }, [combinedItems]);

  const discountAmount = useMemo(() => {
    return Number(discount) || 0;
  }, [discount]);

  const subtotalAfterDiscount = useMemo(() => {
    return subtotal - discountAmount;
  }, [subtotal, discountAmount]);

  const taxAmount = useMemo(() => {
    const taxPct = Number(taxPercentage) || 0;
    return subtotalAfterDiscount * (taxPct / 100);
  }, [subtotalAfterDiscount, taxPercentage]);

  const grandTotal = useMemo(() => {
    return subtotalAfterDiscount + taxAmount;
  }, [subtotalAfterDiscount, taxAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitStart = performance.now();
    
      if (validSelectedRecords.length === 0) {
        addNotification("No valid records selected. Some sales may already have invoices.", "error");
        logTiming('CreateInvoiceFromHistoryModal.handleSubmit', submitStart, { result: 'validation_error' });
        return;
      }

      if (combinedItems.length === 0) {
        addNotification("No items to invoice.", "error");
        logTiming('CreateInvoiceFromHistoryModal.handleSubmit', submitStart, { result: 'validation_error' });
        return;
      }

    setIsLoading(true);
    try {
      const invoiceItems: InvoiceItem[] = combinedItems.map((item, index) => ({
        id: `item_${index}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));

      /**
       * BALANCE UPDATE LOGIC:
       * 
       * When creating invoice from existing sales:
       * - Those sales already updated balance when they were created
       * - Invoice should NOT update balance again (to avoid double-counting)
       * 
       * Solution: If ANY sales are selected, we need to prevent balance update.
       * Since apiAddDirectInvoice checks for saleRecordId to skip balance update,
       * we can only link ONE sale. For multiple sales, we need a different approach.
       * 
       * For now: Only allow single sale selection to maintain balance integrity.
       * Multiple sales would require creating separate invoices or a different mechanism.
       */
      const saleRecordsOnly = validSelectedRecords.filter(r => r.type === 'Sale');
      
      // IMPORTANT: Only link to sale if exactly ONE sale is selected
      // Multiple sales cannot be linked to a single invoice (Firestore limitation)
      // If multiple sales are selected, we cannot prevent balance update, so we should prevent this scenario
      if (saleRecordsOnly.length > 1) {
        addNotification("Cannot create invoice from multiple sales. Please select only one sale record, or create separate invoices for each sale.", "error");
        setIsLoading(false);
        logTiming('CreateInvoiceFromHistoryModal.handleSubmit', submitStart, { result: 'validation_error' });
        return;
      }
      
      const saleRecordId = saleRecordsOnly.length === 1 && validSelectedRecords.length === 1 
        ? saleRecordsOnly[0].record.id 
        : undefined;

      // Get clientId and businessId from the first sale record if available, otherwise from the client/business prop
      let invoiceClientId: string;
      let invoiceBusinessId: string;
      
      if (saleRecordsOnly.length > 0) {
        // Use the first sale record's clientId and businessId
        const firstSale = saleRecordsOnly[0].record as SaleRecord;
        invoiceClientId = firstSale.clientId;
        invoiceBusinessId = firstSale.businessId || '';
      } else if (isBusinessView) {
        // If business view, we need to find the client that owns this business
        // For now, we'll require businessId to be set in the business
        invoiceBusinessId = (client as Business).id;
        // Try to get clientId from the first selected record if it's an invoice
        const firstInvoice = validSelectedRecords.find(r => r.type === 'Invoice');
        if (firstInvoice) {
          invoiceClientId = (firstInvoice.record as Invoice).clientId;
        } else {
          // Fallback: we need clientId, but in business view we don't have it directly
          // This should not happen in practice, but we'll throw an error
          throw new Error("Cannot determine clientId for business view without sale records.");
        }
      } else {
        // Client view
        invoiceClientId = (client as Client).id;
        invoiceBusinessId = (client as Client).linkedBusinessIds?.[0] || '';
      }

      const newInvoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        clientId: invoiceClientId,
        businessId: invoiceBusinessId,
        issueDate: issueDate,
        dueDate: dueDate,
        items: invoiceItems,
        subtotal: subtotal,
        discount: discountAmount,
        tax: taxAmount,
        grandTotal: grandTotal,
        amountPaid: 0,
        status: InvoiceStatus.DRAFT,
        // Only set saleRecordId if exactly one sale is selected
        // This ensures apiAddDirectInvoice will NOT update balance (sale already did)
        ...(saleRecordId ? { saleRecordId } : {})
      };

      // If no saleRecordId is set but we have sales, this means we're creating from invoices only
      // In that case, balance should NOT be updated because those invoices already affected balance
      // However, apiAddDirectInvoice will update balance if no saleRecordId
      // TODO: Consider adding a flag to apiAddDirectInvoice to skip balance update for invoices created from existing invoices
      const apiStart = performance.now();
      await apiAddDirectInvoice(newInvoice);
      logTiming('CreateInvoiceFromHistoryModal.apiAddDirectInvoice', apiStart);
      addNotification("Invoice created successfully.", "success");
      onSuccess();
      onClose();
    } catch (error) {
      addNotification(`Failed to create invoice: ${(error as Error).message}`, "error");
      logTiming('CreateInvoiceFromHistoryModal.handleSubmit', submitStart, { result: 'error' });
    } finally {
      setIsLoading(false);
      logTiming('CreateInvoiceFromHistoryModal.handleSubmit', submitStart, { result: 'success' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Invoice from Purchase History" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-sm text-text-secondary dark:text-slate-400">
            <strong>{validSelectedRecords.length}</strong> record(s) selected. Items with the same service name and unit price will be combined.
            {validSelectedRecords.length < selectedRecords.length && (
              <span className="block mt-2 text-status-warning dark:text-yellow-400">
                {selectedRecords.length - validSelectedRecords.length} sale record(s) already have invoices and were excluded.
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Issue Date"
            type="date"
            value={issueDate}
            onChange={e => setIssueDate(e.target.value)}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            required
          />
        </div>

        <div className="overflow-x-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Unit Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {combinedItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{item.description}</td>
                  <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">{item.unitPrice.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200 font-medium">{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Discount (MMK)"
            type="number"
            step="any"
            value={discount}
            onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
            containerClassName="mb-0"
          />
          <Input
            label="Tax Percentage (%)"
            type="number"
            step="any"
            value={taxPercentage}
            onChange={e => setTaxPercentage(e.target.value === '' ? '' : Number(e.target.value))}
            containerClassName="mb-0"
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary dark:text-slate-400">Subtotal:</span>
            <span className="text-text-primary dark:text-slate-200 font-medium">{subtotal.toLocaleString()} MMK</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary dark:text-slate-400">Discount:</span>
              <span className="text-text-primary dark:text-slate-200">-{discountAmount.toLocaleString()} MMK</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary dark:text-slate-400">Tax:</span>
              <span className="text-text-primary dark:text-slate-200">{taxAmount.toLocaleString()} MMK</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
            <span className="text-text-primary dark:text-slate-200">Grand Total:</span>
            <span className="text-text-primary dark:text-slate-200">{grandTotal.toLocaleString()} MMK</span>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateInvoiceFromHistoryModal;

