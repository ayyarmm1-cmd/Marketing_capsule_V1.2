# Invoice and Sales Record Balance Update Logic

## ✅ Current Implementation Status: CORRECT

The balance update logic is already correctly implemented to prevent double-counting. This document explains how it works.

---

## 🎯 Core Principle

**Each transaction should update the balance exactly ONCE, not twice.**

- When a **Sale Record** is created → Balance is updated ✅
- When an **Invoice** is created from that sale → Balance is **NOT** updated ✅ (sale already did it)

This prevents the same amount from being added to the balance twice.

---

## 📋 Balance Update Rules

### Rule 1: Sale Record Creation
**Always updates balance**

```typescript
// In apiAddSaleRecord()
transaction.update(clientRef, { 
  balance: firebase.firestore.FieldValue.increment(saleData.grandTotalMMK) 
});
```

**When:** Every time a sale record is created, regardless of how it's created.

---

### Rule 2: Invoice Creation
**Conditional balance update**

```typescript
// In apiAddDirectInvoice()
if (!data.saleRecordId && data.status !== InvoiceStatus.CANCELLED) {
  // Update balance ONLY if:
  // 1. Invoice does NOT have a saleRecordId (not linked to a sale)
  // 2. Invoice is NOT cancelled
  transaction.update(clientRef, { 
    balance: firebase.firestore.FieldValue.increment(data.grandTotal) 
  });
}
```

**When balance IS updated:**
- Invoice created without `saleRecordId` (rare edge case)
- Invoice is not cancelled

**When balance is NOT updated:**
- Invoice has `saleRecordId` (linked to a sale that already updated balance)
- Invoice is cancelled

---

## 🔄 Complete Flow Examples

### Flow 1: Manual Invoice from Invoices Page

```
Step 1: User clicks "Create Manual Invoice"
  ↓
Step 2: CreateEditInvoiceModal creates Sale Record first
  → apiAddSaleRecord() called
  → Client/Business balance += invoice amount ✅
  → Sale ID stored (e.g., "SALE-001")
  ↓
Step 3: Create Invoice with saleRecordId
  → apiAddDirectInvoice() called with saleRecordId = "SALE-001"
  → Balance check: saleRecordId exists → SKIP balance update ✅
  → Invoice created with link to sale

Result: Balance updated ONCE (by sale), not twice ✅
```

### Flow 2: Invoice from Existing Sale Record

```
Step 1: User clicks "Create Invoice from Sale" (on Sales page or Client/Business detail)
  ↓
Step 2: apiCreateInvoiceFromSale(saleId) called
  → Sale already exists (balance already updated when sale was created)
  → Invoice created with saleRecordId = saleId
  ↓
Step 3: apiAddDirectInvoice() called with saleRecordId
  → Balance check: saleRecordId exists → SKIP balance update ✅

Result: Balance was updated when sale was created, invoice doesn't update again ✅
```

### Flow 3: Invoice from Client/Business Detail Page

```
Step 1: User clicks "Create Invoice" from Client/Business detail page
  ↓
Step 2: CreateEditInvoiceModal opens (same modal as Invoices Page)
  → Follows Flow 1: Creates sale first, then invoice
  → Balance updated once by sale ✅

Result: Same as Flow 1 - balance updated once ✅
```

---

## 🔍 Code Verification

### 1. Manual Invoice Creation (CreateEditInvoiceModal.tsx)

```typescript
// Lines 325-360
if (!editingInvoice) {
  // Step 1: Create Sale Record (updates balance)
  const newSale = await apiAddSaleRecord(salePayload);
  linkedSaleId = newSale.id;
}

// Step 2: Create Invoice with saleRecordId (does NOT update balance)
if (linkedSaleId) {
  payload.saleRecordId = linkedSaleId;
}
await apiAddDirectInvoice(payload);
```

✅ **Correct:** Sale created first → Invoice created with saleRecordId → Balance updated once

---

### 2. Invoice from Sale (apiCreateInvoiceFromSale)

```typescript
// Lines 2195-2303
export const apiCreateInvoiceFromSale = async(saleId: string) => {
  const sale = await fetchDocumentById<SaleRecord>('sales', saleId);
  // ... validation ...
  
  const newInvoiceData = {
    // ... invoice data ...
    saleRecordId: sale.id // Links to existing sale
  };
  
  // apiAddDirectInvoice will see saleRecordId and skip balance update
  return apiAddDirectInvoice(newInvoiceData);
};
```

✅ **Correct:** Invoice created with saleRecordId → Balance NOT updated (sale already did it)

---

### 3. Direct Invoice Creation (apiAddDirectInvoice)

```typescript
// Lines 2100-2136
export const apiAddDirectInvoice = async (data) => {
  // ... validation ...
  
  await db.runTransaction(async (transaction) => {
    transaction.set(invoiceRef, dataToSave);
    
    // Only update balance if NO saleRecordId (sale already updated it)
    if (!data.saleRecordId && data.status !== InvoiceStatus.CANCELLED) {
      transaction.update(clientRef, { 
        balance: firebase.firestore.FieldValue.increment(data.grandTotal) 
      });
    }
  });
};
```

✅ **Correct:** Checks for saleRecordId before updating balance

---

## ✅ Verification Checklist

- [x] Manual invoice from Invoices Page → Creates sale first → Balance updated once
- [x] Invoice from Sales Record → Has saleRecordId → Balance NOT updated (sale already did)
- [x] Invoice from Client/Business detail → Uses same modal → Creates sale first → Balance updated once
- [x] All balance updates use Firestore transactions (atomic)
- [x] No double-counting possible

---

## 🎯 Summary

**The balance update logic is correct and prevents double-counting:**

1. **Sale Record** → Always updates balance when created
2. **Invoice with saleRecordId** → Does NOT update balance (sale already did)
3. **Invoice without saleRecordId** → Updates balance (rare edge case)

**All invoice creation paths follow this pattern:**
- Manual invoice → Creates sale first → Invoice has saleRecordId → Balance updated once ✅
- Invoice from sale → Invoice has saleRecordId → Balance NOT updated (sale already did) ✅
- Invoice from Client/Business detail → Same as manual invoice ✅

**No changes needed - the implementation is correct!** ✅

---

## 📝 Notes

- The `CreateEditInvoiceModal` component is used consistently across all invoice creation points
- All invoice creation goes through `apiAddDirectInvoice`, which has the balance check
- The `saleRecordId` field is the key indicator that prevents double-counting
- All operations use Firestore transactions for data consistency

---

**Last Updated:** Current implementation is correct and follows best practices for preventing double-counting in financial calculations.


