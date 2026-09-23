
import React from 'react';
import { Payment, CompanyProfileSetting, Client, Invoice, PaymentStatus } from '../../../types';
import { formatDateForDisplay } from '../../../utils/dateUtils';

interface PaymentConfirmationPDFTemplateProps {
  payment: Payment;
  companyProfile: CompanyProfileSetting | null;
  client?: Client | null; // Optional: Client details for the receipt
  invoice?: Invoice | null; // Optional: Related invoice details
}

const PaymentConfirmationPDFTemplate: React.FC<PaymentConfirmationPDFTemplateProps> = ({ payment, companyProfile, client, invoice }) => {
  const formatDate = (dateString: string) => formatDateForDisplay(dateString);
  const letterheadStyle: React.CSSProperties = companyProfile?.letterheadImageUrl
    ? {
        backgroundImage: `url(${companyProfile.letterheadImageUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: '100% auto',
        paddingTop: '150px', 
      }
    : {};

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px', ...letterheadStyle }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        {!companyProfile?.letterheadImageUrl && companyProfile && (
            <>
            {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Company Logo" style={{ maxHeight: '80px', marginBottom: '10px' }} />}
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{companyProfile.companyName}</h1>
            <p style={{ fontSize: '12px', margin: '2px 0' }}>{companyProfile.address}</p>
            <p style={{ fontSize: '12px', margin: '2px 0' }}>{companyProfile.phone} | {companyProfile.email}</p>
            </>
        )}
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginTop: '20px', marginBottom: '10px' }}>PAYMENT RECEIPT</h2>
      </div>

      <table style={{ width: '100%', marginBottom: '20px', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', verticalAlign: 'top' }}>
              <strong style={{ display: 'block', marginBottom: '5px' }}>RECEIVED FROM:</strong>
              {client ? client.name : payment.clientId}
              {client?.phone && <><br />{client.phone}</>}
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right' }}>
              <strong style={{ display: 'block' }}>Receipt No:</strong> {payment.receiptNumber || payment.id}
              <br />
              <strong style={{ display: 'block', marginTop: '5px' }}>Payment Date:</strong> {formatDate(payment.paymentDate)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '20px', fontSize: '14px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <p style={{ margin: '5px 0' }}>
            <span style={{ fontWeight: 'bold', minWidth: '150px', display: 'inline-block' }}>Amount Received:</span> 
            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#2563EB' }}>{payment.amountMMK.toLocaleString()} MMK</span>
        </p>
        <p style={{ margin: '5px 0' }}>
            <span style={{ fontWeight: 'bold', minWidth: '150px', display: 'inline-block' }}>Payment Method:</span> 
            {payment.method}
        </p>
        {payment.transactionLast4Digits && (
             <p style={{ margin: '5px 0' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px', display: 'inline-block' }}>Transaction Details:</span> 
                Last 4 Digits - {payment.transactionLast4Digits}
            </p>
        )}
        <p style={{ margin: '5px 0' }}>
            <span style={{ fontWeight: 'bold', minWidth: '150px', display: 'inline-block' }}>For Invoice/Sale:</span> 
            {payment.invoiceId ? (
              `Invoice #${payment.invoiceId}`
            ) : payment.saleAllocations && payment.saleAllocations.length > 0 ? (
              `Sales: ${payment.saleAllocations.map(a => a.saleRecordId).join(', ')}`
            ) : payment.saleRecordId ? (
              `Sale Record #${payment.saleRecordId}`
            ) : (
              <span>
                General Payment
                {payment.status === PaymentStatus.APPROVED && (
                  <span style={{ fontSize: '11px', color: '#2563EB', marginLeft: '5px' }}>
                    (Auto-allocated to sales)
                  </span>
                )}
              </span>
            )}
        </p>
        {payment.remark && (
            <p style={{ margin: '5px 0' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px', display: 'inline-block' }}>Remark:</span> 
                {payment.remark}
            </p>
        )}
      </div>
      
      {invoice && (
        <div style={{ fontSize: '12px', marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Related Invoice Details:</h4>
            <p>Invoice Total: {invoice.grandTotal.toLocaleString()} MMK</p>
            <p>Amount Paid on this Invoice: {invoice.amountPaid.toLocaleString()} MMK</p>
            <p>Balance Due: {(invoice.grandTotal - invoice.amountPaid).toLocaleString()} MMK</p>
            <p>Invoice Status: {invoice.status}</p>
        </div>
      )}


      <div style={{ marginTop: '50px', fontSize: '12px', textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '20px' }}>
        <p>Thank you for your payment!</p>
        {companyProfile && <p><strong>{companyProfile.companyName}</strong></p>}
      </div>
    </div>
  );
};

export default PaymentConfirmationPDFTemplate;
