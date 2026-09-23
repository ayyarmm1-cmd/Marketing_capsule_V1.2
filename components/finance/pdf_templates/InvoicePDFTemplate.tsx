import React from 'react';
import { Invoice, CompanyProfileSetting, InvoiceStatus, Client, Business } from '../../../types';
import { formatDateForDisplay } from '../../../utils/dateUtils';
import { isBoostingServiceName, normalizeBoostingLineItem } from '../../../utils/boostingServiceUtils';

interface InvoicePDFTemplateProps {
  invoice: Invoice;
  companyProfile: CompanyProfileSetting | null;
  client: Client | null;
  business: Business | null;
  withLetterhead: boolean;
}

const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({ invoice, companyProfile, client, business, withLetterhead }) => {
  const formatDate = (dateString?: string) => formatDateForDisplay(dateString);
  const safeNumber = (value?: number | null, fallback = 0) => (
    Number.isFinite(value) ? (value as number) : fallback
  );
  const getLineDisplay = (item: Invoice['items'][number]) =>
    normalizeBoostingLineItem(item, { grandTotalMMK: item.total });
  
  // --- STYLES --- (Matched to Marketing Capsule letterhead cyan-blue branding)
  const primaryColor = '#0099CC';
  const darkCyan = '#007A9E';
  const lightCyanBg = '#E6F7FB';
  const accentColor = '#0099CC';
  const dangerColor = '#ef4444';
  const textColor = '#1a1a1a';
  const secondaryTextColor = '#5a5a5a';
  const borderColor = '#d1d5db';
  const lightGrayBg = '#f8fafc';

  // Page configuration
  const ITEMS_PER_FIRST_PAGE = 5;
  const ITEMS_PER_CONTINUATION_PAGE = 8;
  
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = safeNumber(invoice.subtotal);
  const discount = safeNumber(invoice.discount);
  const tax = safeNumber(invoice.tax);
  const grandTotal = safeNumber(invoice.grandTotal);
  const amountPaid = safeNumber(invoice.amountPaid);
  const isPaid = invoice.status === InvoiceStatus.PAID || (grandTotal > 0 && amountPaid >= grandTotal);
  const amountDue = grandTotal - amountPaid;
  const otherFeesAmount = safeNumber(invoice.otherFeesAmountMMK);
  const hasBreakdown = (discount > 0) || (otherFeesAmount > 0) || (tax > 0);

  // Split items into pages
  const firstPageItems = items.slice(0, ITEMS_PER_FIRST_PAGE);
  const remainingItems = items.slice(ITEMS_PER_FIRST_PAGE);
  const continuationPages: typeof items[] = [];
  
  for (let i = 0; i < remainingItems.length; i += ITEMS_PER_CONTINUATION_PAGE) {
    continuationPages.push(remainingItems.slice(i, i + ITEMS_PER_CONTINUATION_PAGE));
  }

  const totalPages = 1 + continuationPages.length;
  const showSummaryOnFirstPage = items.length <= ITEMS_PER_FIRST_PAGE;

  const paidStampSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
      <rect x="5" y="5" width="190" height="90" rx="10" ry="10" fill="none" stroke="rgba(16,185,129,0.7)" stroke-width="5"/>
      <rect x="10" y="10" width="180" height="80" rx="8" ry="8" fill="rgba(16,185,129,0.08)"/>
      <text x="100" y="65" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="rgba(16,185,129,0.8)">PAID</text>
    </svg>
  `);
  const paidStampSrc = `data:image/svg+xml;utf8,${paidStampSvg}`;

  // Common page style
  const getPageStyle = (isFirstPage: boolean): React.CSSProperties => ({
    fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
    color: textColor,
    backgroundColor: '#fff',
    width: '210mm',
    height: '297mm',
    padding: withLetterhead ? '55mm 20mm 32mm 25mm' : '18mm',
    boxSizing: 'border-box',
    boxShadow: '0 0 15px rgba(0,0,0,0.1)',
    margin: '0 auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    pageBreakAfter: 'always',
    overflow: 'hidden',
  });

  // Letterhead background component
  const LetterheadBg = () => withLetterhead && companyProfile?.letterheadImageUrl ? (
    <img
      src={companyProfile.letterheadImageUrl}
      alt="Letterhead"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'top',
        zIndex: 0,
      }}
    />
  ) : null;

  // Table header component
  const TableHeader = () => (
    <thead>
      <tr style={{ backgroundColor: darkCyan }}>
        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'white', fontSize: '9pt', width: '8%' }}>#</th>
        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'white', fontSize: '9pt', width: '47%' }}>Description</th>
        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'white', fontSize: '9pt', width: '12%' }}>Qty</th>
        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'white', fontSize: '9pt', width: '16%' }}>Unit Price</th>
        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'white', fontSize: '9pt', width: '17%' }}>Total</th>
      </tr>
    </thead>
  );

  // Table row component
  const TableRow = ({ item, index, globalIndex }: { item: typeof items[0], index: number, globalIndex: number }) => {
    const line = getLineDisplay(item);
    const showBudgetQty = line.isBudget || isBoostingServiceName(item.description);
    return (
    <tr style={{ backgroundColor: index % 2 === 0 ? '#fff' : lightGrayBg, borderBottom: `1px solid ${borderColor}` }}>
      <td style={{ padding: '10px 12px', fontSize: '9pt' }}>{globalIndex + 1}</td>
      <td style={{ padding: '10px 12px', fontSize: '9pt', fontWeight: 500 }}>{line.description}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9pt' }}>
        {showBudgetQty ? `${line.quantityUsd}$` : safeNumber(item.quantity)}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9pt' }}>{line.unitPriceMMK.toLocaleString()}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>{line.totalMMK.toLocaleString()}</td>
    </tr>
    );
  };

  // Summary section component
  const SummarySection = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'flex-start', marginTop: '16px' }}>
      {isPaid && (
        <img src={paidStampSrc} alt="Paid" style={{ width: '100px', height: '50px', objectFit: 'contain', alignSelf: 'center' }} />
      )}
      <div style={{ width: '55%', backgroundColor: lightGrayBg, padding: '14px', borderRadius: '6px', border: `1px solid ${borderColor}` }}>
        <div style={{ fontSize: '9pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
            <span style={{ color: secondaryTextColor }}>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>{subtotal.toLocaleString()} MMK</span>
          </div>
          {hasBreakdown && (
            <>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: secondaryTextColor }}>Discount:</span>
                  <span style={{ color: dangerColor, fontWeight: 600 }}>({discount.toLocaleString()}) MMK</span>
                </div>
              )}
              {otherFeesAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: secondaryTextColor }}>{invoice.otherFeesDescription || 'Other Fees'}:</span>
                  <span style={{ fontWeight: 600 }}>{otherFeesAmount.toLocaleString()} MMK</span>
                </div>
              )}
              {tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: secondaryTextColor }}>Tax:</span>
                  <span style={{ fontWeight: 600 }}>{tax.toLocaleString()} MMK</span>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '6px', borderTop: `2px solid ${borderColor}` }}>
            <span style={{ fontWeight: 700, fontSize: '10pt' }}>Total:</span>
            <span style={{ fontWeight: 700, fontSize: '10pt' }}>{grandTotal.toLocaleString()} MMK</span>
          </div>
          {amountPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: secondaryTextColor }}>Amount Paid:</span>
              <span style={{ color: accentColor, fontWeight: 600 }}>({amountPaid.toLocaleString()}) MMK</span>
            </div>
          )}
        </div>
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: '10px',
          backgroundColor: amountDue > 0 ? dangerColor : accentColor, color: 'white', borderRadius: '6px'
        }}>
          <span style={{ fontWeight: 700, fontSize: '11pt' }}>BALANCE DUE</span>
          <span style={{ fontWeight: 700, fontSize: '11pt' }}>{amountDue.toLocaleString()} MMK</span>
        </div>
      </div>
    </div>
  );

  // Footer component
  const PageFooter = ({ pageNum, total }: { pageNum: number, total: number }) => (
    <footer style={{ 
      marginTop: 'auto', paddingTop: '12px', fontSize: '8pt', textAlign: 'center',
      borderTop: `1px solid ${borderColor}`, position: 'relative', zIndex: 1
    }}>
      <p style={{ margin: '4px 0', color: secondaryTextColor }}>Thank You For Your Business!</p>
      {total > 1 && <p style={{ margin: '2px 0', color: secondaryTextColor, fontSize: '7pt' }}>Page {pageNum} of {total}</p>}
    </footer>
  );

  return (
    <>
      {/* First Page */}
      <div className="a4-page" style={getPageStyle(true)}>
        <LetterheadBg />
        <main style={{ flexGrow: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <header style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `2px solid ${primaryColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {companyProfile?.logoUrl && !withLetterhead && (
                  <img src={companyProfile.logoUrl} alt="Company Logo" style={{ maxHeight: '50px', marginBottom: '10px', display: 'block' }} crossOrigin="anonymous" />
                )}
                <h1 style={{ fontSize: '28pt', fontWeight: 800, color: darkCyan, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>INVOICE</h1>
                <p style={{ margin: '0', fontSize: '10pt', color: secondaryTextColor }}>
                  Invoice No: <span style={{ color: textColor, fontWeight: 600 }}>{invoice.id}</span>
                </p>
              </div>
              <div style={{ textAlign: 'right', backgroundColor: lightCyanBg, padding: '12px 16px', borderRadius: '6px', minWidth: '150px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '8pt', color: secondaryTextColor, textTransform: 'uppercase' }}>Issue Date</p>
                  <p style={{ margin: 0, fontSize: '10pt', fontWeight: 600, color: textColor }}>{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontSize: '8pt', color: secondaryTextColor, textTransform: 'uppercase' }}>Due Date</p>
                  <p style={{ margin: 0, fontSize: '10pt', fontWeight: 600, color: textColor }}>{formatDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Bill To */}
          <section style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: lightGrayBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
            <h3 style={{ fontSize: '9pt', fontWeight: 700, margin: '0 0 8px 0', color: darkCyan, textTransform: 'uppercase' }}>Bill To:</h3>
            <p style={{ fontWeight: 600, margin: '0 0 2px 0', color: textColor, fontSize: '11pt' }}>{client?.name || 'N/A'}</p>
            {business?.name && <p style={{ margin: '0', color: secondaryTextColor, fontSize: '9pt' }}>{business.name}</p>}
          </section>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px', borderRadius: '6px', overflow: 'hidden' }}>
            <TableHeader />
            <tbody>
              {firstPageItems.map((item, index) => (
                <TableRow key={item.id || `item-${index}`} item={item} index={index} globalIndex={index} />
              ))}
            </tbody>
          </table>

          {/* Summary on first page if all items fit */}
          {showSummaryOnFirstPage && <SummarySection />}

          {/* Notes on first page if fits */}
          {showSummaryOnFirstPage && invoice.notes && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: lightGrayBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
              <h4 style={{ fontWeight: 700, marginBottom: '6px', color: darkCyan, fontSize: '9pt', textTransform: 'uppercase' }}>Notes:</h4>
              <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.5', color: textColor }}>{invoice.notes}</p>
            </div>
          )}

          {/* Continuation notice */}
          {!showSummaryOnFirstPage && (
            <p style={{ textAlign: 'right', fontSize: '8pt', color: secondaryTextColor, fontStyle: 'italic', marginTop: 'auto' }}>
              Continued on next page...
            </p>
          )}
        </main>
        <PageFooter pageNum={1} total={totalPages} />
      </div>

      {/* Continuation Pages */}
      {continuationPages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === continuationPages.length - 1;
        const startIndex = ITEMS_PER_FIRST_PAGE + pageIndex * ITEMS_PER_CONTINUATION_PAGE;
        
        return (
          <div key={`page-${pageIndex + 2}`} className="a4-page" style={getPageStyle(false)}>
            <LetterheadBg />
            <main style={{ flexGrow: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Continuation header */}
              <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: `2px solid ${primaryColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '20pt', fontWeight: 700, color: darkCyan, margin: '0 0 4px 0' }}>INVOICE</h2>
                    <p style={{ margin: '0', fontSize: '9pt', color: secondaryTextColor }}>
                      Invoice No: <span style={{ fontWeight: 600, color: textColor }}>{invoice.id}</span> (Continued)
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0', fontSize: '9pt', color: secondaryTextColor }}>
                      Client: <span style={{ fontWeight: 600, color: textColor }}>{client?.name || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '16px', borderRadius: '6px', overflow: 'hidden' }}>
                <TableHeader />
                <tbody>
                  {pageItems.map((item, index) => (
                    <TableRow key={item.id || `item-${startIndex + index}`} item={item} index={index} globalIndex={startIndex + index} />
                  ))}
                </tbody>
              </table>

              {/* Summary on last page */}
              {isLastPage && <SummarySection />}

              {/* Notes on last page */}
              {isLastPage && invoice.notes && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: lightGrayBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '6px', color: darkCyan, fontSize: '9pt', textTransform: 'uppercase' }}>Notes:</h4>
                  <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.5', color: textColor }}>{invoice.notes}</p>
                </div>
              )}

              {/* Continuation notice if not last page */}
              {!isLastPage && (
                <p style={{ textAlign: 'right', fontSize: '8pt', color: secondaryTextColor, fontStyle: 'italic', marginTop: 'auto' }}>
                  Continued on next page...
                </p>
              )}
            </main>
            <PageFooter pageNum={pageIndex + 2} total={totalPages} />
          </div>
        );
      })}
    </>
  );
};

export default InvoicePDFTemplate;
