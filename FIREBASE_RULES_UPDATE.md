# Firebase Rules Update for Client/Business Detail Pages

## ✅ Summary

Updated Firestore and Storage rules to properly support the Client and Business detail pages, specifically for Sales Records and Documents tabs.

---

## 🔧 Firestore Rules Updates

### 1. Sales Records (`/sales/{saleId}`)

**Updated Rules:**
- **Get:** Now allows users with `VIEW_CLIENTS_BUSINESSES` permission to view sales records linked to clients/businesses
- **List:** Requires authentication AND one of:
  - `VIEW_ALL_SALES_RECORDS`
  - `VIEW_SALES_RECORDS`
  - `VIEW_CLIENTS_BUSINESSES`

**Why:** Allows Client/Business detail pages to query and display sales records for a specific client or business.

---

### 2. Invoices (`/invoices/{invoiceId}`)

**Updated Rules:**
- **Get:** Now allows users with `VIEW_CLIENTS_BUSINESSES` permission to view invoices linked to clients/businesses
- **List:** Requires authentication AND one of:
  - `MANAGE_INVOICES`
  - `VIEW_CLIENTS_BUSINESSES`

**Why:** Allows Client/Business detail pages to query and display invoices in the Documents tab.

---

### 3. Quotations (`/quotations/{quotationId}`)

**Updated Rules:**
- **Get:** Now allows users with `VIEW_CLIENTS_BUSINESSES` permission to view quotations linked to clients/businesses
- **List:** Requires authentication AND one of:
  - `MANAGE_QUOTATIONS`
  - `VIEW_CLIENTS_BUSINESSES`

**Why:** Allows Client/Business detail pages to query and display quotations in the Documents tab.

---

### 4. Payments (`/payments/{paymentId}`)

**Updated Rules:**
- **Get:** Now allows users with `VIEW_CLIENTS_BUSINESSES` permission to view payments linked to clients/businesses
- **List:** Requires authentication AND one of:
  - `MANAGE_PAYMENTS_RECEIPTS`
  - `VIEW_CLIENTS_BUSINESSES`

**Why:** Allows Client/Business detail pages to query and display payments in the Payments Received tab.

---

## 📦 Storage Rules (New File Created)

Created comprehensive Storage rules for file access related to clients, businesses, sales, invoices, quotations, and payments.

### Storage Paths:

1. **Company Files** (`/company/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (5MB limit)

2. **Client Documents** (`/clients/{clientId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

3. **Business Documents** (`/businesses/{businessId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

4. **Sales Records Documents** (`/sales/{saleId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

5. **Invoice Documents** (`/invoices/{invoiceId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

6. **Quotation Documents** (`/quotations/{quotationId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

7. **Payment Receipts** (`/payments/{paymentId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

8. **Expense Receipts** (`/expenses/{expenseId}/{allPaths=**}`)
   - Read: Authenticated users
   - Write: Authenticated users (10MB limit)

9. **Training Center Files**
   - Students: Authenticated users (10MB limit)
   - Certificates: Public read, authenticated write (5MB limit)

10. **Default Rule**
    - Denies all other paths for security

---

## 🔐 Security Features

### Firestore Rules:
- ✅ Permission-based access control
- ✅ Allows viewing linked records when user has `VIEW_CLIENTS_BUSINESSES` permission
- ✅ Maintains existing permission checks for create/update/delete operations
- ✅ Supports queries filtered by `clientId` and `businessId`

### Storage Rules:
- ✅ File size limits (5MB for company files, 10MB for documents)
- ✅ Authentication required for all operations
- ✅ Organized by entity type (clients, businesses, sales, invoices, etc.)
- ✅ Default deny rule for security

---

## 📋 Permission Requirements

To access Client/Business detail pages with Sales Records and Documents tabs, users need:

**Minimum Required Permission:**
- `VIEW_CLIENTS_BUSINESSES` - Allows viewing clients, businesses, and their linked records

**Full Access Permissions:**
- `VIEW_ALL_SALES_RECORDS` or `VIEW_SALES_RECORDS` - For sales records
- `MANAGE_INVOICES` - For invoices
- `MANAGE_QUOTATIONS` - For quotations
- `MANAGE_PAYMENTS_RECEIPTS` - For payments

---

## 🚀 Deployment Status

✅ **Firestore Rules:** Deployed successfully
✅ **Storage Rules:** Deployed successfully
✅ **firebase.json:** Updated to include storage rules configuration

---

## 📝 Notes

1. **Query Filtering:** The app performs client-side filtering by `clientId` and `businessId`. The Firestore rules allow listing with proper permissions, and the app ensures only relevant records are displayed.

2. **Storage Access:** Storage rules use authentication-based access. App-level permission checks should be performed before allowing file uploads.

3. **File Size Limits:** 
   - Company files: 5MB
   - All other documents: 10MB

4. **CORS Issues:** The storage rules don't directly address CORS. If you're experiencing CORS errors with Firebase Storage, you may need to configure CORS settings in the Firebase Console or use a Cloud Function as a proxy.

---

**Last Updated:** Rules deployed and active for Client/Business detail pages.




