import React from 'react';
import { POSOrder, CompanyProfileSetting } from '../../types';

interface POSOrderPDFTemplateProps {
  order: POSOrder;
  companyProfile?: CompanyProfileSetting | null;
  withLetterhead?: boolean;
}

const POSOrderPDFTemplate: React.FC<POSOrderPDFTemplateProps> = ({ order, companyProfile, withLetterhead = true }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');
  
  const pageStyle: React.CSSProperties = {
    fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
    color: '#1F2937',
    backgroundColor: '#fff',
    width: '148mm', // A5 width
    minHeight: '210mm', // A5 height
    padding: withLetterhead && companyProfile?.posLetterheadImageUrl ? '1.5in 0.75in 0.75in 0.75in' : '0.75in',
    boxSizing: 'border-box',
    boxShadow: '0 0 10px rgba(0,0,0,0.15)',
    margin: '0 auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div className="a4-page" style={pageStyle}>
      {withLetterhead && companyProfile?.posLetterheadImageUrl && (
        <img
          src={companyProfile.posLetterheadImageUrl}
          alt="POS Letterhead"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'auto',
            zIndex: 0,
          }}
        />
      )}
      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #E5E7EB', paddingBottom: '15px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#111827' }}>POS ORDER</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '2px 0' }}>Order #{order.orderNumber}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {companyProfile && !companyProfile.posLetterheadImageUrl && (
              <>
                {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" style={{ maxHeight: '60px', marginBottom: '8px' }} />}
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 3px 0' }}>{companyProfile.companyName}</h2>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: '1px 0' }}>{companyProfile.address}</p>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: '1px 0' }}>{companyProfile.phone} | {companyProfile.email}</p>
              </>
            )}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>Customer Information</h3>
            <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Name:</strong> {order.customerName}</p>
            {order.customerId && <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Customer ID:</strong> {order.customerId}</p>}
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>Order Details</h3>
            <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Date:</strong> {formatDate(order.createdAt)}</p>
            <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Sales Type:</strong> {order.salesType}</p>
            <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Status:</strong> {order.status}</p>
            {order.isPrinted && order.printedAt && (
              <p style={{ fontSize: '12px', margin: '3px 0', color: '#059669' }}><strong>Printed:</strong> {formatDate(order.printedAt)}</p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#111827' }}>Order Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Product</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>SKU</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Qty</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Unit Price</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '10px', color: '#111827' }}>
                    {item.productName}
                    {item.variantName && <div style={{ fontSize: '11px', color: '#6B7280' }}>{item.variantName}</div>}
                  </td>
                  <td style={{ padding: '10px', color: '#6B7280' }}>{item.productSku}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#111827' }}>{item.quantity}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#111827' }}>{item.unitPriceMMK.toLocaleString()} MMK</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#111827' }}>{item.subtotalMMK.toLocaleString()} MMK</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '2px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#6B7280' }}>Subtotal:</span>
                <span style={{ fontWeight: '600', color: '#111827' }}>{order.subtotalMMK.toLocaleString()} MMK</span>
              </div>
              {order.discountMMK && order.discountMMK > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#DC2626' }}>
                  <span>Discount {order.discountDescription && `(${order.discountDescription})`}:</span>
                  <span>-{order.discountMMK.toLocaleString()} MMK</span>
                </div>
              )}
              {order.taxAmountMMK && order.taxAmountMMK > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span>Tax {order.taxPercentage && `(${order.taxPercentage}%)`}:</span>
                  <span>{order.taxAmountMMK.toLocaleString()} MMK</span>
                </div>
              )}
              {order.shippingCostMMK && order.shippingCostMMK > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span>Shipping:</span>
                  <span>{order.shippingCostMMK.toLocaleString()} MMK</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #111827', fontSize: '18px', fontWeight: 'bold' }}>
                <span>Grand Total:</span>
                <span>{order.grandTotalMMK.toLocaleString()} MMK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px' }}>
                <span style={{ color: '#6B7280' }}>Amount Paid:</span>
                <span style={{ fontWeight: '600', color: order.amountPaidMMK >= order.grandTotalMMK ? '#059669' : '#DC2626' }}>
                  {order.amountPaidMMK.toLocaleString()} MMK
                </span>
              </div>
              {(order.grandTotalMMK - order.amountPaidMMK) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '13px', color: '#DC2626' }}>
                  <span>Balance:</span>
                  <span style={{ fontWeight: '600' }}>{(order.grandTotalMMK - order.amountPaidMMK).toLocaleString()} MMK</span>
                </div>
              )}
              {order.paymentMethod && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#6B7280' }}>
                  <strong>Payment Method:</strong> {order.paymentMethod}
                </div>
              )}
            </div>
          </div>
        </div>

        {order.deliveryTracking && (
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>Delivery Information</h3>
            <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Status:</strong> {order.deliveryTracking.status}</p>
            {order.deliveryTracking.trackingNumber && (
              <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Tracking Number:</strong> {order.deliveryTracking.trackingNumber}</p>
            )}
            {order.deliveryTracking.carrier && (
              <p style={{ fontSize: '12px', margin: '3px 0', color: '#4B5563' }}><strong>Carrier:</strong> {order.deliveryTracking.carrier}</p>
            )}
            {order.deliveryTracking.deliveryAddress && (
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#4B5563' }}>
                <strong>Delivery Address:</strong><br />
                {order.deliveryTracking.deliveryAddress.street}<br />
                {order.deliveryTracking.deliveryAddress.city}
                {order.deliveryTracking.deliveryAddress.state && `, ${order.deliveryTracking.deliveryAddress.state}`}
                {order.deliveryTracking.deliveryAddress.zipCode && ` ${order.deliveryTracking.deliveryAddress.zipCode}`}<br />
                {order.deliveryTracking.deliveryAddress.country}
                {order.deliveryTracking.deliveryAddress.contactName && (
                  <>
                    <br />Contact: {order.deliveryTracking.deliveryAddress.contactName}
                    {order.deliveryTracking.deliveryAddress.contactPhone && ` - ${order.deliveryTracking.deliveryAddress.contactPhone}`}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {order.notes && (
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Notes</h3>
            <p style={{ fontSize: '12px', color: '#4B5563', whiteSpace: 'pre-wrap' }}>{order.notes}</p>
          </div>
        )}

        <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #E5E7EB', fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>
          <p>Thank you for your order!</p>
          {companyProfile && companyProfile.paymentInstructions && (
            <p style={{ marginTop: '10px', fontSize: '10px' }}>{companyProfile.paymentInstructions}</p>
          )}
        </footer>
      </main>
    </div>
  );
};

export default POSOrderPDFTemplate;















