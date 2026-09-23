# Financial Functions Guide - Simple Explanation

This guide explains all the financial functions in the system using simple, everyday language. No finance jargon!

## Table of Contents
1. [What is the Financial System?](#what-is-the-financial-system)
2. [Chart of Accounts](#chart-of-accounts)
3. [Journal Entries](#journal-entries)
4. [Vendors & Accounts Payable](#vendors--accounts-payable)
5. [Customers & Accounts Receivable](#customers--accounts-receivable)
6. [Cash Management](#cash-management)
7. [Fixed Assets](#fixed-assets)
8. [Loans](#loans)
9. [Equity Events](#equity-events)
10. [Financial Reports](#financial-reports)

---

## What is the Financial System?

Think of the financial system as a digital accounting book that tracks:
- **Money coming in** (revenue/income)
- **Money going out** (expenses/costs)
- **What you own** (assets)
- **What you owe** (liabilities)
- **Your company's value** (equity)

All transactions are automatically recorded and organized so you can see your company's financial health at any time.

---

## Chart of Accounts

### What is it?
A list of categories where you organize your money. Like folders in a filing cabinet, but for accounting.

### Functions:

#### `apiGetChartOfAccounts()`
**What it does:** Gets the list of all account categories.

**Simple explanation:** Shows you all the folders (accounts) you've created to organize your money. For example:
- Cash on Hand (money in your wallet/office)
- Accounts Receivable (money customers owe you)
- Revenue (money you earned)
- Expenses (money you spent)

**When to use:** When you want to see or select an account category.

---

#### `apiSaveChartAccount()`
**What it does:** Creates or updates an account category.

**Simple explanation:** Adds a new folder to your filing system or renames an existing one.

**Example:** You want to track "Office Supplies" expenses separately. You create a new account called "Office Supplies Expense" with code "5100".

**When to use:** 
- When setting up your accounting system for the first time
- When you need a new category to track specific income or expenses

---

## Journal Entries

### What is it?
A record of every financial transaction. Like a diary entry, but for money movements.

**Important rule:** Every entry must balance! If you record money going out of one account, it must go into another account. Think of it like transferring water between two buckets - the total amount stays the same.

### Functions:

#### `apiGetJournalEntries()`
**What it does:** Gets all the transaction records.

**Simple explanation:** Shows you a list of every money movement that happened, sorted by date (newest first).

**When to use:** When you want to review all transactions or find a specific transaction.

---

#### `apiSaveJournalEntry()`
**What it does:** Records a new transaction.

**Simple explanation:** Writes a new entry in your financial diary. You must record where money came from and where it went.

**Example:** You paid $100 for office rent:
- Money goes OUT of "Cash" account (debit: $100)
- Money goes INTO "Rent Expense" account (credit: $100)

**When to use:** 
- When you need to manually record a transaction
- When correcting an accounting error
- When recording adjustments

**Important:** The system automatically creates journal entries when you:
- Create invoices
- Record payments
- Add assets
- Record loan payments
- etc.

---

## Vendors & Accounts Payable

### What is it?
**Vendors** = Companies/people you buy things from (suppliers).
**Accounts Payable** = Money you owe to vendors (bills you haven't paid yet).

### Functions:

#### `apiGetFinanceVendors()`
**What it does:** Gets the list of all vendors (suppliers).

**Simple explanation:** Shows you all the companies you buy things from.

**When to use:** When you want to see your vendor list or select a vendor.

---

#### `apiSaveFinanceVendor()`
**What it does:** Creates or updates a vendor.

**Simple explanation:** Adds a new supplier to your list or updates their information.

**Example:** You start buying office supplies from "ABC Office Supplies". You add them as a vendor.

**When to use:** 
- When you start working with a new supplier
- When you need to update vendor information

---

#### `apiGetAPInvoices()`
**What it does:** Gets all bills you received from vendors (that you haven't paid yet).

**Simple explanation:** Shows you all the invoices/bills that vendors sent you.

**When to use:** When you want to see what bills you need to pay.

---

#### `apiSaveAPInvoice()`
**What it does:** Records a new bill from a vendor.

**Simple explanation:** When a vendor sends you a bill, you record it here. The system automatically:
- Adds the amount to what you owe that vendor
- Creates a journal entry showing the expense and the debt

**Example:** "ABC Office Supplies" sends you a bill for $500 for office supplies. You record it, and now:
- Your "Office Supplies Expense" increases by $500
- Your "Accounts Payable" (what you owe) increases by $500

**When to use:** When you receive a bill from a vendor.

---

#### `apiRunVendorPayment()`
**What it does:** Records that you paid a vendor's bill.

**Simple explanation:** When you pay a bill, you mark it as paid. The system automatically:
- Reduces what you owe the vendor
- Reduces your cash
- Creates a journal entry showing the payment

**Example:** You pay the $500 bill to "ABC Office Supplies". Now:
- Your cash decreases by $500
- Your "Accounts Payable" decreases by $500
- The bill is marked as "Paid"

**When to use:** When you actually pay a vendor's bill.

---

## Customers & Accounts Receivable

### What is it?
**Customers** = Companies/people who buy from you.
**Accounts Receivable** = Money customers owe you (invoices you sent but haven't been paid yet).

### Functions:

#### `apiGetFinanceCustomers()`
**What it does:** Gets the list of all customers.

**Simple explanation:** Shows you all the companies/people who buy from you.

**When to use:** When you want to see your customer list or select a customer.

---

#### `apiSaveFinanceCustomer()`
**What it does:** Creates or updates a customer.

**Simple explanation:** Adds a new customer to your list or updates their information.

**Example:** "XYZ Company" becomes your new client. You add them as a customer.

**When to use:** 
- When you get a new customer
- When you need to update customer information

---

#### `apiGetARInvoices()`
**What it does:** Gets all invoices you sent to customers (that haven't been paid yet).

**Simple explanation:** Shows you all the bills you sent to customers.

**When to use:** When you want to see which customers owe you money.

---

#### `apiSaveARInvoice()`
**What it does:** Creates a new invoice for a customer.

**Simple explanation:** When you send a bill to a customer, you record it here. The system automatically:
- Adds the amount to what the customer owes you
- Creates a journal entry showing the revenue and the receivable

**Example:** You send "XYZ Company" an invoice for $1,000 for services. Now:
- Your "Revenue" increases by $1,000
- Your "Accounts Receivable" (what customers owe you) increases by $1,000

**When to use:** When you send an invoice to a customer.

---

#### `apiRecordCustomerReceipt()`
**What it does:** Records that a customer paid their invoice.

**Simple explanation:** When a customer pays you, you mark their invoice as paid. The system automatically:
- Reduces what the customer owes you
- Increases your cash
- Creates a journal entry showing the payment received

**Example:** "XYZ Company" pays the $1,000 invoice. Now:
- Your cash increases by $1,000
- Your "Accounts Receivable" decreases by $1,000
- The invoice is marked as "Paid"

**When to use:** When a customer pays their invoice.

---

## Cash Management

### What is it?
Tracking all your bank accounts and cash transactions (money going in and out).

### Functions:

#### `apiGetCashAccounts()`
**What it does:** Gets all your bank accounts and cash accounts.

**Simple explanation:** Shows you all the places where you keep money (bank accounts, cash on hand, etc.).

**Example:** 
- KBZ Bank Account (MMK)
- UOB Singapore Account (USD)
- Petty Cash Box

**When to use:** When you want to see your accounts or select an account for a transaction.

---

#### `apiRecordCashTransaction()`
**What it does:** Records money going in or out of a cash account.

**Simple explanation:** Records any cash movement (deposit, withdrawal, transfer).

**Types:**
- **Inflow:** Money coming in (deposit, customer payment, etc.)
- **Outflow:** Money going out (withdrawal, payment, etc.)

**Example:** You withdraw $500 from KBZ Bank for office expenses:
- KBZ Bank balance decreases by $500
- Transaction is recorded

**When to use:** 
- When you deposit money
- When you withdraw money
- When you transfer money between accounts
- When you make a cash payment

---

#### `apiReconcileCashAccount()`
**What it does:** Updates an account balance to match your bank statement.

**Simple explanation:** Sometimes your records don't match your bank statement. This function updates your records to match what the bank says.

**Example:** Your records show $10,000 in KBZ Bank, but your bank statement shows $10,250. You reconcile it to $10,250.

**When to use:** 
- Monthly when you receive bank statements
- When you find discrepancies between your records and bank records

---

## Fixed Assets

### What is it?
**Fixed Assets** = Expensive items your company owns that last a long time (computers, vehicles, equipment, buildings).

**Depreciation** = The gradual decrease in value of assets over time (like a car losing value each year).

### Functions:

#### `apiGetFixedAssets()`
**What it does:** Gets the list of all fixed assets.

**Simple explanation:** Shows you all the expensive items your company owns.

**Example:** 
- Office Building
- Company Car
- Computer Equipment
- Office Furniture

**When to use:** When you want to see what assets you own.

---

#### `apiAddFixedAsset()`
**What it does:** Records a new fixed asset.

**Simple explanation:** When you buy an expensive item, you record it here. The system automatically:
- Adds it to your assets
- Creates a journal entry

**Example:** You buy a company car for $20,000. You record:
- Asset name: "Company Car"
- Cost: $20,000
- Useful life: 60 months (5 years)
- The system adds $20,000 to your "Fixed Assets" account

**When to use:** When you purchase an expensive item that will be used for more than one year.

---

#### `apiRunDepreciation()`
**What it does:** Calculates and records depreciation for all assets for a specific period (usually monthly).

**Simple explanation:** Every month, your assets lose a little value. This function calculates that loss and records it automatically.

**How it works:**
- Takes the asset cost
- Divides by useful life (in months)
- Records that amount as depreciation expense each month

**Example:** Your $20,000 car with 60-month life depreciates $333.33 per month ($20,000 ÷ 60). Each month, the system:
- Reduces the car's value by $333.33
- Records $333.33 as "Depreciation Expense"

**When to use:** 
- Monthly (usually at month-end)
- To keep asset values accurate

---

#### `apiDisposeFixedAsset()`
**What it does:** Records when you sell or get rid of a fixed asset.

**Simple explanation:** When you sell or throw away an asset, you record it here. The system calculates if you made a profit or loss.

**Example:** You sell the company car for $15,000, but its current value (book value) is $12,000. You made a $3,000 profit. The system:
- Removes the asset
- Records the $15,000 cash received
- Records the $3,000 profit

**When to use:** When you sell, donate, or dispose of a fixed asset.

---

## Loans

### What is it?
**Loans** = Money you borrowed from banks or lenders that you need to pay back.

**Principal** = The original amount you borrowed.
**Interest** = The extra money you pay for borrowing.
**Outstanding Principal** = How much you still owe.

### Functions:

#### `apiGetLoanAgreements()`
**What it does:** Gets all your loan agreements.

**Simple explanation:** Shows you all the loans you have (bank loans, credit lines, etc.).

**Example:** 
- Development Bank Loan: $500,000 at 8.5% interest
- Equipment Loan: $50,000 at 6% interest

**When to use:** When you want to see your loans or check loan details.

---

#### `apiRecordLoanPayment()`
**What it does:** Records a loan payment you made.

**Simple explanation:** When you make a loan payment, you record it here. The system automatically:
- Reduces how much you owe (outstanding principal)
- Records the interest expense
- Reduces your cash
- Creates a journal entry

**Example:** You make a $5,000 loan payment:
- $4,000 goes to principal (reduces what you owe)
- $1,000 goes to interest (expense)
- Your cash decreases by $5,000
- Your loan balance decreases by $4,000

**When to use:** Every time you make a loan payment.

---

## Equity Events

### What is it?
**Equity** = The value of your company (what's left after subtracting what you owe from what you own).

**Equity Events** = Changes in company ownership or value:
- **Issuance:** When investors put money into your company (like selling company shares)
- **Dividend:** When you pay money to owners/shareholders

### Functions:

#### `apiGetEquityEvents()`
**What it does:** Gets all equity events.

**Simple explanation:** Shows you all the times money was invested in your company or paid out to owners.

**When to use:** When you want to see the history of investments or dividend payments.

---

#### `apiRecordEquityEvent()`
**What it does:** Records a new equity event.

**Simple explanation:** Records when investors put money in or when you pay dividends to owners.

**Types:**
- **Issuance:** Someone invests money in your company
  - Example: Investor gives you $100,000 for company shares
  - Your cash increases by $100,000
  - Your "Share Capital" increases by $100,000

- **Dividend:** You pay money to owners/shareholders
  - Example: You pay $10,000 dividend to shareholders
  - Your cash decreases by $10,000
  - Your "Retained Earnings" decreases by $10,000

**When to use:** 
- When investors invest money in your company
- When you pay dividends to shareholders
- When recording other equity changes

---

## Financial Reports

### What is it?
Summary reports that show your company's financial health.

### Functions:

#### `apiGetFinancialReports()`
**What it does:** Generates financial reports for a specific period.

**Simple explanation:** Creates summary reports showing:
- **Income Statement:** How much you earned vs. how much you spent (profit/loss)
- **Balance Sheet:** What you own, what you owe, and your company's value
- **Cash Flow:** How money moved in and out
- **Trial Balance:** List of all accounts and their balances
- **Budget vs. Actual:** Comparison of what you planned vs. what actually happened

**Reports Explained:**

1. **Income Statement (Profit & Loss)**
   - **Revenue:** Total money you earned
   - **Expenses:** Total money you spent
   - **Profit/Loss:** Revenue minus Expenses (positive = profit, negative = loss)

2. **Balance Sheet**
   - **Assets:** Everything you own (cash, equipment, money owed to you)
   - **Liabilities:** Everything you owe (loans, bills to pay)
   - **Equity:** Your company's value (Assets minus Liabilities)

3. **Cash Flow**
   - **Operations:** Money from your business activities
   - **Investing:** Money from buying/selling assets
   - **Financing:** Money from loans or investments

4. **Trial Balance**
   - A list of all accounts showing their current balances
   - Used to verify everything is balanced correctly

5. **Budget vs. Actual**
   - Compares what you planned to spend/earn vs. what actually happened
   - Helps you see if you're on track

**When to use:** 
- Monthly for monthly reports
- Quarterly for quarterly reviews
- Yearly for annual financial statements
- When you need to show financial status to investors, banks, or management

---

## How Everything Works Together

Here's a simple example of how the system works:

1. **You send an invoice to a customer:**
   - Use `apiSaveARInvoice()` → Creates invoice, increases revenue, increases accounts receivable

2. **Customer pays the invoice:**
   - Use `apiRecordCustomerReceipt()` → Marks invoice as paid, increases cash, decreases accounts receivable

3. **You receive a bill from a vendor:**
   - Use `apiSaveAPInvoice()` → Records bill, increases expense, increases accounts payable

4. **You pay the vendor:**
   - Use `apiRunVendorPayment()` → Marks bill as paid, decreases cash, decreases accounts payable

5. **You buy a computer (fixed asset):**
   - Use `apiAddFixedAsset()` → Records asset, increases fixed assets

6. **End of month:**
   - Use `apiRunDepreciation()` → Calculates asset depreciation
   - Use `apiGetFinancialReports()` → Generates monthly reports

All these actions automatically create journal entries, so your books are always balanced!

---

## Important Notes

1. **Everything is connected:** When you record transactions, the system automatically updates related accounts and creates journal entries.

2. **Double-entry bookkeeping:** Every transaction affects at least two accounts (money comes from somewhere and goes somewhere).

3. **Balancing:** The system ensures all entries balance (debits = credits). If they don't, you'll get an error.

4. **Currency support:** The system supports multiple currencies (MMK, USD, etc.). Make sure to use the correct currency for each transaction.

5. **Period tracking:** All transactions are linked to periods (months), making it easy to generate monthly, quarterly, or yearly reports.

---

## Quick Reference

| What you want to do | Function to use |
|-------------------|----------------|
| See all account categories | `apiGetChartOfAccounts()` |
| Add a new account category | `apiSaveChartAccount()` |
| See all transactions | `apiGetJournalEntries()` |
| Record a manual transaction | `apiSaveJournalEntry()` |
| See all vendors | `apiGetFinanceVendors()` |
| Add a vendor | `apiSaveFinanceVendor()` |
| Record a vendor bill | `apiSaveAPInvoice()` |
| Pay a vendor bill | `apiRunVendorPayment()` |
| See all customers | `apiGetFinanceCustomers()` |
| Add a customer | `apiSaveFinanceCustomer()` |
| Send invoice to customer | `apiSaveARInvoice()` |
| Record customer payment | `apiRecordCustomerReceipt()` |
| See bank accounts | `apiGetCashAccounts()` |
| Record cash transaction | `apiRecordCashTransaction()` |
| Reconcile bank account | `apiReconcileCashAccount()` |
| See all assets | `apiGetFixedAssets()` |
| Add a new asset | `apiAddFixedAsset()` |
| Calculate depreciation | `apiRunDepreciation()` |
| Sell/dispose an asset | `apiDisposeFixedAsset()` |
| See all loans | `apiGetLoanAgreements()` |
| Record loan payment | `apiRecordLoanPayment()` |
| See equity events | `apiGetEquityEvents()` |
| Record investment/dividend | `apiRecordEquityEvent()` |
| Generate reports | `apiGetFinancialReports()` |

---

## Need Help?

If you're unsure which function to use:
1. Think about what you're trying to record (money in, money out, asset, loan, etc.)
2. Check the Quick Reference table above
3. Read the detailed explanation for that function
4. Remember: The system automatically handles journal entries, so you usually just need to record the main transaction!

