// services/api.ts
// This file has been refacted to use Firebase services instead of mock data.
// All functions now interact with Firestore, Firestore, and Firebase Storage.

import { 
  User, UserRole, Lead, LeadStatus, Client, Business, ClientBusinessBalance, MergeSnapshot, BusinessMergeSnapshot, ServiceCategory, SubCategory, Service,
  SaleRecord, FacebookAdsSaleRecord, OtherServicesSaleRecord, Invoice, Payment,
  VisaCard, VisaReload, VisaCardSpend, DailyExchangeRate, Expense, Payslip, Employee, InvoiceStatus, SaleStatus, PaymentStatus, EmployeeStatus,
  Refund, RefundStatus, CreditNote, CreditNoteStatus, BalanceAdjustment, BalanceAdjustmentType,
  LeaveRequest, LeaveRequestStatus, Holiday, AllowanceItem, DeductionItem, LeaveType,
  Task, TaskList, Quotation, QuotationItem, QuotationStatus,
  CompanyProfileSetting, PaymentMethodSetting, ExpenseCategorySetting, LeadSourceSetting,
  BusinessTypeSetting, CampaignObjectiveSetting, AssetCategorySetting, SettingItem, InvoiceItem,
  LeadActivity, LeadActivityType, LeadSettings, AttendanceRulesSettings, Department, Permission, RolePermissionConfig, DepartmentRolePermissionConfig,
  Project, ProjectStatus, TaskStatus, PackageTier, Notification, ParsedExcelRow, ImportResult,
  Vendor, ParsedEmployeeExcelRow, EmployeeImportResult,
  ParsedPOSProductExcelRow, POSProductImportResult,
  AttendanceReport, EmployeeAttendanceStats, Note, Quiz, Question, QuestionType, QuizAttempt, SurveySubmission,
  QuizSection,
  KPI,
  KpiCategory,
  EmployeeKpiSheet,
  AssignedKPI,
  EmployeeOnboarding,
  EmployeeOnboardingItem,
  Attachment,
  // Website Integration Types
  ContactFormData,
  FacebookAdAccount,
  FacebookPage,
  FacebookCampaign,
  FacebookInsight,
  // FIX: Add missing SMS types
  SmsTemplate,
  SmsMessage,
  SmsBatch,
  SmsSettings,
  SmsRecipient,
  SmsStatus,
  // FIX: Add missing Promotion type for new API functions
  Promotion,
  ActivityLogEntry,
  AccountType,
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  AccountsPayableInvoice,
  AccountsReceivableInvoice,
  Customer,
  CashAccount,
  CashTransaction,
  FixedAsset,
  FixedAssetEvent,
  LoanAgreement,
  LoanPayment,
  EquityEvent,
  FinancialReport,
  DepreciationMethod,
  JournalEntryStatus,
  BadDebt,
  BadDebtStatus,
  AllowanceForDoubtfulDebts,
  BadDebtAgingBracket,
  // POS System Types
  POSProduct,
  POSProductVariant,
  POSProductCategory,
  POSCustomer,
  InventoryTransaction,
  InventoryTransactionType,
  POSOrder,
  POSOrderItem,
  POSOrderStatus,
  DeliveryTracking,
  DeliveryStatus,
  SalesType,
  POSRevenue
} from '../types';

import { 
    SALE_ID_PREFIX,
    INVOICE_ID_PREFIX, QUOTATION_ID_PREFIX, EMPLOYEE_ID_PREFIX, LEAVE_REQUEST_ID_PREFIX, 
    HOLIDAY_ID_PREFIX, TASK_ID_PREFIX, TASK_LIST_ID_PREFIX, PAYMENT_ID_PREFIX, REFUND_ID_PREFIX, CREDIT_NOTE_ID_PREFIX, BALANCE_ADJUSTMENT_ID_PREFIX, PROJECT_ID_PREFIX,
    LEAD_ID_PREFIX, CLIENT_ID_PREFIX, BUSINESS_ID_PREFIX, SERVICE_ID_PREFIX,
    PAYMENT_METHOD_SETTING_ID_PREFIX, EXP_CAT_PREFIX, LEAD_SRC_PREFIX, BIZ_TYPE_PREFIX,
    CAMP_OBJ_PREFIX, ASSET_CAT_PREFIX, DEPT_ID_PREFIX,
    EXPENSE_ID_PREFIX,
    VENDOR_ID_PREFIX, PAYSLIP_ID_PREFIX,
    CLIENT_ID_INTERNAL, BUSINESS_ID_INTERNAL, PROJECT_ID_MARKETING_CAPSULE, NOTE_ID_PREFIX,
    QUIZ_ID_PREFIX, QUIZ_ATTEMPT_ID_PREFIX, SURVEY_SUBMISSION_ID_PREFIX, QUIZ_SECTION_ID_PREFIX,
    KPI_ID_PREFIX, KPI_CATEGORY_ID_PREFIX,
    // FIX: Add missing SMS ID prefixes
    SMS_MESSAGE_ID_PREFIX,
    SMS_TEMPLATE_ID_PREFIX,
    SMS_BATCH_ID_PREFIX,
    // FIX: Add missing Promotion ID prefix for new API functions
    PROMOTION_ID_PREFIX,
    // POS System ID Prefixes
    POS_PRODUCT_ID_PREFIX,
    POS_ORDER_ID_PREFIX,
    INVENTORY_TRANSACTION_ID_PREFIX,
    POS_REVENUE_ID_PREFIX,
    POS_CUSTOMER_ID_PREFIX,
    POS_CATEGORY_ID_PREFIX,
    // Fixed Assets ID Prefixes
    FIXED_ASSET_ID_PREFIX,
    ASSET_EVENT_ID_PREFIX
} from '../constants';
import { getTodayInYangon, getDateInYangonTimezone, formatDateForDisplay } from '../utils/dateUtils';
import { buildBoostingLineFromSale, isBoostingService } from '../utils/boostingServiceUtils';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions.config';

// Import Firebase services and functions (v8 compat syntax)
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';
import { app as mainApp, auth, db, storage, functions } from '../firebase';
import { isFacebookMockModeEnabled } from '../utils/featureFlags';
import {
    MOCK_FACEBOOK_ACCOUNTS,
    getMockCampaignById,
    getMockCampaignsForAccount,
    getMockInsightForAccount
} from '../mocks/facebookAds';

const FACEBOOK_MOCK_MODE = isFacebookMockModeEnabled();
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isFacebookMockMode = () => FACEBOOK_MOCK_MODE;

// --- In-memory Finance Store (placeholder for Firestore collections) ---
type FinanceStore = {
    chartOfAccounts: ChartOfAccount[];
    journalEntries: JournalEntry[];
    vendors: Vendor[];
    apInvoices: AccountsPayableInvoice[];
    customers: Customer[];
    arInvoices: AccountsReceivableInvoice[];
    cashAccounts: CashAccount[];
    cashTransactions: CashTransaction[];
    fixedAssets: FixedAsset[];
    assetEvents: FixedAssetEvent[];
    loans: LoanAgreement[];
    loanPayments: LoanPayment[];
    equityEvents: EquityEvent[];
};

const financeStore: FinanceStore = {
    chartOfAccounts: [],
    journalEntries: [],
    vendors: [],
    apInvoices: [],
    customers: [],
    arInvoices: [],
    cashAccounts: [],
    cashTransactions: [],
    fixedAssets: [],
    assetEvents: [],
    loans: [],
    loanPayments: [],
    equityEvents: [],
};

const generateFinanceId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const DEFAULT_LEAD_SETTINGS: LeadSettings = {
    id: 'global',
    autoAssignMode: 'manual',
    leadSources: ['Website', 'Referral', 'Facebook Ads', 'Walk-in'],
    enableActivityReminders: false,
};

const DEFAULT_ATTENDANCE_RULES_SETTINGS: AttendanceRulesSettings = {
    id: 'global',
    defaultStartTime: '09:30',
    defaultEndTime: '17:00',
    defaultWorkingHours: 8,
    maxLateMinutes: 30,
    lateGracePeriodMinutes: 5,
    maxLeaveDaysPerMonth: 2,
    maxLeaveDaysPerYear: 15,
    maxAbsenceDaysPerMonth: 3,
    absenceRequiresAction: true,
    overtimeThresholdMinutes: 15,
    minOvertimeHours: 0.5,
    earlyLeaveGracePeriodMinutes: 15,
    workingDaysPerWeek: 5,
    halfDayHours: 4,
};



// --- UTILITY FUNCTIONS ---

// New function to upload a file to Firebase Storage
export const apiUploadFile = async (file: File, path: string): Promise<string> => {
    try {
        console.log(`[UPLOADER] Attempting to upload file '${file.name}' (${(file.size / 1024).toFixed(2)} KB, type: ${file.type}) to path: ${path}`);
        const storageRef = storage.ref(path);
        const metadata = {
            contentType: file.type,
            cacheControl: 'public, max-age=0' // Force re-validation
        };
        const snapshot = await storageRef.put(file, metadata);
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log(`[UPLOADER] Upload successful. URL: ${downloadURL}`);
        return downloadURL;
    } catch (error: any) {
        console.error(`[UPLOADER] Firebase Storage Upload Error for path: ${path}`, error);
        console.error(`[UPLOADER] Detailed Error Code: ${error.code}`);
        console.error(`[UPLOADER] Detailed Error Message: ${error.message}`);
        
        // Provide a more specific error message based on common storage errors
        if (error.code === 'storage/unauthorized') {
            const errorMessage = `Permission denied. This is likely a Firebase Storage security rule issue. ` +
                                 `Please ensure your rules allow public writes to the path prefix being used. ` +
                                 `The attempted path was: '${path}'. ` +
                                 `Also, check your bucket's CORS configuration in the Google Cloud console.`;
            console.error(`[UPLOADER] Security Rule Troubleshooting: Your rule needs to match the path structure. A potential rule could be: "match /${path.split('/')[0]}/{allPaths=**} { allow write: if true; }"`);
            throw new Error(errorMessage);
        } else if (error.code === 'storage/object-not-found') {
             throw new Error('File not found at the specified path.');
        } else {
             throw new Error(`An unknown error occurred during file upload. Check the console for details.`);
        }
    }
};

// Helper to get the next sequential ID from a counter document in Firestore
export const getNextId = async (prefix: string): Promise<string> => {
  const getYangonDateParts = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Yangon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const day = parts.find(part => part.type === 'day')?.value ?? '01';
    const month = parts.find(part => part.type === 'month')?.value ?? '01';
    const yearFull = parts.find(part => part.type === 'year')?.value ?? '2000';
    const year = yearFull.slice(-2);
    return { day, month, year, yearFull };
  };

  // Daily resetting ID for Sales (SA<DD><MM><YY>-<SerialNo>), e.g. first sale of 13 Feb 2026 = SA130226-001
  if (prefix === SALE_ID_PREFIX) {
    const { day, month, year, yearFull } = getYangonDateParts();
    const counterId = `sales_${yearFull}${month}${day}`; // e.g., sales_20260213
    const counterRef = db.collection('counters').doc(counterId);

    let nextIdNum = 1;
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        transaction.set(counterRef, { count: nextIdNum });
      } else {
        nextIdNum = (counterDoc.data()!.count || 0) + 1;
        transaction.update(counterRef, { count: nextIdNum });
      }
    });

    return `${prefix}${day}${month}${year}-${String(nextIdNum).padStart(3, '0')}`; // e.g., SA130226-001
  }

  // Daily resetting ID for Credit Notes (CN<DD><MM><YY>-<SerialNo>), e.g. first of 13 Feb 2026 = CN130226-001
  if (prefix === CREDIT_NOTE_ID_PREFIX) {
    const { day, month, year, yearFull } = getYangonDateParts();
    const counterId = `credit_notes_${yearFull}${month}${day}`; // e.g., credit_notes_20260213
    const counterRef = db.collection('counters').doc(counterId);

    let nextIdNum = 1;
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        transaction.set(counterRef, { count: nextIdNum });
      } else {
        nextIdNum = (counterDoc.data()!.count || 0) + 1;
        transaction.update(counterRef, { count: nextIdNum });
      }
    });

    return `${prefix}${day}${month}${year}-${String(nextIdNum).padStart(3, '0')}`; // e.g., CN130226-001
  }

  const counterRef = db.collection('counters').doc(`${prefix.toLowerCase()}_counter`);
  
  // Special logic for ID reuse for Vendors
  if (prefix === VENDOR_ID_PREFIX) {
    let reusedId: string | null = null;
    // Sorter for alphanumeric IDs like 'S1', 'S10' to sort numerically.
    const sortFn = (a: string, b: string) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
        return numA - numB;
    };
    try {
        await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            if (counterDoc.exists) {
                const data = counterDoc.data();
                // Ensure deleted_ids is an array, then sort it to get the lowest ID first
                const deletedIds = (Array.isArray(data?.deleted_ids) ? data.deleted_ids : []).sort(sortFn);
                if (deletedIds.length > 0) {
                    reusedId = deletedIds[0]; // Take the first one (lowest)
                    const updatedDeletedIds = deletedIds.slice(1);
                    transaction.update(counterRef, { deleted_ids: updatedDeletedIds });
                }
            }
        });
        if (reusedId) {
            console.log(`Reusing deleted ID for prefix ${prefix}: ${reusedId}`);
            return reusedId;
        }
    } catch (e) {
        console.error(`ID reuse transaction for prefix ${prefix} failed, falling back to counter:`, e);
    }
  }

  // --- Original counter logic ---
  let nextIdNum: number = 1;

  try {
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        // Initialize with deleted_ids array for all counters, for consistency
        transaction.set(counterRef, { count: nextIdNum, deleted_ids: [] });
      } else {
        nextIdNum = (counterDoc.data()!.count || 0) + 1;
        transaction.update(counterRef, { count: nextIdNum });
      }
    });
  } catch (e) {
    console.error("ID generation transaction failed: ", e);
    throw new Error("Could not generate a new ID.");
  }
  
  // Client and Business IDs use 4-digit padding (CL-0001, B-0001)
  if (prefix === CLIENT_ID_PREFIX || prefix === BUSINESS_ID_PREFIX) {
    return `${prefix}${String(nextIdNum).padStart(4, '0')}`;
  }
  const padding = prefix === VENDOR_ID_PREFIX ? 2 : 3;
  return `${prefix}${String(nextIdNum).padStart(padding, '0')}`;
};

// Helper to get a block of next sequential IDs from a counter document in Firestore
export const getNextIdBlock = async (prefix: string, count: number): Promise<string[]> => {
    if (count === 0) return [];
    const counterRef = db.collection('counters').doc(`${prefix.toLowerCase()}_counter`);
    const ids: string[] = [];
  
    try {
      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextIdNum = 1;
        if (counterDoc.exists) {
          nextIdNum = (counterDoc.data()!.count || 0) + 1;
        }
        
        const newCount = nextIdNum + count - 1;
        
        if (!counterDoc.exists) {
          transaction.set(counterRef, { count: newCount, deleted_ids: [] });
        } else {
          transaction.update(counterRef, { count: newCount });
        }
  
        const padding = 3; // For SMS_MESSAGE_ID_PREFIX
        for (let i = 0; i < count; i++) {
          ids.push(`${prefix}${String(nextIdNum + i).padStart(padding, '0')}`);
        }
      });
    } catch (e) {
      console.error(`ID block generation transaction for prefix ${prefix} failed: `, e);
      throw new Error("Could not generate a block of new IDs.");
    }
  
    if (ids.length !== count) {
      throw new Error("ID block generation failed to produce the correct number of IDs.");
    }
    
    return ids;
};

/** Reset all counter documents to count: 0 so the next generated ID for each will be 1. */
export const apiResetAllCounters = async (): Promise<{ resetCount: number }> => {
  const countersSnapshot = await db.collection('counters').get();
  if (countersSnapshot.empty) {
    return { resetCount: 0 };
  }
  const BATCH_SIZE = 500;
  const batch = db.batch();
  let ops = 0;
  for (const doc of countersSnapshot.docs) {
    const data = doc.data();
    const updateData: Record<string, unknown> = { count: 0 };
    if (Array.isArray(data?.deleted_ids)) {
      updateData.deleted_ids = [];
    }
    batch.update(doc.ref, updateData);
    ops++;
  }
  await batch.commit();
  return { resetCount: ops };
};

/** Extract numeric part from CL-xxxxx or B-xxxxx for sorting. Returns NaN if invalid. */
const parseIdNumber = (id: string, prefix: string): number => {
  if (!id.startsWith(prefix)) return NaN;
  const numPart = id.slice(prefix.length).replace(/^0+/, '') || '0';
  return parseInt(numPart, 10) || 0;
};

/**
 * Resequence all Client and Business IDs to CL-0001, CL-0002, ... and B-0001, B-0002, ...
 * Updates all references across Firestore and resets counters.
 * Excludes CLIENT_ID_INTERNAL and BUSINESS_ID_INTERNAL.
 */
export const apiResequenceClientBusinessIds = async (): Promise<{
  clientsResequenced: number;
  businessesResequenced: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  const BATCH_SIZE = 450; // Stay under Firestore 500 limit

  const clientsSnap = await db.collection('clients').get();
  const businessesSnap = await db.collection('businesses').get();

  const clients = clientsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Client & { id: string }))
    .filter(c => c.id.startsWith(CLIENT_ID_PREFIX) && c.id !== CLIENT_ID_INTERNAL);
  const businesses = businessesSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Business & { id: string }))
    .filter(b => b.id.startsWith(BUSINESS_ID_PREFIX) && b.id !== BUSINESS_ID_INTERNAL);

  clients.sort((a, b) => parseIdNumber(a.id, CLIENT_ID_PREFIX) - parseIdNumber(b.id, CLIENT_ID_PREFIX));
  businesses.sort((a, b) => parseIdNumber(a.id, BUSINESS_ID_PREFIX) - parseIdNumber(b.id, BUSINESS_ID_PREFIX));

  const clientOldToNew = new Map<string, string>();
  const businessOldToNew = new Map<string, string>();
  clients.forEach((c, i) => clientOldToNew.set(c.id, `${CLIENT_ID_PREFIX}${String(i + 1).padStart(4, '0')}`));
  businesses.forEach((b, i) => businessOldToNew.set(b.id, `${BUSINESS_ID_PREFIX}${String(i + 1).padStart(4, '0')}`));

  const remapClient = (id: string) => clientOldToNew.get(id) ?? id;
  const remapBusiness = (id: string) => businessOldToNew.get(id) ?? id;

  try {
    let batch = db.batch();
    let batchCount = 0;

    // 1. Create new client documents with new IDs
    for (const c of clients) {
      const newId = clientOldToNew.get(c.id)!;
      const { id: _oldId, ...data } = c;
      const newData = {
        ...data,
        linkedBusinessIds: (data.linkedBusinessIds || []).map(remapBusiness),
      };
      batch.set(db.collection('clients').doc(newId), newData);
      batchCount++;
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // 2. Create new business documents with new IDs
    for (const b of businesses) {
      const newId = businessOldToNew.get(b.id)!;
      const { id: _oldId, ...data } = b;
      const newData = {
        ...data,
        linkedClientIds: (data.linkedClientIds || []).map(remapClient),
      };
      batch.set(db.collection('businesses').doc(newId), newData);
      batchCount++;
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // 3. Update child collections: sales, invoices, payments, refunds, credit_notes, balance_adjustments, bad_debts, quotations
    const childCols = [
      { name: 'sales', clientField: 'clientId', businessField: 'businessId' },
      { name: 'invoices', clientField: 'clientId', businessField: 'businessId' },
      { name: 'payments', clientField: 'clientId', businessField: 'businessId' },
      { name: 'refunds', clientField: 'clientId', businessField: 'businessId' },
      { name: 'credit_notes', clientField: 'clientId', businessField: 'businessId' },
      { name: 'balance_adjustments', clientField: 'clientId', businessField: 'businessId' },
      { name: 'bad_debts', clientField: 'clientId', businessField: 'businessId' },
      { name: 'quotations', clientField: 'clientId', businessField: 'businessId' },
    ] as const;

    for (const col of childCols) {
      const snap = await db.collection(col.name).get();
      for (const doc of snap.docs) {
        const d = doc.data();
        const newClientId = d[col.clientField] ? remapClient(d[col.clientField]) : d[col.clientField];
        const newBusinessId = d[col.businessField] ? remapBusiness(d[col.businessField]) : d[col.businessField];
        if (newClientId !== d[col.clientField] || newBusinessId !== d[col.businessField]) {
          const updates: Record<string, string> = {};
          if (newClientId !== d[col.clientField]) updates[col.clientField] = newClientId;
          if (newBusinessId !== d[col.businessField]) updates[col.businessField] = newBusinessId;
          batch.update(doc.ref, updates);
          batchCount++;
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
    }

    // 4. Update leads (linkedClientId, linkedBusinessId)
    const leadsSnap = await db.collection('leads').get();
    for (const doc of leadsSnap.docs) {
      const d = doc.data();
      const updates: Record<string, string> = {};
      if (d.linkedClientId && clientOldToNew.has(d.linkedClientId)) {
        updates.linkedClientId = remapClient(d.linkedClientId);
      }
      if (d.linkedBusinessId && businessOldToNew.has(d.linkedBusinessId)) {
        updates.linkedBusinessId = remapBusiness(d.linkedBusinessId);
      }
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // 5. Migrate client_business_balances
    const cbbSnap = await db.collection('client_business_balances').get();
    for (const doc of cbbSnap.docs) {
      const d = doc.data();
      const oldClientId = d.clientId as string;
      const oldBusinessId = d.businessId as string;
      const newClientId = remapClient(oldClientId);
      const newBusinessId = remapBusiness(oldBusinessId);
      if (newClientId !== oldClientId || newBusinessId !== oldBusinessId) {
        const newId = `${newClientId}_${newBusinessId}`;
        batch.set(db.collection('client_business_balances').doc(newId), { ...d, clientId: newClientId, businessId: newBusinessId });
        batch.delete(doc.ref);
        batchCount += 2;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // 6. Migrate finance_customers (doc id = clientId or businessId)
    const fcSnap = await db.collection('finance_customers').get();
    for (const doc of fcSnap.docs) {
      const oldId = doc.id;
      const newClientId = clientOldToNew.get(oldId);
      const newBusinessId = businessOldToNew.get(oldId);
      const newId = newClientId ?? newBusinessId;
      if (newId) {
        batch.set(db.collection('finance_customers').doc(newId), { ...doc.data(), id: newId });
        batch.delete(doc.ref);
        batchCount += 2;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // 7. Delete old client documents (only if old ID differs from new ID)
    for (const c of clients) {
      const newId = clientOldToNew.get(c.id)!;
      if (c.id !== newId) {
        batch.delete(db.collection('clients').doc(c.id));
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    // 8. Delete old business documents (only if old ID differs from new ID)
    for (const b of businesses) {
      const newId = businessOldToNew.get(b.id)!;
      if (b.id !== newId) {
        batch.delete(db.collection('businesses').doc(b.id));
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) await batch.commit();

    // 9. Update counters
    const clientCounterRef = db.collection('counters').doc(`${CLIENT_ID_PREFIX.toLowerCase()}_counter`);
    const businessCounterRef = db.collection('counters').doc(`${BUSINESS_ID_PREFIX.toLowerCase()}_counter`);
    await db.runTransaction(async (tx) => {
      tx.set(clientCounterRef, { count: clients.length, deleted_ids: [] }, { merge: true });
      tx.set(businessCounterRef, { count: businesses.length, deleted_ids: [] }, { merge: true });
    });

    return {
      clientsResequenced: clients.length,
      businessesResequenced: businesses.length,
      errors,
    };
  } catch (e) {
    errors.push((e as Error).message);
    throw new Error(`Resequence failed: ${(e as Error).message}`);
  }
};

// Myanmar timezone (UTC+6:30) helpers for consistent storage/display (used for some legacy/export fields)
const MYANMAR_TZ_OFFSET_MINUTES = 390;
const toMyanmarISOString = (date: Date): string => {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    const myMs = utcMs + MYANMAR_TZ_OFFSET_MINUTES * 60 * 1000;
    return new Date(myMs).toISOString().replace('Z', '+06:30');
};
const getMyanmarISOString = (): string => toMyanmarISOString(new Date());

// Helper function to convert Firestore Timestamps to ISO strings in nested objects.
// Uses UTC ISO to avoid device timezone; UI should use formatDateTimeForDisplay with Asia/Yangon for display.
const convertTimestamps = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (data instanceof firebase.firestore.Timestamp) return data.toDate().toISOString();
    if (Array.isArray(data)) return data.map(convertTimestamps);
    if (typeof data === 'object') {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = convertTimestamps(data[key]);
        }
        return newData;
    }
    return data;
};

/** Firestore rejects `undefined` field values — strip before writes. */
const omitUndefinedFields = <T extends Record<string, unknown>>(data: T): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) result[key] = value;
    }
    return result;
};

// --- API FUNCTIONS ---

// Auth
export const apiLogin = async (usernameOrEmail: string, password: string): Promise<firebase.auth.UserCredential> => {
  let email = usernameOrEmail;

  // If it's not an email, it's a username. Find the email for that username.
  if (!usernameOrEmail.includes('@')) {
    const q = db.collection("users").where("username", "==", usernameOrEmail);
    const querySnapshot = await q.get();
    if (querySnapshot.empty) {
      console.error(`User with username '${usernameOrEmail}' not found.`);
      throw new Error("User not found");
    }
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    if (!userData.email) {
        console.error(`User with username '${usernameOrEmail}' found, but has no email.`);
        throw new Error("User has no email");
    }
    email = userData.email;
  }
  
  return auth.signInWithEmailAndPassword(email, password);
};

export const apiLogout = async (): Promise<void> => {
  await auth.signOut();
};

export const apiChangePassword = async (newPassword: string): Promise<boolean> => {
  if (auth.currentUser) {
    try {
      // Update password in Firebase Auth
      await auth.currentUser.updatePassword(newPassword);
      
      // Also update the 'requiresPasswordChange' flag in Firestore
      // This is critical for the first-time login flow
      // Use multiple fallback strategies to ensure the flag is updated
      let firestoreUpdateSuccess = false;
      
      // Strategy 1: Try update() first (direct Firestore update)
      try {
        const userRef = db.collection('users').doc(auth.currentUser.uid);
        await userRef.update({ requiresPasswordChange: false });
        firestoreUpdateSuccess = true;
      } catch (updateError: any) {
        console.warn('Firestore update() failed, trying set() with merge:', updateError);
        
        // Strategy 2: Try set() with merge (more lenient)
        try {
          const userRef = db.collection('users').doc(auth.currentUser.uid);
          await userRef.set({ requiresPasswordChange: false }, { merge: true });
          firestoreUpdateSuccess = true;
        } catch (setError: any) {
          console.warn('Firestore set() with merge also failed, trying Cloud Function:', setError);
          
          // Strategy 3: Use Cloud Function (bypasses security rules)
          try {
            const updatePasswordChangeFlag = functions.httpsCallable('updatePasswordChangeFlag');
            await updatePasswordChangeFlag({ userId: auth.currentUser.uid });
            firestoreUpdateSuccess = true;
          } catch (functionError: any) {
            console.warn('Cloud Function also failed:', functionError);
            // If all strategies fail, we still consider it successful
            // because the password was changed in Auth, which is the critical part
            // The requiresPasswordChange flag will be synced on next successful user fetch
          }
        }
      }
      
      if (!firestoreUpdateSuccess) {
        console.warn('All Firestore update strategies failed, but Auth password was updated successfully');
      }
      
      return true; // Password change in Auth succeeded, which is the critical operation
    } catch (error: any) {
      console.error('Password change failed:', error);
      // Only throw if it's an Auth error (not Firestore)
      if (error.code && error.code.startsWith('auth/')) {
        throw error;
      }
      // For other errors, if Auth password was updated, consider it successful
      if (error.code && error.code.startsWith('firestore/')) {
        console.warn('Firestore update failed but Auth password was updated:', error);
        return true; // Password was changed in Auth, Firestore sync will happen on refresh
      }
      throw error;
    }
  }
  return false;
};

export const apiSendPasswordResetEmail = async (email: string): Promise<void> => {
  await auth.sendPasswordResetEmail(email);
};

// Generic helper for fetching collections
const fetchCollection = async <T extends {id: string}>(
    collectionName: string,
    order?: { field: string, direction?: firebase.firestore.OrderByDirection },
    limit?: number
): Promise<T[]> => {
    let query: firebase.firestore.Query = db.collection(collectionName);
    if (order) {
        query = query.orderBy(order.field, order.direction || 'asc');
    }
    if (limit != null && limit > 0) {
        query = query.limit(limit);
    }
    const snapshot = await query.get();
    const results = snapshot.docs.map(doc => convertTimestamps({ ...doc.data(), id: doc.id }) as T);
    
    return results;
};

// Generic helper for fetching a document by ID
const fetchDocumentById = async <T extends {id: string}>(collectionName: string, id: string | number): Promise<T | null> => {
    const docSnap = await db.collection(collectionName).doc(String(id)).get();
    if (!docSnap.exists) return null;
    
    const data = convertTimestamps({ ...docSnap.data(), id: docSnap.id }) as T;
    
    return data;
};

// New helper for singleton documents without an 'id' field in their data
const fetchSingletonDocument = async <T,>(collectionName: string, docId: string): Promise<T | null> => {
    const docSnap = await db.collection(collectionName).doc(docId).get();
    return docSnap.exists ? convertTimestamps(docSnap.data()) as T : null;
};


// Generic helper for adding a document
const addDocument = async <T extends {id: string}>(collectionName: string, data: Partial<T>, idPrefix?: string, addTimestamps: boolean = true): Promise<T> => {
    // Remove undefined values as Firestore doesn't accept them
    const cleanData: any = {};
    Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined) {
            cleanData[key] = value;
        }
    });
    
    if (addTimestamps) {
        cleanData.createdAt = getMyanmarISOString();
        cleanData.updatedAt = getMyanmarISOString();
    }

    if (idPrefix) {
        const newId = await getNextId(idPrefix);
        cleanData.id = newId; // Ensure stored document has correct id
        await db.collection(collectionName).doc(newId).set(cleanData);
        const docSnap = await db.collection(collectionName).doc(newId).get();
        return convertTimestamps({ ...docSnap.data(), id: docSnap.id }) as T;
    } else {
        const docRef = await db.collection(collectionName).add(cleanData);
        const docSnap = await docRef.get();
        return convertTimestamps({ id: docRef.id, ...docSnap.data() }) as T;
    }
};

// Generic helper for updating a document
const updateDocument = async <T>(collectionName: string, id: string | number, data: Partial<T>): Promise<void> => {
    // Remove undefined values as Firestore doesn't accept them
    const cleanData: any = {};
    Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined) {
            cleanData[key] = value;
        }
    });
    cleanData.updatedAt = getMyanmarISOString();
    const docRef = db.collection(collectionName).doc(String(id));
    await docRef.update(cleanData);
};

// Generic helper for deleting a document
const deleteDocument = async (collectionName: string, id: string | number): Promise<void> => {
    await db.collection(collectionName).doc(String(id)).delete();
};

// Generic helper for querying a collection by a single field
const fetchCollectionByField = async <T extends {id: string}>(collectionName: string, field: string, value: string): Promise<T[]> => {
    const query: firebase.firestore.Query = db.collection(collectionName).where(field, '==', value);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => convertTimestamps({ ...doc.data(), id: doc.id }) as T);
};


// Users (Employees)
export const apiGetUsers = async (): Promise<User[]> => {
    return await fetchCollection<Employee>('users');
};
export const apiGetUserById = (userId: string): Promise<Employee | null> => fetchDocumentById<Employee>('users', userId);
export const apiGetEmployees = apiGetUsers as () => Promise<Employee[]>;
export const apiGetEmployeeById = apiGetUserById;
export const apiUpdateUser = async (userData: Partial<User> & {id: string}) => {
    const result = await updateDocument<User>('users', userData.id, userData);
    void logActivityHelper('Users', 'Update', `Updated user: ${userData.name || userData.id}`, userData.id);
    return result;
};

export const apiClearUserPermissionOverride = (userId: string): Promise<void> => {
    const userRef = db.collection('users').doc(userId);
    return userRef.update({
        permissions: firebase.firestore.FieldValue.delete(),
        updatedAt: getMyanmarISOString()
    });
};

export const apiListenToUsers = (
    callback: (users: User[]) => void, 
    onError: (error: Error) => void
): (() => void) => {
    const query = db.collection('users').limit(500);
    
    const unsubscribe = query.onSnapshot(
        (snapshot) => {
            const users = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as User);
            callback(users);
        },
        (error) => {
            console.error("Error listening to users collection:", error);
            onError(error);
        }
    );

    return unsubscribe;
};

export const apiAddEmployee = async (employeeData: Omit<Employee, 'id' | 'username'> & { tempPassword?: string; facePhotoFile?: File | null; nrcFrontPhotoFile?: File | null; nrcBackPhotoFile?: File | null; }): Promise<Employee> => {
    const { tempPassword, facePhotoFile, nrcFrontPhotoFile, nrcBackPhotoFile, ...restData } = employeeData;
    
    if (employeeData.hasLoginAccess && !tempPassword) {
        throw new Error("A temporary password is required to create an employee with login access.");
    }

    // Validate employee ID is provided
    if (!employeeData.employeeId || !employeeData.employeeId.trim()) {
        throw new Error("Employee ID is required.");
    }

    // Check for duplicate employee ID
    const existingEmployees = await apiGetEmployees();
    const duplicateEmployee = existingEmployees.find(emp => emp.employeeId === employeeData.employeeId.trim());
    if (duplicateEmployee) {
        throw new Error(`Employee ID "${employeeData.employeeId}" already exists. Please use a different ID.`);
    }

    let newId: string;
    let secondaryApp: firebase.app.App | null = null;
    let secondaryAuth: firebase.auth.Auth | null = null;
    let authUserCreated = false;

    try {
        if (employeeData.hasLoginAccess) {
            // Use a secondary Firebase app to create the user without logging out the admin
            try {
                secondaryApp = firebase.app('secondary-auth-app');
            } catch (e) {
                secondaryApp = firebase.initializeApp(mainApp.options, 'secondary-auth-app');
            }
            
            secondaryAuth = secondaryApp.auth();
            const userCredential = await secondaryAuth.createUserWithEmailAndPassword(employeeData.email, tempPassword!);
            newId = userCredential.user!.uid;
            authUserCreated = true;

            // Sign out the new user from the secondary app instance to avoid session conflicts
            await secondaryAuth.signOut();
        } else {
            // For non-login users, we still need a document in the 'users' collection.
            // We'll let Firestore generate an ID for it.
            newId = db.collection("users").doc().id;
        }

        const [facePhotoUrl, nrcFrontPhotoUrl, nrcBackPhotoUrl] = await Promise.all([
            facePhotoFile ? apiUploadFile(facePhotoFile, `employees/${newId}/facePhoto.jpg`) : Promise.resolve(undefined),
            nrcFrontPhotoFile ? apiUploadFile(nrcFrontPhotoFile, `employees/${newId}/nrcFrontPhoto.jpg`) : Promise.resolve(undefined),
            nrcBackPhotoFile ? apiUploadFile(nrcBackPhotoFile, `employees/${newId}/nrcBackPhoto.jpg`) : Promise.resolve(undefined),
        ]);

        const employeeIdTrimmed = employeeData.employeeId.trim();
        
        const newEmployee: Omit<Employee, 'id'> = {
            ...restData,
            username: employeeData.name.split(' ')[0].toLowerCase() + employeeIdTrimmed.slice(-3),
            employeeId: employeeIdTrimmed,
            facePhotoUrl,
            nrcFrontPhotoUrl,
            nrcBackPhotoUrl,
        };
        
        // Sanitize the object to remove any 'undefined' values before setting to Firestore
        const sanitizedEmployeeData = Object.entries(newEmployee).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                (acc as any)[key] = value;
            }
            return acc;
        }, {} as Omit<Employee, 'id'>);

        await db.collection("users").doc(newId).set({
            ...sanitizedEmployeeData,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });

        const result = { ...newEmployee, id: newId };
        void logActivityHelper('HR', 'Create Employee', `Added employee: ${result.name} (${result.employeeId})`, result.id, { employeeId: result.employeeId, department: result.department });
        return result;
    } catch (error: any) {
        // If Auth user was created but Firestore save failed, try to clean up the Auth user
        if (authUserCreated && newId && secondaryAuth) {
            try {
                // Re-authenticate to delete the user (we need admin privileges for this)
                // Note: Client-side deletion requires recent sign-in, so we'll log an error instead
                console.error(`Failed to save employee to Firestore. Auth user ${newId} was created but not saved. Manual cleanup may be required.`, error);
            } catch (cleanupError) {
                console.error('Failed to cleanup Auth user:', cleanupError);
            }
        }
        
        // Re-throw the original error
        throw error;
    }
};

export const apiUpdateEmployee = async (employeeData: Partial<Employee> & { id: string, facePhotoFile?: File | null, nrcFrontPhotoFile?: File | null, nrcBackPhotoFile?: File | null }): Promise<Employee> => {
    const { id, facePhotoFile, nrcFrontPhotoFile, nrcBackPhotoFile, ...restData } = employeeData;
    const employeeRef = db.collection('users').doc(id);
    const existingDoc = await employeeRef.get();
    if (!existingDoc.exists) {
        throw new Error("Employee record not found.");
    }
    const existingEmployee = convertTimestamps({ id, ...existingDoc.data() }) as Employee;

    if (restData.employeeId !== undefined) {
        const employeeIdTrimmed = restData.employeeId.trim();
        if (!employeeIdTrimmed) {
            throw new Error("Employee ID is required.");
        }
        if (employeeIdTrimmed !== existingEmployee.employeeId) {
            const existingEmployees = await apiGetEmployees();
            const duplicateEmployee = existingEmployees.find(
                emp => emp.employeeId === employeeIdTrimmed && emp.id !== id
            );
            if (duplicateEmployee) {
                throw new Error(`Employee ID "${employeeIdTrimmed}" already exists. Please use a different ID.`);
            }
        }
        restData.employeeId = employeeIdTrimmed;
        const nameForUsername = restData.name ?? existingEmployee.name;
        if (nameForUsername) {
            restData.username = nameForUsername.split(' ')[0].toLowerCase() + employeeIdTrimmed.slice(-3);
        }
    }
    
    const [facePhotoUrl, nrcFrontPhotoUrl, nrcBackPhotoUrl] = await Promise.all([
        facePhotoFile ? apiUploadFile(facePhotoFile, `employees/${id}/facePhoto.jpg`) : Promise.resolve(undefined),
        nrcFrontPhotoFile ? apiUploadFile(nrcFrontPhotoFile, `employees/${id}/nrcFrontPhoto.jpg`) : Promise.resolve(undefined),
        nrcBackPhotoFile ? apiUploadFile(nrcBackPhotoFile, `employees/${id}/nrcBackPhoto.jpg`) : Promise.resolve(undefined),
    ]);
    
    const updatePayload: Partial<Employee> = { ...restData };
    if (facePhotoUrl) updatePayload.facePhotoUrl = facePhotoUrl;
    if (nrcFrontPhotoUrl) updatePayload.nrcFrontPhotoUrl = nrcFrontPhotoUrl;
    if (nrcBackPhotoUrl) updatePayload.nrcBackPhotoUrl = nrcBackPhotoUrl;

    await updateDocument('users', id, updatePayload);
    
    const updatedDoc = await employeeRef.get();
    const result = convertTimestamps({ id, ...updatedDoc.data() }) as Employee;
    void logActivityHelper('HR', 'Update Employee', `Updated employee: ${result.name} (${result.employeeId})`, result.id);
    return result;
};

export const apiDeleteEmployee = async (employeeId: string, currentUserId: string): Promise<void> => {
    if (employeeId === currentUserId) {
        throw new Error("You cannot delete your own account.");
    }
    // This only deletes the Firestore document. The associated Firebase Auth user
    // must be deleted separately, typically via the Firebase Console or a backend function,
    // as client-side user deletion requires recent sign-in.
    await deleteDocument('users', employeeId);
    void logActivityHelper('HR', 'Delete Employee', `Deleted employee: ${employeeId}`, employeeId);

    // Also delete associated files from storage.
    const photoPaths = [`employees/${employeeId}/facePhoto`, `employees/${employeeId}/nrcFrontPhoto`, `employees/${employeeId}/nrcBackPhoto`];
    for (const path of photoPaths) {
        try {
            await storage.ref(path).delete();
        } catch (error: any) {
            // It's okay if the file doesn't exist, so we ignore 'storage/object-not-found'
            if (error.code !== 'storage/object-not-found') {
                console.warn(`Could not delete storage file ${path}:`, error);
            }
        }
    }
};

export const apiProcessEmployeeImport = async (data: ParsedEmployeeExcelRow[]): Promise<EmployeeImportResult> => {
    const results: EmployeeImportResult = { employeesAdded: 0, employeesUpdated: 0, errors: [], warnings: [] };

    const [initialEmployees, initialDepartments] = await Promise.all([apiGetEmployees(), apiGetDepartments()]);
    const employeeIdMap = new Map(initialEmployees.map(e => [e.employeeId, e]));
    const employeeEmailMap = new Map(initialEmployees.map(e => [e.email.toLowerCase(), e]));
    const departmentNameMap = new Map(initialDepartments.map(d => [d.name.toLowerCase(), d.id]));

    for (const row of data) {
        try {
            // --- VALIDATION ---
            if (!row.name) throw new Error("Full Name is required.");
            if (row.hasLoginAccess && !row.email) throw new Error("'Login Email' is required when 'Has Login Access' is TRUE.");
            if (!row.departmentName || !departmentNameMap.has(row.departmentName.toLowerCase())) {
                throw new Error(`Department "${row.departmentName}" not found. Please create it in Settings first.`);
            }
            if (row.role && !Object.values(UserRole).includes(row.role)) {
                throw new Error(`Invalid Role: "${row.role}". Valid roles are: ${Object.values(UserRole).join(', ')}`);
            }
            if (row.employeeStatus && !Object.values(EmployeeStatus).includes(row.employeeStatus)) {
                throw new Error(`Invalid Status: "${row.employeeStatus}". Valid statuses are: ${Object.values(EmployeeStatus).join(', ')}`);
            }
            
            const existingEmployeeById = row.employeeId ? employeeIdMap.get(row.employeeId) : null;
            const existingEmployeeByEmail = row.email ? employeeEmailMap.get(row.email.toLowerCase()) : null;
            
            // An employee can be identified by ID or Email for updates.
            const employeeToUpdate = existingEmployeeById || existingEmployeeByEmail;

            if (employeeToUpdate) {
                // --- UPDATE LOGIC ---
                const departmentId = row.departmentName ? departmentNameMap.get(row.departmentName.toLowerCase()) : undefined;
                const updatePayload: Partial<Employee> & { id: string } = {
                    id: employeeToUpdate.id,
                    ...(row.name !== undefined && { name: row.name }),
                    ...(row.email !== undefined && { email: row.email }),
                    ...(row.role !== undefined && { role: row.role as UserRole }),
                    ...(departmentId !== undefined && { departmentId: departmentId, department: row.departmentName! }),
                    ...(row.jobTitle !== undefined && { jobTitle: row.jobTitle }),
                    ...(row.joiningDate !== undefined && { joiningDate: row.joiningDate }),
                    ...(row.employeeStatus !== undefined && { employeeStatus: row.employeeStatus as EmployeeStatus }),
                    ...(row.basicPay !== undefined && { basicPay: Number(row.basicPay) }),
                    ...(row.paymentType !== undefined && { paymentType: row.paymentType as 'Monthly' | 'Weekly' | 'Daily' }),
                    ...(row.hasLoginAccess !== undefined && { hasLoginAccess: row.hasLoginAccess }),
                    ...(row.personalPhone !== undefined && { personalPhone: row.personalPhone }),
                    ...(row.dateOfBirth !== undefined && { dateOfBirth: row.dateOfBirth }),
                    ...(row.gender !== undefined && { gender: row.gender as any }),
                    ...(row.maritalStatus !== undefined && { maritalStatus: row.maritalStatus as any }),
                    ...(row.nationality !== undefined && { nationality: row.nationality }),
                    ...(row.address !== undefined && { address: row.address }),
                    ...(row.nrcNumber !== undefined && { nrcNumber: row.nrcNumber }),
                    ...(row.annualLeaveEntitlement !== undefined && { annualLeaveEntitlement: Number(row.annualLeaveEntitlement) }),
                    ...(row.casualLeaveEntitlement !== undefined && { casualLeaveEntitlement: Number(row.casualLeaveEntitlement) }),
                    ...(row.transportationAllowance !== undefined && { transportationAllowance: Number(row.transportationAllowance) }),
                    ...(row.emergencyContactName !== undefined && { emergencyContactName: row.emergencyContactName }),
                    ...(row.emergencyContactPhone !== undefined && { emergencyContactPhone: row.emergencyContactPhone }),
                    ...(row.bankAccountNumber !== undefined && { bankAccountNumber: row.bankAccountNumber }),
                    ...(row.bankName !== undefined && { bankName: row.bankName }),
                };
                await apiUpdateEmployee(updatePayload);
                results.employeesUpdated++;
            } else {
                // --- CREATE LOGIC ---
                if (row.email && employeeEmailMap.has(row.email.toLowerCase())) {
                    throw new Error(`An employee with email "${row.email}" already exists.`);
                }
                
                // Validate employee ID is provided
                if (!row.employeeId || !row.employeeId.trim()) {
                    throw new Error(`Employee ID is required for row ${row.rowIndex + 1}.`);
                }
                
                // Check for duplicate employee ID
                if (employeeIdMap.has(row.employeeId.trim())) {
                    throw new Error(`Employee ID "${row.employeeId}" already exists.`);
                }
                
                const departmentId = departmentNameMap.get(row.departmentName!.toLowerCase())!;
                
                let passwordForNewUser = row.initialPassword;
                if (row.hasLoginAccess && !passwordForNewUser) {
                    passwordForNewUser = 'MarketingCapsule@123';
                    results.warnings!.push({ row: row.rowIndex, message: `No password provided. Default password 'MarketingCapsule@123' has been set.` });
                }

                const createPayload: Omit<Employee, 'id' | 'username'> & { tempPassword?: string } = {
                    employeeId: row.employeeId.trim(),
                    name: row.name!,
                    email: row.email!,
                    role: (row.role || UserRole.STAFF) as UserRole,
                    department: row.departmentName!,
                    departmentId: departmentId,
                    jobTitle: row.jobTitle!,
                    joiningDate: row.joiningDate || getTodayInYangon(),
                    employeeStatus: (row.employeeStatus || EmployeeStatus.ON_PROBATION) as EmployeeStatus,
                    basicPay: Number(row.basicPay) || 0,
                    paymentType: (row.paymentType || 'Monthly') as 'Monthly' | 'Weekly' | 'Daily',
                    hasLoginAccess: row.hasLoginAccess === undefined ? true : row.hasLoginAccess,
                    requiresPasswordChange: true,
                    tempPassword: passwordForNewUser,
                    personalPhone: row.personalPhone,
                    dateOfBirth: row.dateOfBirth,
                    gender: row.gender as any,
                    maritalStatus: row.maritalStatus as any,
                    nationality: row.nationality,
                    address: row.address,
                    nrcNumber: row.nrcNumber,
                    annualLeaveEntitlement: Number(row.annualLeaveEntitlement) || 0,
                    casualLeaveEntitlement: Number(row.casualLeaveEntitlement) || 0,
                    transportationAllowance: Number(row.transportationAllowance) || 0,
                    emergencyContactName: row.emergencyContactName,
                    emergencyContactPhone: row.emergencyContactPhone,
                    bankAccountNumber: row.bankAccountNumber,
                    bankName: row.bankName,
                };
                await apiAddEmployee(createPayload);
                // Add to map to prevent duplicates within the same import batch
                employeeIdMap.set(row.employeeId.trim(), { id: '', employeeId: row.employeeId.trim() } as Employee);
                results.employeesAdded++;
            }
        } catch (error) {
            results.errors.push({ row: row.rowIndex, message: (error as Error).message });
        }
    }
    
    return results;
};

// Leads
export const apiGetLeads = (limit?: number): Promise<Lead[]> => fetchCollection<Lead>('leads', { field: 'createdAt', direction: 'desc' }, limit);
export const apiGetLeadById = (id: string): Promise<Lead | null> => fetchDocumentById<Lead>('leads', id);
export const apiGetLeadsForEmployee = async (employeeId: string): Promise<Lead[]> => {
    const [assignedSnap, createdSnap] = await Promise.all([
        db.collection('leads').where('assignedTo', '==', employeeId).get(),
        db.collection('leads').where('createdByUserId', '==', employeeId).get(),
    ]);
    const seen = new Set<string>();
    const merged: Lead[] = [];
    [...assignedSnap.docs, ...createdSnap.docs].forEach(doc => {
        if (!seen.has(doc.id)) {
            seen.add(doc.id);
            merged.push(convertTimestamps({ id: doc.id, ...doc.data() }) as Lead);
        }
    });
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
export const apiAddLead = async (leadData: Omit<Lead, 'id'|'createdAt'|'updatedAt'>): Promise<Lead> => {
  const lead = await addDocument<Lead>('leads', leadData as Partial<Lead>, LEAD_ID_PREFIX);
  void logActivityHelper('Leads', 'Create Lead', `Created lead: ${lead.name}`, lead.id, {
    status: lead.status,
    assignedTo: lead.assignedTo,
    source: lead.leadSource,
  });
  return lead;
};
export const apiUpdateLead = async (leadData: Partial<Lead> & {id: string}): Promise<Lead> => {
  await updateDocument<Lead>('leads', leadData.id, leadData);
  const updated = (await apiGetLeadById(leadData.id))!;
  void logActivityHelper('Leads', 'Update Lead', `Updated lead: ${updated.name}`, updated.id, leadData);
  return updated;
};
export const apiDeleteLead = async (leadId: string): Promise<void> => {
  await deleteDocument('leads', leadId);
  void logActivityHelper('Leads', 'Delete Lead', `Deleted lead: ${leadId}`, leadId);
};

export const apiListenToLeads = (
    callback: (leads: Lead[]) => void, 
    onError: (error: Error) => void
): (() => void) => {
    const query = db.collection('leads').orderBy('createdAt', 'desc').limit(200);
    
    const unsubscribe = query.onSnapshot(
        (snapshot) => {
            const leads = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Lead);
            callback(leads);
        },
        (error) => {
            console.error("Error listening to leads collection:", error);
            onError(error);
        }
    );

    return unsubscribe;
};

export const apiGetLeadActivityFeed = async (options?: {
    leadId?: string;
    type?: LeadActivityType;
    startDate?: string;
    endDate?: string;
    limit?: number;
}): Promise<LeadActivity[]> => {
    const { leadId, type, startDate, endDate, limit = 200 } = options || {};
    let query: firebase.firestore.Query = db.collection('lead_activities').orderBy('timestamp', 'desc');

    if (leadId) {
        query = query.where('leadId', '==', leadId);
    }
    if (type) {
        query = query.where('type', '==', type);
    }
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query = query.where('timestamp', '>=', start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.where('timestamp', '<=', end);
    }

    const snapshot = await query.limit(limit).get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as LeadActivity);
};

export const apiGetLeadSettings = async (): Promise<LeadSettings> => {
    const docRef = db.collection('lead_settings').doc('global');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        await docRef.set({
            ...DEFAULT_LEAD_SETTINGS,
            updatedAt: getMyanmarISOString(),
            updatedBy: auth.currentUser?.uid || 'system',
        });
        return DEFAULT_LEAD_SETTINGS;
    }
    return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as LeadSettings;
};

export const apiUpdateLeadSettings = async (data: Partial<LeadSettings>): Promise<LeadSettings> => {
    const docRef = db.collection('lead_settings').doc('global');
    const payload = {
        ...data,
        updatedAt: getMyanmarISOString(),
        updatedBy: auth.currentUser?.uid || 'system',
    };
    await docRef.set(payload, { merge: true });
    const updatedSnap = await docRef.get();
    const updatedSettings = convertTimestamps({ id: updatedSnap.id, ...updatedSnap.data() }) as LeadSettings;
    void logActivityHelper('Leads', 'Update Lead Settings', 'Updated lead automation settings', updatedSettings.id, data);
    return updatedSettings;
};

// --- ATTENDANCE RULES SETTINGS API ---

export const apiGetAttendanceRulesSettings = async (): Promise<AttendanceRulesSettings> => {
    const docRef = db.collection('attendance_rules_settings').doc('global');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        await docRef.set({
            ...DEFAULT_ATTENDANCE_RULES_SETTINGS,
            updatedAt: getMyanmarISOString(),
            updatedBy: auth.currentUser?.uid || 'system',
        });
        return DEFAULT_ATTENDANCE_RULES_SETTINGS;
    }
    return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as AttendanceRulesSettings;
};

export const apiUpdateAttendanceRulesSettings = async (data: Partial<AttendanceRulesSettings>): Promise<AttendanceRulesSettings> => {
    const docRef = db.collection('attendance_rules_settings').doc('global');
    const payload = {
        ...data,
        updatedAt: getMyanmarISOString(),
        updatedBy: auth.currentUser?.uid || 'system',
    };
    await docRef.set(payload, { merge: true });
    const updatedSnap = await docRef.get();
    const updatedSettings = convertTimestamps({ id: updatedSnap.id, ...updatedSnap.data() }) as AttendanceRulesSettings;
    void logActivityHelper('HR', 'Update Attendance Rules', 'Updated attendance rules settings', updatedSettings.id, data);
    return updatedSettings;
};

export const apiConvertLeadToClientAndBusiness = async (
  leadId: string, 
  clientName: string, 
  businessName: string, 
  inChargeUserId: string
): Promise<{ client: Client, business: Business, updatedLead: Lead }> => {
  const batch = db.batch();
  
  const leadRef = db.collection('leads').doc(leadId);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    throw new Error("Lead not found to convert.");
  }
  const leadData = { id: leadSnap.id, ...leadSnap.data() } as Lead;

  // Update lead status
  batch.update(leadRef, { status: LeadStatus.CLOSED_WON, updatedAt: getMyanmarISOString() } as any);

  // Create new Client and Business
  const newClientId = await getNextId(CLIENT_ID_PREFIX);
  const newBusinessId = await getNextId(BUSINESS_ID_PREFIX);

  const clientRef = db.collection('clients').doc(newClientId);
  const newClientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
    name: clientName,
    phone: leadData.phone,
    email: leadData.email,
    linkedBusinessIds: [newBusinessId],
    personalFbLink: leadData.personalFbLink,
    viberTelegram: leadData.viberTelegram,
    balance: 0,
    // Client address is not populated from lead, assumed to be personal and different.
  };
  batch.set(clientRef, { ...newClientData, createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString() } as any);

  const businessRef = db.collection('businesses').doc(newBusinessId);
  const newBusinessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> = {
    name: businessName,
    industry: leadData.businessType,
    phone: leadData.phone, // can be different, but for now we copy from lead contact
    email: leadData.email, // same as above
    address: leadData.address,
    city: leadData.city,
    state: leadData.state,
    country: leadData.country,
    linkedClientIds: [newClientId],
    businessPageUrl: leadData.businessPageUrl,
    websiteUrl: leadData.websiteUrl,
    balance: 0,
  };
  batch.set(businessRef, { ...newBusinessData, createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString() } as any);
  
  // Add a conversion activity log
  const activityRef = db.collection('lead_activities').doc();
  const conversionActivity: Omit<LeadActivity, 'id' | 'timestamp'> = {
      leadId: leadId,
      userId: inChargeUserId,
      type: LeadActivityType.CONVERSION,
      notes: `Converted to Client: ${clientName} (${newClientId}) and Business: ${businessName} (${newBusinessId}).`,
  };
  batch.set(activityRef, { ...conversionActivity, timestamp: getMyanmarISOString() } as any);

  // Commit transaction
  await batch.commit();

  // Fetch the newly created docs to get their server-generated timestamps converted to strings
  const [clientSnap, businessSnap, updatedLeadSnap] = await Promise.all([
      clientRef.get(),
      businessRef.get(),
      leadRef.get()
  ]);

  const client = convertTimestamps({ id: clientSnap.id, ...clientSnap.data() }) as Client;
  const business = convertTimestamps({ id: businessSnap.id, ...businessSnap.data() }) as Business;
  const updatedLead = convertTimestamps({ id: updatedLeadSnap.id, ...updatedLeadSnap.data() }) as Lead;
  void logActivityHelper('Leads', 'Convert Lead', `Converted lead ${leadData.name} to client ${client.name} & business ${business.name}`, leadId, {
      clientId: client.id,
      businessId: business.id,
  });
  return { client, business, updatedLead };
};


// Clients & Businesses
export const apiGetClients = (): Promise<Client[]> => fetchCollection('clients');
export const apiGetBusinesses = (): Promise<Business[]> => fetchCollection('businesses');
export const apiGetClientById = (id: string): Promise<Client | null> => fetchDocumentById<Client>('clients', id);
export const apiGetBusinessById = (id: string): Promise<Business | null> => fetchDocumentById<Business>('businesses', id);

export const apiGetClientsByIds = async (ids: string[]): Promise<Client[]> => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const results = await Promise.all(unique.map((id) => apiGetClientById(id)));
    return results.filter((c): c is Client => c != null);
};

export const apiGetBusinessesByIds = async (ids: string[]): Promise<Business[]> => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const results = await Promise.all(unique.map((id) => apiGetBusinessById(id)));
    return results.filter((b): b is Business => b != null);
};

/** Prefix search on document ID (1 read per matched doc). */
export const apiSearchByDocumentIdPrefix = async <T extends { id: string }>(
    collectionName: string,
    prefix: string,
    limit = 10
): Promise<T[]> => {
    const normalized = prefix.trim();
    if (!normalized) return [];
    const snapshot = await db.collection(collectionName)
        .orderBy(firebase.firestore.FieldPath.documentId())
        .startAt(normalized)
        .endAt(normalized + '\uf8ff')
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => convertTimestamps({ ...doc.data(), id: doc.id }) as T);
};

export const apiSearchClientsByNamePrefix = async (prefix: string, limit = 5): Promise<Client[]> => {
    const term = prefix.trim();
    if (!term) return [];
    const snapshot = await db.collection('clients')
        .orderBy('name')
        .startAt(term)
        .endAt(term + '\uf8ff')
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => convertTimestamps({ ...doc.data(), id: doc.id }) as Client);
};

export const apiSearchBusinessesByNamePrefix = async (prefix: string, limit = 5): Promise<Business[]> => {
    const term = prefix.trim();
    if (!term) return [];
    const snapshot = await db.collection('businesses')
        .orderBy('name')
        .startAt(term)
        .endAt(term + '\uf8ff')
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => convertTimestamps({ ...doc.data(), id: doc.id }) as Business);
};

export const apiSearchUsersByNamePrefix = async (prefix: string, limit = 5): Promise<User[]> => {
    const term = prefix.trim();
    if (!term) return [];
    const snapshot = await db.collection('users')
        .orderBy('name')
        .startAt(term)
        .endAt(term + '\uf8ff')
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => convertTimestamps({ id: doc.id, ...doc.data() }) as User);
};

export const apiAddBusiness = async (businessData: Omit<Business, 'id'|'createdAt'|'updatedAt'>, isInternal: boolean = false): Promise<Business> => {
    // 1. Create the business document first.
    let newBusiness: Business;
    if (isInternal) {
        // Use internal ID directly
        const businessRef = db.collection('businesses').doc(BUSINESS_ID_INTERNAL);
        const businessSnap = await businessRef.get();
        
        if (businessSnap.exists) {
            // Update existing internal business
            await businessRef.update({
                ...businessData,
                updatedAt: getMyanmarISOString(),
            });
        } else {
            // Create new internal business
            await businessRef.set({
                ...businessData,
                id: BUSINESS_ID_INTERNAL,
                createdAt: getMyanmarISOString(),
                updatedAt: getMyanmarISOString(),
            });
        }
        newBusiness = (await apiGetBusinessById(BUSINESS_ID_INTERNAL))!;
    } else {
        newBusiness = await addDocument<Business>(
            'businesses', 
            businessData as Partial<Business>, 
            BUSINESS_ID_PREFIX
        );
    }

    // 2. If there are clients to link, update them to link back to the new business.
    if (businessData.linkedClientIds && businessData.linkedClientIds.length > 0) {
        const linkPromises = businessData.linkedClientIds.map(clientId => 
            db.collection('clients').doc(clientId).update({
                linkedBusinessIds: firebase.firestore.FieldValue.arrayUnion(newBusiness.id)
            })
        );
        await Promise.all(linkPromises);
    }
    
    // 3. Return newly created business (already includes timestamps from addDocument).
    const result = newBusiness;
    void logActivityHelper('Businesses', 'Create', `Created business: ${result.name}`, result.id, { industry: result.industry });
    return result;
};

export const apiAddClient = async (clientData: Omit<Client, 'id'|'createdAt'|'updatedAt'>, newBusinessData?: Partial<Omit<Business, 'id'|'createdAt'|'updatedAt'|'linkedClientIds'>>): Promise<Client> => {
    let businessToLink: Business | null = null;
    let finalLinkedBusinessIds = [...(clientData.linkedBusinessIds || [])];

    if (newBusinessData && newBusinessData.name) {
        const fullNewBusinessData: Omit<Business, 'id'|'createdAt'|'updatedAt'> = {
            name: newBusinessData.name,
            industry: newBusinessData.industry,
            phone: newBusinessData.phone || clientData.phone,
            email: newBusinessData.email || clientData.email,
            address: newBusinessData.address,
            city: newBusinessData.city,
            state: newBusinessData.state,
            country: newBusinessData.country,
            businessPageUrl: newBusinessData.businessPageUrl,
            websiteUrl: newBusinessData.websiteUrl,
            facebookPageId: newBusinessData.facebookPageId,
            linkedClientIds: [],
            balance: 0,
        };
        businessToLink = await apiAddBusiness(fullNewBusinessData, false);
        finalLinkedBusinessIds.push(businessToLink.id);
    }
    
    const newClientData = { ...clientData, linkedBusinessIds: finalLinkedBusinessIds };
    const newClient = await addDocument<Client>('clients', newClientData as Partial<Client>, CLIENT_ID_PREFIX);
    
    if (finalLinkedBusinessIds.length > 0) {
        const linkPromises = finalLinkedBusinessIds.map(businessId => 
            db.collection('businesses').doc(businessId).update({
                linkedClientIds: firebase.firestore.FieldValue.arrayUnion(newClient.id)
            })
        );
        await Promise.all(linkPromises);
    }
    
    const result = newClient;
    void logActivityHelper('Clients', 'Create', `Created client: ${result.name}`, result.id, { clientName: result.name });
    return result;
};

// Helper function to sync opening balance to Accounts Receivable
const syncOpeningBalanceToAR = async (entityId: string, entityName: string, openingBalance: number | undefined, isBusiness: boolean = false) => {
    // Ensure customer exists first
    let customer = (await apiGetFinanceCustomers()).find(c => c.id === entityId);
    if (!customer) {
        customer = await apiSaveFinanceCustomer({
            id: entityId,
            name: entityName,
            currency: 'MMK',
            balance: 0,
        });
    }

    // Check if opening balance AR invoice already exists
    const existingInvoices = await apiGetARInvoices();
    const existingOBInvoice = existingInvoices.find(inv => 
        inv.customerId === entityId &&
        typeof inv.invoiceNumber === 'string' &&
        (inv.invoiceNumber.startsWith(`OB-${entityId}-`) || inv.invoiceNumber === `OB-${entityId}`)
    );

    if (openingBalance === undefined || openingBalance === 0) {
        // If opening balance is 0 or undefined, mark existing invoice as paid
        if (existingOBInvoice && existingOBInvoice.status !== InvoiceStatus.PAID) {
            await apiRecordCustomerReceipt(existingOBInvoice.id, getTodayInYangon());
        }
        return;
    }

    const invoiceDate = existingOBInvoice?.invoiceDate || getTodayInYangon();
    const dueDateIn30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const dueDate = getDateInYangonTimezone(dueDateIn30Days); // 30 days from now in Yangon timezone

    if (existingOBInvoice) {
        // Update existing invoice amount if different
        if (existingOBInvoice.amount !== openingBalance) {
            const oldAmount = existingOBInvoice.amount;
            // Update the invoice in the store directly
            const invoiceIdx = financeStore.arInvoices.findIndex(inv => inv.id === existingOBInvoice.id);
            if (invoiceIdx !== -1) {
                financeStore.arInvoices[invoiceIdx].amount = openingBalance;
                // Update customer balance
                const customerIdx = financeStore.customers.findIndex(c => c.id === entityId);
                if (customerIdx !== -1) {
                    const currentBalance = financeStore.customers[customerIdx].balance || 0;
                    // Adjust balance: subtract old amount, add new amount
                    financeStore.customers[customerIdx].balance = currentBalance - oldAmount + openingBalance;
                }
            }
        }
        // If invoice was marked as paid but opening balance is now set, mark it as sent again
        if (existingOBInvoice.status === InvoiceStatus.PAID && openingBalance > 0) {
            const invoiceIdx = financeStore.arInvoices.findIndex(inv => inv.id === existingOBInvoice.id);
            if (invoiceIdx !== -1) {
                financeStore.arInvoices[invoiceIdx].status = InvoiceStatus.SENT;
                // Update customer balance to reflect unpaid amount (add back the amount)
                const customerIdx = financeStore.customers.findIndex(c => c.id === entityId);
                if (customerIdx !== -1) {
                    financeStore.customers[customerIdx].balance = (financeStore.customers[customerIdx].balance || 0) + openingBalance;
                }
            }
        }
    } else {
        // Create new opening balance AR invoice
        await apiSaveARInvoice({
            invoiceNumber: `OB-${entityId}-${Date.now()}`,
            customerId: entityId,
            invoiceDate: invoiceDate,
            dueDate: dueDate,
            amount: openingBalance,
            currency: 'MMK',
            status: InvoiceStatus.SENT,
        });
    }
};

/**
 * Sync opening balance to client_business_balances for a business.
 * Sets openingBalance on the first linked client-business pair to avoid double-counting.
 */
const syncOpeningBalanceToClientBusinessBalances = async (businessId: string, openingBalance: number): Promise<void> => {
    const business = await apiGetBusinessById(businessId);
    if (!business || !business.linkedClientIds || business.linkedClientIds.length === 0) return;
    const firstClientId = business.linkedClientIds[0];
    const balanceId = `${firstClientId}_${businessId}`;
    const balanceRef = db.collection('client_business_balances').doc(balanceId);
    await balanceRef.set({
        clientId: firstClientId,
        businessId,
        openingBalance,
        updatedAt: getMyanmarISOString(),
    }, { merge: true });
    // Recalculate business total balance so it reflects opening (avoids double-count on display)
    try {
        await apiRecalculateClientBalance(firstClientId, businessId);
    } catch (e) {
        console.error('Failed to recalculate after sync opening balance:', e);
    }
};

export const apiUpdateClient = async (clientData: Partial<Client> & {id: string}) => {
    // Get current client data to check if opening balance changed
    const currentClient = await apiGetClientById(clientData.id);
    const newOpeningBalance = clientData.openingBalance;
    const oldOpeningBalance = currentClient?.openingBalance;

    // If opening balance changed, adjust the balance field to include it
    // This ensures the balance field reflects opening balance for Accounts Receivable
    if (newOpeningBalance !== oldOpeningBalance && currentClient) {
        const openingBalanceDiff = (newOpeningBalance || 0) - (oldOpeningBalance || 0);
        const currentBalance = currentClient.balance || 0;
        // Adjust balance by the difference in opening balance
        // This ensures balance = openingBalance + totalBilled - totalPaid
        clientData.balance = currentBalance + openingBalanceDiff;
    }

    // Sync linkedBusinessIds: update business.linkedClientIds when client's links change
    let toRemoveBusinessIds: string[] = [];
    if (clientData.linkedBusinessIds !== undefined && currentClient) {
        const oldIds = new Set(currentClient.linkedBusinessIds || []);
        const newIds = new Set(clientData.linkedBusinessIds || []);
        const toAdd = clientData.linkedBusinessIds.filter(bId => !oldIds.has(bId));
        toRemoveBusinessIds = (currentClient.linkedBusinessIds || []).filter(bId => !newIds.has(bId));
        const linkPromises: Promise<void>[] = [];
        for (const businessId of toAdd) {
            linkPromises.push(
                db.collection('businesses').doc(businessId).update({
                    linkedClientIds: firebase.firestore.FieldValue.arrayUnion(clientData.id),
                    updatedAt: getMyanmarISOString(),
                })
            );
        }
        for (const businessId of toRemoveBusinessIds) {
            linkPromises.push(
                db.collection('businesses').doc(businessId).update({
                    linkedClientIds: firebase.firestore.FieldValue.arrayRemove(clientData.id),
                    updatedAt: getMyanmarISOString(),
                })
            );
        }
        await Promise.all(linkPromises);
    }

    const result = await updateDocument('clients', clientData.id, clientData);

    // Pair balance & transaction sync when linked businesses change
    if (clientData.linkedBusinessIds !== undefined && currentClient) {
        const oldIds = new Set(currentClient.linkedBusinessIds || []);
        const newIds = new Set(clientData.linkedBusinessIds || []);
        const toAdd = clientData.linkedBusinessIds.filter(bId => !oldIds.has(bId));
        const toRemove = toRemoveBusinessIds;
        if (toAdd.length > 0 || toRemove.length > 0) {
            // Delete pair balances for removed links (old balance updated accordingly)
            for (const businessId of toRemove) {
                const balanceRef = db.collection('client_business_balances').doc(`${clientData.id}_${businessId}`);
                const snap = await balanceRef.get();
                if (snap.exists) await balanceRef.delete();
            }
            // Create pair balances for new links (recalc from transactions)
            await apiRecalculateAllClientBusinessBalances(clientData.id);
            // Sync totals for businesses that lost this client
            for (const businessId of toRemove) {
                try { await recalcAndSyncBusinessTotal(businessId); } catch (e) { console.warn('Failed to recalc business total:', businessId, e); }
            }
        }
    }
    void logActivityHelper('Clients', 'Update', `Updated client: ${clientData.name || clientData.id}`, clientData.id);
    
    // Sync opening balance to AR if it changed
    if (newOpeningBalance !== oldOpeningBalance && currentClient) {
        try {
            await syncOpeningBalanceToAR(clientData.id, currentClient.name || clientData.name || clientData.id, newOpeningBalance, false);
        } catch (error) {
            console.error('Failed to sync opening balance to AR:', error);
            // Don't throw - opening balance update should still succeed
        }
    }
    
    return result;
};

// Add internal client with specific ID
export const apiAddInternalClient = async (clientData: Omit<Client, 'createdAt'|'updatedAt'>): Promise<Client> => {
    const clientRef = db.collection('clients').doc(clientData.id);
    const clientSnap = await clientRef.get();
    
    if (clientSnap.exists) {
        // Update existing internal client
        await clientRef.update({
            ...clientData,
            updatedAt: getMyanmarISOString(),
        });
    } else {
        // Create new internal client
        await clientRef.set({
            ...clientData,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
    }
    
    const result = await apiGetClientById(clientData.id)!;
    void logActivityHelper('Clients', 'Create', `Created/Updated internal client: ${result.name}`, result.id, { clientName: result.name });
    return result;
};
export const apiUpdateBusiness = async (businessData: Partial<Business> & {id: string}) => {
    // Get current business data to check if opening balance changed
    const currentBusiness = await apiGetBusinessById(businessData.id);
    const newOpeningBalance = businessData.openingBalance;
    const oldOpeningBalance = currentBusiness?.openingBalance;

    // If opening balance changed, adjust the balance field to include it
    // This ensures the balance field reflects opening balance for Accounts Receivable
    if (newOpeningBalance !== oldOpeningBalance && currentBusiness) {
        const openingBalanceDiff = (newOpeningBalance || 0) - (oldOpeningBalance || 0);
        const currentBalance = currentBusiness.balance || 0;
        // Adjust balance by the difference in opening balance
        // This ensures balance = openingBalance + totalBilled - totalPaid
        businessData.balance = currentBalance + openingBalanceDiff;
    }

    // Sync linkedClientIds: update client.linkedBusinessIds when business's links change
    let toRemoveClientIds: string[] = [];
    if (businessData.linkedClientIds !== undefined && currentBusiness) {
        const oldIds = new Set(currentBusiness.linkedClientIds || []);
        const newIds = new Set(businessData.linkedClientIds || []);
        const toAdd = businessData.linkedClientIds.filter(cId => !oldIds.has(cId));
        toRemoveClientIds = (currentBusiness.linkedClientIds || []).filter(cId => !newIds.has(cId));
        const linkPromises: Promise<void>[] = [];
        for (const clientId of toAdd) {
            linkPromises.push(
                db.collection('clients').doc(clientId).update({
                    linkedBusinessIds: firebase.firestore.FieldValue.arrayUnion(businessData.id),
                    updatedAt: getMyanmarISOString(),
                })
            );
        }
        for (const clientId of toRemoveClientIds) {
            linkPromises.push(
                db.collection('clients').doc(clientId).update({
                    linkedBusinessIds: firebase.firestore.FieldValue.arrayRemove(businessData.id),
                    updatedAt: getMyanmarISOString(),
                })
            );
        }
        await Promise.all(linkPromises);
    }

    const result = await updateDocument('businesses', businessData.id, businessData);

    // Pair balance & transaction sync when linked clients change
    if (businessData.linkedClientIds !== undefined && currentBusiness) {
        const oldIds = new Set(currentBusiness.linkedClientIds || []);
        const newIds = new Set(businessData.linkedClientIds || []);
        const toAdd = businessData.linkedClientIds.filter(cId => !oldIds.has(cId));
        const toRemove = toRemoveClientIds;
        if (toAdd.length > 0 || toRemove.length > 0) {
            // Delete pair balances for removed links
            for (const clientId of toRemove) {
                const balanceRef = db.collection('client_business_balances').doc(`${clientId}_${businessData.id}`);
                const snap = await balanceRef.get();
                if (snap.exists) await balanceRef.delete();
            }
            // Create pair balances for new links (recalc from transactions)
            for (const clientId of toAdd) {
                try {
                    const calculated = await apiCalculateClientBusinessBalance(clientId, businessData.id);
                    await apiUpdateClientBusinessBalance(clientId, businessData.id, calculated, 'set');
                } catch (e) { console.warn('Failed to create pair balance:', clientId, businessData.id, e); }
            }
            // Recalc and sync client totals for affected clients, and business total
            const affectedClientIds = [...new Set([...toAdd, ...toRemove])];
            for (const clientId of affectedClientIds) {
                try { await recalcAndSyncClientTotal(clientId); } catch (e) { console.warn('Failed to recalc client total:', clientId, e); }
            }
            try { await recalcAndSyncBusinessTotal(businessData.id); } catch (e) { console.warn('Failed to recalc business total:', businessData.id, e); }
        }
    }
    void logActivityHelper('Businesses', 'Update', `Updated business: ${businessData.name || businessData.id}`, businessData.id);
    
    // Sync opening balance to AR if it changed
    if (newOpeningBalance !== oldOpeningBalance && currentBusiness) {
        try {
            await syncOpeningBalanceToAR(businessData.id, currentBusiness.name || businessData.name || businessData.id, newOpeningBalance, true);
        } catch (error) {
            console.error('Failed to sync opening balance to AR:', error);
            // Don't throw - opening balance update should still succeed
        }
    }
    
    return result;
};

export const apiDeleteClient = async (clientId: string): Promise<void> => {
    const clientRef = db.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return;

    const clientData = clientSnap.data() as Client;
    const batch = db.batch();
    batch.delete(clientRef);

    if (clientData.linkedBusinessIds && clientData.linkedBusinessIds.length > 0) {
        clientData.linkedBusinessIds.forEach(businessId => {
            const businessRef = db.collection('businesses').doc(businessId);
            batch.update(businessRef, {
                linkedClientIds: firebase.firestore.FieldValue.arrayRemove(clientId)
            });
        });
    }
    await batch.commit();
    void logActivityHelper('Clients', 'Delete', `Deleted client: ${clientData.name}`, clientId);
};

/**
 * Merge multiple clients into one. Keeps the client with the lowest (lexicographic) ID.
 * - All merged clients are deleted except the remaining one
 * - All businesses linked to any merged client are now linked ONLY to the remaining client (removed from deleted clients)
 * - Creates pair balance documents for each (remaining client, business)
 * - Stores a MergeSnapshot before changes to enable unmerge
 * - Recalculates per formula:
 *   Pair outstanding = openingBalance + balance (balance = Total Billed - payments - bad_debt)
 *   Client balance = sum of all pair outstanding for that client (Pair(A-B1) + Pair(A-B2))
 *   Business balance = sum of all pair outstanding for that business (Pair(A1-B) + Pair(A2-B))
 */
export const apiMergeClients = async (clientIds: string[]): Promise<{ remainingClientId: string; mergedCount: number; snapshotId: string }> => {
    const uniqueIds = [...new Set(clientIds)].filter(Boolean);
    if (uniqueIds.length < 2) {
        throw new Error('Select at least 2 clients to merge.');
    }

    const sorted = [...uniqueIds].sort((a, b) => a.localeCompare(b));
    const remainingClientId = sorted[0];
    const toMergeIds = sorted.slice(1);

    const clientsSnap = await Promise.all(uniqueIds.map(id => db.collection('clients').doc(id).get()));
    const missing = uniqueIds.filter((id, i) => !clientsSnap[i].exists);
    if (missing.length > 0) {
        throw new Error(`Client(s) not found: ${missing.join(', ')}`);
    }

    const allClients = clientsSnap.map(d => ({ id: d.id, ...d.data() } as Client));
    const allBusinessIds = new Set<string>();
    allClients.forEach(c => (c.linkedBusinessIds || []).forEach((b: string) => allBusinessIds.add(b)));
    const businessIds = Array.from(allBusinessIds);

    const remainingClient = allClients.find(c => c.id === remainingClientId)!;
    const mergedLinkedBusinesses = new Set<string>(remainingClient.linkedBusinessIds || []);
    toMergeIds.forEach(cid => {
        const c = allClients.find(x => x.id === cid);
        (c?.linkedBusinessIds || []).forEach((b: string) => mergedLinkedBusinesses.add(b));
    });
    const finalLinkedBusinessIds = Array.from(mergedLinkedBusinesses);

    // --- BUILD SNAPSHOT (before any writes) to enable unmerge ---
    const childCols = [
        { name: 'sales', clientField: 'clientId' },
        { name: 'invoices', clientField: 'clientId' },
        { name: 'payments', clientField: 'clientId' },
        { name: 'refunds', clientField: 'clientId' },
        { name: 'credit_notes', clientField: 'clientId' },
        { name: 'balance_adjustments', clientField: 'clientId' },
        { name: 'bad_debts', clientField: 'clientId' },
        { name: 'quotations', clientField: 'clientId' },
    ] as const;

    const childDocMappings: MergeSnapshot['childDocMappings'] = [];
    for (const col of childCols) {
        const snap = await db.collection(col.name).get();
        for (const doc of snap.docs) {
            const d = doc.data();
            const cid = d[col.clientField];
            if (cid && toMergeIds.includes(cid)) {
                childDocMappings.push({ collection: col.name, docId: doc.id, field: col.clientField, originalValue: cid });
            }
        }
    }
    const leadsSnap = await db.collection('leads').get();
    for (const doc of leadsSnap.docs) {
        const d = doc.data();
        if (d.linkedClientId && toMergeIds.includes(d.linkedClientId)) {
            childDocMappings.push({ collection: 'leads', docId: doc.id, field: 'linkedClientId', originalValue: d.linkedClientId });
        }
    }
    for (const cid of toMergeIds) {
        const notesSnap = await db.collection('notes').where('relatedToId', '==', cid).get();
        for (const doc of notesSnap.docs) {
            childDocMappings.push({ collection: 'notes', docId: doc.id, field: 'relatedToId', originalValue: cid });
        }
    }

    const businessLinkedClientsBefore: Record<string, string[]> = {};
    for (const businessId of businessIds) {
        const bizSnap = await db.collection('businesses').doc(businessId).get();
        if (bizSnap.exists) {
            const bizData = bizSnap.data() as Business;
            businessLinkedClientsBefore[businessId] = bizData.linkedClientIds || [];
        }
    }

    const cbbSnap = await db.collection('client_business_balances').get();
    const pairsDeleted: Record<string, Record<string, unknown>> = {};
    const pairsOverwritten: Record<string, Record<string, unknown>> = {};
    const existingPairIds = new Set(cbbSnap.docs.map(d => d.id));

    for (const doc of cbbSnap.docs) {
        const d = doc.data() as ClientBusinessBalance;
        const cid = d.clientId;
        const bid = d.businessId;
        if (!cid || !bid) continue;
        const pairId = doc.id;
        if (toMergeIds.includes(cid)) {
            pairsDeleted[pairId] = { ...d, id: pairId } as Record<string, unknown>;
        } else if (cid === remainingClientId && finalLinkedBusinessIds.includes(bid)) {
            pairsOverwritten[pairId] = { ...d, id: pairId } as Record<string, unknown>;
        }
    }
    const pairsCreated = finalLinkedBusinessIds
        .filter(bid => !existingPairIds.has(`${remainingClientId}_${bid}`))
        .map(bid => `${remainingClientId}_${bid}`);

    const mergedClientDocs: Record<string, Record<string, unknown>> = {};
    for (const c of allClients) {
        if (toMergeIds.includes(c.id)) {
            mergedClientDocs[c.id] = { ...c } as Record<string, unknown>;
        }
    }

    const snapshotId = `merge_${Date.now()}_${remainingClientId}`;
    const snapshot: MergeSnapshot = {
        id: snapshotId,
        remainingClientId,
        toMergeIds,
        createdAt: getMyanmarISOString(),
        mergedClientDocs,
        remainingClientLinkedBusinessIds: remainingClient.linkedBusinessIds || [],
        childDocMappings,
        pairsDeleted,
        pairsOverwritten,
        pairsCreated,
        businessLinkedClientsBefore,
    };
    await db.collection('merge_snapshots').doc(snapshotId).set(snapshot);

    // --- END SNAPSHOT ---

    const BATCH_SIZE = 450;
    let batch = db.batch();
    let batchCount = 0;
    const flush = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };

    for (const col of childCols) {
        const snap = await db.collection(col.name).get();
        for (const doc of snap.docs) {
            const d = doc.data();
            const cid = d[col.clientField];
            if (cid && toMergeIds.includes(cid)) {
                batch.update(doc.ref, { [col.clientField]: remainingClientId, updatedAt: getMyanmarISOString() });
                batchCount++;
                if (batchCount >= BATCH_SIZE) await flush();
            }
        }
    }

    for (const doc of leadsSnap.docs) {
        const d = doc.data();
        if (d.linkedClientId && toMergeIds.includes(d.linkedClientId)) {
            batch.update(doc.ref, { linkedClientId: remainingClientId });
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }

    for (const cid of toMergeIds) {
        const notesSnap = await db.collection('notes').where('relatedToId', '==', cid).get();
        for (const doc of notesSnap.docs) {
            batch.update(doc.ref, { relatedToId: remainingClientId });
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }
    await flush();

    await db.collection('clients').doc(remainingClientId).update({
        linkedBusinessIds: finalLinkedBusinessIds,
        updatedAt: getMyanmarISOString(),
    });

    for (const businessId of businessIds) {
        const bizRef = db.collection('businesses').doc(businessId);
        const bizSnap = await bizRef.get();
        if (!bizSnap.exists) continue;
        const bizData = bizSnap.data() as Business;
        const linked = bizData.linkedClientIds || [];
        const withoutMerged = linked.filter((cid: string) => !toMergeIds.includes(cid));
        const hasRemaining = withoutMerged.includes(remainingClientId);
        const newLinked = hasRemaining ? withoutMerged : [...withoutMerged, remainingClientId];
        await bizRef.update({ linkedClientIds: newLinked, updatedAt: getMyanmarISOString() });
    }

    const mergedOpeningByPair = new Map<string, { openingBalance: number; openingBalancePaid: number }>();
    for (const doc of cbbSnap.docs) {
        const d = doc.data() as ClientBusinessBalance;
        const cid = d.clientId;
        const bid = d.businessId;
        if (!cid || !bid) continue;
        const key = `${remainingClientId}_${bid}`;
        if (toMergeIds.includes(cid) || cid === remainingClientId) {
            const existing = mergedOpeningByPair.get(key) || { openingBalance: 0, openingBalancePaid: 0 };
            existing.openingBalance += d.openingBalance ?? 0;
            existing.openingBalancePaid += d.openingBalancePaid ?? 0;
            mergedOpeningByPair.set(key, existing);
        }
    }

    for (const doc of cbbSnap.docs) {
        const d = doc.data() as ClientBusinessBalance;
        if (d.clientId && toMergeIds.includes(d.clientId)) {
            batch.delete(doc.ref);
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }
    await flush();

    // Create/update pair balance documents: Pair outstanding = openingBalance + balance
    for (const businessId of finalLinkedBusinessIds) {
        const calculatedBalance = await apiCalculateClientBusinessBalance(remainingClientId, businessId);
        const pairKey = `${remainingClientId}_${businessId}`;
        const merged = mergedOpeningByPair.get(pairKey) || { openingBalance: 0, openingBalancePaid: 0 };
        const balanceRef = db.collection('client_business_balances').doc(pairKey);
        await balanceRef.set({
            clientId: remainingClientId,
            businessId,
            balance: calculatedBalance,
            openingBalance: merged.openingBalance,
            openingBalancePaid: merged.openingBalancePaid,
            updatedAt: getMyanmarISOString(),
        }, { merge: true });
    }

    // Recalculate all pairs, then sync client and business totals per formula:
    // Client balance = sum of pair outstanding for all pairs (Pair(A-B1) + Pair(A-B2))
    // Business balance = sum of pair outstanding for all pairs (Pair(A1-B) + Pair(A2-B))
    await apiRecalculateAllClientBusinessBalances(remainingClientId);

    try {
        const totalBalance = await apiGetClientTotalBalance(remainingClientId);
        const customerRef = db.collection('finance_customers').doc(remainingClientId);
        const custDoc = await customerRef.get();
        if (custDoc.exists) {
            await customerRef.update({ balance: totalBalance });
        } else {
            const cl = await apiGetClientById(remainingClientId);
            await customerRef.set({ id: remainingClientId, name: cl?.name || remainingClientId, currency: 'MMK', balance: totalBalance });
        }
    } catch (e) {
        console.warn('Failed to sync finance_customers for merged client:', e);
    }

    for (const cid of toMergeIds) {
        batch.delete(db.collection('clients').doc(cid));
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    void logActivityHelper('Clients', 'Merge', `Merged ${toMergeIds.length + 1} clients into ${remainingClientId}`, remainingClientId, { mergedIds: toMergeIds, remainingClientId, snapshotId });
    return { remainingClientId, mergedCount: toMergeIds.length, snapshotId };
};

/**
 * Get merge snapshots for a client (as remaining or merged). Used to show unmerge option.
 */
export const apiGetMergeSnapshotsForClient = async (clientId: string): Promise<MergeSnapshot[]> => {
    const [remainingSnap, mergedSnap] = await Promise.all([
        db.collection('merge_snapshots').where('remainingClientId', '==', clientId).limit(50).get(),
        db.collection('merge_snapshots').where('toMergeIds', 'array-contains', clientId).limit(50).get(),
    ]);
    const seen = new Set<string>();
    const results: MergeSnapshot[] = [];
    for (const doc of remainingSnap.docs) {
        if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push(convertTimestamps({ id: doc.id, ...doc.data() }) as MergeSnapshot);
        }
    }
    for (const doc of mergedSnap.docs) {
        if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push(convertTimestamps({ id: doc.id, ...doc.data() }) as MergeSnapshot);
        }
    }
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, 20);
};

/**
 * Unmerge (reverse) a previous client merge using the stored snapshot.
 */
export const apiUnmergeClients = async (snapshotId: string): Promise<{ restoredClientIds: string[] }> => {
    const snapDoc = await db.collection('merge_snapshots').doc(snapshotId).get();
    if (!snapDoc.exists) {
        throw new Error('Merge snapshot not found. Unmerge may no longer be available.');
    }
    const snapshot = snapDoc.data() as MergeSnapshot;
    const { remainingClientId, toMergeIds, mergedClientDocs, remainingClientLinkedBusinessIds, childDocMappings, pairsDeleted, pairsOverwritten, pairsCreated, businessLinkedClientsBefore } = snapshot;

    const BATCH_SIZE = 450;
    let batch = db.batch();
    let batchCount = 0;
    const flush = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };

    // 1. Restore child doc mappings (clientId, linkedClientId, relatedToId back to original)
    for (const m of childDocMappings) {
        const ref = db.collection(m.collection).doc(m.docId);
        const doc = await ref.get();
        if (doc.exists) {
            batch.update(ref, { [m.field]: m.originalValue, updatedAt: getMyanmarISOString() });
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }
    await flush();

    // 2. Restore remaining client's linkedBusinessIds
    await db.collection('clients').doc(remainingClientId).update({
        linkedBusinessIds: remainingClientLinkedBusinessIds,
        updatedAt: getMyanmarISOString(),
    });

    // 3. Restore business linkedClientIds
    for (const [businessId, linkedClientIds] of Object.entries(businessLinkedClientsBefore)) {
        const bizRef = db.collection('businesses').doc(businessId);
        batch.update(bizRef, { linkedClientIds, updatedAt: getMyanmarISOString() });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    // 4. Delete pairs we created
    for (const pairId of pairsCreated) {
        const ref = db.collection('client_business_balances').doc(pairId);
        batch.delete(ref);
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    // 5. Restore overwritten pairs
    for (const [pairId, data] of Object.entries(pairsOverwritten)) {
        const clean = { ...data };
        delete clean.id;
        const ref = db.collection('client_business_balances').doc(pairId);
        batch.set(ref, { ...clean, updatedAt: getMyanmarISOString() }, { merge: true });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    // 6. Restore deleted pairs
    for (const [pairId, data] of Object.entries(pairsDeleted)) {
        const clean = { ...data };
        delete clean.id;
        const ref = db.collection('client_business_balances').doc(pairId);
        batch.set(ref, { ...clean, updatedAt: getMyanmarISOString() }, { merge: true });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    // 7. Restore merged client documents
    for (const [clientId, clientData] of Object.entries(mergedClientDocs)) {
        const clean = { ...clientData };
        delete clean.id;
        const ref = db.collection('clients').doc(clientId);
        batch.set(ref, { ...clean, updatedAt: getMyanmarISOString() }, { merge: true });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    // 8. Recalculate balances for remaining client and each restored client
    await apiRecalculateAllClientBusinessBalances(remainingClientId);
    for (const cid of toMergeIds) {
        await apiRecalculateAllClientBusinessBalances(cid);
    }

    // 9. Sync finance_customers
    try {
        const totalRemaining = await apiGetClientTotalBalance(remainingClientId);
        const custRef = db.collection('finance_customers').doc(remainingClientId);
        const custDoc = await custRef.get();
        if (custDoc.exists) {
            await custRef.update({ balance: totalRemaining, updatedAt: getMyanmarISOString() });
        }
    } catch (e) {
        console.warn('Failed to sync finance_customers for remaining client:', e);
    }
    for (const cid of toMergeIds) {
        try {
            const total = await apiGetClientTotalBalance(cid);
            const custRef = db.collection('finance_customers').doc(cid);
            const custDoc = await custRef.get();
            if (custDoc.exists) {
                await custRef.update({ balance: total, updatedAt: getMyanmarISOString() });
            } else {
                const cl = await apiGetClientById(cid);
                if (cl) {
                    await custRef.set({
                        id: cid, name: cl.name || cid, currency: 'MMK', balance: total,
                        createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString(),
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to sync finance_customers for restored client:', cid, e);
        }
    }

    // 10. Delete or mark snapshot as used (delete to avoid re-unmerge)
    await db.collection('merge_snapshots').doc(snapshotId).delete();

    void logActivityHelper('Clients', 'Unmerge', `Unmerged clients. Restored: ${toMergeIds.join(', ')}`, remainingClientId, { snapshotId, restoredClientIds: toMergeIds });
    return { restoredClientIds: toMergeIds };
};

/**
 * Merge multiple businesses into one. Keeps the business with the lowest (lexicographic) ID.
 * - All merged businesses are deleted except the remaining one
 * - Requires all selected businesses to be linked to the same client(s)
 * - Rewrites transactions and balances to the remaining business
 * - Stores a BusinessMergeSnapshot before changes to enable unmerge
 */
export const apiMergeBusinesses = async (businessIds: string[]): Promise<{ remainingBusinessId: string; mergedCount: number; snapshotId: string }> => {
    const uniqueIds = [...new Set(businessIds)].filter(Boolean);
    if (uniqueIds.length < 2) {
        throw new Error('Select at least 2 businesses to merge.');
    }

    const sorted = [...uniqueIds].sort((a, b) => a.localeCompare(b));
    const remainingBusinessId = sorted[0];
    const toMergeIds = sorted.slice(1);

    const businessesSnap = await Promise.all(uniqueIds.map(id => db.collection('businesses').doc(id).get()));
    const missing = uniqueIds.filter((id, i) => !businessesSnap[i].exists);
    if (missing.length > 0) {
        throw new Error(`Business(es) not found: ${missing.join(', ')}`);
    }

    const allBusinesses = businessesSnap.map(d => ({ id: d.id, ...d.data() } as Business));

    const linkedSets = allBusinesses.map(b => [...(b.linkedClientIds || [])].sort().join(','));
    const firstSet = linkedSets[0];
    if (!linkedSets.every(s => s === firstSet) || firstSet === '') {
        throw new Error('Businesses must be linked to the same client(s) to merge.');
    }

    const finalLinkedClientIds = [...(allBusinesses[0].linkedClientIds || [])].sort((a, b) => a.localeCompare(b));
    const remainingBusiness = allBusinesses.find(b => b.id === remainingBusinessId)!;

    const childCols = [
        { name: 'sales', businessField: 'businessId' as const },
        { name: 'invoices', businessField: 'businessId' as const },
        { name: 'payments', businessField: 'businessId' as const },
        { name: 'refunds', businessField: 'businessId' as const },
        { name: 'credit_notes', businessField: 'businessId' as const },
        { name: 'balance_adjustments', businessField: 'businessId' as const },
        { name: 'bad_debts', businessField: 'businessId' as const },
        { name: 'quotations', businessField: 'businessId' as const },
        { name: 'allowance_doubtful_debts', businessField: 'businessId' as const },
    ] as const;

    const childDocMappings: BusinessMergeSnapshot['childDocMappings'] = [];
    for (const col of childCols) {
        const snap = await db.collection(col.name).get();
        for (const doc of snap.docs) {
            const d = doc.data();
            const bid = d[col.businessField];
            if (bid && toMergeIds.includes(bid)) {
                childDocMappings.push({ collection: col.name, docId: doc.id, field: col.businessField, originalValue: bid });
            }
        }
    }

    const leadsSnap = await db.collection('leads').get();
    for (const doc of leadsSnap.docs) {
        const d = doc.data();
        if (d.linkedBusinessId && toMergeIds.includes(d.linkedBusinessId)) {
            childDocMappings.push({ collection: 'leads', docId: doc.id, field: 'linkedBusinessId', originalValue: d.linkedBusinessId });
        }
    }

    for (const bid of toMergeIds) {
        const notesSnap = await db.collection('notes').where('relatedToId', '==', bid).get();
        for (const doc of notesSnap.docs) {
            childDocMappings.push({ collection: 'notes', docId: doc.id, field: 'relatedToId', originalValue: bid });
        }
    }

    const clientLinkedBusinessIdsBefore: Record<string, string[]> = {};
    for (const clientId of finalLinkedClientIds) {
        const cSnap = await db.collection('clients').doc(clientId).get();
        if (cSnap.exists) {
            const cData = cSnap.data() as Client;
            clientLinkedBusinessIdsBefore[clientId] = cData.linkedBusinessIds || [];
        }
    }

    const cbbSnap = await db.collection('client_business_balances').get();
    const pairsDeleted: Record<string, Record<string, unknown>> = {};
    const pairsOverwritten: Record<string, Record<string, unknown>> = {};
    const existingPairIds = new Set(cbbSnap.docs.map(d => d.id));

    for (const doc of cbbSnap.docs) {
        const d = doc.data() as ClientBusinessBalance;
        const cid = d.clientId;
        const bid = d.businessId;
        if (!cid || !bid) continue;
        const pairId = doc.id;
        if (toMergeIds.includes(bid)) {
            pairsDeleted[pairId] = { ...d, id: pairId } as Record<string, unknown>;
        } else if (bid === remainingBusinessId && finalLinkedClientIds.includes(cid)) {
            pairsOverwritten[pairId] = { ...d, id: pairId } as Record<string, unknown>;
        }
    }

    const pairsCreated = finalLinkedClientIds
        .filter(cid => !existingPairIds.has(`${cid}_${remainingBusinessId}`))
        .map(cid => `${cid}_${remainingBusinessId}`);

    const mergedBusinessDocs: Record<string, Record<string, unknown>> = {};
    for (const b of allBusinesses) {
        if (toMergeIds.includes(b.id)) {
            mergedBusinessDocs[b.id] = { ...b } as Record<string, unknown>;
        }
    }

    const snapshotId = `bmerge_${Date.now()}_${remainingBusinessId}`;
    const snapshot: BusinessMergeSnapshot = {
        id: snapshotId,
        remainingBusinessId,
        toMergeIds,
        createdAt: getMyanmarISOString(),
        mergedBusinessDocs,
        remainingBusinessLinkedClientIds: remainingBusiness.linkedClientIds || [],
        clientLinkedBusinessIdsBefore,
        childDocMappings,
        pairsDeleted,
        pairsOverwritten,
        pairsCreated,
    };
    await db.collection('business_merge_snapshots').doc(snapshotId).set(snapshot);

    const BATCH_SIZE = 450;
    let batch = db.batch();
    let batchCount = 0;
    const flush = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };

    for (const col of childCols) {
        const snap = await db.collection(col.name).get();
        for (const doc of snap.docs) {
            const d = doc.data();
            const bid = d[col.businessField];
            if (bid && toMergeIds.includes(bid)) {
                batch.update(doc.ref, { [col.businessField]: remainingBusinessId, updatedAt: getMyanmarISOString() });
                batchCount++;
                if (batchCount >= BATCH_SIZE) await flush();
            }
        }
    }

    for (const doc of leadsSnap.docs) {
        const d = doc.data();
        if (d.linkedBusinessId && toMergeIds.includes(d.linkedBusinessId)) {
            batch.update(doc.ref, { linkedBusinessId: remainingBusinessId, updatedAt: getMyanmarISOString() });
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }

    for (const bid of toMergeIds) {
        const notesSnap = await db.collection('notes').where('relatedToId', '==', bid).get();
        for (const doc of notesSnap.docs) {
            batch.update(doc.ref, { relatedToId: remainingBusinessId, updatedAt: getMyanmarISOString() });
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }
    await flush();

    for (const clientId of finalLinkedClientIds) {
        const clientRef = db.collection('clients').doc(clientId);
        const prev = clientLinkedBusinessIdsBefore[clientId] || [];
        const withoutMerged = prev.filter((b: string) => !toMergeIds.includes(b));
        const newLinked = withoutMerged.includes(remainingBusinessId)
            ? withoutMerged
            : [...withoutMerged, remainingBusinessId];
        await clientRef.update({
            linkedBusinessIds: newLinked,
            updatedAt: getMyanmarISOString(),
        });
    }

    await db.collection('businesses').doc(remainingBusinessId).update({
        linkedClientIds: finalLinkedClientIds,
        updatedAt: getMyanmarISOString(),
    });

    const mergedOpeningByPair = new Map<string, { openingBalance: number; openingBalancePaid: number }>();
    for (const doc of cbbSnap.docs) {
        const d = doc.data() as ClientBusinessBalance;
        const cid = d.clientId;
        const bid = d.businessId;
        if (!cid || !bid) continue;
        if (!uniqueIds.includes(bid) || !finalLinkedClientIds.includes(cid)) continue;
        const key = `${cid}_${remainingBusinessId}`;
        const existing = mergedOpeningByPair.get(key) || { openingBalance: 0, openingBalancePaid: 0 };
        existing.openingBalance += d.openingBalance ?? 0;
        existing.openingBalancePaid += d.openingBalancePaid ?? 0;
        mergedOpeningByPair.set(key, existing);
    }

    for (const doc of cbbSnap.docs) {
        const d = doc.data() as ClientBusinessBalance;
        if (d.businessId && toMergeIds.includes(d.businessId)) {
            batch.delete(doc.ref);
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }
    await flush();

    for (const clientId of finalLinkedClientIds) {
        const calculatedBalance = await apiCalculateClientBusinessBalance(clientId, remainingBusinessId);
        const pairKey = `${clientId}_${remainingBusinessId}`;
        const merged = mergedOpeningByPair.get(pairKey) || { openingBalance: 0, openingBalancePaid: 0 };
        const balanceRef = db.collection('client_business_balances').doc(pairKey);
        await balanceRef.set({
            clientId,
            businessId: remainingBusinessId,
            balance: calculatedBalance,
            openingBalance: merged.openingBalance,
            openingBalancePaid: merged.openingBalancePaid,
            updatedAt: getMyanmarISOString(),
        }, { merge: true });
    }

    for (const clientId of finalLinkedClientIds) {
        await apiRecalculateAllClientBusinessBalances(clientId);
    }

    try {
        await recalcAndSyncBusinessTotal(remainingBusinessId);
    } catch (e) {
        console.warn('Failed to sync finance_customers for merged business:', e);
    }

    for (const bid of toMergeIds) {
        batch.delete(db.collection('businesses').doc(bid));
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    void logActivityHelper('Businesses', 'Merge', `Merged ${toMergeIds.length + 1} businesses into ${remainingBusinessId}`, remainingBusinessId, { mergedIds: toMergeIds, remainingBusinessId, snapshotId });
    return { remainingBusinessId, mergedCount: toMergeIds.length, snapshotId };
};

/**
 * Get business merge snapshots for a business (as remaining or merged). Used to show unmerge option.
 */
export const apiGetMergeSnapshotsForBusiness = async (businessId: string): Promise<BusinessMergeSnapshot[]> => {
    const [remainingSnap, mergedSnap] = await Promise.all([
        db.collection('business_merge_snapshots').where('remainingBusinessId', '==', businessId).limit(50).get(),
        db.collection('business_merge_snapshots').where('toMergeIds', 'array-contains', businessId).limit(50).get(),
    ]);
    const seen = new Set<string>();
    const results: BusinessMergeSnapshot[] = [];
    for (const doc of remainingSnap.docs) {
        if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push(convertTimestamps({ id: doc.id, ...doc.data() }) as BusinessMergeSnapshot);
        }
    }
    for (const doc of mergedSnap.docs) {
        if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push(convertTimestamps({ id: doc.id, ...doc.data() }) as BusinessMergeSnapshot);
        }
    }
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, 20);
};

/**
 * Unmerge (reverse) a previous business merge using the stored snapshot.
 */
export const apiUnmergeBusinesses = async (snapshotId: string): Promise<{ restoredBusinessIds: string[] }> => {
    const snapDoc = await db.collection('business_merge_snapshots').doc(snapshotId).get();
    if (!snapDoc.exists) {
        throw new Error('Business merge snapshot not found. Unmerge may no longer be available.');
    }
    const snapshot = snapDoc.data() as BusinessMergeSnapshot;
    const {
        remainingBusinessId,
        toMergeIds,
        mergedBusinessDocs,
        remainingBusinessLinkedClientIds,
        clientLinkedBusinessIdsBefore,
        childDocMappings,
        pairsDeleted,
        pairsOverwritten,
        pairsCreated,
    } = snapshot;

    const BATCH_SIZE = 450;
    let batch = db.batch();
    let batchCount = 0;
    const flush = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };

    for (const m of childDocMappings) {
        const ref = db.collection(m.collection).doc(m.docId);
        const doc = await ref.get();
        if (doc.exists) {
            batch.update(ref, { [m.field]: m.originalValue, updatedAt: getMyanmarISOString() });
            batchCount++;
            if (batchCount >= BATCH_SIZE) await flush();
        }
    }
    await flush();

    await db.collection('businesses').doc(remainingBusinessId).update({
        linkedClientIds: remainingBusinessLinkedClientIds,
        updatedAt: getMyanmarISOString(),
    });

    for (const [clientId, linkedBusinessIds] of Object.entries(clientLinkedBusinessIdsBefore)) {
        const clientRef = db.collection('clients').doc(clientId);
        batch.update(clientRef, { linkedBusinessIds, updatedAt: getMyanmarISOString() });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    for (const pairId of pairsCreated) {
        const ref = db.collection('client_business_balances').doc(pairId);
        batch.delete(ref);
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    for (const [pairId, data] of Object.entries(pairsOverwritten)) {
        const clean = { ...data };
        delete clean.id;
        const ref = db.collection('client_business_balances').doc(pairId);
        batch.set(ref, { ...clean, updatedAt: getMyanmarISOString() }, { merge: true });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    for (const [pairId, data] of Object.entries(pairsDeleted)) {
        const clean = { ...data };
        delete clean.id;
        const ref = db.collection('client_business_balances').doc(pairId);
        batch.set(ref, { ...clean, updatedAt: getMyanmarISOString() }, { merge: true });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    for (const [businessId, businessData] of Object.entries(mergedBusinessDocs)) {
        const clean = { ...businessData };
        delete clean.id;
        const ref = db.collection('businesses').doc(businessId);
        batch.set(ref, { ...clean, updatedAt: getMyanmarISOString() }, { merge: true });
        batchCount++;
        if (batchCount >= BATCH_SIZE) await flush();
    }
    await flush();

    const affectedClientIds = new Set<string>([
        ...Object.keys(clientLinkedBusinessIdsBefore),
        ...(remainingBusinessLinkedClientIds || []),
    ]);
    for (const cid of toMergeIds) {
        const bd = mergedBusinessDocs[cid] as { linkedClientIds?: string[] } | undefined;
        (bd?.linkedClientIds || []).forEach((x: string) => affectedClientIds.add(x));
    }

    for (const clientId of affectedClientIds) {
        await apiRecalculateAllClientBusinessBalances(clientId);
    }

    try {
        await recalcAndSyncBusinessTotal(remainingBusinessId);
    } catch (e) {
        console.warn('Failed to sync finance_customers for remaining business after unmerge:', e);
    }
    for (const bid of toMergeIds) {
        try {
            await recalcAndSyncBusinessTotal(bid);
        } catch (e) {
            console.warn('Failed to sync finance_customers for restored business:', bid, e);
        }
    }

    await db.collection('business_merge_snapshots').doc(snapshotId).delete();

    void logActivityHelper('Businesses', 'Unmerge', `Unmerged businesses. Restored: ${toMergeIds.join(', ')}`, remainingBusinessId, { snapshotId, restoredBusinessIds: toMergeIds });
    return { restoredBusinessIds: toMergeIds };
};

const BATCH_SIZE_DELETE = 450;

/** Delete all documents in a collection where businessId equals the given id. Uses batched writes. */
const deleteCollectionWhereBusinessId = async (collectionName: string, businessId: string): Promise<number> => {
    const snap = await db.collection(collectionName).where('businessId', '==', businessId).get();
    if (snap.empty) return 0;
    let count = 0;
    let batch = db.batch();
    for (const doc of snap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count % BATCH_SIZE_DELETE === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (count % BATCH_SIZE_DELETE !== 0) await batch.commit();
    return count;
};

export const apiDeleteBusiness = async (businessId: string): Promise<void> => {
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) return;

    const businessData = businessSnap.data() as Business;
    const linkedClientIds = businessData.linkedClientIds || [];

    // 1. Delete all transactions for this business (sales, invoices, payments, credit_notes, refunds, balance_adjustments, bad_debts, quotations, allowance_doubtful_debts)
    const transactionCollections = [
        'sales', 'invoices', 'payments', 'credit_notes', 'refunds',
        'balance_adjustments', 'bad_debts', 'quotations', 'allowance_doubtful_debts'
    ] as const;
    for (const col of transactionCollections) {
        await deleteCollectionWhereBusinessId(col, businessId);
    }

    // 2. Delete client_business_balances for this business (pair balances)
    const cbbSnap = await db.collection('client_business_balances')
        .where('businessId', '==', businessId)
        .get();
    const batch = db.batch();
    cbbSnap.docs.forEach(doc => batch.delete(doc.ref));

    // 3. Unlink business from all clients
    linkedClientIds.forEach(clientId => {
        const clientRef = db.collection('clients').doc(clientId);
        batch.update(clientRef, {
            linkedBusinessIds: firebase.firestore.FieldValue.arrayRemove(businessId),
            updatedAt: getMyanmarISOString(),
        });
    });

    // 4. Delete business
    batch.delete(businessRef);
    await batch.commit();

    // 5. Sync client balances (no pair transactions for deleted business → client balance reduced)
    for (const clientId of linkedClientIds) {
        try {
            const totalBalance = await apiGetClientTotalBalance(clientId);
            await updateDocument('clients', clientId, { balance: totalBalance, updatedAt: getMyanmarISOString() });
            const customerRef = db.collection('finance_customers').doc(clientId);
            const customerDoc = await customerRef.get();
            if (customerDoc.exists) {
                await customerRef.update({ balance: totalBalance });
            }
        } catch (e) {
            console.warn('Failed to recalc client balance after business delete:', clientId, e);
        }
    }

    void logActivityHelper('Businesses', 'Delete', `Deleted business: ${businessData.name} and all its transactions`, businessId);
};

// ============================================================================
// Client-Business Balance API Functions
// ============================================================================
//
// CANONICAL BALANCE FORMULA (used by both calculated and Firebase stored balance):
//   Total Billed = Opening Balance
//                + Approved Sales (grandTotalMMK)
//                + Balance Adjustments (INCREASE)
//                - Credit Notes (APPROVED)
//                - Balance Adjustments (DECREASE)
//                - Refunds
//   Outstanding Balance = Total Billed - Payments - Bad Debt
//
// Stored: pair.openingBalance (opening), pair.balance = Total Billed - Payments - Bad Debt (transaction portion)
// Outstanding = pair.openingBalance + pair.balance
//
// ============================================================================

/**
 * Lightweight sync of finance_customers from client/business balance.
 * Use after transactions that already updated client.balance and business.balance.
 * Avoids full apiRecalculateClientBalance when balances are already correct.
 */
const syncFinanceCustomerBalance = async (clientId: string, businessId?: string): Promise<void> => {
    try {
        const client = await apiGetClientById(clientId);
        if (client) {
            const customerRef = db.collection('finance_customers').doc(clientId);
            const customerDoc = await customerRef.get();
            const balance = client.balance || 0;
            if (customerDoc.exists) {
                await customerRef.update({ balance, updatedAt: getMyanmarISOString() });
            } else {
                await customerRef.set({
                    id: clientId, name: client.name || clientId, currency: 'MMK', balance,
                    createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString(),
                });
            }
        }
        if (businessId) {
            const business = await apiGetBusinessById(businessId);
            if (business) {
                const bizCustomerRef = db.collection('finance_customers').doc(businessId);
                const bizDoc = await bizCustomerRef.get();
                const balance = business.balance || 0;
                if (bizDoc.exists) {
                    await bizCustomerRef.update({ balance, updatedAt: getMyanmarISOString() });
                } else {
                    await bizCustomerRef.set({
                        id: businessId, name: business.name || businessId, currency: 'MMK', balance,
                        createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString(),
                    });
                }
            }
        }
    } catch (error) {
        console.warn("Failed to sync finance customer balance:", error);
    }
};

/** Recalc and sync business total from client_business_balances, and finance_customers. */
const recalcAndSyncBusinessTotal = async (businessId: string): Promise<void> => {
    const balancesSnapshot = await db.collection('client_business_balances')
        .where('businessId', '==', businessId)
        .get();
    let total = 0;
    balancesSnapshot.docs.forEach(doc => {
        const d = doc.data() as ClientBusinessBalance;
        total += (d.openingBalance ?? 0) + (d.balance ?? 0);
    });
    await updateDocument('businesses', businessId, { balance: total, updatedAt: getMyanmarISOString() });
    const customerRef = db.collection('finance_customers').doc(businessId);
    const custDoc = await customerRef.get();
    if (custDoc.exists) {
        await customerRef.update({ balance: total, updatedAt: getMyanmarISOString() });
    }
};

/** Recalc and sync client total from client_business_balances, and finance_customers. */
const recalcAndSyncClientTotal = async (clientId: string): Promise<void> => {
    const total = await apiGetClientTotalBalance(clientId);
    await updateDocument('clients', clientId, { balance: total, updatedAt: getMyanmarISOString() });
    const customerRef = db.collection('finance_customers').doc(clientId);
    const custDoc = await customerRef.get();
    if (custDoc.exists) {
        await customerRef.update({ balance: total, updatedAt: getMyanmarISOString() });
    }
};

/**
 * Check if client and business are linked in their documents.
 * A pair is valid only if client.linkedBusinessIds includes businessId AND business.linkedClientIds includes clientId.
 */
const isClientBusinessLinked = async (clientId: string, businessId: string): Promise<boolean> => {
    const [client, business] = await Promise.all([
        db.collection('clients').doc(clientId).get(),
        db.collection('businesses').doc(businessId).get(),
    ]);
    if (!client.exists || !business.exists) return false;
    const clientData = client.data() as Client;
    const businessData = business.data() as Business;
    const clientLinkedBusinesses = clientData?.linkedBusinessIds ?? [];
    const businessLinkedClients = businessData?.linkedClientIds ?? [];
    return clientLinkedBusinesses.includes(businessId) && businessLinkedClients.includes(clientId);
};

const isQuotaExceededError = (error: unknown): boolean => {
    const err = error as { code?: string; message?: string };
    const message = (err?.message || String(error || '')).toLowerCase();
    return err?.code === 'resource-exhausted' || message.includes('quota exceeded') || message.includes('resource-exhausted');
};

const requireLinkedPair = async (clientId: string, businessId: string, context: string): Promise<void> => {
    if (!clientId || !businessId) return;
    const [client, business] = await Promise.all([
        db.collection('clients').doc(clientId).get(),
        db.collection('businesses').doc(businessId).get(),
    ]);
    const clientData = client.exists ? (client.data() as Client) : null;
    const businessData = business.exists ? (business.data() as Business) : null;
    const clientHas = !!(clientData?.linkedBusinessIds ?? []).includes(businessId);
    const businessHas = !!(businessData?.linkedClientIds ?? []).includes(clientId);
    const linked = clientHas && businessHas;
    if (!linked) throw new Error(`Client and business must be linked. Link them in Clients & Businesses first. (${context})`);
};

/** Ensure client ↔ business are linked on both documents (idempotent). */
export const apiEnsureClientBusinessLink = async (clientId: string, businessId: string): Promise<boolean> => {
    if (!clientId || !businessId) return false;
    if (await isClientBusinessLinked(clientId, businessId)) return false;
    const now = getMyanmarISOString();
    await Promise.all([
        db.collection('clients').doc(clientId).update({
            linkedBusinessIds: firebase.firestore.FieldValue.arrayUnion(businessId),
            updatedAt: now,
        }),
        db.collection('businesses').doc(businessId).update({
            linkedClientIds: firebase.firestore.FieldValue.arrayUnion(clientId),
            updatedAt: now,
        }),
    ]);
    return true;
};

/**
 * Repair missing business↔client links using clientIds found on sales for that business.
 * Returns client IDs that were newly linked.
 */
export const apiRepairBusinessClientLinksFromSales = async (businessId: string): Promise<string[]> => {
    if (!businessId) return [];
    const business = await apiGetBusinessById(businessId);
    if (!business) return [];
    const sales = await apiGetSalesForBusiness(businessId);
    const saleClientIds = [...new Set(sales.map(s => s.clientId).filter(Boolean))];
    const existing = new Set(business.linkedClientIds || []);
    const missing = saleClientIds.filter(id => !existing.has(id));
    const repaired: string[] = [];
    for (const clientId of missing) {
        const client = await apiGetClientById(clientId);
        if (!client) continue;
        const didLink = await apiEnsureClientBusinessLink(clientId, businessId);
        if (didLink) repaired.push(clientId);
    }
    return repaired;
};

export type ClientBusinessLinkRepairResult = {
    pairsFromSales: number;
    pairsFromBalances: number;
    pairsFromOneSided: number;
    linksCreated: number;
    sampleRepaired: string[];
};

/**
 * Full-dataset repair: restore missing client↔business links from
 * (1) one-sided link arrays, (2) sales history, (3) balance records.
 */
export const apiRepairAllClientBusinessLinks = async (): Promise<ClientBusinessLinkRepairResult> => {
    const [clients, businesses] = await Promise.all([apiGetClients(), apiGetBusinesses()]);
    const clientMap = new Map(clients.map(c => [c.id, { ...c, linkedBusinessIds: [...(c.linkedBusinessIds || [])] }]));
    const businessMap = new Map(businesses.map(b => [b.id, { ...b, linkedClientIds: [...(b.linkedClientIds || [])] }]));

    const neededPairs = new Map<string, { clientId: string; businessId: string; source: 'oneSided' | 'sales' | 'balances' }>();
    const addPair = (clientId: string, businessId: string, source: 'oneSided' | 'sales' | 'balances') => {
        if (!clientId || !businessId) return;
        if (!clientMap.has(clientId) || !businessMap.has(businessId)) return;
        const key = `${clientId}_${businessId}`;
        if (!neededPairs.has(key)) neededPairs.set(key, { clientId, businessId, source });
    };

    let pairsFromOneSided = 0;
    for (const client of clientMap.values()) {
        for (const businessId of client.linkedBusinessIds || []) {
            const biz = businessMap.get(businessId);
            if (!biz) continue;
            if (!(biz.linkedClientIds || []).includes(client.id)) {
                addPair(client.id, businessId, 'oneSided');
                pairsFromOneSided += 1;
            }
        }
    }
    for (const business of businessMap.values()) {
        for (const clientId of business.linkedClientIds || []) {
            const client = clientMap.get(clientId);
            if (!client) continue;
            if (!(client.linkedBusinessIds || []).includes(business.id)) {
                addPair(clientId, business.id, 'oneSided');
                pairsFromOneSided += 1;
            }
        }
    }

    // Sales: collect every clientId+businessId pair used in history
    // Note: firebase compat Query has no .select() — read full docs.
    let pairsFromSales = 0;
    const salesSnap = await db.collection('sales').get();
    salesSnap.docs.forEach(doc => {
        const data = doc.data() as { clientId?: string; businessId?: string };
        if (!data.clientId || !data.businessId) return;
        const client = clientMap.get(data.clientId);
        const biz = businessMap.get(data.businessId);
        if (!client || !biz) return;
        const already =
            (client.linkedBusinessIds || []).includes(data.businessId) &&
            (biz.linkedClientIds || []).includes(data.clientId);
        if (!already) {
            addPair(data.clientId, data.businessId, 'sales');
            pairsFromSales += 1;
        }
    });

    let pairsFromBalances = 0;
    const balancesSnap = await db.collection('client_business_balances').get();
    balancesSnap.docs.forEach(doc => {
        const data = doc.data() as { clientId?: string; businessId?: string };
        // Balance doc ids are often `${clientId}_${businessId}`
        const clientId = data.clientId || (doc.id.includes('_') ? doc.id.split('_')[0] : '');
        const businessId = data.businessId || (doc.id.includes('_') ? doc.id.slice(doc.id.indexOf('_') + 1) : '');
        if (!clientId || !businessId) return;
        const client = clientMap.get(clientId);
        const biz = businessMap.get(businessId);
        if (!client || !biz) return;
        const already =
            (client.linkedBusinessIds || []).includes(businessId) &&
            (biz.linkedClientIds || []).includes(clientId);
        if (!already) {
            addPair(clientId, businessId, 'balances');
            pairsFromBalances += 1;
        }
    });

    const now = getMyanmarISOString();
    let linksCreated = 0;
    const sampleRepaired: string[] = [];
    const pairs = Array.from(neededPairs.values());

    // Firestore batch limit 500; each pair may need up to 2 updates
    const CHUNK = 200;
    for (let i = 0; i < pairs.length; i += CHUNK) {
        const chunk = pairs.slice(i, i + CHUNK);
        const batch = db.batch();
        let ops = 0;
        for (const { clientId, businessId } of chunk) {
            const client = clientMap.get(clientId);
            const business = businessMap.get(businessId);
            if (!client || !business) continue;
            const clientHas = (client.linkedBusinessIds || []).includes(businessId);
            const bizHas = (business.linkedClientIds || []).includes(clientId);
            if (clientHas && bizHas) continue;
            if (!clientHas) {
                batch.update(db.collection('clients').doc(clientId), {
                    linkedBusinessIds: firebase.firestore.FieldValue.arrayUnion(businessId),
                    updatedAt: now,
                });
                client.linkedBusinessIds = [...(client.linkedBusinessIds || []), businessId];
                ops += 1;
            }
            if (!bizHas) {
                batch.update(db.collection('businesses').doc(businessId), {
                    linkedClientIds: firebase.firestore.FieldValue.arrayUnion(clientId),
                    updatedAt: now,
                });
                business.linkedClientIds = [...(business.linkedClientIds || []), clientId];
                ops += 1;
            }
            linksCreated += 1;
            if (sampleRepaired.length < 20) sampleRepaired.push(`${clientId}↔${businessId}`);
        }
        if (ops > 0) await batch.commit();
    }

    void logActivityHelper(
        'Clients & Businesses',
        'Repair Links',
        `Repaired ${linksCreated} client-business link(s) from sales/balances/one-sided arrays`,
        undefined,
        { linksCreated, pairsFromSales, pairsFromBalances, pairsFromOneSided }
    );

    return { pairsFromSales, pairsFromBalances, pairsFromOneSided, linksCreated, sampleRepaired };
};

/** Verified linked business IDs for a client (both documents must reference each other). */
export const getResolvedLinkedBusinessIds = async (clientId: string): Promise<string[]> => {
    const client = await apiGetClientById(clientId);
    if (!client?.linkedBusinessIds?.length) return [];
    const verified: string[] = [];
    for (const businessId of client.linkedBusinessIds) {
        if (!businessId || verified.includes(businessId)) continue;
        if (await isClientBusinessLinked(clientId, businessId)) {
            verified.push(businessId);
        }
    }
    return verified;
};

/**
 * Get or create client-business balance record
 * @param clientId Client ID
 * @param businessId Business ID
 * @returns ClientBusinessBalance record or null if not found
 */
export const apiGetClientBusinessBalance = async (clientId: string, businessId: string): Promise<ClientBusinessBalance | null> => {
    const balanceId = `${clientId}_${businessId}`;
    const balanceRef = db.collection('client_business_balances').doc(balanceId);
    const balanceDoc = await balanceRef.get();
    
    if (balanceDoc.exists) {
        const data = balanceDoc.data() as Record<string, unknown>;
        const result = convertTimestamps({ id: balanceDoc.id, ...data }) as ClientBusinessBalance;
        // Ensure openingBalance is included - fallback to business opening if missing on balance doc
        if (result && (result.openingBalance === undefined || result.openingBalance === null)) {
            try {
                const business = await apiGetBusinessById(businessId);
                if (business && (business.openingBalance !== undefined && business.openingBalance !== null)) {
                    result.openingBalance = business.openingBalance;
                }
            } catch {
                // Ignore - use 0 as fallback
            }
        }
        return result;
    }
    
    // Create new balance record only if client and business are linked
    const linked = await isClientBusinessLinked(clientId, businessId);
    if (!linked) return null;

    let openingBalance = 0;
    try {
        const business = await apiGetBusinessById(businessId);
        if (business?.openingBalance != null) openingBalance = business.openingBalance;
    } catch { /* ignore */ }
    
    const newBalance: Omit<ClientBusinessBalance, 'id'> = {
        clientId,
        businessId,
        balance: 0,
        openingBalance: openingBalance ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    
    await balanceRef.set({
        ...newBalance,
        createdAt: getMyanmarISOString(),
        updatedAt: getMyanmarISOString(),
    });
    
    const createdDoc = await balanceRef.get();
    return convertTimestamps({ id: createdDoc.id, ...createdDoc.data() }) as ClientBusinessBalance;
};

/**
 * Calculate client-business pair balance (transaction portion) from transactions.
 * Uses CANONICAL formula:
 *   Total Billed = Opening Balance + Approved Sales (grandTotalMMK) + Adj(INCREASE) - Credit Notes(APPROVED) - Adj(DECREASE) - Refunds
 *   Outstanding = Total Billed - Payments - Bad Debt
 * Returns: balance (transaction portion only; Outstanding = openingBalance + balance)
 */
export const apiCalculateClientBusinessBalance = async (clientId: string, businessId: string): Promise<number> => {
    const [salesSnapshot, paymentsSnapshot, refundsSnapshot, creditNotesSnapshot, adjustmentsSnapshot, badDebtsSnapshot] = await Promise.all([
        db.collection('sales')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get(),
        db.collection('payments')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get(),
        db.collection('refunds')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get(),
        db.collection('credit_notes')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get(),
        db.collection('balance_adjustments')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get(),
        db.collection('bad_debts')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get(),
    ]);
    
    // Canonical: Total Billed = Opening + Approved Sales(grandTotalMMK) + Adj(INCREASE) - Credit Notes(APPROVED) - Adj(DECREASE) - Refunds
    // Outstanding = Total Billed - Payments - Bad Debt
    // Approved Sales (non-DRAFT only)
    const sales = salesSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as SaleRecord);
    const approvedSales = sales
        .filter(s => s.status !== SaleStatus.DRAFT)
        .reduce((sum, s) => sum + s.grandTotalMMK, 0);
    
    // Approved Credit Notes (only APPROVED status)
    const creditNotes = creditNotesSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as CreditNote);
    const approvedCreditNotes = creditNotes
        .filter(cn => cn.status === CreditNoteStatus.APPROVED)
        .reduce((sum, cn) => sum + cn.amountMMK, 0);
    
    // Refunds (reduce what is owed)
    const refunds = refundsSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as Refund);
    const totalRefunds = refunds.reduce((sum, r) => sum + r.amountMMK, 0);
    
    // Balance Adjustments: INCREASE adds, DECREASE subtracts
    const adjustments = adjustmentsSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as BalanceAdjustment);
    const adjustmentInc = adjustments
        .filter(adj => adj.type === BalanceAdjustmentType.INCREASE)
        .reduce((sum, adj) => sum + (adj.amountMMK || 0), 0);
    const adjustmentDec = adjustments
        .filter(adj => adj.type === BalanceAdjustmentType.DECREASE)
        .reduce((sum, adj) => sum + (adj.amountMMK || 0), 0);
    
    // Total Billed (tx) = Sales + Adj(INC) - Credit Notes - Adj(DEC) - Refunds
    const totalBilledTx = approvedSales + adjustmentInc - approvedCreditNotes - adjustmentDec - totalRefunds;
    
    // Payments: APPROVED only, exclude refunded (!refundId)
    const payments = paymentsSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as Payment);
    const approvedPayments = payments
        .filter(p => p.status === PaymentStatus.APPROVED && !p.refundId)
        .reduce((sum, p) => sum + p.amountMMK, 0);
    
    // Bad Debts (reduce outstanding)
    const badDebts = badDebtsSnapshot.docs.map(d => d.data() as { writtenOffAmount?: number; originalAmount?: number });
    const sumBadDebt = badDebts.reduce((sum, bd) => sum + (bd.writtenOffAmount ?? bd.originalAmount ?? 0), 0);
    
    // Outstanding = Total Billed - Payments - Bad Debt
    return totalBilledTx - approvedPayments - sumBadDebt;
};

/**
 * Update client-business balance
 * @param clientId Client ID
 * @param businessId Business ID
 * @param amount Amount to increment or set
 * @param operation 'increment' to add/subtract, 'set' to set absolute value
 */
export const apiUpdateClientBusinessBalance = async (
    clientId: string,
    businessId: string,
    amount: number,
    operation: 'increment' | 'set' = 'increment'
): Promise<void> => {
    const balanceId = `${clientId}_${businessId}`;
    const balanceRef = db.collection('client_business_balances').doc(balanceId);
    
    await db.runTransaction(async (transaction) => {
        const balanceDoc = await transaction.get(balanceRef);
        
        if (balanceDoc.exists) {
            if (operation === 'increment') {
                transaction.update(balanceRef, {
                    balance: firebase.firestore.FieldValue.increment(amount),
                    updatedAt: getMyanmarISOString(),
                });
            } else {
                transaction.update(balanceRef, {
                    balance: amount,
                    updatedAt: getMyanmarISOString(),
                });
            }
        } else {
            // Create new balance record only if client and business are linked
            const linked = await isClientBusinessLinked(clientId, businessId);
            if (!linked) {
                throw new Error(`Client ${clientId} and business ${businessId} are not linked. Cannot create balance pair. Link them in client and business documents first.`);
            }
            transaction.set(balanceRef, {
                clientId,
                businessId,
                balance: operation === 'set' ? amount : amount,
                openingBalance: 0,
                createdAt: getMyanmarISOString(),
                updatedAt: getMyanmarISOString(),
            });
        }
    });
};

/**
 * Get client's total outstanding (sum of pair Outstanding for all linked client-business pairs).
 * Each pair Outstanding = openingBalance + balance; client total = sum across all pairs.
 * @param clientId Client ID
 * @returns Total outstanding across all linked pairs
 */
export const apiGetClientTotalBalance = async (clientId: string): Promise<number> => {
    const client = await apiGetClientById(clientId);
    if (!client) return 0;
    
    // Get all client-business balances for this client
    const balancesSnapshot = await db.collection('client_business_balances')
        .where('clientId', '==', clientId)
        .get();
    
    let totalBalance = 0;
    balancesSnapshot.docs.forEach(doc => {
        const balanceData = doc.data() as ClientBusinessBalance;
        const openingBalance = balanceData.openingBalance || 0;
        totalBalance += openingBalance + balanceData.balance;
    });
    
    return totalBalance;
};

/**
 * Get client-business balances for a client (all linked businesses).
 */
export const apiGetClientBusinessBalancesByClient = async (clientId: string): Promise<ClientBusinessBalance[]> => {
    const snapshot = await db.collection('client_business_balances')
        .where('clientId', '==', clientId)
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return convertTimestamps({ id: doc.id, ...data }) as ClientBusinessBalance;
    });
};

/**
 * Get client-business balances for a business (all linked clients).
 */
export const apiGetClientBusinessBalancesByBusiness = async (businessId: string): Promise<ClientBusinessBalance[]> => {
    const snapshot = await db.collection('client_business_balances')
        .where('businessId', '==', businessId)
        .get();
    return snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, unknown>;
        return convertTimestamps({ id: doc.id, ...data }) as ClientBusinessBalance;
    });
};

/**
 * Set opening balance on a specific client-business pair.
 * Creates the balance doc if it does not exist.
 */
export const apiSetClientBusinessOpeningBalance = async (
    clientId: string,
    businessId: string,
    openingBalance: number,
    openingBalanceSetDate?: string
): Promise<void> => {
    const linked = await isClientBusinessLinked(clientId, businessId);
    if (!linked) {
        throw new Error(`Client ${clientId} and business ${businessId} are not linked. Cannot set opening balance. Link them in client and business documents first.`);
    }
    const balanceId = `${clientId}_${businessId}`;
    const balanceRef = db.collection('client_business_balances').doc(balanceId);
    const balanceDoc = await balanceRef.get();
    const existing = balanceDoc.exists ? balanceDoc.data() as Record<string, unknown> : undefined;

    await balanceRef.set({
        ...(existing || {}),
        clientId,
        businessId,
        openingBalance,
        openingBalanceSetDate: openingBalanceSetDate || getMyanmarISOString(),
        updatedAt: getMyanmarISOString(),
    }, { merge: true });

    try {
        await apiRecalculateClientBalance(clientId, businessId);
    } catch (e) {
        console.error('Failed to recalculate after setting opening balance:', e);
    }
};

/**
 * Get client-business pairs that have an opening balance set (non-zero).
 * Used for targeted balance recalculation (only those with opening balance).
 */
export const apiGetClientBusinessBalancesWithOpeningBalance = async (): Promise<Array<{ clientId: string; businessId: string }>> => {
    const snapshot = await db.collection('client_business_balances').get();
    const pairs: Array<{ clientId: string; businessId: string }> = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const openingBalance = data.openingBalance ?? 0;
        if (openingBalance !== 0 && data.clientId && data.businessId) {
            pairs.push({ clientId: data.clientId, businessId: data.businessId });
        }
    });
    return pairs;
};

/**
 * Get all client-business balance records that have opening balance set (including 0).
 * Used for Finance > Opening Balance page (Excel import + manual records).
 * Includes pairs with openingBalance = 0 so count matches "already in database" from import.
 */
export const apiGetAllOpeningBalanceRecords = async (): Promise<ClientBusinessBalance[]> => {
    const snapshot = await db.collection('client_business_balances').get();
    const list: ClientBusinessBalance[] = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        if (data.clientId && data.businessId && (data.openingBalance !== undefined && data.openingBalance !== null)) {
            list.push(convertTimestamps({ id: doc.id, ...data }) as ClientBusinessBalance);
        }
    });
    return list;
};

/**
 * Get client-business pairs that have outstanding balance > 0.
 * Used for bulk balance recalculation using the correct formula.
 */
export const apiGetClientBusinessPairsWithOutstandingBalance = async (): Promise<Array<{ clientId: string; businessId: string }>> => {
    const snapshot = await db.collection('client_business_balances').get();
    const pairs: Array<{ clientId: string; businessId: string }> = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const openingBalance = data.openingBalance ?? 0;
        const balance = data.balance ?? 0;
        const outstanding = openingBalance + balance;
        if (outstanding > 0 && data.clientId && data.businessId) {
            pairs.push({ clientId: data.clientId, businessId: data.businessId });
        }
    });
    return pairs;
};

/**
 * Get client-business pairs that have outstanding balance < 0.
 * Used for bulk balance recalculation (negative/credit balances) using the correct formula.
 */
export const apiGetClientBusinessPairsWithNegativeOutstandingBalance = async (): Promise<Array<{ clientId: string; businessId: string }>> => {
    const snapshot = await db.collection('client_business_balances').get();
    const pairs: Array<{ clientId: string; businessId: string }> = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const openingBalance = data.openingBalance ?? 0;
        const balance = data.balance ?? 0;
        const outstanding = openingBalance + balance;
        if (outstanding < 0 && data.clientId && data.businessId) {
            pairs.push({ clientId: data.clientId, businessId: data.businessId });
        }
    });
    return pairs;
};

/**
 * Get client-business balances with opening balance for Overdue tab.
 * Returns pairs where openingBalance > 0 with their outstanding amount (openingBalance + balance).
 */
export const apiGetClientBusinessBalancesForOverdue = async (): Promise<Array<{
    clientId: string;
    businessId: string;
    outstanding: number;
    openingBalance: number;
}>> => {
    const snapshot = await db.collection('client_business_balances').get();
    const result: Array<{ clientId: string; businessId: string; outstanding: number; openingBalance: number }> = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const openingBalance = data.openingBalance ?? 0;
        const balance = data.balance ?? 0;
        if (openingBalance !== 0 && data.clientId && data.businessId) {
            const outstanding = openingBalance + balance;
            if (outstanding > 0) {
                result.push({
                    clientId: data.clientId,
                    businessId: data.businessId,
                    outstanding,
                    openingBalance,
                });
            }
        }
    });
    return result;
};

/**
 * Get all client-business pairs where outstanding balance (openingBalance + balance) > 0.
 * Used for Accounts Receivable "All Receivable" list so receivables are from pair balances only.
 */
export const apiGetClientBusinessBalancesReceivable = async (): Promise<Array<{
    clientId: string;
    businessId: string;
    outstanding: number;
    openingBalance: number;
}>> => {
    const snapshot = await db.collection('client_business_balances').get();
    const result: Array<{ clientId: string; businessId: string; outstanding: number; openingBalance: number }> = [];
    snapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const openingBalance = data.openingBalance ?? 0;
        const balance = data.balance ?? 0;
        const outstanding = openingBalance + balance;
        if (outstanding > 0 && data.clientId && data.businessId) {
            result.push({
                clientId: data.clientId,
                businessId: data.businessId,
                outstanding,
                openingBalance,
            });
        }
    });
    return result;
};

/**
 * Recalculate all client-business balances for a client from transactions.
 * Syncs both client total (sum of all pair outstanding) and each linked business total (sum of pair outstanding for that business).
 * @param clientId Client ID
 */
export const apiRecalculateAllClientBusinessBalances = async (clientId: string): Promise<void> => {
    const client = await apiGetClientById(clientId);
    if (!client) throw new Error("Client not found");
    
    const linkedBusinessIds = client.linkedBusinessIds || [];
    
    // Recalculate balance for each linked business pair
    for (const businessId of linkedBusinessIds) {
        const calculatedBalance = await apiCalculateClientBusinessBalance(clientId, businessId);
        await apiUpdateClientBusinessBalance(clientId, businessId, calculatedBalance, 'set');
    }
    
    // Sync client total from pair sums (sum of openingBalance + balance for all pairs)
    const clientTotalBalance = await apiGetClientTotalBalance(clientId);
    await updateDocument('clients', clientId, { balance: clientTotalBalance });
    
    // Sync each linked business total from pair sums (sum of openingBalance + balance for all pairs of that business)
    for (const businessId of linkedBusinessIds) {
        const balancesSnapshot = await db.collection('client_business_balances')
            .where('businessId', '==', businessId)
            .get();
        let businessTotalBalance = 0;
        balancesSnapshot.docs.forEach(doc => {
            const balanceData = doc.data() as ClientBusinessBalance;
            const openingBalance = balanceData.openingBalance || 0;
            businessTotalBalance += openingBalance + (balanceData.balance ?? 0);
        });
        await updateDocument('businesses', businessId, { balance: businessTotalBalance } as Partial<Business>);
    }
};

/**
 * Migration function: Initialize client_business_balances from existing transactions
 * This should be run once to populate the client_business_balances collection
 * from existing sales, invoices, payments, refunds, and credit notes.
 * 
 * @returns Object with counts of created balance records
 */
export const apiInitializeClientBusinessBalances = async (): Promise<{
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    errors: string[];
}> => {
    const result = {
        createdCount: 0,
        updatedCount: 0,
        errorCount: 0,
        errors: [] as string[],
    };
    
    try {
        // Get all clients
        const allClients = await apiGetClients();
        
        // Process each client
        for (const client of allClients) {
            const linkedBusinessIds = client.linkedBusinessIds || [];
            
            // If client has no linked businesses, skip (or create a default entry if needed)
            if (linkedBusinessIds.length === 0) {
                continue;
            }
            
            // Process each client-business combination (only if linked in both documents)
            for (const businessId of linkedBusinessIds) {
                try {
                    const linked = await isClientBusinessLinked(client.id, businessId);
                    if (!linked) continue;

                    // Calculate balance from transactions
                    const calculatedBalance = await apiCalculateClientBusinessBalance(client.id, businessId);
                    
                    // Get or create balance record
                    const balanceId = `${client.id}_${businessId}`;
                    const balanceRef = db.collection('client_business_balances').doc(balanceId);
                    const balanceDoc = await balanceRef.get();
                    
                    if (balanceDoc.exists) {
                        // Update existing record
                        await balanceRef.update({
                            balance: calculatedBalance,
                            updatedAt: getMyanmarISOString(),
                        });
                        result.updatedCount++;
                    } else {
                        // Create new record
                        await balanceRef.set({
                            clientId: client.id,
                            businessId: businessId,
                            balance: calculatedBalance,
                            openingBalance: 0, // Opening balance should be set separately if needed
                            createdAt: getMyanmarISOString(),
                            updatedAt: getMyanmarISOString(),
                        });
                        result.createdCount++;
                    }
                } catch (error) {
                    result.errorCount++;
                    result.errors.push(`Error processing ${client.id}_${businessId}: ${(error as Error).message}`);
                    console.error(`Error processing client-business balance ${client.id}_${businessId}:`, error);
                }
            }
        }
        
        // After creating/updating all client-business balances, update client and business totals
        for (const client of allClients) {
            try {
                const totalBalance = await apiGetClientTotalBalance(client.id);
                await updateDocument('clients', client.id, { balance: totalBalance });
            } catch (error) {
                console.error(`Error updating client total balance for ${client.id}:`, error);
            }
        }
        
        // Update business totals
        const allBusinesses = await apiGetBusinesses();
        for (const business of allBusinesses) {
            try {
                // Calculate business total from all client-business balances for this business
                const balancesSnapshot = await db.collection('client_business_balances')
                    .where('businessId', '==', business.id)
                    .get();
                
                let businessTotalBalance = 0;
                balancesSnapshot.docs.forEach(doc => {
                    const balanceData = doc.data() as ClientBusinessBalance;
                    const openingBalance = balanceData.openingBalance || 0;
                    businessTotalBalance += openingBalance + balanceData.balance;
                });
                
                await updateDocument('businesses', business.id, { balance: businessTotalBalance });
            } catch (error) {
                console.error(`Error updating business total balance for ${business.id}:`, error);
            }
        }
        
        void logActivityHelper('Migration', 'Initialize Client-Business Balances', 
            `Initialized ${result.createdCount} new and updated ${result.updatedCount} existing client-business balances`, 
            'migration', 
            { createdCount: result.createdCount, updatedCount: result.updatedCount, errorCount: result.errorCount });
        
        return result;
    } catch (error) {
        console.error("Failed to initialize client-business balances:", error);
        throw error;
    }
};

// New Client/Business Import Function
export const apiProcessClientBusinessImport = async (data: ParsedExcelRow[]): Promise<ImportResult> => {
    const results: ImportResult = {
        clientsAdded: 0, businessesAdded: 0, clientsUpdated: 0, businessesUpdated: 0, linksCreated: 0, errors: []
    };

    // 1. Fetch initial state
    const [initialClients, initialBusinesses] = await Promise.all([apiGetClients(), apiGetBusinesses()]);
    const clientIdMap = new Map(initialClients.map(c => [c.id, c]));
    const businessIdMap = new Map(initialBusinesses.map(b => [b.id, b]));

    // 2. Classify rows and determine max IDs from file
    let maxClientIdFromFile = 0;
    let maxBusinessIdFromFile = 0;
    const rowsToCreateClientWithoutId: ParsedExcelRow[] = [];
    const rowsToCreateBusinessWithoutId: ParsedExcelRow[] = [];
    const rowIdMap = new Map<number, { clientId?: string, businessId?: string }>();

    for (const row of data) {
        // Only require business name now, client name is optional (will be "N/A" if empty)
        if (!row.businessName) continue;

        // Ensure client name is set (should already be "N/A" if empty from frontend, but double-check)
        const clientName = row.clientName && row.clientName.trim() ? row.clientName.trim() : 'N/A';

        if (clientName) {
            if (row.clientId) {
                const idMatch = row.clientId.match(/^CL-(\d+)$/);
                if (!idMatch) {
                    results.errors.push({ row: row.rowIndex, message: `Invalid Client ID format: ${row.clientId}. Expected format: CL-0001` });
                    continue;
                }
                const idNum = parseInt(idMatch[1], 10);
                if (idNum > maxClientIdFromFile) maxClientIdFromFile = idNum;
                rowIdMap.set(row.rowIndex, { ...rowIdMap.get(row.rowIndex), clientId: row.clientId });
            } else {
                // Create a modified row with clientName set to "N/A" if it was empty
                const modifiedRow = { ...row, clientName: clientName };
                rowsToCreateClientWithoutId.push(modifiedRow);
            }
        }
        
        if (row.businessName) {
            if (row.businessId) {
                const idMatch = row.businessId.match(/^B-(\d+)$/);
                 if (!idMatch) {
                    results.errors.push({ row: row.rowIndex, message: `Invalid Business ID format: ${row.businessId}. Expected format: B-0001` });
                    continue;
                }
                const idNum = parseInt(idMatch[1], 10);
                if (idNum > maxBusinessIdFromFile) maxBusinessIdFromFile = idNum;
                rowIdMap.set(row.rowIndex, { ...rowIdMap.get(row.rowIndex), businessId: row.businessId });
            } else {
                rowsToCreateBusinessWithoutId.push(row);
            }
        }
    }

    // 3. Reserve new IDs transactionally
    // Use the same counter document names as getNextId function (prefix.toLowerCase() + '_counter')
    const clientCounterRef = db.collection('counters').doc(`${CLIENT_ID_PREFIX.toLowerCase()}_counter`);
    const businessCounterRef = db.collection('counters').doc(`${BUSINESS_ID_PREFIX.toLowerCase()}_counter`);
    
    await db.runTransaction(async (transaction) => {
        const clientCounterDoc = await transaction.get(clientCounterRef);
        const businessCounterDoc = await transaction.get(businessCounterRef);

        let currentClientCount = clientCounterDoc.exists ? clientCounterDoc.data()!.count || 0 : 0;
        // Ensure counter is at least as high as the max ID found in the file (to prevent collisions)
        // This is critical: if Excel contains CL-0004, counter must be at least 4
        const minClientCounter = Math.max(currentClientCount, maxClientIdFromFile);
        
        // Generate IDs for rows without client IDs, starting from minCounter + 1
        rowsToCreateClientWithoutId.forEach((row, i) => {
            const newId = `${CLIENT_ID_PREFIX}${String(minClientCounter + 1 + i).padStart(4, '0')}`;
            rowIdMap.set(row.rowIndex, { ...rowIdMap.get(row.rowIndex), clientId: newId });
        });
        
        // Update counter: max of (minCounter + new clients created, maxIdFromFile)
        // This ensures future ID generation won't collide with imported IDs
        const finalClientCounter = Math.max(minClientCounter + rowsToCreateClientWithoutId.length, maxClientIdFromFile);
        if (finalClientCounter > currentClientCount) {
             transaction.set(clientCounterRef, { count: finalClientCounter }, { merge: true });
        }
        
        let currentBusinessCount = businessCounterDoc.exists ? businessCounterDoc.data()!.count || 0 : 0;
        // Ensure counter is at least as high as the max ID found in the file (to prevent collisions)
        // This is critical: if Excel contains B-0004, counter must be at least 4
        const minBusinessCounter = Math.max(currentBusinessCount, maxBusinessIdFromFile);
        
        // Generate IDs for rows without business IDs, starting from minCounter + 1
        rowsToCreateBusinessWithoutId.forEach((row, i) => {
            const newId = `${BUSINESS_ID_PREFIX}${String(minBusinessCounter + 1 + i).padStart(4, '0')}`;
            rowIdMap.set(row.rowIndex, { ...rowIdMap.get(row.rowIndex), businessId: newId });
        });
        
        // Update counter: max of (minCounter + new businesses created, maxIdFromFile)
        // This ensures future ID generation won't collide with imported IDs
        const finalBusinessCounter = Math.max(minBusinessCounter + rowsToCreateBusinessWithoutId.length, maxBusinessIdFromFile);
        if (finalBusinessCounter > currentBusinessCount) {
             transaction.set(businessCounterRef, { count: finalBusinessCounter }, { merge: true });
        }
    });

    // 4. Perform batch writes and track entities needing finance sync (double-sync rule: sync business when both set)
    const batch = db.batch();
    const timestamps = { 
        createdAt: getMyanmarISOString(), 
        updatedAt: getMyanmarISOString()
    };
    const entitiesToSync: Array<{ entityId: string; entityName: string; openingBalance: number; isBusiness: boolean }> = [];
    
    for (const row of data) {
        const ids = rowIdMap.get(row.rowIndex);
        if (!ids) continue;

        const { clientId, businessId } = ids;

        if (clientId) {
            const clientRef = db.collection('clients').doc(clientId);
            // Ensure client name is set (should already be "N/A" if empty from frontend)
            const clientName = row.clientName && row.clientName.trim() ? row.clientName.trim() : 'N/A';
            
            if (clientIdMap.has(clientId)) {
                const currentClient = clientIdMap.get(clientId);
                const updatePayload: any = { updatedAt: timestamps.updatedAt };
                if (clientName) updatePayload.name = clientName;
                // Phone is now optional - only update if provided
                if (row.clientPhone !== undefined && row.clientPhone !== null && row.clientPhone !== '') {
                    updatePayload.phone = row.clientPhone;
                }
                if (row.clientEmail !== undefined) updatePayload.email = row.clientEmail;
                if (row.personalFbLink !== undefined) updatePayload.personalFbLink = row.personalFbLink;
                if (row.viberTelegram !== undefined) updatePayload.viberTelegram = row.viberTelegram;
                if (row.clientAddress !== undefined) updatePayload.address = row.clientAddress;
                if (row.clientCity !== undefined) updatePayload.city = row.clientCity;
                if (row.clientState !== undefined) updatePayload.state = row.clientState;
                if (row.clientCountry !== undefined) updatePayload.country = row.clientCountry;
                if (row.clientCustomerCode !== undefined) updatePayload.customerCode = row.clientCustomerCode;
                if (row.clientOpeningBalance !== undefined && row.clientOpeningBalance !== '') {
                    const openingBalance = Number(row.clientOpeningBalance);
                    if (!isNaN(openingBalance)) {
                        updatePayload.openingBalance = openingBalance;
                        updatePayload.openingBalanceSetDate = getMyanmarISOString();
                        // Adjust balance when opening balance changes (same as apiUpdateClient)
                        if (currentClient) {
                            const oldOB = currentClient.openingBalance ?? 0;
                            const diff = openingBalance - oldOB;
                            updatePayload.balance = (currentClient.balance ?? 0) + diff;
                        }
                    }
                }
                if (row.clientCustomFacebookAdsRateMMK !== undefined && row.clientCustomFacebookAdsRateMMK !== '') {
                    const customRate = Number(row.clientCustomFacebookAdsRateMMK);
                    if (!isNaN(customRate) && customRate > 0) {
                        updatePayload.customFacebookAdsRateMMK = customRate;
                    }
                }
                batch.update(clientRef, updatePayload);
                results.clientsUpdated++;
            } else {
                const openingBalance = row.clientOpeningBalance && row.clientOpeningBalance !== '' ? Number(row.clientOpeningBalance) : undefined;
                const customRate = row.clientCustomFacebookAdsRateMMK && row.clientCustomFacebookAdsRateMMK !== '' ? Number(row.clientCustomFacebookAdsRateMMK) : undefined;
                const newClientDoc: any = {
                    name: clientName, 
                    phone: row.clientPhone && row.clientPhone.trim() ? row.clientPhone.trim() : '', 
                    email: row.clientEmail || '', 
                    personalFbLink: row.personalFbLink || '', 
                    viberTelegram: row.viberTelegram || '', 
                    address: row.clientAddress || '',
                    city: row.clientCity || '',
                    state: row.clientState || '',
                    country: row.clientCountry || '',
                    customerCode: row.clientCustomerCode || '',
                    linkedBusinessIds: [],
                    balance: 0,
                };
                
                // Only add openingBalance if it's a valid number
                if (openingBalance !== undefined && !isNaN(openingBalance)) {
                    newClientDoc.openingBalance = openingBalance;
                    newClientDoc.openingBalanceSetDate = getMyanmarISOString();
                }
                
                // Only add customFacebookAdsRateMMK if it's a valid number > 0
                if (customRate !== undefined && !isNaN(customRate) && customRate > 0) {
                    newClientDoc.customFacebookAdsRateMMK = customRate;
                }
                
                batch.set(clientRef, { ...newClientDoc, ...timestamps });
                results.clientsAdded++;
            }
        }

        if (businessId && row.businessName) {
            const businessRef = db.collection('businesses').doc(businessId);
            if (businessIdMap.has(businessId)) {
                const currentBusiness = businessIdMap.get(businessId);
                const updatePayload: any = { updatedAt: timestamps.updatedAt };
                if (row.businessName) updatePayload.name = row.businessName;
                if(row.businessIndustry !== undefined) updatePayload.industry = row.businessIndustry;
                if(row.businessPhone !== undefined) updatePayload.phone = row.businessPhone;
                if(row.businessEmail !== undefined) updatePayload.email = row.businessEmail;
                if(row.businessAddress !== undefined) updatePayload.address = row.businessAddress;
                if(row.businessCity !== undefined) updatePayload.city = row.businessCity;
                if(row.businessState !== undefined) updatePayload.state = row.businessState;
                if(row.businessCountry !== undefined) updatePayload.country = row.businessCountry;
                if(row.businessCustomerCode !== undefined) updatePayload.customerCode = row.businessCustomerCode;
                if(row.businessFacebookPageId !== undefined) updatePayload.facebookPageId = row.businessFacebookPageId;
                if(row.businessPageUrl !== undefined) updatePayload.businessPageUrl = row.businessPageUrl;
                if(row.websiteUrl !== undefined) updatePayload.websiteUrl = row.websiteUrl;
                if (row.businessOpeningBalance !== undefined && row.businessOpeningBalance !== '') {
                    const openingBalance = Number(row.businessOpeningBalance);
                    if (!isNaN(openingBalance)) {
                        updatePayload.openingBalance = openingBalance;
                        updatePayload.openingBalanceSetDate = getMyanmarISOString();
                        // Adjust balance when opening balance changes (same as apiUpdateBusiness)
                        if (currentBusiness) {
                            const oldOB = currentBusiness.openingBalance ?? 0;
                            const diff = openingBalance - oldOB;
                            updatePayload.balance = (currentBusiness.balance ?? 0) + diff;
                        }
                    }
                }
                if (row.businessCustomFacebookAdsRateMMK !== undefined && row.businessCustomFacebookAdsRateMMK !== '') {
                    const customRate = Number(row.businessCustomFacebookAdsRateMMK);
                    if (!isNaN(customRate) && customRate > 0) {
                        updatePayload.customFacebookAdsRateMMK = customRate;
                    }
                }
                batch.update(businessRef, updatePayload);
                results.businessesUpdated++;
            } else {
                const openingBalance = row.businessOpeningBalance && row.businessOpeningBalance !== '' ? Number(row.businessOpeningBalance) : undefined;
                const customRate = row.businessCustomFacebookAdsRateMMK && row.businessCustomFacebookAdsRateMMK !== '' ? Number(row.businessCustomFacebookAdsRateMMK) : undefined;
                const newBusinessDoc: any = {
                    name: row.businessName!, 
                    industry: row.businessIndustry || '', 
                    phone: row.businessPhone || '',
                    email: row.businessEmail || '', 
                    address: row.businessAddress || '', 
                    city: row.businessCity || '',
                    state: row.businessState || '',
                    country: row.businessCountry || '',
                    customerCode: row.businessCustomerCode || '',
                    facebookPageId: row.businessFacebookPageId || '',
                    businessPageUrl: row.businessPageUrl || '',
                    websiteUrl: row.websiteUrl || '', 
                    linkedClientIds: [],
                    balance: 0,
                };
                
                // Only add openingBalance if it's a valid number
                if (openingBalance !== undefined && !isNaN(openingBalance)) {
                    newBusinessDoc.openingBalance = openingBalance;
                    newBusinessDoc.openingBalanceSetDate = getMyanmarISOString();
                }
                
                // Only add customFacebookAdsRateMMK if it's a valid number > 0
                if (customRate !== undefined && !isNaN(customRate) && customRate > 0) {
                    newBusinessDoc.customFacebookAdsRateMMK = customRate;
                }
                
                batch.set(businessRef, { ...newBusinessDoc, ...timestamps });
                results.businessesAdded++;
            }
        }
        
        if (clientId && businessId) {
            const clientRef = db.collection('clients').doc(clientId);
            batch.update(clientRef, { linkedBusinessIds: firebase.firestore.FieldValue.arrayUnion(businessId) });
            const businessRef = db.collection('businesses').doc(businessId);
            batch.update(businessRef, { linkedClientIds: firebase.firestore.FieldValue.arrayUnion(clientId) });
            results.linksCreated++;
        }

        // Track entities for post-commit finance sync (double-sync: when both set, sync only business)
        const bizOB = row.businessOpeningBalance !== undefined && row.businessOpeningBalance !== '' ? Number(row.businessOpeningBalance) : NaN;
        const clientOB = row.clientOpeningBalance !== undefined && row.clientOpeningBalance !== '' ? Number(row.clientOpeningBalance) : NaN;
        const clientNameForSync = row.clientName && row.clientName.trim() ? row.clientName.trim() : 'N/A';
        if (!isNaN(bizOB) && businessId && row.businessName) {
            entitiesToSync.push({ entityId: businessId, entityName: row.businessName, openingBalance: bizOB, isBusiness: true });
        } else if (!isNaN(clientOB) && clientId) {
            entitiesToSync.push({ entityId: clientId, entityName: clientNameForSync, openingBalance: clientOB, isBusiness: false });
        }
    }

    await batch.commit();

    // Post-commit: sync opening balance to AR and client_business_balances
    for (const { entityId, entityName, openingBalance, isBusiness } of entitiesToSync) {
        try {
            await syncOpeningBalanceToAR(entityId, entityName, openingBalance, isBusiness);
            if (isBusiness) {
                await syncOpeningBalanceToClientBusinessBalances(entityId, openingBalance);
            }
        } catch (error) {
            console.error(`Failed to sync opening balance for ${entityId}:`, error);
            results.errors.push({ row: 0, message: `Finance sync failed for ${entityName}: ${(error as Error).message}` });
        }
    }

    return results;
}

export interface OpeningBalanceImportProgress {
    current: number;
    total: number;
    label: string;
    remaining: number;
}

// Process opening balance import - batches Firestore writes, defers AR sync and recalc to end
const BATCH_SIZE = 450;

export const apiProcessOpeningBalanceImport = async (
    data: Array<{ rowIndex: number; businessName: string; openingBalance: string; businessId?: string; clientId?: string }>,
    onProgress?: (p: OpeningBalanceImportProgress) => void
): Promise<{ businessesUpdated: number; clientsUpdated: number; pairsUpdated: number; skipped: number; errors: { row: number; message: string }[] }> => {
    const results = {
        businessesUpdated: 0,
        clientsUpdated: 0,
        pairsUpdated: 0,
        skipped: 0,
        errors: [] as { row: number; message: string }[]
    };

    const total = data.length;
    const report = (current: number, label: string) => {
        onProgress?.({
            current,
            total,
            label,
            remaining: total - current,
        });
    };

    // Helper to normalise business names for matching (case-insensitive, trimmed, collapsed spaces)
    const normalizeBusinessName = (name: string | undefined | null): string =>
        (name || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    // Fetch all businesses to match by ID and (normalised) name
    const allBusinesses = await apiGetBusinesses();
    const businessNameMap = new Map<string, Business>();
    const businessIdMap = new Map<string, Business>();
    allBusinesses.forEach(business => {
        const key = normalizeBusinessName(business.name);
        if (key && !businessNameMap.has(key)) {
            businessNameMap.set(key, business);
        }
        if (business.id && !businessIdMap.has(business.id)) {
            businessIdMap.set(business.id, business);
        }
    });

    // Fetch all clients to update linked ones or specific clientId when provided
    const allClients = await apiGetClients();
    const clientMap = new Map<string, Client>();
    allClients.forEach(client => {
        clientMap.set(client.id, client);
    });

    const timestamps = { updatedAt: getMyanmarISOString() };
    const affectedClientIds = new Set<string>();
    const affectedBusinessIds = new Set<string>();

    const BATCH_MAX = 450;
    const batchOps: Array<{ ref: firebase.firestore.DocumentReference; data: any; op: 'update' | 'set' }> = [];
    const flushBatch = async () => {
        if (batchOps.length === 0) return;
        const deduped = new Map<string, { ref: firebase.firestore.DocumentReference; data: any; op: 'update' | 'set' }>();
        for (const op of batchOps) {
            deduped.set(op.ref.path, op);
        }
    const batch = db.batch();
        for (const { ref, data: d, op } of deduped.values()) {
            if (op === 'update') batch.update(ref, d);
            else batch.set(ref, d, { merge: true });
        }
        await batch.commit();
        batchOps.length = 0;
    };

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const { businessName, businessId, clientId, openingBalance, rowIndex } = row;
        if (i % 100 === 0 || i === data.length - 1) report(i + 1, `Processing row ${i + 1}/${total}...`);

        const balanceValue = Number(openingBalance);
        if (isNaN(balanceValue)) {
            results.errors.push({ row: rowIndex, message: `Invalid opening balance: "${openingBalance}". Must be a number.` });
            continue;
        }

        let matchedBusiness: Business | undefined;
        if (businessId && businessId.trim()) {
            matchedBusiness = businessIdMap.get(businessId.trim());
        if (!matchedBusiness) {
                results.errors.push({ row: rowIndex, message: `Business not found for ID: "${businessId}".` });
            continue;
            }
        } else {
            matchedBusiness = businessNameMap.get(normalizeBusinessName(businessName));
        }

        if (!matchedBusiness) {
            results.errors.push({ row: rowIndex, message: `Business not found: "${businessName}". Ensure the name matches exactly (case-sensitive).` });
            continue;
        }

        const business = matchedBusiness;

        // Update existing pairs instead of skipping - Excel is source of truth, process all rows
        // Use the matched business (may have updated balance in-memory if processed earlier)
        const oldOB = business.openingBalance ?? 0;
        const balanceDiff = balanceValue - oldOB;
        const newBalance = (business.balance ?? 0) + balanceDiff;

        batchOps.push({
            ref: db.collection('businesses').doc(business.id),
            data: { openingBalance: balanceValue, openingBalanceSetDate: getMyanmarISOString(), balance: newBalance, ...timestamps },
            op: 'update'
        });
        if (batchOps.length >= BATCH_MAX) await flushBatch();
        results.businessesUpdated++;
        // Update in-memory so next row with same business sees updated balance
        business.openingBalance = balanceValue;
        business.balance = newBalance;

        const targetClientIds: string[] = [];
        if (clientId && clientId.trim()) {
            targetClientIds.push(clientId.trim());
        } else if (business.linkedClientIds && business.linkedClientIds.length > 0) {
            targetClientIds.push(...business.linkedClientIds);
        }

        for (const targetClientId of targetClientIds) {
            const client = clientMap.get(targetClientId);
                if (client) {
                    const clientOldOB = client.openingBalance ?? 0;
                    const clientBalanceDiff = balanceValue - clientOldOB;
                    const clientNewBalance = (client.balance ?? 0) + clientBalanceDiff;
                batchOps.push({
                    ref: db.collection('clients').doc(targetClientId),
                    data: { openingBalance: balanceValue, openingBalanceSetDate: getMyanmarISOString(), balance: clientNewBalance, ...timestamps },
                    op: 'update'
                });
                if (batchOps.length >= BATCH_MAX) await flushBatch();
                    results.clientsUpdated++;
                client.openingBalance = balanceValue;
                client.balance = clientNewBalance;
                affectedClientIds.add(targetClientId);
            }
        }
        affectedBusinessIds.add(business.id);

        try {
            if (clientId && clientId.trim()) {
                const specificClientId = clientId.trim();
                const balanceId = `${specificClientId}_${business.id}`;
                batchOps.push({
                    ref: db.collection('client_business_balances').doc(balanceId),
                    data: { clientId: specificClientId, businessId: business.id, openingBalance: balanceValue, updatedAt: getMyanmarISOString() },
                    op: 'set'
                });
                if (batchOps.length >= BATCH_MAX) await flushBatch();
                results.pairsUpdated++;
            } else if (business.linkedClientIds && business.linkedClientIds.length > 0) {
                const firstClientId = business.linkedClientIds[0];
                const balanceId = `${firstClientId}_${business.id}`;
                batchOps.push({
                    ref: db.collection('client_business_balances').doc(balanceId),
                    data: { clientId: firstClientId, businessId: business.id, openingBalance: balanceValue, updatedAt: getMyanmarISOString() },
                    op: 'set'
                });
                if (batchOps.length >= BATCH_MAX) await flushBatch();
                results.pairsUpdated++;
            }
        } catch (error) {
            console.error(`Failed to save pair for ${business.id}:`, error);
            results.errors.push({ row: rowIndex, message: `Failed for ${business.name}: ${(error as Error).message}` });
        }
    }

    await flushBatch();

    report(total, 'Syncing AR and recalculating balances...');
    for (const businessId of affectedBusinessIds) {
        const business = businessIdMap.get(businessId) || allBusinesses.find(b => b.id === businessId);
        if (business) {
            try {
                await syncOpeningBalanceToAR(businessId, business.name || businessId, business.openingBalance ?? 0, true);
            } catch (e) {
                console.error(`AR sync for business ${businessId}:`, e);
            }
        }
    }
    for (const clientId of affectedClientIds) {
        const client = clientMap.get(clientId);
        if (!client) continue;
        try {
            await syncOpeningBalanceToAR(clientId, client.name || clientId, client.openingBalance ?? 0, false);
        } catch (error) {
            console.error(`Failed to sync opening balance to AR for client ${clientId}:`, error);
        }
    }
    try {
        await apiRecalculateBalancesForPairsWithTransactions();
    } catch (e) {
        console.error('Balance recalc after import:', e);
    }

    return results;
}

export interface ClearOpeningBalanceProgress {
    step: number;
    totalSteps: number;
    label: string;
    currentInStep: number;
    totalInStep: number;
    remainingInStep: number;
    processedTotal: number;
    totalItems: number;
}

/**
 * Clear all opening balances (e.g. those imported from Excel) so you can re-import.
 * Updates businesses, clients, and client_business_balances. Syncs AR.
 * Optional onProgress for UI progress bar with remaining data and overall progress.
 */
export const apiClearAllOpeningBalances = async (onProgress?: (p: ClearOpeningBalanceProgress) => void): Promise<{ businessesCleared: number; clientsCleared: number; balancesCleared: number }> => {
    const result = { businessesCleared: 0, clientsCleared: 0, balancesCleared: 0 };
    const totalSteps = 3;

    const report = (step: number, label: string, currentInStep: number, totalInStep: number, processedTotal: number, totalItems: number) => {
        onProgress?.({
            step,
            totalSteps,
            label,
            currentInStep,
            totalInStep,
            remainingInStep: totalInStep - currentInStep,
            processedTotal,
            totalItems,
        });
    };

    // Count items with opening balance upfront for totalItems
    const [cbbSnapshot, businessesSnapshot, clientsSnapshot] = await Promise.all([
        db.collection('client_business_balances').get(),
        db.collection('businesses').get(),
        db.collection('clients').get(),
    ]);
    const cbbWithOB = cbbSnapshot.docs.filter(doc => ((doc.data() as ClientBusinessBalance).openingBalance ?? 0) !== 0).length;
    const businessesWithOB = businessesSnapshot.docs.filter(doc => ((doc.data() as Business).openingBalance ?? 0) !== 0).length;
    const clientsWithOB = clientsSnapshot.docs.filter(doc => ((doc.data() as Client).openingBalance ?? 0) !== 0).length;
    const totalItems = Math.max(1, cbbWithOB + businessesWithOB + clientsWithOB);

    // 1. Clear opening balance on all client_business_balances
    report(1, 'Clearing client-business pairs...', 0, cbbWithOB, 0, totalItems);
    const cbbBatch = db.batch();
    cbbSnapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const ob = data.openingBalance ?? 0;
        if (ob !== 0) {
            cbbBatch.update(doc.ref, {
                openingBalance: 0,
                openingBalanceSetDate: firebase.firestore.FieldValue.delete(),
                updatedAt: getMyanmarISOString(),
            });
            result.balancesCleared++;
        }
    });
    if (result.balancesCleared > 0) await cbbBatch.commit();
    report(1, 'Client-business pairs cleared', result.balancesCleared, cbbWithOB, result.balancesCleared, totalItems);

    // 2. Clear opening balance on all businesses and sync AR + CBB
    const businessesToClear = businessesSnapshot.docs.filter(doc => {
        const ob = (doc.data() as Business).openingBalance ?? 0;
        return ob !== 0;
    });
    for (let i = 0; i < businessesToClear.length; i++) {
        const doc = businessesToClear[i];
        const data = doc.data() as Business;
        const ob = data.openingBalance ?? 0;
        if (ob === 0) continue;
        const newBalance = (data.balance ?? 0) - ob;
        await doc.ref.update({
            openingBalance: 0,
            openingBalanceSetDate: firebase.firestore.FieldValue.delete(),
            balance: newBalance,
            updatedAt: getMyanmarISOString(),
        });
        result.businessesCleared++;
        try {
            await syncOpeningBalanceToAR(doc.id, data.name || doc.id, 0, true);
            await syncOpeningBalanceToClientBusinessBalances(doc.id, 0);
        } catch (e) {
            // Log as warning only; legacy / missing finance records should not block clearing.
            console.warn(`Sync after clear OB for business ${doc.id}:`, e);
        }
        const processedTotal = result.balancesCleared + result.businessesCleared;
        report(2, `Clearing businesses... (${result.businessesCleared}/${businessesToClear.length})`, result.businessesCleared, businessesToClear.length, processedTotal, totalItems);
    }
    if (businessesToClear.length > 0) {
        report(2, 'Businesses cleared', result.businessesCleared, businessesToClear.length, result.balancesCleared + result.businessesCleared, totalItems);
    }

    // 3. Clear opening balance on all clients and sync AR
    const clientsToClear = clientsSnapshot.docs.filter(doc => {
        const ob = (doc.data() as Client).openingBalance ?? 0;
        return ob !== 0;
    });
    for (let i = 0; i < clientsToClear.length; i++) {
        const doc = clientsToClear[i];
        const data = doc.data() as Client;
        const ob = data.openingBalance ?? 0;
        if (ob === 0) continue;
        const newBalance = (data.balance ?? 0) - ob;
        await doc.ref.update({
            openingBalance: 0,
            openingBalanceSetDate: firebase.firestore.FieldValue.delete(),
            balance: newBalance,
            updatedAt: getMyanmarISOString(),
        });
        result.clientsCleared++;
        try {
            await syncOpeningBalanceToAR(doc.id, data.name || doc.id, 0, false);
        } catch (e) {
            // Log as warning only; legacy / missing finance records should not block clearing.
            console.warn(`Sync after clear OB for client ${doc.id}:`, e);
        }
        const processedTotal = result.balancesCleared + result.businessesCleared + result.clientsCleared;
        report(3, `Clearing clients... (${result.clientsCleared}/${clientsToClear.length})`, result.clientsCleared, clientsToClear.length, processedTotal, totalItems);
    }
    if (clientsToClear.length > 0) {
        report(3, 'Clients cleared', result.clientsCleared, clientsToClear.length, result.balancesCleared + result.businessesCleared + result.clientsCleared, totalItems);
    }

    void logActivityHelper('Settings', 'Clear All Opening Balances', `Cleared opening balances: ${result.businessesCleared} businesses, ${result.clientsCleared} clients, ${result.balancesCleared} client-business pairs`, undefined, result);
    return result;
}

/**
 * Delete orphaned client_business_balances records that are not linked in client and business documents.
 * A pair (clientId, businessId) is valid only if:
 * - client.linkedBusinessIds includes businessId
 * - AND business.linkedClientIds includes clientId
 * If either document is missing or the link is absent, the pair is deleted.
 */
export const apiDeleteOrphanedClientBusinessBalances = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{ deleted: number; orphaned: Array<{ clientId: string; businessId: string }> }> => {
    const orphaned: Array<{ clientId: string; businessId: string }> = [];
    let deleted = 0;

    const [cbbSnapshot, clientsSnapshot, businessesSnapshot] = await Promise.all([
        db.collection('client_business_balances').get(),
        db.collection('clients').get(),
        db.collection('businesses').get(),
    ]);

    const clientLinkedBusinesses = new Map<string, Set<string>>();
    clientsSnapshot.docs.forEach(doc => {
        const data = doc.data() as Client;
        const linked = data.linkedBusinessIds || [];
        clientLinkedBusinesses.set(doc.id, new Set(linked));
    });

    const businessLinkedClients = new Map<string, Set<string>>();
    businessesSnapshot.docs.forEach(doc => {
        const data = doc.data() as Business;
        const linked = data.linkedClientIds || [];
        businessLinkedClients.set(doc.id, new Set(linked));
    });

    const total = cbbSnapshot.docs.length;
    for (let i = 0; i < cbbSnapshot.docs.length; i++) {
        const doc = cbbSnapshot.docs[i];
        const data = doc.data() as ClientBusinessBalance;
        const { clientId, businessId } = data;
        if (!clientId || !businessId) continue;

        const clientLinks = clientLinkedBusinesses.get(clientId);
        const businessLinks = businessLinkedClients.get(businessId);

        const isLinked =
            clientLinks?.has(businessId) === true &&
            businessLinks?.has(clientId) === true;

        if (!isLinked) {
            orphaned.push({ clientId, businessId });
            await doc.ref.delete();
            deleted++;
        }

        onProgress?.(i + 1, total, `Checking pairs... ${i + 1}/${total}`);
    }

    if (deleted > 0) {
        void logActivityHelper(
            'Settings',
            'Delete Orphaned Pair Balances',
            `Deleted ${deleted} unlinked client-business pair balance(s)`,
            undefined,
            { deleted, orphaned }
        );
    }
    return { deleted, orphaned };
};

/**
 * Recalculate balance for all client-business pairs that have at least one transaction.
 * Uses CANONICAL formula: Total Billed = Opening + Approved Sales(grandTotalMMK) + Adj(INCREASE) - Credit Notes(APPROVED) - Adj(DECREASE) - Refunds
 * Outstanding = Total Billed - Payments - Bad Debt
 * Fast: fetches all transaction data once, computes in-memory, batches writes.
 */
export const apiRecalculateBalancesForPairsWithTransactions = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{ pairsProcessed: number; clientsUpdated: number; businessesUpdated: number; errors: number }> => {
    const result = { pairsProcessed: 0, clientsUpdated: 0, businessesUpdated: 0, errors: 0 };
    const pairs = new Set<string>();

    const addPair = (clientId: string | undefined, businessId: string | undefined) => {
        if (clientId && businessId) pairs.add(`${clientId}_${businessId}`);
    };

    onProgress?.(0, 100, 'Loading transaction data...');
    const [salesSnap, paymentsSnap, creditNotesSnap, refundsSnap, adjustmentsSnap, badDebtsSnap, cbbSnapshot] = await Promise.all([
        db.collection('sales').get(),
        db.collection('payments').get(),
        db.collection('credit_notes').get(),
        db.collection('refunds').get(),
        db.collection('balance_adjustments').get(),
        db.collection('bad_debts').get(),
        db.collection('client_business_balances').get(),
    ]);

    salesSnap.docs.forEach(d => { const dta = d.data(); addPair(dta.clientId, dta.businessId); });
    paymentsSnap.docs.forEach(d => { const dta = d.data(); addPair(dta.clientId, dta.businessId); });
    creditNotesSnap.docs.forEach(d => { const dta = d.data(); addPair(dta.clientId, dta.businessId); });
    refundsSnap.docs.forEach(d => { const dta = d.data(); addPair(dta.clientId, dta.businessId); });
    adjustmentsSnap.docs.forEach(d => { const dta = d.data(); addPair(dta.clientId, dta.businessId); });
    badDebtsSnap.docs.forEach(d => { const dta = d.data(); addPair(dta.clientId, dta.businessId); });

    const pairList = Array.from(pairs).map(k => {
        const idx = k.indexOf('_');
        const clientId = idx >= 0 ? k.slice(0, idx) : k;
        const businessId = idx >= 0 ? k.slice(idx + 1) : '';
        return { clientId, businessId };
    });
    const total = pairList.length;

    if (total === 0) {
        return result;
    }

    // Build in-memory maps by pair key for fast calculation (no per-pair Firestore reads)
    const pairSales = new Map<string, number>();
    const pairCreditNotes = new Map<string, number>();
    const pairRefunds = new Map<string, number>();
    const pairAdjInc = new Map<string, number>();
    const pairAdjDec = new Map<string, number>();
    const pairPayments = new Map<string, number>();
    const pairBadDebts = new Map<string, number>();

    salesSnap.docs.forEach(d => {
        const dta = d.data();
        const key = `${dta.clientId}_${dta.businessId}`;
        if (dta.clientId && dta.businessId && (dta.status as string) !== SaleStatus.DRAFT) {
            pairSales.set(key, (pairSales.get(key) || 0) + (dta.grandTotalMMK || 0));
        }
    });
    creditNotesSnap.docs.forEach(d => {
        const dta = d.data();
        const key = `${dta.clientId}_${dta.businessId}`;
        if (dta.clientId && dta.businessId && (dta.status as string) === CreditNoteStatus.APPROVED) {
            pairCreditNotes.set(key, (pairCreditNotes.get(key) || 0) + (dta.amountMMK || 0));
        }
    });
    refundsSnap.docs.forEach(d => {
        const dta = d.data();
        const key = `${dta.clientId}_${dta.businessId}`;
        if (dta.clientId && dta.businessId) {
            pairRefunds.set(key, (pairRefunds.get(key) || 0) + (dta.amountMMK || 0));
        }
    });
    adjustmentsSnap.docs.forEach(d => {
        const dta = d.data();
        const key = `${dta.clientId}_${dta.businessId}`;
        if (dta.clientId && dta.businessId) {
            const amt = dta.amountMMK || 0;
            if ((dta.type as string) === BalanceAdjustmentType.INCREASE) {
                pairAdjInc.set(key, (pairAdjInc.get(key) || 0) + amt);
            } else {
                pairAdjDec.set(key, (pairAdjDec.get(key) || 0) + amt);
            }
        }
    });
    paymentsSnap.docs.forEach(d => {
        const dta = d.data();
        const key = `${dta.clientId}_${dta.businessId}`;
        if (dta.clientId && dta.businessId && (dta.status as string) === PaymentStatus.APPROVED && !dta.refundId) {
            pairPayments.set(key, (pairPayments.get(key) || 0) + (dta.amountMMK || 0));
        }
    });
    badDebtsSnap.docs.forEach(d => {
        const dta = d.data();
        const key = `${dta.clientId}_${dta.businessId}`;
        if (dta.clientId && dta.businessId) {
            const amt = dta.writtenOffAmount ?? dta.originalAmount ?? 0;
            pairBadDebts.set(key, (pairBadDebts.get(key) || 0) + amt);
        }
    });

    const storedPairBalance = new Map<string, number>();
    const storedOpeningBalance = new Map<string, number>();
    cbbSnapshot.docs.forEach(doc => {
        const d = doc.data() as ClientBusinessBalance;
        if (d.clientId && d.businessId) {
            const k = `${d.clientId}_${d.businessId}`;
            storedPairBalance.set(k, d.balance ?? 0);
            storedOpeningBalance.set(k, d.openingBalance ?? 0);
        }
    });

    const clientsNeedingSync = new Set<string>();
    const businessesNeedingSync = new Set<string>();
    const BATCH_MAX = 450;
    const batchOps: Array<{ ref: firebase.firestore.DocumentReference; data: any; op: 'update' | 'set' }> = [];

    const flushBatch = async () => {
        if (batchOps.length === 0) return;
        const deduped = new Map<string, typeof batchOps[0]>();
        for (const op of batchOps) {
            deduped.set(op.ref.path, op);
        }
        const batch = db.batch();
        for (const { ref, data: d, op } of deduped.values()) {
            if (op === 'update') batch.update(ref, d);
            else batch.set(ref, d, { merge: true });
        }
        await batch.commit();
        batchOps.length = 0;
    };

    // Step 1: Compute and update only incorrect pairs (in-memory, no Firestore reads per pair)
    for (let i = 0; i < pairList.length; i++) {
        const { clientId, businessId } = pairList[i];
        if (i % 50 === 0 || i === pairList.length - 1) {
            onProgress?.(i + 1, total, `Processing pair ${i + 1}/${total}...`);
        }
        const key = `${clientId}_${businessId}`;
        const approvedSales = pairSales.get(key) || 0;
        const approvedCreditNotes = pairCreditNotes.get(key) || 0;
        const totalRefunds = pairRefunds.get(key) || 0;
        const adjInc = pairAdjInc.get(key) || 0;
        const adjDec = pairAdjDec.get(key) || 0;
        const approvedPayments = pairPayments.get(key) || 0;
        const sumBadDebt = pairBadDebts.get(key) || 0;

        // Canonical: Total Billed = Opening + Sales + Adj(INC) - CreditNotes - Adj(DEC) - Refunds; Outstanding = Total Billed - Payments - Bad Debt
        const totalBilledTx = approvedSales + adjInc - approvedCreditNotes - adjDec - totalRefunds;
        const calculatedBalance = totalBilledTx - approvedPayments - sumBadDebt;

        const storedBalance = storedPairBalance.get(key) ?? 0;
        if (Math.abs(calculatedBalance - storedBalance) < 0.01) continue;

        const balanceId = key;
        const balanceRef = db.collection('client_business_balances').doc(balanceId);
        const openingBalance = storedOpeningBalance.get(key) ?? 0;

        batchOps.push({
            ref: balanceRef,
            data: {
                clientId,
                businessId,
                balance: calculatedBalance,
                openingBalance,
                updatedAt: getMyanmarISOString(),
            },
            op: 'set',
        });
        storedPairBalance.set(key, calculatedBalance);
        result.pairsProcessed++;
        clientsNeedingSync.add(clientId);
        businessesNeedingSync.add(businessId);

        if (batchOps.length >= BATCH_MAX) await flushBatch();
    }
    await flushBatch();

    // Step 2: Sync only clients and businesses that had at least one incorrect pair
    const affectedClientIds = clientsNeedingSync;
    const affectedBusinessIds = businessesNeedingSync;
    const syncTotal = affectedClientIds.size + affectedBusinessIds.size;
    let syncIdx = 0;

    for (const clientId of affectedClientIds) {
        syncIdx++;
        onProgress?.(syncIdx, syncTotal, `Syncing client ${clientId}`);
        try {
            const client = await apiGetClientById(clientId);
            if (!client) {
                // Client was deleted but has orphaned pair/transaction refs - skip
                continue;
            }
            const totalBalance = await apiGetClientTotalBalance(clientId);
            await updateDocument('clients', clientId, { balance: totalBalance });
            result.clientsUpdated++;
            const customerRef = db.collection('finance_customers').doc(clientId);
            const customerDoc = await customerRef.get();
            if (customerDoc.exists) {
                await customerRef.update({ balance: totalBalance });
            } else if (client) {
                await customerRef.set({
                    id: clientId,
                    name: client.name || clientId,
                    currency: 'MMK',
                    balance: totalBalance,
                });
            }
        } catch (error) {
            console.error(`Failed to sync client ${clientId}:`, error);
        }
    }

    for (const businessId of affectedBusinessIds) {
        syncIdx++;
        onProgress?.(syncIdx, syncTotal, `Syncing business ${businessId}`);
        try {
            const business = await apiGetBusinessById(businessId);
            if (!business) {
                // Business was deleted but has orphaned pair/transaction refs - skip
                continue;
            }
            const balancesSnapshot = await db.collection('client_business_balances')
                .where('businessId', '==', businessId)
                .get();
            let businessTotalBalance = 0;
            balancesSnapshot.docs.forEach(doc => {
                const balanceData = doc.data() as ClientBusinessBalance;
                const openingBalance = balanceData.openingBalance || 0;
                businessTotalBalance += openingBalance + (balanceData.balance ?? 0);
            });
            await updateDocument('businesses', businessId, { balance: businessTotalBalance } as Partial<Business>);
            result.businessesUpdated++;
            const businessCustomerRef = db.collection('finance_customers').doc(businessId);
            const businessCustomerDoc = await businessCustomerRef.get();
            if (businessCustomerDoc.exists) {
                await businessCustomerRef.update({ balance: businessTotalBalance });
            } else if (business) {
                await businessCustomerRef.set({
                    id: businessId,
                    name: business.name || businessId,
                    currency: 'MMK',
                    balance: businessTotalBalance,
                });
            }
        } catch (error) {
            console.error(`Failed to sync business ${businessId}:`, error);
        }
    }

    void logActivityHelper(
        'Settings',
        'Recalculate Balances (Pairs With Transactions)',
        `Processed ${result.pairsProcessed} pair(s), ${result.errors} error(s)`,
        undefined,
        result
    );
    return result;
};

/**
 * Redistribute payment allocations for all client-business pairs according to the canonical order:
 * 1. Opening balance first
 * 2. Oldest unpaid sales next (for general payments only; skips sales already fully paid by invoice/sale-specific)
 * 3. Sale-specific payments: only to that specific sale (if sale not in pair or fully paid, relocate as general)
 * 4. Invoice-specific payments: only to sales linked with that invoice in this pair (if none/full, relocate as general)
 * Future payments will follow this same order when approved.
 */
const isSaleEligibleForPaymentAllocation = (sale: SaleRecord): boolean =>
    sale.status !== SaleStatus.DRAFT;

export const apiRedistributePaymentAllocations = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{ pairsProcessed: number; paymentsUpdated: number; errors: number }> => {
    const result = { pairsProcessed: 0, paymentsUpdated: 0, errors: 0 };

    const paymentsSnap = await db.collection('payments')
        .where('status', '==', PaymentStatus.APPROVED)
        .get();

    const pairs = new Map<string, { clientId: string; businessId: string; payments: Payment[] }>();
    paymentsSnap.docs.forEach(doc => {
        const p = convertTimestamps({ id: doc.id, ...doc.data() }) as Payment;
        if (p.refundId || !p.clientId || !p.businessId) return;
        const key = `${p.clientId}_${p.businessId}`;
        if (!pairs.has(key)) {
            pairs.set(key, { clientId: p.clientId, businessId: p.businessId, payments: [] });
        }
        pairs.get(key)!.payments.push(p);
    });

    const pairList = Array.from(pairs.values());
    if (pairList.length === 0) return result;

    onProgress?.(0, pairList.length, 'Loading...');

    for (let i = 0; i < pairList.length; i++) {
        const { clientId, businessId, payments } = pairList[i];
        onProgress?.(i + 1, pairList.length, `Processing pair ${i + 1}/${pairList.length}...`);

        try {
            const balanceId = `${clientId}_${businessId}`;
            const balanceDoc = await db.collection('client_business_balances').doc(balanceId).get();
            const balanceData = balanceDoc.exists ? balanceDoc.data() : undefined;
            let openingBalance = (balanceData?.openingBalance ?? 0) as number;
            if (openingBalance === 0) {
                try {
                    const biz = await apiGetBusinessById(businessId);
                    if (biz?.openingBalance != null) openingBalance = biz.openingBalance;
                } catch { /* ignore */ }
            }

            const salesSnap = await db.collection('sales')
                .where('clientId', '==', clientId)
                .where('businessId', '==', businessId)
                .get();
            const allSales = salesSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as SaleRecord));

            const sortedPayments = [...payments].sort((a, b) => {
                const tA = new Date(a.paymentDate || a.createdAt || 0).getTime();
                const tB = new Date(b.paymentDate || b.createdAt || 0).getTime();
                return tA - tB;
            });

            let runningOpeningPaid = 0;
            const salePaid = new Map<string, number>();
            allSales.forEach(s => { if (s.id) salePaid.set(s.id, 0); });

            const getSalesOldestFirst = () =>
                [...allSales]
                    .filter(s => isSaleEligibleForPaymentAllocation(s))
                    .filter(s => {
                        const remaining = Math.max((s.grandTotalMMK || 0) - (salePaid.get(s.id || '') || 0), 0);
                        return remaining > 0;
                    })
                    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

            const getLinkedSalesForInvoice = async (invoiceId: string): Promise<SaleRecord[]> => {
                const linked: SaleRecord[] = [];
                const byInvoice = await db.collection('sales').where('invoiceId', '==', invoiceId).get();
                byInvoice.docs.forEach(doc => {
                    const s = convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord;
                    if (s.id) linked.push(s);
                });
                const invDoc = await db.collection('invoices').doc(invoiceId).get();
                if (invDoc.exists) {
                    const inv = invDoc.data() as Invoice;
                    if (inv.saleRecordId && !linked.some(s => s.id === inv.saleRecordId)) {
                        const leg = await db.collection('sales').doc(inv.saleRecordId).get();
                        if (leg.exists) {
                            const ls = convertTimestamps({ id: leg.id, ...leg.data() }) as SaleRecord;
                            if (ls.id) linked.push(ls);
                        }
                    }
                }
                // Only sales belonging to this client-business pair
                const linkedInPair = linked.filter(s => s.clientId === clientId && s.businessId === businessId);
                return linkedInPair
                    .filter(s => isSaleEligibleForPaymentAllocation(s))
                    .filter(s => {
                        const remaining = Math.max((s.grandTotalMMK || 0) - (salePaid.get(s.id || '') || 0), 0);
                        return remaining > 0;
                    })
                    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            };

            const batch = db.batch();
            const affectedInvoiceIds = new Set<string>();

            for (const payment of sortedPayments) {
                const amt = payment.amountMMK || 0;
                if (amt <= 0) continue;

                const isGeneral = !payment.invoiceId && !payment.saleRecordId;
                const isInvoicePayment = !!payment.invoiceId && !payment.saleRecordId;
                const isSalePayment = !!payment.saleRecordId && !payment.invoiceId;

                let allocations: Array<{ saleId: string; allocationAmount: number }> = [];
                let amountForOpeningBalance = 0;

                const allocateAsGeneral = () => {
                    const obRemaining = Math.max(openingBalance - runningOpeningPaid, 0);
                    const amtForOb = Math.min(amt, obRemaining);
                    const amtForSales = amt - amtForOb;
                    amountForOpeningBalance = amtForOb;
                    runningOpeningPaid += amtForOb;
                    const salesForAlloc = getSalesOldestFirst(); // Skips sales already fully paid (by any prior payment)
                    let remaining = amtForSales;
                    for (const sale of salesForAlloc) {
                        if (remaining <= 0) break;
                        const saleRem = Math.max((sale.grandTotalMMK || 0) - (salePaid.get(sale.id || '') || 0), 0);
                        if (saleRem <= 0) continue;
                        const alloc = Math.min(remaining, saleRem);
                        allocations.push({ saleId: sale.id!, allocationAmount: alloc });
                        salePaid.set(sale.id!, (salePaid.get(sale.id!) || 0) + alloc);
                        remaining -= alloc;
                    }
                };

                if (isGeneral) {
                    allocateAsGeneral();
                } else if (isInvoicePayment && payment.invoiceId) {
                    const linkedSales = await getLinkedSalesForInvoice(payment.invoiceId);
                    let remaining = amt;
                    for (const sale of linkedSales) {
                        if (remaining <= 0) break;
                        const saleRem = Math.max((sale.grandTotalMMK || 0) - (salePaid.get(sale.id || '') || 0), 0);
                        if (saleRem <= 0) continue;
                        const alloc = Math.min(remaining, saleRem);
                        allocations.push({ saleId: sale.id!, allocationAmount: alloc });
                        salePaid.set(sale.id!, (salePaid.get(sale.id!) || 0) + alloc);
                        remaining -= alloc;
                    }
                    if (allocations.length === 0) {
                        // Not linked to this pair or all linked sales fully paid - relocate as general
                        allocateAsGeneral();
                    } else {
                        affectedInvoiceIds.add(payment.invoiceId);
                    }
                } else if (isSalePayment && payment.saleRecordId) {
                    const targetSale = allSales.find(s => s.id === payment.saleRecordId);
                    const saleRem = targetSale && isSaleEligibleForPaymentAllocation(targetSale)
                        ? Math.max((targetSale.grandTotalMMK || 0) - (salePaid.get(payment.saleRecordId) || 0), 0)
                        : 0;
                    const alloc = Math.min(amt, saleRem);
                    if (alloc > 0 && targetSale) {
                        allocations = [{ saleId: payment.saleRecordId, allocationAmount: alloc }];
                        salePaid.set(payment.saleRecordId, (salePaid.get(payment.saleRecordId) || 0) + alloc);
                    } else {
                        // Sale not in this pair or already fully paid - relocate as general
                        allocateAsGeneral();
                    }
                }

                const paymentRef = db.collection('payments').doc(payment.id);
                const newAllocations = allocations.map(a => ({ saleRecordId: a.saleId, amountMMK: a.allocationAmount }));
                batch.update(paymentRef, {
                    saleAllocations: newAllocations,
                    updatedAt: getMyanmarISOString(),
                });
                result.paymentsUpdated++;
            }

            const balanceRef = db.collection('client_business_balances').doc(balanceId);
            batch.set(balanceRef, {
                clientId,
                businessId,
                openingBalancePaid: runningOpeningPaid,
                updatedAt: getMyanmarISOString(),
            }, { merge: true });

            for (const sale of allSales) {
                const paid = salePaid.get(sale.id || '') || 0;
                if (sale.id && (sale.amountPaid || 0) !== paid) {
                    batch.update(db.collection('sales').doc(sale.id), {
                        amountPaid: paid,
                        updatedAt: getMyanmarISOString(),
                    });
                }
            }

            // Safeguard: total allocated must never exceed total payments (redistribution only, no increase)
            const totalPayments = sortedPayments.filter(p => (p.amountMMK || 0) > 0).reduce((s, p) => s + (p.amountMMK || 0), 0);
            const totalAllocatedToSales = Array.from(salePaid.values()).reduce((a, b) => a + b, 0);
            const totalAllocated = runningOpeningPaid + totalAllocatedToSales;
            if (totalAllocated > totalPayments + 0.01) {
                throw new Error(`Invariant: total allocated (${totalAllocated}) must not exceed total payments (${totalPayments}). Redistribution only.`);
            }

            await batch.commit();
            result.pairsProcessed++;

            for (const invId of affectedInvoiceIds) {
                try {
                    await updateInvoiceFromLinkedSales(invId);
                } catch (e) {
                    console.warn('Failed to update invoice from linked sales:', invId, e);
                }
            }
        } catch (error) {
            console.error(`Failed to redistribute for ${clientId}_${businessId}:`, error);
            result.errors++;
        }
    }

    void logActivityHelper(
        'Settings',
        'Redistribute Payment Allocations',
        `Processed ${result.pairsProcessed} pair(s), ${result.paymentsUpdated} payment(s) updated, ${result.errors} error(s)`,
        undefined,
        result
    );
    // Repair sale.amountPaid from payment allocations (ensures sale paid amounts match allocations)
    const repairResult = await apiRepairSalePaidAmountsFromAllocations();
    if (repairResult.salesUpdated > 0) {
        void logActivityHelper('Settings', 'Repair Sale Paid Amounts', `Updated ${repairResult.salesUpdated} sale(s) to match payment allocations`, undefined, repairResult);
    }
    return result;
};

/**
 * Recompute sale.amountPaid from payment.saleAllocations for all pairs.
 * Repairs any drift - ensures sale.amountPaid = sum of allocations to that sale.
 * For sales with no allocations, sets amountPaid = 0 (per pair).
 */
export const apiRepairSalePaidAmountsFromAllocations = async (): Promise<{ salesUpdated: number }> => {
    const paymentsSnap = await db.collection('payments')
        .where('status', '==', PaymentStatus.APPROVED)
        .get();
    const pairs = new Map<string, { clientId: string; businessId: string; payments: Payment[] }>();
    paymentsSnap.docs.forEach(doc => {
        const p = convertTimestamps({ id: doc.id, ...doc.data() }) as Payment;
        if (p.refundId || !p.clientId || !p.businessId) return;
        const key = `${p.clientId}_${p.businessId}`;
        if (!pairs.has(key)) pairs.set(key, { clientId: p.clientId, businessId: p.businessId, payments: [] });
        pairs.get(key)!.payments.push(p);
    });
    let salesUpdated = 0;
    for (const { clientId, businessId, payments } of pairs.values()) {
        const allocationBySale = new Map<string, number>();
        const salesSnap = await db.collection('sales')
            .where('clientId', '==', clientId)
            .where('businessId', '==', businessId)
            .get();
        salesSnap.docs.forEach(doc => {
            allocationBySale.set(doc.id, 0);
        });
        payments.forEach(p => {
            if (p.refundId) return;
            if (p.saleAllocations && p.saleAllocations.length > 0) {
                p.saleAllocations.forEach(a => {
                    if (a.saleRecordId && (a.amountMMK || 0) > 0) {
                        allocationBySale.set(a.saleRecordId, (allocationBySale.get(a.saleRecordId) || 0) + (a.amountMMK || 0));
                    }
                });
            } else if (p.saleRecordId && (p.amountMMK || 0) > 0) {
                allocationBySale.set(p.saleRecordId, (allocationBySale.get(p.saleRecordId) || 0) + (p.amountMMK || 0));
            }
        });
        const batch = db.batch();
        let pairUpdates = 0;
        for (const saleDoc of salesSnap.docs) {
            const sid = saleDoc.id;
            const data = saleDoc.data() as SaleRecord;
            const grandTotal = data.grandTotalMMK || 0;
            const allocated = allocationBySale.get(sid) || 0;
            const capped = Math.min(allocated, grandTotal);
            const current = data.amountPaid || 0;
            if (Math.abs(current - capped) >= 0.01) {
                batch.update(saleDoc.ref, { amountPaid: capped, updatedAt: getMyanmarISOString() });
                pairUpdates++;
            }
        }
        if (pairUpdates > 0) {
            await batch.commit();
            salesUpdated += pairUpdates;
        }
    }
    return { salesUpdated };
};

/**
 * Redistribute GENERAL payments only. Does not touch sale-specific or invoice-specific payments.
 * Allocation order (UI and backend contract):
 *   1) OPENING BALANCE first (until fully paid)
 *   2) When opening fully paid, remainder goes to OLDEST UNPAID SALES (oldest to newest)
 * Empty saleAllocations = entire payment went to opening (0 for sales). Non-empty = remainder to sales.
 * Each payment amount is never exceeded (e.g. payment 100, opening 90, oldest sale A 20 → opening 90, A 10).
 */
export const apiRedistributeGeneralPaymentsOnly = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{ pairsProcessed: number; paymentsUpdated: number; errors: number }> => {
    const result = { pairsProcessed: 0, paymentsUpdated: 0, errors: 0 };

    const paymentsSnap = await db.collection('payments')
        .where('status', '==', PaymentStatus.APPROVED)
        .get();

    const pairs = new Map<string, { clientId: string; businessId: string; payments: Payment[] }>();
    paymentsSnap.docs.forEach(doc => {
        const p = convertTimestamps({ id: doc.id, ...doc.data() }) as Payment;
        if (p.refundId || !p.clientId || !p.businessId) return;
        const key = `${p.clientId}_${p.businessId}`;
        if (!pairs.has(key)) {
            pairs.set(key, { clientId: p.clientId, businessId: p.businessId, payments: [] });
        }
        pairs.get(key)!.payments.push(p);
    });

    const pairList = Array.from(pairs.values());
    if (pairList.length === 0) return result;

    onProgress?.(0, pairList.length, 'Loading...');

    for (let i = 0; i < pairList.length; i++) {
        const { clientId, businessId, payments } = pairList[i];
        const generalPayments = payments.filter(p => !p.invoiceId && !p.saleRecordId);
        if (generalPayments.length === 0) continue;

        onProgress?.(i + 1, pairList.length, `Processing pair ${i + 1}/${pairList.length}...`);

        try {
            const balanceId = `${clientId}_${businessId}`;
            const balanceDoc = await db.collection('client_business_balances').doc(balanceId).get();
            const balanceData = balanceDoc.exists ? balanceDoc.data() : undefined;
            let openingBalance = (balanceData?.openingBalance ?? 0) as number;
            if (openingBalance === 0) {
                try {
                    const biz = await apiGetBusinessById(businessId);
                    if (biz?.openingBalance != null) openingBalance = biz.openingBalance;
                } catch { /* ignore */ }
            }

            const salesSnap = await db.collection('sales')
                .where('clientId', '==', clientId)
                .where('businessId', '==', businessId)
                .get();
            const allSales = salesSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as SaleRecord));

            const sortedAllPayments = [...payments].sort((a, b) => {
                const tA = new Date(a.paymentDate || a.createdAt || 0).getTime();
                const tB = new Date(b.paymentDate || b.createdAt || 0).getTime();
                return tA - tB;
            });

            // 1. Initialize salePaid from sale-specific and invoice-specific payments (leave them as-is)
            const salePaid = new Map<string, number>();
            allSales.forEach(s => { if (s.id) salePaid.set(s.id, 0); });
            for (const p of sortedAllPayments) {
                if (p.invoiceId || p.saleRecordId) {
                    const amt = p.amountMMK || 0;
                    if (p.saleAllocations && p.saleAllocations.length > 0) {
                        for (const a of p.saleAllocations) {
                            if (a.saleRecordId && a.amountMMK) {
                                salePaid.set(a.saleRecordId, (salePaid.get(a.saleRecordId) || 0) + a.amountMMK);
                            }
                        }
                    } else if (p.saleRecordId) {
                        salePaid.set(p.saleRecordId, (salePaid.get(p.saleRecordId) || 0) + amt);
                    }
                    // Specific payments do not go to opening balance
                }
            }

            let runningOpeningPaid = 0;
            const getSalesOldestFirst = () =>
                [...allSales]
                    .filter(s => isSaleEligibleForPaymentAllocation(s))
                    .filter(s => {
                        const remaining = Math.max((s.grandTotalMMK || 0) - (salePaid.get(s.id || '') || 0), 0);
                        return remaining > 0;
                    })
                    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

            const batch = db.batch();
            const sortedGeneral = [...generalPayments].sort((a, b) => {
                const tA = new Date(a.paymentDate || a.createdAt || 0).getTime();
                const tB = new Date(b.paymentDate || b.createdAt || 0).getTime();
                return tA - tB;
            });

            for (const payment of sortedGeneral) {
                const amt = payment.amountMMK || 0;
                if (amt <= 0) continue;

                const obRemaining = Math.max(openingBalance - runningOpeningPaid, 0);
                const amtForOb = Math.min(amt, obRemaining);
                const amtForSales = amt - amtForOb;
                runningOpeningPaid += amtForOb;

                const allocations: Array<{ saleId: string; allocationAmount: number }> = [];
                let remaining = amtForSales;
                const salesForAlloc = getSalesOldestFirst();
                for (const sale of salesForAlloc) {
                    if (remaining <= 0) break;
                    const saleRem = Math.max((sale.grandTotalMMK || 0) - (salePaid.get(sale.id || '') || 0), 0);
                    if (saleRem <= 0) continue;
                    const alloc = Math.min(remaining, saleRem);
                    allocations.push({ saleId: sale.id!, allocationAmount: alloc });
                    salePaid.set(sale.id!, (salePaid.get(sale.id!) || 0) + alloc);
                    remaining -= alloc;
                }

                const paymentRef = db.collection('payments').doc(payment.id);
                batch.update(paymentRef, {
                    saleAllocations: allocations.map(a => ({ saleRecordId: a.saleId, amountMMK: a.allocationAmount })),
                    updatedAt: getMyanmarISOString(),
                });
                result.paymentsUpdated++;
            }

            const balanceRef = db.collection('client_business_balances').doc(balanceId);
            batch.set(balanceRef, {
                clientId,
                businessId,
                openingBalancePaid: runningOpeningPaid,
                updatedAt: getMyanmarISOString(),
            }, { merge: true });

            for (const sale of allSales) {
                const paid = salePaid.get(sale.id || '') || 0;
                if (sale.id && (sale.amountPaid || 0) !== paid) {
                    batch.update(db.collection('sales').doc(sale.id), {
                        amountPaid: paid,
                        updatedAt: getMyanmarISOString(),
                    });
                }
            }

            const totalAllocatedToSales = Array.from(salePaid.values()).reduce((a, b) => a + b, 0);
            const totalAllocated = runningOpeningPaid + totalAllocatedToSales;
            const totalPaymentsAll = sortedAllPayments.filter(p => (p.amountMMK || 0) > 0).reduce((s, p) => s + (p.amountMMK || 0), 0);
            if (totalAllocated > totalPaymentsAll + 0.01) {
                throw new Error(`Invariant: total allocated (${totalAllocated}) must not exceed total payments (${totalPaymentsAll}).`);
            }

            await batch.commit();
            result.pairsProcessed++;
        } catch (error) {
            console.error(`Failed to redistribute general payments for ${clientId}_${businessId}:`, error);
            result.errors++;
        }
    }

    void logActivityHelper(
        'Settings',
        'Redistribute General Payments Only',
        `Processed ${result.pairsProcessed} pair(s), ${result.paymentsUpdated} general payment(s) updated, ${result.errors} error(s)`,
        undefined,
        result
    );
    // Repair sale.amountPaid from payment allocations (ensures sale paid amounts match allocations)
    const repairResult = await apiRepairSalePaidAmountsFromAllocations();
    if (repairResult.salesUpdated > 0) {
        void logActivityHelper('Settings', 'Repair Sale Paid Amounts', `Updated ${repairResult.salesUpdated} sale(s) to match payment allocations`, undefined, repairResult);
    }
    return result;
};

/**
 * Sync client and business balance fields to match the sum of their pair Outstanding balances.
 * Formula: pair Outstanding = openingBalance + balance; client total = sum of pair Outstanding for all pairs; business total = sum of pair Outstanding for all pairs.
 * Finds any client or business whose stored balance !== sum of pair Outstanding and updates them.
 * Optional onProgress(current, total, label) for UI progress (single bar across clients then businesses).
 */
export const apiSyncUnsyncedClientBusinessBalances = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{ clientsUpdated: number; businessesUpdated: number }> => {
    const result = { clientsUpdated: 0, businessesUpdated: 0 };

    // Build expected totals from client_business_balances
    const cbbSnapshot = await db.collection('client_business_balances').get();
    const clientTotals = new Map<string, number>();
    const businessTotals = new Map<string, number>();
    cbbSnapshot.docs.forEach(doc => {
        const data = doc.data() as ClientBusinessBalance;
        const total = (data.openingBalance || 0) + (data.balance ?? 0);
        const cid = data.clientId;
        const bid = data.businessId;
        if (cid) clientTotals.set(cid, (clientTotals.get(cid) ?? 0) + total);
        if (bid) businessTotals.set(bid, (businessTotals.get(bid) ?? 0) + total);
    });

    const clientsSnapshot = await db.collection('clients').get();
    const businessesSnapshot = await db.collection('businesses').get();
    const totalClients = clientsSnapshot.docs.length;
    const totalBusinesses = businessesSnapshot.docs.length;
    const totalSteps = totalClients + totalBusinesses;

    // Clients: update those where stored balance !== expected
    for (let i = 0; i < clientsSnapshot.docs.length; i++) {
        onProgress?.(i + 1, totalSteps, `Checking clients... ${i + 1}/${totalClients}`);
        const doc = clientsSnapshot.docs[i];
        const data = doc.data() as Client;
        const expected = clientTotals.get(doc.id) ?? 0;
        const stored = data.balance ?? 0;
        if (stored !== expected) {
            await doc.ref.update({ balance: expected, updatedAt: getMyanmarISOString() });
            result.clientsUpdated++;
        }
    }

    // Businesses: update those where stored balance !== expected
    for (let i = 0; i < businessesSnapshot.docs.length; i++) {
        onProgress?.(totalClients + i + 1, totalSteps, `Checking businesses... ${i + 1}/${totalBusinesses}`);
        const doc = businessesSnapshot.docs[i];
        const data = doc.data() as Business;
        const expected = businessTotals.get(doc.id) ?? 0;
        const stored = data.balance ?? 0;
        if (stored !== expected) {
            await doc.ref.update({ balance: expected, updatedAt: getMyanmarISOString() });
            result.businessesUpdated++;
        }
    }

    void logActivityHelper('Settings', 'Sync Unsynced Balances', `Synced ${result.clientsUpdated} client(s), ${result.businessesUpdated} business(es) to match pair balances`, undefined, result);
    return result;
};

/**
 * One-click maintenance tool used from Settings → Data Management.
 *
 * Behavior:
 * - Redistributes GENERAL payments only (unpaid opening balance first, then oldest unpaid sales),
 *   updating payment.saleAllocations and sale.amountPaid per sale.
 * - Recalculates pair balances from all transactions and syncs client/business balances from pair sums.
 * - Ensures no payment is over-allocated and no sale is over-paid (delegated to underlying helpers).
 *
 * This is a safe orchestration of:
 * - apiRedistributeGeneralPaymentsOnly
 * - apiRecalculateBalancesForPairsWithTransactions
 * - apiSyncUnsyncedClientBusinessBalances
 */
export const apiReallocateGeneralPaymentsAndRecalculateBalances = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{
    generalResult: { pairsProcessed: number; paymentsUpdated: number; errors: number };
    clientWideResult: { clientsProcessed: number; paymentsUpdated: number; errors: number };
    balanceResult: { pairsProcessed: number; clientsUpdated: number; businessesUpdated: number; errors: number };
    syncResult: { clientsUpdated: number; businessesUpdated: number };
}> => {
    // 1) Redistribute pair-specific GENERAL payments and repair sale.amountPaid from allocations.
    const generalResult = await apiRedistributeGeneralPaymentsOnly(
        onProgress
            ? (current, total, label) =>
                onProgress(current, total, label || 'Redistributing general payments...')
            : undefined
    );

    // 2) Redistribute client-wide GENERAL payments chronologically per client.
    const clientWideResult = await apiRedistributeClientWideGeneralPaymentsOnly(
        onProgress
            ? (current, total, label) =>
                onProgress(current, total, label || 'Redistributing client-wide payments...')
            : undefined
    );

    // 3) Recalculate balances for all pairs with transactions (pair balance + client/business totals).
    const balanceResult = await apiRecalculateBalancesForPairsWithTransactions(
        onProgress
            ? (current, total, label) =>
                onProgress(current, total, label || 'Recalculating balances from transactions...')
            : undefined
    );

    // 4) Sync any remaining unsynced client/business balances to match pair Outstanding totals.
    const syncResult = await apiSyncUnsyncedClientBusinessBalances(
        onProgress
            ? (current, total, label) =>
                onProgress(current, total, label || 'Syncing client and business balances...')
            : undefined
    );

    void logActivityHelper(
        'Settings',
        'Reallocate General Payments & Recalculate Balances',
        `Reallocated general payments for ${generalResult.pairsProcessed} pair(s), updated ${generalResult.paymentsUpdated} payment(s); client-wide: ${clientWideResult.clientsProcessed} client(s), ${clientWideResult.paymentsUpdated} payment(s); recalculated balances for ${balanceResult.pairsProcessed} pair(s); synced ${syncResult.clientsUpdated} client(s) and ${syncResult.businessesUpdated} business(es).`,
        undefined,
        { generalResult, clientWideResult, balanceResult, syncResult }
    );

    return { generalResult, clientWideResult, balanceResult, syncResult };
};

// Services
export const apiGetServices = (): Promise<Service[]> => fetchCollection('services');
export const apiGetServiceById = (id: string): Promise<Service | null> => fetchDocumentById('services', id);
export const apiGetServiceCategories = (): Promise<ServiceCategory[]> => fetchCollection('serviceCategories');
export const apiAddService = async (data: Omit<Service, 'id'>) => {
    const { id: _ignored, ...dataWithoutId } = data as Partial<Service> & { id?: string };
    const service = await addDocument<Service>('services', dataWithoutId as Partial<Service>, SERVICE_ID_PREFIX, false);
    void logActivityHelper('Services', 'Create Service', `Created service: ${service.name}`, service.id, {
        category: service.category,
        subCategory: service.subCategory,
        isActive: service.isActive,
    });
    return service;
};
export const apiUpdateService = async (data: Partial<Service> & { id: string }) => {
    await updateDocument<Service>('services', data.id, data);
    void logActivityHelper('Services', 'Update Service', `Updated service: ${data.name || data.id}`, data.id, data);
};
export const apiDeleteService = async (id: string) => {
    await deleteDocument('services', id);
    void logActivityHelper('Services', 'Delete Service', `Deleted service: ${id}`, id);
};

// FIX: Add missing functions for managing service categories
export const apiAddServiceCategory = async (data: Omit<ServiceCategory, 'id'>): Promise<ServiceCategory> => {
    const category = await addDocument<ServiceCategory>('serviceCategories', data as Partial<ServiceCategory>, 'SCAT_', false);
    void logActivityHelper('Services', 'Create Category', `Created service category: ${category.name}`, category.id);
    return category;
};
export const apiUpdateServiceCategory = async (data: Partial<ServiceCategory> & { id: string }): Promise<void> => {
    await updateDocument<ServiceCategory>('serviceCategories', data.id, data);
    void logActivityHelper('Services', 'Update Category', `Updated service category: ${data.name || data.id}`, data.id, data);
};
export const apiDeleteServiceCategory = async (id: string): Promise<void> => {
    const servicesSnapshot = await db.collection('services').where('category', '==', id).limit(1).get();
    if (!servicesSnapshot.empty) {
        throw new Error("Cannot delete category: It is currently in use by one or more services.");
    }
    await deleteDocument('serviceCategories', id);
    void logActivityHelper('Services', 'Delete Category', `Deleted service category: ${id}`, id);
};

// FIX: Add missing promotion API functions
// Promotions
export const apiGetPromotions = (): Promise<Promotion[]> => fetchCollection('promotions', { field: 'startDate', direction: 'desc' });
export const apiAddPromotion = async (data: Omit<Promotion, 'id'>): Promise<Promotion> => {
    const promotion = await addDocument<Promotion>('promotions', data as Partial<Promotion>, PROMOTION_ID_PREFIX, false);
    void logActivityHelper('Services', 'Create Promotion', `Created promotion: ${promotion.name}`, promotion.id, {
        startDate: promotion.startDate,
        endDate: promotion.endDate,
    });
    return promotion;
};
export const apiUpdatePromotion = async (data: Partial<Promotion> & { id: string }): Promise<void> => {
    await updateDocument<Promotion>('promotions', data.id, data);
    void logActivityHelper('Services', 'Update Promotion', `Updated promotion: ${data.name || data.id}`, data.id, data);
};
export const apiDeletePromotion = async (id: string): Promise<void> => {
    await deleteDocument('promotions', id);
    void logActivityHelper('Services', 'Delete Promotion', `Deleted promotion: ${id}`, id);
};

// This is a one-time seeding function
export const apiSeedServiceCategories = async (): Promise<void> => {
    const categoriesRef = db.collection('serviceCategories');
    const snapshot = await categoriesRef.get();
    
    // Only seed if the collection is empty
    if (!snapshot.empty) {
        return;
    }
    
    console.log("Seeding initial service categories...");

    const defaultCategories: Omit<ServiceCategory, 'id'>[] = [
        {
            name: 'Digital Marketing',
            subCategories: [
                { id: 'sub-dm-fb', name: 'Facebook Ads' },
                { id: 'sub-dm-gg', name: 'Google Ads' },
                { id: 'sub-dm-seo', name: 'SEO (Search Engine Optimization)' },
                { id: 'sub-dm-smm', name: 'Social Media Management' },
            ]
        },
        {
            name: 'Content & Creative',
            subCategories: [
                { id: 'sub-cc-gd', name: 'Graphic Design' },
                { id: 'sub-cc-vp', name: 'Video Production' },
                { id: 'sub-cc-cw', name: 'Copywriting' },
            ]
        },
        {
            name: 'Web Services',
            subCategories: [
                { id: 'sub-ws-wd', name: 'Website Development' },
                { id: 'sub-ws-ecom', name: 'E-commerce Solutions' },
                { id: 'sub-ws-maint', name: 'Website Maintenance' },
            ]
        },
        {
            name: 'Other',
            subCategories: []
        }
    ];

    const batch = db.batch();
    for (const category of defaultCategories) {
        const docRef = categoriesRef.doc(); // Auto-generate ID
        batch.set(docRef, category);
    }
    
    await batch.commit();
    console.log("Successfully seeded service categories.");
};

export const apiSeedMarketingCapsuleProject = async (): Promise<void> => {
    console.log("Checking for internal 'Marketing Capsule' project...");

    const clientRef = db.collection('clients').doc(CLIENT_ID_INTERNAL);
    const businessRef = db.collection('businesses').doc(BUSINESS_ID_INTERNAL);
    const projectRef = db.collection('projects').doc(PROJECT_ID_MARKETING_CAPSULE);

    const [clientSnap, businessSnap, projectSnap] = await Promise.all([
        clientRef.get(),
        businessRef.get(),
        projectRef.get()
    ]);

    if (clientSnap.exists && businessSnap.exists && projectSnap.exists) {
        console.log("'Marketing Capsule' project and related entities already exist.");
        return;
    }

    console.log("Seeding internal 'Marketing Capsule' project and related client/business...");
    const batch = db.batch();

    if (!clientSnap.exists) {
        const newClientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
            name: "Marketing Capsule (Internal)",
            phone: "N/A",
            linkedBusinessIds: [BUSINESS_ID_INTERNAL],
            balance: 0,
        };
        batch.set(clientRef, { ...newClientData, createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString() });
    }

    if (!businessSnap.exists) {
        const newBusinessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> = {
            name: "Marketing Capsule Internal",
            linkedClientIds: [CLIENT_ID_INTERNAL],
            balance: 0,
        };
        batch.set(businessRef, { ...newBusinessData, createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString() });
    }

    if (!projectSnap.exists) {
        const newProjectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
            name: "Marketing Capsule",
            description: "Internal project for Marketing Capsule tasks, operations, and management.",
            status: ProjectStatus.ACTIVE,
            clientId: CLIENT_ID_INTERNAL,
            businessId: BUSINESS_ID_INTERNAL,
            memberIds: [],
            startDate: getTodayInYangon(),
            createdByUserId: 'system',
        };
        batch.set(projectRef, { ...newProjectData, createdAt: getMyanmarISOString(), updatedAt: getMyanmarISOString() });
    }
    
    await batch.commit();
    console.log("Successfully seeded 'Marketing Capsule' project.");
};

// Sales
export const apiGetSalesRecords = (limit?: number): Promise<SaleRecord[]> => fetchCollection<SaleRecord>('sales', {field: 'createdAt', direction: 'desc'}, limit);
export const apiGetSaleById = (id: string): Promise<SaleRecord | null> => fetchDocumentById<SaleRecord>('sales', id);
export const apiAddSaleRecord = async (saleData: Omit<SaleRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SaleRecord> => {
    const newId = await getNextId(SALE_ID_PREFIX);
    const newSaleRef = db.collection('sales').doc(newId);
    let createdSale: SaleRecord | null = null;

    const finalStatus = saleData.status || SaleStatus.DRAFT;
    if (saleData.businessId && saleData.clientId) {
        await requireLinkedPair(saleData.clientId, saleData.businessId, 'apiAddSaleRecord');
    }
    
    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first

        // Read balance document if needed
        let balanceDoc: firebase.firestore.DocumentSnapshot | null = null;
        const balanceRef = (finalStatus !== SaleStatus.DRAFT && saleData.businessId)
            ? db.collection('client_business_balances').doc(`${saleData.clientId}_${saleData.businessId}`)
            : null;
        if (balanceRef) {
            balanceDoc = await transaction.get(balanceRef);
        }

        // STEP 2: Now perform all writes
        const dataToSave = {
            ...saleData,
            status: finalStatus,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString()
        };
        
        transaction.set(newSaleRef, dataToSave as any);
        createdSale = convertTimestamps({ id: newSaleRef.id, ...dataToSave }) as SaleRecord;

        // Canonical: Total Billed includes Approved Sales (grandTotalMMK). Increment balance by sale amount.
        if (finalStatus !== SaleStatus.DRAFT && saleData.businessId && balanceRef) {
            // Update client-business balance
            
            if (balanceDoc?.exists) {
                transaction.update(balanceRef, {
                    balance: firebase.firestore.FieldValue.increment(saleData.grandTotalMMK),
                    updatedAt: getMyanmarISOString(),
                });
            } else {
                transaction.set(balanceRef, {
                    clientId: saleData.clientId,
                    businessId: saleData.businessId,
                    balance: saleData.grandTotalMMK,
                    createdAt: getMyanmarISOString(),
                    updatedAt: getMyanmarISOString(),
                });
            }
            
            // Update client total balance (sum of all client-business balances)
            const clientRef = db.collection('clients').doc(saleData.clientId);
            transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(saleData.grandTotalMMK) });

            // Update business total balance (sum of all client-business balances for this business)
            const businessRef = db.collection('businesses').doc(saleData.businessId);
            transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(saleData.grandTotalMMK) });
        } else if (finalStatus !== SaleStatus.DRAFT && !saleData.businessId) {
            // If no businessId, update client balance directly (legacy support)
            const clientRef = db.collection('clients').doc(saleData.clientId);
            transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(saleData.grandTotalMMK) });
        }
    });
    const result = createdSale ?? (convertTimestamps({ id: newSaleRef.id, ...(await newSaleRef.get()).data() }) as SaleRecord);
    void logActivityHelper('Sales', 'Create', `Created ${result.type} sale: ${result.id}`, result.id, { type: result.type, amount: result.grandTotalMMK, status: result.status });
    return result;
};
export const apiUpdateSaleRecord = async (data: Partial<SaleRecord> & { id: string }): Promise<void> => {
    const saleId = data?.id?.trim?.();
    if (!saleId) {
        throw new Error("Sale ID is required. Cannot approve or update a sale without a valid ID.");
    }
    const oldSaleDoc = await db.collection('sales').doc(saleId).get();
    if (!oldSaleDoc.exists) throw new Error("Sale record not found for update.");
    const oldSalePreRead = oldSaleDoc.data() as SaleRecord;
    const newClientIdPre = (data.clientId ?? oldSalePreRead.clientId)?.toString().trim() || '';
    const newBusinessIdPre = (data.businessId ?? oldSalePreRead.businessId)?.toString().trim() || null;
    const isStatusOnlyApprove =
        data.status === SaleStatus.CHECKED &&
        oldSalePreRead.status === SaleStatus.DRAFT &&
        data.clientId == null &&
        data.businessId == null;
    if (newClientIdPre && newBusinessIdPre && !isStatusOnlyApprove) {
        await requireLinkedPair(newClientIdPre, newBusinessIdPre, 'apiUpdateSaleRecord');
    }
    let clientId = '';
    let businessId: string | null = null;
    let oldSaleData: SaleRecord | null = null;
    let newClientId = '';
    let newBusinessId: string | null = null;
    let pairChanged = false;
    try {
    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const saleRef = db.collection('sales').doc(saleId);
        const oldSaleDoc = await transaction.get(saleRef);
        if (!oldSaleDoc.exists) {
            throw new Error("Sale record not found for update.");
        }
        oldSaleData = oldSaleDoc.data() as SaleRecord;
        clientId = (oldSaleData.clientId || '').toString().trim();
        businessId = (oldSaleData.businessId || '').toString().trim() || null;
        if (!clientId) {
            throw new Error("Sale record has no client. Cannot approve sale without a valid client ID.");
        }
        const oldStatus = oldSaleData.status;
        const newStatus = data.status ?? oldStatus;
        const amountDifference = (data.grandTotalMMK ?? oldSaleData.grandTotalMMK) - oldSaleData.grandTotalMMK;

        const clientRef = db.collection('clients').doc(clientId);
        const businessRef = businessId ? db.collection('businesses').doc(businessId) : null;
        
        // Handle status changes: DRAFT <-> APPROVED/Other statuses
        const wasDraft = oldStatus === SaleStatus.DRAFT;
        const isDraft = newStatus === SaleStatus.DRAFT;
        const isApprovedOrBeyond = newStatus !== SaleStatus.DRAFT;
        const wasApprovedOrBeyond = oldStatus !== SaleStatus.DRAFT;
        
        // Read balance document if needed
        let balanceDoc: firebase.firestore.DocumentSnapshot | null = null;
        const balanceRef = businessId 
            ? db.collection('client_business_balances').doc(`${clientId}_${businessId}`)
            : null;
        
        if (balanceRef && (wasDraft && isApprovedOrBeyond || wasApprovedOrBeyond && isDraft || (amountDifference !== 0 && isApprovedOrBeyond))) {
            balanceDoc = await transaction.get(balanceRef);
        }

        // If we need to create a new balance record, verify client and business are linked
        const needCreateBalance = businessId && balanceRef && !balanceDoc?.exists &&
            (wasDraft && isApprovedOrBeyond || (amountDifference !== 0 && isApprovedOrBeyond));
        if (needCreateBalance && businessRef) {
            const [clientSnap, businessSnap] = await Promise.all([
                transaction.get(clientRef),
                transaction.get(businessRef),
            ]);
            const clientData = clientSnap.exists ? (clientSnap.data() as Client) : null;
            const businessData = businessSnap.exists ? (businessSnap.data() as Business) : null;
            const clientLinked = (clientData?.linkedBusinessIds ?? []).includes(businessId);
            const businessLinked = (businessData?.linkedClientIds ?? []).includes(clientId);
            if (!clientLinked || !businessLinked) {
                throw new Error(`Client ${clientId} and business ${businessId} are not linked. Cannot create balance. Link them in client and business documents first.`);
            }
        }
        
        // STEP 2: Now perform all writes
        // In-Charge Staff is not editable - preserve original, track who last edited
        const { inChargeUserId: _discard, ...updateData } = data as any;
        const currentUserId = auth.currentUser?.uid;
        // Allow all fields to be edited for approved sales (no restriction)
        const dataToApply = updateData;
        const finalUpdate = {
            ...dataToApply,
            updatedAt: getMyanmarISOString(),
            lastEditedByUserId: currentUserId || null,
            lastEditedAt: getMyanmarISOString(),
        };
        transaction.update(saleRef, finalUpdate);

        // When client/business changes, skip in-transaction balance updates - use apiRecalculateClientBalance after
        newClientId = (data.clientId ?? oldSaleData.clientId)?.toString().trim() || clientId;
        newBusinessId = (data.businessId ?? oldSaleData.businessId)?.toString().trim() || null;
        pairChanged = newClientId !== clientId || String(newBusinessId || '') !== String(businessId || '');
        
        if (pairChanged) {
            // Balance updates done after transaction via apiRecalculateClientBalance
            void 0;
        } else if (businessId && balanceRef) {
            if (wasDraft && isApprovedOrBeyond) {
                // Moving from DRAFT to APPROVED or beyond - ADD balance
                if (balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(oldSaleData.grandTotalMMK),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    transaction.set(balanceRef, {
                        clientId,
                        businessId,
                        balance: oldSaleData.grandTotalMMK,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(oldSaleData.grandTotalMMK) });
                if (businessRef) {
                    transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(oldSaleData.grandTotalMMK) });
                }
            } else if (wasApprovedOrBeyond && isDraft) {
                // Moving from APPROVED/other status back to DRAFT - REMOVE balance
                if (balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(-oldSaleData.grandTotalMMK),
                        updatedAt: getMyanmarISOString(),
                    });
                }
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-oldSaleData.grandTotalMMK) });
                if (businessRef) {
                    transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(-oldSaleData.grandTotalMMK) });
                }
            }
            
            // Formula: Total Billed changes by amount diff. Status DRAFT<->APPROVED: apply delta.
            // Handle amount changes (only if status is APPROVED or beyond, not DRAFT)
            if (amountDifference !== 0 && isApprovedOrBeyond) {
                if (balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(amountDifference),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    transaction.set(balanceRef, {
                        clientId,
                        businessId,
                        balance: amountDifference,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountDifference) });
                if (businessRef) {
                    transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(amountDifference) });
                }
            }
        } else {
            // Legacy: No businessId - update client balance directly
            if (wasDraft && isApprovedOrBeyond) {
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(oldSaleData.grandTotalMMK) });
            } else if (wasApprovedOrBeyond && isDraft) {
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-oldSaleData.grandTotalMMK) });
            }
            if (amountDifference !== 0 && isApprovedOrBeyond) {
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountDifference) });
            }
        }
    });
    } catch (error) {
        if (isQuotaExceededError(error)) {
            throw new Error('Firebase quota exceeded. Wait a few minutes or upgrade the Firebase plan, then try again.');
        }
        throw error;
    }

    // Sync financial data after balance updates
    if (pairChanged) {
        // Recalculate both old and new pairs from scratch (sale moved between pairs)
        try {
            if (clientId && businessId) await apiRecalculateClientBalance(clientId, businessId);
            if (newClientId && newBusinessId && (newClientId !== clientId || newBusinessId !== businessId)) {
                await apiRecalculateClientBalance(newClientId, newBusinessId);
            }
        } catch (error) {
            console.warn("Failed to recalculate balance after sale client/business change:", error);
        }
    } else {
        try {
            await syncFinanceCustomerBalance(clientId, businessId ?? undefined);
        } catch (error) {
            console.warn("Failed to sync finance customer balance after sale update:", error);
        }
    }

    // If sale is linked to an invoice, update invoice totals from linked sales
    const invoiceId = (data.invoiceId ?? oldSaleData?.invoiceId) as string | undefined;
    if (invoiceId) {
        try {
            await updateInvoiceFromLinkedSales(invoiceId);
        } catch (error) {
            console.warn("Failed to update invoice from linked sales after sale update:", error);
        }
    }

    void logActivityHelper('Sales', 'Update', `Updated sale: ${data.id}`, data.id, data);
};

export const apiDeleteSaleRecord = async (id: string): Promise<void> => {
    const paymentsQuery = db.collection('payments').where('saleRecordId', '==', id).limit(1);
    const paymentsSnapshot = await paymentsQuery.get();
    if (!paymentsSnapshot.empty) {
        throw new Error("Cannot delete: Payments are recorded for this sale. Please manage payments first.");
    }

    const invoicesQuery = db.collection('invoices').where('saleRecordId', '==', id).limit(1);
    const invoicesSnapshot = await invoicesQuery.get();
    if (!invoicesSnapshot.empty) {
        throw new Error("Cannot delete: An invoice has been created from this sale. Please manage the invoice first.");
    }

    let syncPayload: { clientId: string; businessId?: string | null; invoiceId?: string } | null = null;

    await db.runTransaction(async (transaction) => {
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists) {
            throw new Error("Sale record not found for deletion. It may have already been deleted.");
        }
        const saleData = saleDoc.data() as SaleRecord;
        syncPayload = {
            clientId: saleData.clientId ?? '',
            businessId: saleData.businessId ?? null,
            invoiceId: (saleData as { invoiceId?: string }).invoiceId,
        };

        let balanceRef: firebase.firestore.DocumentReference | null = null;
        let balanceDoc: firebase.firestore.DocumentSnapshot | null = null;
        if (saleData.status !== SaleStatus.DRAFT && saleData.grandTotalMMK !== 0 && saleData.businessId) {
            const balanceId = `${saleData.clientId}_${saleData.businessId}`;
            balanceRef = db.collection('client_business_balances').doc(balanceId);
            balanceDoc = await transaction.get(balanceRef);
        }

        transaction.delete(saleRef);

        // Formula: Reverse sale -> Total Billed -= grandTotal
        // Only decrement balance if status is NOT DRAFT (DRAFT sales never updated balance)
        if (saleData.status !== SaleStatus.DRAFT && saleData.grandTotalMMK !== 0) {
            const amountToDecrement = -saleData.grandTotalMMK;

            if (saleData.businessId) {
                // Update client-business balance
                if (balanceRef && balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(amountToDecrement),
                        updatedAt: getMyanmarISOString(),
                    });
                }

                // Update client and business total balances
                const clientRef = db.collection('clients').doc(saleData.clientId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountToDecrement) });

                const businessRef = db.collection('businesses').doc(saleData.businessId);
                transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(amountToDecrement) });
            } else {
                // Legacy: No businessId - update client balance directly
                const clientRef = db.collection('clients').doc(saleData.clientId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountToDecrement) });
            }
        }
    });

    if (syncPayload?.clientId) {
        try {
            await syncFinanceCustomerBalance(syncPayload.clientId, syncPayload.businessId ?? undefined);
        } catch (error) {
            console.warn("Failed to sync finance customer balance after sale deletion:", error);
        }
        if (syncPayload.invoiceId) {
            try {
                await updateInvoiceFromLinkedSales(syncPayload.invoiceId);
            } catch (error) {
                console.warn("Failed to update invoice from linked sales after sale deletion:", error);
            }
        }
    }

    void logActivityHelper('Sales', 'Delete', `Deleted sale: ${id}`, id);
};

export const apiGetSalesForClient = (clientId: string): Promise<SaleRecord[]> => fetchCollectionByField<SaleRecord>('sales', 'clientId', clientId);
export const apiGetSalesForBusiness = (businessId: string): Promise<SaleRecord[]> => fetchCollectionByField<SaleRecord>('sales', 'businessId', businessId);
export const apiGetSalesForEmployee = (employeeId: string): Promise<SaleRecord[]> => fetchCollectionByField<SaleRecord>('sales', 'inChargeUserId', employeeId);
export const apiGetSalesForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<SaleRecord[]> => {
    // Sales store createdAt as ISO string (getMyanmarISOString), not Timestamp.
    // Firestore requires same type for comparison; use string boundaries to match.
    const start = startDate + 'T00:00:00.000+06:30';
    const end = endDate + 'T23:59:59.999+06:30';

    const snapshot = await db.collection('sales')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord);
};

/**
 * Sales whose *campaign* (or equivalent) date falls in [campaignStart, campaignEnd] (YYYY-MM-DD).
 * Used by Sales & Credits when filtering by Campaign From/To: the createdAt-based period fetch can hit
 * the default limit and omit these rows, while credit notes are loaded by creditNoteDate in range.
 */
export const apiGetSalesForCampaignUiDateRange = async (
    campaignStart: string,
    campaignEnd: string,
    limitPerBranch = 2000
): Promise<SaleRecord[]> => {
    const a = campaignStart <= campaignEnd ? campaignStart : campaignEnd;
    const b = campaignStart <= campaignEnd ? campaignEnd : campaignStart;
    const byId = new Map<string, SaleRecord>();

    const ingest = (snapshot: firebase.firestore.QuerySnapshot) => {
        snapshot.docs.forEach(doc => {
            byId.set(doc.id, convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord);
        });
    };

    const [fbSnap, osSnap] = await Promise.all([
        db.collection('sales')
            .where('type', '==', 'Facebook Ads')
            .where('startDate', '>=', a)
            .where('startDate', '<=', b)
            .orderBy('startDate', 'desc')
            .limit(limitPerBranch)
            .get(),
        (() => {
            const createdStart = a + 'T00:00:00.000+06:30';
            const createdEnd = b + 'T23:59:59.999+06:30';
            return db.collection('sales')
                .where('type', '==', 'Other Services')
                .where('createdAt', '>=', createdStart)
                .where('createdAt', '<=', createdEnd)
                .orderBy('createdAt', 'desc')
                .limit(limitPerBranch)
                .get();
        })(),
    ]);

    ingest(fbSnap);
    ingest(osSnap);

    return Array.from(byId.values());
};

export const apiGetSaleRecordByFacebookCampaignId = async (campaignId: string): Promise<FacebookAdsSaleRecord | null> => {
    const snapshot = await db.collection('sales')
        .where('type', '==', 'Facebook Ads')
        .where('facebookCampaignId', '==', campaignId)
        .limit(1)
        .get();
    
    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return convertTimestamps({ id: doc.id, ...doc.data() }) as FacebookAdsSaleRecord;
};

// FIX: Add missing Facebook API functions as placeholders
// --- Facebook Ads Integration ---

// NOTE: The following functions are placeholders. A real implementation would require
// a secure backend (like Firebase Cloud Functions) to handle the Facebook Graph API calls.
const MOCK_ACCOUNTS = [
    { id: 'act_1234567890', account_id: '1234567890', name: 'Mock Ad Account 1', pages: [{ id: 'page_1', name: 'Mock Page 1' }, { id: 'page_2', name: 'Mock Page 2' }] },
    { id: 'act_0987654321', account_id: '0987654321', name: 'Mock Ad Account 2', pages: [{ id: 'page_3', name: 'Mock Page 3' }] }
];

/**
 * (Placeholder) Fetches data from Facebook and stores it in Firestore.
 */
export const apiFetchAndStoreFacebookData = async (): Promise<void> => {
    if (FACEBOOK_MOCK_MODE) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('fb_connected', 'true');
            localStorage.removeItem('fb_sync_status');
        }
        await delay(500);
        return;
    }
    console.warn("apiFetchAndStoreFacebookData is a placeholder. Simulating a fetch and store operation.");
    localStorage.setItem('fb_connected', 'true');
    localStorage.removeItem('fb_sync_status'); // Reset sync status on new connection
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    return;
};


/**
 * (Placeholder) Fetches the stored Facebook Ad Accounts from Firestore.
 */
export const apiGetFacebookAdAccountsFromFirestore = async (): Promise<FacebookAdAccount[]> => {
    if (FACEBOOK_MOCK_MODE) {
        await delay(250);
        return MOCK_FACEBOOK_ACCOUNTS.map(acc => ({ ...acc }));
    }
    console.warn("apiGetFacebookAdAccountsFromFirestore is a placeholder and does not connect to Facebook.");
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isConnected = localStorage.getItem('fb_connected');
    if (!isConnected) {
        return [];
    }

    const syncStatus = JSON.parse(localStorage.getItem('fb_sync_status') || '{}');
    return MOCK_FACEBOOK_ACCOUNTS.map(acc => ({
        ...acc,
        isSynced: syncStatus[acc.id] ?? true
    }));
};

/**
 * (Placeholder) Updates the sync status for a single ad account in Firestore.
 */
export const apiUpdateFacebookAdAccountSyncStatus = async (userId: string, accountId: string, isSynced: boolean): Promise<void> => {
    if (FACEBOOK_MOCK_MODE) {
        const account = MOCK_FACEBOOK_ACCOUNTS.find(acc => acc.id === accountId);
        if (account) {
            account.isSynced = isSynced;
        }
        await delay(200);
        return;
    }
    console.warn("apiUpdateFacebookAdAccountSyncStatus is a placeholder. Simulating update in localStorage.");
    const syncStatus = JSON.parse(localStorage.getItem('fb_sync_status') || '{}');
    syncStatus[accountId] = isSynced;
    localStorage.setItem('fb_sync_status', JSON.stringify(syncStatus));
    // A real implementation would look like this:
    /*
    const integrationRef = db.collection('facebook_integrations').doc(userId);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(integrationRef);
        if (!doc.exists) {
            throw new Error("Facebook integration not found for this user.");
        }
        const integrationData = doc.data() as { accounts: FacebookAdAccount[] };
        const updatedAccounts = integrationData.accounts.map(acc => {
            if (acc.id === accountId) {
                return { ...acc, isSynced: isSynced };
            }
            return acc;
        });
        transaction.update(integrationRef, { accounts: updatedAccounts });
    });
    */
    return Promise.resolve();
};

/**
 * (Placeholder) Fetches insights for a given ad account.
 */
export const apiGetFacebookAccountInsights = async (accountId: string, timeIncrement: 'day' | 'month' = 'day'): Promise<FacebookInsight | null> => {
    if (FACEBOOK_MOCK_MODE) {
        await delay(timeIncrement === 'day' ? 300 : 500);
        return getMockInsightForAccount(accountId);
    }
    console.warn(`apiGetFacebookAccountInsights is a placeholder for account ${accountId}. Returning mock data.`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // This mocks a summary for the last 30 days.
    return {
        date_start: getDateInYangonTimezone(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        date_stop: getTodayInYangon(),
        spend: (Math.random() * 5000 + 1000).toFixed(2),
        impressions: (Math.random() * 100000 + 20000).toFixed(0),
        clicks: (Math.random() * 2000 + 500).toFixed(0),
    };
};

/**
 * (Placeholder) Fetches campaigns for a given ad account.
 */
export const apiGetFacebookCampaigns = async (accountId: string): Promise<FacebookCampaign[]> => {
    if (FACEBOOK_MOCK_MODE) {
        await delay(400);
        return getMockCampaignsForAccount(accountId).map(campaign => ({ ...campaign }));
    }
    console.warn(`apiGetFacebookCampaigns is a placeholder for account ${accountId}. Returning mock data.`);
    await new Promise(resolve => setTimeout(resolve, 700));
    return [
        { id: 'campaign_1', name: 'Active Campaign A - Brand Awareness', status: 'ACTIVE', objective: 'REACH', daily_budget: '1000' },
        { id: 'campaign_2', name: 'Active Campaign B - Lead Gen', status: 'ACTIVE', objective: 'LEAD_GENERATION', lifetime_budget: '50000' },
        { id: 'campaign_3', name: 'Paused Campaign C - Engagement', status: 'PAUSED', objective: 'POST_ENGAGEMENT' },
        { id: 'campaign_4', name: 'Archived Campaign D - Past Promo', status: 'ARCHIVED', objective: 'CONVERSIONS' },
        { id: 'campaign_5', name: 'Deleted Campaign E', status: 'DELETED', objective: 'LINK_CLICKS' },
    ];
};

/**
 * (Placeholder) Fetches a single campaign by ID.
 */
export const apiGetFacebookCampaignById = async (campaignId: string): Promise<FacebookCampaign | null> => {
    if (FACEBOOK_MOCK_MODE) {
        await delay(200);
        const campaign = getMockCampaignById(campaignId);
        return campaign ? { ...campaign } : null;
    }
    console.warn(`apiGetFacebookCampaignById is a placeholder. Searching for campaign ${campaignId}.`);
    const allCampaigns = await apiGetFacebookCampaigns('mock_account_id');
    const campaign = allCampaigns.find(c => c.id === campaignId);
    return campaign || null;
};

/**
 * (Placeholder) Updates the status of a campaign.
 */
export const apiUpdateFacebookCampaignStatus = async (campaignId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> => {
    if (FACEBOOK_MOCK_MODE) {
        const campaign = getMockCampaignById(campaignId);
        if (campaign) {
            campaign.status = status;
        }
        await delay(250);
        return;
    }
    console.warn(`apiUpdateFacebookCampaignStatus is a placeholder. Mocking update for campaign ${campaignId} to ${status}.`);
    await new Promise(resolve => setTimeout(resolve, 500));
    void logActivityHelper('Facebook Ads', 'Update Campaign Status', `Updated campaign ${campaignId} to ${status}`, campaignId, { status });
    return;
};

/**
 * (Placeholder) Creates a new draft campaign.
 */
export const apiCreateFacebookCampaign = async (accountId: string, data: { name: string; objective: string }): Promise<void> => {
    if (FACEBOOK_MOCK_MODE) {
        const campaigns = MOCK_FACEBOOK_CAMPAIGNS[accountId] ?? [];
        const newCampaign: FacebookCampaign = {
            id: `campaign_mock_${Date.now()}`,
            name: data.name,
            status: 'ACTIVE',
            objective: data.objective,
            daily_budget: '5000',
        };
        campaigns.unshift(newCampaign);
        MOCK_FACEBOOK_CAMPAIGNS[accountId] = campaigns;
        await delay(400);
        return;
    }
    console.warn(`apiCreateFacebookCampaign is a placeholder. Mocking creation for campaign "${data.name}" in account ${accountId}.`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    void logActivityHelper('Facebook Ads', 'Create Campaign', `Created campaign: ${data.name}`, undefined, { accountId, objective: data.objective });
    return;
};


/**
 * (Placeholder) Disconnects the Facebook integration.
 */
export const apiDisconnectFacebookIntegration = async (): Promise<void> => {
    if (FACEBOOK_MOCK_MODE) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('fb_connected');
            localStorage.removeItem('fb_sync_status');
        }
        await delay(300);
        return;
    }
    console.warn(`apiDisconnectFacebookIntegration is a placeholder. Simulating disconnection.`);
    localStorage.removeItem('fb_connected');
    localStorage.removeItem('fb_sync_status');
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
};

// --- Finance Suite APIs ---
const ensureBalanced = (lines: JournalEntryLine[]) => {
    const debit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const credit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
    if (Math.abs(debit - credit) > 0.01) {
        throw new Error('Journal entry must balance (debits = credits).');
    }
};

const postJournalEntry = (payload: Omit<JournalEntry, 'id' | 'status' | 'createdAt' | 'updatedAt'>): JournalEntry => {
    ensureBalanced(payload.lines);
    const entry: JournalEntry = {
        ...payload,
        id: generateFinanceId('je'),
        status: JournalEntryStatus.POSTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    financeStore.journalEntries.push(entry);
    return entry;
};

export const apiGetChartOfAccounts = async (): Promise<ChartOfAccount[]> => {
    await delay(150);
    return financeStore.chartOfAccounts.slice();
};

export const apiSaveChartAccount = async (data: Partial<ChartOfAccount> & { name: string; code: string; type: AccountType; currency: string }): Promise<ChartOfAccount> => {
    await delay(200);
    if (data.id) {
        const idx = financeStore.chartOfAccounts.findIndex(acc => acc.id === data.id);
        if (idx === -1) throw new Error('Account not found');
        financeStore.chartOfAccounts[idx] = { ...financeStore.chartOfAccounts[idx], ...data } as ChartOfAccount;
        return financeStore.chartOfAccounts[idx];
    }
    const newAccount: ChartOfAccount = {
        id: generateFinanceId('coa'),
        isActive: true,
        allowManualPosting: true,
        ...data,
    };
    financeStore.chartOfAccounts.push(newAccount);
    return newAccount;
};

export const apiGetJournalEntries = async (): Promise<JournalEntry[]> => {
    await delay(200);
    return financeStore.journalEntries.slice().sort((a, b) => b.entryDate.localeCompare(a.entryDate));
};

export const apiSaveJournalEntry = async (payload: Omit<JournalEntry, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> => {
    await delay(250);
    return postJournalEntry(payload);
};

export const apiGetFinanceVendors = async (): Promise<Vendor[]> => {
    await delay(150);
    return financeStore.vendors.slice();
};

export const apiSaveFinanceVendor = async (vendor: Partial<Vendor> & { name: string }): Promise<Vendor> => {
    await delay(150);
    if (vendor.id) {
        const index = financeStore.vendors.findIndex(v => v.id === vendor.id);
        if (index === -1) throw new Error('Vendor not found');
        const updatedVendor: Vendor = {
            ...financeStore.vendors[index],
            ...vendor,
            updatedAt: new Date().toISOString(),
        };
        financeStore.vendors[index] = updatedVendor;
        return updatedVendor;
    }
    const newVendor: Vendor = {
        id: generateFinanceId('vendor'),
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    financeStore.vendors.push(newVendor);
    return newVendor;
};

export const apiGetAPInvoices = async (): Promise<AccountsPayableInvoice[]> => {
    await delay(200);
    return financeStore.apInvoices.slice();
};

export const apiSaveAPInvoice = async (invoice: Omit<AccountsPayableInvoice, 'id' | 'status' | 'createdAt'> & { status?: InvoiceStatus }): Promise<AccountsPayableInvoice> => {
    await delay(200);
    const vendor = financeStore.vendors.find(v => v.id === invoice.vendorId);
    if (!vendor) throw new Error('Vendor not found');
    const newInvoice: AccountsPayableInvoice = {
        ...invoice,
        id: generateFinanceId('apinvc'),
        status: invoice.status ?? InvoiceStatus.SENT,
        createdAt: new Date().toISOString(),
    };
    financeStore.apInvoices.push(newInvoice);
    vendor.balance += newInvoice.amount;

    postJournalEntry({
        reference: `AP-${newInvoice.invoiceNumber}`,
        entryDate: newInvoice.invoiceDate,
        period: newInvoice.invoiceDate.slice(0, 7),
        createdByUserId: 'system',
        lines: [
            { id: generateFinanceId('line'), accountId: 'coa_5000', debit: newInvoice.amount, credit: 0, currency: newInvoice.currency },
            { id: generateFinanceId('line'), accountId: 'coa_2000', debit: 0, credit: newInvoice.amount, currency: newInvoice.currency },
        ],
    });
    return newInvoice;
};

export const apiRunVendorPayment = async (invoiceIds: string[], paymentDate: string): Promise<{ paidInvoices: AccountsPayableInvoice[] }> => {
    await delay(300);
    const paid: AccountsPayableInvoice[] = [];
    invoiceIds.forEach(id => {
        const invoice = financeStore.apInvoices.find(inv => inv.id === id);
        if (invoice && invoice.status !== InvoiceStatus.PAID) {
            invoice.status = InvoiceStatus.PAID;
            const vendor = financeStore.vendors.find(v => v.id === invoice.vendorId);
            if (vendor) vendor.balance -= invoice.amount;
            paid.push(invoice);
            postJournalEntry({
                reference: `PAY-${invoice.invoiceNumber}`,
                entryDate: paymentDate,
                period: paymentDate.slice(0, 7),
                createdByUserId: 'system',
                lines: [
                    { id: generateFinanceId('line'), accountId: 'coa_2000', debit: invoice.amount, credit: 0, currency: invoice.currency },
                    { id: generateFinanceId('line'), accountId: 'coa_1000', debit: 0, credit: invoice.amount, currency: invoice.currency },
                ],
            });
        }
    });
    return { paidInvoices: paid };
};

export const apiGetFinanceCustomers = async (): Promise<Customer[]> => {
    await delay(150);
    return financeStore.customers.slice();
};

export const apiSaveFinanceCustomer = async (customer: Partial<Customer> & { name: string }): Promise<Customer> => {
    await delay(150);
    if (customer.id) {
        const idx = financeStore.customers.findIndex(c => c.id === customer.id);
        if (idx === -1) {
            // If a specific ID is provided but customer does not exist yet, create it with that ID
            const newCustomer: Customer = {
                id: customer.id,
                balance: 0,
                currency: customer.currency || 'MMK',
                name: customer.name,
            };
            financeStore.customers.push(newCustomer);
            return newCustomer;
        }
        const updated: Customer = { ...financeStore.customers[idx], ...customer } as Customer;
        financeStore.customers[idx] = updated;
        return updated;
    }
    const newCustomer: Customer = { id: generateFinanceId('customer'), balance: 0, currency: 'MMK', ...customer };
    financeStore.customers.push(newCustomer);
    return newCustomer;
};

export const apiGetARInvoices = async (): Promise<AccountsReceivableInvoice[]> => {
    await delay(200);
    return financeStore.arInvoices.slice();
};

export const apiSaveARInvoice = async (invoice: Omit<AccountsReceivableInvoice, 'id' | 'status' | 'createdAt'> & { status?: InvoiceStatus }): Promise<AccountsReceivableInvoice> => {
    await delay(200);
    const customer = financeStore.customers.find(c => c.id === invoice.customerId);
    if (!customer) throw new Error('Customer not found');
    const newInvoice: AccountsReceivableInvoice = {
        ...invoice,
        id: generateFinanceId('arinvc'),
        status: invoice.status ?? InvoiceStatus.SENT,
        createdAt: new Date().toISOString(),
    };
    financeStore.arInvoices.push(newInvoice);
    customer.balance += newInvoice.amount;

    postJournalEntry({
        reference: `AR-${newInvoice.invoiceNumber}`,
        entryDate: newInvoice.invoiceDate,
        period: newInvoice.invoiceDate.slice(0, 7),
        createdByUserId: 'system',
        lines: [
            { id: generateFinanceId('line'), accountId: 'coa_1100', debit: newInvoice.amount, credit: 0, currency: newInvoice.currency },
            { id: generateFinanceId('line'), accountId: 'coa_4000', debit: 0, credit: newInvoice.amount, currency: newInvoice.currency },
        ],
    });
    return newInvoice;
};

export const apiRecordCustomerReceipt = async (invoiceId: string, receiptDate: string): Promise<AccountsReceivableInvoice> => {
    await delay(200);
    const invoice = financeStore.arInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === InvoiceStatus.PAID) return invoice;
    invoice.status = InvoiceStatus.PAID;
    const customer = financeStore.customers.find(c => c.id === invoice.customerId);
    if (customer) customer.balance -= invoice.amount;
    postJournalEntry({
        reference: `RCPT-${invoice.invoiceNumber}`,
        entryDate: receiptDate,
        period: receiptDate.slice(0, 7),
        createdByUserId: 'system',
        lines: [
            { id: generateFinanceId('line'), accountId: 'coa_1000', debit: invoice.amount, credit: 0, currency: invoice.currency },
            { id: generateFinanceId('line'), accountId: 'coa_1100', debit: 0, credit: invoice.amount, currency: invoice.currency },
        ],
    });
    return invoice;
};

// --- Bad Debt & Allowance for Doubtful Debts APIs ---

// Default aging brackets for doubtful debt provisions
const DEFAULT_AGING_BRACKETS: BadDebtAgingBracket[] = [
    { minDays: 0, maxDays: 30, label: '0-30 days', provisionPercentage: 0 },
    { minDays: 31, maxDays: 60, label: '31-60 days', provisionPercentage: 5 },
    { minDays: 61, maxDays: 90, label: '61-90 days', provisionPercentage: 10 },
    { minDays: 91, maxDays: 180, label: '91-180 days', provisionPercentage: 25 },
    { minDays: 181, maxDays: 365, label: '181-365 days', provisionPercentage: 50 },
    { minDays: 366, maxDays: null, label: 'Over 1 year', provisionPercentage: 100 },
];

export const apiGetBadDebts = async (): Promise<BadDebt[]> => {
    return fetchCollection<BadDebt>('bad_debts', { field: 'writeOffDate', direction: 'desc' });
};

export const apiGetBadDebtsForClient = async (clientId: string): Promise<BadDebt[]> => {
    const snapshot = await db.collection('bad_debts').where('clientId', '==', clientId).get();
    const badDebts = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as BadDebt);
    return badDebts.sort((a, b) => new Date(b.writeOffDate).getTime() - new Date(a.writeOffDate).getTime());
};

export const apiGetBadDebtsForBusiness = async (businessId: string): Promise<BadDebt[]> => {
    const snapshot = await db.collection('bad_debts').where('businessId', '==', businessId).get();
    const badDebts = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as BadDebt);
    return badDebts.sort((a, b) => new Date(b.writeOffDate).getTime() - new Date(a.writeOffDate).getTime());
};

export const apiGetBadDebtsForResponsiblePerson = async (responsiblePersonUserId: string): Promise<BadDebt[]> => {
    const snapshot = await db.collection('bad_debts').where('responsiblePersonUserId', '==', responsiblePersonUserId).get();
    const badDebts = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as BadDebt);
    return badDebts.sort((a, b) => new Date(b.writeOffDate).getTime() - new Date(a.writeOffDate).getTime());
};

export const apiGetBadDebtById = async (id: string): Promise<BadDebt | null> => {
    const docRef = db.collection('bad_debts').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return convertTimestamps({ id: doc.id, ...doc.data() }) as BadDebt;
};

export const apiWriteOffBadDebt = async (
    data: {
        clientId?: string;
        businessId?: string;
        invoiceId?: string;
        saleRecordId?: string;
        amount: number;
        usdAmount?: number;
        exchangeRate?: number;
        reason: string;
        writeOffDate: string;
        /** Optional: employee/user ID responsible for this bad debt */
        responsiblePersonUserId?: string;
    },
    userId: string
): Promise<BadDebt> => {
    if (data.clientId && data.businessId) {
        await requireLinkedPair(data.clientId, data.businessId, 'apiWriteOffBadDebt');
    }
    const badDebtId = generateFinanceId('bd');
    const now = getMyanmarISOString();
    
    // Create journal entry for bad debt write-off
    // Debit: Bad Debt Expense (coa_5200)
    // Credit: Accounts Receivable (coa_1100)
    const journalEntry = postJournalEntry({
        reference: `BD-${badDebtId}`,
        entryDate: data.writeOffDate,
        period: data.writeOffDate.slice(0, 7),
        createdByUserId: userId,
        lines: [
            { id: generateFinanceId('line'), accountId: 'coa_5200', debit: data.amount, credit: 0, currency: 'MMK', description: `Bad debt write-off: ${data.reason}` },
            { id: generateFinanceId('line'), accountId: 'coa_1100', debit: 0, credit: data.amount, currency: 'MMK', description: `Bad debt write-off: ${data.reason}` },
        ],
    });

    const badDebt: BadDebt = {
        id: badDebtId,
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.businessId && { businessId: data.businessId }),
        ...(data.invoiceId && { invoiceId: data.invoiceId }),
        ...(data.saleRecordId && { saleRecordId: data.saleRecordId }),
        originalAmount: data.amount,
        writtenOffAmount: data.amount,
        ...(typeof data.usdAmount === 'number' ? { usdAmount: data.usdAmount } : {}),
        ...(typeof data.exchangeRate === 'number' ? { exchangeRate: data.exchangeRate } : {}),
        recoveredAmount: 0,
        currency: 'MMK',
        reason: data.reason,
        status: BadDebtStatus.WRITTEN_OFF,
        writeOffDate: data.writeOffDate,
        journalEntryId: journalEntry.id,
        createdByUserId: userId,
        ...(data.responsiblePersonUserId && { responsiblePersonUserId: data.responsiblePersonUserId }),
        createdAt: now,
        updatedAt: now,
    };

    await db.collection('bad_debts').doc(badDebtId).set(badDebt);

    // Update pair balance and sync client/business totals (formula includes bad debt)
    if (data.clientId && data.businessId) {
        try {
            await apiRecalculateClientBalance(data.clientId, data.businessId);
        } catch (error) {
            console.error("Failed to sync client/business balance after bad debt write-off:", error);
        }
    } else if (data.clientId) {
        const clientRef = db.collection('clients').doc(data.clientId);
        const clientDoc = await clientRef.get();
        if (clientDoc.exists) {
            const currentBalance = (clientDoc.data() as Client).balance || 0;
            await clientRef.update({
                balance: Math.max(0, currentBalance - data.amount),
                updatedAt: now
            });
        }
    }

    // If linked to an invoice, update its status
    if (data.invoiceId) {
        const invoiceRef = db.collection('invoices').doc(data.invoiceId);
        const invoiceDoc = await invoiceRef.get();
        if (invoiceDoc.exists) {
            await invoiceRef.update({ 
                status: InvoiceStatus.CANCELLED,
                updatedAt: now,
                badDebtId: badDebtId 
            });
        }
    }

    void logActivityHelper('Finance', 'Write Off Bad Debt', `Wrote off bad debt of ${data.amount} MMK`, badDebtId, { clientId: data.clientId, businessId: data.businessId, reason: data.reason });
    
    return badDebt;
};

export const apiRecoverBadDebt = async (
    badDebtId: string,
    data: {
        recoveryAmount: number;
        recoveryDate: string;
        cashAccountId?: string;
    },
    userId: string
): Promise<BadDebt> => {
    const badDebtRef = db.collection('bad_debts').doc(badDebtId);
    const badDebtDoc = await badDebtRef.get();
    
    if (!badDebtDoc.exists) {
        throw new Error('Bad debt record not found');
    }
    
    const badDebt = { id: badDebtDoc.id, ...badDebtDoc.data() } as BadDebt;
    const now = getMyanmarISOString();
    
    const newRecoveredAmount = badDebt.recoveredAmount + data.recoveryAmount;
    const isFullyRecovered = newRecoveredAmount >= badDebt.writtenOffAmount;
    
    // Create journal entry for bad debt recovery
    // Debit: Cash/Bank (coa_1000) or specific cash account
    // Credit: Bad Debt Recovery (coa_4100)
    const cashAccountId = data.cashAccountId || 'coa_1000';
    const recoveryJournalEntry = postJournalEntry({
        reference: `BDR-${badDebtId}`,
        entryDate: data.recoveryDate,
        period: data.recoveryDate.slice(0, 7),
        createdByUserId: userId,
        lines: [
            { id: generateFinanceId('line'), accountId: cashAccountId, debit: data.recoveryAmount, credit: 0, currency: 'MMK', description: `Bad debt recovery` },
            { id: generateFinanceId('line'), accountId: 'coa_4100', debit: 0, credit: data.recoveryAmount, currency: 'MMK', description: `Bad debt recovery` },
        ],
    });

    const updatedBadDebt: Partial<BadDebt> = {
        recoveredAmount: newRecoveredAmount,
        status: isFullyRecovered ? BadDebtStatus.RECOVERED : BadDebtStatus.PARTIALLY_RECOVERED,
        recoveryDate: data.recoveryDate,
        recoveryJournalEntryId: recoveryJournalEntry.id,
        updatedAt: now,
    };

    await badDebtRef.update(updatedBadDebt);

    void logActivityHelper('Finance', 'Recover Bad Debt', `Recovered ${data.recoveryAmount} MMK from bad debt`, badDebtId, { recoveryAmount: data.recoveryAmount });
    
    return { ...badDebt, ...updatedBadDebt } as BadDebt;
};

export const apiGetAllowanceForDoubtfulDebts = async (): Promise<AllowanceForDoubtfulDebts[]> => {
    return fetchCollection<AllowanceForDoubtfulDebts>('allowance_doubtful_debts', { field: 'provisionDate', direction: 'desc' });
};

export const apiGetAllowanceProvisionsForClient = async (clientId: string): Promise<AllowanceForDoubtfulDebts[]> => {
    const snapshot = await db.collection('allowance_doubtful_debts')
        .where('clientId', '==', clientId)
        .orderBy('provisionDate', 'desc')
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as AllowanceForDoubtfulDebts);
};

export const apiGetAllowanceProvisionsForBusiness = async (businessId: string): Promise<AllowanceForDoubtfulDebts[]> => {
    const snapshot = await db.collection('allowance_doubtful_debts')
        .where('businessId', '==', businessId)
        .orderBy('provisionDate', 'desc')
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as AllowanceForDoubtfulDebts);
};

export const apiGetLatestAllowanceBalance = async (): Promise<number> => {
    const allowances = await apiGetAllowanceForDoubtfulDebts();
    if (allowances.length === 0) return 0;
    return allowances[0].currentBalance;
};

export const apiCalculateDoubtfulDebtProvision = async (
    agingBrackets?: BadDebtAgingBracket[],
    options?: { clientId?: string; businessId?: string }
): Promise<{ totalReceivables: number; suggestedProvision: number; breakdown: Array<{ bracket: string; amount: number; provision: number }> }> => {
    const brackets = agingBrackets || DEFAULT_AGING_BRACKETS;
    const { clientId: filterClientId, businessId: filterBusinessId } = options || {};

    // When client and business are specified, calculate only for that pair
    if (filterClientId && filterBusinessId) {
        const [balanceDoc, payments] = await Promise.all([
            apiGetClientBusinessBalance(filterClientId, filterBusinessId),
            apiGetPayments(),
        ]);
        const cbb = balanceDoc;
        const outstanding = (cbb?.openingBalance ?? 0) + (cbb?.balance ?? 0);
        if (outstanding <= 0) {
            const emptyBreakdown = brackets.map(b => ({ bracket: b.label, amount: 0, provision: 0 }));
            return { totalReceivables: 0, suggestedProvision: 0, breakdown: emptyBreakdown };
        }
        const pairPayments = payments.filter(p => p.clientId === filterClientId && p.businessId === filterBusinessId);
        const lastPaymentDate = pairPayments.length > 0
            ? Math.max(...pairPayments.map(p => new Date(p.paymentDate).getTime()))
            : Date.now();
        const daysSinceLastPayment = Math.floor((Date.now() - lastPaymentDate) / (1000 * 60 * 60 * 24));
        const bracket = brackets.find(b => daysSinceLastPayment >= b.minDays && (b.maxDays === null || daysSinceLastPayment <= b.maxDays));
        const provision = bracket ? outstanding * (bracket.provisionPercentage / 100) : 0;
        const bracketIndex = bracket ? brackets.indexOf(bracket) : -1;
        const breakdown = brackets.map((b, idx) => ({
            bracket: b.label,
            amount: idx === bracketIndex ? outstanding : 0,
            provision: idx === bracketIndex ? provision : 0,
        }));
        return { totalReceivables: outstanding, suggestedProvision: provision, breakdown };
    }

    // Get all clients and businesses with positive balances (global calculation)
    const [clients, businesses] = await Promise.all([
        apiGetClients(),
        apiGetBusinesses(),
    ]);
    
    // Get last payment dates to determine aging
    const payments = await apiGetPayments();
    const now = Date.now();
    
    // Calculate aging for each receivable
    const breakdown: Array<{ bracket: string; amount: number; provision: number }> = brackets.map(b => ({
        bracket: b.label,
        amount: 0,
        provision: 0,
    }));
    
    let totalReceivables = 0;
    let suggestedProvision = 0;
    
    // Process clients (balance already includes opening from client_business_balances)
    clients.forEach(client => {
        const balance = client.balance ?? 0;
        if (balance <= 0) return;
        
        totalReceivables += balance;
        
        // Find last payment for this client
        const clientPayments = payments.filter(p => p.clientId === client.id);
        const lastPaymentDate = clientPayments.length > 0 
            ? Math.max(...clientPayments.map(p => new Date(p.paymentDate).getTime()))
            : new Date(client.createdAt || now).getTime();
        
        const daysSinceLastPayment = Math.floor((now - lastPaymentDate) / (1000 * 60 * 60 * 24));
        
        // Find applicable bracket
        const bracket = brackets.find(b => 
            daysSinceLastPayment >= b.minDays && 
            (b.maxDays === null || daysSinceLastPayment <= b.maxDays)
        );
        
        if (bracket) {
            const bracketIndex = brackets.indexOf(bracket);
            breakdown[bracketIndex].amount += balance;
            const provision = balance * (bracket.provisionPercentage / 100);
            breakdown[bracketIndex].provision += provision;
            suggestedProvision += provision;
        }
    });
    
    // Process businesses (balance already includes opening from client_business_balances)
    businesses.forEach(business => {
        const balance = business.balance ?? 0;
        if (balance <= 0) return;
        
        totalReceivables += balance;
        
        const businessPayments = payments.filter(p => p.businessId === business.id);
        const lastPaymentDate = businessPayments.length > 0 
            ? Math.max(...businessPayments.map(p => new Date(p.paymentDate).getTime()))
            : new Date(business.createdAt || now).getTime();
        
        const daysSinceLastPayment = Math.floor((now - lastPaymentDate) / (1000 * 60 * 60 * 24));
        
        const bracket = brackets.find(b => 
            daysSinceLastPayment >= b.minDays && 
            (b.maxDays === null || daysSinceLastPayment <= b.maxDays)
        );
        
        if (bracket) {
            const bracketIndex = brackets.indexOf(bracket);
            breakdown[bracketIndex].amount += balance;
            const provision = balance * (bracket.provisionPercentage / 100);
            breakdown[bracketIndex].provision += provision;
            suggestedProvision += provision;
        }
    });
    
    return { totalReceivables, suggestedProvision, breakdown };
};

export const apiCreateAllowanceProvision = async (
    data: {
        provisionDate: string;
        provisionAmount: number;
        provisionPercentage: number;
        totalReceivables: number;
        notes?: string;
        clientId?: string;
        businessId?: string;
    },
    userId: string
): Promise<AllowanceForDoubtfulDebts> => {
    const allowanceId = generateFinanceId('afdd');
    const now = getMyanmarISOString();
    
    // Get previous balance
    const previousBalance = await apiGetLatestAllowanceBalance();
    const adjustmentAmount = data.provisionAmount - previousBalance;
    
    // Create journal entry for allowance adjustment
    // If increasing allowance: Debit Bad Debt Expense, Credit Allowance for Doubtful Debts
    // If decreasing allowance: Debit Allowance for Doubtful Debts, Credit Bad Debt Expense
    let journalEntry;
    if (adjustmentAmount !== 0) {
        const isIncrease = adjustmentAmount > 0;
        journalEntry = postJournalEntry({
            reference: `AFDD-${allowanceId}`,
            entryDate: data.provisionDate,
            period: data.provisionDate.slice(0, 7),
            createdByUserId: userId,
            lines: [
                { 
                    id: generateFinanceId('line'), 
                    accountId: isIncrease ? 'coa_5200' : 'coa_1101', 
                    debit: Math.abs(adjustmentAmount), 
                    credit: 0, 
                    currency: 'MMK', 
                    description: `Allowance for doubtful debts ${isIncrease ? 'increase' : 'decrease'}` 
                },
                { 
                    id: generateFinanceId('line'), 
                    accountId: isIncrease ? 'coa_1101' : 'coa_5200', 
                    debit: 0, 
                    credit: Math.abs(adjustmentAmount), 
                    currency: 'MMK', 
                    description: `Allowance for doubtful debts ${isIncrease ? 'increase' : 'decrease'}` 
                },
            ],
        });
    }

    const allowance: AllowanceForDoubtfulDebts = {
        id: allowanceId,
        period: data.provisionDate.slice(0, 7),
        provisionDate: data.provisionDate,
        totalReceivables: data.totalReceivables,
        provisionPercentage: data.provisionPercentage,
        provisionAmount: data.provisionAmount,
        previousBalance,
        adjustmentAmount,
        currentBalance: data.provisionAmount,
        currency: 'MMK',
        notes: data.notes,
        journalEntryId: journalEntry?.id,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.businessId && { businessId: data.businessId }),
    };

    await db.collection('allowance_doubtful_debts').doc(allowanceId).set(allowance);

    void logActivityHelper('Finance', 'Create Allowance Provision', `Created allowance provision of ${data.provisionAmount} MMK`, allowanceId, { provisionPercentage: data.provisionPercentage });
    
    return allowance;
};

export const apiGetAgingBrackets = async (): Promise<BadDebtAgingBracket[]> => {
    try {
        const doc = await db.collection('settings').doc('badDebtAgingBrackets').get();
        if (doc.exists) {
            return (doc.data() as { brackets: BadDebtAgingBracket[] }).brackets;
        }
    } catch (error) {
        console.error('Error fetching aging brackets:', error);
    }
    return DEFAULT_AGING_BRACKETS;
};

export const apiSaveAgingBrackets = async (brackets: BadDebtAgingBracket[]): Promise<void> => {
    await db.collection('settings').doc('badDebtAgingBrackets').set({ brackets });
};

export const apiGetCashAccounts = async (): Promise<CashAccount[]> => {
    try {
        const accounts = await fetchCollection<CashAccount>('cash_accounts', { field: 'createdAt', direction: 'desc' });
        
        const normalizeBalances = async (items: CashAccount[]) => {
            const normalized = items.map(account => {
                const initialBalance = account.initialBalance || 0;
                const totalInflow = account.totalInflow || 0;
                const totalOutflow = account.totalOutflow || 0;
                const computedBalance = (initialBalance + totalInflow) - totalOutflow;
                return { ...account, balance: computedBalance };
            });

            const updates = items
                .map((account, index) => ({ account, computed: normalized[index] }))
                .filter(({ account, computed }) => {
                    const current = account.balance ?? 0;
                    return Math.abs(current - computed.balance) > 0.0001;
                });

            if (updates.length > 0) {
                await Promise.all(updates.map(({ computed }) => (
                    updateDocument<CashAccount>('cash_accounts', computed.id, {
                        balance: computed.balance,
                        updatedAt: getMyanmarISOString(),
                    }).catch(error => {
                        console.error(`Failed to sync cash account balance for ${computed.id}:`, error);
                    })
                )));
            }

            return normalized;
        };
        
        // Migration: Check if there are any accounts in the in-memory store that aren't in Firestore
        // This handles accounts that were converted before Firestore persistence was implemented
        const firestoreAccountIds = new Set(accounts.map(acc => acc.id));
        const accountsToMigrate = financeStore.cashAccounts.filter(acc => !firestoreAccountIds.has(acc.id));
        
        if (accountsToMigrate.length > 0) {
            // Migrate accounts to Firestore
            const migrationPromises = accountsToMigrate.map(async (account) => {
                try {
                    const dataToSet: any = {};
                    Object.keys(account).forEach(key => {
                        const value = (account as any)[key];
                        if (value !== undefined && key !== 'id') {
                            dataToSet[key] = value;
                        }
                    });
                    // Preserve existing timestamps if available, otherwise use server timestamp
                    if (!dataToSet.createdAt) {
                        dataToSet.createdAt = getMyanmarISOString();
                    }
                    if (!dataToSet.updatedAt) {
                        dataToSet.updatedAt = getMyanmarISOString();
                    }
                    await db.collection('cash_accounts').doc(account.id).set(dataToSet);
                } catch (error) {
                    console.error(`Failed to migrate account ${account.id}:`, error);
                }
            });
            await Promise.all(migrationPromises);
            
            // Reload accounts after migration
            const migratedAccounts = await fetchCollection<CashAccount>('cash_accounts', { field: 'createdAt', direction: 'desc' });
            const normalizedMigrated = await normalizeBalances(migratedAccounts);
            financeStore.cashAccounts = normalizedMigrated;
            return normalizedMigrated;
        }
        
        const normalizedAccounts = await normalizeBalances(accounts);
        // Update in-memory store for backward compatibility
        financeStore.cashAccounts = normalizedAccounts;
        return normalizedAccounts;
    } catch (error) {
        console.error('Error loading cash accounts:', error);
        // Fallback to in-memory store if Firestore fails
    return financeStore.cashAccounts.slice();
    }
};

export const apiAddCashAccount = async (
    account: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt' | 'totalInflow' | 'totalOutflow' | 'logoUrl' | 'qrCodeUrl'>,
    files?: { logoFile?: File | null, qrCodeFile?: File | null },
    existingUrls?: { logoUrl?: string, qrCodeUrl?: string }
): Promise<CashAccount> => {
    // Generate ID first for file uploads
    const newId = await getNextId('cash_acc');
    
    // Set initialBalance from balance if provided, otherwise default to 0
    const initialBalance = account.balance || account.initialBalance || 0;
    
    const accountData: Partial<CashAccount> = {
        ...account,
        initialBalance: initialBalance,
        balance: initialBalance, // Balance = initialBalance when account is created (no transactions yet)
        isActive: account.isActive ?? true,
        showInPublic: account.showInPublic ?? false,
        totalInflow: 0,
        totalOutflow: 0,
    };

    // Use existing URLs if provided (for conversions), otherwise upload new files
    if (files?.logoFile) {
        accountData.logoUrl = await apiUploadFile(files.logoFile, `cash_accounts/${newId}/logo.jpg`);
    } else if (existingUrls?.logoUrl) {
        accountData.logoUrl = existingUrls.logoUrl;
    }
    
    if (files?.qrCodeFile) {
        accountData.qrCodeUrl = await apiUploadFile(files.qrCodeFile, `cash_accounts/${newId}/qrcode.jpg`);
    } else if (existingUrls?.qrCodeUrl) {
        accountData.qrCodeUrl = existingUrls.qrCodeUrl;
    }

    // Save to Firestore with the pre-generated ID
    // Remove undefined values as Firestore doesn't accept them
    const dataToSet: any = {};
    Object.keys(accountData).forEach(key => {
        const value = (accountData as any)[key];
        if (value !== undefined) {
            dataToSet[key] = value;
        }
    });
    dataToSet.createdAt = getMyanmarISOString();
    dataToSet.updatedAt = getMyanmarISOString();
    await db.collection('cash_accounts').doc(newId).set(dataToSet);
    const docSnap = await db.collection('cash_accounts').doc(newId).get();
    const newAccount = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as CashAccount;
    
    // Update in-memory store for backward compatibility
    financeStore.cashAccounts.push(newAccount);
    void logActivityHelper(
        'Cash & Treasury',
        'Create Cash Account',
        `Registered cash account: ${newAccount.name}`,
        newAccount.id,
        {
            accountType: newAccount.accountType,
            balance: newAccount.balance,
            showInPublic: newAccount.showInPublic,
        }
    );
    return newAccount;
};

export const apiUpdateCashAccount = async (
    accountId: string,
    data: Partial<Omit<CashAccount, 'id' | 'createdAt' | 'logoUrl' | 'qrCodeUrl'>>,
    files?: { logoFile?: File | null, qrCodeFile?: File | null }
): Promise<CashAccount> => {
    const account = await fetchDocumentById<CashAccount>('cash_accounts', accountId);
    if (!account) throw new Error('Cash account not found');
    
    const dataToUpdate: Partial<CashAccount> = { ...data };
    
    if (files?.logoFile) {
        dataToUpdate.logoUrl = await apiUploadFile(files.logoFile, `cash_accounts/${accountId}/logo.jpg`);
    }
    if (files?.qrCodeFile) {
        dataToUpdate.qrCodeUrl = await apiUploadFile(files.qrCodeFile, `cash_accounts/${accountId}/qrcode.jpg`);
    }
    
    // If initialBalance is being updated, recalculate balance using formula: (initialBalance + totalInflow) - totalOutflow
    if (dataToUpdate.initialBalance !== undefined) {
        const totalInflow = account.totalInflow || 0;
        const totalOutflow = account.totalOutflow || 0;
        dataToUpdate.balance = (dataToUpdate.initialBalance + totalInflow) - totalOutflow;
    }
    
    // Update in Firestore (updateDocument already filters undefined values)
    await updateDocument<CashAccount>('cash_accounts', accountId, dataToUpdate);
    
    // Update in-memory store for backward compatibility
    const index = financeStore.cashAccounts.findIndex(acc => acc.id === accountId);
    if (index !== -1) {
        Object.assign(financeStore.cashAccounts[index], { ...account, ...dataToUpdate });
    }
    
    // Return updated account
    const updatedAccount = await fetchDocumentById<CashAccount>('cash_accounts', accountId);
    if (updatedAccount) {
        void logActivityHelper(
            'Cash & Treasury',
            'Update Cash Account',
            `Updated cash account: ${updatedAccount.name}`,
            updatedAccount.id,
            {
                accountType: updatedAccount.accountType,
                isActive: updatedAccount.isActive,
                showInPublic: updatedAccount.showInPublic,
            }
        );
    }
    return updatedAccount!;
};

export const apiDeleteCashAccount = async (accountId: string): Promise<void> => {
    // Check if account has transactions
    const transactions = await fetchCollection<CashTransaction>('cash_transactions');
    const hasTransactions = transactions.some(txn => txn.cashAccountId === accountId);
    if (hasTransactions) {
        throw new Error('Cannot delete account with existing transactions');
    }
    
    // Delete from Firestore
    await deleteDocument('cash_accounts', accountId);
    
    // Update in-memory store for backward compatibility
    const index = financeStore.cashAccounts.findIndex(acc => acc.id === accountId);
    if (index !== -1) {
        financeStore.cashAccounts.splice(index, 1);
    }
    
    void logActivityHelper(
        'Cash & Treasury',
        'Delete Cash Account',
        `Deleted cash account: ${accountId}`,
        accountId
    );
};

export const apiGetCashTransactions = async (): Promise<CashTransaction[]> => {
    const transactions = await fetchCollection<CashTransaction>('cash_transactions', { field: 'transactionDate', direction: 'desc' });
    // Update in-memory store for backward compatibility
    financeStore.cashTransactions = transactions;
    return transactions;
};

export const apiRecordCashTransaction = async (transaction: Omit<CashTransaction, 'id'>): Promise<CashTransaction> => {
    const account = await fetchDocumentById<CashAccount>('cash_accounts', transaction.cashAccountId);
    if (!account) throw new Error('Cash account not found');
    
    // Save transaction to Firestore
    const newTxn = await addDocument<CashTransaction>('cash_transactions', transaction, 'cash_txn');
    
    // Update account totals
    const newTotalInflow = transaction.type === 'inflow' 
        ? (account.totalInflow || 0) + transaction.amount 
        : (account.totalInflow || 0);
    const newTotalOutflow = transaction.type === 'outflow' 
        ? (account.totalOutflow || 0) + transaction.amount 
        : (account.totalOutflow || 0);
    
    // Calculate balance using formula: (initialBalance + totalInflow) - totalOutflow
    const initialBalance = account.initialBalance || 0;
    const newBalance = (initialBalance + newTotalInflow) - newTotalOutflow;
    
    await updateDocument<CashAccount>('cash_accounts', transaction.cashAccountId, {
        balance: newBalance,
        totalInflow: newTotalInflow,
        totalOutflow: newTotalOutflow,
        lastActivityDate: transaction.transactionDate,
    });
    
    // Update in-memory store for backward compatibility
    const accountIndex = financeStore.cashAccounts.findIndex(acc => acc.id === transaction.cashAccountId);
    if (accountIndex !== -1) {
        financeStore.cashAccounts[accountIndex].balance = newBalance;
        financeStore.cashAccounts[accountIndex].totalInflow = newTotalInflow;
        financeStore.cashAccounts[accountIndex].totalOutflow = newTotalOutflow;
        financeStore.cashAccounts[accountIndex].lastActivityDate = transaction.transactionDate;
        financeStore.cashAccounts[accountIndex].updatedAt = new Date().toISOString();
    }
    financeStore.cashTransactions.push(newTxn);
    void logActivityHelper(
        'Cash & Treasury',
        transaction.type === 'inflow' ? 'Record Inflow' : 'Record Outflow',
        `${transaction.type === 'inflow' ? 'Received' : 'Paid'} ${transaction.amount.toLocaleString()} MMK`,
        newTxn.id,
        {
            cashAccountId: transaction.cashAccountId,
            transactionDate: transaction.transactionDate,
            reference: transaction.reference,
        }
    );
    
    return newTxn;
};

export const apiTransferBetweenAccounts = async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    serviceFee: number,
    transactionDate: string,
    description?: string,
    reference?: string
): Promise<{ fromTransaction: CashTransaction; toTransaction: CashTransaction; feeTransaction?: CashTransaction }> => {
    if (fromAccountId === toAccountId) {
        throw new Error('Source and destination accounts cannot be the same');
    }
    if (amount <= 0) {
        throw new Error('Transfer amount must be greater than zero');
    }
    if (serviceFee < 0) {
        throw new Error('Service fee cannot be negative');
    }

    const totalDeducted = amount + serviceFee;
    const transferRef = reference || `TRANSFER-${Date.now()}`;

    // Use Firestore transaction to ensure atomicity
    const transferResult = await db.runTransaction(async (transaction) => {
        // Get both accounts
        const fromAccountRef = db.collection('cash_accounts').doc(fromAccountId);
        const toAccountRef = db.collection('cash_accounts').doc(toAccountId);
        
        const fromAccountDoc = await transaction.get(fromAccountRef);
        const toAccountDoc = await transaction.get(toAccountRef);
        
        if (!fromAccountDoc.exists) {
            throw new Error('Source account not found');
        }
        if (!toAccountDoc.exists) {
            throw new Error('Destination account not found');
        }
        
        const fromAccount = fromAccountDoc.data() as CashAccount;
        const toAccount = toAccountDoc.data() as CashAccount;
        
        // Check if source account has sufficient balance (including fee)
        if (fromAccount.balance < totalDeducted) {
            throw new Error(`Insufficient balance. Available: ${fromAccount.balance.toLocaleString()}, Required: ${totalDeducted.toLocaleString()}`);
        }
        
        // Generate transaction IDs
        const fromTxnId = generateFinanceId('cash_txn');
        const toTxnId = generateFinanceId('cash_txn');
        const feeTxnId = serviceFee > 0 ? generateFinanceId('cash_txn') : null;
        
        // Create outflow transaction from source account (transfer amount only)
        const fromTransactionData: Partial<CashTransaction> = {
            cashAccountId: fromAccountId,
            transactionDate,
            type: 'outflow',
            amount: amount, // Transfer amount only (fee is separate)
            description: description || `Transfer to ${toAccount.name}`,
            reference: transferRef,
        };
        
        // Create inflow transaction to destination account
        const toTransactionData: Partial<CashTransaction> = {
            cashAccountId: toAccountId,
            transactionDate,
            type: 'inflow',
            amount: amount,
            description: description || `Transfer from ${fromAccount.name}`,
            reference: transferRef,
        };
        
        // Create separate fee transaction if service fee exists
        let feeTransactionData: Partial<CashTransaction> | null = null;
        if (serviceFee > 0 && feeTxnId) {
            feeTransactionData = {
                cashAccountId: fromAccountId,
                transactionDate,
                type: 'outflow',
                amount: serviceFee,
                description: `Service fee for transfer to ${toAccount.name}`,
                reference: `${transferRef}-FEE`,
            };
        }
        
        // Save transactions
        transaction.set(db.collection('cash_transactions').doc(fromTxnId), {
            ...fromTransactionData,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
        
        transaction.set(db.collection('cash_transactions').doc(toTxnId), {
            ...toTransactionData,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
        
        if (feeTransactionData && feeTxnId) {
            transaction.set(db.collection('cash_transactions').doc(feeTxnId), {
                ...feeTransactionData,
                createdAt: getMyanmarISOString(),
                updatedAt: getMyanmarISOString(),
            });
        }
        
        // Update source account (outflow: amount + fee)
        const fromNewOutflow = (fromAccount.totalOutflow || 0) + totalDeducted;
        const fromInitialBalance = fromAccount.initialBalance || 0;
        const fromNewBalance = (fromInitialBalance + (fromAccount.totalInflow || 0)) - fromNewOutflow;
        transaction.update(fromAccountRef, {
            balance: fromNewBalance,
            totalOutflow: fromNewOutflow,
            lastActivityDate: transactionDate,
            updatedAt: getMyanmarISOString(),
        });
        
        // Update destination account (inflow: amount only)
        const toNewInflow = (toAccount.totalInflow || 0) + amount;
        const toInitialBalance = toAccount.initialBalance || 0;
        const toNewBalance = (toInitialBalance + toNewInflow) - (toAccount.totalOutflow || 0);
        transaction.update(toAccountRef, {
            balance: toNewBalance,
            totalInflow: toNewInflow,
            lastActivityDate: transactionDate,
            updatedAt: getMyanmarISOString(),
        });
        
        // Update in-memory store for backward compatibility
        const fromIndex = financeStore.cashAccounts.findIndex(acc => acc.id === fromAccountId);
        if (fromIndex !== -1) {
            financeStore.cashAccounts[fromIndex].balance = fromNewBalance;
            financeStore.cashAccounts[fromIndex].totalOutflow = fromNewOutflow;
            financeStore.cashAccounts[fromIndex].lastActivityDate = transactionDate;
            financeStore.cashAccounts[fromIndex].updatedAt = new Date().toISOString();
        }
        
        const toIndex = financeStore.cashAccounts.findIndex(acc => acc.id === toAccountId);
        if (toIndex !== -1) {
            financeStore.cashAccounts[toIndex].balance = toNewBalance;
            financeStore.cashAccounts[toIndex].totalInflow = toNewInflow;
            financeStore.cashAccounts[toIndex].lastActivityDate = transactionDate;
            financeStore.cashAccounts[toIndex].updatedAt = new Date().toISOString();
        }
        
        const fromTxn: CashTransaction = { id: fromTxnId, ...fromTransactionData } as CashTransaction;
        const toTxn: CashTransaction = { id: toTxnId, ...toTransactionData } as CashTransaction;
        const feeTxn: CashTransaction | undefined = feeTransactionData && feeTxnId 
            ? { id: feeTxnId, ...feeTransactionData } as CashTransaction 
            : undefined;
        
        financeStore.cashTransactions.push(fromTxn);
        financeStore.cashTransactions.push(toTxn);
        if (feeTxn) {
            financeStore.cashTransactions.push(feeTxn);
        }
        
        return {
            fromTransaction: fromTxn,
            toTransaction: toTxn,
            feeTransaction: feeTxn,
        };
    });
    
    void logActivityHelper(
        'Cash & Treasury',
        'Transfer Between Accounts',
        `Transferred ${amount.toLocaleString()} MMK from ${fromAccountId} to ${toAccountId}`,
        transferResult.fromTransaction.id,
        { fromAccountId, toAccountId, amount, serviceFee, reference: transferRef }
    );
    
    return transferResult;
};

export const apiReconcileCashAccount = async (cashAccountId: string, statementBalance: number): Promise<CashAccount> => {
    const account = await fetchDocumentById<CashAccount>('cash_accounts', cashAccountId);
    if (!account) throw new Error('Cash account not found');
    
    // Reconcile: adjust initialBalance to match statementBalance
    // Formula: statementBalance = (initialBalance + totalInflow) - totalOutflow
    // Therefore: initialBalance = statementBalance - totalInflow + totalOutflow
    const totalInflow = account.totalInflow || 0;
    const totalOutflow = account.totalOutflow || 0;
    const adjustedInitialBalance = statementBalance - totalInflow + totalOutflow;
    
    // Update balance and initialBalance in Firestore
    await updateDocument<CashAccount>('cash_accounts', cashAccountId, {
        balance: statementBalance,
        initialBalance: adjustedInitialBalance,
    });
    
    // Update in-memory store for backward compatibility
    const index = financeStore.cashAccounts.findIndex(acc => acc.id === cashAccountId);
    if (index !== -1) {
        financeStore.cashAccounts[index].balance = statementBalance;
        financeStore.cashAccounts[index].initialBalance = adjustedInitialBalance;
        financeStore.cashAccounts[index].updatedAt = new Date().toISOString();
    }
    
    // Return updated account
    const updatedAccount = await fetchDocumentById<CashAccount>('cash_accounts', cashAccountId);
    return updatedAccount!;
};

export const apiGetFixedAssets = async (): Promise<FixedAsset[]> => {
    return fetchCollection<FixedAsset>('fixed_assets', { field: 'acquisitionDate', direction: 'desc' });
};

export const apiDeleteFixedAssets = async (assetIds: string[]): Promise<void> => {
    const batch = db.batch();
    assetIds.forEach(id => {
        batch.delete(db.collection('fixed_assets').doc(id));
    });
    // Also delete related asset events
    for (const assetId of assetIds) {
        const eventsSnapshot = await db.collection('asset_events').where('assetId', '==', assetId).get();
        eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    await batch.commit();
    void logActivityHelper('Fixed Assets', 'Delete Assets', `Deleted ${assetIds.length} fixed asset(s)`, undefined, { assetIds });
};

export const apiAddFixedAsset = async (asset: Omit<FixedAsset, 'id' | 'status' | 'bookValue' | 'accumulatedDepreciation' | 'depreciationStartDate'>): Promise<FixedAsset> => {
    const newId = await getNextId(FIXED_ASSET_ID_PREFIX);
    const newAsset: FixedAsset = {
        ...asset,
        id: newId,
        status: 'Active',
        accumulatedDepreciation: 0,
        bookValue: asset.cost,
        depreciationStartDate: asset.acquisitionDate,
    };
    await db.collection('fixed_assets').doc(newId).set(newAsset);
    
    // Create asset event for acquisition
    const eventId = await getNextId(ASSET_EVENT_ID_PREFIX);
    await db.collection('asset_events').doc(eventId).set({
        id: eventId,
        assetId: newAsset.id,
        eventType: 'Acquisition',
        eventDate: asset.acquisitionDate,
        amount: asset.cost,
    });
    
    void logActivityHelper('Fixed Assets', 'Capitalize Asset', `Capitalized asset: ${newAsset.assetCode} - ${newAsset.name}`, newId, { cost: asset.cost });
    return newAsset;
};

export const apiRunDepreciation = async (period: string, assetIds?: string[]): Promise<FixedAsset[]> => {
    const allAssets = await apiGetFixedAssets();
    const assetsToProcess = allAssets.filter(asset => {
        if (asset.status !== 'Active') return false;
        if (assetIds && assetIds.length > 0 && !assetIds.includes(asset.id)) return false;
        return true;
    });

    const batch = db.batch();
    for (const asset of assetsToProcess) {
        const monthly = (asset.cost - (asset.salvageValue ?? 0)) / asset.usefulLifeMonths;
        const newAccumulatedDepreciation = asset.accumulatedDepreciation + monthly;
        const newBookValue = Math.max(asset.cost - newAccumulatedDepreciation, 0);
        
        // Update asset
        batch.update(db.collection('fixed_assets').doc(asset.id), {
            accumulatedDepreciation: newAccumulatedDepreciation,
            bookValue: newBookValue,
        });
        
        // Create depreciation event
        const eventId = await getNextId(ASSET_EVENT_ID_PREFIX);
        batch.set(db.collection('asset_events').doc(eventId), {
            id: eventId,
            assetId: asset.id,
            eventType: 'Depreciation',
            eventDate: `${period}-28`,
            amount: monthly,
        });
    }
    await batch.commit();
    
    void logActivityHelper('Fixed Assets', 'Run Depreciation', `Posted depreciation for ${assetsToProcess.length} asset(s) for period ${period}`, undefined, { period, assetCount: assetsToProcess.length });
    return apiGetFixedAssets();
};

export const apiDisposeFixedAsset = async (assetId: string, disposalDate: string, proceeds: number): Promise<FixedAsset> => {
    const asset = await fetchDocumentById<FixedAsset>('fixed_assets', assetId);
    if (!asset) throw new Error('Asset not found');
    
    // Update asset status and book value
    await db.collection('fixed_assets').doc(assetId).update({
        status: 'Disposed',
        bookValue: 0,
    });
    
    // Create disposal event
    const eventId = await getNextId(ASSET_EVENT_ID_PREFIX);
    await db.collection('asset_events').doc(eventId).set({
        id: eventId,
        assetId: assetId,
        eventType: 'Disposal',
        eventDate: disposalDate,
        amount: proceeds,
    });
    
    void logActivityHelper('Fixed Assets', 'Dispose Asset', `Disposed asset: ${asset.assetCode} with proceeds ${proceeds} MMK`, assetId, { proceeds, bookValue: asset.bookValue });
    
    return { ...asset, status: 'Disposed', bookValue: 0 };
};

export const apiGetLoanAgreements = async (): Promise<LoanAgreement[]> => {
    return fetchCollection<LoanAgreement>('finance_loans', { field: 'createdAt', direction: 'desc' });
};

export const apiSaveLoanAgreement = async (loan: Partial<LoanAgreement> & { lender: string; principal: number; currency: string; interestRate: number; startDate: string; maturityDate: string; paymentFrequency: string }): Promise<LoanAgreement> => {
    if (loan.id) {
        const dataToUpdate: Partial<LoanAgreement> = {
            lender: loan.lender,
            principal: loan.principal,
            currency: loan.currency,
            interestRate: loan.interestRate,
            startDate: loan.startDate,
            maturityDate: loan.maturityDate,
            paymentFrequency: loan.paymentFrequency,
        };
        if (loan.outstandingPrincipal !== undefined) {
            dataToUpdate.outstandingPrincipal = loan.outstandingPrincipal;
        }
        await updateDocument<LoanAgreement>('finance_loans', loan.id, dataToUpdate);
        const updatedLoan = await fetchDocumentById<LoanAgreement>('finance_loans', loan.id);
        return updatedLoan!;
    }

    const newLoan: Partial<LoanAgreement> = {
        lender: loan.lender,
        principal: loan.principal,
        currency: loan.currency,
        interestRate: loan.interestRate,
        startDate: loan.startDate,
        maturityDate: loan.maturityDate,
        outstandingPrincipal: loan.principal,
        paymentFrequency: loan.paymentFrequency,
    };
    return addDocument<LoanAgreement>('finance_loans', newLoan as LoanAgreement, 'loan');
};

export const apiDeleteLoanAgreement = async (loanId: string): Promise<void> => {
    // Get loan data before deletion for logging
    const loan = await fetchDocumentById<LoanAgreement>('finance_loans', loanId);
    const loanName = loan ? `${loan.lender} - ${loan.principal} ${loan.currency}` : loanId;
    
    await deleteDocument('finance_loans', loanId);
    const paymentsSnapshot = await db.collection('finance_loan_payments').where('loanId', '==', loanId).get();
    const batch = db.batch();
    paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    void logActivityHelper('Finance', 'Delete Loan Agreement', `Deleted loan agreement: ${loanName}`, loanId);
};

export const apiGetLoanPayments = async (loanId?: string): Promise<LoanPayment[]> => {
    let query: firebase.firestore.Query = db.collection('finance_loan_payments').orderBy('paymentDate', 'desc');
    if (loanId) {
        query = query.where('loanId', '==', loanId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as LoanPayment);
};

export const apiRecordLoanPayment = async (payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment> => {
    const paymentRef = db.collection('finance_loan_payments').doc();
    let loanCurrency = 'MMK';
    await db.runTransaction(async transaction => {
        const loanRef = db.collection('finance_loans').doc(payment.loanId);
        const loanSnap = await transaction.get(loanRef);
        if (!loanSnap.exists) throw new Error('Loan not found');
        const loanData = loanSnap.data() as LoanAgreement;
        loanCurrency = loanData.currency || 'MMK';
        const currentOutstanding = loanData.outstandingPrincipal ?? loanData.principal;
        const newOutstanding = Math.max(currentOutstanding - payment.principalPaid, 0);
        transaction.update(loanRef, {
            outstandingPrincipal: newOutstanding,
            updatedAt: getMyanmarISOString(),
        });
        transaction.set(paymentRef, {
            ...payment,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
    });
    const paymentSnap = await paymentRef.get();
    const newPayment = convertTimestamps({ id: paymentRef.id, ...paymentSnap.data() }) as LoanPayment;
    postJournalEntry({
        reference: `LOAN-${payment.loanId}-${payment.paymentDate}`,
        entryDate: payment.paymentDate,
        period: payment.paymentDate.slice(0, 7),
        createdByUserId: 'system',
        lines: [
            { id: generateFinanceId('line'), accountId: 'coa_2100', debit: payment.principalPaid, credit: 0, currency: loanCurrency },
            { id: generateFinanceId('line'), accountId: 'coa_5000', debit: payment.interestPaid, credit: 0, currency: loanCurrency },
            { id: generateFinanceId('line'), accountId: 'coa_1000', debit: 0, credit: payment.principalPaid + payment.interestPaid, currency: loanCurrency },
        ],
    });
    return newPayment;
};

export const apiGetEquityEvents = async (): Promise<EquityEvent[]> => {
    return fetchCollection<EquityEvent>('finance_equity_events', { field: 'eventDate', direction: 'desc' });
};

export const apiRecordEquityEvent = async (event: Omit<EquityEvent, 'id'>): Promise<EquityEvent> => {
    const saved = await addDocument<EquityEvent>('finance_equity_events', event as EquityEvent, 'equity');
    // Determine accounts based on event type
    let debitAccount = 'coa_1000';
    let creditAccount = 'coa_3000';
    if (event.type === 'Dividend') {
        debitAccount = 'coa_3100';
        creditAccount = 'coa_3100';
    } else if (event.type === 'RetainedEarnings') {
        debitAccount = 'coa_1000';
        creditAccount = 'coa_3100';
    }
    postJournalEntry({
        reference: `EQ-${event.type}-${event.eventDate}`,
        entryDate: event.eventDate,
        period: event.eventDate.slice(0, 7),
        createdByUserId: 'system',
        lines: [
            { id: generateFinanceId('line'), accountId: debitAccount, debit: event.amount, credit: 0, currency: event.currency },
            { id: generateFinanceId('line'), accountId: creditAccount, debit: 0, credit: event.amount, currency: event.currency },
        ],
    });
    return saved;
};

const formatMonthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthBounds = (monthKey: string) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
};

const getPrimaryPeriodBounds = (period?: string) => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (period && /^\d{4}-\d{2}$/.test(period)) {
        const [inputYear, inputMonth] = period.split('-').map(Number);
        year = inputYear;
        month = inputMonth - 1;
    }
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end, periodLabel: `${year}-${String(month + 1).padStart(2, '0')}` };
};

const buildMonthSequence = (start: Date, end: Date): string[] => {
    const keys: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
        keys.push(formatMonthKey(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys;
};

const sumByDateRange = <T>(
    records: T[],
    getDate: (record: T) => string | undefined,
    getAmount: (record: T) => number,
    start: Date,
    end: Date
): number => {
    return records.reduce((sum, record) => {
        const dateValue = getDate(record);
        if (!dateValue) return sum;
        const recordDate = new Date(dateValue);
        if (recordDate >= start && recordDate <= end) {
            return sum + getAmount(record);
        }
        return sum;
    }, 0);
};

const accumulateByMonth = <T>(
    months: string[],
    records: T[],
    getDate: (record: T) => string | undefined,
    getAmount: (record: T) => number
): Map<string, number> => {
    const map = new Map<string, number>(months.map(month => [month, 0]));
    records.forEach(record => {
        const dateValue = getDate(record);
        if (!dateValue) return;
        const key = formatMonthKey(new Date(dateValue));
        if (map.has(key)) {
            map.set(key, (map.get(key) || 0) + getAmount(record));
        }
    });
    return map;
};

const calculatePayrollByMonth = async (months: string[]): Promise<Map<string, number>> => {
    const payrollEntries = await Promise.all(
        months.map(async monthKey => {
            const total = await apiGetPayrollTotalsForPeriod(monthKey);
            return { monthKey, total: total.totalNetPayable };
        })
    );
    return new Map(payrollEntries.map(entry => [entry.monthKey, entry.total]));
};

export const apiGetFinancialReports = async (period?: string): Promise<FinancialReport> => {
    const { start, end, periodLabel } = getPrimaryPeriodBounds(period);
    const trendStart = new Date(start);
    trendStart.setMonth(trendStart.getMonth() - 5);
    const monthKeys = buildMonthSequence(trendStart, end);
    const rangeStartISO = trendStart.toISOString();
    const rangeEndISO = end.toISOString();

    const [
        clientPayments,
        expenses,
        visaReloads,
        cashAccounts,
        invoices,
        apInvoices,
        loanAgreements,
        loanPayments,
        equityEvents,
        fixedAssets,
        refunds,
    ] = await Promise.all([
        apiGetPaymentsForPeriod(rangeStartISO, rangeEndISO),
        apiGetExpensesForPeriod(rangeStartISO, rangeEndISO),
        apiGetVisaReloadsForPeriod(rangeStartISO, rangeEndISO),
        apiGetCashAccounts(),
        apiGetInvoices(),
        apiGetAPInvoices(),
        apiGetLoanAgreements(),
        apiGetLoanPayments(),
        apiGetEquityEvents(),
        apiGetFixedAssets(),
        apiGetRefundsForPeriod(rangeStartISO, rangeEndISO),
    ]);

    const payrollByMonth = await calculatePayrollByMonth(monthKeys);

    // Only count APPROVED payments for revenue (PENDING payments don't affect balances)
    const approvedClientPayments = clientPayments.filter(p => p.status === PaymentStatus.APPROVED);
    const revenueClient = sumByDateRange(approvedClientPayments, payment => payment.paymentDate, payment => payment.amountMMK || 0, start, end);
    const expensesGeneral = sumByDateRange(expenses, expense => expense.expenseDate, expense => expense.amountMMK || 0, start, end);
    const expensesVisa = sumByDateRange(visaReloads, reload => reload.reloadDate, reload => reload.amountMMK || 0, start, end);
    const payrollCurrent = payrollByMonth.get(periodLabel) || 0;

    const totalRevenue = revenueClient;
    const totalExpenses = expensesGeneral + expensesVisa + payrollCurrent;

    const cashBalance = cashAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const accountsReceivable = invoices.reduce((sum, invoice) => {
        if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(invoice.status)) {
            return sum;
        }
        const outstanding = Math.max((invoice.grandTotal || 0) - (invoice.amountPaid || 0), 0);
        return sum + outstanding;
    }, 0);
    const apInvoicesTotal = apInvoices.reduce((sum, ap) => {
        if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(ap.status)) {
            return sum;
        }
        return sum + (ap.amount || 0);
    }, 0);
    
    // Add pending refunds to Accounts Payable (company owes money back)
    const refundsPending = refunds
        .filter(r => r.status === RefundStatus.PENDING)
        .reduce((sum, r) => sum + r.amountMMK, 0);
    
    const accountsPayable = apInvoicesTotal + refundsPending;
    const outstandingLoans = loanAgreements.reduce((sum, loan) => sum + (loan.outstandingPrincipal || 0), 0);
    const fixedAssetValue = fixedAssets
        .filter(asset => asset.status !== 'Disposed')
        .reduce((sum, asset) => sum + (asset.bookValue || 0), 0);

    const totalAssets = cashBalance + accountsReceivable + fixedAssetValue;
    const totalLiabilities = accountsPayable + outstandingLoans;
    const totalEquity = totalAssets - totalLiabilities;

    const incomeBreakdown = [
        { name: 'Client Services', value: revenueClient },
    ].filter(item => item.value > 0);

    const expenseCategoryMap = new Map<string, number>();
    expenses.forEach(expense => {
        if (!expense.expenseDate) return;
        const date = new Date(expense.expenseDate);
        if (date < start || date > end) return;
        const current = expenseCategoryMap.get(expense.category) || 0;
        expenseCategoryMap.set(expense.category, current + (expense.amountMMK || 0));
    });
    if (expensesVisa > 0) {
        expenseCategoryMap.set('Visa Reloads', (expenseCategoryMap.get('Visa Reloads') || 0) + expensesVisa);
    }
    if (payrollCurrent > 0) {
        expenseCategoryMap.set('Payroll', (expenseCategoryMap.get('Payroll') || 0) + payrollCurrent);
    }
    const expenseBreakdown = Array.from(expenseCategoryMap.entries()).map(([name, value]) => ({ name, value }));

    const balanceBreakdown = [
        { name: 'Cash & Equivalents', value: cashBalance },
        { name: 'Accounts Receivable', value: accountsReceivable },
        { name: 'Fixed Assets', value: fixedAssetValue },
    ];

    const assetPurchases = sumByDateRange(
        fixedAssets,
        asset => asset.acquisitionDate,
        asset => asset.cost || 0,
        start,
        end
    );

    const loanDisbursements = sumByDateRange(
        loanAgreements,
        loan => loan.startDate,
        loan => loan.principal || 0,
        start,
        end
    );
    const loanRepayments = sumByDateRange(
        loanPayments,
        payment => payment.paymentDate,
        payment => payment.principalPaid || 0,
        start,
        end
    );
    const equityNet = equityEvents.reduce((sum, event) => {
        if (!event.eventDate) return sum;
        const date = new Date(event.eventDate);
        if (date < start || date > end) return sum;
        const sign =
            event.type === 'Dividend'
                ? -1
                : 1;
        return sum + sign * (event.amount || 0);
        }, 0);

    const cashFlow = {
        Operations: totalRevenue - totalExpenses,
        Investing: -assetPurchases,
        Financing: equityNet + loanDisbursements - loanRepayments,
    };

    const revenueByMonth = accumulateByMonth(monthKeys, clientPayments, payment => payment.paymentDate, payment => payment.amountMMK || 0);
    const expenseByMonth = accumulateByMonth(monthKeys, expenses, expense => expense.expenseDate, expense => expense.amountMMK || 0);
    const visaByMonth = accumulateByMonth(monthKeys, visaReloads, reload => reload.reloadDate, reload => reload.amountMMK || 0);

    const monthlyTrend = monthKeys.map(monthKey => {
        const revenue = revenueByMonth.get(monthKey) || 0;
        const expensesTotal = (expenseByMonth.get(monthKey) || 0) + (visaByMonth.get(monthKey) || 0) + (payrollByMonth.get(monthKey) || 0);
    return {
            period: monthKey,
            revenue,
            expenses: expensesTotal,
            profit: revenue - expensesTotal,
        };
    });

    const currentMonthTrend = monthlyTrend.find(entry => entry.period === periodLabel) || {
        period: periodLabel,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
    };
    const previousMonths = monthlyTrend.filter(entry => entry.period !== periodLabel);
    const trailing = previousMonths.slice(-3);
    const average = (list: typeof trailing, field: 'revenue' | 'expenses' | 'profit') =>
        list.length ? list.reduce((sum, entry) => sum + entry[field], 0) / list.length : 0;

    const budgetVsActual = [
        { accountName: 'Revenue', budget: average(trailing, 'revenue'), actual: currentMonthTrend.revenue },
        { accountName: 'Operating Expenses', budget: average(trailing, 'expenses'), actual: currentMonthTrend.expenses },
        { accountName: 'Net Profit', budget: average(trailing, 'profit'), actual: currentMonthTrend.profit },
    ];

    const trialBalance = [
        { name: '1000 Cash & Equivalents', debit: cashBalance, credit: 0 },
        { name: '1100 Accounts Receivable', debit: accountsReceivable, credit: 0 },
        { name: '1500 Fixed Assets', debit: fixedAssetValue, credit: 0 },
        { name: '2000 Accounts Payable', debit: 0, credit: accountsPayable },
        { name: '2100 Loans Payable', debit: 0, credit: outstandingLoans },
        { name: '3000 Owner Equity', debit: 0, credit: Math.max(totalEquity, 0) },
        { name: '4000 Revenue', debit: 0, credit: totalRevenue },
        { name: '5000 Operating Expenses', debit: totalExpenses, credit: 0 },
    ];

    const normalizedIncomeBreakdown = incomeBreakdown.length > 0 ? incomeBreakdown : [{ name: 'Revenue', value: totalRevenue }];
    const normalizedExpenseBreakdown = expenseBreakdown.length > 0 ? expenseBreakdown : [{ name: 'Operating Expenses', value: totalExpenses }];

    return {
        period: periodLabel,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        incomeStatement: {
            Revenue: totalRevenue,
            Expenses: totalExpenses,
        },
        balanceSheet: {
            Assets: totalAssets,
            Liabilities: totalLiabilities,
            Equity: totalEquity,
        },
        balanceBreakdown,
        cashFlow,
        trialBalance,
        budgetVsActual,
        monthlyTrend,
        incomeBreakdown: normalizedIncomeBreakdown,
        expenseBreakdown: normalizedExpenseBreakdown,
    };
};

/**
 * (Placeholder) Simulates triggering a backend sync with the Facebook Graph API.
 * In a real scenario, this would call a cloud function.
 */
export const apiSyncWithFacebook = async (): Promise<{ syncedCount: number }> => {
    console.warn("apiSyncWithFacebook is a placeholder and does not connect to Facebook.");
    // Simulate a network delay and a random result.
    await new Promise(resolve => setTimeout(resolve, 2000));
    const syncedCount = Math.floor(Math.random() * 10);
    // Here, a real implementation would have updated Firestore with fresh data.
    return { syncedCount };
};

// Invoices & Quotations
export const apiGetInvoices = (limit?: number): Promise<Invoice[]> => fetchCollection<Invoice>('invoices', undefined, limit);

export const apiGetInvoicesForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<Invoice[]> => {
    const snapshot = await db.collection('invoices')
        .where('issueDate', '>=', startDate)
        .where('issueDate', '<=', endDate)
        .orderBy('issueDate', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Invoice);
};

export const apiGetInvoiceById = async (id: string): Promise<Invoice | null> => {
    const invoice = await fetchDocumentById<Invoice>('invoices', id);
    if (!invoice) return null;
    await updateInvoiceFromLinkedSales(id);
    return fetchDocumentById<Invoice>('invoices', id);
};

export const apiRepairInvoicesFromPayments = async (): Promise<{ processed: number }> => {
    const batchSize = 200;
    let processed = 0;
    let lastDoc: firebase.firestore.QueryDocumentSnapshot | null = null;

    while (true) {
        let query: firebase.firestore.Query = db.collection('invoices')
            .orderBy(firebase.firestore.FieldPath.documentId())
            .limit(batchSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snapshot = await query.get();
        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
            await updateInvoiceFromLinkedSales(doc.id);
            processed += 1;
        }
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    return { processed };
};
export const apiGetQuotations = (): Promise<Quotation[]> => fetchCollection('quotations');
export const apiGetQuotationsForClient = (clientId: string): Promise<Quotation[]> =>
    fetchCollectionByField<Quotation>('quotations', 'clientId', clientId);
export const apiGetQuotationsForBusiness = (businessId: string): Promise<Quotation[]> =>
    fetchCollectionByField<Quotation>('quotations', 'businessId', businessId);
export const apiGetRecentQuotations = (limit = 40): Promise<Quotation[]> =>
    fetchCollection<Quotation>('quotations', { field: 'createdAt', direction: 'desc' }, limit);

export const apiGetQuotationsForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<Quotation[]> => {
    const snapshot = await db.collection('quotations')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Quotation);
};

export const apiGetQuotationById = (id: string): Promise<Quotation | null> => fetchDocumentById<Quotation>('quotations', id);
export const apiAddQuotation = async (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quotation> => {
    if (data.clientId && data.businessId) {
        await requireLinkedPair(data.clientId, data.businessId, 'apiAddQuotation');
    }
    const result = await addDocument('quotations', data as Partial<Quotation>, QUOTATION_ID_PREFIX);
    void logActivityHelper('Quotations', 'Create', `Created quotation: ${result.id}`, result.id, { grandTotal: result.grandTotal });
    return result;
};
export const apiUpdateQuotation = async (data: Partial<Quotation> & {id: string}): Promise<void> => {
    const oldDoc = await db.collection('quotations').doc(data.id).get();
    if (oldDoc.exists) {
        const oldData = oldDoc.data() as Quotation;
        const newClientId = (data.clientId ?? oldData.clientId)?.toString().trim() || '';
        const newBusinessId = (data.businessId ?? oldData.businessId)?.toString().trim() || null;
        if (newClientId && newBusinessId) {
            await requireLinkedPair(newClientId, newBusinessId, 'apiUpdateQuotation');
        }
    }
    await updateDocument('quotations', data.id, data);
    void logActivityHelper('Quotations', 'Update', `Updated quotation: ${data.id}`, data.id);
};
export const apiDeleteQuotation = async (quotationId: string): Promise<void> => {
    const quotationRef = db.collection('quotations').doc(quotationId);
    const quotationDoc = await quotationRef.get();
    if (!quotationDoc.exists) {
        throw new Error("Quotation not found for deletion.");
    }
    const quotationData = quotationDoc.data() as Quotation;

    const hasLinkedRecord = !!quotationData.invoiceId || !!quotationData.saleRecordId;
    if ((quotationData.status === QuotationStatus.CONVERTED_TO_INVOICE || quotationData.status === QuotationStatus.CONVERTED_TO_SALE) && hasLinkedRecord) {
        throw new Error("Cannot delete a quotation that has already been converted and linked. Please manage the linked invoice or sale record.");
    }

    await quotationRef.delete();
    void logActivityHelper('Quotations', 'Delete', `Deleted quotation: ${quotationId}`, quotationId);
};

export const apiAddDirectInvoice = async (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    if (data.clientId && data.businessId) {
        await requireLinkedPair(data.clientId, data.businessId, 'apiAddDirectInvoice');
    }
    // If this invoice is linked to a sale record, check if that sale is already used
    if (data.saleRecordId) {
        const existingInvoice = await db.collection('invoices').where('saleRecordId', '==', data.saleRecordId).limit(1).get();
        if (!existingInvoice.empty) {
            throw new Error(`This sale record (${data.saleRecordId}) has already been used to create an invoice. Each sale record can only be used once.`);
        }
    }
    
    const newId = await getNextId(INVOICE_ID_PREFIX);
    const invoiceRef = db.collection('invoices').doc(newId);

    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        // All invoices must be linked to sales. Balance is updated when the sale is created.
        // No balance update here - invoices with saleRecordId don't update balance (sale already did).
        
        // STEP 2: Now perform all writes
        const dataToSave = {
            ...data,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        };
        transaction.set(invoiceRef, dataToSave as any);
    });

    const docSnap = await invoiceRef.get();
    const result = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Invoice;
    void logActivityHelper('Invoices', 'Create', `Created invoice: ${result.id}`, result.id, { amount: result.grandTotal });
    return result;
};

export const apiUpdateInvoice = async (data: Partial<Invoice> & {id: string}): Promise<void> => {
    const oldInvoiceDoc = await db.collection('invoices').doc(data.id).get();
    if (!oldInvoiceDoc.exists) throw new Error("Invoice not found for update.");
    const oldData = oldInvoiceDoc.data() as Invoice;
    const newClientId = (data.clientId ?? oldData.clientId)?.toString().trim() || '';
    const newBusinessId = (data.businessId ?? oldData.businessId)?.toString().trim() || null;
    if (newClientId && newBusinessId) {
        await requireLinkedPair(newClientId, newBusinessId, 'apiUpdateInvoice');
    }
    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const invoiceRef = db.collection('invoices').doc(data.id);
        const oldInvoiceDoc = await transaction.get(invoiceRef);
        if (!oldInvoiceDoc.exists) {
            throw new Error("Invoice not found for update.");
        }
        const oldData = oldInvoiceDoc.data() as Invoice;

        let balanceChange = 0;
        const newGrandTotal = data.grandTotal ?? oldData.grandTotal;
        const oldGrandTotal = oldData.grandTotal;
        
        // Read sale document if invoice is linked to a sale
        let saleDoc: firebase.firestore.DocumentSnapshot | null = null;
        let saleData: SaleRecord | null = null;
        const saleRef = oldData.saleRecordId ? db.collection('sales').doc(oldData.saleRecordId) : null;
        if (saleRef) {
            saleDoc = await transaction.get(saleRef);
            if (saleDoc.exists) {
                saleData = saleDoc.data() as SaleRecord;
            }
        }
        
        // Read balance documents if needed
        let balanceDoc: firebase.firestore.DocumentSnapshot | null = null;
        const balanceRef = oldData.businessId 
            ? db.collection('client_business_balances').doc(`${oldData.clientId}_${oldData.businessId}`)
            : null;
        if (balanceRef && oldData.saleRecordId) {
            balanceDoc = await transaction.get(balanceRef);
        }
        
        // Calculate balance changes
        if (oldData.saleRecordId && saleData) {
            const oldSaleAmount = saleData.grandTotalMMK || 0;
            const newSaleAmount = newGrandTotal;
            const amountDifference = newSaleAmount - oldSaleAmount;
            
            // Only update if amount changed and sale is APPROVED (not DRAFT)
            if (amountDifference !== 0 && saleData.status !== SaleStatus.DRAFT && oldData.businessId) {
                balanceChange = amountDifference;
            }
        }
        
        // STEP 2: Now perform all writes
        // Update invoice
        transaction.update(invoiceRef, { ...data, updatedAt: getMyanmarISOString() } as any);
        
        // If invoice has saleRecordId, update the linked sale(s) and balance via sales
        if (oldData.saleRecordId && saleRef && saleData) {
            const oldSaleAmount = saleData.grandTotalMMK || 0;
            const newSaleAmount = newGrandTotal;
            const amountDifference = newSaleAmount - oldSaleAmount;
            
            // Only update if amount changed and sale is APPROVED (not DRAFT)
            if (amountDifference !== 0 && saleData.status !== SaleStatus.DRAFT && oldData.businessId && balanceRef) {
                // Update sale record amount
                transaction.update(saleRef, { 
                    grandTotalMMK: newSaleAmount,
                    // Also update subtotal proportionally if items changed
                    subtotalMMK: (saleData.subtotalMMK || 0) + amountDifference,
                    updatedAt: getMyanmarISOString()
                });
                
                // Update client-business balance (via sale change)
                if (balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(amountDifference),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    const clientRefForCheck = db.collection('clients').doc(oldData.clientId);
                    const businessRefForCheck = db.collection('businesses').doc(oldData.businessId);
                    const [clientSnap, businessSnap] = await Promise.all([
                        transaction.get(clientRefForCheck),
                        transaction.get(businessRefForCheck),
                    ]);
                    const clientData = clientSnap.exists ? (clientSnap.data() as Client) : null;
                    const businessData = businessSnap.exists ? (businessSnap.data() as Business) : null;
                    const linked = (clientData?.linkedBusinessIds ?? []).includes(oldData.businessId) &&
                        (businessData?.linkedClientIds ?? []).includes(oldData.clientId);
                    if (!linked) {
                        throw new Error(`Client ${oldData.clientId} and business ${oldData.businessId} are not linked. Cannot create balance. Link them in client and business documents first.`);
                    }
                    transaction.set(balanceRef, {
                        clientId: oldData.clientId,
                        businessId: oldData.businessId,
                        balance: amountDifference,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }
                
                // Update client and business total balances
                const clientRef = db.collection('clients').doc(oldData.clientId);
                const businessRef = db.collection('businesses').doc(oldData.businessId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountDifference) });
                transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(amountDifference) });
            }
        }
    });
    void logActivityHelper('Invoices', 'Update', `Updated invoice: ${data.id}`, data.id);
};
export const apiGetInvoicesForClient = (clientId: string): Promise<Invoice[]> => fetchCollectionByField<Invoice>('invoices', 'clientId', clientId);
export const apiGetInvoicesForBusiness = (businessId: string): Promise<Invoice[]> => fetchCollectionByField<Invoice>('invoices', 'businessId', businessId);

export const apiLinkSalesToInvoice = async (saleIds: string[], invoiceId: string): Promise<void> => {
    if (!saleIds.length) return;
    const batch = db.batch();
    saleIds.forEach(saleId => {
        const saleRef = db.collection('sales').doc(saleId);
        batch.update(saleRef, { invoiceId });
    });
    await batch.commit();
};

/**
 * Creates an invoice from an existing sale record.
 * 
 * IMPORTANT: This function does NOT update Client/Business balance because:
 * - The sale record already updated the balance when it was created
 * - The invoice will have saleRecordId set, which tells apiAddDirectInvoice to skip balance update
 * - This prevents double-counting the same transaction in the balance
 * 
 * Flow:
 * 1. Sale created → Balance updated ✅
 * 2. Invoice created from sale (with saleRecordId) → Balance NOT updated ✅
 * 
 * This ensures balance is only updated once per transaction.
 */
export const apiCreateInvoiceFromSale = async(saleId: string): Promise<Invoice> => {
    const sale = await fetchDocumentById<SaleRecord>('sales', saleId);
    if (!sale) throw new Error("Sale record not found");
    
    // Validate required fields for invoice creation
    if (!sale.businessId) {
        throw new Error("Cannot create invoice from sale: Sale record must have a businessId. Please update the sale record first.");
    }
    
    // Check if this sale record already has an invoice
    const existingInvoice = await db.collection('invoices').where('saleRecordId', '==', saleId).limit(1).get();
    if (!existingInvoice.empty) {
        throw new Error(`This sale record (${saleId}) has already been used to create an invoice. Each sale record can only be used once.`);
    }
    
    // Fetch service to get the actual service name
    const service = sale.serviceId ? await fetchDocumentById<Service>('services', sale.serviceId).catch(() => null) : null;
    const serviceName = service?.name || sale.type || 'Unknown Service';
    
    let invoiceItems: InvoiceItem[] = [];
    
    if (sale.type === 'Facebook Ads') {
        const fbSale = sale as FacebookAdsSaleRecord;
        const budgetUSD = Number(fbSale.budgetUSD ?? fbSale.actualSpendUSD ?? 0) || 0;
        invoiceItems = [{
            id: `fb_${sale.id}`,
            serviceId: sale.serviceId,
            description: `${serviceName} - ${fbSale.campaignName || 'N/A'} (${fbSale.campaignObjective || 'N/A'})`,
            quantity: budgetUSD,
            unitPrice: fbSale.serviceRateMMK || 0,
            total: fbSale.grandTotalMMK || 0
        }];
    } else if (sale.type === 'Other Services') {
        const otherSale = sale as OtherServicesSaleRecord;
        if (isBoostingService(service)) {
            const line = buildBoostingLineFromSale(otherSale, service, serviceName);
            invoiceItems = [{
                id: `other_${sale.id}`,
                serviceId: sale.serviceId,
                description: line.description,
                quantity: line.quantityUsd,
                unitPrice: line.unitPriceMMK,
                total: line.totalMMK,
            }];
        } else {
            invoiceItems = [{
                id: `other_${sale.id}`,
                serviceId: sale.serviceId,
                description: serviceName,
                quantity: otherSale.quantity || 0,
                unitPrice: otherSale.unitPriceMMK || 0,
                total: otherSale.grandTotalMMK || 0
            }];
        }
    } else {
        // Fallback for unknown sale types
        invoiceItems = [{
            id: `sale_item_${sale.id}`,
            description: serviceName,
            quantity: 1,
            unitPrice: sale.grandTotalMMK,
            total: sale.grandTotalMMK
        }];
    }

    const newInvoiceData: Omit<Invoice, 'id'|'createdAt'|'updatedAt'> = {
        clientId: sale.clientId, 
        businessId: sale.businessId, // Now guaranteed to exist due to validation above
        issueDate: new Date().toISOString(), 
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: invoiceItems, 
        subtotal: sale.subtotalMMK, 
        discount: (sale.manualDiscountMMK || 0) + (sale.packageDiscountMMK || 0),
        tax: sale.taxAmountMMK || 0, 
        grandTotal: sale.grandTotalMMK, 
        amountPaid: 0,
        status: InvoiceStatus.DRAFT, 
        saleRecordId: sale.id // This ensures apiAddDirectInvoice will NOT update balance (sale already did)
    };
    // apiAddDirectInvoice will check for saleRecordId and skip balance update
    const invoice = await apiAddDirectInvoice(newInvoiceData);
    // Link the sale back to the invoice for traceability
    await db.collection('sales').doc(sale.id).update({ invoiceId: invoice.id });
    void logActivityHelper('Invoices', 'Create from Sale', `Created invoice from sale: ${saleId}`, invoice.id, { saleId, invoiceNumber: invoice.invoiceNumber });
    return invoice;
};
export const apiCreateInvoiceFromQuotation = async(quotationId: string): Promise<Invoice> => {
    const quotationData = await fetchDocumentById<Quotation>('quotations', quotationId);
    if (!quotationData) throw new Error("Quotation not found");
    
    if (!quotationData.businessId) {
        throw new Error("Cannot create invoice from quotation: Quotation must have a businessId.");
    }

    // Step 1: Create sales records per quotation item (auto-approved, update balance immediately)
    // This mirrors CreateEditInvoiceModal logic for manual invoice creation
    const createdSaleIds: string[] = [];
    const quotationItems = quotationData.items || [];
    
    if (quotationItems.length === 0) {
        throw new Error("Cannot create invoice from quotation: Quotation has no items.");
    }
    
    // Calculate per-item tax, discount, and other fees distribution
    const itemSubtotal = quotationItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const discountAmount = (quotationData.manualDiscountMMK || 0) + (quotationData.promotionDiscountMMK || 0);
    const taxAmount = quotationData.taxAmountMMK || 0;
    const otherFeesAmount = quotationData.otherFeesAmountMMK || 0;
    const services = await apiGetServices();
    const activeServices = services.filter(s => s.isActive);
    const defaultServiceId = activeServices[0]?.id || services[0]?.id;
    
    // Create one sale record per quotation item
    for (let i = 0; i < quotationItems.length; i++) {
        const item = quotationItems[i];
        const itemTotal = Number(item.total) || 0;
        
        // Distribute discount, tax, and other fees proportionally
        const itemProportion = itemSubtotal > 0 ? itemTotal / itemSubtotal : 1 / quotationItems.length;
        const itemDiscount = discountAmount * itemProportion;
        const itemTax = taxAmount * itemProportion;
        const itemOtherFees = otherFeesAmount * itemProportion;
        const itemGrandTotal = itemTotal - itemDiscount + itemTax + itemOtherFees;
        
        const matchedService = item.serviceId
            ? services.find(s => s.id === item.serviceId)
            : services.find(s => {
                const desc = (item.description || '').toLowerCase();
                return desc.includes((s.name || '').toLowerCase());
            });
        // Determine service ID - use item serviceId, otherwise match by description, then fall back to first active service
        const serviceId = matchedService?.id || defaultServiceId;
        if (!serviceId) {
            throw new Error(`Cannot create invoice from quotation: Missing service for item "${item.description || `Item ${i + 1}`}".`);
        }
        
        const salePayload: any = {
            clientId: quotationData.clientId,
            businessId: quotationData.businessId,
            serviceId,
            inChargeUserId: quotationData.createdByUserId,
            type: 'Other Services' as const,
            status: SaleStatus.CHECKED, // Auto-approve sales created from quotation (CHECKED = 'Approved')
            subtotalMMK: itemTotal,
            packageDiscountMMK: itemDiscount,
            manualDiscountMMK: 0,
            grandTotalMMK: itemGrandTotal,
            amountPaid: 0,
            taxAmountMMK: itemTax,
            quantity: Number(item.quantity) || 1,
            unitPriceMMK: Number(item.unitPrice) || 0,
        };
        if (quotationData.notes) salePayload.notes = quotationData.notes;
        if (quotationData.taxPercentage !== undefined && quotationData.taxPercentage > 0) {
            salePayload.taxPercentage = quotationData.taxPercentage;
        }
        if (itemOtherFees > 0) salePayload.otherFeesAmountMMK = itemOtherFees;
        if (quotationData.otherFeesDescription) salePayload.otherFeesDescription = quotationData.otherFeesDescription;
        
        // Create sale record - this updates Client/Business balance immediately
        const newSale = await apiAddSaleRecord(salePayload);
        createdSaleIds.push(newSale.id);
    }
    
    // Step 2: Create invoice with saleRecordId (linked to first sale for backward compatibility)
    // The invoice does NOT update balance because sales already did
    const newInvoiceData: Omit<Invoice, 'id'|'createdAt'|'updatedAt'> = {
        clientId: quotationData.clientId, 
        businessId: quotationData.businessId, 
        quotationId: quotationData.id,
        saleRecordId: createdSaleIds[0], // Link to first sale for backward compatibility
        issueDate: new Date().toISOString(), 
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: quotationData.items, 
        subtotal: quotationData.subtotal, 
        discount: discountAmount,
        tax: quotationData.taxAmountMMK || 0, 
        grandTotal: quotationData.grandTotal, 
        amountPaid: 0,
        status: InvoiceStatus.DRAFT,
        otherFeesAmountMMK: quotationData.otherFeesAmountMMK || 0,
        otherFeesDescription: quotationData.otherFeesDescription,
        notes: quotationData.notes,
    };

    // Remove undefined optional fields to avoid Firestore invalid data errors
    if (!newInvoiceData.notes) delete (newInvoiceData as Partial<Invoice>).notes;
    if (!newInvoiceData.otherFeesDescription) delete (newInvoiceData as Partial<Invoice>).otherFeesDescription;
    
    const invoice = await apiAddDirectInvoice(newInvoiceData);
    await apiUpdateQuotation({
        id: quotationId,
        status: QuotationStatus.CONVERTED_TO_INVOICE,
        invoiceId: invoice.id,
        saleRecordId: createdSaleIds[0],
    });
    await apiLinkSalesToInvoice(createdSaleIds, invoice.id);
    void logActivityHelper('Invoices', 'Create from Quotation', `Created invoice from quotation: ${quotationId}`, invoice.id, { quotationId });
    return invoice;
};


// Payments
export const apiGetPayments = (limit?: number): Promise<Payment[]> => fetchCollection<Payment>('payments', {field: 'paymentDate', direction: 'desc'}, limit);
export const apiGetPaymentsForSale = (saleId: string): Promise<Payment[]> => 
    db.collection('payments')
      .where('saleRecordId', '==', saleId)
      .get()
      .then(snap => snap.docs.map(d => convertTimestamps({id: d.id, ...d.data()}) as Payment));

export const apiGetPaymentsForClient = (clientId: string): Promise<Payment[]> => fetchCollectionByField<Payment>('payments', 'clientId', clientId);
export const apiGetPaymentsForBusiness = (businessId: string): Promise<Payment[]> => fetchCollectionByField<Payment>('payments', 'businessId', businessId);

// NEW
export const apiGetPaymentsForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<Payment[]> => {
    const snapshot = await db.collection('payments')
        .where('paymentDate', '>=', startDate)
        .where('paymentDate', '<=', endDate)
        .orderBy('paymentDate', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Payment);
};
      
export const apiRecordPayment = async (paymentData: Omit<Payment, 'id' | 'receiptNumber' | 'createdAt' | 'status'>): Promise<Payment> => {
    let businessIdForValidation = paymentData.businessId;
    if (!businessIdForValidation && paymentData.invoiceId) {
        const inv = await db.collection('invoices').doc(paymentData.invoiceId).get();
        if (inv.exists) businessIdForValidation = (inv.data() as Invoice).businessId;
    }
    if (!businessIdForValidation && paymentData.saleRecordId) {
        const sale = await db.collection('sales').doc(paymentData.saleRecordId).get();
        if (sale.exists) businessIdForValidation = (sale.data() as SaleRecord).businessId;
    }
    if (paymentData.clientId && businessIdForValidation) {
        await requireLinkedPair(paymentData.clientId, businessIdForValidation, 'apiRecordPayment');
    }
    const isGeneralClientWide =
        paymentData.clientId &&
        !businessIdForValidation &&
        !paymentData.invoiceId &&
        !paymentData.saleRecordId;
    if (isGeneralClientWide) {
        const linkedIds = await getResolvedLinkedBusinessIds(paymentData.clientId);
        if (linkedIds.length === 0) {
            throw new Error('Client has no verified linked businesses. Link at least one business before recording a client-wide payment.');
        }
    }
    const receiptNumber = await getNextId('RCPT-');
    let createdPayment: Payment | null = null;
    
    const sanitizedPaymentData: { [key: string]: any } = {};
    for (const key in paymentData) {
        if ((paymentData as any)[key] !== undefined) {
            (sanitizedPaymentData as any)[key] = (paymentData as any)[key];
        }
    }
    
    const paymentRef = db.collection('payments').doc();

    await db.runTransaction(async (transaction) => {
        // --- ALL READS MUST GO HERE ---
        const clientRef = db.collection('clients').doc(paymentData.clientId);
        
        let businessId: string | undefined = paymentData.businessId;
        
        // Prepare refs for potential reads
        const invoiceRef = paymentData.invoiceId ? db.collection('invoices').doc(paymentData.invoiceId) : null;
        const saleRef = paymentData.saleRecordId ? db.collection('sales').doc(paymentData.saleRecordId) : null;

        // Execute reads in parallel
        const docsToRead = [transaction.get(clientRef)];
        if (invoiceRef) docsToRead.push(transaction.get(invoiceRef));
        if (saleRef) docsToRead.push(transaction.get(saleRef));
        
        const readDocs = await Promise.all(docsToRead);
        
        const clientDoc = readDocs[0] as firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>;
        const invoiceDoc = invoiceRef ? readDocs[1] as firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData> : null;
        const saleDoc = saleRef ? readDocs[invoiceRef ? 2 : 1] as firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData> : null;

        if (!clientDoc.exists) {
            throw new Error("Client not found.");
        }

        // Determine businessId if not provided, based on read data
        if (!businessId) {
            if (invoiceDoc?.exists) businessId = (invoiceDoc.data() as Invoice).businessId;
            else if (saleDoc?.exists) businessId = (saleDoc.data() as SaleRecord).businessId;
        }
        
        // --- ALL WRITES GO HERE ---
        // Payment is created with PENDING status; we auto-approve immediately after (no manual approval required)
        const newPaymentData: Record<string, unknown> = {
            ...sanitizedPaymentData,
            receiptNumber,
            status: PaymentStatus.PENDING,
            createdAt: getMyanmarISOString(),
        };
        if (businessId) {
            newPaymentData.businessId = businessId;
        } else if (!paymentData.invoiceId && !paymentData.saleRecordId) {
            newPaymentData.clientWide = true;
        }
        transaction.set(paymentRef, newPaymentData);
        createdPayment = convertTimestamps({ id: paymentRef.id, ...newPaymentData }) as Payment;
    });
    let result = createdPayment ?? (convertTimestamps({ id: paymentRef.id, ...(await paymentRef.get()).data() }) as Payment);
    // Auto-approve payment (no manual approval required)
    const approverUserId = paymentData.recordedByUserId || '';
    if (approverUserId) {
        await apiApprovePayment(result.id, approverUserId);
        const updatedDoc = await paymentRef.get();
        result = convertTimestamps({ id: paymentRef.id, ...updatedDoc.data() }) as Payment;
    }
    void logActivityHelper('Payments', 'Create', `Recorded payment: ${result.receiptNumber}`, result.id, { amount: result.amountMMK, status: result.status });
    return result;
};

const buildAllocationsOldestFirst = (sales: SaleRecord[], totalAmount: number): Array<{ saleId: string; allocationAmount: number }> => {
    const allocations: Array<{ saleId: string; allocationAmount: number }> = [];
    if (totalAmount <= 0) return allocations;
    let remainingPayment = totalAmount;
    for (const sale of sales) {
        if (!sale.id || remainingPayment <= 0) break;
        const saleTotal = sale.grandTotalMMK || 0;
        const amountPaid = sale.amountPaid || 0;
        const remaining = Math.max(saleTotal - amountPaid, 0);
        if (remaining <= 0) continue;
        const allocationAmount = Math.min(remainingPayment, remaining);
        allocations.push({ saleId: sale.id, allocationAmount });
        remainingPayment -= allocationAmount;
    }
    return allocations;
};

type PaymentBusinessAllocationPlan = {
    businessId: string;
    amountMMK: number;
    openingBalanceApplied: number;
};

type ClientWideAllocationState = {
    openingBalanceByBusiness: Map<string, number>;
    openingPaidByBusiness: Map<string, number>;
    salePaidBySaleId: Map<string, number>;
};

const isClientWideGeneralPayment = (payment: Pick<Payment, 'clientId' | 'businessId' | 'invoiceId' | 'saleRecordId'>): boolean =>
    !!payment.clientId && !payment.businessId && !payment.invoiceId && !payment.saleRecordId;

const getOpeningBalanceRemainingForPair = async (
    clientId: string,
    businessId: string
): Promise<{ openingBalance: number; openingBalancePaid: number; openingBalanceRemaining: number }> => {
    const balanceId = `${clientId}_${businessId}`;
    const balanceDoc = await db.collection('client_business_balances').doc(balanceId).get();
    const balanceData = balanceDoc.exists ? balanceDoc.data() : undefined;
    let openingBalance = (balanceData?.openingBalance ?? 0) as number;
    if (openingBalance === 0) {
        try {
            const biz = await apiGetBusinessById(businessId);
            if (biz?.openingBalance != null) openingBalance = biz.openingBalance;
        } catch { /* ignore */ }
    }
    const openingBalancePaid = (balanceData?.openingBalancePaid ?? 0) as number;
    const openingBalanceRemaining = Math.max(openingBalance - openingBalancePaid, 0);
    return { openingBalance, openingBalancePaid, openingBalanceRemaining };
};

const buildApprovedPaidBySaleMap = (approvedPayments: Payment[]): Map<string, number> => {
    const approvedPaidBySale = new Map<string, number>();
    approvedPayments
        .filter(p => !p.refundId)
        .forEach(p => {
            if (p.saleAllocations && p.saleAllocations.length > 0) {
                p.saleAllocations.forEach(allocation => {
                    const current = approvedPaidBySale.get(allocation.saleRecordId) || 0;
                    approvedPaidBySale.set(allocation.saleRecordId, current + (allocation.amountMMK || 0));
                });
                return;
            }
            if (p.saleRecordId) {
                const current = approvedPaidBySale.get(p.saleRecordId) || 0;
                approvedPaidBySale.set(p.saleRecordId, current + (p.amountMMK || 0));
            }
        });
    return approvedPaidBySale;
};

/** Build business allocation plans from opening + sales parts; remainder credits first linked business. */
const buildClientWideBusinessAllocations = (
    paymentAmount: number,
    linkedBusinessIds: string[],
    openingAppliedByBusiness: Map<string, number>,
    salesAllocations: Array<{ saleId: string; allocationAmount: number }>,
    allSales: SaleRecord[]
): PaymentBusinessAllocationPlan[] => {
    const amountByBusiness = new Map<string, { opening: number; sales: number }>();
    openingAppliedByBusiness.forEach((opening, businessId) => {
        amountByBusiness.set(businessId, { opening, sales: 0 });
    });
    for (const alloc of salesAllocations) {
        const sale = allSales.find(s => s.id === alloc.saleId);
        if (!sale?.businessId) continue;
        const entry = amountByBusiness.get(sale.businessId) || { opening: 0, sales: 0 };
        entry.sales += alloc.allocationAmount;
        amountByBusiness.set(sale.businessId, entry);
    }
    const plans: PaymentBusinessAllocationPlan[] = Array.from(amountByBusiness.entries())
        .filter(([, v]) => v.opening + v.sales > 0)
        .map(([businessId, v]) => ({
            businessId,
            amountMMK: v.opening + v.sales,
            openingBalanceApplied: v.opening,
        }));
    return finalizeClientWideBusinessAllocations(paymentAmount, linkedBusinessIds, plans);
};

/** Core client-wide allocator using in-memory state (opening per pair + global sale timeline). */
const computeClientWideAllocationWithState = (
    paymentAmount: number,
    linkedBusinessIds: string[],
    allSales: SaleRecord[],
    state: ClientWideAllocationState
): {
    allocations: Array<{ saleId: string; allocationAmount: number }>;
    businessAllocations: PaymentBusinessAllocationPlan[];
    openingAppliedByBusiness: Map<string, number>;
} => {
    let remainingPayment = paymentAmount;
    const openingAppliedByBusiness = new Map<string, number>();

    for (const businessId of linkedBusinessIds) {
        if (remainingPayment <= 0) break;
        const openingBalance = state.openingBalanceByBusiness.get(businessId) ?? 0;
        const openingPaid = state.openingPaidByBusiness.get(businessId) ?? 0;
        const openingRemaining = Math.max(openingBalance - openingPaid, 0);
        if (openingRemaining <= 0) continue;
        const applied = Math.min(remainingPayment, openingRemaining);
        openingAppliedByBusiness.set(businessId, applied);
        remainingPayment -= applied;
    }

    const salesForAllocation = allSales
        .map(sale => {
            const paidFromState = state.salePaidBySaleId.get(sale.id || '') ?? 0;
            const amountPaid = Math.max(sale.amountPaid || 0, paidFromState);
            return { ...sale, amountPaid };
        })
        .filter(sale => isSaleEligibleForPaymentAllocation(sale))
        .filter(sale => Math.max((sale.grandTotalMMK || 0) - (sale.amountPaid || 0), 0) > 0)
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    const allocations = buildAllocationsOldestFirst(salesForAllocation, remainingPayment);
    const businessAllocations = buildClientWideBusinessAllocations(
        paymentAmount,
        linkedBusinessIds,
        openingAppliedByBusiness,
        allocations,
        allSales
    );

    return { allocations, businessAllocations, openingAppliedByBusiness };
};

/** Ensure client-wide payment applies full amount to pair balances (prepayment credit on first linked business). */
const finalizeClientWideBusinessAllocations = (
    paymentAmount: number,
    linkedBusinessIds: string[],
    plans: PaymentBusinessAllocationPlan[]
): PaymentBusinessAllocationPlan[] => {
    if (paymentAmount <= 0 || linkedBusinessIds.length === 0) return plans;
    const result = plans.map(p => ({ ...p }));
    const allocated = result.reduce((sum, p) => sum + p.amountMMK, 0);
    const remainder = paymentAmount - allocated;
    if (remainder <= 0.001) return result;

    const creditBusinessId = linkedBusinessIds[0];
    const existingIdx = result.findIndex(p => p.businessId === creditBusinessId);
    if (existingIdx >= 0) {
        result[existingIdx].amountMMK += remainder;
    } else {
        result.unshift({
            businessId: creditBusinessId,
            amountMMK: remainder,
            openingBalanceApplied: 0,
        });
    }
    return result;
};

const fetchClientSalesForLinkedBusinesses = async (
    clientId: string,
    linkedBusinessIds: string[]
): Promise<SaleRecord[]> => {
    const linkedSet = new Set(linkedBusinessIds);
    const salesSnapshot = await db.collection('sales')
        .where('clientId', '==', clientId)
        .limit(500)
        .get();
    return salesSnapshot.docs
        .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as SaleRecord))
        .filter(sale => sale.businessId && linkedSet.has(sale.businessId));
};

const buildClientWideAllocationStateFromDb = async (
    clientId: string,
    linkedBusinessIds: string[],
    excludePaymentId?: string
): Promise<{ state: ClientWideAllocationState; allSales: SaleRecord[] }> => {
    const openingBalanceByBusiness = new Map<string, number>();
    const openingPaidByBusiness = new Map<string, number>();
    for (const businessId of linkedBusinessIds) {
        const ob = await getOpeningBalanceRemainingForPair(clientId, businessId);
        openingBalanceByBusiness.set(businessId, ob.openingBalance);
        openingPaidByBusiness.set(businessId, ob.openingBalancePaid);
    }

    const allSales = await fetchClientSalesForLinkedBusinesses(clientId, linkedBusinessIds);
    const paymentsSnapshot = await db.collection('payments')
        .where('clientId', '==', clientId)
        .where('status', '==', PaymentStatus.APPROVED)
        .limit(500)
        .get();
    const linkedSet = new Set(linkedBusinessIds);
    const approvedPayments = paymentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Payment))
        .filter(p => !p.refundId && p.id !== excludePaymentId)
        .filter(p => !p.businessId || linkedSet.has(p.businessId));

    return {
        state: {
            openingBalanceByBusiness,
            openingPaidByBusiness,
            salePaidBySaleId: buildApprovedPaidBySaleMap(approvedPayments),
        },
        allSales,
    };
};

/** Client-wide general payment: opening balances (linked order) then oldest approved sales globally. */
const computeClientWideGeneralPaymentAllocation = async (
    clientId: string,
    paymentAmount: number,
    linkedBusinessIds: string[],
    excludePaymentId?: string
): Promise<{
    allocations: Array<{ saleId: string; allocationAmount: number }>;
    businessAllocations: PaymentBusinessAllocationPlan[];
}> => {
    const { state, allSales } = await buildClientWideAllocationStateFromDb(clientId, linkedBusinessIds, excludePaymentId);
    const result = computeClientWideAllocationWithState(paymentAmount, linkedBusinessIds, allSales, state);
    return {
        allocations: result.allocations,
        businessAllocations: result.businessAllocations,
    };
};

/** Preview client-wide allocation for UI (no writes). */
export const apiPreviewClientWidePaymentAllocation = async (
    clientId: string,
    paymentAmount: number
): Promise<{
    linkedBusinessIds: string[];
    allocations: Array<{ saleId: string; allocationAmount: number; businessId?: string; saleDate?: string }>;
    businessAllocations: PaymentBusinessAllocationPlan[];
    totalOpeningApplied: number;
    totalSalesApplied: number;
    unallocatedCredit: number;
}> => {
    const linkedBusinessIds = await getResolvedLinkedBusinessIds(clientId);
    if (linkedBusinessIds.length === 0) {
        throw new Error('Client has no verified linked businesses.');
    }
    if (paymentAmount <= 0) {
        return {
            linkedBusinessIds,
            allocations: [],
            businessAllocations: [],
            totalOpeningApplied: 0,
            totalSalesApplied: 0,
            unallocatedCredit: 0,
        };
    }
    const { state, allSales } = await buildClientWideAllocationStateFromDb(clientId, linkedBusinessIds);
    const result = computeClientWideAllocationWithState(paymentAmount, linkedBusinessIds, allSales, state);
    const totalOpeningApplied = Array.from(result.openingAppliedByBusiness.values()).reduce((s, v) => s + v, 0);
    const totalSalesApplied = result.allocations.reduce((s, a) => s + a.allocationAmount, 0);
    return {
        linkedBusinessIds,
        allocations: result.allocations.map(a => {
            const sale = allSales.find(s => s.id === a.saleId);
            return { ...a, businessId: sale?.businessId, saleDate: sale?.createdAt };
        }),
        businessAllocations: result.businessAllocations,
        totalOpeningApplied,
        totalSalesApplied,
        unallocatedCredit: Math.max(paymentAmount - totalOpeningApplied - totalSalesApplied, 0),
    };
};

/**
 * Redistribute client-wide general payments chronologically per client.
 * Pair-specific general payments are handled by apiRedistributeGeneralPaymentsOnly.
 */
export const apiRedistributeClientWideGeneralPaymentsOnly = async (
    onProgress?: (current: number, total: number, label: string) => void
): Promise<{ clientsProcessed: number; paymentsUpdated: number; errors: number }> => {
    const result = { clientsProcessed: 0, paymentsUpdated: 0, errors: 0 };

    const paymentsSnap = await db.collection('payments')
        .where('status', '==', PaymentStatus.APPROVED)
        .get();

    const byClient = new Map<string, Payment[]>();
    paymentsSnap.docs.forEach(doc => {
        const p = convertTimestamps({ id: doc.id, ...doc.data() }) as Payment;
        if (p.refundId || !isClientWideGeneralPayment(p)) return;
        if (!byClient.has(p.clientId)) byClient.set(p.clientId, []);
        byClient.get(p.clientId)!.push(p);
    });

    const clientList = Array.from(byClient.entries());
    if (clientList.length === 0) return result;

    onProgress?.(0, clientList.length, 'Loading client-wide payments...');

    for (let i = 0; i < clientList.length; i++) {
        const [clientId, clientWidePayments] = clientList[i];
        onProgress?.(i + 1, clientList.length, `Client-wide payments ${i + 1}/${clientList.length}...`);

        try {
            const linkedBusinessIds = await getResolvedLinkedBusinessIds(clientId);
            if (linkedBusinessIds.length === 0) continue;

            const linkedSet = new Set(linkedBusinessIds);
            const allSales = await fetchClientSalesForLinkedBusinesses(clientId, linkedBusinessIds);

            const openingBalanceByBusiness = new Map<string, number>();
            for (const businessId of linkedBusinessIds) {
                const ob = await getOpeningBalanceRemainingForPair(clientId, businessId);
                openingBalanceByBusiness.set(businessId, ob.openingBalance);
            }

            const allClientPaymentsSnap = await db.collection('payments')
                .where('clientId', '==', clientId)
                .where('status', '==', PaymentStatus.APPROVED)
                .get();
            const allClientPayments = allClientPaymentsSnap.docs
                .map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Payment)
                .filter(p => !p.refundId)
                .sort((a, b) => new Date(a.paymentDate || a.createdAt || 0).getTime() - new Date(b.paymentDate || b.createdAt || 0).getTime());

            const openingPaidByBusiness = new Map<string, number>(linkedBusinessIds.map(id => [id, 0]));
            const salePaidBySaleId = new Map<string, number>();
            allSales.forEach(s => { if (s.id) salePaidBySaleId.set(s.id, 0); });

            for (const p of allClientPayments) {
                if (isClientWideGeneralPayment(p)) continue;
                const amt = p.amountMMK || 0;
                if (p.saleAllocations && p.saleAllocations.length > 0) {
                    for (const a of p.saleAllocations) {
                        if (a.saleRecordId && a.amountMMK) {
                            salePaidBySaleId.set(a.saleRecordId, (salePaidBySaleId.get(a.saleRecordId) || 0) + a.amountMMK);
                        }
                    }
                } else if (p.saleRecordId) {
                    salePaidBySaleId.set(p.saleRecordId, (salePaidBySaleId.get(p.saleRecordId) || 0) + amt);
                } else if (p.businessId && linkedSet.has(p.businessId) && !p.invoiceId && !p.saleRecordId) {
                    let remaining = amt;
                    const obMax = openingBalanceByBusiness.get(p.businessId) ?? 0;
                    const obPaid = openingPaidByBusiness.get(p.businessId) ?? 0;
                    const forOb = Math.min(remaining, Math.max(obMax - obPaid, 0));
                    if (forOb > 0) {
                        openingPaidByBusiness.set(p.businessId, obPaid + forOb);
                        remaining -= forOb;
                    }
                    if (remaining > 0) {
                        const pairSales = allSales
                            .filter(s => s.businessId === p.businessId)
                            .filter(s => isSaleEligibleForPaymentAllocation(s))
                            .filter(s => Math.max((s.grandTotalMMK || 0) - (salePaidBySaleId.get(s.id || '') || 0), 0) > 0)
                            .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                        for (const sale of pairSales) {
                            if (remaining <= 0 || !sale.id) break;
                            const saleRem = Math.max((sale.grandTotalMMK || 0) - (salePaidBySaleId.get(sale.id) || 0), 0);
                            if (saleRem <= 0) continue;
                            const alloc = Math.min(remaining, saleRem);
                            salePaidBySaleId.set(sale.id, (salePaidBySaleId.get(sale.id) || 0) + alloc);
                            remaining -= alloc;
                        }
                    }
                }
            }

            const state: ClientWideAllocationState = {
                openingBalanceByBusiness,
                openingPaidByBusiness,
                salePaidBySaleId,
            };

            const batch = db.batch();
            const sortedClientWide = [...clientWidePayments].sort(
                (a, b) => new Date(a.paymentDate || a.createdAt || 0).getTime() - new Date(b.paymentDate || b.createdAt || 0).getTime()
            );

            for (const payment of sortedClientWide) {
                const amt = payment.amountMMK || 0;
                if (amt <= 0) continue;

                const allocResult = computeClientWideAllocationWithState(amt, linkedBusinessIds, allSales, state);
                allocResult.openingAppliedByBusiness.forEach((applied, businessId) => {
                    openingPaidByBusiness.set(businessId, (openingPaidByBusiness.get(businessId) || 0) + applied);
                });
                allocResult.allocations.forEach(a => {
                    if (a.saleId && a.allocationAmount > 0) {
                        salePaidBySaleId.set(a.saleId, (salePaidBySaleId.get(a.saleId) || 0) + a.allocationAmount);
                    }
                });

                batch.update(db.collection('payments').doc(payment.id), {
                    saleAllocations: allocResult.allocations.map(a => ({
                        saleRecordId: a.saleId,
                        amountMMK: a.allocationAmount,
                    })),
                    businessAllocations: allocResult.businessAllocations.map(b => ({
                        businessId: b.businessId,
                        amountMMK: b.amountMMK,
                        ...(b.openingBalanceApplied > 0 ? { openingBalanceApplied: b.openingBalanceApplied } : {}),
                    })),
                    clientWide: true,
                    updatedAt: getMyanmarISOString(),
                });
                result.paymentsUpdated++;
            }

            for (const sale of allSales) {
                if (!sale.id) continue;
                const paid = salePaidBySaleId.get(sale.id) || 0;
                const capped = Math.min(paid, sale.grandTotalMMK || 0);
                if ((sale.amountPaid || 0) !== capped) {
                    batch.update(db.collection('sales').doc(sale.id), {
                        amountPaid: capped,
                        updatedAt: getMyanmarISOString(),
                    });
                }
            }

            for (const businessId of linkedBusinessIds) {
                batch.set(db.collection('client_business_balances').doc(`${clientId}_${businessId}`), {
                    clientId,
                    businessId,
                    openingBalancePaid: openingPaidByBusiness.get(businessId) ?? 0,
                    updatedAt: getMyanmarISOString(),
                }, { merge: true });
            }

            await batch.commit();
            result.clientsProcessed++;
        } catch (error) {
            console.error(`Failed to redistribute client-wide payments for ${clientId}:`, error);
            result.errors++;
        }
    }

    void logActivityHelper(
        'Settings',
        'Redistribute Client-Wide Payments',
        `Processed ${result.clientsProcessed} client(s), ${result.paymentsUpdated} payment(s), ${result.errors} error(s)`,
        undefined,
        result
    );
    return result;
};

const updateInvoiceFromLinkedSales = async (invoiceId: string): Promise<void> => {
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) return;
    const invoice = convertTimestamps({ id: invoiceDoc.id, ...invoiceDoc.data() }) as Invoice;
    if (invoice.status === InvoiceStatus.CANCELLED) return;

    const linkedSalesSnap = await db.collection('sales')
        .where('invoiceId', '==', invoiceId)
        .get();
    const linkedSales = linkedSalesSnap.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord);
    if (invoice.saleRecordId && !linkedSales.some(sale => sale.id === invoice.saleRecordId)) {
        const legacySaleDoc = await db.collection('sales').doc(invoice.saleRecordId).get();
        if (legacySaleDoc.exists) {
            linkedSales.push(convertTimestamps({ id: legacySaleDoc.id, ...legacySaleDoc.data() }) as SaleRecord);
        }
    }
    if (linkedSales.length === 0) return;

    const totalGrand = linkedSales.reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0);

    // Compute paid amounts from payments to avoid relying on stale sale.amountPaid
    let paymentsQuery: firebase.firestore.Query = db.collection('payments')
        .where('clientId', '==', invoice.clientId)
        .where('status', '==', PaymentStatus.APPROVED);
    if (invoice.businessId) {
        paymentsQuery = paymentsQuery.where('businessId', '==', invoice.businessId);
    }
    const paymentsSnapshot = await paymentsQuery.get();
    const approvedPayments = paymentsSnapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Payment);
    const allocationPaidBySale = new Map<string, number>();
    approvedPayments.forEach(payment => {
        if (payment.refundId) return;
        if (payment.saleAllocations && payment.saleAllocations.length > 0) {
            payment.saleAllocations.forEach(allocation => {
                const current = allocationPaidBySale.get(allocation.saleRecordId) || 0;
                allocationPaidBySale.set(allocation.saleRecordId, current + (allocation.amountMMK || 0));
            });
            return;
        }
        if (payment.saleRecordId) {
            const current = allocationPaidBySale.get(payment.saleRecordId) || 0;
            allocationPaidBySale.set(payment.saleRecordId, current + (payment.amountMMK || 0));
        }
    });

    const salesPaidTotals = linkedSales.map(sale => {
        const allocatedPaid = allocationPaidBySale.get(sale.id) || 0;
        const normalizedPaid = Math.max(sale.amountPaid || 0, allocatedPaid);
        return { sale, normalizedPaid };
    });
    const totalPaid = salesPaidTotals.reduce((sum, entry) => sum + entry.normalizedPaid, 0);
    const normalizedGrand = totalGrand > 0 ? totalGrand : invoice.grandTotal;
    const normalizedPaid = Math.min(totalPaid, normalizedGrand);
    const newStatus = normalizedPaid >= normalizedGrand
        ? InvoiceStatus.PAID
        : (normalizedPaid > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.SENT);

    const batch = db.batch();
    salesPaidTotals.forEach(({ sale, normalizedPaid }) => {
        if ((sale.amountPaid || 0) !== normalizedPaid) {
            const saleRef = db.collection('sales').doc(sale.id);
            batch.update(saleRef, { amountPaid: normalizedPaid });
        }
    });
    batch.update(db.collection('invoices').doc(invoice.id), {
        status: newStatus,
        amountPaid: normalizedPaid,
        updatedAt: getMyanmarISOString(),
    });
    await batch.commit();
};

const normalizePaymentStatus = (status?: string) => {
    const normalized = (status || '').toString().toLowerCase();
    if (normalized === PaymentStatus.APPROVED.toLowerCase()) return PaymentStatus.APPROVED;
    if (normalized === PaymentStatus.PENDING.toLowerCase()) return PaymentStatus.PENDING;
    if (normalized === PaymentStatus.NOT_APPROVED.toLowerCase()) return PaymentStatus.NOT_APPROVED;
    return status as PaymentStatus;
};

const matchCashAccountForPayment = (payment: Pick<Payment, 'method' | 'transactionLast4Digits'>, accounts: CashAccount[]) => {
    const rawMethod = (payment.method || '').toString();
    const methodBase = rawMethod.includes(' - ')
        ? rawMethod.split(' - ')[0]
        : rawMethod;
    const method = methodBase.trim().toLowerCase();
    const extractedLast4 = rawMethod.match(/(\d{4})/)?.[1];
    const last4 = ((payment.transactionLast4Digits || extractedLast4 || '').toString()).slice(-4);
    return accounts.find(acc => {
        const name = (acc.name || '').trim().toLowerCase();
        const bankName = (acc.bankName || '').trim().toLowerCase();
        const walletProvider = (acc.walletProvider || '').trim().toLowerCase();
        const matchesByName = method
            ? (name && (method.includes(name) || name.includes(method))) ||
              (bankName && (method.includes(bankName) || bankName.includes(method))) ||
              (walletProvider && (method.includes(walletProvider) || walletProvider.includes(method)))
            : false;
        const matchesByAccountNumber = last4
            ? (acc.accountNumber && acc.accountNumber.endsWith(last4)) ||
              (acc.phoneNumber && acc.phoneNumber.endsWith(last4))
            : false;
        return matchesByName || matchesByAccountNumber;
    });
};

export const apiApprovePayment = async (paymentId: string, approvedByUserId: string): Promise<void> => {
    let paymentAmount = 0;
    
    // First, fetch the payment to check if it's a general payment that needs auto-allocation
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
        throw new Error("Payment record not found.");
    }
    
    const payment = paymentDoc.data() as Payment;
    paymentAmount = payment.amountMMK;
    
    // Find matching cash account by payment method name
    // Fetch all cash accounts to find the one that matches the payment method
    const allCashAccounts = await apiGetCashAccounts();
    const matchingCashAccount = matchCashAccountForPayment(payment, allCashAccounts);
    
    // Check payment type: general, specific sale, or specific invoice
    const isGeneralPayment = !payment.invoiceId && !payment.saleRecordId;
    const isInvoicePayment = !!payment.invoiceId && !payment.saleRecordId;
    const isSpecificSalePayment = !!payment.saleRecordId && !payment.invoiceId;
    
    let allocations: Array<{ saleId: string; allocationAmount: number }> = [];
    let amountForOpeningBalance = 0;
    let businessBalanceUpdatePlans: PaymentBusinessAllocationPlan[] = [];
    const linkedSalesForInvoice: SaleRecord[] = [];
    
    if (isGeneralPayment && payment.clientId && payment.businessId) {
        // GENERAL PAYMENTS (single business): Opening balance FIRST; when opening fully paid, remainder to OLDEST UNPAID SALES.
        const { openingBalanceRemaining } = await getOpeningBalanceRemainingForPair(payment.clientId, payment.businessId);

        // Allocate payment: first to opening balance, then remainder to oldest sales
        let amountForSales = payment.amountMMK;
        if (openingBalanceRemaining > 0) {
            amountForOpeningBalance = Math.min(payment.amountMMK, openingBalanceRemaining);
            amountForSales = payment.amountMMK - amountForOpeningBalance;
        }

        // Fetch sales for this client/business (capped to reduce reads)
        const salesSnapshot = await db.collection('sales')
            .where('clientId', '==', payment.clientId)
            .where('businessId', '==', payment.businessId)
            .limit(500)
            .get();

        const allSales = salesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...convertTimestamps(doc.data())
        })) as SaleRecord[];

        // Get approved payments for allocation calculation (capped to reduce reads)
        const paymentsSnapshot = await db.collection('payments')
            .where('clientId', '==', payment.clientId)
            .where('businessId', '==', payment.businessId)
            .where('status', '==', PaymentStatus.APPROVED)
            .limit(500)
            .get();

        const approvedPayments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...convertTimestamps(doc.data())
        })) as Payment[];

        const approvedPaidBySale = buildApprovedPaidBySaleMap(approvedPayments);

        const salesForAllocation = allSales
            .map(sale => {
                const allocationPaid = approvedPaidBySale.get(sale.id || '') || 0;
                const amountPaid = Math.max(sale.amountPaid || 0, allocationPaid);
                return { ...sale, amountPaid };
            })
            .filter(sale => isSaleEligibleForPaymentAllocation(sale))
            .filter(sale => {
                const remaining = Math.max((sale.grandTotalMMK || 0) - (sale.amountPaid || 0), 0);
                return remaining > 0;
            })
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateA - dateB;
            });

        allocations = buildAllocationsOldestFirst(salesForAllocation, amountForSales);
        businessBalanceUpdatePlans = [{
            businessId: payment.businessId,
            amountMMK: payment.amountMMK,
            openingBalanceApplied: amountForOpeningBalance,
        }];
    } else if (isGeneralPayment && payment.clientId && !payment.businessId) {
        // GENERAL PAYMENTS (client-wide): opening balances across linked businesses, then oldest sales globally
        const linkedBusinessIds = await getResolvedLinkedBusinessIds(payment.clientId);
        if (linkedBusinessIds.length === 0) {
            throw new Error('Client has no verified linked businesses for client-wide payment allocation.');
        }
        const clientWideResult = await computeClientWideGeneralPaymentAllocation(
            payment.clientId,
            payment.amountMMK,
            linkedBusinessIds,
            paymentId
        );
        allocations = clientWideResult.allocations;
        businessBalanceUpdatePlans = clientWideResult.businessAllocations;
        amountForOpeningBalance = clientWideResult.businessAllocations.reduce(
            (sum, item) => sum + (item.openingBalanceApplied || 0),
            0
        );
    }
    
    // Handle invoice payments: allocate to linked sales (oldest to newest)
    if (isInvoicePayment && payment.invoiceId && payment.clientId) {
        const invoiceDoc = await db.collection('invoices').doc(payment.invoiceId).get();
        if (!invoiceDoc.exists) {
            throw new Error(`Invoice ${payment.invoiceId} not found for payment allocation.`);
        }
        const invoice = convertTimestamps({ id: invoiceDoc.id, ...invoiceDoc.data() }) as Invoice;
        
        const linkedSaleIds = new Set<string>();
        const salesSnapshot = await db.collection('sales')
            .where('invoiceId', '==', payment.invoiceId)
            .get();
        salesSnapshot.docs.forEach(doc => {
            const sale = convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord;
            if (sale.id) {
                linkedSalesForInvoice.push(sale);
                linkedSaleIds.add(sale.id);
            }
        });

        if (invoice.saleRecordId && !linkedSaleIds.has(invoice.saleRecordId)) {
            const legacySaleDoc = await db.collection('sales').doc(invoice.saleRecordId).get();
            if (legacySaleDoc.exists) {
                const legacySale = convertTimestamps({ id: legacySaleDoc.id, ...legacySaleDoc.data() }) as SaleRecord;
                if (legacySale.id) {
                    linkedSalesForInvoice.push(legacySale);
                    linkedSaleIds.add(legacySale.id);
                }
            }
        }

        const salesForAllocation = linkedSalesForInvoice
            .filter(sale => isSaleEligibleForPaymentAllocation(sale))
            .filter(sale => {
                const remaining = Math.max((sale.grandTotalMMK || 0) - (sale.amountPaid || 0), 0);
                return remaining > 0;
            })
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateA - dateB;
            });
        
        allocations = buildAllocationsOldestFirst(salesForAllocation, payment.amountMMK);
    }
    
    if (isSpecificSalePayment && payment.saleRecordId) {
        const specificSaleDoc = await db.collection('sales').doc(payment.saleRecordId).get();
        if (!specificSaleDoc.exists) {
            throw new Error(`Sale record ${payment.saleRecordId} not found for payment allocation.`);
        }
        const specificSale = convertTimestamps({ id: specificSaleDoc.id, ...specificSaleDoc.data() }) as SaleRecord;
        if (!isSaleEligibleForPaymentAllocation(specificSale)) {
            throw new Error(`Cannot allocate payment to draft sale ${payment.saleRecordId}. Please approve the sale first.`);
        }
        allocations = [{ saleId: payment.saleRecordId, allocationAmount: payment.amountMMK }];
    }

    if (
        businessBalanceUpdatePlans.length === 0 &&
        payment.businessId &&
        (isInvoicePayment || isSpecificSalePayment)
    ) {
        businessBalanceUpdatePlans = [{
            businessId: payment.businessId,
            amountMMK: payment.amountMMK,
            openingBalanceApplied: 0,
        }];
    }
    
    await db.runTransaction(async (transaction) => {
        const paymentRef = db.collection('payments').doc(paymentId);
        const paymentDocInTransaction = await transaction.get(paymentRef);
        
        if (!paymentDocInTransaction.exists) {
            throw new Error("Payment record not found.");
        }
        
        const paymentInTransaction = paymentDocInTransaction.data() as Payment;
        
        // Only approve if currently PENDING
        if (paymentInTransaction.status !== PaymentStatus.PENDING) {
            throw new Error(`Cannot approve payment with status ${paymentInTransaction.status}. Only PENDING payments can be approved.`);
        }
        
        // Firestore transactions require all reads before all writes
        // Read all documents first
        const reads: Promise<firebase.firestore.DocumentSnapshot>[] = [];
        const saleAllocations = paymentInTransaction.saleAllocations || [];
        
        // Read balance documents for all affected client-business pairs
        const balanceRefs = businessBalanceUpdatePlans.map(plan => ({
            plan,
            ref: db.collection('client_business_balances').doc(`${paymentInTransaction.clientId}_${plan.businessId}`),
        }));
        balanceRefs.forEach(({ ref }) => reads.push(transaction.get(ref)));
        
        // Read all sales that need to be allocated
        const saleRefsToRead: firebase.firestore.DocumentReference[] = [];
        const saleRefIds = new Set<string>();
        const allocationItems = allocations.length > 0 ? allocations : saleAllocations.map(a => ({ saleId: a.saleRecordId, allocationAmount: a.amountMMK }));
        allocationItems.forEach(item => {
            if (item.saleId && !saleRefIds.has(item.saleId)) {
                saleRefIds.add(item.saleId);
                saleRefsToRead.push(db.collection('sales').doc(item.saleId));
            }
        });
        
        saleRefsToRead.forEach(ref => reads.push(transaction.get(ref)));
        
        // Read matching cash account if found
        let cashAccountRef: firebase.firestore.DocumentReference | null = null;
        if (matchingCashAccount) {
            cashAccountRef = db.collection('cash_accounts').doc(matchingCashAccount.id);
            reads.push(transaction.get(cashAccountRef));
        }
        
        // Wait for all reads to complete
        const readDocs = await Promise.all(reads);
        let cashAccountDoc: firebase.firestore.DocumentSnapshot | null = null;
        const saleDocs: firebase.firestore.DocumentSnapshot[] = [];
        let readIndex = 0;
        
        const balanceDocs = balanceRefs.map(({ plan, ref }) => {
            const doc = readDocs[readIndex] as firebase.firestore.DocumentSnapshot;
            readIndex++;
            return { plan, ref, doc };
        });
        
        // Extract cash account doc if it was read
        if (cashAccountRef) {
            cashAccountDoc = readDocs[readIndex] as firebase.firestore.DocumentSnapshot;
            readIndex++;
        }
        
        for (let i = 0; i < saleRefsToRead.length; i++) {
            saleDocs.push(readDocs[readIndex + i] as firebase.firestore.DocumentSnapshot);
        }
        
        // Now perform all writes
        // Update payment status
        const allocationPayload = allocations.length > 0
            ? allocations.map(item => ({ saleRecordId: item.saleId, amountMMK: item.allocationAmount }))
            : [];
        const businessAllocationPayload = businessBalanceUpdatePlans.length > 0
            ? businessBalanceUpdatePlans.map(item => ({
                businessId: item.businessId,
                amountMMK: item.amountMMK,
                ...(item.openingBalanceApplied > 0 ? { openingBalanceApplied: item.openingBalanceApplied } : {}),
            }))
            : [];
        transaction.update(paymentRef, {
            status: PaymentStatus.APPROVED,
            approvedByUserId,
            approvedAt: getMyanmarISOString(),
            saleAllocations: allocationPayload,
            ...(businessAllocationPayload.length > 0 ? { businessAllocations: businessAllocationPayload } : {}),
            ...(matchingCashAccount?.id ? { cashAccountId: matchingCashAccount.id } : {}),
            ...(!paymentInTransaction.businessId && businessAllocationPayload.length > 0 ? { clientWide: true } : {}),
        });
        
        // Formula: Outstanding -= sum_payments. Payments reduce Outstanding -> -amount
        // Update balances - only approved payments affect balances
        if (balanceDocs.length > 0) {
            for (const { plan, ref, doc } of balanceDocs) {
                const updateData: Record<string, unknown> = {
                    balance: firebase.firestore.FieldValue.increment(-plan.amountMMK),
                    updatedAt: getMyanmarISOString(),
                };
                if (plan.openingBalanceApplied > 0) {
                    updateData.openingBalancePaid = firebase.firestore.FieldValue.increment(plan.openingBalanceApplied);
                }
                if (doc?.exists) {
                    transaction.update(ref, updateData);
                } else {
                    const newBalanceData: Record<string, unknown> = {
                        clientId: paymentInTransaction.clientId,
                        businessId: plan.businessId,
                        balance: -plan.amountMMK,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    };
                    if (plan.openingBalanceApplied > 0) {
                        newBalanceData.openingBalancePaid = plan.openingBalanceApplied;
                    }
                    transaction.set(ref, newBalanceData);
                }

                const businessRef = db.collection('businesses').doc(plan.businessId);
                transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(-plan.amountMMK) });
            }

            const clientRef = db.collection('clients').doc(paymentInTransaction.clientId);
            transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-paymentInTransaction.amountMMK) });
        } else if (!paymentInTransaction.businessId && businessBalanceUpdatePlans.length === 0) {
            // Legacy: No businessId and no cross-business plan - update client balance directly
            const clientRef = db.collection('clients').doc(paymentInTransaction.clientId);
            transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-paymentInTransaction.amountMMK) });
        }
        
        // Update cash account balance if matching account found
        if (cashAccountRef && cashAccountDoc?.exists) {
            const cashAccount = cashAccountDoc.data() as CashAccount;
            const currentTotalInflow = cashAccount.totalInflow || 0;
            const newTotalInflow = currentTotalInflow + paymentInTransaction.amountMMK;
            const initialBalance = cashAccount.initialBalance || 0;
            const totalOutflow = cashAccount.totalOutflow || 0;
            const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
            
            transaction.update(cashAccountRef, {
                totalInflow: newTotalInflow,
                balance: newBalance,
                updatedAt: getMyanmarISOString(),
            });
        }
        
        // Update sale.amountPaid for each allocated sale
        if (allocationItems.length > 0) {
            for (const allocationItem of allocationItems) {
                if (!allocationItem || !allocationItem.saleId || allocationItem.allocationAmount <= 0) continue;
                const saleDocToUpdate = saleDocs.find(doc => doc.id === allocationItem.saleId);
                if (saleDocToUpdate && saleDocToUpdate.exists) {
                    const saleData = saleDocToUpdate.data() as SaleRecord;
                    const saleTotal = saleData.grandTotalMMK || 0;
                    const currentAmountPaid = saleData.amountPaid || 0;
                    const newAmountPaid = Math.min(currentAmountPaid + allocationItem.allocationAmount, saleTotal);
                    transaction.update(saleDocToUpdate.ref, { 
                        amountPaid: newAmountPaid,
                        updatedAt: getMyanmarISOString()
                    });
                }
            }
        }
    });
    
    // After transaction completes, check if any invoices linked to the updated sales should be marked as paid
    // INVOICES ARE DOCUMENTATION ONLY - Check status based on linked sales being fully paid
    const saleIdsToCheck = new Set<string>();
    allocations.forEach(item => {
        if (item.saleId) saleIdsToCheck.add(item.saleId);
    });
    if (payment.saleRecordId && !payment.refundId) {
        saleIdsToCheck.add(payment.saleRecordId);
    }

    // Check invoices linked to these sales (legacy saleRecordId flow)
    if (saleIdsToCheck.size > 0) {
        for (const saleId of Array.from(saleIdsToCheck)) {
            // Find invoices linked to this sale via saleRecordId
            const invoicesSnapshot = await db.collection('invoices')
                .where('saleRecordId', '==', saleId)
                .get();
            
            for (const invoiceDoc of invoicesSnapshot.docs) {
                const invoice = convertTimestamps({ id: invoiceDoc.id, ...invoiceDoc.data() }) as Invoice;
                
                // Get the linked sale to check if it's fully paid
                const linkedSaleDoc = await db.collection('sales').doc(saleId).get();
                if (linkedSaleDoc.exists) {
                    const linkedSale = convertTimestamps({ id: linkedSaleDoc.id, ...linkedSaleDoc.data() }) as SaleRecord;
                    const saleTotal = linkedSale.grandTotalMMK || 0;
                    const saleAmountPaid = linkedSale.amountPaid || 0;
                    const isSaleFullyPaid = saleAmountPaid >= saleTotal;
                    
                    // If the linked sale is fully paid, mark the invoice as PAID
                    if (isSaleFullyPaid && invoice.status !== InvoiceStatus.PAID) {
                        await db.collection('invoices').doc(invoice.id).update({
                            status: InvoiceStatus.PAID,
                            amountPaid: invoice.grandTotal, // Set amountPaid to match grandTotal for display purposes
                            updatedAt: getMyanmarISOString()
                        });
                    } else if (!isSaleFullyPaid && saleAmountPaid > 0 && invoice.status !== InvoiceStatus.PARTIALLY_PAID && invoice.status !== InvoiceStatus.PAID) {
                        // If sale is partially paid, mark invoice as PARTIALLY_PAID
                        const proportionPaid = saleAmountPaid / saleTotal;
                        await db.collection('invoices').doc(invoice.id).update({
                            status: InvoiceStatus.PARTIALLY_PAID,
                            amountPaid: Math.round(invoice.grandTotal * proportionPaid), // Calculate proportion for display
                            updatedAt: getMyanmarISOString()
                        });
                    }
                }
            }
        }
    }

    // Update invoice status based on linked sales totals for invoice payments and general allocations
    const invoiceIdsToCheck = new Set<string>();
    if (isInvoicePayment && payment.invoiceId) {
        invoiceIdsToCheck.add(payment.invoiceId);
    }
    if (saleIdsToCheck.size > 0) {
        const saleDocs = await Promise.all(
            Array.from(saleIdsToCheck).map(id => db.collection('sales').doc(id).get())
        );
        saleDocs.forEach(doc => {
            if (!doc.exists) return;
            const sale = convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord;
            if (sale.invoiceId) invoiceIdsToCheck.add(sale.invoiceId);
        });
    }
    for (const invoiceId of Array.from(invoiceIdsToCheck)) {
        await updateInvoiceFromLinkedSales(invoiceId);
    }

    // Sync client and business totals from pair balances so they stay in sync (client can have multiple pairs)
    if (businessBalanceUpdatePlans.length > 0) {
        try {
            await syncFinanceCustomerBalance(payment.clientId);
            for (const plan of businessBalanceUpdatePlans) {
                await syncFinanceCustomerBalance(payment.clientId, plan.businessId);
            }
        } catch (error) {
            console.error("Failed to sync client/business balance after payment approval:", error);
        }
    } else if (payment.businessId) {
        try {
            await syncFinanceCustomerBalance(payment.clientId, payment.businessId);
        } catch (error) {
            console.error("Failed to sync client/business balance after payment approval:", error);
        }
    }

    void logActivityHelper('Payments', 'Approve', `Approved payment: ${paymentId}`, paymentId, { amount: paymentAmount });
};

export const apiRejectPayment = async (paymentId: string, approvedByUserId: string, rejectionReason: string): Promise<void> => {
    await db.runTransaction(async (transaction) => {
        const paymentRef = db.collection('payments').doc(paymentId);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists) {
            throw new Error("Payment record not found.");
        }
        
        const payment = paymentDoc.data() as Payment;
        
        // Only reject if currently PENDING
        if (payment.status !== PaymentStatus.PENDING) {
            throw new Error(`Cannot reject payment with status ${payment.status}. Only PENDING payments can be rejected.`);
        }
        
        // Update payment status - rejected payments don't affect balances
        transaction.update(paymentRef, {
            status: PaymentStatus.NOT_APPROVED,
            approvedByUserId,
            approvedAt: getMyanmarISOString(),
            rejectionReason,
        });
    });
    
    // Send notification to the employee who recorded the payment
    const payment = await fetchDocumentById<Payment>('payments', paymentId);
    if (payment && payment.recordedByUserId) {
        const notificationData = {
            userId: payment.recordedByUserId,
            type: 'error' as const,
            title: 'Payment Rejected',
            message: `Your payment record ${payment.receiptNumber} has been rejected. Reason: ${rejectionReason}`,
            read: false,
            relatedToId: paymentId,
            relatedToType: 'Payment' as const,
        };
        await addDocument('notifications', notificationData);
    }
    
    void logActivityHelper('Payments', 'Reject', `Rejected payment: ${paymentId}`, paymentId, { amount: payment?.amountMMK || 0, reason: rejectionReason });
};

export const apiUpdatePayment = async (paymentId: string, updates: Partial<Omit<Payment, 'id' | 'createdAt'>>) => {
    const prePaymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!prePaymentDoc.exists) {
        throw new Error("Payment record not found for update.");
    }
    const prePaymentData = prePaymentDoc.data() as Payment;
    const newClientId = (updates.clientId ?? prePaymentData.clientId)?.toString().trim() || '';
    const newBusinessId = (updates.businessId ?? prePaymentData.businessId)?.toString().trim() || null;
    if (newClientId && newBusinessId) {
        await requireLinkedPair(newClientId, newBusinessId, 'apiUpdatePayment');
    }
    const allCashAccounts = await fetchCollection<CashAccount>('cash_accounts');
    const oldCashAccount = prePaymentData.cashAccountId
        ? allCashAccounts.find(acc => acc.id === prePaymentData.cashAccountId)
        : matchCashAccountForPayment(prePaymentData, allCashAccounts);
    const updatedPaymentSnapshot = { ...prePaymentData, ...updates };
    const newCashAccount = updatedPaymentSnapshot.cashAccountId
        ? allCashAccounts.find(acc => acc.id === updatedPaymentSnapshot.cashAccountId)
        : matchCashAccountForPayment(updatedPaymentSnapshot, allCashAccounts);

    const cashAccountUpdateMap = new Map<string, { balance: number; totalInflow: number }>();
    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const paymentRef = db.collection('payments').doc(paymentId);
        const oldPaymentDoc = await transaction.get(paymentRef);
        if (!oldPaymentDoc.exists) {
            throw new Error("Payment record not found for update.");
        }
        const oldData = oldPaymentDoc.data() as Payment;
        const oldAmount = oldData.amountMMK;
        const oldStatus = normalizePaymentStatus(oldData.status);
        const newAmount = updates.amountMMK !== undefined ? updates.amountMMK : oldAmount;
        const newStatus = normalizePaymentStatus(updates.status !== undefined ? updates.status : oldData.status);
        const amountDifference = newAmount - oldAmount;
        const statusChanged = oldStatus !== newStatus;

        // Handle status changes: PENDING <-> APPROVED
        const wasPending = oldStatus === PaymentStatus.PENDING;
        const isApproved = newStatus === PaymentStatus.APPROVED;
        const wasApproved = oldStatus === PaymentStatus.APPROVED;
        const isPending = newStatus === PaymentStatus.PENDING;
        const existingAllocations = oldData.saleAllocations || [];
        const shouldScaleAllocations = existingAllocations.length > 0 && amountDifference !== 0 && isApproved && !statusChanged;
        let scaledAllocations = existingAllocations;
        if (shouldScaleAllocations) {
            const totalAllocated = existingAllocations.reduce((sum, alloc) => sum + (alloc.amountMMK || 0), 0);
            if (totalAllocated > 0) {
                const factor = newAmount / totalAllocated;
                let runningTotal = 0;
                scaledAllocations = existingAllocations.map((alloc, idx) => {
                    if (idx === existingAllocations.length - 1) {
                        return { ...alloc, amountMMK: newAmount - runningTotal };
                    }
                    const scaled = Math.round((alloc.amountMMK || 0) * factor);
                    runningTotal += scaled;
                    return { ...alloc, amountMMK: scaled };
                });
            }
        }

        // Read sale documents if needed
        let saleDoc1: firebase.firestore.DocumentSnapshot | null = null;
        let saleDoc2: firebase.firestore.DocumentSnapshot | null = null;
        let saleDoc3: firebase.firestore.DocumentSnapshot | null = null;
        const saleRef1 = (wasPending && isApproved && oldData.saleRecordId) ? db.collection('sales').doc(oldData.saleRecordId) : null;
        const saleRef2 = (wasApproved && isPending && oldData.saleRecordId) ? db.collection('sales').doc(oldData.saleRecordId) : null;
        const saleRef3 = (oldData.saleRecordId && amountDifference !== 0 && isApproved && !statusChanged && existingAllocations.length === 0) ? db.collection('sales').doc(oldData.saleRecordId) : null;
        const allocationSaleRefs = (existingAllocations.length > 0 && (wasPending || wasApproved || shouldScaleAllocations))
            ? existingAllocations.map(alloc => db.collection('sales').doc(alloc.saleRecordId))
            : [];
        const allocationSaleDocs = allocationSaleRefs.length > 0
            ? await Promise.all(allocationSaleRefs.map(ref => transaction.get(ref)))
            : [];
        
        if (saleRef1) saleDoc1 = await transaction.get(saleRef1);
        if (saleRef2) saleDoc2 = await transaction.get(saleRef2);
        if (saleRef3) saleDoc3 = await transaction.get(saleRef3);
        
        // Read balance document if needed
        let balanceDoc: firebase.firestore.DocumentSnapshot | null = null;
        const balanceRef = (amountDifference !== 0 && isApproved && !statusChanged && oldData.businessId) 
            ? db.collection('client_business_balances').doc(`${oldData.clientId}_${oldData.businessId}`)
            : null;
        if (balanceRef) {
            balanceDoc = await transaction.get(balanceRef);
        }

        let oldCashAccountDoc: firebase.firestore.DocumentSnapshot | null = null;
        let newCashAccountDoc: firebase.firestore.DocumentSnapshot | null = null;
        if (oldCashAccount) {
            oldCashAccountDoc = await transaction.get(db.collection('cash_accounts').doc(oldCashAccount.id));
        }
        if (newCashAccount && newCashAccount.id !== oldCashAccount?.id) {
            newCashAccountDoc = await transaction.get(db.collection('cash_accounts').doc(newCashAccount.id));
        } else if (newCashAccount) {
            newCashAccountDoc = oldCashAccountDoc;
        }

        // STEP 2: Now perform all writes
        const updatePayload: Partial<Payment> = { ...updates, updatedAt: getMyanmarISOString() } as Partial<Payment>;
        if (shouldScaleAllocations) {
            updatePayload.saleAllocations = scaledAllocations;
        }
        if (updates.status !== undefined) {
            updatePayload.status = newStatus;
        }
        if (isApproved && newCashAccount?.id) {
            updatePayload.cashAccountId = newCashAccount.id;
        }
        transaction.update(paymentRef, omitUndefinedFields(updatePayload as Record<string, unknown>));

        // Cash account updates for approved payment changes
        if (wasPending && isApproved && newCashAccountDoc?.exists && newCashAccount) {
            const account = newCashAccountDoc.data() as CashAccount;
            const newTotalInflow = (account.totalInflow || 0) + newAmount;
            const initialBalance = account.initialBalance || 0;
            const totalOutflow = account.totalOutflow || 0;
            const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
            transaction.update(db.collection('cash_accounts').doc(newCashAccount.id), {
                totalInflow: newTotalInflow,
                balance: newBalance,
                updatedAt: getMyanmarISOString(),
            });
            cashAccountUpdateMap.set(newCashAccount.id, { totalInflow: newTotalInflow, balance: newBalance });
        }

        if (wasApproved && isPending && oldCashAccountDoc?.exists && oldCashAccount) {
            const account = oldCashAccountDoc.data() as CashAccount;
            const newTotalInflow = Math.max((account.totalInflow || 0) - oldAmount, 0);
            const initialBalance = account.initialBalance || 0;
            const totalOutflow = account.totalOutflow || 0;
            const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
            transaction.update(db.collection('cash_accounts').doc(oldCashAccount.id), {
                totalInflow: newTotalInflow,
                balance: newBalance,
                updatedAt: getMyanmarISOString(),
            });
            cashAccountUpdateMap.set(oldCashAccount.id, { totalInflow: newTotalInflow, balance: newBalance });
        }

        if (wasApproved && isApproved) {
            const oldAccountId = oldCashAccount?.id;
            const newAccountId = newCashAccount?.id;
            if (oldAccountId && newAccountId && oldAccountId === newAccountId && amountDifference !== 0 && oldCashAccountDoc?.exists) {
                const account = oldCashAccountDoc.data() as CashAccount;
                const newTotalInflow = Math.max((account.totalInflow || 0) + amountDifference, 0);
                const initialBalance = account.initialBalance || 0;
                const totalOutflow = account.totalOutflow || 0;
                const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
                transaction.update(db.collection('cash_accounts').doc(oldAccountId), {
                    totalInflow: newTotalInflow,
                    balance: newBalance,
                    updatedAt: getMyanmarISOString(),
                });
                cashAccountUpdateMap.set(oldAccountId, { totalInflow: newTotalInflow, balance: newBalance });
            }
            if (oldAccountId && newAccountId && oldAccountId !== newAccountId) {
                if (oldCashAccountDoc?.exists) {
                    const account = oldCashAccountDoc.data() as CashAccount;
                    const newTotalInflow = Math.max((account.totalInflow || 0) - oldAmount, 0);
                    const initialBalance = account.initialBalance || 0;
                    const totalOutflow = account.totalOutflow || 0;
                    const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
                    transaction.update(db.collection('cash_accounts').doc(oldAccountId), {
                        totalInflow: newTotalInflow,
                        balance: newBalance,
                        updatedAt: getMyanmarISOString(),
                    });
                    cashAccountUpdateMap.set(oldAccountId, { totalInflow: newTotalInflow, balance: newBalance });
                }
                if (newCashAccountDoc?.exists) {
                    const account = newCashAccountDoc.data() as CashAccount;
                    const newTotalInflow = (account.totalInflow || 0) + newAmount;
                    const initialBalance = account.initialBalance || 0;
                    const totalOutflow = account.totalOutflow || 0;
                    const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
                    transaction.update(db.collection('cash_accounts').doc(newAccountId), {
                        totalInflow: newTotalInflow,
                        balance: newBalance,
                        updatedAt: getMyanmarISOString(),
                    });
                    cashAccountUpdateMap.set(newAccountId, { totalInflow: newTotalInflow, balance: newBalance });
                }
            }
            if (!oldAccountId && newAccountId && amountDifference !== 0 && newCashAccountDoc?.exists) {
                const account = newCashAccountDoc.data() as CashAccount;
                const newTotalInflow = (account.totalInflow || 0) + newAmount;
                const initialBalance = account.initialBalance || 0;
                const totalOutflow = account.totalOutflow || 0;
                const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
                transaction.update(db.collection('cash_accounts').doc(newAccountId), {
                    totalInflow: newTotalInflow,
                    balance: newBalance,
                    updatedAt: getMyanmarISOString(),
                });
                cashAccountUpdateMap.set(newAccountId, { totalInflow: newTotalInflow, balance: newBalance });
            }
            if (oldAccountId && !newAccountId && amountDifference !== 0 && oldCashAccountDoc?.exists) {
                const account = oldCashAccountDoc.data() as CashAccount;
                const newTotalInflow = Math.max((account.totalInflow || 0) - oldAmount, 0);
                const initialBalance = account.initialBalance || 0;
                const totalOutflow = account.totalOutflow || 0;
                const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
                transaction.update(db.collection('cash_accounts').doc(oldAccountId), {
                    totalInflow: newTotalInflow,
                    balance: newBalance,
                    updatedAt: getMyanmarISOString(),
                });
                cashAccountUpdateMap.set(oldAccountId, { totalInflow: newTotalInflow, balance: newBalance });
            }
        }

        if (wasPending && isApproved) {
            // Moving from PENDING to APPROVED - ADD balance impact
            const clientRef = db.collection('clients').doc(oldData.clientId);
            transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-oldAmount) });
            
            if (oldData.businessId) {
                const businessRef = db.collection('businesses').doc(oldData.businessId);
                transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(-oldAmount) });
            }
            
            // INVOICES ARE DOCUMENTATION ONLY - Do NOT update invoice amountPaid here
            // Payments are allocated to sales only. Invoice status will be checked after sales are updated.
            
            if (existingAllocations.length > 0 && allocationSaleDocs.length > 0) {
                existingAllocations.forEach((alloc, idx) => {
                    const saleDoc = allocationSaleDocs[idx];
                    if (!saleDoc?.exists) return;
                    const sale = saleDoc.data() as SaleRecord;
                    const newAmountPaid = (sale.amountPaid || 0) + alloc.amountMMK;
                    transaction.update(saleDoc.ref, { amountPaid: newAmountPaid });
                });
            } else if (saleRef1 && saleDoc1?.exists) {
                const sale = saleDoc1.data() as SaleRecord;
                const newAmountPaid = (sale.amountPaid || 0) + oldAmount;
                transaction.update(saleRef1, { amountPaid: newAmountPaid });
            }
        } else if (wasApproved && isPending) {
            // Moving from APPROVED to PENDING - REMOVE balance impact
            const clientRef = db.collection('clients').doc(oldData.clientId);
            transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(oldAmount) });
            
            if (oldData.businessId) {
                const businessRef = db.collection('businesses').doc(oldData.businessId);
                transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(oldAmount) });
            }
            
            // INVOICES ARE DOCUMENTATION ONLY - Do NOT update invoice amountPaid here
            // Payments are allocated to sales only. Invoice status will be checked after sales are updated.
            
            if (existingAllocations.length > 0 && allocationSaleDocs.length > 0) {
                existingAllocations.forEach((alloc, idx) => {
                    const saleDoc = allocationSaleDocs[idx];
                    if (!saleDoc?.exists) return;
                    const sale = saleDoc.data() as SaleRecord;
                    const newAmountPaid = Math.max(0, (sale.amountPaid || 0) - alloc.amountMMK);
                    transaction.update(saleDoc.ref, { amountPaid: newAmountPaid });
                });
            } else if (saleRef2 && saleDoc2?.exists) {
                const sale = saleDoc2.data() as SaleRecord;
                const newAmountPaid = Math.max(0, (sale.amountPaid || 0) - oldAmount);
                transaction.update(saleRef2, { amountPaid: newAmountPaid });
            }
        }

        // Handle amount changes (only if status is APPROVED)
        if (amountDifference !== 0 && isApproved && !statusChanged) {
            if (oldData.businessId && balanceRef) {
                // Update client-business balance
                if (balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(-amountDifference),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    transaction.set(balanceRef, {
                        clientId: oldData.clientId,
                        businessId: oldData.businessId,
                        balance: -amountDifference,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }
                
                // Update client and business total balances
                const clientRef = db.collection('clients').doc(oldData.clientId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-amountDifference) });
                
                const businessRef = db.collection('businesses').doc(oldData.businessId);
                transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(-amountDifference) });
            } else {
                // Legacy: No businessId - update client balance directly
                const clientRef = db.collection('clients').doc(oldData.clientId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(-amountDifference) });
            }
        }

        // INVOICES ARE DOCUMENTATION ONLY - Do NOT update invoice amountPaid here
        // Payments are allocated to sales only. Invoice status will be checked after sales are updated.

        if (shouldScaleAllocations && allocationSaleDocs.length > 0) {
            scaledAllocations.forEach((alloc, idx) => {
                const saleDoc = allocationSaleDocs[idx];
                if (!saleDoc?.exists) return;
                const sale = saleDoc.data() as SaleRecord;
                const oldAllocAmount = existingAllocations[idx]?.amountMMK || 0;
                const delta = alloc.amountMMK - oldAllocAmount;
                if (delta === 0) return;
                const newAmountPaid = (sale.amountPaid || 0) + delta;
                transaction.update(saleDoc.ref, { amountPaid: newAmountPaid });
            });
        } else if (saleRef3 && saleDoc3?.exists && amountDifference !== 0 && isApproved && !statusChanged) {
            const sale = saleDoc3.data() as SaleRecord;
            const newAmountPaid = (sale.amountPaid || 0) + amountDifference;
            transaction.update(saleRef3, { amountPaid: newAmountPaid });
        }
    });
    
    // Recalculate invoice status from linked sales after updates
    const saleIdsToCheck = new Set<string>();
    const preAllocations = (prePaymentData.saleAllocations && prePaymentData.saleAllocations.length > 0)
        ? prePaymentData.saleAllocations.map(a => a.saleRecordId)
        : (prePaymentData.saleRecordId ? [prePaymentData.saleRecordId] : []);
    preAllocations.forEach(id => {
        if (id) saleIdsToCheck.add(id);
    });
    
    const invoiceIdsToCheck = new Set<string>();
    if (prePaymentData.invoiceId) invoiceIdsToCheck.add(prePaymentData.invoiceId);
    
    if (saleIdsToCheck.size > 0) {
        for (const saleId of Array.from(saleIdsToCheck)) {
            const invoicesSnapshot = await db.collection('invoices')
                .where('saleRecordId', '==', saleId)
                .get();
            invoicesSnapshot.docs.forEach(doc => {
                const invoice = convertTimestamps({ id: doc.id, ...doc.data() }) as Invoice;
                invoiceIdsToCheck.add(invoice.id);
            });
        }
        
        const saleDocs = await Promise.all(
            Array.from(saleIdsToCheck).map(id => db.collection('sales').doc(id).get())
        );
        saleDocs.forEach(doc => {
            if (!doc.exists) return;
            const sale = convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord;
            if (sale.invoiceId) invoiceIdsToCheck.add(sale.invoiceId);
        });
    }
    
    for (const invoiceId of Array.from(invoiceIdsToCheck)) {
        await updateInvoiceFromLinkedSales(invoiceId);
    }

    // Sync client and business totals from pair balances after payment update
    if (prePaymentData.businessId) {
        try {
            await syncFinanceCustomerBalance(prePaymentData.clientId, prePaymentData.businessId);
        } catch (error) {
            console.error("Failed to sync client/business balance after payment update:", error);
        }
    }

    cashAccountUpdateMap.forEach((values, id) => {
        const index = financeStore.cashAccounts.findIndex(acc => acc.id === id);
        if (index !== -1) {
            financeStore.cashAccounts[index].balance = values.balance;
            financeStore.cashAccounts[index].totalInflow = values.totalInflow;
            financeStore.cashAccounts[index].updatedAt = new Date().toISOString();
        }
    });
    void logActivityHelper('Payments', 'Update', `Updated payment: ${paymentId}`, paymentId);
};

export const apiDeletePayment = async (paymentId: string) => {
     const paymentPreDoc = await db.collection('payments').doc(paymentId).get();
     if (!paymentPreDoc.exists) {
         throw new Error("Payment record not found for deletion.");
     }
     const paymentPreData = paymentPreDoc.data() as Payment;
     const preAllocationItems = (paymentPreData.saleAllocations && paymentPreData.saleAllocations.length > 0)
         ? paymentPreData.saleAllocations.map(a => ({ saleId: a.saleRecordId, amountMMK: a.amountMMK }))
         : (paymentPreData.saleRecordId ? [{ saleId: paymentPreData.saleRecordId, amountMMK: paymentPreData.amountMMK }] : []);
     const prelinkedSaleIds = paymentPreData.invoiceId
         ? (await db.collection('sales').where('invoiceId', '==', paymentPreData.invoiceId).get()).docs.map(doc => doc.id)
         : [];

     const allCashAccounts = await fetchCollection<CashAccount>('cash_accounts');
     const matchingCashAccount = paymentPreData.cashAccountId
        ? allCashAccounts.find(acc => acc.id === paymentPreData.cashAccountId)
        : matchCashAccountForPayment(paymentPreData, allCashAccounts);
    let cashAccountUpdate: { id: string; balance: number; totalInflow: number } | null = null;

    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const paymentRef = db.collection('payments').doc(paymentId);
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) {
            throw new Error("Payment record not found for deletion.");
        }
        const paymentData = paymentDoc.data() as Payment;
        const amountToCredit = paymentData.amountMMK;
        const paymentIsApproved = normalizePaymentStatus(paymentData.status) === PaymentStatus.APPROVED;

        // Read balance and sale documents if payment was APPROVED
        let cashAccountDoc: firebase.firestore.DocumentSnapshot | null = null;
        const allocationItems = (paymentData.saleAllocations && paymentData.saleAllocations.length > 0)
            ? paymentData.saleAllocations.map(a => ({ saleId: a.saleRecordId, amountMMK: a.amountMMK }))
            : (paymentData.saleRecordId ? [{ saleId: paymentData.saleRecordId, amountMMK: paymentData.amountMMK }] : []);
        const saleRefsToRead: firebase.firestore.DocumentReference[] = [];
        const saleRefIds = new Set<string>();
        allocationItems.forEach(item => {
            if (item.saleId && !saleRefIds.has(item.saleId)) {
                saleRefIds.add(item.saleId);
                saleRefsToRead.push(db.collection('sales').doc(item.saleId));
            }
        });
        const saleDocsToRead: firebase.firestore.DocumentSnapshot[] = [];
        let invoiceDoc: firebase.firestore.DocumentSnapshot | null = null;
        let linkedSales: SaleRecord[] = [];
        const businessAllocationReversals = (paymentData.businessAllocations && paymentData.businessAllocations.length > 0)
            ? paymentData.businessAllocations
            : (paymentData.businessId
                ? [{ businessId: paymentData.businessId, amountMMK: amountToCredit, openingBalanceApplied: 0 }]
                : []);
        const balanceDocsForReversal: Array<{
            reversal: { businessId: string; amountMMK: number; openingBalanceApplied?: number };
            ref: firebase.firestore.DocumentReference;
            doc: firebase.firestore.DocumentSnapshot;
        }> = [];
        
        if (paymentIsApproved) {
            for (const reversal of businessAllocationReversals) {
                const balanceId = `${paymentData.clientId}_${reversal.businessId}`;
                const balanceRef = db.collection('client_business_balances').doc(balanceId);
                const doc = await transaction.get(balanceRef);
                balanceDocsForReversal.push({ reversal, ref: balanceRef, doc });
            }
            if (matchingCashAccount) {
                const cashAccountRef = db.collection('cash_accounts').doc(matchingCashAccount.id);
                cashAccountDoc = await transaction.get(cashAccountRef);
            }
            
            for (const saleRef of saleRefsToRead) {
                saleDocsToRead.push(await transaction.get(saleRef));
            }

            if (paymentData.invoiceId) {
                const invoiceRef = db.collection('invoices').doc(paymentData.invoiceId);
                invoiceDoc = await transaction.get(invoiceRef);

                const saleDocs = await Promise.all(
                    prelinkedSaleIds.map(id => transaction.get(db.collection('sales').doc(id)))
                );
                linkedSales = saleDocs
                    .filter(doc => doc.exists)
                    .map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord);

                if (invoiceDoc.exists) {
                    const invoice = invoiceDoc.data() as Invoice;
                    if (invoice.saleRecordId && !linkedSales.some(sale => sale.id === invoice.saleRecordId)) {
                        const legacySaleRef = db.collection('sales').doc(invoice.saleRecordId);
                        const legacySaleDoc = await transaction.get(legacySaleRef);
                        if (legacySaleDoc.exists) {
                            linkedSales.push(convertTimestamps({ id: legacySaleDoc.id, ...legacySaleDoc.data() }) as SaleRecord);
                        }
                    }
                }
            }
        }

        // STEP 2: Now perform all writes
        transaction.delete(paymentRef);

        // Only reverse balance impact if payment was APPROVED
        if (paymentIsApproved) {
            if (businessAllocationReversals.length > 0) {
                for (const { reversal, ref, doc } of balanceDocsForReversal) {
                    const updateData: Record<string, unknown> = {
                        balance: firebase.firestore.FieldValue.increment(reversal.amountMMK),
                        updatedAt: getMyanmarISOString(),
                    };
                    if ((reversal.openingBalanceApplied || 0) > 0) {
                        updateData.openingBalancePaid = firebase.firestore.FieldValue.increment(-(reversal.openingBalanceApplied || 0));
                    }

                    if (doc?.exists) {
                        transaction.update(ref, updateData);
                    } else {
                        transaction.set(ref, {
                            clientId: paymentData.clientId,
                            businessId: reversal.businessId,
                            balance: reversal.amountMMK,
                            createdAt: getMyanmarISOString(),
                            updatedAt: getMyanmarISOString(),
                            ...(reversal.openingBalanceApplied ? { openingBalancePaid: 0 } : {}),
                        });
                    }

                    const businessRef = db.collection('businesses').doc(reversal.businessId);
                    transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(reversal.amountMMK) });
                }

                const clientRef = db.collection('clients').doc(paymentData.clientId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountToCredit) });
            } else {
                // Legacy: No businessId - update client balance directly
                const clientRef = db.collection('clients').doc(paymentData.clientId);
                transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountToCredit) });
            }

            if (matchingCashAccount && cashAccountDoc?.exists) {
                const cashAccount = cashAccountDoc.data() as CashAccount;
                const currentTotalInflow = cashAccount.totalInflow || 0;
                const newTotalInflow = Math.max(currentTotalInflow - paymentData.amountMMK, 0);
                const initialBalance = cashAccount.initialBalance || 0;
                const totalOutflow = cashAccount.totalOutflow || 0;
                const newBalance = (initialBalance + newTotalInflow) - totalOutflow;
                transaction.update(db.collection('cash_accounts').doc(matchingCashAccount.id), {
                    totalInflow: newTotalInflow,
                    balance: newBalance,
                    updatedAt: getMyanmarISOString(),
                });
                cashAccountUpdate = { id: matchingCashAccount.id, balance: newBalance, totalInflow: newTotalInflow };
            }

            if (allocationItems.length > 0 && saleDocsToRead.length > 0) {
                for (const allocationItem of allocationItems) {
                    if (!allocationItem.saleId || allocationItem.amountMMK <= 0) continue;
                    const saleDoc = saleDocsToRead.find(doc => doc.id === allocationItem.saleId);
                    if (!saleDoc || !saleDoc.exists) continue;
                    const sale = saleDoc.data() as SaleRecord;
                    const newAmountPaid = Math.max((sale.amountPaid || 0) - allocationItem.amountMMK, 0);
                    const saleRef = db.collection('sales').doc(allocationItem.saleId);
                    transaction.update(saleRef, {
                        amountPaid: newAmountPaid,
                        updatedAt: getMyanmarISOString(),
                    });
                }
            } else if (paymentData.invoiceId && linkedSales.length > 0) {
                // Legacy fallback: reverse equally when no allocations are stored
                let remainingToRemove = paymentData.amountMMK;
                let remainingSales = linkedSales
                    .filter(sale => (sale.amountPaid || 0) > 0);
                
                while (remainingToRemove > 0 && remainingSales.length > 0) {
                    const perSaleShare = remainingToRemove / remainingSales.length;
                    let removedThisRound = 0;
                    
                    const nextRound: SaleRecord[] = [];
                    remainingSales.forEach(sale => {
                        if (!sale.id) return;
                        const currentPaid = sale.amountPaid || 0;
                        const decrement = Math.min(perSaleShare, currentPaid);
                        if (decrement > 0) {
                            const saleRef = db.collection('sales').doc(sale.id);
                            transaction.update(saleRef, {
                                amountPaid: Math.max(currentPaid - decrement, 0),
                                updatedAt: getMyanmarISOString(),
                            });
                            removedThisRound += decrement;
                            const updatedPaid = currentPaid - decrement;
                            if (updatedPaid > 0) {
                                nextRound.push({ ...sale, amountPaid: updatedPaid });
                            }
                        }
                    });
                    
                    if (removedThisRound <= 0) break;
                    remainingToRemove -= removedThisRound;
                    remainingSales = nextRound;
                }
            }
        }
    });

    // Sync client and business totals from pair balances after payment deletion
    if (paymentPreData.businessAllocations && paymentPreData.businessAllocations.length > 0) {
        try {
            await syncFinanceCustomerBalance(paymentPreData.clientId);
            for (const ba of paymentPreData.businessAllocations) {
                await syncFinanceCustomerBalance(paymentPreData.clientId, ba.businessId);
            }
        } catch (error) {
            console.error("Failed to sync client/business balance after payment deletion:", error);
        }
    } else if (paymentPreData.businessId) {
        try {
            await syncFinanceCustomerBalance(paymentPreData.clientId, paymentPreData.businessId);
        } catch (error) {
            console.error("Failed to sync client/business balance after payment deletion:", error);
        }
    }

    if (cashAccountUpdate) {
        const index = financeStore.cashAccounts.findIndex(acc => acc.id === cashAccountUpdate.id);
        if (index !== -1) {
            financeStore.cashAccounts[index].balance = cashAccountUpdate.balance;
            financeStore.cashAccounts[index].totalInflow = cashAccountUpdate.totalInflow;
            financeStore.cashAccounts[index].updatedAt = new Date().toISOString();
        }
    }
    
    // Recalculate invoice status from linked sales after deletion
    const saleIdsToCheck = new Set<string>();
    preAllocationItems.forEach(item => {
        if (item.saleId) saleIdsToCheck.add(item.saleId);
    });
    if (paymentPreData.saleRecordId) saleIdsToCheck.add(paymentPreData.saleRecordId);
    
    const invoiceIdsToCheck = new Set<string>();
    if (paymentPreData.invoiceId) invoiceIdsToCheck.add(paymentPreData.invoiceId);
    
    if (saleIdsToCheck.size > 0) {
        for (const saleId of Array.from(saleIdsToCheck)) {
            const invoicesSnapshot = await db.collection('invoices')
                .where('saleRecordId', '==', saleId)
                .get();
            invoicesSnapshot.docs.forEach(doc => {
                const invoice = convertTimestamps({ id: doc.id, ...doc.data() }) as Invoice;
                invoiceIdsToCheck.add(invoice.id);
            });
        }
        
        const saleDocs = await Promise.all(
            Array.from(saleIdsToCheck).map(id => db.collection('sales').doc(id).get())
        );
        saleDocs.forEach(doc => {
            if (!doc.exists) return;
            const sale = convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord;
            if (sale.invoiceId) invoiceIdsToCheck.add(sale.invoiceId);
        });
    }
    
    for (const invoiceId of Array.from(invoiceIdsToCheck)) {
        await updateInvoiceFromLinkedSales(invoiceId);
    }
    void logActivityHelper('Payments', 'Delete', `Deleted payment: ${paymentId}`, paymentId);
};

// Refunds
export const apiGetRefunds = (): Promise<Refund[]> => fetchCollection('refunds', {field: 'refundDate', direction: 'desc'});

export const apiGetRefundsForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<Refund[]> => {
    const snapshot = await db.collection('refunds')
        .where('refundDate', '>=', startDate)
        .where('refundDate', '<=', endDate)
        .orderBy('refundDate', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Refund);
};

export const apiGetRefundById = (id: string): Promise<Refund | null> => fetchDocumentById<Refund>('refunds', id);

export const apiGetRefundsForClient = (clientId: string): Promise<Refund[]> => fetchCollectionByField<Refund>('refunds', 'clientId', clientId);

export const apiGetRefundsForBusiness = (businessId: string): Promise<Refund[]> => fetchCollectionByField<Refund>('refunds', 'businessId', businessId);

export const apiRecordRefund = async (refundData: Omit<Refund, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Refund> => {
    if (refundData.clientId && refundData.businessId) {
        await requireLinkedPair(refundData.clientId, refundData.businessId, 'apiRecordRefund');
    }
    const newId = await getNextId(REFUND_ID_PREFIX);
    const refundRef = db.collection('refunds').doc(newId);
    
    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const clientRef = db.collection('clients').doc(refundData.clientId);
        const clientDoc = await transaction.get(clientRef);
        
        if (!clientDoc.exists) {
            throw new Error("Client not found.");
        }
        
        // Business is required
        if (!refundData.businessId) {
            throw new Error("Business is required.");
        }
        
        const businessRef = db.collection('businesses').doc(refundData.businessId);
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        
        // Validate amount is positive
        if (refundData.amountMMK <= 0) {
            throw new Error("Refund amount must be greater than 0.");
        }
        
        // Read client-business balance
        const balanceId = `${refundData.clientId}_${refundData.businessId}`;
        const balanceRef = db.collection('client_business_balances').doc(balanceId);
        const balanceDoc = await transaction.get(balanceRef);
        
        // STEP 2: Now perform all writes
        // Create refund with PENDING status
        // Remove undefined values as Firestore doesn't accept them
        const refundDataClean: any = {};
        Object.keys(refundData).forEach(key => {
            const value = (refundData as any)[key];
            if (value !== undefined) {
                refundDataClean[key] = value;
            }
        });
        
        const newRefund: Partial<Refund> = {
            ...refundDataClean,
            status: CreditNoteStatus.PENDING,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        };
        
        transaction.set(refundRef, newRefund);
        
        // Formula: Total Billed -= refunds. Refunds reduce what client owes -> -amount
        // Update client-business balance (decrease - refunds reduce what client owes)
        if (balanceDoc.exists) {
            transaction.update(balanceRef, {
                balance: firebase.firestore.FieldValue.increment(-refundData.amountMMK),
                updatedAt: getMyanmarISOString(),
            });
        } else {
            transaction.set(balanceRef, {
                clientId: refundData.clientId,
                businessId: refundData.businessId,
                balance: -refundData.amountMMK,
                createdAt: getMyanmarISOString(),
                updatedAt: getMyanmarISOString(),
            });
        }
        
        // Update client total balance (decrease - refunds reduce what client owes)
        transaction.update(clientRef, { 
            balance: firebase.firestore.FieldValue.increment(-refundData.amountMMK) 
        });
        
        // Update business total balance (decrease - refunds reduce what business owes)
        transaction.update(businessRef, { 
            balance: firebase.firestore.FieldValue.increment(-refundData.amountMMK) 
        });
    });
    
    const docSnap = await refundRef.get();
    const result = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Refund;
    
    // Recalculate balance to ensure it matches outstanding balance calculation
    try {
        await syncFinanceCustomerBalance(refundData.clientId, refundData.businessId);
    } catch (error) {
        console.error("Failed to sync balance after refund creation:", error);
        // Continue even if recalculation fails
    }
    
    void logActivityHelper('Refunds', 'Create', `Recorded refund: ${result.id}`, result.id, { 
        amount: result.amountMMK,
        status: result.status 
    });
    return result;
};

export const apiProcessRefund = async (refundId: string, cashAccountId: string, processedByUserId: string): Promise<void> => {
    const refundRef = db.collection('refunds').doc(refundId);
    const refundDoc = await refundRef.get();
    
    if (!refundDoc.exists) {
        throw new Error("Refund not found.");
    }
    
    const refund = refundDoc.data() as Refund;
    
    if (refund.status !== RefundStatus.PENDING) {
        throw new Error(`Cannot process refund with status ${refund.status}. Only PENDING refunds can be processed.`);
    }
    
    await db.runTransaction(async (transaction) => {
        // Re-read refund in transaction
        const refundRefTxn = db.collection('refunds').doc(refundId);
        const refundDocTxn = await transaction.get(refundRefTxn);
        const refundTxn = refundDocTxn.data() as Refund;
        
        // Check cash account balance
        const cashAccountRef = db.collection('cash_accounts').doc(cashAccountId);
        const cashAccountDoc = await transaction.get(cashAccountRef);
        
        if (!cashAccountDoc.exists) {
            throw new Error("Cash account not found.");
        }
        
        const cashAccount = cashAccountDoc.data() as CashAccount;
        // Calculate current balance using formula
        const currentBalance = ((cashAccount.initialBalance || 0) + (cashAccount.totalInflow || 0)) - (cashAccount.totalOutflow || 0);
        if (currentBalance < refundTxn.amountMMK) {
            throw new Error(`Insufficient balance in cash account. Available: ${currentBalance}, Required: ${refundTxn.amountMMK}`);
        }
        
        // Update refund status
        transaction.update(refundRefTxn, {
            status: RefundStatus.PROCESSED,
            cashAccountId,
            processedByUserId,
            processedAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
        
        // Update cash account balance using formula: (initialBalance + totalInflow) - totalOutflow
        const newTotalOutflow = (cashAccount.totalOutflow || 0) + refundTxn.amountMMK;
        const initialBalance = cashAccount.initialBalance || 0;
        const newBalance = (initialBalance + (cashAccount.totalInflow || 0)) - newTotalOutflow;
        transaction.update(cashAccountRef, {
            balance: newBalance,
            totalOutflow: newTotalOutflow,
        });
    });
    
    void logActivityHelper('Refunds', 'Process', `Processed refund: ${refundId}`, refundId, { 
        cashAccountId,
        amount: refund.amountMMK 
    });
};

export const apiUpdateRefund = async (refundId: string, updates: Partial<Omit<Refund, 'id' | 'createdAt' | 'status'>>): Promise<Refund> => {
    // Get old refund data before transaction for use in recalculation
    const oldRefund = await fetchDocumentById<Refund>('refunds', refundId);
    if (!oldRefund) {
        throw new Error("Refund not found.");
    }
    const newClientId = (updates.clientId ?? oldRefund.clientId)?.toString().trim() || '';
    const newBusinessId = (updates.businessId ?? oldRefund.businessId)?.toString().trim() || null;
    if (newClientId && newBusinessId) {
        await requireLinkedPair(newClientId, newBusinessId, 'apiUpdateRefund');
    }
    return db.runTransaction(async (transaction) => {
        const refundRef = db.collection('refunds').doc(refundId);
        const refundDoc = await transaction.get(refundRef);
        
        if (!refundDoc.exists) {
            throw new Error("Refund not found.");
        }
        
        const refundInTransaction = refundDoc.data() as Refund;
        
        if (refundInTransaction.status !== RefundStatus.PENDING) {
            throw new Error(`Cannot update refund with status ${refundInTransaction.status}. Only PENDING refunds can be updated.`);
        }
        
        // Update refund
        // Remove undefined values and convert null to firebase.firestore.FieldValue.delete() for optional fields
        const updateData: any = {
            updatedAt: getMyanmarISOString(),
        };
        
        Object.keys(updates).forEach(key => {
            const value = (updates as any)[key];
            if (value === null && (key === 'serviceId' || key === 'totalUSD' || key === 'rate' || key === 'reason' || key === 'description')) {
                // For optional fields, use delete() to remove them from the document
                updateData[key] = firebase.firestore.FieldValue.delete();
            } else if (value !== undefined) {
                updateData[key] = value;
            }
        });
        
        transaction.update(refundRef, updateData);
        
        // If amount changed, adjust balance to match outstanding balance calculation
        // Old refund reduced balance by -oldRefund.amountMMK
        // New refund should reduce balance by -updates.amountMMK
        // Difference = -updates.amountMMK - (-oldRefund.amountMMK) = -(updates.amountMMK - oldRefund.amountMMK)
        if (updates.amountMMK !== undefined && updates.amountMMK !== refundInTransaction.amountMMK) {
            const amountDifference = updates.amountMMK - refundInTransaction.amountMMK;
            // Negative adjustment since refunds decrease balance
            const balanceAdjustment = -amountDifference;
            
            const clientRef = db.collection('clients').doc(refundInTransaction.clientId);
            transaction.update(clientRef, { 
                balance: firebase.firestore.FieldValue.increment(balanceAdjustment) 
            });
            
            if (refundInTransaction.businessId) {
                const businessRef = db.collection('businesses').doc(refundInTransaction.businessId);
                transaction.update(businessRef, { 
                    balance: firebase.firestore.FieldValue.increment(balanceAdjustment) 
                });
            }
        }
        
        const updatedRefund = { ...refundInTransaction, ...updateData } as Refund;
        return updatedRefund;
    }).then(async (result) => {
        // Recalculate balance to ensure it matches outstanding balance calculation
        try {
            await syncFinanceCustomerBalance(oldRefund.clientId, oldRefund.businessId);
        } catch (error) {
            console.error("Failed to sync balance after refund update:", error);
            // Continue even if recalculation fails
        }
        void logActivityHelper('Refunds', 'Update', `Updated refund: ${refundId}`, refundId, { amountMMK: result?.amountMMK });
        return result;
    });
};

// Credit Notes
export const apiGetCreditNotes = (limit?: number): Promise<CreditNote[]> => fetchCollection<CreditNote>('credit_notes', {field: 'creditNoteDate', direction: 'desc'}, limit);

export const apiGetCreditNotesForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<CreditNote[]> => {
    const snapshot = await db.collection('credit_notes')
        .where('creditNoteDate', '>=', startDate)
        .where('creditNoteDate', '<=', endDate)
        .orderBy('creditNoteDate', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as CreditNote);
};

/** Fetches credit notes by record date (createdAt), same as sales. Use for Record From/To filter. */
export const apiGetCreditNotesForPeriodByCreatedAt = async (startDate: string, endDate: string, limit = 2000): Promise<CreditNote[]> => {
    const start = startDate + 'T00:00:00.000+06:30';
    const end = endDate + 'T23:59:59.999+06:30';
    const snapshot = await db.collection('credit_notes')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as CreditNote);
};

export const apiGetCreditNoteById = (id: string): Promise<CreditNote | null> => fetchDocumentById<CreditNote>('credit_notes', id);

export const apiGetCreditNotesForClient = (clientId: string): Promise<CreditNote[]> => fetchCollectionByField<CreditNote>('credit_notes', 'clientId', clientId);

export const apiGetCreditNotesForBusiness = (businessId: string): Promise<CreditNote[]> => fetchCollectionByField<CreditNote>('credit_notes', 'businessId', businessId);

export const apiRecordCreditNote = async (creditNoteData: Omit<CreditNote, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<CreditNote> => {
    if (creditNoteData.clientId && creditNoteData.businessId) {
        await requireLinkedPair(creditNoteData.clientId, creditNoteData.businessId, 'apiRecordCreditNote');
    }
    const newId = await getNextId(CREDIT_NOTE_ID_PREFIX);
    const creditNoteRef = db.collection('credit_notes').doc(newId);
    let createdCreditNote: CreditNote | null = null;
    
    await db.runTransaction(async (transaction) => {
        // Read client and business
        const clientRef = db.collection('clients').doc(creditNoteData.clientId);
        const clientDoc = await transaction.get(clientRef);
        
        if (!clientDoc.exists) {
            throw new Error("Client not found.");
        }
        
        // Business is required
        if (!creditNoteData.businessId) {
            throw new Error("Business is required.");
        }
        
        const businessRef = db.collection('businesses').doc(creditNoteData.businessId);
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        
        // Validate amount is positive
        if (creditNoteData.amountMMK <= 0) {
            throw new Error("Credit note amount must be greater than 0.");
        }
        
        // Create credit note with PENDING status
        const creditNoteDataClean: any = {};
        Object.keys(creditNoteData).forEach(key => {
            const value = (creditNoteData as any)[key];
            if (value !== undefined) {
                creditNoteDataClean[key] = value;
            }
        });
        
        const newCreditNote: Partial<CreditNote> = {
            ...creditNoteDataClean,
            status: CreditNoteStatus.PENDING,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        };
        
        transaction.set(creditNoteRef, newCreditNote);
        createdCreditNote = convertTimestamps({ id: creditNoteRef.id, ...newCreditNote }) as CreditNote;
        
        // Credit notes are created as PENDING - balances are only updated when APPROVED
    });
    
    const result = createdCreditNote ?? (convertTimestamps({ id: creditNoteRef.id, ...(await creditNoteRef.get()).data() }) as CreditNote);
    
    // PENDING credit notes don't affect balance; no sync needed on create
    
    void logActivityHelper('CreditNotes', 'Create', `Recorded credit note: ${result.id}`, result.id, { 
        amount: result.amountMMK,
        status: result.status 
    });
    return result;
};

export const apiApproveCreditNote = async (creditNoteId: string, approvedByUserId: string): Promise<void> => {
    let creditNoteAmount = 0;
    await db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const creditNoteRef = db.collection('credit_notes').doc(creditNoteId);
        const creditNoteDoc = await transaction.get(creditNoteRef);
        
        if (!creditNoteDoc.exists) {
            throw new Error("Credit note not found.");
        }
        
        const creditNote = creditNoteDoc.data() as CreditNote;
        creditNoteAmount = creditNote.amountMMK;
        
        if (creditNote.status !== CreditNoteStatus.PENDING) {
            throw new Error(`Cannot approve credit note with status ${creditNote.status}. Only PENDING credit notes can be approved.`);
        }
        
        // Read client and business
        const clientRef = db.collection('clients').doc(creditNote.clientId);
        const businessRef = db.collection('businesses').doc(creditNote.businessId);
        
        const clientDoc = await transaction.get(clientRef);
        const businessDoc = await transaction.get(businessRef);
        
        if (!clientDoc.exists) {
            throw new Error("Client not found.");
        }
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        
        // Read client-business balance
        const balanceId = `${creditNote.clientId}_${creditNote.businessId}`;
        const balanceRef = db.collection('client_business_balances').doc(balanceId);
        const balanceDoc = await transaction.get(balanceRef);
        
        // STEP 2: Now perform all writes
        // Update credit note status to APPROVED
        transaction.update(creditNoteRef, {
            status: CreditNoteStatus.APPROVED,
            approvedByUserId,
            approvedAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
        
        // Formula: Total Billed -= sum_credit_notes. Credit notes reduce Total Billed -> -amount
        // Update client-business balance - only APPROVED credit notes affect balances
        if (balanceDoc.exists) {
            transaction.update(balanceRef, {
                balance: firebase.firestore.FieldValue.increment(-creditNote.amountMMK),
                updatedAt: getMyanmarISOString(),
            });
        } else {
            transaction.set(balanceRef, {
                clientId: creditNote.clientId,
                businessId: creditNote.businessId,
                balance: -creditNote.amountMMK,
                createdAt: getMyanmarISOString(),
                updatedAt: getMyanmarISOString(),
            });
        }
        
        // Update client total balance
        transaction.update(clientRef, { 
            balance: firebase.firestore.FieldValue.increment(-creditNote.amountMMK) 
        });
        
        // Update business total balance
        transaction.update(businessRef, { 
            balance: firebase.firestore.FieldValue.increment(-creditNote.amountMMK) 
        });
    });

    // Sync client and business totals from pair balances
    const approvedNote = await apiGetCreditNoteById(creditNoteId);
    if (approvedNote?.clientId && approvedNote?.businessId) {
        try {
            await syncFinanceCustomerBalance(approvedNote.clientId, approvedNote.businessId);
        } catch (error) {
            console.error("Failed to sync client/business balance after credit note approval:", error);
        }
    }

    void logActivityHelper('CreditNotes', 'Approve', `Approved credit note: ${creditNoteId}`, creditNoteId, { amount: creditNoteAmount });
};

export const apiUpdateCreditNote = async (creditNoteId: string, updates: Partial<Omit<CreditNote, 'id' | 'createdAt' | 'status'>>): Promise<CreditNote> => {
    const oldDoc = await db.collection('credit_notes').doc(creditNoteId).get();
    if (!oldDoc.exists) throw new Error("Credit note not found.");
    const oldNote = oldDoc.data() as CreditNote;
    const newClientId = (updates.clientId ?? oldNote.clientId)?.toString().trim() || '';
    const newBusinessId = (updates.businessId ?? oldNote.businessId)?.toString().trim() || null;
    if (newClientId && newBusinessId) {
        await requireLinkedPair(newClientId, newBusinessId, 'apiUpdateCreditNote');
    }
    let oldCreditNote: CreditNote | null = null;
    let updatedCreditNote: CreditNote | null = null;

    await db.runTransaction(async (transaction) => {
        const creditNoteRef = db.collection('credit_notes').doc(creditNoteId);
        const creditNoteDoc = await transaction.get(creditNoteRef);
        
        if (!creditNoteDoc.exists) {
            throw new Error("Credit note not found.");
        }
        
        oldCreditNote = creditNoteDoc.data() as CreditNote;
        
        if (oldCreditNote.status !== CreditNoteStatus.PENDING && oldCreditNote.status !== CreditNoteStatus.APPROVED) {
            throw new Error(`Cannot update credit note with status ${oldCreditNote.status}. Only PENDING or APPROVED credit notes can be updated.`);
        }
        
        const updateData: any = {
            updatedAt: getMyanmarISOString(),
        };
        
        Object.keys(updates).forEach(key => {
            const value = (updates as any)[key];
            if (value !== undefined) {
                updateData[key] = value;
            } else if (value === null && ['reason', 'description', 'serviceId', 'totalUSD', 'rate', 'cashAccountId', 'saleRecordId'].includes(key)) {
                updateData[key] = firebase.firestore.FieldValue.delete();
            }
        });

        const mergedCreditNote = { ...oldCreditNote, ...updateData } as CreditNote;
        if (!mergedCreditNote.clientId || !mergedCreditNote.businessId) {
            throw new Error("Client and business are required.");
        }
        if (mergedCreditNote.amountMMK <= 0) {
            throw new Error("Credit note amount must be greater than 0.");
        }

        if (oldCreditNote.status === CreditNoteStatus.APPROVED) {
            const oldClientId = oldCreditNote.clientId;
            const oldBusinessId = oldCreditNote.businessId;
            const newClientId = mergedCreditNote.clientId;
            const newBusinessId = mergedCreditNote.businessId;
            const oldAmount = oldCreditNote.amountMMK || 0;
            const newAmount = mergedCreditNote.amountMMK || 0;

            const oldClientRef = db.collection('clients').doc(oldClientId);
            const oldBusinessRef = db.collection('businesses').doc(oldBusinessId);
            const oldBalanceRef = db.collection('client_business_balances').doc(`${oldClientId}_${oldBusinessId}`);
            const newClientRef = db.collection('clients').doc(newClientId);
            const newBusinessRef = db.collection('businesses').doc(newBusinessId);
            const newBalanceRef = db.collection('client_business_balances').doc(`${newClientId}_${newBusinessId}`);

            const oldClientDoc = await transaction.get(oldClientRef);
            const oldBusinessDoc = await transaction.get(oldBusinessRef);
            const newClientDoc = newClientRef.id === oldClientRef.id ? oldClientDoc : await transaction.get(newClientRef);
            const newBusinessDoc = newBusinessRef.id === oldBusinessRef.id ? oldBusinessDoc : await transaction.get(newBusinessRef);
            const oldBalanceDoc = await transaction.get(oldBalanceRef);
            const newBalanceDoc = newBalanceRef.id === oldBalanceRef.id ? oldBalanceDoc : await transaction.get(newBalanceRef);

            if (!oldClientDoc.exists) throw new Error("Client not found.");
            if (!oldBusinessDoc.exists) throw new Error("Business not found.");
            if (!newClientDoc.exists) throw new Error("Client not found.");
            if (!newBusinessDoc.exists) throw new Error("Business not found.");

            if (oldClientId === newClientId && oldBusinessId === newBusinessId) {
                const delta = oldAmount - newAmount; // Credit notes reduce balance, so adjust by the delta
                if (delta !== 0) {
                    transaction.update(oldClientRef, { 
                        balance: firebase.firestore.FieldValue.increment(delta),
                    });
                    transaction.update(oldBusinessRef, { 
                        balance: firebase.firestore.FieldValue.increment(delta),
                    });
                    if (oldBalanceDoc.exists) {
                        transaction.update(oldBalanceRef, {
                            balance: firebase.firestore.FieldValue.increment(delta),
                            updatedAt: getMyanmarISOString(),
                        });
                    } else {
                        transaction.set(oldBalanceRef, {
                            clientId: oldClientId,
                            businessId: oldBusinessId,
                            balance: delta,
                            createdAt: getMyanmarISOString(),
                            updatedAt: getMyanmarISOString(),
                        });
                    }
                }
            } else {
                // Reverse old effect
                transaction.update(oldClientRef, { 
                    balance: firebase.firestore.FieldValue.increment(oldAmount),
                });
                transaction.update(oldBusinessRef, { 
                    balance: firebase.firestore.FieldValue.increment(oldAmount),
                });
                if (oldBalanceDoc.exists) {
                    transaction.update(oldBalanceRef, {
                        balance: firebase.firestore.FieldValue.increment(oldAmount),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    transaction.set(oldBalanceRef, {
                        clientId: oldClientId,
                        businessId: oldBusinessId,
                        balance: oldAmount,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }

                // Apply new effect
                const newDelta = -newAmount;
                transaction.update(newClientRef, { 
                    balance: firebase.firestore.FieldValue.increment(newDelta),
                });
                transaction.update(newBusinessRef, { 
                    balance: firebase.firestore.FieldValue.increment(newDelta),
                });
                if (newBalanceDoc.exists) {
                    transaction.update(newBalanceRef, {
                        balance: firebase.firestore.FieldValue.increment(newDelta),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    transaction.set(newBalanceRef, {
                        clientId: newClientId,
                        businessId: newBusinessId,
                        balance: newDelta,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }
            }
        }
        
        transaction.update(creditNoteRef, updateData);
        updatedCreditNote = mergedCreditNote;
    });

    if (oldCreditNote) {
        try {
            await syncFinanceCustomerBalance(oldCreditNote.clientId, oldCreditNote.businessId);
            if (updatedCreditNote && (
                oldCreditNote.clientId !== updatedCreditNote.clientId || 
                oldCreditNote.businessId !== updatedCreditNote.businessId
            )) {
                await syncFinanceCustomerBalance(updatedCreditNote.clientId, updatedCreditNote.businessId);
            }
        } catch (error) {
            console.error("Failed to recalculate balance after credit note update:", error);
        }
    }

    if (!updatedCreditNote) {
        throw new Error("Failed to update credit note.");
    }
    void logActivityHelper('CreditNotes', 'Update', `Updated credit note: ${creditNoteId}`, creditNoteId, { amountMMK: updatedCreditNote.amountMMK });
    return { ...updatedCreditNote, id: creditNoteId } as CreditNote;
};

export const apiDeleteCreditNote = async (creditNoteId: string): Promise<void> => {
    const creditNoteDoc = await db.collection('credit_notes').doc(creditNoteId).get();
    
    if (!creditNoteDoc.exists) {
        throw new Error("Credit note not found.");
    }
    
    const creditNote = creditNoteDoc.data() as CreditNote;
    const clientId = creditNote.clientId;
    const businessId = creditNote.businessId;
    
    await db.runTransaction(async (transaction) => {
        const creditNoteRef = db.collection('credit_notes').doc(creditNoteId);
        const creditNoteDoc = await transaction.get(creditNoteRef);
        
        if (!creditNoteDoc.exists) {
            throw new Error("Credit note not found.");
        }
        
        const cn = creditNoteDoc.data() as CreditNote;
        const statusStr = String(cn.status);
        const isPending = cn.status === CreditNoteStatus.PENDING;
        const isApprovedLike = cn.status === CreditNoteStatus.APPROVED || statusStr === 'Checked';

        // Only allow deletion of PENDING or APPROVED (or legacy "Checked") credit notes
        if (!isPending && !isApprovedLike) {
            throw new Error(`Cannot delete credit note with status ${cn.status}. Only PENDING or APPROVED credit notes can be deleted.`);
        }
        
        // If it was approved (or legacy Checked), reverse the balance effect (credit notes reduce balance, so deletion increases it back)
        if (isApprovedLike) {
            const txClientId = cn.clientId;
            const txBusinessId = cn.businessId;
            const balanceRef = txBusinessId
                ? db.collection('client_business_balances').doc(`${txClientId}_${txBusinessId}`)
                : null;
            const balanceDoc = balanceRef ? await transaction.get(balanceRef) : null;
            const clientRef = db.collection('clients').doc(txClientId);
            transaction.update(clientRef, { 
                balance: firebase.firestore.FieldValue.increment(cn.amountMMK) 
            });
            
            if (txBusinessId) {
                const businessRef = db.collection('businesses').doc(txBusinessId);
                transaction.update(businessRef, { 
                    balance: firebase.firestore.FieldValue.increment(cn.amountMMK) 
                });
            }
            if (balanceRef) {
                if (balanceDoc?.exists) {
                    transaction.update(balanceRef, {
                        balance: firebase.firestore.FieldValue.increment(cn.amountMMK),
                        updatedAt: getMyanmarISOString(),
                    });
                } else {
                    transaction.set(balanceRef, {
                        clientId: txClientId,
                        businessId: txBusinessId,
                        balance: cn.amountMMK,
                        createdAt: getMyanmarISOString(),
                        updatedAt: getMyanmarISOString(),
                    });
                }
            }
        }
        
        transaction.delete(creditNoteRef);
    });

    if (businessId) {
        try {
            await syncFinanceCustomerBalance(clientId, businessId);
        } catch (error) {
            console.error("Failed to sync client/business balance after credit note deletion:", error);
        }
    }
    
    void logActivityHelper('CreditNotes', 'Delete', `Deleted credit note: ${creditNoteId}`, creditNoteId);
};

// Balance Adjustments
export const apiGetBalanceAdjustments = (): Promise<BalanceAdjustment[]> =>
    fetchCollection('balance_adjustments', { field: 'adjustmentDate', direction: 'desc' });

export const apiGetBalanceAdjustmentsForPeriod = async (startDate: string, endDate: string, limit = 2000): Promise<BalanceAdjustment[]> => {
    const snapshot = await db.collection('balance_adjustments')
        .where('adjustmentDate', '>=', startDate)
        .where('adjustmentDate', '<=', endDate)
        .orderBy('adjustmentDate', 'desc')
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as BalanceAdjustment);
};

export const apiGetBalanceAdjustmentsForClient = (clientId: string): Promise<BalanceAdjustment[]> =>
    fetchCollectionByField<BalanceAdjustment>('balance_adjustments', 'clientId', clientId);

export const apiGetBalanceAdjustmentsForBusiness = (businessId: string): Promise<BalanceAdjustment[]> =>
    fetchCollectionByField<BalanceAdjustment>('balance_adjustments', 'businessId', businessId);

export const apiGetBalanceAdjustmentsForEmployee = (employeeId: string): Promise<BalanceAdjustment[]> =>
    fetchCollectionByField<BalanceAdjustment>('balance_adjustments', 'employeeId', employeeId);

export const apiGetBalanceAdjustmentById = (adjustmentId: string): Promise<BalanceAdjustment | null> =>
    fetchDocumentById<BalanceAdjustment>('balance_adjustments', adjustmentId);

export const apiCreateBalanceAdjustment = async (
    adjustmentData: Omit<BalanceAdjustment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BalanceAdjustment> => {
    if (adjustmentData.clientId && adjustmentData.businessId) {
        await requireLinkedPair(adjustmentData.clientId, adjustmentData.businessId, 'apiCreateBalanceAdjustment');
    }
    const newId = await getNextId(BALANCE_ADJUSTMENT_ID_PREFIX);
    const adjustmentRef = db.collection('balance_adjustments').doc(newId);
    
    await db.runTransaction(async (transaction) => {
        const clientRef = db.collection('clients').doc(adjustmentData.clientId);
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) {
            throw new Error("Client not found.");
        }
        if (!adjustmentData.businessId) {
            throw new Error("Business is required.");
        }
        const businessRef = db.collection('businesses').doc(adjustmentData.businessId);
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error("Business not found.");
        }
        if (adjustmentData.amountMMK <= 0) {
            throw new Error("Adjustment amount must be greater than 0.");
        }
        
        const balanceId = `${adjustmentData.clientId}_${adjustmentData.businessId}`;
        const balanceRef = db.collection('client_business_balances').doc(balanceId);
        const balanceDoc = await transaction.get(balanceRef);
        
        const sign = adjustmentData.type === BalanceAdjustmentType.INCREASE ? 1 : -1;
        const balanceDelta = sign * adjustmentData.amountMMK;
        
        const cleanData: any = {};
        Object.keys(adjustmentData).forEach(key => {
            const value = (adjustmentData as any)[key];
            if (value !== undefined) {
                cleanData[key] = value;
            }
        });
        
        transaction.set(adjustmentRef, {
            ...cleanData,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
        
        // Formula: Total Billed += adj_inc or -= adj_dec. INCREASE -> +amount, DECREASE -> -amount
        transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(balanceDelta) });
        transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(balanceDelta) });
        
        if (balanceDoc.exists) {
            transaction.update(balanceRef, {
                balance: firebase.firestore.FieldValue.increment(balanceDelta),
                updatedAt: getMyanmarISOString(),
            });
        } else {
            transaction.set(balanceRef, {
                clientId: adjustmentData.clientId,
                businessId: adjustmentData.businessId,
                balance: balanceDelta,
                openingBalance: 0,
                createdAt: getMyanmarISOString(),
                updatedAt: getMyanmarISOString(),
            });
        }
    });
    
    const docSnap = await adjustmentRef.get();
    const result = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as BalanceAdjustment;
    
    try {
        await syncFinanceCustomerBalance(adjustmentData.clientId, adjustmentData.businessId);
    } catch (error) {
        console.error("Failed to sync balance after adjustment:", error);
    }
    
    void logActivityHelper('BalanceAdjustments', 'Create', `Recorded balance adjustment: ${result.id}`, result.id, {
        amount: result.amountMMK,
        type: result.type,
    });
    return result;
};

export const apiDeleteBalanceAdjustment = async (adjustmentId: string): Promise<void> => {
    const adjustmentDoc = await db.collection('balance_adjustments').doc(adjustmentId).get();
    if (!adjustmentDoc.exists) {
        throw new Error("Balance adjustment not found.");
    }
    const adjustment = adjustmentDoc.data() as BalanceAdjustment;
    
    await db.runTransaction(async (transaction) => {
        const adjustmentRef = db.collection('balance_adjustments').doc(adjustmentId);
        const currentDoc = await transaction.get(adjustmentRef);
        if (!currentDoc.exists) {
            throw new Error("Balance adjustment not found.");
        }
        
        const balanceId = `${adjustment.clientId}_${adjustment.businessId}`;
        const balanceRef = db.collection('client_business_balances').doc(balanceId);
        const balanceDoc = await transaction.get(balanceRef);
        
        const sign = adjustment.type === BalanceAdjustmentType.INCREASE ? 1 : -1;
        const balanceDelta = -sign * adjustment.amountMMK;
        
        transaction.update(db.collection('clients').doc(adjustment.clientId), {
            balance: firebase.firestore.FieldValue.increment(balanceDelta),
        });
        transaction.update(db.collection('businesses').doc(adjustment.businessId), {
            balance: firebase.firestore.FieldValue.increment(balanceDelta),
        });
        
        if (balanceDoc.exists) {
            transaction.update(balanceRef, {
                balance: firebase.firestore.FieldValue.increment(balanceDelta),
                updatedAt: getMyanmarISOString(),
            });
        }
        
        transaction.delete(adjustmentRef);
    });
    
    try {
        await syncFinanceCustomerBalance(adjustment.clientId, adjustment.businessId);
    } catch (error) {
        console.error("Failed to sync balance after adjustment deletion:", error);
    }
    
    void logActivityHelper('BalanceAdjustments', 'Delete', `Deleted balance adjustment: ${adjustmentId}`, adjustmentId);
};

export const apiDeleteRefund = async (refundId: string): Promise<void> => {
    // Get refund data first (before deletion) for recalculation
    const refund = await fetchDocumentById<Refund>('refunds', refundId);
    if (!refund) {
        throw new Error("Refund not found.");
    }
    
    const clientId = refund.clientId;
    const businessId = refund.businessId;
    
    await db.runTransaction(async (transaction) => {
        const refundRef = db.collection('refunds').doc(refundId);
        const refundDoc = await transaction.get(refundRef);
        
        if (!refundDoc.exists) {
            throw new Error("Refund not found.");
        }
        
        if (refund.status !== RefundStatus.PENDING) {
            throw new Error(`Cannot delete refund with status ${refund.status}. Only PENDING refunds can be deleted.`);
        }
        
        // Delete refund - reverse the balance effect
        // When refund was created: balance was decreased by -refund.amountMMK
        // When refund is deleted: balance should be increased by +refund.amountMMK
        const clientRef = db.collection('clients').doc(clientId);
        transaction.update(clientRef, { 
            balance: firebase.firestore.FieldValue.increment(refund.amountMMK) 
        });
        
        if (businessId) {
            const businessRef = db.collection('businesses').doc(businessId);
            transaction.update(businessRef, { 
                balance: firebase.firestore.FieldValue.increment(refund.amountMMK) 
            });
        }
        
        // Delete refund
        transaction.delete(refundRef);
    });
    
    // Recalculate pair (and client/business/finance_customers) from formula; transaction did not update pair doc
    try {
        await apiRecalculateClientBalance(clientId, businessId ?? undefined);
    } catch (error) {
        console.error("Failed to recalculate balance after refund deletion:", error);
        // Continue even if recalculation fails
    }

    void logActivityHelper('Refunds', 'Delete', `Deleted refund: ${refundId}`, refundId);
};

// Recalculate client-business pair, then sync client and business totals from pair sums.
// Pair: Total Billed = (opening + sales + adj_inc) - (credit_notes + adj_dec) - refunds; Outstanding = Total Billed - (payments + bad_debt)
// Client total = sum of pair Outstanding for all linked pairs; Business total = sum of pair Outstanding for all linked pairs
export const apiRecalculateClientBalance = async (clientId: string, businessId?: string): Promise<void> => {
    const client = await apiGetClientById(clientId);
    if (!client) {
        throw new Error("Client not found.");
    }
    
    if (businessId) {
        // Recalculate only the specific client-business balance
        const calculatedBalance = await apiCalculateClientBusinessBalance(clientId, businessId);
        await apiUpdateClientBusinessBalance(clientId, businessId, calculatedBalance, 'set');
        
        // Update client total balance (sum of all client-business balances)
        const totalBalance = await apiGetClientTotalBalance(clientId);
        await updateDocument('clients', clientId, { balance: totalBalance });
        
        // Update business total balance (sum of all client-business balances for this business)
        const balancesSnapshot = await db.collection('client_business_balances')
            .where('businessId', '==', businessId)
            .get();
        
        let businessTotalBalance = 0;
        balancesSnapshot.docs.forEach(doc => {
            const balanceData = doc.data() as ClientBusinessBalance;
            const openingBalance = balanceData.openingBalance || 0;
            businessTotalBalance += openingBalance + balanceData.balance;
        });
        
        await updateDocument('businesses', businessId, { balance: businessTotalBalance });
    } else {
        // Recalculate all client-business balances for the client
        await apiRecalculateAllClientBusinessBalances(clientId);
    }
    
    // Also update Customer balance in finance_customers collection (for Accounts Receivable)
    // finance_customers.balance should also NOT include openingBalance (consistent with clients/businesses)
    try {
        // Get client total balance (transaction balance only, without opening balance)
        const clientTotalBalance = await apiGetClientTotalBalance(clientId);
        // Extract transaction balance only (without opening balance)
        const clientBalanceData = await apiGetClientById(clientId);
        const transactionBalance = clientBalanceData?.balance || 0;
        
        const customerRef = db.collection('finance_customers').doc(clientId);
        const customerDoc = await customerRef.get();
        if (customerDoc.exists) {
            await customerRef.update({ balance: transactionBalance });
        } else {
            // Create customer record if it doesn't exist (should exist but handle edge case)
            await customerRef.set({
                id: clientId,
                name: client.name || clientId,
                currency: 'MMK',
                balance: transactionBalance, // balance field does NOT include openingBalance
            });
        }
        
        // Also update business customer record if businessId is provided
        if (businessId) {
            const business = await apiGetBusinessById(businessId);
            if (business) {
                const businessCustomerRef = db.collection('finance_customers').doc(businessId);
                const businessCustomerDoc = await businessCustomerRef.get();
                const businessTransactionBalance = business.balance || 0;
                
                if (businessCustomerDoc.exists) {
                    await businessCustomerRef.update({ balance: businessTransactionBalance });
                } else {
                    // Create business customer record if it doesn't exist
                    await businessCustomerRef.set({
                        id: businessId,
                        name: business.name || businessId,
                        currency: 'MMK',
                        balance: businessTransactionBalance, // balance field does NOT include openingBalance
                    });
                }
            }
        }
    } catch (error) {
        console.error("Failed to update finance customer balance:", error);
        // Don't throw - client/business balance update succeeded, customer sync is secondary
    }
};

/**
 * Delete invoice and its linked sales records (if any)
 * Returns information about deleted sales for warning display
 */
export const apiDeleteInvoice = async (invoiceId: string): Promise<{
    deletedSalesIds: string[];
    hasLinkedSales: boolean;
}> => {
    const deletedSalesIds: string[] = [];
    const salesByInvoiceSnapshot = await db.collection('sales')
        .where('invoiceId', '==', invoiceId)
        .get();
    const prelinkedSaleIds = salesByInvoiceSnapshot.docs.map(doc => doc.id);
    
    return db.runTransaction(async (transaction) => {
        // Firestore transactions require all reads before all writes
        // STEP 1: Read all necessary documents first
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new Error("Invoice not found for deletion.");
        }
        const invoiceData = invoiceDoc.data() as Invoice;

        // Read all sales linked to this invoice
        const linkedSales: SaleRecord[] = [];
        const linkedSaleIds = new Set<string>();
        const saleDocs = await Promise.all(
            prelinkedSaleIds.map(id => transaction.get(db.collection('sales').doc(id)))
        );
        saleDocs.forEach(doc => {
            if (!doc.exists) return;
            const sale = convertTimestamps({ id: doc.id, ...doc.data() }) as SaleRecord;
            if (sale.id) {
                linkedSales.push(sale);
                linkedSaleIds.add(sale.id);
            }
        });

        // Ensure legacy saleRecordId is included even if invoiceId wasn't set on the sale
        let legacySaleRef: firebase.firestore.DocumentReference | null = null;
        let legacySaleDoc: firebase.firestore.DocumentSnapshot | null = null;
        if (invoiceData.saleRecordId && !linkedSaleIds.has(invoiceData.saleRecordId)) {
            legacySaleRef = db.collection('sales').doc(invoiceData.saleRecordId);
            legacySaleDoc = await transaction.get(legacySaleRef);
            if (legacySaleDoc.exists) {
                const legacySale = convertTimestamps({ id: legacySaleDoc.id, ...legacySaleDoc.data() }) as SaleRecord;
                if (legacySale.id) {
                    linkedSales.push(legacySale);
                    linkedSaleIds.add(legacySale.id);
                }
            }
        }

        if (linkedSales.length > 0) {
            deletedSalesIds.push(...Array.from(linkedSaleIds));
        }
        
        // Read balance documents if needed
        let balanceDocLinked: firebase.firestore.DocumentSnapshot | null = null;

        const linkedSalesTotal = linkedSales
            .filter(sale => sale.status !== SaleStatus.DRAFT)
            .reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0);
        if (linkedSalesTotal !== 0 && invoiceData.businessId) {
            const balanceId = `${invoiceData.clientId}_${invoiceData.businessId}`;
            const balanceRef = db.collection('client_business_balances').doc(balanceId);
            balanceDocLinked = await transaction.get(balanceRef);
        }

        // Read quotation document if invoice was converted from a quotation
        let quotationDoc: firebase.firestore.DocumentSnapshot | null = null;
        const quotationRef = invoiceData.quotationId 
            ? db.collection('quotations').doc(invoiceData.quotationId)
            : null;
        if (quotationRef) {
            quotationDoc = await transaction.get(quotationRef);
        }

        // STEP 2: Now perform all writes
        // If invoice has linked sales (via invoiceId or saleRecordId), update balances and delete all linked sales
        if (linkedSales.length > 0) {
            const amountToDecrement = -linkedSalesTotal;
            if (amountToDecrement !== 0) {
                if (invoiceData.businessId) {
                    const balanceId = `${invoiceData.clientId}_${invoiceData.businessId}`;
                    const balanceRef = db.collection('client_business_balances').doc(balanceId);
                    if (balanceDocLinked?.exists) {
                        transaction.update(balanceRef, {
                            balance: firebase.firestore.FieldValue.increment(amountToDecrement),
                            updatedAt: getMyanmarISOString(),
                        });
                    }
                    const clientRef = db.collection('clients').doc(invoiceData.clientId);
                    transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountToDecrement) });
                    const businessRef = db.collection('businesses').doc(invoiceData.businessId);
                    transaction.update(businessRef, { balance: firebase.firestore.FieldValue.increment(amountToDecrement) });
                } else {
                    const clientRef = db.collection('clients').doc(invoiceData.clientId);
                    transaction.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amountToDecrement) });
                }
            }

            linkedSales.forEach(sale => {
                if (sale.id) {
                    const saleRef = db.collection('sales').doc(sale.id);
                    transaction.delete(saleRef);
                }
            });
        }
        
        // Delete the invoice
        transaction.delete(invoiceRef);

        // Revert quotation status if it was converted from a quotation
        if (quotationRef && quotationDoc?.exists) {
            transaction.update(quotationRef, { status: QuotationStatus.ACCEPTED, invoiceId: firebase.firestore.FieldValue.delete() });
        }
    }).then(() => {
        void logActivityHelper('Invoices', 'Delete', `Deleted invoice: ${invoiceId}${deletedSalesIds.length > 0 ? ` and ${deletedSalesIds.length} linked sale(s)` : ''}`, invoiceId, { deletedSalesIds });
        return {
            deletedSalesIds,
            hasLinkedSales: deletedSalesIds.length > 0
        };
    });
};


// Expenses
export const apiGetExpenses = (): Promise<Expense[]> => fetchCollection('expenses', { field: 'expenseDate', direction: 'desc' });
export const apiAddExpense = async (data: Omit<Expense, 'id'|'createdAt'|'updatedAt'|'receiptPhotoUrl'>): Promise<Expense> => {
    const expenseRef = db.collection('expenses').doc();
    
    await db.runTransaction(async (transaction) => {
        // IMPORTANT: All reads must be executed before any writes in Firestore transactions
        
        // Read source account if sourceAccountId is provided
        let accountDoc = null;
        if (data.sourceAccountId) {
            const accountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
            accountDoc = await transaction.get(accountRef);
        }
        
        // Now perform all writes after reads
        // Create expense record
        transaction.set(expenseRef, {
            ...data,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
        
        // Update source account balance if account exists
        if (data.sourceAccountId && accountDoc && accountDoc.exists) {
            const account = accountDoc.data() as CashAccount;
            const accountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
            // Update totalOutflow and recalculate balance using formula
            const newTotalOutflow = (account.totalOutflow || 0) + data.amountMMK;
            const initialBalance = account.initialBalance || 0;
            const newBalance = (initialBalance + (account.totalInflow || 0)) - newTotalOutflow;
            transaction.update(accountRef, {
                balance: newBalance,
                totalOutflow: newTotalOutflow,
            });
        }
    });
    
    const docSnap = await expenseRef.get();
    const expense = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Expense;
    
    void logActivityHelper('Expenses', 'Create Expense', `Recorded expense: ${expense.category}`, expense.id, {
        amount: expense.amountMMK,
        expenseDate: expense.expenseDate,
    });
    return expense;
};
export const apiUpdateExpense = async (data: Partial<Expense> & { id: string }): Promise<void> => {
    const oldExpense = await fetchDocumentById<Expense>('expenses', data.id);
    if (!oldExpense) throw new Error('Expense not found');
    
    await db.runTransaction(async (transaction) => {
        // IMPORTANT: All reads must be executed before any writes in Firestore transactions
        const expenseRef = db.collection('expenses').doc(data.id);
        
        // Read old and new accounts if sourceAccountId changed
        let oldAccountDoc = null;
        let newAccountDoc = null;
        let sameAccountDoc = null;
        
        if (oldExpense.sourceAccountId) {
            const oldAccountRef = db.collection('cash_accounts').doc(oldExpense.sourceAccountId);
            if (data.sourceAccountId && data.sourceAccountId !== oldExpense.sourceAccountId) {
                // Different account - read both
                oldAccountDoc = await transaction.get(oldAccountRef);
                const newAccountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
                newAccountDoc = await transaction.get(newAccountRef);
            } else if (data.amountMMK !== undefined || data.sourceAccountId === oldExpense.sourceAccountId) {
                // Same account or amount changed - read once
                sameAccountDoc = await transaction.get(oldAccountRef);
            } else {
                // Only reverting old account
                oldAccountDoc = await transaction.get(oldAccountRef);
            }
        } else if (data.sourceAccountId) {
            // New account assigned
            const newAccountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
            newAccountDoc = await transaction.get(newAccountRef);
        }
        
        // Now perform all writes after reads
        
        // Revert old balance impact if sourceAccountId existed
        if (oldExpense.sourceAccountId && oldAccountDoc && oldAccountDoc.exists) {
            const oldAccount = oldAccountDoc.data() as CashAccount;
            const oldAccountRef = db.collection('cash_accounts').doc(oldExpense.sourceAccountId);
            // Revert: recalculate balance using formula
            const revertedTotalOutflow = (oldAccount.totalOutflow || 0) - oldExpense.amountMMK;
            const initialBalance = oldAccount.initialBalance || 0;
            const revertedBalance = (initialBalance + (oldAccount.totalInflow || 0)) - revertedTotalOutflow;
            transaction.update(oldAccountRef, {
                balance: revertedBalance,
                totalOutflow: revertedTotalOutflow,
            });
        }
        
        // Apply new balance impact if sourceAccountId is provided
        if (data.sourceAccountId && data.amountMMK !== undefined) {
            if (data.sourceAccountId !== oldExpense.sourceAccountId && newAccountDoc && newAccountDoc.exists) {
                // Different account - update new account
                const newAccount = newAccountDoc.data() as CashAccount;
                const newAccountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
                // Update totalOutflow and recalculate balance using formula
                const newTotalOutflow = (newAccount.totalOutflow || 0) + data.amountMMK;
                const initialBalance = newAccount.initialBalance || 0;
                const newBalance = (initialBalance + (newAccount.totalInflow || 0)) - newTotalOutflow;
                transaction.update(newAccountRef, {
                    balance: newBalance,
                    totalOutflow: newTotalOutflow,
                });
            } else if (sameAccountDoc && sameAccountDoc.exists) {
                // Same account - recalculate balance using formula
                const sameAccount = sameAccountDoc.data() as CashAccount;
                const accountRef = db.collection('cash_accounts').doc(oldExpense.sourceAccountId);
                const newTotalOutflow = (sameAccount.totalOutflow || 0) - oldExpense.amountMMK + data.amountMMK;
                const initialBalance = sameAccount.initialBalance || 0;
                const newBalance = (initialBalance + (sameAccount.totalInflow || 0)) - newTotalOutflow;
                transaction.update(accountRef, {
                    balance: newBalance,
                    totalOutflow: newTotalOutflow,
                });
            }
        }
        
        // Update expense record
        transaction.update(expenseRef, {
            ...data,
            updatedAt: getMyanmarISOString(),
        });
    });
    
    void logActivityHelper('Expenses', 'Update Expense', `Updated expense: ${data.id}`, data.id, data);
};
export const apiDeleteExpense = async (id: string): Promise<void> => {
    const expense = await fetchDocumentById<Expense>('expenses', id);
    if (!expense) throw new Error('Expense not found');
    
    await db.runTransaction(async (transaction) => {
        const expenseRef = db.collection('expenses').doc(id);
        
        // Revert balance impact if sourceAccountId existed
        if (expense.sourceAccountId) {
            const accountRef = db.collection('cash_accounts').doc(expense.sourceAccountId);
            const accountDoc = await transaction.get(accountRef);
            if (accountDoc.exists) {
                const account = accountDoc.data() as CashAccount;
                // Revert: recalculate balance using formula
                const revertedTotalOutflow = (account.totalOutflow || 0) - expense.amountMMK;
                const initialBalance = account.initialBalance || 0;
                const revertedBalance = (initialBalance + (account.totalInflow || 0)) - revertedTotalOutflow;
                transaction.update(accountRef, {
                    balance: revertedBalance,
                    totalOutflow: revertedTotalOutflow,
                });
            }
        }
        
        // Delete expense record
        transaction.delete(expenseRef);
    });
    
    void logActivityHelper('Expenses', 'Delete Expense', `Deleted expense: ${id}`, id);

    if (expense.sourceAccountId) {
        const updatedAccount = await fetchDocumentById<CashAccount>('cash_accounts', expense.sourceAccountId);
        if (updatedAccount) {
            const index = financeStore.cashAccounts.findIndex(acc => acc.id === updatedAccount.id);
            if (index !== -1) {
                financeStore.cashAccounts[index] = updatedAccount;
            }
        }
    }
};
export const apiGetExpensesForPeriod = async (startDate: string, endDate: string): Promise<Expense[]> => {
    const snapshot = await db.collection('expenses')
        .where('expenseDate', '>=', startDate)
        .where('expenseDate', '<=', endDate)
        .get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Expense);
};

// Visa Cards
export const apiGetVisaCards = (): Promise<VisaCard[]> => fetchCollection('visa_cards');
export const apiAddVisaCard = async (data: Omit<VisaCard, 'id'>): Promise<VisaCard> => {
    const result = await addDocument('visa_cards', data as Partial<VisaCard>, 'VC_', false);
    void logActivityHelper('Cash & Treasury', 'Create Visa Card', `Created visa card: ${result.id}`, result.id);
    return result;
};
export const apiUpdateVisaCard = async (data: Partial<VisaCard> & { id: string }): Promise<void> => {
    await updateDocument('visa_cards', data.id, data);
    void logActivityHelper('Cash & Treasury', 'Update Visa Card', `Updated visa card: ${data.id}`, data.id);
};
export const apiDeleteVisaCard = async (cardId: string): Promise<void> => {
    const reloadsSnapshot = await db.collection('visa_reloads').where('cardId', '==', cardId).limit(1).get();
    if (!reloadsSnapshot.empty) {
        throw new Error("Cannot delete card: It has existing reload records. Please delete them first.");
    }
    await deleteDocument('visa_cards', cardId);
    void logActivityHelper('Cash & Treasury', 'Delete Visa Card', `Deleted visa card: ${cardId}`, cardId);
};
export const apiRecordVisaReload = async (data: Omit<VisaReload, 'id'>): Promise<VisaReload> => {
    const reloadRef = db.collection('visa_reloads').doc();
    
    await db.runTransaction(async (transaction) => {
        // IMPORTANT: All reads must be executed before any writes in Firestore transactions
        
        // Read source account balance if sourceAccountId is provided
        let accountDoc = null;
        if (data.sourceAccountId) {
            const accountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
            accountDoc = await transaction.get(accountRef);
        }
        
        // Now perform all writes after reads
        // Create reload record
        transaction.set(reloadRef, {
            ...data,
            createdAt: getMyanmarISOString(),
        });
        
        // Update source account balance if account exists
        if (data.sourceAccountId && accountDoc && accountDoc.exists) {
            const account = accountDoc.data() as CashAccount;
            const accountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
            // Update totalOutflow and recalculate balance using formula
            const newTotalOutflow = (account.totalOutflow || 0) + data.amountMMK;
            const initialBalance = account.initialBalance || 0;
            const newBalance = (initialBalance + (account.totalInflow || 0)) - newTotalOutflow;
            transaction.update(accountRef, {
                balance: newBalance,
                totalOutflow: newTotalOutflow,
            });
        }
    });
    
    const docSnap = await reloadRef.get();
    const reload = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as VisaReload;
    
    void logActivityHelper('Cash & Treasury', 'Visa Reload', `Recorded visa reload for card ${reload.cardId}`, reload.id, {
        amount: reload.amountMMK,
        reloadDate: reload.reloadDate,
        sourceAccountId: reload.sourceAccountId,
    });
    return reload;
};
export const apiUpdateVisaReload = async (data: Partial<VisaReload> & { id: string }): Promise<void> => {
    const oldReload = await fetchDocumentById<VisaReload>('visa_reloads', data.id);
    if (!oldReload) throw new Error('Visa reload not found');
    
    await db.runTransaction(async (transaction) => {
        const reloadRef = db.collection('visa_reloads').doc(data.id);
        
        // IMPORTANT: All reads must be executed before any writes in Firestore transactions
        
        // Read all account documents first
        let oldAccountDoc = null;
        let newAccountDoc = null;
        let sameAccountDoc = null;
        
        if (oldReload.sourceAccountId) {
            const oldAccountRef = db.collection('cash_accounts').doc(oldReload.sourceAccountId);
            oldAccountDoc = await transaction.get(oldAccountRef);
        }
        
        if (data.sourceAccountId && data.amountMMK !== undefined) {
            if (data.sourceAccountId !== oldReload.sourceAccountId) {
                // Different account - read new account
                const newAccountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
                newAccountDoc = await transaction.get(newAccountRef);
            } else {
                // Same account - read it once
                const accountRef = db.collection('cash_accounts').doc(oldReload.sourceAccountId);
                sameAccountDoc = await transaction.get(accountRef);
            }
        } else if (data.amountMMK !== undefined && oldReload.sourceAccountId) {
            // Amount changed but same account
            const accountRef = db.collection('cash_accounts').doc(oldReload.sourceAccountId);
            sameAccountDoc = await transaction.get(accountRef);
        }
        
        // Now perform all writes after reads
        
        // Revert old balance impact if sourceAccountId existed
        if (oldReload.sourceAccountId && oldAccountDoc && oldAccountDoc.exists) {
            const oldAccount = oldAccountDoc.data() as CashAccount;
            const oldAccountRef = db.collection('cash_accounts').doc(oldReload.sourceAccountId);
            // Revert: recalculate balance using formula
            const revertedTotalOutflow = (oldAccount.totalOutflow || 0) - oldReload.amountMMK;
            const initialBalance = oldAccount.initialBalance || 0;
            const revertedBalance = (initialBalance + (oldAccount.totalInflow || 0)) - revertedTotalOutflow;
            transaction.update(oldAccountRef, {
                balance: revertedBalance,
                totalOutflow: revertedTotalOutflow,
            });
        }
        
        // Apply new balance impact if sourceAccountId is provided
        if (data.sourceAccountId && data.amountMMK !== undefined) {
            if (data.sourceAccountId !== oldReload.sourceAccountId && newAccountDoc && newAccountDoc.exists) {
                // Different account - update new account
                const newAccount = newAccountDoc.data() as CashAccount;
                const newAccountRef = db.collection('cash_accounts').doc(data.sourceAccountId);
                // Update totalOutflow and recalculate balance using formula
                const newTotalOutflow = (newAccount.totalOutflow || 0) + data.amountMMK;
                const initialBalance = newAccount.initialBalance || 0;
                const newBalance = (initialBalance + (newAccount.totalInflow || 0)) - newTotalOutflow;
                transaction.update(newAccountRef, {
                    balance: newBalance,
                    totalOutflow: newTotalOutflow,
                });
            } else if (sameAccountDoc && sameAccountDoc.exists) {
                // Same account - recalculate balance using formula
                const sameAccount = sameAccountDoc.data() as CashAccount;
                const accountRef = db.collection('cash_accounts').doc(oldReload.sourceAccountId);
                const newTotalOutflow = (sameAccount.totalOutflow || 0) - oldReload.amountMMK + data.amountMMK;
                const initialBalance = sameAccount.initialBalance || 0;
                const newBalance = (initialBalance + (sameAccount.totalInflow || 0)) - newTotalOutflow;
                transaction.update(accountRef, {
                    balance: newBalance,
                    totalOutflow: newTotalOutflow,
                });
            }
        }
        
        // Update reload record
        transaction.update(reloadRef, {
            ...data,
            updatedAt: getMyanmarISOString(),
        });
    });
    
    void logActivityHelper('Cash & Treasury', 'Update Visa Reload', `Updated visa reload ${data.id}`, data.id, data);
};
export const apiDeleteVisaReload = async (id: string): Promise<void> => {
    const reload = await fetchDocumentById<VisaReload>('visa_reloads', id);
    if (!reload) throw new Error('Visa reload not found');
    
    await db.runTransaction(async (transaction) => {
        const reloadRef = db.collection('visa_reloads').doc(id);
        
        // Revert balance impact if sourceAccountId existed
        if (reload.sourceAccountId) {
            const accountRef = db.collection('cash_accounts').doc(reload.sourceAccountId);
            const accountDoc = await transaction.get(accountRef);
            if (accountDoc.exists) {
                const account = accountDoc.data() as CashAccount;
                // Revert: recalculate balance using formula
                const revertedTotalOutflow = (account.totalOutflow || 0) - reload.amountMMK;
                const initialBalance = account.initialBalance || 0;
                const revertedBalance = (initialBalance + (account.totalInflow || 0)) - revertedTotalOutflow;
                transaction.update(accountRef, {
                    balance: revertedBalance,
                    totalOutflow: revertedTotalOutflow,
                });
            }
        }
        
        // Delete reload record
        transaction.delete(reloadRef);
    });
    
    void logActivityHelper('Cash & Treasury', 'Delete Visa Reload', `Deleted visa reload ${id}`, id);

    if (reload.sourceAccountId) {
        const updatedAccount = await fetchDocumentById<CashAccount>('cash_accounts', reload.sourceAccountId);
        if (updatedAccount) {
            const index = financeStore.cashAccounts.findIndex(acc => acc.id === updatedAccount.id);
            if (index !== -1) {
                financeStore.cashAccounts[index] = updatedAccount;
            }
        }
    }
};
export const apiGetVisaReloadsForCard = async (cardId: string, year: number, month: number): Promise<VisaReload[]> => {
    // Create dates in Yangon timezone
    const startDateObj = new Date(year, month - 1, 1);
    const endDateObj = new Date(year, month, 0);
    const startDate = getDateInYangonTimezone(startDateObj);
    const endDate = getDateInYangonTimezone(endDateObj);
    
    // Query only by cardId to avoid composite index requirement.
    const snapshot = await db.collection('visa_reloads')
        .where('cardId', '==', cardId)
        .get();
        
    const allReloadsForCard = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as VisaReload);
    
    // Filter by date and sort on the client side.
    const filteredReloads = allReloadsForCard.filter(reload => 
        reload.reloadDate >= startDate && reload.reloadDate <= endDate
    );

    return filteredReloads.sort((a, b) => new Date(b.reloadDate).getTime() - new Date(a.reloadDate).getTime());
};
export const apiGetVisaReloadsForPeriod = async (startDate: string, endDate: string, cardId?: string): Promise<VisaReload[]> => {
    let snapshot;
    if (cardId) {
        // Query only by cardId to avoid composite index requirement, then filter by date on client side
        snapshot = await db.collection('visa_reloads')
            .where('cardId', '==', cardId)
            .get();
    } else {
        // For period queries without cardId, use date range (may require index but is common query)
        snapshot = await db.collection('visa_reloads')
            .where('reloadDate', '>=', startDate)
            .where('reloadDate', '<=', endDate)
            .get();
    }
    
    const reloads = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as VisaReload);
    
    // Filter by date on client side if cardId was provided
    if (cardId) {
        return reloads.filter(reload => reload.reloadDate >= startDate && reload.reloadDate <= endDate)
            .sort((a, b) => new Date(b.reloadDate).getTime() - new Date(a.reloadDate).getTime());
    }
    
    return reloads;
};

// Visa Card Spend
export const apiRecordVisaCardSpend = async (data: Omit<VisaCardSpend, 'id' | 'createdAt'>): Promise<VisaCardSpend> => {
    const spendRef = db.collection('visa_card_spends').doc();
    
    await db.runTransaction(async (transaction) => {
        transaction.set(spendRef, {
            ...data,
            createdAt: getMyanmarISOString(),
        });
    });
    
    const docSnap = await spendRef.get();
    const spend = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as VisaCardSpend;
    
    void logActivityHelper('Cash & Treasury', 'Visa Card Spend', `Recorded spend for card ${spend.cardId}`, spend.id, {
        amountUSD: spend.amountUSD,
        amountMMK: spend.amountMMK,
        spendDate: spend.spendDate,
    });
    return spend;
};

export const apiUpdateVisaCardSpend = async (data: Partial<VisaCardSpend> & { id: string }): Promise<void> => {
    await updateDocument('visa_card_spends', data.id, {
        ...data,
        updatedAt: getMyanmarISOString(),
    });
    void logActivityHelper('Cash & Treasury', 'Update Visa Card Spend', `Updated visa card spend ${data.id}`, data.id, data);
};

export const apiDeleteVisaCardSpend = async (id: string): Promise<void> => {
    await deleteDocument('visa_card_spends', id);
    void logActivityHelper('Cash & Treasury', 'Delete Visa Card Spend', `Deleted visa card spend ${id}`, id);
};

export const apiGetVisaCardSpends = async (cardId?: string): Promise<VisaCardSpend[]> => {
    let snapshot;
    if (cardId) {
        // Query only by cardId to avoid composite index requirement, then sort on client side
        snapshot = await db.collection('visa_card_spends')
            .where('cardId', '==', cardId)
            .get();
    } else {
        snapshot = await db.collection('visa_card_spends')
            .orderBy('spendDate', 'desc')
            .get();
    }
    const spends = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as VisaCardSpend);
    
    // Sort by date descending on client side if filtering by cardId
    if (cardId) {
        return spends.sort((a, b) => new Date(b.spendDate).getTime() - new Date(a.spendDate).getTime());
    }
    
    return spends;
};

// Daily Exchange Rate
export const apiGetDailyExchangeRates = async (startDate?: string, endDate?: string): Promise<DailyExchangeRate[]> => {
    try {
        let query: any = db.collection('daily_exchange_rates');
        
        // Apply where clauses first (required before orderBy when using range queries)
        if (startDate && endDate) {
            // Both start and end date - use range query
            query = query.where('date', '>=', startDate).where('date', '<=', endDate).orderBy('date', 'desc');
        } else if (startDate) {
            // Only start date
            query = query.where('date', '>=', startDate).orderBy('date', 'desc');
        } else if (endDate) {
            // Only end date
            query = query.where('date', '<=', endDate).orderBy('date', 'desc');
        } else {
            // No filters - just order by date
            query = query.orderBy('date', 'desc');
        }
        
        const snapshot = await query.get();
        const rates = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as DailyExchangeRate);
        
        // Sort by date descending on client side as fallback
        return rates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Error fetching daily exchange rates:", error);
        // If query fails (e.g., missing index), try fetching all and filtering client-side
        const snapshot = await db.collection('daily_exchange_rates').get();
        let rates = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as DailyExchangeRate);
        
        // Filter by date range on client side
        if (startDate) {
            rates = rates.filter(rate => rate.date >= startDate);
        }
        if (endDate) {
            rates = rates.filter(rate => rate.date <= endDate);
        }
        
        // Sort by date descending
        return rates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
};

export const apiGetDailyExchangeRateByDate = async (date: string): Promise<DailyExchangeRate | null> => {
    const snapshot = await db.collection('daily_exchange_rates')
        .where('date', '==', date)
        .limit(1)
        .get();
    
    if (snapshot.empty) {
        return null;
    }
    
    const doc = snapshot.docs[0];
    return convertTimestamps({ id: doc.id, ...doc.data() }) as DailyExchangeRate;
};

export const apiRecordDailyExchangeRate = async (data: Omit<DailyExchangeRate, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyExchangeRate> => {
    // Check if rate already exists for this date
    const existing = await apiGetDailyExchangeRateByDate(data.date);
    
    if (existing) {
        // Update existing rate
        await updateDocument('daily_exchange_rates', existing.id, {
            rate: data.rate,
            recordedByUserId: data.recordedByUserId,
            updatedAt: getMyanmarISOString(),
        });
        
        const updatedDoc = await db.collection('daily_exchange_rates').doc(existing.id).get();
        return convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as DailyExchangeRate;
    } else {
        // Create new rate
        const rateRef = db.collection('daily_exchange_rates').doc();
        await db.runTransaction(async (transaction) => {
            transaction.set(rateRef, {
                ...data,
                createdAt: getMyanmarISOString(),
            });
        });
        
        const docSnap = await rateRef.get();
        const rate = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as DailyExchangeRate;
        
        void logActivityHelper('Cash & Treasury', 'Daily Exchange Rate', `Recorded exchange rate for ${data.date}: ${data.rate} MMK/USD`, rate.id, {
            date: data.date,
            rate: data.rate,
        });
        return rate;
    }
};

export const apiUpdateDailyExchangeRate = async (data: Partial<DailyExchangeRate> & { id: string }): Promise<void> => {
    await updateDocument('daily_exchange_rates', data.id, {
        ...data,
        updatedAt: getMyanmarISOString(),
    });
    void logActivityHelper('Cash & Treasury', 'Update Daily Exchange Rate', `Updated daily exchange rate ${data.id}`, data.id, data);
};

export const apiDeleteDailyExchangeRate = async (id: string): Promise<void> => {
    await deleteDocument('daily_exchange_rates', id);
    void logActivityHelper('Cash & Treasury', 'Delete Daily Exchange Rate', `Deleted daily exchange rate ${id}`, id);
};


// Tasks & Projects
export const apiGetTasks = (limit?: number): Promise<Task[]> => fetchCollection('tasks', { field: 'createdAt', direction: 'desc' }, limit);
export const apiGetTaskById = (id: string): Promise<Task | null> => fetchDocumentById('tasks', id);
export const apiGetTasksForEmployee = async (employeeId: string): Promise<Task[]> => {
    const [assigneeSnap, createdSnap] = await Promise.all([
        db.collection('tasks').where('assigneeIds', 'array-contains', employeeId).get(),
        db.collection('tasks').where('createdByUserId', '==', employeeId).get(),
    ]);
    const seen = new Set<string>();
    const merged: Task[] = [];
    [...assigneeSnap.docs, ...createdSnap.docs].forEach(doc => {
        if (!seen.has(doc.id)) {
            seen.add(doc.id);
            merged.push(convertTimestamps({ id: doc.id, ...doc.data() }) as Task);
        }
    });
    return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const apiAddTask = async (
    data: Omit<Task, 'id'|'createdAt'|'updatedAt'>, 
    loggedInUserId: string,
    newFiles: File[] = []
): Promise<Task> => {
    const newId = await getNextId(TASK_ID_PREFIX);
    const taskRef = db.collection('tasks').doc(newId);

    const newAttachments: Attachment[] = [];
    if (newFiles.length > 0) {
        for (const file of newFiles) {
            const uploadPath = `task_attachments/${newId}/${Date.now()}_${file.name}`;
            const downloadURL = await apiUploadFile(file, uploadPath);
            newAttachments.push({
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                uploadedBy: loggedInUserId,
            });
        }
    }

    const dataToSet: Partial<Task> = {
        ...data,
        attachments: newAttachments,
        createdAt: getMyanmarISOString() as any,
        updatedAt: getMyanmarISOString() as any,
    };

    await taskRef.set(dataToSet);

    const docSnap = await taskRef.get();
    const newTask = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Task;

    if (newTask.assigneeIds && newTask.assigneeIds.length > 0) {
        for (const assigneeId of newTask.assigneeIds) {
            if (assigneeId !== loggedInUserId) {
                apiSendNotification(assigneeId, {
                    title: 'New Task Assigned',
                    message: `You have been assigned a new task: "${newTask.title}".`,
                    type: 'info',
                    link: `/tasks/${newTask.id}`
                }).catch(err => console.error(`Failed to send notification to ${assigneeId}`, err));
            }
        }
    }
    void logActivityHelper('Tasks', 'Create', `Created task: ${newTask.title}`, newTask.id, { status: newTask.status, priority: newTask.priority });
    return newTask;
};

export const apiUpdateTask = async (
    data: Partial<Task> & {id: string}, 
    loggedInUserId: string,
    newFiles: File[] = [],
    attachmentsToRemove: Attachment[] = []
): Promise<void> => {
    const taskRef = db.collection('tasks').doc(data.id);

    // 1. Upload new files first to get their URLs
    const newAttachments: Attachment[] = [];
    if (newFiles.length > 0) {
        for (const file of newFiles) {
            const uploadPath = `task_attachments/${data.id}/${Date.now()}_${file.name}`;
            const downloadURL = await apiUploadFile(file, uploadPath);
            newAttachments.push({
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                uploadedBy: loggedInUserId,
            });
        }
    }

    // 2. Run transaction to update Firestore
    await db.runTransaction(async (transaction) => {
        const oldTaskDoc = await transaction.get(taskRef);
        if (!oldTaskDoc.exists) {
            throw new Error("Task not found for update.");
        }
        const oldTaskData = oldTaskDoc.data() as Task;
        
        let finalAttachments = oldTaskData.attachments || [];
        if (attachmentsToRemove.length > 0) {
            const urlsToRemove = new Set(attachmentsToRemove.map(att => att.url));
            finalAttachments = finalAttachments.filter(att => !urlsToRemove.has(att.url));
        }
        if (newAttachments.length > 0) {
            finalAttachments.push(...newAttachments);
        }

        const updatePayload = { ...data, attachments: finalAttachments };
        transaction.update(taskRef, { ...updatePayload, updatedAt: getMyanmarISOString() });
        
        // Notification logic...
        const changes: string[] = [];
        if (data.status && data.status !== oldTaskData.status) changes.push(`status changed to "${data.status}"`);
        if (data.priority && data.priority !== oldTaskData.priority) changes.push(`priority set to "${data.priority}"`);
        if (data.dueDate && data.dueDate !== oldTaskData.dueDate) changes.push(`due date updated to ${formatDateForDisplay(data.dueDate)}`);
        if (JSON.stringify(data.assigneeIds) !== JSON.stringify(oldTaskData.assigneeIds)) changes.push('assignees were updated');
        if (newFiles.length > 0 || attachmentsToRemove.length > 0) changes.push('attachments were updated');

        if (changes.length > 0) {
            const allAssignees = new Set([...(oldTaskData.assigneeIds || []), ...(data.assigneeIds || [])]);
            for (const assigneeId of allAssignees) {
                if (assigneeId !== loggedInUserId) {
                    apiSendNotification(assigneeId, {
                        title: 'Task Updated',
                        message: `Task "${oldTaskData.title}" was updated. Changes: ${changes.join(', ')}.`,
                        type: 'info',
                        link: `/tasks/${data.id}`
                    }).catch(err => console.error(`Failed to send update notification to ${assigneeId}`, err));
                }
            }
        }
    });

    // 3. Delete old files from storage after successful transaction
    if (attachmentsToRemove.length > 0) {
        for (const attachment of attachmentsToRemove) {
            try {
                const fileRef = storage.refFromURL(attachment.url);
                await fileRef.delete();
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.warn(`Could not delete attachment from storage: ${attachment.url}`, error);
                }
            }
        }
    }
    void logActivityHelper('Tasks', 'Update', `Updated task: ${data.id}`, data.id);
};

export const apiDeleteTask = async (taskId: string): Promise<void> => {
    const subtasksSnapshot = await db.collection('tasks').where('parentId', '==', taskId).limit(1).get();
    if (!subtasksSnapshot.empty) {
        throw new Error("Cannot delete task. Please delete its sub-tasks first.");
    }
    await db.collection('tasks').doc(taskId).delete();
    void logActivityHelper('Tasks', 'Delete', `Deleted task: ${taskId}`, taskId);
};

export const apiGetTaskLists = (): Promise<TaskList[]> => fetchCollection('task_lists', { field: 'order', direction: 'asc' });
export const apiAddTaskList = async (data: Omit<TaskList, 'id' | 'createdAt'>): Promise<TaskList> => {
    const taskList = await addDocument('task_lists', data as Partial<TaskList>, TASK_LIST_ID_PREFIX);
    void logActivityHelper('Tasks', 'Create List', `Created task list: ${taskList.name}`, taskList.id);
    return taskList;
};
export const apiUpdateTaskList = async (data: Partial<TaskList> & { id: string }): Promise<void> => {
    await updateDocument('task_lists', data.id, data);
    void logActivityHelper('Tasks', 'Update List', `Updated task list: ${data.id}`, data.id);
};
export const apiDeleteTaskList = async (id: string): Promise<void> => {
    await deleteDocument('task_lists', id);
    void logActivityHelper('Tasks', 'Delete List', `Deleted task list: ${id}`, id);
};

export const apiGetProjects = (): Promise<Project[]> => fetchCollection('projects', { field: 'createdAt', direction: 'desc' });
export const apiGetProjectById = (id: string): Promise<Project | null> => fetchDocumentById('projects', id);
export const apiAddProject = async (data: Omit<Project, 'id'|'createdAt'|'updatedAt'>): Promise<Project> => {
    const project = await addDocument('projects', data as Partial<Project>, PROJECT_ID_PREFIX);
    void logActivityHelper('Projects', 'Create', `Created project: ${project.name}`, project.id, { clientId: project.clientId, businessId: project.businessId });
    return project;
};
export const apiUpdateProject = async (data: Partial<Project> & {id: string}): Promise<void> => {
    await updateDocument('projects', data.id, data);
    void logActivityHelper('Projects', 'Update', `Updated project: ${data.id}`, data.id);
};
export const apiDeleteProject = async (id: string): Promise<void> => {
    await deleteDocument('projects', id);
    void logActivityHelper('Projects', 'Delete', `Deleted project: ${id}`, id);
};

// Settings
export const apiGetCompanyProfile = (): Promise<CompanyProfileSetting | null> => fetchSingletonDocument<CompanyProfileSetting>('settings', 'companyProfile');

export const apiUpdateCompanyProfile = async (data: CompanyProfileSetting, files: { logo?: File | null, letterhead?: File | null, posLetterhead?: File | null }): Promise<CompanyProfileSetting> => {
    // Create a mutable copy of the data from the form
    const profileToUpdate = { ...data };

    // If a new logo file exists, upload it and update the URL
    if (files.logo) {
        const newLogoUrl = await apiUploadFile(files.logo, `company/logo.jpg`);
        profileToUpdate.logoUrl = newLogoUrl;
    }

    // If a new letterhead file exists, upload it and update the URL and filename
    if (files.letterhead) {
        const newLetterheadUrl = await apiUploadFile(files.letterhead, `company/letterhead.jpg`);
        profileToUpdate.letterheadImageUrl = newLetterheadUrl;
        profileToUpdate.letterheadFileName = files.letterhead.name;
    }

    // If a new POS letterhead file exists, upload it and update the URL and filename
    if (files.posLetterhead) {
        const newPOSLetterheadUrl = await apiUploadFile(files.posLetterhead, `company/pos_letterhead.jpg`);
        profileToUpdate.posLetterheadImageUrl = newPOSLetterheadUrl;
        profileToUpdate.posLetterheadFileName = files.posLetterhead.name;
    }

    // Save the final, potentially updated, profile data to Firestore
    await db.collection('settings').doc('companyProfile').set(profileToUpdate, { merge: true });
    
    // Fetch and return the fresh profile to ensure the UI has the latest data
    const freshProfile = await apiGetCompanyProfile();
    if (!freshProfile) {
        // This case should be rare, but it's good to handle.
        // It means the document was deleted right after we updated it.
        throw new Error("Company profile could not be retrieved after update.");
    }
    void logActivityHelper('Settings', 'Update Company Profile', `Updated company profile`, 'companyProfile', { companyName: freshProfile.companyName });
    return freshProfile;
};

export const apiDeleteSalesDataForPeriod = async (startDate: string, endDate: string): Promise<{ deletedCount: number }> => {
    const salesToDelete = await apiGetSalesForPeriod(startDate, endDate);
    if (salesToDelete.length === 0) {
        return { deletedCount: 0 };
    }
    
    const batch = db.batch();
    const clientBalanceUpdates: Record<string, number> = {};
    const businessBalanceUpdates: Record<string, number> = {};

    salesToDelete.forEach(sale => {
        const saleRef = db.collection('sales').doc(sale.id);
        batch.delete(saleRef);

        const amountToDecrement = -sale.grandTotalMMK;
        clientBalanceUpdates[sale.clientId] = (clientBalanceUpdates[sale.clientId] || 0) + amountToDecrement;
        if (sale.businessId) {
            businessBalanceUpdates[sale.businessId] = (businessBalanceUpdates[sale.businessId] || 0) + amountToDecrement;
        }
    });

    Object.entries(clientBalanceUpdates).forEach(([clientId, amount]) => {
        const clientRef = db.collection('clients').doc(clientId);
        batch.update(clientRef, { balance: firebase.firestore.FieldValue.increment(amount) });
    });

    Object.entries(businessBalanceUpdates).forEach(([businessId, amount]) => {
        const businessRef = db.collection('businesses').doc(businessId);
        batch.update(businessRef, { balance: firebase.firestore.FieldValue.increment(amount) });
    });

    await batch.commit();
    
    const result = { deletedCount: salesToDelete.length };
    void logActivityHelper('Settings', 'Delete Sales Data', `Deleted ${result.deletedCount} sales records for period ${startDate} to ${endDate}`, undefined, { startDate, endDate, deletedCount: result.deletedCount });
    return result;
};

/**
 * Delete ALL sales, payments, invoices, quotations, credit notes, and refunds from Firebase
 * WARNING: This is a destructive operation that cannot be undone!
 * This will also:
 * - Reverse all balance updates (decrement for sales/invoices, increment for payments/refunds/credit notes)
 * - Reset ALL client and business balances to 0
 * - Reset ALL client and business opening balances to 0
 * - Reset ALL finance_customers balances to 0 (used by Accounts Receivable)
 */
export const apiDeleteAllSalesPaymentsInvoicesQuotations = async (): Promise<{
    salesDeleted: number;
    paymentsDeleted: number;
    invoicesDeleted: number;
    quotationsDeleted: number;
    creditNotesDeleted: number;
    refundsDeleted: number;
}> => {
    // Fetch all documents from each collection
    const [salesSnapshot, paymentsSnapshot, invoicesSnapshot, quotationsSnapshot, creditNotesSnapshot, refundsSnapshot] = await Promise.all([
        db.collection('sales').get(),
        db.collection('payments').get(),
        db.collection('invoices').get(),
        db.collection('quotations').get(),
        db.collection('credit_notes').get(),
        db.collection('refunds').get(),
    ]);

    const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord));
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
    const quotations = quotationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation));
    const creditNotes = creditNotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditNote));
    const refunds = refundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Refund));

    // Track balance updates
    const clientBalanceUpdates: Record<string, number> = {};
    const businessBalanceUpdates: Record<string, number> = {};

    // Process sales: reverse balance updates (decrement)
    sales.forEach(sale => {
        if (sale.status !== SaleStatus.DRAFT && sale.grandTotalMMK !== 0) {
            const amountToDecrement = -sale.grandTotalMMK;
            clientBalanceUpdates[sale.clientId] = (clientBalanceUpdates[sale.clientId] || 0) + amountToDecrement;
            if (sale.businessId) {
                businessBalanceUpdates[sale.businessId] = (businessBalanceUpdates[sale.businessId] || 0) + amountToDecrement;
            }
        }
    });

    // Invoices linked to sales: balance already reversed via sales above. No manual-invoice reversal.

    // Process payments: reverse balance updates (increment) - only approved payments
    payments.forEach(payment => {
        if (payment.status === PaymentStatus.APPROVED) {
            const amountToIncrement = payment.amountMMK;
            clientBalanceUpdates[payment.clientId] = (clientBalanceUpdates[payment.clientId] || 0) + amountToIncrement;
            if (payment.businessId) {
                businessBalanceUpdates[payment.businessId] = (businessBalanceUpdates[payment.businessId] || 0) + amountToIncrement;
            }
        }
    });

    // Process refunds: reverse balance updates (increment) - refunds decrease balance, so deletion increases it back
    // Refunds affect balance immediately when created (even PENDING status)
    refunds.forEach(refund => {
        const amountToIncrement = refund.amountMMK;
        clientBalanceUpdates[refund.clientId] = (clientBalanceUpdates[refund.clientId] || 0) + amountToIncrement;
        if (refund.businessId) {
            businessBalanceUpdates[refund.businessId] = (businessBalanceUpdates[refund.businessId] || 0) + amountToIncrement;
        }
    });

    // Process credit notes: reverse balance updates (increment) - only APPROVED credit notes affect balance
    // Credit notes decrease balance when APPROVED, so deletion increases it back
    creditNotes.forEach(creditNote => {
        if (creditNote.status === CreditNoteStatus.APPROVED) {
            const amountToIncrement = creditNote.amountMMK;
            clientBalanceUpdates[creditNote.clientId] = (clientBalanceUpdates[creditNote.clientId] || 0) + amountToIncrement;
            if (creditNote.businessId) {
                businessBalanceUpdates[creditNote.businessId] = (businessBalanceUpdates[creditNote.businessId] || 0) + amountToIncrement;
            }
        }
    });

    // Delete all documents in batches (Firestore limit: 500 operations per batch)
    const BATCH_SIZE = 500;
    const allDocs = [
        ...salesSnapshot.docs.map(doc => ({ ref: db.collection('sales').doc(doc.id), type: 'sale' })),
        ...paymentsSnapshot.docs.map(doc => ({ ref: db.collection('payments').doc(doc.id), type: 'payment' })),
        ...invoicesSnapshot.docs.map(doc => ({ ref: db.collection('invoices').doc(doc.id), type: 'invoice' })),
        ...quotationsSnapshot.docs.map(doc => ({ ref: db.collection('quotations').doc(doc.id), type: 'quotation' })),
        ...creditNotesSnapshot.docs.map(doc => ({ ref: db.collection('credit_notes').doc(doc.id), type: 'creditNote' })),
        ...refundsSnapshot.docs.map(doc => ({ ref: db.collection('refunds').doc(doc.id), type: 'refund' })),
    ];

    // Delete documents in batches
    for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchDocs = allDocs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach(({ ref }) => {
            batch.delete(ref);
        });
        
        await batch.commit();
    }

    // Update balances in batches (reverse the effects of deleted transactions)
    const balanceUpdates = [
        ...Object.entries(clientBalanceUpdates).map(([clientId, amount]) => ({
            ref: db.collection('clients').doc(clientId),
            amount,
        })),
        ...Object.entries(businessBalanceUpdates).map(([businessId, amount]) => ({
            ref: db.collection('businesses').doc(businessId),
            amount,
        })),
    ];

    for (let i = 0; i < balanceUpdates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchUpdates = balanceUpdates.slice(i, i + BATCH_SIZE);
        
        batchUpdates.forEach(({ ref, amount }) => {
            if (amount !== 0) {
                batch.update(ref, { balance: firebase.firestore.FieldValue.increment(amount) });
            }
        });
        
        await batch.commit();
    }

    // Reset ALL client and business balances and opening balances to zero
    // Fetch all clients and businesses
    const [allClientsSnapshot, allBusinessesSnapshot] = await Promise.all([
        db.collection('clients').get(),
        db.collection('businesses').get(),
    ]);

    // Reset all client balances and opening balances
    for (let i = 0; i < allClientsSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchDocs = allClientsSnapshot.docs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach(doc => {
            const clientRef = db.collection('clients').doc(doc.id);
            batch.update(clientRef, {
                balance: 0,
                openingBalance: 0,
                openingBalanceSetDate: firebase.firestore.FieldValue.delete(),
            });
        });
        
        await batch.commit();
    }

    // Reset all business balances and opening balances
    for (let i = 0; i < allBusinessesSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchDocs = allBusinessesSnapshot.docs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach(doc => {
            const businessRef = db.collection('businesses').doc(doc.id);
            batch.update(businessRef, {
                balance: 0,
                openingBalance: 0,
                openingBalanceSetDate: firebase.firestore.FieldValue.delete(),
            });
        });
        
        await batch.commit();
    }

    // Reset ALL finance_customers balances (used by Accounts Receivable)
    const allFinanceCustomersSnapshot = await db.collection('finance_customers').get();

    for (let i = 0; i < allFinanceCustomersSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchDocs = allFinanceCustomersSnapshot.docs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach(doc => {
            const customerRef = db.collection('finance_customers').doc(doc.id);
            batch.update(customerRef, {
                balance: 0,
            });
        });
        
        await batch.commit();
    }

    const result = {
        salesDeleted: sales.length,
        paymentsDeleted: payments.length,
        invoicesDeleted: invoices.length,
        quotationsDeleted: quotations.length,
        creditNotesDeleted: creditNotes.length,
        refundsDeleted: refunds.length,
    };

    void logActivityHelper(
        'Settings',
        'Delete All Data',
        `Deleted all sales (${result.salesDeleted}), payments (${result.paymentsDeleted}), invoices (${result.invoicesDeleted}), quotations (${result.quotationsDeleted}), credit notes (${result.creditNotesDeleted}), and refunds (${result.refundsDeleted})`,
        undefined,
        result
    );

    return result;
};


const createSettingsApi = <T extends SettingItem>(collection: string, prefix: string) => ({
    get: (): Promise<T[]> => fetchCollection<T>(collection),
    add: (data: Omit<T, 'id'>): Promise<T> => addDocument<T>(collection, data as Partial<T>, prefix, false),
    update: (id: string, data: Partial<T>): Promise<void> => updateDocument<T>(collection, id, data),
    delete: (id: string): Promise<void> => deleteDocument(collection, id),
});

// FIX: Custom implementations for Payment Method settings to handle file uploads for logos and QR codes.
export const apiGetPaymentMethodSettings = (): Promise<PaymentMethodSetting[]> => fetchCollection('settings_payment_methods', { field: 'order', direction: 'asc' });
export const { delete: apiDeletePaymentMethodSetting } = createSettingsApi<PaymentMethodSetting>('settings_payment_methods', PAYMENT_METHOD_SETTING_ID_PREFIX);


export const apiAddPaymentMethodSetting = async (
  data: Omit<PaymentMethodSetting, 'id' | 'logoUrl' | 'qrCodeUrl' | 'order'>,
  files: { logoFile?: File | null, qrCodeFile?: File | null }
): Promise<PaymentMethodSetting> => {
  const newId = await getNextId(PAYMENT_METHOD_SETTING_ID_PREFIX);
  
  const settingsSnapshot = await db.collection('settings_payment_methods').orderBy('order', 'desc').limit(1).get();
  const maxOrder = settingsSnapshot.empty ? -1 : (settingsSnapshot.docs[0].data().order ?? 0);
  const dataToSave: Partial<PaymentMethodSetting> = { ...data, order: maxOrder + 1 };

  if (files.logoFile) {
    const logoUrl = await apiUploadFile(files.logoFile, `payment_methods/${newId}/logo.jpg`);
    dataToSave.logoUrl = logoUrl;
  }
  if (files.qrCodeFile) {
    const qrCodeUrl = await apiUploadFile(files.qrCodeFile, `payment_methods/${newId}/qrcode.jpg`);
    dataToSave.qrCodeUrl = qrCodeUrl;
  }

  await db.collection('settings_payment_methods').doc(newId).set(dataToSave);
  const docSnap = await db.collection('settings_payment_methods').doc(newId).get();
  const result = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as PaymentMethodSetting;
  void logActivityHelper('Settings', 'Add Payment Method', `Added payment method: ${result.name}`, result.id);
  return result;
};

export const apiUpdatePaymentMethodSetting = async (
  id: string,
  data: Partial<Omit<PaymentMethodSetting, 'id' | 'logoUrl' | 'qrCodeUrl'>>,
  files: { logoFile?: File | null, qrCodeFile?: File | null }
): Promise<void> => {
  const dataToUpdate: Partial<PaymentMethodSetting> = { ...data };

  if (files.logoFile) {
    const logoUrl = await apiUploadFile(files.logoFile, `payment_methods/${id}/logo.jpg`);
    dataToUpdate.logoUrl = logoUrl;
  }
  if (files.qrCodeFile) {
    const qrCodeUrl = await apiUploadFile(files.qrCodeFile, `payment_methods/${id}/qrcode.jpg`);
    dataToUpdate.qrCodeUrl = qrCodeUrl;
  }
  
  await db.collection('settings_payment_methods').doc(id).update(dataToUpdate);
  void logActivityHelper('Settings', 'Update Payment Method', `Updated payment method: ${id}`, id);
};

export const apiUpdatePaymentMethodsOrder = async (orderedIds: string[]): Promise<void> => {
    const batch = db.batch();
    orderedIds.forEach((id, index) => {
        const docRef = db.collection('settings_payment_methods').doc(id);
        batch.update(docRef, { order: index });
    });
    await batch.commit();
    void logActivityHelper('Settings', 'Reorder Payment Methods', `Reordered ${orderedIds.length} payment methods`, undefined, { orderedIds });
};

export const { get: apiGetExpenseCategorySettings, add: apiAddExpenseCategorySetting, update: apiUpdateExpenseCategorySetting, delete: apiDeleteExpenseCategorySetting } = createSettingsApi<ExpenseCategorySetting>('settings_expense_categories', EXP_CAT_PREFIX);
export const { get: apiGetLeadSourceSettings, add: apiAddLeadSourceSetting, update: apiUpdateLeadSourceSetting, delete: apiDeleteLeadSourceSetting } = createSettingsApi<LeadSourceSetting>('settings_lead_sources', LEAD_SRC_PREFIX);
export const { get: apiGetBusinessTypeSettings, add: apiAddBusinessTypeSetting, update: apiUpdateBusinessTypeSetting, delete: apiDeleteBusinessTypeSetting } = createSettingsApi<BusinessTypeSetting>('settings_business_types', BIZ_TYPE_PREFIX);
export const { get: apiGetCampaignObjectiveSettings, add: apiAddCampaignObjectiveSetting, update: apiUpdateCampaignObjectiveSetting, delete: apiDeleteCampaignObjectiveSetting } = createSettingsApi<CampaignObjectiveSetting>('settings_campaign_objectives', CAMP_OBJ_PREFIX);
export const { get: apiGetAssetCategorySettings, add: apiAddAssetCategorySetting, update: apiUpdateAssetCategorySetting, delete: apiDeleteAssetCategorySetting } = createSettingsApi<AssetCategorySetting>('settings_asset_categories', ASSET_CAT_PREFIX);

export const { get: apiGetKpiCategories, add: apiAddKpiCategory, update: apiUpdateKpiCategory, delete: apiDeleteKpiCategory } = createSettingsApi<KpiCategory>('kpi_categories', KPI_CATEGORY_ID_PREFIX);


// Departments
export const apiGetDepartments = (): Promise<Department[]> => fetchCollection('departments');
export const apiAddDepartment = async (data: Omit<Department, 'id'>): Promise<Department> => {
    const department = await addDocument('departments', data as Partial<Department>, DEPT_ID_PREFIX, false);
    void logActivityHelper('Settings', 'Create Department', `Created department: ${department.name}`, department.id);
    return department;
};
export const apiUpdateDepartment = async (id: string, data: Partial<Department>): Promise<void> => {
    await updateDocument('departments', id, data);
    void logActivityHelper('Settings', 'Update Department', `Updated department: ${data.name || id}`, id, data);
};
export const apiDeleteDepartment = async (id: string): Promise<void> => {
    await deleteDocument('departments', id);
    void logActivityHelper('Settings', 'Delete Department', `Deleted department: ${id}`, id);
};

// Permissions
export const apiEnsureGlobalRolePermissionsSeeded = async (): Promise<{ seeded: string[] }> => {
    const seeded: string[] = [];
    const rolesToSeed = [UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.STAFF];
    for (const role of rolesToSeed) {
        const docId = `GLOBAL_${role}`;
        const docRef = db.collection('role_permissions').doc(docId);
        const docSnap = await docRef.get();
        const existing = docSnap.exists ? (docSnap.data()?.permissions as Permission[] | undefined) : undefined;
        if (!existing || existing.length === 0) {
            const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
            await docRef.set({
                role,
                permissions: defaults,
                seededAt: getMyanmarISOString(),
                seededFrom: 'DEFAULT_ROLE_PERMISSIONS',
            }, { merge: true });
            seeded.push(docId);
        }
    }
    return { seeded };
};

export const apiGetRolePermissions = async (role: UserRole): Promise<Permission[]> => (await fetchSingletonDocument<RolePermissionConfig>('role_permissions', `GLOBAL_${role}`))?.permissions || DEFAULT_ROLE_PERMISSIONS[role] || [];
export const apiUpdateRolePermissions = async (role: UserRole, permissions: Permission[]): Promise<void> => {
    await db.collection('role_permissions').doc(`GLOBAL_${role}`).set({ role, permissions });
    void logActivityHelper('Settings', 'Update Global Permissions', `Updated permissions for role ${role}`, `GLOBAL_${role}`, { permissions });
};
export const apiGetDepartmentRolePermissions = async (deptId: string, role: UserRole): Promise<Permission[] | null> => (await fetchDocumentById<DepartmentRolePermissionConfig>('role_permissions', `${deptId}_${role}`))?.permissions || null;
export const apiUpdateDepartmentRolePermissions = async (deptId: string, role: UserRole, permissions: Permission[]): Promise<void> => {
    await db.collection('role_permissions').doc(`${deptId}_${role}`).set({ departmentId: deptId, role, permissions });
    void logActivityHelper('Settings', 'Update Department Permissions', `Updated ${role} permissions for department ${deptId}`, `${deptId}_${role}`, { permissions });
};
export const apiDeleteDepartmentRolePermissions = async (deptId: string, role: UserRole): Promise<void> => {
    await deleteDocument('role_permissions', `${deptId}_${role}`);
    void logActivityHelper('Settings', 'Delete Department Permissions', `Removed ${role} permissions override for department ${deptId}`, `${deptId}_${role}`);
};
export const apiGetAllDepartmentRolePermissions = (): Promise<DepartmentRolePermissionConfig[]> => fetchCollection('role_permissions');

// Lead Activities
export const apiGetActivitiesForLead = async (leadId: string): Promise<LeadActivity[]> => {
    const snapshot = await db.collection('lead_activities').where('leadId', '==', leadId).get();
    const activities = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as LeadActivity);
    // Sort on the client-side to avoid needing a composite index in Firestore
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities;
};
export const apiAddLeadActivity = (data: Omit<LeadActivity, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<LeadActivity> => {
    const activityData = {
        ...data,
        timestamp: getMyanmarISOString(),
    };
    return addDocument<LeadActivity>('lead_activities', activityData as any, undefined, false).then(activity => {
        void logActivityHelper('Leads', 'Add Activity', `Logged ${activity.type} activity`, activity.id, {
            leadId: activity.leadId,
            notes: activity.notes,
        });
        return activity;
    });
};

// Notes
export const apiGetNotes = (relatedToId: string): Promise<Note[]> => {
  return fetchCollection<Note>('notes', { field: 'createdAt', direction: 'desc' })
    .then(notes => notes.filter(note => note.relatedToId === relatedToId));
};
export const apiAddNote = (data: Omit<Note, 'id' | 'createdAt'>): Promise<Note> => {
  return addDocument<Note>('notes', data as Partial<Note>, NOTE_ID_PREFIX).then(note => {
    void logActivityHelper('Notes', 'Create Note', `Added note for ${note.relatedToId}`, note.id, { relatedToId: note.relatedToId });
    return note;
  });
};
export const apiDeleteNote = async (id: string): Promise<void> => {
  await deleteDocument('notes', id);
  void logActivityHelper('Notes', 'Delete Note', `Deleted note ${id}`, id);
};

// --- KPI Management ---
export const apiGetKpis = (): Promise<KPI[]> => fetchCollection<KPI>('kpis', { field: 'createdAt', direction: 'desc' });
export const apiAddKpi = async (data: Omit<KPI, 'id' | 'createdAt' | 'createdByUserId'>): Promise<KPI> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        return Promise.reject(new Error("User not authenticated"));
    }
    const dataWithUser = { ...data, createdByUserId: userId };
    const kpi = await addDocument<KPI>('kpis', dataWithUser as Partial<KPI>, KPI_ID_PREFIX, true);
    void logActivityHelper('KPI Management', 'Create KPI', `Created KPI: ${kpi.title}`, kpi.id, { targetValue: kpi.targetValue });
    return kpi;
};
export const apiUpdateKpi = async (id: string, data: Partial<Omit<KPI, 'id' | 'createdAt' | 'createdByUserId'>>): Promise<void> => {
    await updateDocument<KPI>('kpis', id, data);
    void logActivityHelper('KPI Management', 'Update KPI', `Updated KPI: ${data.title || id}`, id, data);
};

export const apiGetEmployeeKpiSheet = (sheetId: string): Promise<EmployeeKpiSheet | null> => fetchDocumentById<EmployeeKpiSheet>('employee_kpi_sheets', sheetId);
export const apiGetEmployeeKpiSheets = (employeeId: string): Promise<EmployeeKpiSheet[]> => fetchCollectionByField<EmployeeKpiSheet>('employee_kpi_sheets', 'employeeId', employeeId);
export const apiCreateOrUpdateEmployeeKpiSheet = async (sheetData: EmployeeKpiSheet): Promise<void> => {
    const sheetRef = db.collection('employee_kpi_sheets').doc(sheetData.id);
    await sheetRef.set(sheetData, { merge: true });
    void logActivityHelper('KPI Management', 'Update KPI Sheet', `Updated KPI sheet for employee ${sheetData.employeeId}`, sheetData.id, { employeeId: sheetData.employeeId, period: sheetData.period });
};


// HR - Leave
export const apiGetLeaveRequestsForEmployee = (employeeId: string): Promise<LeaveRequest[]> => 
    db.collection('leave_requests')
      .where('employeeId', '==', employeeId)
      .get()
      .then(snap => {
          const requests = snap.docs.map(d => convertTimestamps({id: d.id, ...d.data()}) as LeaveRequest);
          // Sort client-side to avoid needing a composite index in Firestore
          requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
          return requests;
      });

export const apiGetAllLeaveRequests = (): Promise<LeaveRequest[]> => fetchCollection<LeaveRequest>('leave_requests', { field: 'requestedAt', direction: 'desc' });

export const apiAddLeaveRequest = async (data: Omit<LeaveRequest, 'id' | 'requestedAt' | 'status'>, employeeName: string): Promise<LeaveRequest> => {
    const requestData = {
        ...data,
        requestedAt: getMyanmarISOString(),
        status: LeaveRequestStatus.PENDING,
        createdAt: getMyanmarISOString(),
        updatedAt: getMyanmarISOString(),
    };
    const newRequest = await addDocument<LeaveRequest>('leave_requests', requestData as any, LEAVE_REQUEST_ID_PREFIX, false);
    
    // Send notifications to admins/owners
    try {
        const approvers = (await apiGetUsers()).filter(u => u.role === UserRole.OWNER || u.role === UserRole.ADMIN);
        for (const approver of approvers) {
            apiSendNotification(approver.id, {
                title: 'New Leave Request',
                message: `${employeeName} has requested ${data.leaveType} from ${data.startDate} to ${data.endDate}.`,
                type: 'info',
                link: '/hr/leave-admin'
            }).catch(err => console.error(`Failed to send notification to ${approver.id}`, err));
        }
    } catch (error) {
        console.error("Failed to send leave request notifications:", error);
    }
    
    void logActivityHelper('HR', 'Create Leave Request', `Leave request from ${employeeName}`, newRequest.id, {
        leaveType: newRequest.leaveType,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
    });
    return newRequest;
};

export const apiAddMultipleLeaveRequests = async (data: Omit<LeaveRequest, 'id'|'requestedAt'|'status'>[], employeeName: string): Promise<void> => {
    const batch = db.batch();
    for(const request of data) {
        const docRef = db.collection('leave_requests').doc(await getNextId(LEAVE_REQUEST_ID_PREFIX));
        batch.set(docRef, {
            ...request,
            requestedAt: getMyanmarISOString(),
            status: LeaveRequestStatus.PENDING,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        });
    }
    await batch.commit();

    // Send a single summary notification
    try {
        const approvers = (await apiGetUsers()).filter(u => u.role === UserRole.ADMIN || u.role === UserRole.OWNER);
        const totalRequests = data.length;
        const firstDate = data.length > 0 ? formatDateForDisplay(data[0].startDate) : 'multiple dates';

        for (const approver of approvers) {
            apiSendNotification(approver.id, {
                title: 'New Off-Day Requests',
                message: `${employeeName} has submitted ${totalRequests} new off-day request(s), starting from ${firstDate}.`,
                type: 'info',
                link: '/hr/leave-admin'
            }).catch(err => console.error(`Failed to send notification to ${approver.id}`, err));
        }
    } catch (error) {
         console.error("Failed to send leave request notifications:", error);
    }
    void logActivityHelper('HR', 'Create Leave Request', `Bulk leave requests from ${employeeName}`, undefined, { count: data.length });
};

export const apiUpdateLeaveRequestStatus = async (id: string, status: LeaveRequestStatus, reviewedByUserId: string, reviewerComments?: string): Promise<void> => {
    await updateDocument('leave_requests', id, { status, reviewedByUserId, reviewerComments, reviewedAt: getMyanmarISOString() });
    void logActivityHelper('HR', 'Review Leave Request', `Set leave request ${id} to ${status}`, id, { reviewerComments });
};
export const apiCancelLeaveRequest = async (id: string, employeeId: string): Promise<void> => {
    await updateDocument('leave_requests', id, { status: LeaveRequestStatus.CANCELLED });
    void logActivityHelper('HR', 'Cancel Leave Request', `Cancelled leave request ${id}`, id, { employeeId });
};
export const apiDeleteLeaveRequest = async (id: string): Promise<void> => {
    await deleteDocument('leave_requests', id);
    void logActivityHelper('HR', 'Delete Leave Request', `Deleted leave request ${id}`, id);
};
export const apiBulkUpdateLeaveRequestStatus = async (requestIds: string[], status: LeaveRequestStatus, reviewedByUserId: string): Promise<void> => {
    const batch = db.batch();
    requestIds.forEach(id => {
        const ref = db.collection('leave_requests').doc(id);
        batch.update(ref, { status, reviewedByUserId, reviewedAt: getMyanmarISOString() });
    });
    await batch.commit();
    void logActivityHelper('HR', 'Bulk Review Leave Requests', `Updated ${requestIds.length} leave requests to ${status}`, undefined, { status, reviewedByUserId });
};

// HR - Holidays
export const apiGetHolidays = (): Promise<Holiday[]> => fetchCollection<Holiday>('holidays', { field: 'date', direction: 'asc' });
export const apiAddHoliday = async (data: Omit<Holiday, 'id' | 'createdAt'>): Promise<Holiday> => {
    const holiday = await addDocument<Holiday>('holidays', data as Partial<Holiday>, HOLIDAY_ID_PREFIX);
    void logActivityHelper('HR', 'Create Holiday', `Created holiday: ${holiday.name} on ${holiday.date}`, holiday.id, { date: holiday.date });
    return holiday;
};
export const apiAddMultipleHolidays = async (holidaysData: Omit<Holiday, 'id' | 'createdAt'>[]): Promise<void> => {
    const batch = db.batch();
    
    for (const holiday of holidaysData) {
        const newId = await getNextId(HOLIDAY_ID_PREFIX);
        const holidayRef = db.collection('holidays').doc(newId);
        batch.set(holidayRef, {
            ...holiday,
            createdAt: getMyanmarISOString()
        });
    }

    await batch.commit();
    void logActivityHelper('HR', 'Create Holiday', `Bulk created ${holidaysData.length} holidays`, undefined);
};
export const apiUpdateHoliday = async (data: Partial<Holiday> & { id: string }): Promise<void> => {
    await updateDocument<Holiday>('holidays', data.id, data);
    void logActivityHelper('HR', 'Update Holiday', `Updated holiday: ${data.id}`, data.id, data);
};
export const apiDeleteHoliday = async (id: string): Promise<void> => {
    await deleteDocument('holidays', id);
    void logActivityHelper('HR', 'Delete Holiday', `Deleted holiday: ${id}`, id);
};

// HR - Payroll
export const apiGetPayslipsForEmployee = (employeeId: string): Promise<Payslip[]> => db.collection('payslips').where('employeeId', '==', employeeId).get().then(snap => {
    const payslips = snap.docs.map(d => convertTimestamps({id: d.id, ...d.data()}) as Payslip);
    // Sort client-side to avoid needing a composite index in Firestore
    payslips.sort((a, b) => b.month.localeCompare(a.month)); // e.g., '2024-07' > '2024-06'
    return payslips;
});
export const apiGetPayslipsForMonth = (month: string): Promise<Payslip[]> => db.collection('payslips').where('month', '==', month).get().then(snap => snap.docs.map(d => convertTimestamps({id: d.id, ...d.data()}) as Payslip));
export const apiGeneratePayslipsForMonth = async (month: string, strategy: 'duplicate' | 'fresh', employees: Employee[]): Promise<void> => {
    const activeEmployees = employees.filter(e => e.employeeStatus === EmployeeStatus.ACTIVE || e.employeeStatus === EmployeeStatus.ON_PROBATION);
    if (activeEmployees.length === 0) {
        return;
    }

    const [yearStr, monthStr] = month.split('-'); // "YYYY-MM"
    const yearYY = yearStr.slice(-2); // "YY"

    const counterId = `payslips_${yearStr}${monthStr}`;
    const counterRef = db.collection('counters').doc(counterId);
    let startCount = 1;

    // Transaction to get and update the counter
    await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists) {
            startCount = (counterDoc.data()!.count || 0) + 1;
        }
        const newCount = startCount + activeEmployees.length - 1;
        transaction.set(counterRef, { count: newCount }, { merge: true });
    });

    const batch = db.batch();
    activeEmployees.forEach((emp, index) => {
        const newPayslip: Omit<Payslip, 'id'> = {
            employeeId: emp.id,
            month: month,
            basicSalary: emp.basicPay,
            commissions: 0,
            transportationAllowance: emp.transportationAllowance || 0,
            otherAllowances: [],
            otherDeductions: [],
            allowances: emp.transportationAllowance || 0,
            deductions: 0,
            netPayable: emp.basicPay + (emp.transportationAllowance || 0),
            status: 'Generated',
        };

        const payslipSerialNumber = startCount + index;
        const payslipId = `${PAYSLIP_ID_PREFIX}${String(payslipSerialNumber).padStart(2, '0')}${monthStr}${yearYY}`; // e.g., PS010725
        
        const docRef = db.collection('payslips').doc(payslipId);
        batch.set(docRef, newPayslip);
    });
    
    await batch.commit();
    void logActivityHelper('HR', 'Generate Payslips', `Generated ${activeEmployees.length} payslips for ${month}`, undefined, { month, strategy });
};
export const apiGenerateSinglePayslip = async (employee: Employee, month: string): Promise<Payslip> => {
    // 1. Check for existing payslip
    const existingPayslipQuery = db.collection('payslips')
        .where('employeeId', '==', employee.id)
        .where('month', '==', month)
        .limit(1);

    const existingSnapshot = await existingPayslipQuery.get();
    if (!existingSnapshot.empty) {
        throw new Error(`A payslip for ${employee.name} for the month ${month} already exists.`);
    }

    // 2. Generate new Payslip ID
    const [yearStr, monthStr] = month.split('-'); // "YYYY-MM"
    const yearYY = yearStr.slice(-2); // "YY"

    const counterId = `payslips_${yearStr}${monthStr}`;
    const counterRef = db.collection('counters').doc(counterId);
    let newIdNum = 1;

    await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists) {
            transaction.set(counterRef, { count: newIdNum });
        } else {
            newIdNum = (counterDoc.data()!.count || 0) + 1;
            transaction.update(counterRef, { count: newIdNum });
        }
    });
    
    const payslipId = `${PAYSLIP_ID_PREFIX}${String(newIdNum).padStart(2, '0')}${monthStr}${yearYY}`;

    // 3. Create payslip data
    const newPayslipData: Omit<Payslip, 'id'> = {
        employeeId: employee.id,
        month: month,
        basicSalary: employee.basicPay,
        commissions: 0,
        transportationAllowance: employee.transportationAllowance || 0,
        otherAllowances: [],
        otherDeductions: [],
        allowances: employee.transportationAllowance || 0,
        deductions: 0,
        netPayable: employee.basicPay + (employee.transportationAllowance || 0),
        status: 'Generated',
    };

    // 4. Save to Firestore
    const newPayslipRef = db.collection('payslips').doc(payslipId);
    await newPayslipRef.set(newPayslipData);
    
    // 5. Return the created payslip
    const docSnap = await newPayslipRef.get();
    const payslip = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Payslip;
    void logActivityHelper('HR', 'Generate Payslip', `Generated payslip ${payslip.id} for ${employee.name}`, payslip.id, { month });
    return payslip;
};
export const apiUpdatePayslip = async (payslipId: string, data: { basicSalary: number, commissions: number, transportationAllowance: number, otherAllowances: AllowanceItem[], otherDeductions: DeductionItem[] }): Promise<void> => {
    const totalOtherAllowances = (data.transportationAllowance || 0) + data.otherAllowances.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = data.otherDeductions.reduce((sum, item) => sum + item.amount, 0);
    const netPayable = data.basicSalary + data.commissions + totalOtherAllowances - totalDeductions;
    await updateDocument('payslips', payslipId, { ...data, allowances: totalOtherAllowances, deductions: totalDeductions, netPayable });
    void logActivityHelper('HR', 'Update Payslip', `Updated payslip ${payslipId}`, payslipId, { netPayable });
};
export const apiMarkPayslipAsPaid = async (payslipId: string): Promise<void> => {
    await updateDocument('payslips', payslipId, { status: 'Paid', paymentDate: new Date().toISOString() });
    void logActivityHelper('HR', 'Mark Payslip Paid', `Payslip ${payslipId} marked as paid`, payslipId);
};
export const apiGetPayrollTotalsForPeriod = async (monthStr: string): Promise<{ totalNetPayable: number }> => {
    const snapshot = await db.collection('payslips')
        .where('month', '==', monthStr)
        .get();
    const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data() as Payslip).netPayable, 0);
    return { totalNetPayable: total };
};

// HR - Onboarding
export const apiGetEmployeeOnboardingById = (employeeId: string): Promise<EmployeeOnboarding | null> =>
    fetchDocumentById<EmployeeOnboarding>('employee_onboarding', employeeId);

export const apiUpdateEmployeeOnboarding = async (employeeId: string, data: Partial<Omit<EmployeeOnboarding, 'id'>>): Promise<void> => {
    await updateDocument<EmployeeOnboarding>('employee_onboarding', employeeId, data);
    void logActivityHelper('HR', 'Update Onboarding', `Updated onboarding checklist for employee ${employeeId}`, employeeId, data);
};

// HR - Attendance
export const apiGetAttendanceReportForMonth = (monthId: string): Promise<AttendanceReport | null> => 
    fetchDocumentById<AttendanceReport>('attendance_reports', monthId);

export const apiProcessAndSaveAttendance = async (
    data: Record<string, any[][]>, 
    generatedByUserId: string, 
    allEmployees: Employee[]
): Promise<void> => {
    // 1. Extract and validate data from sheets
    const statisticalReportSheet = data['Statistical Report of Attendance'];

    if (!statisticalReportSheet || statisticalReportSheet.length < 2) {
        throw new Error("'Statistical Report of Attendance' sheet is missing or empty.");
    }
    
    // 2. Determine the report month from the statistical report sheet
    let reportMonth = '';
    let reportYear = '';
    const dateRow = statisticalReportSheet.find(row => row.some(cell => typeof cell === 'string' && cell.startsWith('Date:')));
    if (dateRow) {
        const dateCell = dateRow.find(cell => typeof cell === 'string' && cell.startsWith('Date:'));
        const match = dateCell.match(/(\d{4})-(\d{2})-\d{2}/);
        if (match) {
            reportYear = match[1];
            reportMonth = match[2];
        }
    }
    if (!reportMonth || !reportYear) {
        throw new Error("Could not determine the report month from the 'Statistical Report of Attendance' sheet. Expected a cell starting with 'Date: YYYY-MM-DD'.");
    }
    const reportId = `${reportYear}-${reportMonth}`;

    // 3. Create a lookup map for employees
    const employeeMapByCode = new Map<string, Employee>();
    allEmployees.forEach(emp => {
        if (emp.employeeId) {
            employeeMapByCode.set(emp.employeeId, emp);
        }
    });

    // 4. Process the statistical report to get primary stats
    const employeeData: { [employeeId: string]: EmployeeAttendanceStats } = {};

    const statisticalHeaderRowIndex = statisticalReportSheet.findIndex(row => row.includes('ID'));
    if (statisticalHeaderRowIndex === -1) {
        throw new Error("Could not find header row with 'ID' in 'Statistical Report of Attendance' sheet.");
    }
    const statisticalHeaders = statisticalReportSheet[statisticalHeaderRowIndex].map(h => String(h).trim());
    const statisticalDataRows = statisticalReportSheet.slice(statisticalHeaderRowIndex + 1);
    
    const idIndex = statisticalHeaders.indexOf('ID');
    const nameIndex = statisticalHeaders.indexOf('Name');
    const normalHoursIndex = statisticalHeaders.indexOf('Payable Hours');
    const realHoursIndex = statisticalHeaders.indexOf('Actual Hours');
    const lateMinutesIndex = statisticalHeaders.indexOf('Late');
    const earlyLeaveMinutesIndex = statisticalHeaders.indexOf('Early');
    const absenceDaysIndex = statisticalHeaders.indexOf('Absence');
    const overtimeHoursIndex = statisticalHeaders.indexOf('Overtime');
    const leaveDaysIndex = statisticalHeaders.indexOf('Leave');

    if (idIndex === -1 || nameIndex === -1) {
        throw new Error("Missing 'ID' or 'Name' column in 'Statistical Report of Attendance' sheet.");
    }
    
    statisticalDataRows.forEach(row => {
        const employeeCode = row[idIndex];
        if (!employeeCode) return; 

        const employee = employeeMapByCode.get(String(employeeCode));
        if (!employee) return; 

        const getNumericValue = (index: number): number => {
            if (index === -1 || row[index] === null || row[index] === undefined) return 0;
            const value = String(row[index]);
            if (value.includes(':')) {
                const [hours, minutes] = value.split(':').map(Number);
                return hours + (minutes / 60);
            }
            return parseFloat(value) || 0;
        };
        
        const getMinutesValue = (index: number): number => {
            if (index === -1 || row[index] === null || row[index] === undefined) return 0;
            const value = String(row[index]);
            if (value.includes(':')) {
                 const [hours, minutes] = value.split(':').map(Number);
                return (hours * 60) + minutes;
            }
            return parseInt(value, 10) || 0;
        };

        employeeData[employee.id] = {
            employeeId: employee.id,
            employeeCode: employee.employeeId,
            name: employee.name,
            department: employee.department,
            normalHours: getNumericValue(normalHoursIndex),
            realHours: getNumericValue(realHoursIndex),
            lateMinutes: getMinutesValue(lateMinutesIndex),
            earlyLeaveMinutes: getMinutesValue(earlyLeaveMinutesIndex),
            absenceDays: getNumericValue(absenceDaysIndex),
            overtimeHours: getNumericValue(overtimeHoursIndex),
            leaveDays: getNumericValue(leaveDaysIndex),
        };
    });

    // 5. Construct the final report object
    const finalReport: AttendanceReport = {
        id: reportId,
        month: reportId,
        generatedAt: new Date().toISOString(),
        generatedBy: generatedByUserId,
        employeeData: employeeData,
    };
    
    // 6. Save to Firestore
    const reportRef = db.collection('attendance_reports').doc(reportId);
    await reportRef.set(finalReport);
    void logActivityHelper('HR', 'Save Attendance', `Processed attendance report ${reportId}`, reportId, { month: reportId });
};


// --- NOTIFICATIONS API ---

// Send a notification to a user
export const apiSendNotification = async (userId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> => {
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');
    const newNotifRef = notificationsRef.doc();
    const dataToSet = {
        ...notificationData,
        timestamp: getMyanmarISOString(),
        read: false,
    };
    await newNotifRef.set(dataToSet);
    const docSnap = await newNotifRef.get();
    return convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Notification;
};


// Listen for real-time notification updates
export const apiListenForNotifications = (userId: string, callback: (notifications: Notification[]) => void): () => void => {
    const notificationsRef = db.collection('users').doc(userId).collection('notifications').orderBy('timestamp', 'desc').limit(20);
    
    const unsubscribe = notificationsRef.onSnapshot(
        (snapshot) => {
            const notifications = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Notification);
            callback(notifications);
        },
        (error) => {
            console.error("Error listening for notifications:", error);
            // Optionally, you could have a global error state here
        }
    );

    return unsubscribe;
};

// Update a single notification (e.g., mark as read)
export const apiUpdateNotification = async (userId: string, notificationId: string, data: Partial<Notification>): Promise<void> => {
    await db.collection('users').doc(userId).collection('notifications').doc(notificationId).update(data);
    void logActivityHelper('Notifications', 'Update', `Updated notification: ${notificationId}`, notificationId);
};

// Delete a single notification
export const apiDeleteNotification = async (userId: string, notificationId: string): Promise<void> => {
    await db.collection('users').doc(userId).collection('notifications').doc(notificationId).delete();
    void logActivityHelper('Notifications', 'Delete', `Deleted notification: ${notificationId}`, notificationId);
};


// Mark all notifications for a user as read
export const apiMarkAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');
    const unreadSnapshot = await notificationsRef.where('read', '==', false).get();
    
    if (unreadSnapshot.empty) {
        return; // Nothing to do
    }

    const batch = db.batch();
    unreadSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
};

// Clear all notifications for a user
export const apiClearAllNotifications = async (userId: string): Promise<void> => {
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');
    const snapshot = await notificationsRef.get();

    if (snapshot.empty) {
        return; // Nothing to do
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
};


// --- Training Center - Quizzes ---
export const apiGetQuizzes = (): Promise<Quiz[]> => fetchCollection<Quiz>('quizzes', { field: 'createdAt', direction: 'desc' });
export const apiGetQuizById = (id: string): Promise<Quiz | null> => fetchDocumentById<Quiz>('quizzes', id);
export const apiAddQuiz = async (data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz> => {
    const quiz = await addDocument<Quiz>('quizzes', data as Partial<Quiz>, QUIZ_ID_PREFIX);
    void logActivityHelper('Training', 'Create Quiz', `Created quiz: ${quiz.title}`, quiz.id);
    return quiz;
};
export const apiUpdateQuiz = async (data: Partial<Quiz> & {id: string}): Promise<void> => {
    await updateDocument<Quiz>('quizzes', data.id, data);
    void logActivityHelper('Training', 'Update Quiz', `Updated quiz: ${data.id}`, data.id);
};
export const apiDeleteQuiz = async (quizId: string): Promise<void> => {
    const questionsRef = db.collection('quizzes').doc(quizId).collection('questions');
    const sectionsRef = db.collection('quizzes').doc(quizId).collection('sections');
    const attemptsRef = db.collection('quiz_attempts').where('quizId', '==', quizId);

    const [questionsSnapshot, sectionsSnapshot, attemptsSnapshot] = await Promise.all([
        questionsRef.get(),
        sectionsRef.get(),
        attemptsRef.get()
    ]);

    const batch = db.batch();
    questionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    sectionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    attemptsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    batch.delete(db.collection('quizzes').doc(quizId));
    await batch.commit();
    void logActivityHelper('Training', 'Delete Quiz', `Deleted quiz: ${quizId}`, quizId);
};

export const apiDuplicateQuiz = async (quizIdToDuplicate: string): Promise<Quiz> => {
    const originalQuiz = await apiGetQuizById(quizIdToDuplicate);
    if (!originalQuiz) {
        throw new Error("Original quiz/survey not found.");
    }

    const [originalQuestions, originalSections] = await Promise.all([
        apiGetQuestionsForQuiz(quizIdToDuplicate),
        apiGetSectionsForQuiz(quizIdToDuplicate)
    ]);

    const newQuizId = await getNextId(QUIZ_ID_PREFIX);
    const batch = db.batch();

    // 1. Create new quiz document
    const { id: oldId, createdAt: oldCreatedAt, updatedAt: oldUpdatedAt, ...originalQuizData } = originalQuiz;
    
    const newQuizData = {
        ...originalQuizData,
        title: `${originalQuiz.title} (Copy)`,
        createdAt: getMyanmarISOString(),
        updatedAt: getMyanmarISOString(),
    };
    const newQuizRef = db.collection('quizzes').doc(newQuizId);
    batch.set(newQuizRef, newQuizData);

    // 2. Duplicate sections and create a mapping from old section ID to new section ID
    const oldToNewSectionIdMap = new Map<string, string>();

    for (const section of originalSections) {
        const newSectionRef = db.collection('quizzes').doc(newQuizId).collection('sections').doc();
        const { id, quizId, ...sectionData } = section;
        batch.set(newSectionRef, { ...sectionData, quizId: newQuizId });
        oldToNewSectionIdMap.set(section.id, newSectionRef.id);
    }

    // 3. Duplicate questions, using the new section IDs
    for (const question of originalQuestions) {
        const newQuestionRef = db.collection('quizzes').doc(newQuizId).collection('questions').doc();
        const { id, ...questionData } = question;
        
        const newQuestionData = { ...questionData };
        if (question.sectionId && oldToNewSectionIdMap.has(question.sectionId)) {
            newQuestionData.sectionId = oldToNewSectionIdMap.get(question.sectionId);
        } else {
            delete (newQuestionData as Partial<Question>).sectionId;
        }
        
        batch.set(newQuestionRef, newQuestionData);
    }

    // 4. Commit all writes
    await batch.commit();
    
    // 5. Fetch and return the newly created quiz
    const newQuizDoc = await newQuizRef.get();
    const duplicatedQuiz = convertTimestamps({ id: newQuizDoc.id, ...newQuizDoc.data() }) as Quiz;
    void logActivityHelper('Training', 'Duplicate Quiz', `Duplicated quiz ${quizIdToDuplicate} to ${duplicatedQuiz.id}`, duplicatedQuiz.id);
    return duplicatedQuiz;
};

export const apiGetQuestionsForQuiz = (quizId: string): Promise<Question[]> => fetchCollection<Question>(`quizzes/${quizId}/questions`, { field: 'order' });
export const apiAddQuestionToQuiz = async (quizId: string, data: Omit<Question, 'id'>): Promise<Question> => {
    const question = await addDocument<Question>(`quizzes/${quizId}/questions`, data as Partial<Question>, undefined, false);
    void logActivityHelper('Training', 'Create Quiz Question', `Added question to quiz ${quizId}`, question.id, { quizId });
    return question;
};
export const apiUpdateQuestionInQuiz = async (quizId: string, questionId: string, data: Partial<Question>): Promise<void> => {
    await updateDocument<Question>(`quizzes/${quizId}/questions`, questionId, data);
    void logActivityHelper('Training', 'Update Quiz Question', `Updated question ${questionId} in quiz ${quizId}`, questionId);
};
export const apiDeleteQuestionFromQuiz = async (quizId: string, questionId: string): Promise<void> => {
    await deleteDocument(`quizzes/${quizId}/questions`, questionId);
    void logActivityHelper('Training', 'Delete Quiz Question', `Deleted question ${questionId} from quiz ${quizId}`, questionId);
};
export const apiGetAttemptsForQuiz = (quizId: string): Promise<QuizAttempt[]> => fetchCollectionByField<QuizAttempt>('quiz_attempts', 'quizId', quizId);
export const apiGetSectionsForQuiz = (quizId: string): Promise<QuizSection[]> => fetchCollection<QuizSection>(`quizzes/${quizId}/sections`, { field: 'order' });
export const apiAddSectionToQuiz = async (quizId: string, data: Omit<QuizSection, 'id' | 'quizId'>): Promise<QuizSection> => {
    const section = await addDocument<QuizSection>(`quizzes/${quizId}/sections`, { ...data, quizId } as Partial<QuizSection>, undefined, false);
    void logActivityHelper('Training', 'Create Quiz Section', `Added section to quiz ${quizId}`, section.id, { quizId });
    return section;
};
export const apiUpdateSectionInQuiz = async (quizId: string, sectionId: string, data: Partial<QuizSection>): Promise<void> => {
    await updateDocument<QuizSection>(`quizzes/${quizId}/sections`, sectionId, data);
    void logActivityHelper('Training', 'Update Quiz Section', `Updated section ${sectionId} in quiz ${quizId}`, sectionId);
};
export const apiDeleteSectionFromQuiz = async (quizId: string, sectionId: string): Promise<void> => {
    await deleteDocument(`quizzes/${quizId}/sections`, sectionId);
    void logActivityHelper('Training', 'Delete Quiz Section', `Deleted section ${sectionId} from quiz ${quizId}`, sectionId);
};

export const apiUpdateQuestionOrderAndSection = async (
  quizId: string, 
  updates: { questionId: string, newOrder: number, newSectionId: string }[]
): Promise<void> => {
  const batch = db.batch();
  updates.forEach(update => {
    const questionRef = db.collection('quizzes').doc(quizId).collection('questions').doc(update.questionId);
    batch.update(questionRef, { order: update.newOrder, sectionId: update.newSectionId });
  });
  await batch.commit();
  void logActivityHelper('Training', 'Reorder Quiz Questions', `Reordered ${updates.length} questions in quiz ${quizId}`, undefined, { quizId });
};

export const apiUpdateSectionOrder = async (
    quizId: string,
    updates: { sectionId: string, newOrder: number }[]
): Promise<void> => {
    const batch = db.batch();
    updates.forEach(update => {
        const sectionRef = db.collection('quizzes').doc(quizId).collection('sections').doc(update.sectionId);
        batch.update(sectionRef, { order: update.newOrder });
    });
    await batch.commit();
    void logActivityHelper('Training', 'Reorder Quiz Sections', `Reordered ${updates.length} sections in quiz ${quizId}`, undefined, { quizId });
};

export const apiSubmitQuizAttempt = async (data: {
    quizId: string;
    takerId: string;
    takerName: string;
    takerType: 'Student' | 'Employee';
    answers: Record<string, string[]>;
}): Promise<QuizAttempt> => {
    const quiz = await apiGetQuizById(data.quizId);
    if (!quiz) throw new Error("Quiz not found.");
    
    const questions = await apiGetQuestionsForQuiz(data.quizId);
    if (questions.length === 0) throw new Error("This quiz has no questions.");

    let correctCount = 0;
    const processedAnswers: QuizAttempt['answers'] = [];

    questions.forEach(q => {
        const selected = data.answers[q.id] || [];
        const correct = q.correctAnswers;
        
        let isCorrect = false;
        if (q.type === QuestionType.SINGLE_CHOICE) {
            isCorrect = selected.length === 1 && correct.includes(selected[0]);
        } else { // Multiple Choice
            isCorrect = selected.length === correct.length && selected.every(ans => correct.includes(ans)) && correct.every(ans => selected.includes(ans));
        }

        if (isCorrect) {
            correctCount++;
        }
        
        processedAnswers.push({
            questionId: q.id,
            questionText: q.text,
            selectedAnswers: selected,
            correctAnswers: correct,
            isCorrect: isCorrect,
        });
    });

    const score = (correctCount / questions.length) * 100;
    const passed = score >= quiz.passPercentage;

    const attemptData: Omit<QuizAttempt, 'id'> = {
        quizId: data.quizId,
        takerId: data.takerId,
        takerName: data.takerName,
        takerType: data.takerType,
        score: score,
        passed: passed,
        submittedAt: new Date().toISOString(),
        answers: processedAnswers,
    };
    
    return addDocument<QuizAttempt>('quiz_attempts', attemptData as Partial<QuizAttempt>, QUIZ_ATTEMPT_ID_PREFIX);
};

export const apiSubmitSurvey = async (data: {
    surveyId: string;
    projectId: string;
    taskId?: string;
    answers: SurveySubmission['answers'];
}): Promise<SurveySubmission> => {
    const submissionData: Omit<SurveySubmission, 'id' | 'submittedAt'> & { submittedAt: any } = {
        surveyId: data.surveyId,
        projectId: data.projectId,
        taskId: data.taskId,
        submittedAt: getMyanmarISOString(),
        answers: data.answers,
    };
    return addDocument<SurveySubmission>('survey_submissions', submissionData as Partial<SurveySubmission>, undefined, false);
};
export const apiDeleteSurveySubmission = async (id: string): Promise<void> => {
    await deleteDocument('survey_submissions', id);
    void logActivityHelper('Surveys', 'Delete Submission', `Deleted survey submission: ${id}`, id);
};

export const apiGetSurveySubmissionsForTask = (taskId: string): Promise<SurveySubmission[]> => 
    fetchCollectionByField<SurveySubmission>('survey_submissions', 'taskId', taskId);

export const apiGetSurveySubmissionsForSurvey = (surveyId: string): Promise<SurveySubmission[]> =>
    fetchCollectionByField<SurveySubmission>('survey_submissions', 'surveyId', surveyId);

export const apiGetSurveySubmissionById = (id: string): Promise<SurveySubmission | null> => fetchDocumentById<SurveySubmission>('survey_submissions', id);


export const apiEnsureDemoOwnerAccount = async (
    email: string,
    password: string,
    name: string = 'Demo Owner'
): Promise<void> => {
    const callable = functions.httpsCallable('ensureDemoOwner');
    await callable({ email, password, name });
};

// --- WEBSITE INTEGRATION API ---

/**
 * Ingests contact form data from the public website and creates a new lead in the ERP.
 * This function is intended to be called by a secure backend (e.g., Firebase Cloud Function).
 * @param contactData The data submitted from the website contact form.
 * @returns The ID of the newly created lead.
 */
export const apiAddWebsiteContact = async (contactData: ContactFormData): Promise<string> => {
    // 1. Find an admin or owner to assign the lead to and to be the creator.
    const users = await apiGetUsers();
    // Prioritize Owner, then Admin, then the first user as a fallback.
    const assignableUser = users.find(u => u.role === UserRole.OWNER) || users.find(u => u.role === UserRole.ADMIN) || users[0];

    if (!assignableUser) {
        throw new Error("No users available in the system to assign the new lead to.");
    }
    const assignToId = assignableUser.id;
    
    // 2. Map form data to the lead schema.
    const newLeadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email || '',
        businessName: contactData.company,
        businessType: 'Unknown', // Default value
        leadSource: 'Website Contact Form', // As requested
        status: LeadStatus.NEW,
        priority: 'High', // As requested
        assignedTo: assignToId,
        country: 'Myanmar', // Default value
        createdByUserId: assignToId, // Attribute creation to an admin/system user
    };

    // 3. Create the new lead using the existing API function.
    const newLead = await apiAddLead(newLeadData);

    // 4. Create a detailed activity note with all the form fields.
    const activityNote = `A new inquiry was submitted from the website with the following details:
- Service Interest: ${contactData.service}
- Budget: ${contactData.budget}
- Timeline: ${contactData.timeline}

Message:
${contactData.message}
    `;
    
    await apiAddLeadActivity({
        leadId: newLead.id,
        userId: assignToId,
        type: LeadActivityType.NOTE,
        notes: activityNote,
    });
    
    // 5. Return the new lead's ID.
    return newLead.id;
};


// --- SMS Module ---
export const apiGetSmsTemplates = (): Promise<SmsTemplate[]> => fetchCollection('sms_templates', { field: 'createdAt', direction: 'desc' });
export const apiAddSmsTemplate = async (data: Omit<SmsTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmsTemplate> => {
    const result = await addDocument('sms_templates', data as Partial<SmsTemplate>, SMS_TEMPLATE_ID_PREFIX);
    void logActivityHelper('Settings', 'Add SMS Template', `Added SMS template: ${result.name || result.id}`, result.id);
    return result;
};
export const apiUpdateSmsTemplate = async (data: Partial<SmsTemplate> & { id: string }): Promise<void> => {
    await updateDocument('sms_templates', data.id, data);
    void logActivityHelper('Settings', 'Update SMS Template', `Updated SMS template: ${data.id}`, data.id);
};
export const apiDeleteSmsTemplate = async (id: string): Promise<void> => {
    await deleteDocument('sms_templates', id);
    void logActivityHelper('Settings', 'Delete SMS Template', `Deleted SMS template: ${id}`, id);
};
export const apiGetSmsMessages = (): Promise<SmsMessage[]> => fetchCollection('sms_messages', { field: 'createdAt', direction: 'desc' });
export const apiGetSmsBatches = (): Promise<SmsBatch[]> => fetchCollection('sms_batches', { field: 'createdAt', direction: 'desc' });
export const apiGetSmsSettings = (): Promise<SmsSettings | null> => fetchSingletonDocument<SmsSettings>('settings', 'smsSettings');
export const apiUpdateSmsSettings = async (data: SmsSettings): Promise<void> => {
    await db.collection('settings').doc('smsSettings').set(data, { merge: true });
    void logActivityHelper('Settings', 'Update SMS Settings', 'Updated SMS settings', 'smsSettings');
};

export const apiSendSmsBatch = async (
    recipients: SmsRecipient[],
    messageBody: string,
    templateId: string | null,
    scheduledFor: string | null,
    createdByUserId: string
): Promise<SmsBatch> => {
    if (recipients.length === 0) {
        throw new Error("Recipient list cannot be empty.");
    }

    // --- 1. Create Firestore records for tracking ---
    const firestoreWriteBatch = db.batch();
    const newBatchId = await getNextId(SMS_BATCH_ID_PREFIX);
    const batchRef = db.collection('sms_batches').doc(newBatchId);

    const batchData: any = {
        messageBody,
        status: scheduledFor ? 'Scheduled' : 'Processing',
        totalMessages: recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        createdByUserId,
    };
    if (templateId) batchData.templateId = templateId;
    if (scheduledFor) batchData.scheduledFor = scheduledFor;

    firestoreWriteBatch.set(batchRef, { ...batchData, createdAt: getMyanmarISOString() });

    const messageIds = await getNextIdBlock(SMS_MESSAGE_ID_PREFIX, recipients.length);
    const apiMessagesPayload: any[] = [];

    recipients.forEach((recipient, index) => {
        let personalizedBody = messageBody;
        for (const key in recipient) {
            personalizedBody = personalizedBody.replace(new RegExp(`{{${key}}}`, 'g'), recipient[key]);
        }
        
        const newMessageId = messageIds[index];
        const messageRef = db.collection('sms_messages').doc(newMessageId);

        const messageData: Omit<SmsMessage, 'id' | 'createdAt'> = {
            batchId: newBatchId,
            phone: recipient.phone_number,
            body: personalizedBody,
            status: scheduledFor ? SmsStatus.SCHEDULED : SmsStatus.QUEUED,
        };
        firestoreWriteBatch.set(messageRef, { ...messageData, createdAt: getMyanmarISOString() });
        
        // Prepare payload for external API if not scheduled
        if (!scheduledFor) {
            apiMessagesPayload.push({
                to: recipient.phone_number,
                message: personalizedBody,
                clientReference: newMessageId,
            });
        }
    });

    await firestoreWriteBatch.commit();

    // If scheduled, frontend job is done. A backend function would handle sending later.
    if (scheduledFor) {
        const createdBatchDoc = await batchRef.get();
        return convertTimestamps({ id: createdBatchDoc.id, ...createdBatchDoc.data() }) as SmsBatch;
    }

    // --- 2. Make the API call via Cloud Function (to avoid CORS) ---
    try {
        const settings = await apiGetSmsSettings();
        if (!settings?.senderId) {
            throw new Error("SMS Sender ID is not configured. Please configure it in the SMS settings page.");
        }
        if (!settings?.apiKey || !settings?.apiSecret) {
            throw new Error("SMS API Key and Secret are not configured. Please configure them in the SMS settings page.");
        }
        if (!settings?.apiUrl) {
            throw new Error("SMS API URL is not configured. Please configure it in the SMS settings page.");
        }

        // Prepare payload for Cloud Function
        apiMessagesPayload.forEach(msg => { msg.from = settings.senderId; });
        
        // Use Firebase Functions SDK callable function to handle CORS automatically
        try {
            const sendSmsCallable = functions.httpsCallable('sendSmsBatch', { timeout: 60000 });
            
            const result = await sendSmsCallable({ 
                messages: apiMessagesPayload,
                apiKey: settings.apiKey,
                apiSecret: settings.apiSecret,
                apiUrl: settings.apiUrl,
                senderId: settings.senderId
            });
            
            const responseBody = result.data as any;

            // Check for application-level errors
            if (responseBody.error) {
                throw new Error(`API Error: ${responseBody.error}`);
            }

            // --- 3. Process successful response and update Firestore ---
            const updateBatch = db.batch();
            let sentCount = 0;
            let failedCount = 0;

            if (responseBody.results && Array.isArray(responseBody.results)) {
                responseBody.results.forEach((result: any, index: number) => {
                    const internalMessageId = messageIds[index];
                    if (internalMessageId) {
                        const messageRef = db.collection('sms_messages').doc(internalMessageId);
                        
                        // Check for success: either result.success is true, or we have a message_id without error
                        // Even if status is null, having message_id means SMSPoh accepted it
                        // Also, if success is explicitly true, trust it
                        const hasMessageId = !!(result.message_id || result.id);
                        const hasExplicitError = !!(result.error || (result.status && typeof result.status === 'string' && result.status.toLowerCase().includes('error')));
                        const isSuccess = result.success === true || 
                                         (hasMessageId && !hasExplicitError) ||
                                         result.status === 'Accepted' || 
                                         result.status === 'sent' || 
                                         result.status === 'queued' ||
                                         result.status === 'Sent' ||
                                         result.status === 'Delivered' ||
                                         (!hasExplicitError && !result.error);

                        if (isSuccess) {
                            sentCount++;
                            updateBatch.update(messageRef, {
                                status: SmsStatus.SENT,
                                sentAt: getMyanmarISOString(),
                                error: firebase.firestore.FieldValue.delete(),
                            });
                        } else {
                            failedCount++;
                            updateBatch.update(messageRef, {
                                status: SmsStatus.FAILED,
                                sentAt: getMyanmarISOString(),
                                error: result.error || result.message || `API Status: ${result.status || 'null'}`,
                            });
                        }
                    }
                });
            }
            
            updateBatch.update(batchRef, {
                status: failedCount > 0 && sentCount > 0 ? 'Completed with errors' : 
                       failedCount === recipients.length ? 'Failed' : 'Completed',
                sentCount: firebase.firestore.FieldValue.increment(sentCount),
                failedCount: firebase.firestore.FieldValue.increment(failedCount)
            });

            await updateBatch.commit();
            
        } catch (cloudFunctionError: any) {
            // If Cloud Function fails (not deployed, CORS, etc.)
            console.error("Cloud Function call failed:", cloudFunctionError);
            
            const errorCode = cloudFunctionError?.code || '';
            const errorMessage = cloudFunctionError?.message || '';
            const isFunctionUnavailable = 
                errorCode === 'functions/not-found' || 
                errorCode === 'functions/internal' ||
                errorCode === 'functions/unavailable' ||
                errorMessage?.includes('CORS') ||
                errorMessage?.includes('Access-Control-Allow-Origin') ||
                errorMessage?.includes('Failed to fetch') ||
                errorMessage?.includes('network error');
            
            if (isFunctionUnavailable) {
                // Mark messages as queued - Cloud Function needs to be deployed
                const queueBatch = db.batch();
                const errorMsg = 'Cloud Function sendSmsBatch is not deployed. Please deploy the Cloud Function to enable SMS sending. Messages are queued for processing.';
                
                messageIds.forEach(id => {
                    const messageRef = db.collection('sms_messages').doc(id);
                    queueBatch.update(messageRef, { 
                        status: SmsStatus.QUEUED,
                        error: 'Cloud Function not available. Message queued for processing.'
                    });
                });
                queueBatch.update(batchRef, { 
                    status: 'Pending',
                    error: errorMsg
                });
                await queueBatch.commit();
                
                // Return the batch with queued status
                const finalBatchDoc = await batchRef.get();
                const batchData = convertTimestamps({ id: finalBatchDoc.id, ...finalBatchDoc.data() }) as SmsBatch;
                return batchData;
            } else {
                // For other errors, throw normally
                throw cloudFunctionError;
            }
        }
        
    } catch (error: any) {
        // Handle other errors
        const errorMessage = error?.message || 'Unknown error occurred';
        console.error("Failed to send SMS batch:", error);
        const errorUpdateBatch = db.batch();
        messageIds.forEach(id => {
            const messageRef = db.collection('sms_messages').doc(id);
            errorUpdateBatch.update(messageRef, { 
                status: SmsStatus.FAILED, 
                error: errorMessage
            });
        });
        errorUpdateBatch.update(batchRef, { 
            status: 'Failed', 
            failedCount: recipients.length,
            error: errorMessage
        });
        await errorUpdateBatch.commit();
        throw error; // Re-throw to be caught by the UI
    }
    
    const finalBatchDoc = await batchRef.get();
    return convertTimestamps({ id: finalBatchDoc.id, ...finalBatchDoc.data() }) as SmsBatch;
};

// --- Activity Log ---
export interface ActivityLogPayload {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    module: string;
    action: string;
    description?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
}

export interface ActivityLogQueryOptions {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}

const ACTIVITY_LOG_COLLECTION = 'activityLogs';
const ACTIVITY_LOG_HISTORY_DAYS = 60;
const ACTIVITY_LOG_DEFAULT_LIMIT = 500;

export const apiLogActivity = async (payload: ActivityLogPayload): Promise<ActivityLogEntry> => {
    // Use Firestore server timestamp for querying/sorting,
    // while keeping Myanmar-local ISO strings for createdAt/updatedAt.
    const timestampString = getMyanmarISOString();
    const docRef = await db.collection(ACTIVITY_LOG_COLLECTION).add({
        ...payload,
        // Firestore Timestamp used for range queries in apiGetActivityLogs
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: timestampString,
        updatedAt: timestampString,
    });

    const docSnap = await docRef.get();
    return convertTimestamps({ id: docRef.id, ...docSnap.data() }) as ActivityLogEntry;
};

/**
 * Helper function to log activities automatically from API functions
 * This is fire-and-forget to avoid blocking operations
 */
const logActivityHelper = async (
    module: string,
    action: string,
    description?: string,
    targetId?: string,
    metadata?: Record<string, any>
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return; // No user logged in, skip logging

        // Fetch user details
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data() as User;
        const ipAddress = metadata?.ipAddress || 'N/A';

        await apiLogActivity({
            actorId: currentUser.uid,
            actorName: userData.name || userData.email || 'Unknown',
            actorRole: userData.role || UserRole.STAFF,
            module,
            action,
            description,
            targetId,
            metadata,
            ipAddress,
        });
    } catch (error) {
        // Silently fail - don't block operations if logging fails
        console.warn('Failed to log activity:', error);
    }
};

export const apiGetActivityLogs = async (options: ActivityLogQueryOptions = {}): Promise<ActivityLogEntry[]> => {
    const { startDate, endDate, limit } = options;
    const now = new Date();
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - ACTIVITY_LOG_HISTORY_DAYS);

    const effectiveStart = startDate && startDate > sixtyDaysAgo ? startDate : sixtyDaysAgo;
    const effectiveEnd = endDate && endDate < now ? endDate : now;

    let query: firebase.firestore.Query = db.collection(ACTIVITY_LOG_COLLECTION)
        .where('timestamp', '>=', effectiveStart);

    if (effectiveEnd) {
        query = query.where('timestamp', '<=', effectiveEnd);
    }

    query = query.orderBy('timestamp', 'desc');
    
    // Only apply limit if explicitly provided, otherwise fetch all
    if (limit && limit > 0) {
        query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as ActivityLogEntry);
};

/**
 * Optional admin utility: migrate legacy activity log documents that stored
 * `timestamp` as a string into proper Firestore Timestamps so date-range
 * queries work consistently.
 *
 * This is NOT called anywhere in the UI; it is intended to be run manually
 * from an admin-only context (e.g. a one-off script or a hidden admin button).
 *
 * @returns number of documents updated
 */
export const apiMigrateActivityLogTimestamps = async (): Promise<number> => {
    const snapshot = await db.collection(ACTIVITY_LOG_COLLECTION).get();
    let updatedCount = 0;

    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data() as any;
        const ts = data.timestamp;

        // Only migrate documents where timestamp is a string
        if (typeof ts === 'string') {
            const date = new Date(ts);
            if (!isNaN(date.getTime())) {
                const ref = doc.ref;
                batch.update(ref, {
                    timestamp: firebase.firestore.Timestamp.fromDate(date),
                });
                updatedCount += 1;
            }
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
    }

    return updatedCount;
};

// ============================================================================
// POS System API Functions
// ============================================================================

// --- Product Management APIs ---
export const apiGetPOSProducts = (): Promise<POSProduct[]> => fetchCollection('pos_products', { field: 'createdAt', direction: 'desc' });
export const apiGetPOSProductById = (id: string): Promise<POSProduct | null> => fetchDocumentById<POSProduct>('pos_products', id);
export const apiAddPOSProduct = async (
    productData: Omit<POSProduct, 'id' | 'createdAt' | 'updatedAt' | 'images'>,
    imageFiles?: File[]
): Promise<POSProduct> => {
    // Generate ID first for image uploads
    const newId = await getNextId(POS_PRODUCT_ID_PREFIX);
    let imageUrls: string[] = [];
    
    if (imageFiles && imageFiles.length > 0) {
        imageUrls = await Promise.all(
            imageFiles.map((file, index) => 
                apiUploadFile(file, `pos_products/${newId}/image_${index}.jpg`)
            )
        );
    }
    
    const productDataWithImages: any = {
        ...productData,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        createdAt: getMyanmarISOString(),
        updatedAt: getMyanmarISOString(),
    };
    
    const productRef = db.collection('pos_products').doc(newId);
    await productRef.set(productDataWithImages);
    
    const docSnap = await productRef.get();
    const newProduct = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as POSProduct;
    void logActivityHelper('POS Products', 'Create', `Created product: ${newProduct.name}`, newProduct.id, { sku: newProduct.sku });
    return newProduct;
};
export const apiUpdatePOSProduct = async (
    data: Partial<POSProduct> & { id: string },
    imageFiles?: File[]
): Promise<void> => {
    let imageUrls: string[] = data.images || [];
    
    if (imageFiles && imageFiles.length > 0) {
        // Upload new images
        const uploadedUrls = await Promise.all(
            imageFiles.map((file, index) => 
                apiUploadFile(file, `pos_products/${data.id}/image_${Date.now()}_${index}.jpg`)
            )
        );
        // Combine existing images with new ones
        imageUrls = [...imageUrls, ...uploadedUrls];
    }
    
    const dataToUpdate = {
        ...data,
        images: imageUrls.length > 0 ? imageUrls : undefined,
    };
    
    await updateDocument('pos_products', data.id, dataToUpdate);
    void logActivityHelper('POS Products', 'Update', `Updated product: ${data.id}`, data.id, data);
};
export const apiDeletePOSProduct = async (id: string): Promise<void> => {
    // Check if product is used in any orders
    const ordersSnapshot = await db.collection('pos_orders')
        .where('items', 'array-contains-any', [{ productId: id }])
        .limit(1)
        .get();
    if (!ordersSnapshot.empty) {
        throw new Error("Cannot delete product: It is used in existing orders.");
    }
    await deleteDocument('pos_products', id);
    void logActivityHelper('POS Products', 'Delete', `Deleted product: ${id}`, id);
};
export const apiGetLowStockProducts = async (): Promise<POSProduct[]> => {
    const products = await apiGetPOSProducts();
    return products.filter(p => p.isActive && p.minStockQuantity !== undefined && p.stockQuantity <= p.minStockQuantity);
};

// --- POS Product Import Function ---
export const apiProcessPOSProductImport = async (data: ParsedPOSProductExcelRow[]): Promise<POSProductImportResult> => {
    const results: POSProductImportResult = {
        productsAdded: 0,
        productsUpdated: 0,
        variantsAdded: 0,
        errors: []
    };

    // Group rows by product name
    const productGroups = new Map<string, ParsedPOSProductExcelRow[]>();
    for (const row of data) {
        if (!row.productName || !row.colourOfFrame || !row.colourOfGlass) {
            results.errors.push({ 
                row: row.rowIndex, 
                message: 'Missing required fields: Product Name, Colour of Frame, or Colour of Glass' 
            });
            continue;
        }

        const productName = row.productName.trim();
        if (!productGroups.has(productName)) {
            productGroups.set(productName, []);
        }
        productGroups.get(productName)!.push(row);
    }

    // Get existing products and categories
    const [existingProducts, existingCategories] = await Promise.all([
        apiGetPOSProducts(),
        apiGetPOSCategories()
    ]);
    
    const productNameMap = new Map<string, POSProduct>();
    existingProducts.forEach(p => {
        const nameLower = p.name.toLowerCase();
        if (!productNameMap.has(nameLower)) {
            productNameMap.set(nameLower, p);
        }
    });

    const categoryNameMap = new Map<string, POSProductCategory>();
    existingCategories.forEach(c => {
        const nameLower = c.name.toLowerCase();
        categoryNameMap.set(nameLower, c);
    });

    // Collect unique category names that need to be created
    const categoriesToCreate = new Set<string>();
    for (const rows of productGroups.values()) {
        const firstRow = rows[0];
        if (firstRow.category && !categoryNameMap.has(firstRow.category.toLowerCase())) {
            categoriesToCreate.add(firstRow.category);
        }
    }

    // Create missing categories
    for (const categoryName of categoriesToCreate) {
        const newCategory = await apiAddPOSCategory({ name: categoryName, isActive: true });
        categoryNameMap.set(categoryName.toLowerCase(), newCategory);
    }

    // Process each product group
    const batch = db.batch();
    const timestamps = {
        createdAt: getMyanmarISOString(),
        updatedAt: getMyanmarISOString()
    };

    for (const [productName, rows] of productGroups.entries()) {
        const productNameLower = productName.toLowerCase();
        let product = productNameMap.get(productNameLower);
        const firstRow = rows[0];

        // Validate required fields
        const priceMMK = firstRow.priceMMK ? Number(firstRow.priceMMK) : null;
        const stockQuantity = firstRow.stockQuantity ? Number(firstRow.stockQuantity) : null;

        if (priceMMK === null || isNaN(priceMMK) || priceMMK < 0) {
            results.errors.push({ 
                row: firstRow.rowIndex, 
                message: `Invalid Price MMK: ${firstRow.priceMMK}` 
            });
            continue;
        }

        if (stockQuantity === null || isNaN(stockQuantity) || stockQuantity < 0) {
            results.errors.push({ 
                row: firstRow.rowIndex, 
                message: `Invalid Stock Quantity: ${firstRow.stockQuantity}` 
            });
            continue;
        }

        // Create or update product
        if (!product) {
            // Create new product
            const newProductId = await getNextId(POS_PRODUCT_ID_PREFIX);
            const costMMK = firstRow.costMMK ? Number(firstRow.costMMK) : undefined;
            const minStockQuantity = firstRow.minStockQuantity ? Number(firstRow.minStockQuantity) : undefined;

            // Get category if provided
            let categoryId: string | undefined;
            if (firstRow.category) {
                const category = categoryNameMap.get(firstRow.category.toLowerCase());
                categoryId = category?.id;
            }

            const newProduct: any = {
                id: newProductId,
                name: productName,
                sku: firstRow.sku || `${newProductId}-BASE`,
                description: firstRow.description || '',
                category: firstRow.category || '',
                categoryId: categoryId,
                priceMMK: priceMMK,
                costMMK: costMMK !== undefined && !isNaN(costMMK) ? costMMK : undefined,
                stockQuantity: 0, // Will be calculated from variants
                minStockQuantity: minStockQuantity !== undefined && !isNaN(minStockQuantity) ? minStockQuantity : undefined,
                variants: [],
                isActive: true,
                ...timestamps
            };

            const productRef = db.collection('pos_products').doc(newProductId);
            batch.set(productRef, newProduct);
            product = newProduct as POSProduct;
            results.productsAdded++;
        } else {
            // Update existing product
            const productRef = db.collection('pos_products').doc(product.id);
            const updateData: any = { updatedAt: timestamps.updatedAt };

            if (firstRow.sku && firstRow.sku.trim()) {
                updateData.sku = firstRow.sku.trim();
            }
            if (firstRow.description && firstRow.description.trim()) {
                updateData.description = firstRow.description.trim();
            }
            if (firstRow.category) {
                const category = categoryNameMap.get(firstRow.category.toLowerCase());
                if (category) {
                    updateData.category = firstRow.category;
                    updateData.categoryId = category.id;
                }
            }
            if (firstRow.costMMK) {
                const costMMK = Number(firstRow.costMMK);
                if (!isNaN(costMMK)) {
                    updateData.costMMK = costMMK;
                }
            }
            if (firstRow.minStockQuantity) {
                const minStock = Number(firstRow.minStockQuantity);
                if (!isNaN(minStock)) {
                    updateData.minStockQuantity = minStock;
                }
            }

            batch.update(productRef, updateData);
            results.productsUpdated++;
        }

        // Process variants for this product
        const existingVariants = product.variants || [];
        const variantMap = new Map<string, POSProductVariant>();
        existingVariants.forEach(v => {
            const key = v.name.toLowerCase();
            variantMap.set(key, v);
        });

        let totalStockQuantity = product.stockQuantity || 0;

        for (const row of rows) {
            const frameColour = row.colourOfFrame!.trim();
            const glassColour = row.colourOfGlass!.trim();
            const variantName = `Frame: ${frameColour}, Glass: ${glassColour}`;
            const variantKey = variantName.toLowerCase();

            const variantStockQty = row.stockQuantity ? Number(row.stockQuantity) : 0;
            const variantPrice = row.priceMMK ? Number(row.priceMMK) : priceMMK;

            if (isNaN(variantStockQty) || variantStockQty < 0) {
                results.errors.push({ 
                    row: row.rowIndex, 
                    message: `Invalid Stock Quantity for variant: ${variantStockQty}` 
                });
                continue;
            }

            if (isNaN(variantPrice) || variantPrice < 0) {
                results.errors.push({ 
                    row: row.rowIndex, 
                    message: `Invalid Price MMK for variant: ${variantPrice}` 
                });
                continue;
            }

            const variantSku = row.sku || `${product.id}-${frameColour}-${glassColour}`;

            if (variantMap.has(variantKey)) {
                // Update existing variant
                const existingVariant = variantMap.get(variantKey)!;
                totalStockQuantity = totalStockQuantity - (existingVariant.stockQuantity || 0) + variantStockQty;
                existingVariant.stockQuantity = variantStockQty;
                existingVariant.priceMMK = variantPrice;
                if (row.sku) existingVariant.sku = variantSku;
            } else {
                // Create new variant
                const newVariant: POSProductVariant = {
                    id: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: variantName,
                    sku: variantSku,
                    priceMMK: variantPrice,
                    stockQuantity: variantStockQty,
                    isActive: true
                };
                existingVariants.push(newVariant);
                variantMap.set(variantKey, newVariant);
                totalStockQuantity += variantStockQty;
                results.variantsAdded++;
            }
        }

        // Update product with new variants and total stock
        const productRef = db.collection('pos_products').doc(product.id);
        batch.update(productRef, {
            variants: existingVariants,
            stockQuantity: totalStockQuantity,
            updatedAt: timestamps.updatedAt
        });
    }

    // Commit batch
    try {
        await batch.commit();
        void logActivityHelper('POS Products', 'Import', `Imported ${results.productsAdded} products, ${results.variantsAdded} variants`, '');
    } catch (error) {
        console.error('Batch commit error:', error);
        results.errors.push({ 
            row: 0, 
            message: `Batch commit failed: ${(error as Error).message}` 
        });
    }

    return results;
};

// --- POS Product Category Management APIs ---
export const apiGetPOSCategories = (): Promise<POSProductCategory[]> => fetchCollection('pos_categories', { field: 'createdAt', direction: 'desc' });
export const apiGetPOSCategoryById = (id: string): Promise<POSProductCategory | null> => fetchDocumentById<POSProductCategory>('pos_categories', id);
export const apiAddPOSCategory = async (categoryData: Omit<POSProductCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<POSProductCategory> => {
    const newCategory = await addDocument('pos_categories', categoryData as Partial<POSProductCategory>, POS_CATEGORY_ID_PREFIX);
    void logActivityHelper('POS Categories', 'Create', `Created category: ${newCategory.name}`, newCategory.id);
    return newCategory;
};
export const apiUpdatePOSCategory = async (data: Partial<POSProductCategory> & { id: string }): Promise<void> => {
    await updateDocument('pos_categories', data.id, data);
    void logActivityHelper('POS Categories', 'Update', `Updated category: ${data.id}`, data.id, data);
};
export const apiDeletePOSCategory = async (id: string): Promise<void> => {
    // Check if category is used in any products
    const productsSnapshot = await db.collection('pos_products')
        .where('categoryId', '==', id)
        .limit(1)
        .get();
    if (!productsSnapshot.empty) {
        throw new Error("Cannot delete category: It is used by existing products.");
    }
    await deleteDocument('pos_categories', id);
    void logActivityHelper('POS Categories', 'Delete', `Deleted category: ${id}`, id);
};

// --- POS Customer Management APIs ---
export const apiGetPOSCustomers = (): Promise<POSCustomer[]> => fetchCollection('pos_customers', { field: 'createdAt', direction: 'desc' });
export const apiGetPOSCustomerById = (id: string): Promise<POSCustomer | null> => fetchDocumentById<POSCustomer>('pos_customers', id);
export const apiAddPOSCustomer = async (customerData: Omit<POSCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<POSCustomer> => {
    const newCustomer = await addDocument('pos_customers', customerData as Partial<POSCustomer>, POS_CUSTOMER_ID_PREFIX);
    void logActivityHelper('POS Customers', 'Create', `Created customer: ${newCustomer.name}`, newCustomer.id);
    return newCustomer;
};
export const apiUpdatePOSCustomer = async (data: Partial<POSCustomer> & { id: string }): Promise<void> => {
    await updateDocument('pos_customers', data.id, data);
    void logActivityHelper('POS Customers', 'Update', `Updated customer: ${data.id}`, data.id, data);
};
export const apiDeletePOSCustomer = async (id: string): Promise<void> => {
    // Check if customer is used in any orders
    const ordersSnapshot = await db.collection('pos_orders')
        .where('customerId', '==', id)
        .limit(1)
        .get();
    if (!ordersSnapshot.empty) {
        throw new Error("Cannot delete customer: They have existing orders.");
    }
    await deleteDocument('pos_customers', id);
    void logActivityHelper('POS Customers', 'Delete', `Deleted customer: ${id}`, id);
};

// --- Inventory Transaction APIs ---
export const apiGetInventoryTransactions = async (productId?: string): Promise<InventoryTransaction[]> => {
    if (productId) {
        return fetchCollectionByField<InventoryTransaction>('inventory_transactions', 'productId', productId);
    }
    return fetchCollection('inventory_transactions', { field: 'createdAt', direction: 'desc' });
};
export const apiAddInventoryTransaction = async (
    transactionData: Omit<InventoryTransaction, 'id' | 'createdAt'>,
    updateProductStock: boolean = true
): Promise<InventoryTransaction> => {
    // Generate ID before transaction
    const newId = await getNextId(INVENTORY_TRANSACTION_ID_PREFIX);
    
    return await db.runTransaction(async (transaction) => {
        const productRef = db.collection('pos_products').doc(transactionData.productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
            throw new Error("Product not found");
        }
        
        const product = productDoc.data() as POSProduct;
        const previousQuantity = product.stockQuantity;
        const newQuantity = previousQuantity + transactionData.quantity;
        
        if (newQuantity < 0) {
            throw new Error(`Insufficient stock. Available: ${previousQuantity}, Requested: ${Math.abs(transactionData.quantity)}`);
        }
        
        const transactionDataWithQuantities: Omit<InventoryTransaction, 'id' | 'createdAt'> = {
            ...transactionData,
            previousQuantity,
            newQuantity,
        };
        
        // Create document within transaction
        const invTxnRef = db.collection('inventory_transactions').doc(newId);
        
        transaction.set(invTxnRef, {
            ...transactionDataWithQuantities,
            createdAt: getMyanmarISOString(),
        } as any);
        
        if (updateProductStock) {
            transaction.update(productRef, {
                stockQuantity: newQuantity,
                updatedAt: getMyanmarISOString()
            });
        }
        
        const result: InventoryTransaction = {
            id: newId,
            ...transactionDataWithQuantities,
            createdAt: new Date().toISOString(), // Will be updated by server
        };
        
        void logActivityHelper('Inventory', 'Transaction', 
            `${transactionData.type} transaction for ${transactionData.productName}`, 
            newId, 
            { quantity: transactionData.quantity, newStock: newQuantity }
        );
        
        return result;
    });
};

// --- POS Order APIs ---
const generateOrderNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${year}${month}${day}-${random}`;
};

export const apiGetPOSOrders = async (filters?: {
    status?: POSOrderStatus;
    customerId?: string;
    salesType?: SalesType;
    startDate?: string;
    endDate?: string;
}): Promise<POSOrder[]> => {
    let query: firebase.firestore.Query = db.collection('pos_orders');
    
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters?.customerId) {
        query = query.where('customerId', '==', filters.customerId);
    }
    if (filters?.salesType) {
        query = query.where('salesType', '==', filters.salesType);
    }
    if (filters?.startDate) {
        query = query.where('createdAt', '>=', new Date(filters.startDate));
    }
    if (filters?.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.where('createdAt', '<=', endDate);
    }
    
    query = query.orderBy('createdAt', 'desc');
    
    try {
        const snapshot = await query.get();
        return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as POSOrder);
    } catch (error: any) {
        // If index error, try without orderBy and sort in memory
        if (error.code === 'failed-precondition' && error.message?.includes('index')) {
            console.warn('Firestore index required. Fetching without orderBy and sorting in memory.');
            let fallbackQuery: firebase.firestore.Query = db.collection('pos_orders');
            if (filters?.status) {
                fallbackQuery = fallbackQuery.where('status', '==', filters.status);
            }
            if (filters?.customerId) {
                fallbackQuery = fallbackQuery.where('customerId', '==', filters.customerId);
            }
            if (filters?.salesType) {
                fallbackQuery = fallbackQuery.where('salesType', '==', filters.salesType);
            }
            if (filters?.startDate) {
                fallbackQuery = fallbackQuery.where('createdAt', '>=', new Date(filters.startDate));
            }
            if (filters?.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                fallbackQuery = fallbackQuery.where('createdAt', '<=', endDate);
            }
            const snapshot = await fallbackQuery.get();
            const results = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as POSOrder);
            // Sort in memory by createdAt descending
            return results.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });
        }
        throw error;
    }
};

export const apiGetPOSOrderById = (id: string): Promise<POSOrder | null> => fetchDocumentById<POSOrder>('pos_orders', id);
export const apiGetPOSOrdersByCustomer = async (customerId: string): Promise<POSOrder[]> => {
    return apiGetPOSOrders({ customerId });
};
export const apiGetPOSRevenueByCustomer = async (customerId: string, startDate?: string, endDate?: string): Promise<POSRevenue[]> => {
    let query: firebase.firestore.Query = db.collection('pos_revenue').where('customerId', '==', customerId);
    
    // If we have date filters, we need to order by date (requires composite index)
    // If no date filters, we can order by date without composite index
    if (startDate || endDate) {
        if (startDate) {
            query = query.where('date', '>=', startDate);
        }
        if (endDate) {
            query = query.where('date', '<=', endDate);
        }
        // When using range queries with equality, orderBy must match the range field
        query = query.orderBy('date', 'desc');
    } else {
        // No date filters - can order by date directly
        query = query.orderBy('date', 'desc');
    }
    
    try {
        const snapshot = await query.get();
        return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as POSRevenue);
    } catch (error: any) {
        // If index error, try without orderBy and sort in memory
        if (error.code === 'failed-precondition' && error.message?.includes('index')) {
            console.warn('Firestore index required. Fetching without orderBy and sorting in memory.');
            let fallbackQuery: firebase.firestore.Query = db.collection('pos_revenue').where('customerId', '==', customerId);
            if (startDate) {
                fallbackQuery = fallbackQuery.where('date', '>=', startDate);
            }
            if (endDate) {
                fallbackQuery = fallbackQuery.where('date', '<=', endDate);
            }
            const snapshot = await fallbackQuery.get();
            const results = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as POSRevenue);
            // Sort in memory by date descending
            return results.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
        }
        throw error;
    }
};

export const apiCreatePOSOrder = async (orderData: Omit<POSOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<POSOrder> => {
    // Generate IDs before transaction
    const orderNumber = generateOrderNumber();
    const orderId = await getNextId(POS_ORDER_ID_PREFIX);
    const revenueId = await getNextId(POS_REVENUE_ID_PREFIX);
    
    // Generate inventory transaction IDs
    const inventoryTransactionIds: string[] = [];
    for (let i = 0; i < orderData.items.length; i++) {
        inventoryTransactionIds.push(await getNextId(INVENTORY_TRANSACTION_ID_PREFIX));
    }
    
    return await db.runTransaction(async (transaction) => {
        // STEP 1: Read all necessary documents first (Firestore transactions require all reads before all writes)
        const productDocs: Map<string, firebase.firestore.DocumentSnapshot> = new Map();
        
        for (const item of orderData.items) {
            const productRef = db.collection('pos_products').doc(item.productId);
            const productDoc = await transaction.get(productRef);
            
            if (!productDoc.exists) {
                throw new Error(`Product ${item.productName} not found`);
            }
            
            productDocs.set(item.productId, productDoc);
            
            const product = productDoc.data() as POSProduct;
            const variant = item.variantId ? product.variants?.find(v => v.id === item.variantId) : null;
            const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
            
            if (availableStock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.productName}. Available: ${availableStock}, Requested: ${item.quantity}`);
            }
        }
        
        // STEP 2: Now perform all writes
        let invTxnIndex = 0;
        for (const item of orderData.items) {
            const productDoc = productDocs.get(item.productId);
            if (!productDoc) continue;
            
            const product = productDoc.data() as POSProduct;
            const variant = item.variantId ? product.variants?.find(v => v.id === item.variantId) : null;
            const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
            const productRef = db.collection('pos_products').doc(item.productId);
            
            // Update stock
            if (variant) {
                const updatedVariants = product.variants?.map(v => 
                    v.id === item.variantId 
                        ? { ...v, stockQuantity: v.stockQuantity - item.quantity }
                        : v
                );
                transaction.update(productRef, {
                    variants: updatedVariants,
                    updatedAt: getMyanmarISOString()
                });
            } else {
                transaction.update(productRef, {
                    stockQuantity: product.stockQuantity - item.quantity,
                    updatedAt: getMyanmarISOString()
                });
            }
            
            // Create inventory transaction
            const previousStock = availableStock;
            const inventoryTransactionData: Omit<InventoryTransaction, 'id' | 'createdAt'> = {
                productId: item.productId,
                productName: item.productName,
                type: InventoryTransactionType.SALE,
                quantity: -item.quantity,
                previousQuantity: previousStock,
                newQuantity: previousStock - item.quantity,
                referenceId: orderId,
                referenceType: 'POSOrder',
                userId: orderData.createdByUserId,
            };
            
            const invTxnRef = db.collection('inventory_transactions').doc(inventoryTransactionIds[invTxnIndex]);
            transaction.set(invTxnRef, {
                ...inventoryTransactionData,
                createdAt: getMyanmarISOString(),
            } as any);
            invTxnIndex++;
        }
        
        // Create order
        const orderRef = db.collection('pos_orders').doc(orderId);
        
        // Remove undefined values and clean nested objects (Firestore doesn't allow undefined)
        const cleanValue = (value: any): any => {
            if (value === undefined || value === null) {
                return undefined;
            }
            if (Array.isArray(value)) {
                return value.map(cleanValue);
            }
            if (typeof value === 'object' && value.constructor === Object) {
                const cleaned: any = {};
                Object.keys(value).forEach(key => {
                    const cleanedVal = cleanValue(value[key]);
                    if (cleanedVal !== undefined) {
                        cleaned[key] = cleanedVal;
                    }
                });
                return Object.keys(cleaned).length > 0 ? cleaned : undefined;
            }
            // Check for invalid numbers
            if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                return undefined;
            }
            return value;
        };
        
        const cleanedOrderData: any = {};
        Object.keys(orderData).forEach(key => {
            const cleanedValue = cleanValue((orderData as any)[key]);
            if (cleanedValue !== undefined) {
                cleanedOrderData[key] = cleanedValue;
            }
        });
        
        // Set orderId in deliveryTracking if it exists
        if (cleanedOrderData.deliveryTracking && typeof cleanedOrderData.deliveryTracking === 'object') {
            cleanedOrderData.deliveryTracking.orderId = orderId;
        }
        
        const orderToSave: Omit<POSOrder, 'id'> = {
            ...cleanedOrderData,
            orderNumber,
            createdAt: getMyanmarISOString(),
            updatedAt: getMyanmarISOString(),
        };
        
        transaction.set(orderRef, orderToSave as any);
        
        // Create revenue entry
        const revenueData: Omit<POSRevenue, 'id' | 'createdAt'> = {
            orderId,
            orderNumber,
            salesType: orderData.salesType,
            customerId: orderData.customerId,
            customerName: orderData.customerName,
            amountMMK: orderData.grandTotalMMK,
            date: getTodayInYangon(),
        };
        const revenueRef = db.collection('pos_revenue').doc(revenueId);
        transaction.set(revenueRef, {
            ...revenueData,
            createdAt: getMyanmarISOString(),
        } as any);
        
        // Construct result from data we have (don't read after transaction writes)
        const result: POSOrder = {
            id: orderId,
            ...orderData,
            orderNumber,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        } as POSOrder;
        
        void logActivityHelper('POS Orders', 'Create', `Created order: ${orderNumber}`, result.id, { 
            orderNumber, 
            amount: orderData.grandTotalMMK,
            salesType: orderData.salesType 
        });
        return result;
    });
};

export const apiUpdatePOSOrder = async (data: Partial<POSOrder> & { id: string }): Promise<void> => {
    await updateDocument('pos_orders', data.id, { ...data, updatedAt: getMyanmarISOString() });
    void logActivityHelper('POS Orders', 'Update', `Updated order: ${data.id}`, data.id, data);
};

export const apiCancelPOSOrder = async (orderId: string, userId: string): Promise<void> => {
    return await db.runTransaction(async (transaction) => {
        const orderRef = db.collection('pos_orders').doc(orderId);
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists) {
            throw new Error("Order not found");
        }
        
        const order = orderDoc.data() as POSOrder;
        
        if (order.status === POSOrderStatus.CANCELLED || order.status === POSOrderStatus.DELIVERED) {
            throw new Error(`Cannot cancel order with status: ${order.status}`);
        }
        
        // Restore inventory
        for (const item of order.items) {
            const productRef = db.collection('pos_products').doc(item.productId);
            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists) {
                const product = productDoc.data() as POSProduct;
                const variant = item.variantId ? product.variants?.find(v => v.id === item.variantId) : null;
                
                if (variant) {
                    const updatedVariants = product.variants?.map(v => 
                        v.id === item.variantId 
                            ? { ...v, stockQuantity: v.stockQuantity + item.quantity }
                            : v
                    );
                    transaction.update(productRef, {
                        variants: updatedVariants,
                        updatedAt: getMyanmarISOString()
                    });
                } else {
                    transaction.update(productRef, {
                        stockQuantity: product.stockQuantity + item.quantity,
                        updatedAt: getMyanmarISOString()
                    });
                }
                
                // Create inventory transaction for cancellation
                const currentStock = variant ? variant.stockQuantity : product.stockQuantity;
                const inventoryTransactionData: Omit<InventoryTransaction, 'id' | 'createdAt'> = {
                    productId: item.productId,
                    productName: item.productName,
                    type: InventoryTransactionType.RETURN,
                    quantity: item.quantity,
                    previousQuantity: currentStock - item.quantity,
                    newQuantity: currentStock,
                    referenceId: orderId,
                    referenceType: 'POSOrder',
                    notes: 'Order cancellation',
                    userId,
                };
                
                const invTxnRef = db.collection('inventory_transactions').doc();
                transaction.set(invTxnRef, {
                    ...inventoryTransactionData,
                    createdAt: getMyanmarISOString(),
                } as any);
            }
        }
        
        // Update order status
        transaction.update(orderRef, {
            status: POSOrderStatus.CANCELLED,
            updatedAt: getMyanmarISOString()
        });
        
        // Delete revenue entry
        const revenueSnapshot = await db.collection('pos_revenue').where('orderId', '==', orderId).get();
        revenueSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
    });
    
    void logActivityHelper('POS Orders', 'Cancel', `Cancelled order: ${orderId}`, orderId);
};

// --- Delivery Tracking APIs ---
export const apiUpdateDeliveryStatus = async (
    orderId: string,
    status: DeliveryStatus,
    trackingData?: Partial<DeliveryTracking>,
    userId?: string
): Promise<void> => {
    return await db.runTransaction(async (transaction) => {
        const orderRef = db.collection('pos_orders').doc(orderId);
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists) {
            throw new Error("Order not found");
        }
        
        const order = orderDoc.data() as POSOrder;
        const existingTracking = order.deliveryTracking || {} as DeliveryTracking;
        
        const updatedTracking: DeliveryTracking = {
            orderId,
            status,
            trackingNumber: trackingData?.trackingNumber || existingTracking.trackingNumber,
            carrier: trackingData?.carrier || existingTracking.carrier,
            estimatedDeliveryDate: trackingData?.estimatedDeliveryDate || existingTracking.estimatedDeliveryDate,
            actualDeliveryDate: trackingData?.actualDeliveryDate || existingTracking.actualDeliveryDate,
            deliveryAddress: trackingData?.deliveryAddress || existingTracking.deliveryAddress || {
                street: '',
                city: '',
                country: '',
            },
            notes: trackingData?.notes || existingTracking.notes,
            updatedAt: new Date().toISOString(),
            updatedBy: userId || 'system',
        };
        
        // Update order status based on delivery status
        let orderStatus = order.status;
        if (status === DeliveryStatus.DELIVERED) {
            orderStatus = POSOrderStatus.DELIVERED;
        } else if (status === DeliveryStatus.SHIPPED || status === DeliveryStatus.IN_TRANSIT) {
            orderStatus = POSOrderStatus.SHIPPED;
        } else if (status === DeliveryStatus.PROCESSING || status === DeliveryStatus.PACKED) {
            orderStatus = POSOrderStatus.PROCESSING;
        }
        
        transaction.update(orderRef, {
            deliveryTracking: updatedTracking,
            status: orderStatus,
            updatedAt: getMyanmarISOString()
        });
    });
    
    void logActivityHelper('Delivery Tracking', 'Update', `Updated delivery status for order: ${orderId}`, orderId, { status });
};

export const apiGetOrdersByDeliveryStatus = async (status: DeliveryStatus): Promise<POSOrder[]> => {
    const orders = await apiGetPOSOrders();
    return orders.filter(order => order.deliveryTracking?.status === status);
};

// --- POS Revenue APIs ---
export const apiGetPOSRevenue = async (startDate?: string, endDate?: string): Promise<POSRevenue[]> => {
    let query: firebase.firestore.Query = db.collection('pos_revenue');
    
    if (startDate) {
        query = query.where('date', '>=', startDate);
    }
    if (endDate) {
        query = query.where('date', '<=', endDate);
    }
    
    query = query.orderBy('date', 'desc');
    const snapshot = await query.get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as POSRevenue);
};

export const apiGetPOSRevenueByType = async (salesType: SalesType, startDate?: string, endDate?: string): Promise<POSRevenue[]> => {
    let query: firebase.firestore.Query = db.collection('pos_revenue').where('salesType', '==', salesType);
    
    if (startDate) {
        query = query.where('date', '>=', startDate);
    }
    if (endDate) {
        query = query.where('date', '<=', endDate);
    }
    
    query = query.orderBy('date', 'desc');
    const snapshot = await query.get();
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as POSRevenue);
};

