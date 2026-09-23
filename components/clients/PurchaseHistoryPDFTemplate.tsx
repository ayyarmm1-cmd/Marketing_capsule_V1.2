import React, { forwardRef } from 'react';
import { PurchaseHistoryItem, Client, Business, CompanyProfileSetting } from '../../types';
import { STATUS_COLORS } from '../../constants';

interface PurchaseHistoryPDFTemplateProps {
  data: PurchaseHistoryItem[];
  clientOrBusiness: Client | Business | null;
  companyProfile: CompanyProfileSetting | null;
  dateRange: { start: string; end: string };
  filters: { type: string; status: string };
}

const PurchaseHistoryPDFTemplate = forwardRef<HTMLDivElement, PurchaseHistoryPDFTemplateProps>(
  ({ data, clientOrBusiness, companyProfile, dateRange, filters }, ref) => {
    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-GB');
    };

    const totalAmount = data.reduce((sum, entry) => sum + entry.amount, 0);

    const pageStyle: React.CSSProperties = {
      fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
      color: '#1f2937',
      backgroundColor: '#fff',
      width: '210mm',
      minHeight: '297mm',
      padding: '1in',
      boxSizing: 'border-box',
    };

    return (
      <div ref={ref} style={pageStyle}>
        <header style={{ textAlign: 'center', borderBottom: '2px solid #3B82F6', paddingBottom: '15px', marginBottom: '30px' }}>
          {companyProfile?.logoUrl && (
            <img 
              src={companyProfile.logoUrl} 
              alt="Company Logo" 
              style={{ 
                maxHeight: '70px', 
                maxWidth: '200px',
                marginBottom: '15px',
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
                objectFit: 'contain'
              }}
              crossOrigin="anonymous"
            />
          )}
          <h1 style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>{companyProfile?.companyName || 'Company'}</h1>
          <h2 style={{ fontSize: '20px', margin: '5px 0', color: '#3B82F6' }}>Purchase History Report</h2>
        </header>

        <div style={{ marginBottom: '25px', fontSize: '12px' }}>
          <p><strong>Report For:</strong> {clientOrBusiness?.name || 'N/A'}</p>
          <p><strong>ID:</strong> {clientOrBusiness?.id || 'N/A'}</p>
          <p><strong>Date Range:</strong> {dateRange.start ? formatDate(dateRange.start) : 'All'} - {dateRange.end ? formatDate(dateRange.end) : 'All'}</p>
          {filters.type !== 'All' && <p><strong>Type Filter:</strong> {filters.type}</p>}
          {filters.status !== 'All' && <p><strong>Status Filter:</strong> {filters.status}</p>}
          <p><strong>Total Records:</strong> {data.length}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#eff6ff' }}>
              <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'left' }}>Type</th>
              <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'left' }}>Reference</th>
              <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'right' }}>Amount (MMK)</th>
              <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>
                  No records found
                </td>
              </tr>
            ) : (
              data.map((entry, index) => (
                <tr key={`${entry.type}-${entry.id}-${index}`}>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{formatDate(entry.date)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{entry.type}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{entry.service}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                    {entry.amount.toLocaleString()}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{entry.status}</td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'right' }}>
                  Total:
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'right' }}>
                  {totalAmount.toLocaleString()}
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '10px' }}></td>
              </tr>
            </tfoot>
          )}
        </table>

        <footer style={{ marginTop: '40px', paddingTop: '15px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '9px', color: '#6b7281' }}>
          <p>This report was generated by {companyProfile?.appName || 'ERP System'} on {new Date().toLocaleString('en-GB')}.</p>
        </footer>
      </div>
    );
  }
);

PurchaseHistoryPDFTemplate.displayName = 'PurchaseHistoryPDFTemplate';

export default PurchaseHistoryPDFTemplate;

