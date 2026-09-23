import React from 'react';
import { Quotation, CompanyProfileSetting, Client, Business } from '../../../types';
import { formatDateForDisplay } from '../../../utils/dateUtils';

interface QuotationPDFTemplateProps {
  quotation: Quotation;
  companyProfile: CompanyProfileSetting | null;
  client: Client | null;
  business: Business | null;
  withLetterhead: boolean;
}

const QuotationPDFTemplate: React.FC<QuotationPDFTemplateProps> = ({ quotation, companyProfile, client, business, withLetterhead }) => {
  const formatDate = (dateString: string) => formatDateForDisplay(dateString);

  // --- STYLES --- (Matched to Marketing Capsule letterhead cyan-blue branding)
  const primaryColor = '#0099CC';
  const darkCyan = '#007A9E';
  const lightCyanBg = '#E6F7FB';
  const dangerColor = '#ef4444';
  const textColor = '#1a1a1a';
  const secondaryTextColor = '#5a5a5a';
  const borderColor = '#d1d5db';
  const lightGrayBg = '#f8fafc';

  // Page configuration
  const ITEMS_PER_FIRST_PAGE = 5;
  const ITEMS_PER_CONTINUATION_PAGE = 8;
  
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const hasBreakdown = (quotation.manualDiscountMMK && quotation.manualDiscountMMK > 0) ||
                       (quotation.otherFeesAmountMMK && quotation.otherFeesAmountMMK > 0) ||
                       (quotation.taxAmountMMK && quotation.taxAmountMMK > 0);

  // Split items into pages
  const firstPageItems = items.slice(0, ITEMS_PER_FIRST_PAGE);
  const remainingItems = items.slice(ITEMS_PER_FIRST_PAGE);
  const continuationPages: typeof items[] = [];
  
  for (let i = 0; i < remainingItems.length; i += ITEMS_PER_CONTINUATION_PAGE) {
    continuationPages.push(remainingItems.slice(i, i + ITEMS_PER_CONTINUATION_PAGE));
  }

  const totalPages = 1 + continuationPages.length;
  const showSummaryOnFirstPage = items.length <= ITEMS_PER_FIRST_PAGE;

  // Common page style
  const getPageStyle = (): React.CSSProperties => ({
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
  const TableRow = ({ item, index, globalIndex }: { item: typeof items[0], index: number, globalIndex: number }) => (
    <tr style={{ backgroundColor: index % 2 === 0 ? '#fff' : lightGrayBg, borderBottom: `1px solid ${borderColor}` }}>
      <td style={{ padding: '10px 12px', fontSize: '9pt' }}>{globalIndex + 1}</td>
      <td style={{ padding: '10px 12px', fontSize: '9pt', fontWeight: 500 }}>{item.description}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9pt' }}>{item.quantity}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9pt' }}>{item.unitPrice.toLocaleString()}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>{item.total.toLocaleString()}</td>
    </tr>
  );

  // Summary section component
  const SummarySection = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
      <div style={{ width: '55%', backgroundColor: lightGrayBg, padding: '14px', borderRadius: '6px', border: `1px solid ${borderColor}` }}>
        <div style={{ fontSize: '9pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
            <span style={{ color: secondaryTextColor }}>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>{quotation.subtotal.toLocaleString()} MMK</span>
          </div>
          {hasBreakdown && (
            <>
              {quotation.manualDiscountMMK && quotation.manualDiscountMMK > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: secondaryTextColor }}>
                    Discount {quotation.manualDiscountDescription ? `(${quotation.manualDiscountDescription})` : ''}:
                  </span>
                  <span style={{ color: dangerColor, fontWeight: 600 }}>({quotation.manualDiscountMMK.toLocaleString()}) MMK</span>
                </div>
              )}
              {quotation.otherFeesAmountMMK && quotation.otherFeesAmountMMK > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: secondaryTextColor }}>{quotation.otherFeesDescription || 'Other Fees'}:</span>
                  <span style={{ fontWeight: 600 }}>{quotation.otherFeesAmountMMK.toLocaleString()} MMK</span>
                </div>
              )}
              {quotation.taxAmountMMK && quotation.taxAmountMMK > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ color: secondaryTextColor }}>Tax ({quotation.taxPercentage || 0}%):</span>
                  <span style={{ fontWeight: 600 }}>{quotation.taxAmountMMK.toLocaleString()} MMK</span>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '6px', borderTop: `2px solid ${borderColor}` }}>
            <span style={{ fontWeight: 700, fontSize: '10pt' }}>Grand Total:</span>
            <span style={{ fontWeight: 700, fontSize: '10pt' }}>{quotation.grandTotal.toLocaleString()} MMK</span>
          </div>
        </div>
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: '10px',
          backgroundColor: darkCyan, color: 'white', borderRadius: '6px'
        }}>
          <span style={{ fontWeight: 700, fontSize: '11pt' }}>GRAND TOTAL</span>
          <span style={{ fontWeight: 700, fontSize: '11pt' }}>{quotation.grandTotal.toLocaleString()} MMK</span>
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
      <p style={{ margin: '4px 0', color: secondaryTextColor }}>Thank You For Choosing Our Services!</p>
      {total > 1 && <p style={{ margin: '2px 0', color: secondaryTextColor, fontSize: '7pt' }}>Page {pageNum} of {total}</p>}
    </footer>
  );

  return (
    <>
      {/* First Page */}
      <div className="a4-page" style={getPageStyle()}>
        <LetterheadBg />
        <main style={{ flexGrow: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <header style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `2px solid ${primaryColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {companyProfile?.logoUrl && !withLetterhead && (
                  <img src={companyProfile.logoUrl} alt="Company Logo" style={{ maxHeight: '50px', marginBottom: '10px', display: 'block' }} crossOrigin="anonymous" />
                )}
                <h1 style={{ fontSize: '28pt', fontWeight: 800, color: darkCyan, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>QUOTATION</h1>
                <p style={{ margin: '0', fontSize: '10pt', color: secondaryTextColor }}>
                  Quotation No: <span style={{ color: textColor, fontWeight: 600 }}>{quotation.id}</span>
                </p>
              </div>
              <div style={{ textAlign: 'right', backgroundColor: lightCyanBg, padding: '12px 16px', borderRadius: '6px', minWidth: '150px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '8pt', color: secondaryTextColor, textTransform: 'uppercase' }}>Issue Date</p>
                  <p style={{ margin: 0, fontSize: '10pt', fontWeight: 600, color: textColor }}>{formatDate(quotation.issueDate)}</p>
                </div>
                {quotation.expiryDate && (
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontSize: '8pt', color: secondaryTextColor, textTransform: 'uppercase' }}>Valid Until</p>
                    <p style={{ margin: 0, fontSize: '10pt', fontWeight: 600, color: textColor }}>{formatDate(quotation.expiryDate)}</p>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Quotation For */}
          <section style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: lightGrayBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
            <h3 style={{ fontSize: '9pt', fontWeight: 700, margin: '0 0 8px 0', color: darkCyan, textTransform: 'uppercase' }}>Quotation For:</h3>
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

          {/* Terms & Conditions on first page if fits */}
          {showSummaryOnFirstPage && quotation.termsAndConditions && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: lightCyanBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
              <h4 style={{ fontWeight: 700, marginBottom: '6px', color: darkCyan, fontSize: '9pt', textTransform: 'uppercase' }}>Terms & Conditions:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: textColor, margin: 0, fontSize: '8pt', lineHeight: '1.5' }}>
                {quotation.termsAndConditions}
              </pre>
            </div>
          )}

          {/* Notes on first page if fits */}
          {showSummaryOnFirstPage && quotation.notes && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: lightGrayBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
              <h4 style={{ fontWeight: 700, marginBottom: '6px', color: darkCyan, fontSize: '9pt', textTransform: 'uppercase' }}>Notes:</h4>
              <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.5', color: textColor }}>{quotation.notes}</p>
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
          <div key={`page-${pageIndex + 2}`} className="a4-page" style={getPageStyle()}>
            <LetterheadBg />
            <main style={{ flexGrow: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Continuation header */}
              <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: `2px solid ${primaryColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '20pt', fontWeight: 700, color: darkCyan, margin: '0 0 4px 0' }}>QUOTATION</h2>
                    <p style={{ margin: '0', fontSize: '9pt', color: secondaryTextColor }}>
                      Quotation No: <span style={{ fontWeight: 600, color: textColor }}>{quotation.id}</span> (Continued)
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

              {/* Terms & Conditions on last page */}
              {isLastPage && quotation.termsAndConditions && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: lightCyanBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '6px', color: darkCyan, fontSize: '9pt', textTransform: 'uppercase' }}>Terms & Conditions:</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: textColor, margin: 0, fontSize: '8pt', lineHeight: '1.5' }}>
                    {quotation.termsAndConditions}
                  </pre>
                </div>
              )}

              {/* Notes on last page */}
              {isLastPage && quotation.notes && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: lightGrayBg, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '6px', color: darkCyan, fontSize: '9pt', textTransform: 'uppercase' }}>Notes:</h4>
                  <p style={{ margin: 0, fontSize: '8pt', lineHeight: '1.5', color: textColor }}>{quotation.notes}</p>
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

export default QuotationPDFTemplate;
