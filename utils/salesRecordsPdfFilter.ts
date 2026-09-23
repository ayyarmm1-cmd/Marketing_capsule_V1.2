import type { PDFDownloadType } from '../components/clients/modals/DownloadPDFModal';

/** Filter sales-record timeline rows for statement PDF export by download type. */
export function filterSalesRecordsForPdf<T extends {
  sale?: unknown;
  isRefund?: boolean;
  isCreditNote?: boolean;
  isPayment?: boolean;
}>(records: T[], downloadType: PDFDownloadType): T[] {
  switch (downloadType) {
    case 'sales':
      return records.filter(
        (entry) => entry.sale && !entry.isRefund && !entry.isCreditNote && !entry.isPayment
      );
    case 'salesAndCredit':
      return records.filter(
        (entry) =>
          (entry.sale || entry.isRefund || entry.isCreditNote) && !entry.isPayment
      );
    case 'payments':
      return [];
    case 'all':
    default:
      return records;
  }
}
