import React, { forwardRef, useMemo } from 'react';
import { SaleRecord, Client, Business, CompanyProfileSetting, Refund, CreditNote, Payment, BalanceAdjustment, BadDebt, BalanceAdjustmentType, PaymentStatus, AllowanceForDoubtfulDebts, ClientBusinessBalance } from '../../types';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { getSaleDateFromSale } from '../../utils/salesReportDates';
import { isBoostingService, isBoostingServiceName } from '../../utils/boostingServiceUtils';

interface DetailedSalesRecord {
  sale: SaleRecord | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    isBudget?: boolean;
  }>;
  date: string;
  id: string;
  status: string;
  grandTotal: number;
  isRefund?: boolean;
  refund?: Refund;
  isCreditNote?: boolean;
  creditNote?: CreditNote;
}

interface PaymentGroupInfo {
  paidAmount: number;
  totalAmount: number;
  remainingAmount: number;
  paymentDate: string;
}

interface SalesRecordsPDFTemplateProps {
  data: DetailedSalesRecord[];
  clientOrBusiness: Client | Business | null;
  companyProfile: CompanyProfileSetting | null;
  dateRange: { start: string; end: string };
  filters: { type: string; status: string };
  allServices?: Array<{ id: string; name: string }>;
  paymentGroups?: Map<string, string[]>; // groupKey -> array of sale IDs
  paymentGroupTotals?: Map<string, PaymentGroupInfo>; // groupKey -> totals
  saleToPaymentGroup?: Map<string, string>; // saleId -> groupKey
  allBusinesses?: Business[]; // For looking up business names
  allClients?: Client[]; // For looking up client names
  payments?: Payment[]; // Payment records to include in PDF
  pdfDownloadType?: 'sales' | 'salesAndCredit' | 'payments' | 'all'; // Download type filter
  balanceAdjustments?: BalanceAdjustment[];
  badDebts?: BadDebt[];
  calculatedOutstanding?: number;
  openingBalanceFromCBB?: number;
  /** Per client–business pair opening rows (for PDF timeline; same scope as openingBalanceFromCBB sum) */
  openingBalanceCbbRows?: ClientBusinessBalance[];
  /** Allowance for doubtful debts linked to this client/business */
  allowanceProvisions?: AllowanceForDoubtfulDebts[];
}

