# Finance Module - Complete Connection Map

## 🔗 How Everything Connects Together

This document shows how all finance entities (Clients, Businesses, Sales, Invoices, Quotations, Payments) are connected and how they update each other.

---

## 📊 Entity Relationships

```
CLIENT/BUSINESS
    │
    ├───► SALES (SaleRecord)
    │       │
    │       ├───► Can create INVOICE (via saleRecordId)
    │       │
    │       └───► Can receive PAYMENTS (via saleRecordId)
    │
    ├───► QUOTATIONS
    │       │
    │       └───► Can convert to INVOICE (via quotationId)
    │
    ├───► INVOICES
    │       │
    │       ├───► Can link to SALE (via saleRecordId)
    │       │
    │       ├───► Can link to QUOTATION (via quotationId)
    │       │
    │       └───► Can receive PAYMENTS (via invoiceId)
    │
    └───► PAYMENTS
            │
            ├───► Can link to INVOICE (via invoiceId)
            │
            └───► Can link to SALE (via saleRecordId)
```

---

## 🔄 Complete Flow Connections

### Flow 1: Sale → Invoice → Payment

```
1. CREATE SALE
   ├── Links to: Client (clientId), Business (businessId)
   ├── Updates: Client.balance += sale.grandTotalMMK
   └── Updates: Business.balance += sale.grandTotalMMK (if businessId exists)

2. CREATE INVOICE FROM SALE
   ├── Links to: Sale (saleRecordId), Client (clientId), Business (businessId)
   ├── Copies: All sale details to invoice
   └── Note: Does NOT update balance (sale already did)

3. RECORD PAYMENT FOR INVOICE
   ├── Links to: Invoice (invoiceId), Client (clientId), Business (businessId)
   ├── Updates: Client.balance -= payment.amountMMK
   ├── Updates: Business.balance -= payment.amountMMK
   ├── Updates: Invoice.amountPaid += payment.amountMMK
   └── Updates: Invoice.status (PAID/PARTIALLY_PAID based on amountPaid)

4. FINAL STATE
   ├── Client Balance = Opening + Total Billed - Total Paid
   ├── Invoice Status = PAID (if amountPaid >= grandTotal)
   └── Sale.amountPaid = Sum of all payments for this sale
```

---

### Flow 2: Quotation → Invoice → Payment

```
1. CREATE QUOTATION
   ├── Links to: Client (clientId), Business (businessId)
   └── Status: DRAFT, SENT, ACCEPTED, REJECTED

2. CONVERT QUOTATION TO INVOICE
   ├── Links to: Quotation (quotationId), Client (clientId), Business (businessId)
   ├── Copies: All quotation items to invoice
   ├── Updates: Quotation.status = CONVERTED_TO_INVOICE
   ├── Updates: Client.balance += invoice.grandTotal
   └── Updates: Business.balance += invoice.grandTotal

3. RECORD PAYMENT FOR INVOICE
   └── (Same as Flow 1, Step 3)
```

---

### Flow 3: Direct Invoice → Payment

```
1. CREATE INVOICE (Manual, not from sale/quotation)
   ├── Links to: Client (clientId), Business (businessId)
   ├── Updates: Client.balance += invoice.grandTotal
   └── Updates: Business.balance += invoice.grandTotal

2. RECORD PAYMENT FOR INVOICE
   └── (Same as Flow 1, Step 3)
```

---

### Flow 4: Direct Sale → Payment (No Invoice)

```
1. CREATE SALE
   └── (Same as Flow 1, Step 1)

2. RECORD PAYMENT FOR SALE (Direct)
   ├── Links to: Sale (saleRecordId), Client (clientId), Business (businessId)
   ├── Updates: Client.balance -= payment.amountMMK
   ├── Updates: Business.balance -= payment.amountMMK
   └── Updates: Sale.amountPaid += payment.amountMMK
```

---

## 🔢 Balance Update Rules

### When Client/Business Balance INCREASES (+):

1. **Sale Created**
   - Balance += sale.grandTotalMMK

2. **Invoice Created** (NOT from sale)
   - Balance += invoice.grandTotal

3. **Invoice Updated** (amount increased, NOT from sale)
   - Balance += (newGrandTotal - oldGrandTotal)

4. **Invoice Un-Cancelled** (NOT from sale)
   - Balance += (grandTotal - amountPaid)

5. **Payment Deleted**
   - Balance += payment.amountMMK (reverses the payment)

### When Client/Business Balance DECREASES (-):

1. **Payment Recorded**
   - Balance -= payment.amountMMK

2. **Invoice Updated** (amount decreased, NOT from sale)
   - Balance -= (oldGrandTotal - newGrandTotal)

3. **Invoice Cancelled** (NOT from sale)
   - Balance -= (grandTotal - amountPaid)

4. **Sale Updated** (amount decreased)
   - Balance -= (oldGrandTotal - newGrandTotal)

5. **Sale Deleted**
   - Balance -= sale.grandTotalMMK

### Special Rules:

- **Invoices from Sales**: Do NOT update balance (sale already did)
- **Cancelled Invoices**: Do NOT count in Total Billed calculation
- **Opening Balance**: Added once at client/business creation

---

## 🔗 Link Fields Explained

### SaleRecord Connections:
```typescript
{
  clientId: string;        // Required - Links to Client
  businessId?: string;     // Optional - Links to Business
  // When invoice created from sale:
  // Invoice.saleRecordId = Sale.id
}
```

### Invoice Connections:
```typescript
{
  clientId: string;        // Required - Links to Client
  businessId: string;      // Required - Links to Business
  saleRecordId?: string;  // Optional - Links to Sale (if created from sale)
  quotationId?: string;   // Optional - Links to Quotation (if created from quote)
  // When payment recorded:
  // Payment.invoiceId = Invoice.id
}
```

