import { CreditNote, FacebookAdsSaleRecord, OtherServicesSaleRecord, Refund, SaleRecord } from '../types';
import { isBoostingService, isBoostingServiceId } from './boostingServiceUtils';

/** Facebook Ads budget/spend USD for a sale row. */
export const getFacebookAdsUsdFromSale = (sale: SaleRecord): number => {
    if (sale.type !== 'Facebook Ads') return 0;
    const fb = sale as FacebookAdsSaleRecord;
    return fb.actualSpendUSD ?? fb.budgetUSD ?? 0;
};

/** Budget USD for Facebook Ads or boosting services (S_001 / S_002). */
export const getBoostingUsdFromSale = (
    sale: SaleRecord,
    service?: { id?: string; name?: string } | null
): number => {
    if (sale.type === 'Facebook Ads') {
        return getFacebookAdsUsdFromSale(sale);
    }
    const svc = service ?? (sale.serviceId ? { id: sale.serviceId } : null);
    if (!isBoostingService(svc) && !isBoostingServiceId(sale.serviceId)) {
        return 0;
    }
    const other = sale as OtherServicesSaleRecord;
    const rate = other.unitPriceMMK || 0;
    const qty = other.quantity || 0;
    if (qty > 0 && qty !== 1) return qty;
    if (rate > 0 && other.grandTotalMMK > 0) {
        const derived = other.grandTotalMMK / rate;
        return Number.isInteger(derived) ? derived : Number(derived.toFixed(2));
    }
    return qty || 0;
};

/** Credit note USD (explicit totalUSD or fallback from linked boosting sale). */
export const getCreditNoteUsd = (
    creditNote: CreditNote,
    linkedSale?: SaleRecord,
    service?: { id?: string; name?: string } | null
): number => {
    if (creditNote.totalUSD != null && creditNote.totalUSD > 0) return creditNote.totalUSD;
    if (linkedSale) return getBoostingUsdFromSale(linkedSale, service);
    return 0;
};

/** Campaign start for Facebook Ads sales; empty for other service types. */
export const getCampaignStartDateFromSale = (sale: SaleRecord): string | undefined => {
    if (sale.type !== 'Facebook Ads') return undefined;
    return (sale as FacebookAdsSaleRecord).startDate || undefined;
};

/** Primary business date for a sale row (campaign start, sale date, or record created). */
export const getSaleDateFromSale = (sale: SaleRecord): string | undefined => {
    if (sale.type === 'Facebook Ads') {
        return getCampaignStartDateFromSale(sale) || sale.createdAt || sale.updatedAt;
    }
    if (sale.type === 'Other Services') {
        const other = sale as OtherServicesSaleRecord;
        return other.saleDate || sale.createdAt || sale.updatedAt;
    }
    return sale.createdAt || sale.updatedAt;
};

/** Campaign end from stored endDate or startDate + durationDays. */
export const getCampaignEndDateFromSale = (sale: SaleRecord): string | undefined => {
    if (sale.type !== 'Facebook Ads') return undefined;
    const fb = sale as FacebookAdsSaleRecord;
    if (fb.endDate) return fb.endDate;
    if (!fb.startDate || !fb.durationDays) return undefined;
    const end = new Date(`${fb.startDate}T12:00:00`);
    end.setDate(end.getDate() + Math.max(fb.durationDays - 1, 0));
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const getCreatedDateFromSale = (sale: SaleRecord): string | undefined =>
    sale.createdAt || sale.updatedAt;

export const getCreatedDateFromCreditNote = (creditNote: CreditNote): string | undefined =>
    creditNote.createdAt || creditNote.updatedAt;

export const getCreatedDateFromRefund = (refund: Refund): string | undefined =>
    refund.createdAt || refund.updatedAt;

export type ReportDateFields = {
    createdDate?: string;
    campaignStartDate?: string;
    campaignEndDate?: string;
    creditNoteDate?: string;
};

export const getReportDatesForSale = (sale: SaleRecord): ReportDateFields => ({
    createdDate: getCreatedDateFromSale(sale),
    campaignStartDate: getCampaignStartDateFromSale(sale),
    campaignEndDate: getCampaignEndDateFromSale(sale),
});

export const getReportDatesForCreditNote = (
    creditNote: CreditNote,
    linkedSale?: SaleRecord
): ReportDateFields => ({
    createdDate: getCreatedDateFromCreditNote(creditNote),
    campaignStartDate: linkedSale ? getCampaignStartDateFromSale(linkedSale) : undefined,
    campaignEndDate: linkedSale ? getCampaignEndDateFromSale(linkedSale) : undefined,
    creditNoteDate: creditNote.creditNoteDate,
});

export const getReportDatesForRefund = (refund: Refund): ReportDateFields => ({
    createdDate: getCreatedDateFromRefund(refund),
});