const SalesRecordsPDFTemplate = forwardRef<HTMLDivElement, SalesRecordsPDFTemplateProps>(
  ({ data, clientOrBusiness, companyProfile, dateRange, filters, allServices = [], paymentGroups = new Map(), paymentGroupTotals = new Map(), saleToPaymentGroup = new Map(), allBusinesses = [], allClients = [], payments = [], pdfDownloadType = 'all', balanceAdjustments = [], badDebts = [], calculatedOutstanding, openingBalanceFromCBB, openingBalanceCbbRows = [], allowanceProvisions = [] }, ref) => {
    // Use APPROVED payments only, exclude refunded (canonical formula)
    const approvedPayments = useMemo(() => payments.filter(p => p.status === PaymentStatus.APPROVED && !p.refundId), [payments]);
    const formatDate = (dateString: string) => formatDateForDisplay(dateString);

    const getPaymentAmountForSale = (payment: Payment, saleId: string): number => {
      if (payment.saleAllocations && payment.saleAllocations.length > 0) {
        return payment.saleAllocations
          .filter(allocation => allocation.saleRecordId === saleId)
          .reduce((sum, allocation) => sum + (allocation.amountMMK || 0), 0);
      }
      if (payment.saleRecordId === saleId) {
        return payment.amountMMK || 0;
      }
      return 0;
    };
    
    const getPaymentAmountForSales = (payment: Payment, saleIds: Set<string>): number => {
      if (payment.saleAllocations && payment.saleAllocations.length > 0) {
        return payment.saleAllocations
          .filter(allocation => saleIds.has(allocation.saleRecordId))
          .reduce((sum, allocation) => sum + (allocation.amountMMK || 0), 0);
      }
      if (payment.saleRecordId && saleIds.has(payment.saleRecordId)) {
        return payment.amountMMK || 0;
      }
      return 0;
    };
    
    // Helper function to get paid amount for a sale/credit note
    const getPaidAmount = (entryId: string, isCreditNote: boolean = false): number => {
      if (isCreditNote) {
        // Credit notes don't have payments
        return 0;
      }
      
      return approvedPayments.reduce((sum, payment) => sum + getPaymentAmountForSale(payment, entryId), 0);
    };


    // Budget-based boosting (Facebook Ads + S_001/S_002)
    const isBoostingBudgetEntry = (entry: DetailedSalesRecord): boolean => {
      if (entry.isRefund && entry.refund) {
        if (entry.refund.serviceId) {
          const service = allServices.find(s => s.id === entry.refund!.serviceId);
          return service ? isBoostingService(service) : false;
        }
        return false;
      }
      if (entry.isCreditNote && entry.creditNote) {
        if (entry.creditNote.serviceId) {
          const service = allServices.find(s => s.id === entry.creditNote!.serviceId);
          return service ? isBoostingService(service) : false;
        }
        return false;
      }
      if (entry.sale) {
        if (entry.sale.type === 'Facebook Ads') return true;
        const service = allServices.find(s => s.id === entry.sale!.serviceId);
        return isBoostingService(service);
      }
      return false;
    };

    const showBudgetQuantity = (entry: DetailedSalesRecord, item: DetailedSalesRecord['items'][number]): boolean =>
      !!item.isBudget || isBoostingBudgetEntry(entry) || isBoostingServiceName(item.description);

    // @deprecated alias — kept for minimal diff in template body
    const isFacebookAds = isBoostingBudgetEntry;

    // Organize data chronologically with payment group breaks at payment dates
    const organizedData = useMemo(() => {
      // First, identify which entries belong to payment groups
      const entryToGroup = new Map<string, string>(); // entry id -> groupKey
      const groupEntries = new Map<string, DetailedSalesRecord[]>();
      const processedEntryIds = new Set<string>();
      
      // Collect sales that belong to payment groups
      data.forEach(entry => {
        if (!(entry as any).isRefund && !(entry as any).isCreditNote && entry.id) {
          const groupKey = saleToPaymentGroup.get(entry.id);
          if (groupKey) {
            if (!groupEntries.has(groupKey)) {
              groupEntries.set(groupKey, []);
            }
            groupEntries.get(groupKey)!.push(entry);
            entryToGroup.set(entry.id, groupKey);
            processedEntryIds.add(entry.id);
          }
        }
      });
      
      // Collect refunds and credit notes that fall within payment group date ranges
      const refundsByGroup = new Map<string, DetailedSalesRecord[]>();
      const creditNotesByGroup = new Map<string, DetailedSalesRecord[]>();
      
      data.forEach(entry => {
        if ((entry as any).isRefund && (entry as any).refund) {
          const refund = (entry as any).refund as Refund;
          const refundDate = refund.refundDate ? new Date(refund.refundDate) : null;
          
          for (const [groupKey, groupSales] of groupEntries.entries()) {
            if (groupSales.length === 0) continue;
            
            const saleDates = groupSales
              .map(e => e.date ? new Date(e.date) : null)
              .filter((d): d is Date => d !== null);
            
            if (saleDates.length === 0) continue;
            
            const minDate = new Date(Math.min(...saleDates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...saleDates.map(d => d.getTime())));
            minDate.setDate(minDate.getDate() - 1);
            maxDate.setDate(maxDate.getDate() + 1);
            
            if (refundDate && refundDate >= minDate && refundDate <= maxDate) {
              if (!refundsByGroup.has(groupKey)) {
                refundsByGroup.set(groupKey, []);
              }
              refundsByGroup.get(groupKey)!.push(entry);
              entryToGroup.set(`refund-${refund.id}`, groupKey);
              processedEntryIds.add(`refund-${refund.id}`);
              break;
            }
          }
        } else if ((entry as any).isCreditNote && (entry as any).creditNote) {
          const creditNote = (entry as any).creditNote as CreditNote;
          const creditNoteDate = creditNote.creditNoteDate ? new Date(creditNote.creditNoteDate) : null;
          
          for (const [groupKey, groupSales] of groupEntries.entries()) {
            if (groupSales.length === 0) continue;
            
            const saleDates = groupSales
              .map(e => e.date ? new Date(e.date) : null)
              .filter((d): d is Date => d !== null);
            
            if (saleDates.length === 0) continue;
            
            const minDate = new Date(Math.min(...saleDates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...saleDates.map(d => d.getTime())));
            minDate.setDate(minDate.getDate() - 1);
            maxDate.setDate(maxDate.getDate() + 1);
            
            if (creditNoteDate && creditNoteDate >= minDate && creditNoteDate <= maxDate) {
              if (!creditNotesByGroup.has(groupKey)) {
                creditNotesByGroup.set(groupKey, []);
              }
              creditNotesByGroup.get(groupKey)!.push(entry);
              entryToGroup.set(`creditnote-${creditNote.id}`, groupKey);
              processedEntryIds.add(`creditnote-${creditNote.id}`);
              break;
            }
          }
        }
      });
      
      // Create a chronological list with payment group breaks
      type TimelineItem = {
        type: 'entry' | 'paymentGroup' | 'payment' | 'adjustment' | 'badDebt' | 'openingBalance' | 'allowance';
        entry?: DetailedSalesRecord;
        groupKey?: string;
        payment?: Payment;
        adjustment?: BalanceAdjustment;
        badDebt?: BadDebt;
        cbbRow?: ClientBusinessBalance;
        allowance?: AllowanceForDoubtfulDebts;
        timestamp: number;
      };
      
      const timeline: TimelineItem[] = [];

      if (pdfDownloadType !== 'payments') {
        (openingBalanceCbbRows || []).forEach(cbb => {
          const ob = cbb.openingBalance ?? 0;
          if (ob === 0) return;
          const ts = new Date(cbb.openingBalanceSetDate || cbb.createdAt || 0).getTime();
          timeline.push({ type: 'openingBalance', cbbRow: cbb, timestamp: isNaN(ts) ? 0 : ts });
        });

        (allowanceProvisions || []).forEach(ap => {
          const ts = new Date(ap.provisionDate || ap.createdAt || 0).getTime();
          timeline.push({ type: 'allowance', allowance: ap, timestamp: isNaN(ts) ? 0 : ts });
        });
      }
      
      // Add ungrouped entries to timeline (grouped entries will be shown within payment group sections)
      data.forEach(entry => {
        const entryKey = (entry as any).isRefund && (entry as any).refund 
          ? `refund-${(entry as any).refund.id}` 
          : (entry as any).isCreditNote && (entry as any).creditNote
          ? `creditnote-${(entry as any).creditNote.id}`
          : entry.id;
        
        if (!processedEntryIds.has(entryKey)) {
          // Ungrouped entry - add directly to timeline
          let timestamp = 0;
          if (entry.sale && !(entry as any).isRefund && !(entry as any).isCreditNote) {
            const sale = entry.sale as SaleRecord;
            const saleDate = getSaleDateFromSale(sale) || entry.date;
            timestamp = new Date(saleDate).getTime();
            if (isNaN(timestamp)) timestamp = 0;
          } else if ((entry as any).isRefund && (entry as any).refund) {
            const refund = (entry as any).refund as Refund;
            // Use createdAt first, then refundDate, then entry.date - ensure consistent timestamp extraction
            const refundDate = (refund as any).createdAt || refund.refundDate || entry.date;
            timestamp = new Date(refundDate).getTime();
            if (isNaN(timestamp)) timestamp = 0;
          } else if ((entry as any).isCreditNote && (entry as any).creditNote) {
            const creditNote = (entry as any).creditNote as CreditNote;
            // Use createdAt first, then creditNoteDate, then entry.date - ensure consistent timestamp extraction
            const creditNoteDate = (creditNote as any).createdAt || creditNote.creditNoteDate || entry.date;
            timestamp = new Date(creditNoteDate).getTime();
            if (isNaN(timestamp)) timestamp = 0;
          } else {
            timestamp = new Date(entry.date).getTime();
            if (isNaN(timestamp)) timestamp = 0;
          }
          timeline.push({ type: 'entry', entry, timestamp });
        }
      });
      
      // Add payment groups at their payment dates (only when payments are part of the export)
      const includePaymentsInTimeline =
        pdfDownloadType === 'all' || pdfDownloadType === 'payments';
      if (includePaymentsInTimeline) {
        groupEntries.forEach((groupSales, groupKey) => {
          const groupTotals = paymentGroupTotals.get(groupKey);
          if (!groupTotals?.paymentDate) return;

          const paymentTimestamp = new Date(groupTotals.paymentDate).getTime();
          if (!isNaN(paymentTimestamp)) {
            timeline.push({ type: 'paymentGroup', groupKey, timestamp: paymentTimestamp });
          }
        });
      }

      // Add individual payment records to timeline when the download type should list payments
      if (includePaymentsInTimeline) {
        approvedPayments.forEach(payment => {
          const paymentDate = payment.paymentDate || payment.createdAt;
          if (paymentDate) {
            const paymentTimestamp = new Date(paymentDate).getTime();
            if (!isNaN(paymentTimestamp)) {
              timeline.push({ type: 'payment', payment, timestamp: paymentTimestamp });
            }
          }
        });
      }

      const includeAdjustmentsAndBadDebt =
        pdfDownloadType === 'all' || pdfDownloadType === 'salesAndCredit';
      // Add balance adjustments to timeline
      if ((balanceAdjustments || []).length > 0 && includeAdjustmentsAndBadDebt) {
        (balanceAdjustments || []).forEach(adj => {
          const ts = new Date(adj.adjustmentDate || (adj as any).createdAt || 0).getTime();
          if (!isNaN(ts)) timeline.push({ type: 'adjustment', adjustment: adj, timestamp: ts });
        });
      }

      // Add bad debts to timeline
      if ((badDebts || []).length > 0 && includeAdjustmentsAndBadDebt) {
        (badDebts || []).forEach(bd => {
          const ts = new Date(bd.writeOffDate || 0).getTime();
          if (!isNaN(ts)) timeline.push({ type: 'badDebt', badDebt: bd, timestamp: ts });
        });
      }
      
      // Sort timeline chronologically (oldest first) - ensure all transaction types are sorted together
      timeline.sort((a, b) => {
        // Handle NaN timestamps by putting them at the end
        if (isNaN(a.timestamp) && isNaN(b.timestamp)) return 0;
        if (isNaN(a.timestamp)) return 1;
        if (isNaN(b.timestamp)) return -1;
        // Oldest first (ascending order)
        return a.timestamp - b.timestamp;
      });
      
      return { timeline, groupEntries, refundsByGroup, creditNotesByGroup, entryToGroup };
    }, [data, paymentGroups, saleToPaymentGroup, paymentGroupTotals, approvedPayments, pdfDownloadType, balanceAdjustments, badDebts, openingBalanceCbbRows, allowanceProvisions]);

    // Opening balance: prefer CBB sum (filtered scope), fallback to client/business field
    const openingBalance = openingBalanceFromCBB !== undefined && openingBalanceFromCBB !== null
      ? openingBalanceFromCBB
      : ((clientOrBusiness as { openingBalance?: number })?.openingBalance || 0);

    // Sum of balance adjustments (INCREASE adds, DECREASE subtracts)
    const sumAdjInc = (balanceAdjustments || []).filter(a => a.type === BalanceAdjustmentType.INCREASE).reduce((s, a) => s + (a.amountMMK || 0), 0);
    const sumAdjDec = (balanceAdjustments || []).filter(a => a.type === BalanceAdjustmentType.DECREASE).reduce((s, a) => s + (a.amountMMK || 0), 0);
    const sumBadDebt = (badDebts || []).reduce((s, bd) => s + (bd.writtenOffAmount ?? bd.originalAmount ?? 0), 0);

    // Calculate dynamic KPIs based on filtered data and download type (canonical formula)
    const kpiMetrics = useMemo(() => {
      let totalBilled = 0;
      let totalRefundsAndCredits = 0;
      let netTotal = 0;
      let totalPaid = 0;
      let outstandingBalance = 0;

      if (pdfDownloadType === 'payments') {
        totalPaid = approvedPayments.reduce((sum, payment) => sum + payment.amountMMK, 0);
        totalBilled = 0;
        totalRefundsAndCredits = 0;
        netTotal = 0;
        outstandingBalance = openingBalance - totalPaid;
      } else if (pdfDownloadType === 'sales') {
        totalBilled = data
          .filter(d => !d.isRefund && !d.isCreditNote && d.grandTotal > 0)
          .reduce((sum, entry) => sum + entry.grandTotal, 0);
        totalRefundsAndCredits = 0;
        netTotal = totalBilled + sumAdjInc - sumAdjDec;
        const saleIds = new Set<string>(data.filter(d => !d.isRefund && !d.isCreditNote).map(d => d.id));
        totalPaid = approvedPayments.reduce((sum, payment) => sum + getPaymentAmountForSales(payment, saleIds), 0);
        outstandingBalance = openingBalance + netTotal - totalPaid - sumBadDebt;
      } else if (pdfDownloadType === 'salesAndCredit') {
        totalBilled = data
          .filter(d => !d.isRefund && !d.isCreditNote && d.grandTotal > 0)
          .reduce((sum, entry) => sum + entry.grandTotal, 0);
        totalRefundsAndCredits = data
          .filter(d => d.isRefund || d.isCreditNote)
          .reduce((sum, entry) => sum + Math.abs(entry.grandTotal), 0);
        netTotal = totalBilled - totalRefundsAndCredits + sumAdjInc - sumAdjDec;
        const saleIds = new Set<string>(data.filter(d => !d.isRefund && !d.isCreditNote).map(d => d.id));
        totalPaid = approvedPayments.reduce((sum, payment) => sum + getPaymentAmountForSales(payment, saleIds), 0);
        outstandingBalance = openingBalance + netTotal - totalPaid - sumBadDebt;
      } else {
        totalBilled = data
          .filter(d => !d.isRefund && !d.isCreditNote && d.grandTotal > 0)
          .reduce((sum, entry) => sum + entry.grandTotal, 0);
        totalRefundsAndCredits = data
          .filter(d => d.isRefund || d.isCreditNote)
          .reduce((sum, entry) => sum + Math.abs(entry.grandTotal), 0);
        netTotal = totalBilled - totalRefundsAndCredits + sumAdjInc - sumAdjDec;
        totalPaid = approvedPayments.reduce((sum, payment) => sum + payment.amountMMK, 0);
        outstandingBalance = openingBalance + netTotal - totalPaid - sumBadDebt;
      }

      // Match client/business detail KPI: Firebase client_business_balances (via calculatedOutstanding from parent)
      if (typeof calculatedOutstanding === 'number' && Number.isFinite(calculatedOutstanding)) {
        outstandingBalance = calculatedOutstanding;
      }

      return {
        totalBilled,
        totalRefundsAndCredits,
        netTotal,
        totalPaid,
        outstandingBalance,
        sumAdjInc,
        sumAdjDec,
        sumBadDebt
      };
    }, [data, approvedPayments, pdfDownloadType, openingBalance, sumAdjInc, sumAdjDec, sumBadDebt, calculatedOutstanding]);

    const totalSalesUSD = useMemo(() => {
      return data
        .filter(entry => entry.sale && !entry.isRefund && !entry.isCreditNote)
        .reduce((sum, entry) => {
          if (!entry.sale || entry.isRefund || entry.isCreditNote) return sum;
          const service = allServices.find(s => s.id === entry.sale!.serviceId);
          const isBudgetSale =
            entry.sale.type === 'Facebook Ads' || isBoostingService(service);
          if (!isBudgetSale) return sum;
          if (entry.items && entry.items.length > 0) {
            const itemsTotal = entry.items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0);
            return sum + itemsTotal;
          }
          const sale = entry.sale as SaleRecord & { actualSpendUSD?: number; budgetUSD?: number };
          const fallbackUsd = Number(sale.actualSpendUSD ?? sale.budgetUSD ?? 0) || 0;
          return sum + fallbackUsd;
        }, 0);
    }, [data]);

    const totalCreditNoteUSD = useMemo(() => {
      return data
        .filter(entry => entry.isCreditNote && entry.creditNote)
        .reduce((sum, entry) => sum + (Number(entry.creditNote?.totalUSD) || 0), 0);
    }, [data]);

    const netTotalUSD = totalSalesUSD - totalCreditNoteUSD;

    // Calculate totalAmount based on download type
    const totalAmount = useMemo(() => {
      if (pdfDownloadType === 'payments') {
        return approvedPayments.reduce((sum, payment) => sum + payment.amountMMK, 0);
      } else if (pdfDownloadType === 'sales') {
        return data
          .filter(d => !d.isRefund && !d.isCreditNote)
          .reduce((sum, entry) => sum + entry.grandTotal, 0);
      } else if (pdfDownloadType === 'salesAndCredit') {
        return data.reduce((sum, entry) => sum + entry.grandTotal, 0); // Refunds and credit notes will be negative
      } else {
        // All: Include everything except payments (payments are separate)
        return data.reduce((sum, entry) => sum + entry.grandTotal, 0);
      }
    }, [data, approvedPayments, pdfDownloadType]);
    
    const totalItems = data.reduce((sum, entry) => sum + entry.items.length, 0);
    const salesCount = data.filter(d => !d.isRefund && !d.isCreditNote).length;
    const refundsCount = data.filter(d => d.isRefund).length;
    const creditNotesCount = data.filter(d => d.isCreditNote).length;

    // Group timeline by business (only when viewing a client, not a business)
    const timelineByBusiness = useMemo(() => {
      // If viewing a business, don't group
      if (clientOrBusiness && 'linkedBusinessIds' in clientOrBusiness) {
        return new Map<string, typeof organizedData.timeline>([['all', organizedData.timeline]]);
      }

      // Helper to get business ID from timeline item
      const getBusinessId = (item: typeof organizedData.timeline[0]): string | null => {
        if (item.type === 'entry' && item.entry) {
          const entry = item.entry;
          if (entry.sale && !(entry as any).isRefund && !(entry as any).isCreditNote) {
            return (entry.sale as SaleRecord).businessId || null;
          } else if ((entry as any).isRefund && (entry as any).refund) {
            return (entry as any).refund.businessId || null;
          } else if ((entry as any).isCreditNote && (entry as any).creditNote) {
            return (entry as any).creditNote.businessId || null;
          }
        } else if (item.type === 'payment' && item.payment) {
          // For payments, try to find the business from the linked sale
          const payment = item.payment;
          const allocationSaleId = payment.saleAllocations && payment.saleAllocations.length > 0
            ? payment.saleAllocations[0].saleRecordId
            : payment.saleRecordId;
          if (allocationSaleId) {
            const saleEntry = data.find(e => e.id === allocationSaleId);
            if (saleEntry?.sale) {
              return (saleEntry.sale as SaleRecord).businessId || null;
            }
          }
          // If payment has no linked sale, try to find from invoice
          if (payment.invoiceId) {
            // We don't have invoice data here, so we'll group these as "unknown"
            return null;
          }
        } else if (item.type === 'adjustment' && item.adjustment) {
          return item.adjustment.businessId || null;
        } else if (item.type === 'badDebt' && item.badDebt) {
          return item.badDebt.businessId || null;
        } else if (item.type === 'openingBalance' && item.cbbRow) {
          return item.cbbRow.businessId || null;
        } else if (item.type === 'allowance' && item.allowance) {
          return item.allowance.businessId || null;
        } else if (item.type === 'paymentGroup' && item.groupKey) {
          // For payment groups, get business from first sale in group
          const groupSales = organizedData.groupEntries.get(item.groupKey) || [];
          if (groupSales.length > 0 && groupSales[0].sale) {
            return (groupSales[0].sale as SaleRecord).businessId || null;
          }
        }
        return null;
      };

      // Group timeline items by business
      const grouped = new Map<string, typeof organizedData.timeline>();
      
      organizedData.timeline.forEach(item => {
        const businessId = getBusinessId(item);
        const key = businessId || 'unknown';
        
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(item);
      });

      return grouped;
    }, [organizedData, data, clientOrBusiness]);

    // Calculate total paid amount from all payment groups
    const totalPaidAmount = useMemo(() => {
      let total = 0;
      paymentGroupTotals.forEach((groupTotals) => {
        total += groupTotals.paidAmount;
      });
      return total;
    }, [paymentGroupTotals]);

    // Calculate total remaining amount: sum of remaining from payment groups + ungrouped entries
    const totalRemainingAmount = useMemo(() => {
      // Sum remaining amounts from all payment groups
      let remainingFromGroups = 0;
      paymentGroupTotals.forEach((groupTotals) => {
        remainingFromGroups += groupTotals.remainingAmount;
      });

      // Identify which entries are in payment groups using organizedData
      const processedEntryIds = new Set<string>();
      
      // Add sales that are in payment groups
      organizedData.groupEntries.forEach((groupSales) => {
        groupSales.forEach(entry => {
          processedEntryIds.add(entry.id);
        });
      });
      
      // Add refunds that are in payment groups
      organizedData.refundsByGroup.forEach((refunds) => {
        refunds.forEach(entry => {
          if (entry.refund) {
            processedEntryIds.add(`refund-${entry.refund.id}`);
          }
        });
      });
      
      // Add credit notes that are in payment groups
      organizedData.creditNotesByGroup.forEach((creditNotes) => {
        creditNotes.forEach(entry => {
          if (entry.creditNote) {
            processedEntryIds.add(`creditnote-${entry.creditNote.id}`);
          }
        });
      });

      // Sum grandTotal from ungrouped entries
      let remainingFromUngrouped = 0;
      data.forEach(entry => {
        const entryKey = (entry as any).isRefund && (entry as any).refund 
          ? `refund-${(entry as any).refund.id}` 
          : (entry as any).isCreditNote && (entry as any).creditNote
          ? `creditnote-${(entry as any).creditNote.id}`
          : entry.id;
        
        if (!processedEntryIds.has(entryKey)) {
          remainingFromUngrouped += entry.grandTotal;
        }
      });

      return remainingFromGroups + remainingFromUngrouped;
    }, [paymentGroupTotals, organizedData, data]);

    const pageStyle: React.CSSProperties = {
      fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
      color: '#1f2937',
      backgroundColor: '#ffffff',
      width: '210mm',
      minHeight: 'auto',
      height: 'auto',
      padding: '10mm',
      margin: '0',
      boxSizing: 'border-box',
      lineHeight: '1.5',
      overflow: 'visible',
    };

    const summaryGrid: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 16% 14%',
      alignItems: 'center',
      columnGap: '4px',
    };
    const summaryRowLabel: React.CSSProperties = {
      textAlign: 'right',
      fontSize: '9px',
      fontWeight: 600,
      color: '#475569',
      padding: '10px 8px',
    };
    const summaryRowValue: React.CSSProperties = {
      textAlign: 'right',
      fontSize: '12px',
      fontWeight: 700,
      padding: '10px 8px',
    };
    const summaryRowPaid: React.CSSProperties = {
      textAlign: 'right',
      fontSize: '9px',
      fontWeight: 400,
      color: '#64748b',
      padding: '10px 8px',
    };

    return (
      <div ref={ref} style={pageStyle}>
        <header style={{ 
          textAlign: 'center', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          padding: '20px 15px',
          marginTop: '0',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          {companyProfile?.logoUrl && (
            <img 
              src={companyProfile.logoUrl} 
              alt="Company Logo" 
              style={{ 
                maxHeight: '80px', 
                maxWidth: '220px',
                marginBottom: '15px',
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)'
              }}
              crossOrigin="anonymous"
            />
          )}
          <h1 style={{ 
            fontSize: '28px', 
            margin: '0 0 8px 0', 
            fontWeight: '700',
            color: '#ffffff',
            letterSpacing: '-0.5px'
          }}>
            {companyProfile?.companyName || 'Company'}
          </h1>
          <h2 style={{ 
            fontSize: '18px', 
            margin: '0', 
            color: '#f0f9ff',
            fontWeight: '500',
            letterSpacing: '0.5px'
          }}>
            {pdfDownloadType === 'payments' ? 'Payments Statement' :
             pdfDownloadType === 'sales' ? 'Sales Statement' :
             pdfDownloadType === 'salesAndCredit' ? 'Sales & Credits Statement' :
             'All Records Statement'}
          </h2>
        </header>

        <div style={{ 
          marginBottom: '20px', 
          fontSize: '10px',
          backgroundColor: '#f8fafc',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>Report For:</strong> <span style={{ color: '#1e293b' }}>{clientOrBusiness?.name || 'N/A'}</span></p>
          {(() => {
            // If viewing a Client, find all linked business names from sales/refunds/credit notes
            if (clientOrBusiness && !('linkedBusinessIds' in clientOrBusiness)) {
              // This is a Client, collect all unique businessIds from data
              const businessIds = new Set<string>();
              
              data.forEach(entry => {
                if (entry.sale && !(entry as any).isRefund && !(entry as any).isCreditNote && (entry.sale as SaleRecord).businessId) {
                  businessIds.add((entry.sale as SaleRecord).businessId!);
                } else if ((entry as any).isRefund && (entry as any).refund && (entry as any).refund.businessId) {
                  businessIds.add((entry as any).refund.businessId);
                } else if ((entry as any).isCreditNote && (entry as any).creditNote && (entry as any).creditNote.businessId) {
                  businessIds.add((entry as any).creditNote.businessId);
                }
              });
              
              if (businessIds.size > 0) {
                const businessNames = Array.from(businessIds)
                  .map(bId => allBusinesses.find(b => b.id === bId)?.name)
                  .filter(Boolean)
                  .join(', ');
                if (businessNames) {
                  return <p><strong>Business{businessIds.size > 1 ? 'es' : ''}:</strong> {businessNames}</p>;
                }
              }
            }
            
            // If viewing a Business, find all linked client names from sales/refunds/credit notes
            if (clientOrBusiness && 'linkedBusinessIds' in clientOrBusiness) {
              // This is a Business, collect all unique clientIds from data
              const clientIds = new Set<string>();
              
              data.forEach(entry => {
                if (entry.sale && !(entry as any).isRefund && !(entry as any).isCreditNote && (entry.sale as SaleRecord).clientId) {
                  clientIds.add((entry.sale as SaleRecord).clientId!);
                } else if ((entry as any).isRefund && (entry as any).refund && (entry as any).refund.clientId) {
                  clientIds.add((entry as any).refund.clientId);
                } else if ((entry as any).isCreditNote && (entry as any).creditNote && (entry as any).creditNote.clientId) {
                  clientIds.add((entry as any).creditNote.clientId);
                }
              });
              
              if (clientIds.size > 0) {
                const clientNames = Array.from(clientIds)
                  .map(cId => allClients.find(c => c.id === cId)?.name)
                  .filter(Boolean)
                  .join(', ');
                if (clientNames) {
                  return <p><strong>Client{clientIds.size > 1 ? 's' : ''}:</strong> {clientNames}</p>;
                }
              }
            }
            
            return null;
          })()}
            <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>ID:</strong> <span style={{ color: '#1e293b' }}>{clientOrBusiness?.id || 'N/A'}</span></p>
            <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>Date Range:</strong> <span style={{ color: '#1e293b' }}>{dateRange.start ? formatDate(dateRange.start) : 'All'} - {dateRange.end ? formatDate(dateRange.end) : 'All'}</span></p>
            {filters.status !== 'All' && <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>Status Filter:</strong> <span style={{ color: '#1e293b' }}>{filters.status}</span></p>}
            <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>Total Records:</strong> <span style={{ color: '#1e293b' }}>{data.length} ({salesCount} Sales, {refundsCount} Refunds, {creditNotesCount} Credit Notes)</span></p>
            <p style={{ margin: '4px 0' }}><strong style={{ color: '#475569' }}>Total Items:</strong> <span style={{ color: '#1e293b' }}>{totalItems}</span></p>
          </div>
        </div>

        <table style={{ 
          width: '100%', 
          borderCollapse: 'separate', 
          borderSpacing: '0',
          fontSize: '9px', 
          marginBottom: '15px',
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff'
            }}>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Date
              </th>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Reference ID
              </th>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Service Description
              </th>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'right', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Qty
              </th>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'right', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Rate/Unit Price
              </th>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'right', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Total (MMK)
              </th>
              <th style={{ 
                border: 'none', 
                padding: '10px 8px', 
                textAlign: 'right', 
                verticalAlign: 'middle',
                fontWeight: '600',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Paid Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {organizedData.timeline.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ 
                  border: '1px solid #e2e8f0', 
                  padding: '20px', 
                  verticalAlign: 'middle', 
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  fontSize: '11px'
                }}>
                  No records found
                </td>
              </tr>
            ) : (
              organizedData.timeline.map((item, index) => {
                if (item.type === 'paymentGroup' && item.groupKey) {
                  // Render payment group section break
                  const groupKey = item.groupKey;
                  const groupTotals = paymentGroupTotals.get(groupKey);
                  const groupSales = organizedData.groupEntries.get(groupKey) || [];
                  const groupRefunds = organizedData.refundsByGroup.get(groupKey) || [];
                  const groupCreditNotes = organizedData.creditNotesByGroup.get(groupKey) || [];
                  const allGroupEntries = [...groupSales, ...groupRefunds, ...groupCreditNotes].sort((a, b) => {
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    return dateA - dateB;
                  });
                  
                  return (
                    <React.Fragment key={`group-${groupKey}-${index}`}>
                      {/* Render entries in this group first */}
                      {allGroupEntries.flatMap((entry) => {
                // Handle refund entries
                if (entry.isRefund && entry.refund) {
                  const refund = entry.refund;
                  const isFBAds = isFacebookAds(entry);
                  return (
                    <tr key={`refund-${refund.id}`} style={{ 
                      backgroundColor: '#fef2f2',
                      borderBottom: '1px solid #fee2e2'
                    }}>
                      <td style={{ 
                        border: 'none', 
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#1e293b',
                        fontSize: '9px'
                      }}>
                        {formatDate(refund.refundDate)}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontSize: '9px'
                      }}>
                        {refund.id} <span style={{ fontSize: '8px', color: '#991b1b' }}>(Refund)</span>
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        color: '#dc2626',
                        fontSize: '9px'
                      }}>
                        {refund.serviceId 
                          ? `${allServices.find(s => s.id === refund.serviceId)?.name || refund.serviceId} - Refund${refund.totalUSD && refund.rate ? ` (${refund.totalUSD} USD × ${refund.rate.toLocaleString()} MMK/USD)` : ''}`
                          : 'Refund'}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: '#1e293b',
                        fontSize: '9px'
                      }}>
                        {isFBAds ? '1$' : '1'}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b',
                        fontSize: '9px'
                      }}>
                        -
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '700', 
                        color: '#dc2626',
                        fontSize: '9px'
                      }}>
                        -{refund.amountMMK.toLocaleString()}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #fee2e2',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b',
                        fontSize: '9px'
                      }}>
                        0
                      </td>
                            </tr>
                          );
                        }
                        
                        // Handle credit note entries
                        if (entry.isCreditNote && entry.creditNote) {
                          const creditNote = entry.creditNote;
                          const isFBAds = isFacebookAds(entry);
                          return (
                            <tr key={`credit-note-${creditNote.id}`} style={{ 
                              backgroundColor: '#fff7ed',
                              borderBottom: '1px solid #fed7aa'
                            }}>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle',
                                color: '#1e293b'
                              }}>
                                {formatDate(creditNote.creditNoteDate)}
                              </td>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle', 
                                fontWeight: '600', 
                                color: '#ea580c' 
                              }}>
                                {creditNote.id}
                              </td>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle', 
                                color: '#ea580c' 
                              }}>
                                {creditNote.serviceId 
                                  ? `${allServices.find(s => s.id === creditNote.serviceId)?.name || creditNote.serviceId} - Credit Note${creditNote.totalUSD && creditNote.rate ? ` (${creditNote.totalUSD} USD × ${creditNote.rate.toLocaleString()} MMK/USD)` : ''}`
                                  : 'Credit Note'}
                              </td>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#1e293b'
                              }}>
                                {creditNote.totalUSD ? `${creditNote.totalUSD}$` : (isFBAds ? '1$' : '1$')}
                              </td>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle', 
                                textAlign: 'right',
                                color: '#64748b'
                              }}>
                                -
                              </td>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle', 
                                textAlign: 'right', 
                                fontWeight: '700', 
                                color: '#ea580c',
                                fontSize: '11px'
                              }}>
                                -{creditNote.amountMMK.toLocaleString()}
                              </td>
                              <td style={{ 
                                border: 'none',
                                borderBottom: '1px solid #fed7aa',
                                padding: '8px 6px', 
                                verticalAlign: 'middle', 
                                textAlign: 'right',
                                color: '#64748b',
                                fontSize: '10px'
                              }}>
                                -
                              </td>
                            </tr>
                          );
                        }

                        // Handle sale entries
                const isFBAds = isFacebookAds(entry);
                return entry.items.length > 0 ? entry.items.map((item, itemIndex) => (
                  <tr key={`${entry.id}-${itemIndex}`} style={{
                    borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                    backgroundColor: itemIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}>
                    {itemIndex === 0 && (
                      <>
                        <td rowSpan={entry.items.length} style={{ 
                          border: 'none',
                          borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                          padding: '8px 6px', 
                          verticalAlign: 'middle',
                          color: '#1e293b',
                          fontWeight: '500'
                        }}>
                          {formatDate(entry.date)}
                        </td>
                        <td rowSpan={entry.items.length} style={{ 
                          border: 'none',
                          borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          fontWeight: '600',
                          color: '#1e293b'
                        }}>
                          {entry.id}
                        </td>
                      </>
                    )}
                    <td style={{ 
                      border: 'none',
                      borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                      padding: '8px 6px', 
                      verticalAlign: 'middle',
                      color: '#334155'
                    }}>
                      {item.description}
                    </td>
                    <td style={{ 
                      border: 'none',
                      borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                      padding: '8px 6px', 
                      verticalAlign: 'middle', 
                      textAlign: 'right', 
                      fontWeight: '600',
                      color: '#1e293b'
                    }}>
                      {showBudgetQuantity(entry, item) ? `${item.quantity}$` : item.quantity.toString()}
                    </td>
                    <td style={{ 
                      border: 'none',
                      borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                      padding: '8px 6px', 
                      verticalAlign: 'middle', 
                      textAlign: 'right',
                      color: '#475569'
                    }}>
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td style={{ 
                      border: 'none',
                      borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                      padding: '8px 6px', 
                      verticalAlign: 'middle', 
                      textAlign: 'right', 
                      fontWeight: '700',
                      color: '#1e293b',
                      fontSize: '11px'
                    }}>
                      {item.total.toLocaleString()}
                    </td>
                    {itemIndex === 0 && (
                      <td rowSpan={entry.items.length} style={{ 
                        border: 'none',
                        borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#16a34a',
                        fontSize: '11px'
                      }}>
                        {getPaidAmount(entry.id).toLocaleString()}
                      </td>
                    )}
                  </tr>
                )) : (
                    <tr key={entry.id} style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff'
                    }}>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#1e293b',
                        fontWeight: '500'
                      }}>
                        {formatDate(entry.date)}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                        {entry.id}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#64748b'
                      }}>
                        No items
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                      {isFBAds ? '1$' : '1'}
                    </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b'
                      }}>
                        -
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '11px'
                      }}>
                      {entry.grandTotal.toLocaleString()}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#16a34a',
                        fontSize: '11px'
                      }}>
                        {getPaidAmount(entry.id).toLocaleString()}
                    </td>
                          </tr>
                        );
                      })}
                      {/* Summary section for payment group */}
                      <tr style={{ 
                        backgroundColor: '#f1f5f9', 
                        fontWeight: '700', 
                        borderTop: '3px solid #cbd5e1',
                        borderBottom: '1px solid #cbd5e1'
                      }}>
                        <td colSpan={5} style={{ 
                          border: 'none',
                          padding: '12px 10px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontSize: '9px',
                          color: '#334155',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Group Total:
                        </td>
                        <td style={{ 
                          border: 'none',
                          padding: '12px 10px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#1e293b'
                        }}>
                          {groupTotals?.totalAmount.toLocaleString() || '0'}
                        </td>
                        <td style={{ 
                          border: 'none',
                          padding: '12px 10px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          fontSize: '9px',
                          color: '#64748b'
                        }}>
                          -
                        </td>
                        <td style={{ 
                          border: 'none',
                          padding: '12px 10px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          fontSize: '12px',
                          color: '#1e293b'
                        }}>
                          {groupTotals?.totalAmount.toLocaleString() || '0'}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          fontSize: '9px', 
                          color: '#64748b' 
                        }}>
                          {groupTotals?.paymentDate ? formatDate(groupTotals.paymentDate) : ''}
                        </td>
                        <td colSpan={5} style={{ 
                          border: 'none',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '600', 
                          fontSize: '9px',
                          color: '#475569'
                        }}>
                          Total Paid:
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          fontSize: '9px',
                          color: '#64748b'
                        }}>
                          -
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #e2e8f0',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          fontSize: '9px',
                          color: '#16a34a'
                        }}>
                          {groupTotals?.paidAmount.toLocaleString() || '0'}
                        </td>
                      </tr>
                      <tr style={{ 
                        backgroundColor: '#f8fafc', 
                        borderBottom: '3px solid #cbd5e1',
                        marginBottom: '10px'
                      }}>
                        <td colSpan={5} style={{ 
                          border: 'none',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '600', 
                          fontSize: '9px',
                          color: '#475569'
                        }}>
                          Remaining:
                        </td>
                        <td style={{ 
                          border: 'none',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          fontSize: '9px',
                          color: '#dc2626'
                        }}>
                          {groupTotals?.remainingAmount.toLocaleString() || '0'}
                        </td>
                        <td style={{ 
                          border: 'none',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          fontSize: '9px',
                          color: '#64748b'
                        }}>
                          -
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                } else if (item.type === 'payment' && item.payment) {
                  // Render payment record
                  const payment = item.payment;
                  return (
                    <tr key={`payment-${payment.id}`} style={{ 
                      backgroundColor: '#f0fdf4',
                      borderBottom: '1px solid #bbf7d0'
                    }}>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#1e293b'
                      }}>
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        fontWeight: '600', 
                        color: '#16a34a' 
                      }}>
                        {payment.receiptNumber || payment.id} <span style={{ fontSize: '9px', color: '#15803d' }}>(Payment)</span>
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        color: '#16a34a' 
                      }}>
                        {payment.method || 'Payment'}
                        {payment.invoiceId ? ` - Invoice: ${payment.invoiceId}` : ''}
                        {payment.saleAllocations && payment.saleAllocations.length > 0
                          ? ` - Sales: ${payment.saleAllocations.map(a => a.saleRecordId).join(', ')}`
                          : (payment.saleRecordId && !payment.invoiceId ? ` - Sale: ${payment.saleRecordId}` : '')}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b'
                      }}>
                        -
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b'
                      }}>
                        -
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b',
                        fontSize: '10px'
                      }}>
                        -
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #bbf7d0',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '700', 
                        color: '#16a34a',
                        fontSize: '11px'
                      }}>
                        {payment.amountMMK.toLocaleString()}
                      </td>
                    </tr>
                  );
                } else if (item.type === 'openingBalance' && item.cbbRow) {
                  const cbb = item.cbbRow;
                  const bizName = cbb.businessId ? (allBusinesses.find(b => b.id === cbb.businessId)?.name || cbb.businessId) : '';
                  return (
                    <tr key={`ob-${cbb.id}`} style={{ backgroundColor: '#eef2ff', borderBottom: '1px solid #c7d2fe' }}>
                      <td style={{ border: 'none', borderBottom: '1px solid #c7d2fe', padding: '8px 6px', verticalAlign: 'middle', color: '#1e293b' }}>
                        {formatDate(cbb.openingBalanceSetDate || cbb.createdAt)}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #c7d2fe', padding: '8px 6px', verticalAlign: 'middle', fontWeight: '600', color: '#3730a3' }}>
                        {cbb.id} <span style={{ fontSize: '8px', color: '#4338ca' }}>(Opening)</span>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #c7d2fe', padding: '8px 6px', verticalAlign: 'middle', color: '#3730a3' }}>
                        Opening Balance{bizName ? ` — ${bizName}` : ''}
                      </td>
                      <td colSpan={3} style={{ border: 'none', borderBottom: '1px solid #c7d2fe', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '600', color: '#3730a3' }}>
                        +{(cbb.openingBalance ?? 0).toLocaleString()}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #c7d2fe', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', color: '#64748b' }}>-</td>
                    </tr>
                  );
                } else if (item.type === 'allowance' && item.allowance) {
                  const ap = item.allowance;
                  const bizName = ap.businessId ? (allBusinesses.find(b => b.id === ap.businessId)?.name || ap.businessId) : '';
                  return (
                    <tr key={`ap-${ap.id}`} style={{ backgroundColor: '#ecfeff', borderBottom: '1px solid #a5f3fc' }}>
                      <td style={{ border: 'none', borderBottom: '1px solid #a5f3fc', padding: '8px 6px', verticalAlign: 'middle', color: '#1e293b' }}>
                        {formatDate(ap.provisionDate)}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #a5f3fc', padding: '8px 6px', verticalAlign: 'middle', fontWeight: '600', color: '#0e7490' }}>
                        {ap.id} <span style={{ fontSize: '8px', color: '#155e75' }}>(Allowance)</span>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #a5f3fc', padding: '8px 6px', verticalAlign: 'middle', color: '#0e7490' }}>
                        Allowance for doubtful debts{ap.period ? ` (${ap.period})` : ''}{bizName ? ` — ${bizName}` : ''}
                      </td>
                      <td colSpan={3} style={{ border: 'none', borderBottom: '1px solid #a5f3fc', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '600', color: '#0e7490' }}>
                        {(ap.provisionAmount ?? 0).toLocaleString()}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #a5f3fc', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', color: '#64748b' }}>-</td>
                    </tr>
                  );
                } else if (item.type === 'entry' && item.entry) {
                  // Render individual entry
                  const entry = item.entry;
                  
                  // Handle refund entries
                  if (entry.isRefund && entry.refund) {
                    const refund = entry.refund;
                    const isFBAds = isFacebookAds(entry);
                    return (
                      <tr key={`refund-${refund.id}`} style={{ 
                        backgroundColor: '#fef2f2',
                        borderBottom: '1px solid #fee2e2'
                      }}>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle',
                          color: '#1e293b'
                        }}>
                          {formatDate(refund.refundDate)}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          fontWeight: '600', 
                          color: '#dc2626' 
                        }}>
                          {refund.id} <span style={{ fontSize: '9px', color: '#991b1b' }}>(Refund)</span>
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          color: '#dc2626' 
                        }}>
                          {refund.serviceId 
                            ? `${allServices.find(s => s.id === refund.serviceId)?.name || refund.serviceId} - Refund${refund.totalUSD && refund.rate ? ` (${refund.totalUSD} USD × ${refund.rate.toLocaleString()} MMK/USD)` : ''}`
                            : 'Refund'}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: '#1e293b'
                        }}>
                          {isFBAds ? '1$' : '1'}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          color: '#64748b'
                        }}>
                          -
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          color: '#dc2626',
                          fontSize: '11px'
                        }}>
                          -{refund.amountMMK.toLocaleString()}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fee2e2',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          color: '#64748b',
                          fontSize: '10px'
                        }}>
                          0
                        </td>
                      </tr>
                    );
                  }
                  
                  // Handle credit note entries
                  if (entry.isCreditNote && entry.creditNote) {
                    const creditNote = entry.creditNote;
                    const isFBAds = isFacebookAds(entry);
                    return (
                      <tr key={`credit-note-${creditNote.id}`} style={{ 
                        backgroundColor: '#fff7ed',
                        borderBottom: '1px solid #fed7aa'
                      }}>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle',
                          color: '#1e293b'
                        }}>
                          {formatDate(creditNote.creditNoteDate)}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          fontWeight: '600', 
                          color: '#ea580c' 
                        }}>
                          {creditNote.id}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          color: '#ea580c' 
                        }}>
                          {creditNote.serviceId 
                            ? `${allServices.find(s => s.id === creditNote.serviceId)?.name || creditNote.serviceId} - Credit Note${creditNote.totalUSD && creditNote.rate ? ` (${creditNote.totalUSD} USD × ${creditNote.rate.toLocaleString()} MMK/USD)` : ''}`
                            : 'Credit Note'}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: '#1e293b'
                        }}>
                          {creditNote.totalUSD ? `${creditNote.totalUSD}$` : (isFBAds ? '1$' : '1$')}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          color: '#64748b'
                        }}>
                          {creditNote.rate ? creditNote.rate.toLocaleString() : '-'}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          color: '#ea580c',
                          fontSize: '11px'
                        }}>
                          -{creditNote.amountMMK.toLocaleString()}
                        </td>
                        <td style={{ 
                          border: 'none',
                          borderBottom: '1px solid #fed7aa',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          color: '#64748b',
                          fontSize: '10px'
                        }}>
                          0
                        </td>
                      </tr>
                    );
                  }

                  // Handle sale entries
                  const isFBAds = isFacebookAds(entry);
                  return entry.items.length > 0 ? entry.items.map((item, itemIndex) => (
                    <tr key={`${entry.id}-${itemIndex}`} style={{
                      borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                      backgroundColor: itemIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}>
                      {itemIndex === 0 && (
                        <>
                            <td rowSpan={entry.items.length} style={{ 
                              border: 'none',
                              borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                              padding: '8px 6px', 
                              verticalAlign: 'middle',
                              color: '#1e293b',
                              fontWeight: '500'
                            }}>
                              {formatDate(entry.date)}
                            </td>
                            <td rowSpan={entry.items.length} style={{ 
                              border: 'none',
                              borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                              padding: '8px 6px', 
                              verticalAlign: 'middle', 
                              fontWeight: '600',
                              color: '#1e293b'
                            }}>
                              {entry.id}
                            </td>
                        </>
                      )}
                      <td style={{ 
                        border: 'none',
                        borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#334155'
                      }}>
                        {item.description}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                        {showBudgetQuantity(entry, item) ? `${item.quantity}$` : item.quantity.toString()}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#475569'
                      }}>
                        {item.unitPrice.toLocaleString()}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '11px'
                      }}>
                        {item.total.toLocaleString()}
                      </td>
                      {itemIndex === 0 && (
                        <td rowSpan={entry.items.length} style={{ 
                          border: 'none',
                          borderBottom: itemIndex === entry.items.length - 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                          padding: '8px 6px', 
                          verticalAlign: 'middle', 
                          textAlign: 'right',
                          fontWeight: '600',
                          color: '#16a34a',
                          fontSize: '11px'
                        }}>
                          {getPaidAmount(entry.id).toLocaleString()}
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr key={entry.id} style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff'
                    }}>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#1e293b',
                        fontWeight: '500'
                      }}>
                        {formatDate(entry.date)}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                        {entry.id}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle',
                        color: '#64748b'
                      }}>
                        No items
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: '#1e293b'
                      }}>
                        {isFBAds ? '1$' : '1'}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        color: '#64748b'
                      }}>
                        -
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right', 
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '11px'
                      }}>
                        {entry.grandTotal.toLocaleString()}
                      </td>
                      <td style={{ 
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        padding: '8px 6px', 
                        verticalAlign: 'middle', 
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#16a34a',
                        fontSize: '11px'
                      }}>
                        {getPaidAmount(entry.id).toLocaleString()}
                      </td>
                    </tr>
                  );
                } else if (item.type === 'adjustment' && item.adjustment) {
                  const adj = item.adjustment;
                  return (
                    <tr key={`adj-${adj.id}`} style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ border: 'none', borderBottom: '1px solid #fef3c7', padding: '8px 6px', verticalAlign: 'middle', color: '#1e293b' }}>
                        {formatDate(adj.adjustmentDate || (adj as any).createdAt)}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #fef3c7', padding: '8px 6px', verticalAlign: 'middle', fontWeight: '600', color: '#b45309' }}>
                        {adj.id} <span style={{ fontSize: '8px', color: '#92400e' }}>({adj.type})</span>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #fef3c7', padding: '8px 6px', verticalAlign: 'middle', color: '#b45309' }}>
                        Balance Adjustment - {adj.type}
                      </td>
                      <td colSpan={3} style={{ border: 'none', borderBottom: '1px solid #fef3c7', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '600', color: adj.type === BalanceAdjustmentType.INCREASE ? '#16a34a' : '#dc2626' }}>
                        {adj.type === BalanceAdjustmentType.INCREASE ? '+' : '-'}{(adj.amountMMK || 0).toLocaleString()}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #fef3c7', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', color: '#64748b' }}>-</td>
                    </tr>
                  );
                } else if (item.type === 'badDebt' && item.badDebt) {
                  const bd = item.badDebt;
                  return (
                    <tr key={`bd-${bd.id}`} style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                      <td style={{ border: 'none', borderBottom: '1px solid #fed7aa', padding: '8px 6px', verticalAlign: 'middle', color: '#1e293b' }}>
                        {formatDate(bd.writeOffDate)}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #fed7aa', padding: '8px 6px', verticalAlign: 'middle', fontWeight: '600', color: '#c2410c' }}>
                        {bd.id} <span style={{ fontSize: '8px', color: '#9a3412' }}>(Bad Debt)</span>
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #fed7aa', padding: '8px 6px', verticalAlign: 'middle', color: '#c2410c' }}>
                        Bad Debt Write-Off
                      </td>
                      <td colSpan={3} style={{ border: 'none', borderBottom: '1px solid #fed7aa', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                        -{(bd.writtenOffAmount ?? bd.originalAmount ?? 0).toLocaleString()}
                      </td>
                      <td style={{ border: 'none', borderBottom: '1px solid #fed7aa', padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right', color: '#64748b' }}>-</td>
                    </tr>
                  );
                }
                return null;
              })
            )}
          </tbody>
        </table>

        {(data.length > 0 || pdfDownloadType === 'payments') && (
          <div
            data-pdf-protect-tail
            style={{
              marginTop: '12px',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            }}
          >
            <div
              data-pdf-summary
              style={{
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ ...summaryGrid, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={summaryRowLabel}>Total USD (Net of Credit Notes):</div>
                <div style={{ ...summaryRowValue, color: '#1e293b' }}>
                  {netTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ ...summaryRowPaid, fontWeight: 600 }}>USD</div>
              </div>
              <div style={{ ...summaryGrid, backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ ...summaryRowLabel, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155' }}>
                  Grand Total:
                </div>
                <div style={{ ...summaryRowValue, fontSize: '13px', color: '#1e293b' }}>
                  {kpiMetrics.netTotal.toLocaleString()}
                </div>
                <div style={summaryRowPaid}>-</div>
              </div>
              <div style={{ ...summaryGrid, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={summaryRowLabel}>Total Paid:</div>
                <div style={summaryRowPaid}>-</div>
                <div style={{ ...summaryRowValue, fontSize: '12px', color: '#16a34a' }}>
                  {kpiMetrics.totalPaid.toLocaleString()}
                </div>
              </div>
              <div style={{ ...summaryGrid, backgroundColor: '#f8fafc' }}>
                <div style={summaryRowLabel}>Outstanding Balance:</div>
                <div style={{ ...summaryRowValue, color: kpiMetrics.outstandingBalance > 0 ? '#dc2626' : '#16a34a' }}>
                  {kpiMetrics.outstandingBalance.toLocaleString()}
                </div>
                <div style={summaryRowPaid}>-</div>
              </div>
            </div>

            <footer
              data-pdf-footer
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '2px solid #e2e8f0',
                textAlign: 'center',
                fontSize: '9px',
                color: '#64748b',
                backgroundColor: '#f8fafc',
                padding: '12px',
                borderRadius: '6px',
              }}
            >
              <p style={{ margin: '4px 0', fontWeight: '500' }}>
                This report was generated by <strong style={{ color: '#475569' }}>{companyProfile?.appName || 'ERP System'}</strong> on {new Date().toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}.
              </p>
            </footer>
          </div>
        )}
      </div>
    );
  }
);

SalesRecordsPDFTemplate.displayName = 'SalesRecordsPDFTemplate';

export default SalesRecordsPDFTemplate;