### Payment Connections:
```typescript
{
  clientId: string;        // Required - Links to Client
  businessId?: string;     // Optional - Links to Business (auto-filled from invoice/sale)
  invoiceId?: string;      // Optional - Links to Invoice (if paying invoice)
  saleRecordId?: string;   // Optional - Links to Sale (if paying sale directly)
}
```

### Quotation Connections:
```typescript
{
  clientId: string;        // Required - Links to Client
  businessId: string;      // Required - Links to Business
  // When converted to invoice:
  // Invoice.quotationId = Quotation.id
  // Quotation.status = CONVERTED_TO_INVOICE
}
```

---

## ✅ Connection Verification Checklist

### Sale → Invoice Connection:
- [x] Sale can create invoice (apiCreateInvoiceFromSale)
- [x] Invoice stores saleRecordId
- [x] Prevents duplicate invoices from same sale
- [x] Balance not double-counted (sale updates balance, invoice doesn't)

### Quotation → Invoice Connection:
- [x] Quotation can convert to invoice (apiCreateInvoiceFromQuotation)
- [x] Invoice stores quotationId
- [x] Quotation status updates to CONVERTED_TO_INVOICE
- [x] Balance updates correctly

### Payment → Invoice Connection:
- [x] Payment can link to invoice (invoiceId)
- [x] Payment updates invoice.amountPaid
- [x] Payment updates invoice.status (PAID/PARTIALLY_PAID)
- [x] Payment updates client/business balance

### Payment → Sale Connection:
- [x] Payment can link to sale (saleRecordId)
- [x] Payment updates sale.amountPaid
- [x] Payment updates client/business balance

### Client/Business Balance Updates:
- [x] Sale creation updates balance
- [x] Invoice creation updates balance (if not from sale)
- [x] Payment recording updates balance
- [x] Payment deletion reverses balance
- [x] Invoice deletion reverses balance
- [x] Sale deletion reverses balance

### Data Integrity:
- [x] Cannot delete sale with payments
- [x] Cannot delete sale with invoice
- [x] Cannot delete quotation that's converted
- [x] BusinessId auto-filled from invoice/sale when recording payment
- [x] All updates use transactions (atomic operations)

---

## 🎯 Real-World Connection Example

**Scenario:** Complete transaction flow

```
Day 1: Create Sale
├── Sale #001 created for Client A
├── Amount: 500,000 MMK
├── Client A balance: 0 → 500,000 MMK
└── Links: clientId = "CLIENT-001", businessId = "BIZ-001"

Day 2: Create Invoice from Sale
├── Invoice #001 created from Sale #001
├── Invoice.saleRecordId = "SALE-001"
├── Invoice.clientId = "CLIENT-001"
├── Invoice.businessId = "BIZ-001"
├── Client A balance: 500,000 MMK (unchanged - sale already updated)
└── Links: Invoice → Sale, Invoice → Client, Invoice → Business

Day 3: Record Payment
├── Payment #001 recorded for Invoice #001
├── Amount: 500,000 MMK
├── Payment.invoiceId = "INV-001"
├── Payment.clientId = "CLIENT-001"
├── Payment.businessId = "BIZ-001"
├── Client A balance: 500,000 → 0 MMK
├── Invoice.amountPaid: 0 → 500,000 MMK
├── Invoice.status: SENT → PAID
└── Links: Payment → Invoice, Payment → Client, Payment → Business

Final State:
├── Client A balance: 0 MMK ✅
├── Invoice #001: PAID ✅
├── Sale #001: amountPaid = 500,000 MMK ✅
└── All connections maintained ✅
```

---

## 🔍 How to Verify Connections

### Check Client Balance Calculation:
```javascript
// Formula used in ClientDetailPage
Outstanding Balance = 
  Opening Balance + 
  Total Billed (all sales + invoices NOT from sales) - 
  Total Paid (all payments)
```

### Check Invoice Status:
```javascript
// Auto-updated when payment recorded
if (invoice.amountPaid >= invoice.grandTotal) {
  status = PAID
} else if (invoice.amountPaid > 0) {
  status = PARTIALLY_PAID
} else {
  status = SENT or OVERDUE
}
```

### Check Sale-Invoice Link:
```javascript
// In ClientDetailPage - shows if invoice exists
const hasInvoice = allInvoices.some(i => i.saleRecordId === sale.id)
```

### Check Payment Links:
```javascript
// Payment can link to:
- invoiceId (if paying invoice)
- saleRecordId (if paying sale directly)
- Neither (general payment)
```

---

## ⚠️ Important Connection Rules

1. **One Sale = One Invoice Maximum**
   - Each sale can only create ONE invoice
   - System prevents duplicate invoices from same sale

2. **Balance Updates are Atomic**
   - All balance updates use Firestore transactions
   - Ensures data consistency (all or nothing)

3. **BusinessId Auto-Fill**
   - When recording payment for invoice/sale
   - BusinessId automatically filled from invoice/sale if not provided

4. **Deletion Protection**
   - Cannot delete sale with payments
   - Cannot delete sale with invoice
   - Cannot delete quotation that's converted
   - Prevents broken connections

5. **Status Updates**
   - Invoice status auto-updates based on payments
   - Quotation status updates when converted

---

## 🛠️ Connection Maintenance

All connections are maintained automatically by the system:

- **Creating records** → Links are established
- **Updating records** → Links are preserved
- **Deleting records** → Links are checked and protected
- **Recording payments** → All related records updated atomically

You don't need to manually maintain connections - the system does it for you!

---

This ensures that all your financial data stays connected and accurate, with every transaction properly linked and tracked.


