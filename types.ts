// --- ENUMS ---

export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  TEAM_LEADER = 'Team Leader',
  STAFF = 'Staff',
}

export enum Permission {
  // General Settings
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_COMPANY_PROFILE = 'MANAGE_COMPANY_PROFILE',
  MANAGE_SYSTEM_LISTS = 'MANAGE_SYSTEM_LISTS',
  MANAGE_DEPARTMENTS = 'MANAGE_DEPARTMENTS',
  MANAGE_ROLES_PERMISSIONS = 'MANAGE_ROLES_PERMISSIONS',
  MANAGE_DATA_ARCHIVAL = 'MANAGE_DATA_ARCHIVAL',

  // Leads
  VIEW_LEADS = 'VIEW_LEADS',
  VIEW_ALL_LEADS = 'VIEW_ALL_LEADS',
  CREATE_LEAD = 'CREATE_LEAD',
  EDIT_LEAD = 'EDIT_LEAD',
  EDIT_ALL_LEADS = 'EDIT_ALL_LEADS',
  DELETE_LEAD = 'DELETE_LEAD',
  DELETE_ALL_LEADS = 'DELETE_ALL_LEADS',
  CONVERT_LEAD = 'CONVERT_LEAD',
  VIEW_LEAD_ACTIVITIES = 'VIEW_LEAD_ACTIVITIES',
  MANAGE_LEAD_NOTES = 'MANAGE_LEAD_NOTES',
  VIEW_LEAD_ANALYTICS = 'VIEW_LEAD_ANALYTICS',
  MANAGE_LEAD_SETTINGS = 'MANAGE_LEAD_SETTINGS',

  // Clients & Businesses
  VIEW_CLIENTS_BUSINESSES = 'VIEW_CLIENTS_BUSINESSES',
  VIEW_ALL_CLIENTS_BUSINESSES = 'VIEW_ALL_CLIENTS_BUSINESSES',
  CREATE_CLIENT = 'CREATE_CLIENT',
  EDIT_CLIENT = 'EDIT_CLIENT',
  DELETE_CLIENT = 'DELETE_CLIENT',
  MERGE_CLIENTS = 'MERGE_CLIENTS',
  MERGE_BUSINESSES = 'MERGE_BUSINESSES',
  CREATE_BUSINESS = 'CREATE_BUSINESS',
  EDIT_BUSINESS = 'EDIT_BUSINESS',
  DELETE_BUSINESS = 'DELETE_BUSINESS',
  IMPORT_CLIENTS_BUSINESSES = 'IMPORT_CLIENTS_BUSINESSES',
  
  // Services & Promotions
  VIEW_SERVICES = 'VIEW_SERVICES',
  MANAGE_SERVICES = 'MANAGE_SERVICES',
  MANAGE_PROMOTIONS = 'MANAGE_PROMOTIONS',

  // Sales
  VIEW_SALES_RECORDS = 'VIEW_SALES_RECORDS',
  VIEW_ALL_SALES_RECORDS = 'VIEW_ALL_SALES_RECORDS',
  CREATE_SALE_RECORD = 'CREATE_SALE_RECORD',
  EDIT_SALE_RECORD = 'EDIT_SALE_RECORD',
  EDIT_ALL_SALE_RECORDS = 'EDIT_ALL_SALE_RECORDS',
  CHECK_SALE_RECORD = 'CHECK_SALE_RECORD',
  DELETE_SALE_RECORD = 'DELETE_SALE_RECORD',
  DELETE_ALL_SALE_RECORDS = 'DELETE_ALL_SALE_RECORDS',
  AUTO_APPROVE_SALES_CREDIT_NOTES = 'AUTO_APPROVE_SALES_CREDIT_NOTES',

  // Finance
  VIEW_FINANCE_DASHBOARD = 'VIEW_FINANCE_DASHBOARD',
  MANAGE_PAYMENTS_RECEIPTS = 'MANAGE_PAYMENTS_RECEIPTS',
  APPROVE_PAYMENT = 'APPROVE_PAYMENT',
  MANAGE_QUOTATIONS = 'MANAGE_QUOTATIONS',
  MANAGE_INVOICES = 'MANAGE_INVOICES',
  VIEW_CLIENTS_TO_PAY = 'VIEW_CLIENTS_TO_PAY',
  MANAGE_VISA_CARDS = 'MANAGE_VISA_CARDS',
  MANAGE_EXPENSES = 'MANAGE_EXPENSES',
  VIEW_GL = 'VIEW_GL',
  MANAGE_ACCOUNTS_PAYABLE = 'MANAGE_ACCOUNTS_PAYABLE',
  MANAGE_ACCOUNTS_RECEIVABLE = 'MANAGE_ACCOUNTS_RECEIVABLE',
  MANAGE_TREASURY = 'MANAGE_TREASURY',
  MANAGE_FIXED_ASSETS = 'MANAGE_FIXED_ASSETS',
  MANAGE_CAPITAL = 'MANAGE_CAPITAL',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',

  // HR - Staff & Payroll
  VIEW_STAFF_LIST = 'VIEW_STAFF_LIST',
  VIEW_STAFF_DETAILS = 'VIEW_STAFF_DETAILS',
  CREATE_STAFF = 'CREATE_STAFF',
  EDIT_STAFF = 'EDIT_STAFF',
  DELETE_STAFF = 'DELETE_STAFF',
  VIEW_STAFF_BIRTHDAYS = 'VIEW_STAFF_BIRTHDAYS',
  VIEW_OWN_PROFILE = 'VIEW_OWN_PROFILE',
  EDIT_OWN_PROFILE_LIMITED = 'EDIT_OWN_PROFILE_LIMITED',
  
  VIEW_PAYROLL_ADMIN = 'VIEW_PAYROLL_ADMIN',
  GENERATE_PAYROLL = 'GENERATE_PAYROLL',
  EDIT_PAYSLIP = 'EDIT_PAYSLIP',
  DELETE_PAYSLIP = 'DELETE_PAYSLIP',
  MARK_PAYSLIP_PAID = 'MARK_PAYSLIP_PAID',
  VIEW_OWN_PAYSLIP = 'VIEW_OWN_PAYSLIP',

  // HR - Leave & Holidays
  VIEW_LEAVE_ADMIN = 'VIEW_LEAVE_ADMIN',
  APPROVE_LEAVE_REQUESTS = 'APPROVE_LEAVE_REQUESTS',
  VIEW_OWN_LEAVE_REQUESTS = 'VIEW_OWN_LEAVE_REQUESTS',
  CREATE_LEAVE_REQUEST = 'CREATE_LEAVE_REQUEST',
  MANAGE_HOLIDAYS = 'MANAGE_HOLIDAYS',
  MANAGE_ATTENDANCE = 'MANAGE_ATTENDANCE',

  // HR - Recruitment & Onboarding
  VIEW_RECRUITMENT = 'VIEW_RECRUITMENT',
  MANAGE_JOB_OPENINGS = 'MANAGE_JOB_OPENINGS',
  MANAGE_CANDIDATES = 'MANAGE_CANDIDATES',
  MANAGE_ONBOARDING = 'MANAGE_ONBOARDING',
  VIEW_OWN_ONBOARDING = 'VIEW_OWN_ONBOARDING',

  // HR - KPI Management
  MANAGE_KPI_LIBRARY = 'MANAGE_KPI_LIBRARY',
  ASSIGN_KPIS = 'ASSIGN_KPIS',
  RATE_TEAM_KPIS = 'RATE_TEAM_KPIS',
  PERFORM_SELF_EVALUATION = 'PERFORM_SELF_EVALUATION',
  VIEW_TEAM_KPIS = 'VIEW_TEAM_KPIS',
  VIEW_OWN_KPI_SHEET = 'VIEW_OWN_KPI_SHEET',

  // Tasks
  VIEW_TASKS = 'VIEW_TASKS',
  VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
  CREATE_TASK = 'CREATE_TASK',
  EDIT_TASK = 'EDIT_TASK',
  EDIT_ALL_TASKS = 'EDIT_ALL_TASKS',
  DELETE_TASK = 'DELETE_TASK',
  DELETE_ALL_TASKS = 'DELETE_ALL_TASKS',
  ASSIGN_TASK = 'ASSIGN_TASK',
  
  // Projects
  VIEW_PROJECTS = 'VIEW_PROJECTS',
  VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
  CREATE_PROJECT = 'CREATE_PROJECT',
  EDIT_PROJECT = 'EDIT_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  MANAGE_SURVEYS = 'MANAGE_SURVEYS',



  // SMS Communication
  VIEW_SMS_MODULE = 'VIEW_SMS_MODULE',
  SEND_SMS = 'SEND_SMS',
  MANAGE_SMS_TEMPLATES = 'MANAGE_SMS_TEMPLATES',
  MANAGE_SMS_SETTINGS = 'MANAGE_SMS_SETTINGS',

  // Reports
  VIEW_REPORTS = 'VIEW_REPORTS',
  VIEW_REPORTS_PERFORMANCE = 'VIEW_REPORTS_PERFORMANCE',

  // POS System
  VIEW_POS = 'VIEW_POS',
  MANAGE_POS_PRODUCTS = 'MANAGE_POS_PRODUCTS',
  MANAGE_POS_INVENTORY = 'MANAGE_POS_INVENTORY',
  CREATE_POS_ORDER = 'CREATE_POS_ORDER',
  MANAGE_POS_ORDERS = 'MANAGE_POS_ORDERS',
  MANAGE_DELIVERY_TRACKING = 'MANAGE_DELIVERY_TRACKING',
  VIEW_POS_REVENUE = 'VIEW_POS_REVENUE',
}


export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  PROPOSAL_SENT = 'Proposal Sent',
  CLOSED_WON = 'Closed - Won',
  CLOSED_LOST = 'Closed - Lost',
}

export enum EmployeeStatus {
  ACTIVE = 'Active',
  ON_PROBATION = 'On Probation',
  ON_LEAVE = 'On Leave',
  RESIGNED = 'Resigned',
  TERMINATED = 'Terminated',
}

export enum LeaveRequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DECLINED = 'Declined',
  CANCELLED = 'Cancelled',
}

export enum QuotationStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  CONVERTED_TO_INVOICE = 'Converted to Invoice',
  CONVERTED_TO_SALE = 'Converted to Sale',
}

export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  PARTIALLY_PAID = 'Partially Paid',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled',
}

export enum SaleStatus {
  DRAFT = 'Draft',
  CHECKED = 'Approved',
}

export enum PaymentStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  NOT_APPROVED = 'Not Approved',
}

export enum RefundStatus {
  PENDING = 'Pending',
  PROCESSED = 'Processed',
  CANCELLED = 'Cancelled',
}

export enum CreditNoteStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  CANCELLED = 'Cancelled',
}

export enum BalanceAdjustmentType {
  INCREASE = 'Increase',
  DECREASE = 'Decrease',
}

export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Active',
  PAUSED = 'Paused',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export enum TaskStatus {
  TO_DO = 'To Do',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export enum LeaveType {
  ANNUAL = 'Annual Leave',
  CASUAL = 'Casual Leave',
  UNPAID = 'Unpaid Leave',
  OFF_DAY = 'Off Day',
}

export enum LeaveDuration {
  FULL_DAY = 'Full Day',
  HALF_DAY_MORNING = 'Half Day - Morning',
  HALF_DAY_AFTERNOON = 'Half Day - Afternoon',
}

export enum LeadActivityType {
  NOTE = 'Note',
  CALL = 'Call',
  EMAIL = 'Email',
  MEETING = 'Meeting',
  STATUS_CHANGE = 'Status Change',
  CONVERSION = 'Conversion',
}

export enum QuestionType {
    SINGLE_CHOICE = 'Single-Choice',
    MULTIPLE_CHOICE = 'Multiple-Choice',
    RATING_SCALE = 'Rating-Scale',
    OPEN_TEXT = 'Open-Text',
    TERMS_AND_CONDITIONS = 'Terms-and-Conditions',
    PRICE_CHART = 'Price-Chart',
    FILE_UPLOAD = 'File-Upload',
    SINGLE_CHOICE_WITH_TEXT = 'Single-Choice-With-Text',
    SEMANTIC_DIFFERENTIAL = 'Semantic-Differential',
}

// New enum for Facebook Ad campaign status
export enum FacebookCampaignStatus {
  ACTIVE = 'Active',
  OFF = 'Off',
  COMPLETED = 'Completed',
  DELETED = 'Deleted',
  NOT_DELIVERING = 'Not Delivering',
  ACCOUNT_DISABLED = 'Account Disabled',
}

export enum CandidateStatus {
  APPLIED = 'Applied',
  SCREENING = 'Screening',
  INTERVIEW = 'Interview',
  OFFERED = 'Offered',
  HIRED = 'Hired',
  REJECTED = 'Rejected',
}

export enum ContentPostStatus {
    DRAFT = 'Draft',
    PENDING_REVISION = 'Pending Revision',
    APPROVED = 'Approved', // Client approved for production
    PENDING_CONFIRMATION = 'Pending Confirmation', // Final assets uploaded, waiting for final client sign-off
    CONFIRMED = 'Confirmed for Publishing', // Client gave final sign-off
}

export enum SmsStatus {
  QUEUED = 'Queued',
  SCHEDULED = 'Scheduled',
  SENT = 'Sent',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
}

export enum PromotionType {
  PERCENTAGE = 'Percentage Discount',
  FIXED_AMOUNT = 'Fixed Amount Discount',
  BOGO_UNITS = 'Buy X, Get Y Free (Units)',
  BOGO_DURATION = 'Buy X, Get Y Free (Duration)',
}

// POS System Enums
export enum DeliveryStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  PACKED = 'Packed',
  SHIPPED = 'Shipped',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export enum SalesType {
  STANDARD = 'Standard',
  SUBSCRIPTION = 'Subscription',
  WHOLESALE = 'Wholesale',
  RETAIL = 'Retail',
}

export enum InventoryTransactionType {
  PURCHASE = 'Purchase',
  SALE = 'Sale',
  RETURN = 'Return',
  ADJUSTMENT = 'Adjustment',
  DAMAGE = 'Damage',
  TRANSFER = 'Transfer',
}

export enum POSOrderStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PROCESSING = 'Processing',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  REFUNDED = 'Refunded',
}


// --- INTERFACES & TYPES ---

export type KPIEvaluationType = 'Self & Manager' | 'Manager Only';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  teams?: string[];
  requiresPasswordChange: boolean;
  facePhotoUrl?: string; // Added for avatar consistency
  permissions?: Permission[]; // Employee-specific permission overrides
}

export interface Employee extends User {
  employeeId: string;
  department: string;
  departmentId?: string;
  jobTitle: string;
  joiningDate: string;
  employeeStatus: EmployeeStatus;
  basicPay: number;
  paymentType: 'Monthly' | 'Weekly' | 'Daily';
  hasLoginAccess: boolean;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Other';
  nationality?: string;
  address?: string;
  nrcNumber?: string;
  dateOfBirth?: string;
  personalPhone?: string;
  annualLeaveEntitlement?: number;
  casualLeaveEntitlement?: number;
  transportationAllowance?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankAccountNumber?: string;
  bankName?: string;
  facePhotoUrl?: string;
  nrcFrontPhotoUrl?: string;
  nrcBackPhotoUrl?: string;
}


// Leads
export const LEAD_STATUS_COLUMNS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.CLOSED_WON,
  LeadStatus.CLOSED_LOST,
];

export interface KanbanColumn {
  id: LeadStatus;
  title: string;
  leads: Lead[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  businessName: string;
  businessType: string;
  leadSource: string;
  status: LeadStatus;
  priority?: 'High' | 'Medium' | 'Low';
  assignedTo?: string;
  country: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  // New optional fields
  personalFbLink?: string;
  viberTelegram?: string;
  businessPageUrl?: string;
  websiteUrl?: string;
  facebookPageId?: string;
}

export interface LeadActivity {
    id: string;
    leadId: string;
    userId: string;
    type: LeadActivityType;
    notes: string;
    timestamp: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface LeadSettings {
    id: string;
    autoAssignMode: 'manual' | 'round_robin';
    defaultOwnerId?: string;
    leadSources: string[];
    enableActivityReminders: boolean;
    updatedAt?: string;
    updatedBy?: string;
}

export interface AttendanceRulesSettings {
    id: string;
    // Office hours
    defaultStartTime: string; // Format: "HH:MM" (e.g., "09:30")
    defaultEndTime: string; // Format: "HH:MM" (e.g., "17:00")
    defaultWorkingHours: number; // Default working hours per day (e.g., 8)
    
    // Late policy
    maxLateMinutes: number; // Maximum allowed late minutes before it's considered absence (e.g., 30)
    lateGracePeriodMinutes: number; // Grace period for late (e.g., 5 minutes)
    
    // Leave policy
    maxLeaveDaysPerMonth: number; // Maximum leave days allowed per month
    maxLeaveDaysPerYear: number; // Maximum leave days allowed per year
    
    // Absence policy
    maxAbsenceDaysPerMonth: number; // Maximum absence days before action (e.g., 3)
    absenceRequiresAction: boolean; // Whether absence requires HR action
    
    // Overtime policy
    overtimeThresholdMinutes: number; // Minutes after end time to count as overtime (e.g., 15)
    minOvertimeHours: number; // Minimum hours to count as overtime (e.g., 0.5)
    
    // Early leave policy
    earlyLeaveGracePeriodMinutes: number; // Grace period for early leave (e.g., 15 minutes)
    
    // Other settings
    workingDaysPerWeek: number; // Default working days per week (e.g., 5)
    halfDayHours: number; // Hours for half-day leave (e.g., 4)
    
    updatedAt?: string;
    updatedBy?: string;
}


// Clients & Businesses
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  linkedBusinessIds: string[];
  createdAt: string;
  updatedAt: string;
  balance: number; // Total balance across all linked businesses (sum of client_business_balances)
  openingBalance?: number;
  openingBalanceSetDate?: string;
  // New optional fields
  personalFbLink?: string;
  viberTelegram?: string;
  // Fields for data synchronization
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  customerCode?: string; // Customer code for internal/external identification
  // Custom rate for Facebook Ads (overrides global service rate)
  customFacebookAdsRateMMK?: number;
}

export interface Business {
  id: string;
  name: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string; // This will be street address
  // New fields for data synchronization
  city?: string;
  state?: string;
  country?: string;
  linkedClientIds: string[];
  createdAt: string;
  updatedAt: string;
  balance: number; // Total balance across all linked clients (sum of client_business_balances for this business)
  openingBalance?: number;
  openingBalanceSetDate?: string;
  // New optional fields
  businessPageUrl?: string;
  websiteUrl?: string;
  facebookPageId?: string;
  customerCode?: string; // Customer code for internal/external identification
  // Custom rate for Facebook Ads (overrides global service rate)
  customFacebookAdsRateMMK?: number;
}

export type ClientOrBusiness = Client | Business;

// Client-Business Balance: Tracks balance per client-business combination
// Client's total balance = sum of all client_business_balances for that client
// Business's total balance = sum of all client_business_balances for that business
export interface ClientBusinessBalance {
  id: string; // Format: `${clientId}_${businessId}`
  clientId: string;
  businessId: string;
  balance: number; // Transaction balance (totalBilled - totalPaid - totalRefunds - totalCreditNotes) - does NOT include openingBalance
  openingBalance?: number;
  /** Amount of opening balance that has been paid by general payments (allocated first before sales) */
  openingBalancePaid?: number;
  openingBalanceSetDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** Snapshot stored before merge to enable unmerge (reverse merge) */
export interface MergeSnapshot {
  id: string;
  remainingClientId: string;
  toMergeIds: string[];
  createdAt: string;
  /** Full client documents for merged clients (to restore on unmerge) */
  mergedClientDocs: Record<string, Record<string, unknown>>;
  /** Remaining client's linkedBusinessIds before merge */
  remainingClientLinkedBusinessIds: string[];
  /** Child docs we changed: collection, docId, field, originalValue (clientId/linkedClientId/relatedToId) */
  childDocMappings: Array<{ collection: string; docId: string; field: string; originalValue: string }>;
  /** Pair balance docs we deleted (merged client pairs) - id -> full doc */
  pairsDeleted: Record<string, Record<string, unknown>>;
  /** Pair balance docs we overwrote (remaining client pairs) - id -> full doc before merge */
  pairsOverwritten: Record<string, Record<string, unknown>>;
  /** Pair IDs we created (remaining had no pair, merged client had one) - delete on unmerge */
  pairsCreated: string[];
  /** Business linkedClientIds before merge - businessId -> linkedClientIds */
  businessLinkedClientsBefore: Record<string, string[]>;
}

/** Snapshot stored before business merge to enable unmerge (reverse merge) */
export interface BusinessMergeSnapshot {
  id: string;
  remainingBusinessId: string;
  /** Merged-away business IDs (not including remaining) */
  toMergeIds: string[];
  createdAt: string;
  /** Full business documents for merged businesses (to restore on unmerge) */
  mergedBusinessDocs: Record<string, Record<string, unknown>>;
  /** Remaining business's linkedClientIds before merge */
  remainingBusinessLinkedClientIds: string[];
  /** Each affected client's linkedBusinessIds before merge - clientId -> linkedBusinessIds */
  clientLinkedBusinessIdsBefore: Record<string, string[]>;
  /** Child docs we changed: collection, docId, field, originalValue (businessId/linkedBusinessId/relatedToId) */
  childDocMappings: Array<{ collection: string; docId: string; field: string; originalValue: string }>;
  /** Pair balance docs we deleted (merged business pairs) - id -> full doc */
  pairsDeleted: Record<string, Record<string, unknown>>;
  /** Pair balance docs we overwrote (remaining business pairs) - id -> full doc before merge */
  pairsOverwritten: Record<string, Record<string, unknown>>;
  /** Pair IDs we created (remaining had no pair, merged business had one) - delete on unmerge */
  pairsCreated: string[];
}

export interface Note {
  id: string;
  content: string;
  relatedToId: string; // Client or Business ID
  createdByUserId: string;
  createdAt: string;
}

// Services & Sales
export interface PackageTier {
  tierName: string;
  unitsOrUSD?: number;
  priceMMK?: number;
}


export interface SubCategory {
  id: string;
  name: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

export interface ServiceCostItem {
  id: string;
  description: string;
  type: 'amount' | 'percentage';
  value: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  description?: string;
  unitPriceMMK?: number;
  serviceRateMMK?: number;
  packages: PackageTier[];
  isActive: boolean;
  createsProject?: boolean;
  termsAndConditions?: string;
  proposalUrl?: string;
  costItems?: ServiceCostItem[];
  taxPercentage?: number;
  profitPercentage?: number;
}

export interface BaseSaleRecord {
    id: string;
    type: 'Facebook Ads' | 'Other Services';
    clientId: string;
    businessId?: string;
    serviceId: string;
    invoiceId?: string;
    inChargeUserId: string;
    lastEditedByUserId?: string;
    lastEditedAt?: string;
    createdAt: string;
    updatedAt: string;
    status: SaleStatus;
    notes?: string;
    subtotalMMK: number;
    packageDiscountMMK?: number;
    manualDiscountMMK?: number;
    manualDiscountDescription?: string;
    taxPercentage?: number;
    taxAmountMMK?: number;
    grandTotalMMK: number;
    amountPaid: number;
    otherFeesAmountMMK?: number;
    otherFeesDescription?: string;
}

export interface FacebookAdsSaleRecord extends BaseSaleRecord {
    type: 'Facebook Ads';
    campaignName: string;
    campaignObjective: string;
    campaignStatus: FacebookCampaignStatus;
    budgetUSD: number;
    actualSpendUSD?: number;
    serviceRateMMK: number;
    startDate: string;
    durationDays: number;
    endDate?: string;
    facebookCampaignId?: string;
    isSynced?: boolean;
    pageId?: string;
    unassignedReason?: string;
    impressions?: number;
    clicks?: number;
    ctr?: number;
}

export interface OtherServicesSaleRecord extends BaseSaleRecord {
    type: 'Other Services';
    quantity: number;
    unitPriceMMK: number;
    /** Business sale date (YYYY-MM-DD, Yangon). Defaults to today on create; editable. */
    saleDate?: string;
}

export type SaleRecord = FacebookAdsSaleRecord | OtherServicesSaleRecord;

// Finance
export interface InvoiceItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  businessId: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  saleRecordId?: string;
  quotationId?: string;
  notes?: string;
  paymentInstructions?: string;
  companyBankDetails?: string;
  otherFeesAmountMMK?: number;
  otherFeesDescription?: string;
}

export interface QuotationItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
    id: string;
    clientId: string;
    businessId: string;
    issueDate: string;
    expiryDate?: string;
    items: QuotationItem[];
    subtotal: number;
    manualDiscountMMK?: number;
    manualDiscountDescription?: string;
    promotionId?: string; // New
    promotionDiscountMMK?: number; // New
    taxPercentage?: number;
    taxAmountMMK?: number;
    grandTotal: number;
    status: QuotationStatus;
    createdAt: string;
    updatedAt: string;
    createdByUserId: string;
    notes?: string;
    termsAndConditions?: string;
    saleRecordId?: string;
    invoiceId?: string;
    otherFeesAmountMMK?: number;
    otherFeesDescription?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  businessId?: string;
  invoiceId?: string;
  saleRecordId?: string;
  cashAccountId?: string;
  saleAllocations?: Array<{
    saleRecordId: string;
    amountMMK: number;
  }>;
  /** Per-business breakdown when payment applies across all linked businesses (no businessId). */
  businessAllocations?: Array<{
    businessId: string;
    amountMMK: number;
    openingBalanceApplied?: number;
  }>;
  /** True when general payment applies across all linked businesses (no businessId). */
  clientWide?: boolean;
  amountMMK: number;
  paymentDate: string;
  method: string;
  transactionLast4Digits?: string;
  remark?: string;
  receiptNumber: string;
  recordedByUserId: string;
  status: PaymentStatus;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  refundId?: string; // Link to refund if this payment was refunded
  createdAt: string;
}

export interface Refund {
  id: string;
  refundDate: string;
  clientId: string;
  businessId: string;
  amountMMK: number;
  serviceId?: string; // Service this refund is for (e.g., Facebook Boosting)
  totalUSD?: number; // For Facebook Boosting refunds
  rate?: number; // Rate used for Facebook Boosting refunds (MMK per USD)
  reason?: string;
  description?: string;
  cashAccountId?: string; // Cash account used for refund
  status: RefundStatus;
  recordedByUserId: string;
  processedByUserId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteDate: string;
  clientId: string;
  businessId: string;
  saleRecordId?: string; // Link to the sale record this credit note is for
  amountMMK: number;
  serviceId?: string; // Service this credit note is for (e.g., Facebook Boosting)
  totalUSD?: number; // For Facebook Boosting credit notes
  rate?: number; // Rate used for Facebook Boosting credit notes (MMK per USD)
  reason?: string;
  description?: string;
  status: CreditNoteStatus;
  recordedByUserId: string;
  approvedByUserId?: string; // User who approved the credit note
  approvedAt?: string; // Timestamp when credit note was approved
  createdAt: string;
  updatedAt: string;
}

export interface BalanceAdjustment {
  id: string;
  adjustmentDate: string;
  clientId: string;
  businessId: string;
  type: BalanceAdjustmentType;
  amountMMK: number;
  serviceId?: string;
  totalUSD?: number;
  rate?: number;
  employeeId?: string;
  reason?: string;
  description?: string;
  recordedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisaCard {
  id: string;
  cardName: string;
  last4Digits: string;
  monthlyLimitMMK: number; // Keep for backward compatibility, but will store USD converted to MMK
  monthlyLimitUSD?: number; // New field for USD limit
  phoneNumber?: string;
  email?: string;
}

export interface VisaReload {
  id: string;
  cardId: string;
  reloadDate: string;
  amountMMK: number;
  recordedByUserId: string;
  sourceAccountId?: string; // ID of the bank account or mobile wallet used for reload
  sourceAccountType?: 'Bank Account' | 'Mobile Wallet'; // Type of account used
}

export interface VisaCardSpend {
  id: string;
  cardId: string;
  spendDate: string;
  amountUSD: number;
  amountMMK: number;
  exchangeRate: number; // MMK/USD rate at time of spend
  description?: string;
  recordedByUserId: string;
  createdAt: string;
}

export interface DailyExchangeRate {
  id: string;
  date: string; // YYYY-MM-DD format
  rate: number; // MMK/USD exchange rate
  recordedByUserId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amountMMK: number;
  receiptPhotoUrl?: string;
  recordedByUserId: string;
  instructorId?: string;
  courseId?: string;
  batchId?: string;
  sourceAccountId?: string; // ID of the bank account or mobile wallet used for expense
  sourceAccountType?: 'Bank Account' | 'Mobile Wallet'; // Type of account used
  createdAt?: string;
  updatedAt?: string;
}

// HR
export interface AllowanceItem {
  description: string;
  amount: number;
}
export interface DeductionItem {
  description: string;
  amount: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  basicSalary: number;
  commissions: number;
  transportationAllowance?: number;
  otherAllowances?: AllowanceItem[];
  otherDeductions?: DeductionItem[];
  allowances: number;
  deductions: number;
  netPayable: number;
  status: 'Generated' | 'Paid';
  paymentDate?: string;
}

// All missing types from here
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assigneeIds: string[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  relatedSaleId?: string;
  googleDriveLink?: string;
  attachments?: Attachment[];
  clientId?: string;
  businessId?: string;
  projectId?: string;
  parentId?: string;
  listId?: string;
  surveyId?: string;
  taskType?: 'General';
}

export interface TaskList {
  id: string;
  title: string;
  projectId?: string;
  order: number;
  isLocked: boolean;
  createdByUserId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  clientId: string;
  businessId?: string;
  teamLeadId?: string;
  memberIds: string[];
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  saleRecordId?: string;
  surveyId?: string;
  progress?: number;
}

export type HierarchicalTask = Task & { children: HierarchicalTask[]; level: number };

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  duration: LeaveDuration;
  reason: string;
  status: LeaveRequestStatus;
  requestedAt: string;
  reviewedByUserId?: string;
  reviewerComments?: string;
  reviewedAt?: string;
}

export interface Holiday {
    id: string;
    name: string;
    date: string;
    description?: string;
    createdAt: string;
    createdByUserId: string;
}

export interface CompanyProfileSetting {
  appName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  letterheadImageUrl?: string;
  letterheadFileName?: string;
  posLetterheadImageUrl?: string; // POS-specific letterhead
  posLetterheadFileName?: string;
  inactivityTimeoutHours?: number; // Auto-logout after inactivity (in hours, default 3)
  paymentInstructions?: string;
  companyBankDetails?: string;
}

export type Notification = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  link?: string;
  timestamp: string;
  read: boolean;
};

export interface PurchaseHistoryItem {
  id: string;
  date: string;
  service: string;
  amount: number;
  status: SaleStatus | InvoiceStatus;
  type: 'Sale' | 'Invoice';
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  room: RoomType;
  clientId?: string;
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface SettingItem {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PaymentMethodSetting extends SettingItem {
  accountNumber?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  showInPublic?: boolean;
  order?: number;
}
export interface ExpenseCategorySetting extends SettingItem {}
export interface LeadSourceSetting extends SettingItem {}
export interface BusinessTypeSetting extends SettingItem {}
export interface CampaignObjectiveSetting extends SettingItem {}
export interface AssetCategorySetting extends SettingItem {}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface RolePermissionConfig {
  id: string;
  role: UserRole;
  permissions: Permission[];
}
export interface DepartmentRolePermissionConfig extends RolePermissionConfig {
  departmentId: string;
}

export interface ParsedExcelRow {
    rowIndex: number;
    clientId?: string;
    businessId?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    personalFbLink?: string;
    viberTelegram?: string;
    clientAddress?: string;
    clientCity?: string;
    clientState?: string;
    clientCountry?: string;
    clientCustomerCode?: string;
    clientOpeningBalance?: string;
    clientCustomFacebookAdsRateMMK?: string;
    businessName?: string;
    businessIndustry?: string;
    businessPhone?: string;
    businessEmail?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessCountry?: string;
    businessCustomerCode?: string;
    businessFacebookPageId?: string;
    businessOpeningBalance?: string;
    businessCustomFacebookAdsRateMMK?: string;
    businessPageUrl?: string;
    websiteUrl?: string;
}

export interface ImportResult {
    clientsAdded: number;
    businessesAdded: number;
    clientsUpdated: number;
    businessesUpdated: number;
    linksCreated: number;
    errors: { row: number, message: string }[];
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedEmployeeExcelRow {
    rowIndex: number;
    employeeId?: string;
    name?: string;
    email?: string;
    role?: UserRole;
    departmentName?: string;
    jobTitle?: string;
    joiningDate?: string;
    employeeStatus?: EmployeeStatus;
    basicPay?: number;
    paymentType?: 'Monthly' | 'Weekly' | 'Daily';
    hasLoginAccess?: boolean;
    initialPassword?: string;
    personalPhone?: string;
    dateOfBirth?: string;
    gender?: 'Male' | 'Female' | 'Other';
    maritalStatus?: 'Single' | 'Married';
    nationality?: string;
    address?: string;
    nrcNumber?: string;
    annualLeaveEntitlement?: number;
    casualLeaveEntitlement?: number;
    transportationAllowance?: number;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    bankAccountNumber?: string;
    bankName?: string;
}

export interface EmployeeImportResult {
    employeesAdded: number;
    employeesUpdated: number;
    errors: { row: number, message: string }[];
    warnings?: { row: number, message: string }[];
}

export interface ParsedPOSProductExcelRow {
    rowIndex: number;
    productName?: string;
    sku?: string;
    priceMMK?: string;
    costMMK?: string;
    stockQuantity?: string;
    minStockQuantity?: string;
    category?: string;
    colourOfFrame?: string;
    colourOfGlass?: string;
    description?: string;
}

export interface POSProductImportResult {
    productsAdded: number;
    productsUpdated: number;
    variantsAdded: number;
    errors: { row: number, message: string }[];
}


export interface EmployeeAttendanceStats {
    employeeId: string;
    employeeCode: string;
    name: string;
    department: string;
    normalHours: number;
    realHours: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    absenceDays: number;
    overtimeHours: number;
    leaveDays: number;
}

export interface AttendanceReport {
    id: string; // YYYY-MM
    month: string;
    generatedAt: string;
    generatedBy: string;
    employeeData: Record<string, EmployeeAttendanceStats>;
}

export interface QuestionOption {
  text: string;
  imageUrl?: string;
  nextSectionId?: string; // For branching logic
}

export interface SingleChoiceWithTextAnswer {
  choice: string;
  text: string;
}

export interface FileAnswer {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Question {
  id: string;
  order: number;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswers: string[];
  isRequired: boolean;
  sectionId?: string;
  timeLimitSeconds?: number;
  maxRating?: number;
  termsAcceptText?: string;
  termsDeclineText?: string;
  hasOtherOption?: boolean;
  serviceIds?: string[];
  priceChartImageUrl?: string;
  maxFiles?: number;
  maxFileSizeMB?: number;
  allowedFileTypes?: string;
  singleChoiceTextType?: 'text' | 'number' | 'textarea';
  singleChoiceTextDescription?: string;
  semanticDifferentialRows?: { rowId: string; leftLabel: string; rightLabel: string; options: string[] }[];
}

export interface QuizSection {
  id: string;
  quizId: string;
  title: string;
  description?: string;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseIds: string[];
  quizType: 'Quiz' | 'Survey';
  passPercentage: number;
  timeLimitMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  takerId: string;
  takerName: string;
  takerType: 'Student' | 'Employee';
  score: number;
  passed: boolean;
  submittedAt: string;
  answers: {
    questionId: string;
    questionText: string;
    selectedAnswers: string[];
    correctAnswers: string[];
    isCorrect: boolean;
  }[];
}

export interface SurveySubmission {
  id: string;
  surveyId: string;
  projectId: string;
  taskId?: string;
  submittedAt: string;
  answers: {
      questionId: string;
      questionText: string;
      answer: any;
  }[];
}

export interface FacebookPage {
    id: string;
    name: string;
}

export interface FacebookAdAccount {
    id: string; // This is the full 'act_...' ID
    account_id: string; // This is just the number part
    name: string;
    pages: FacebookPage[];
    isSynced?: boolean; // New: To control which accounts are active in the ERP
}

export interface FacebookIntegration {
  id: string; // Corresponds to the User ID (uid)
  accounts: FacebookAdAccount[];
}

export interface FacebookCampaign {
    id: string;
    name: string;
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
    objective: string;
    daily_budget?: string;
    lifetime_budget?: string;
}

export interface FacebookInsight {
    date_start: string;
    date_stop: string;
    spend: string;
    impressions: string;
    clicks: string;
}


export interface KpiCategory extends SettingItem {}

export interface KPI {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  measurementUnit: 'Count' | 'MMK' | 'USD' | '%' | 'Rating (1-5)';
  evaluationType: KPIEvaluationType;
  kpiType: 'Department' | 'Personal';
  ownerId: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
}

export interface AssignedKPI {
    assignmentId: string;
    kpiId: string;
    name: string;
    description: string;
    measurementUnit: KPI['measurementUnit'];
    evaluationType: KPI['evaluationType'];
    target: number;
    weight: number;
    currentValue?: number | string;
    selfComments?: string;
    selfRating?: number;
    managerComments?: string;
    managerRating?: number;
}

export interface EmployeeKpiSheet {
    id: string; // employeeId_period (e.g., "uid123_2024-08")
    employeeId: string;
    managerId: string;
    period: string; // YYYY-MM
    status: 'Pending' | 'In Progress' | 'Pending Manager Review' | 'Completed';
    assignedKpis: AssignedKPI[];
    selfRatingWeight: number; // e.g., 30
    managerRatingWeight: number; // e.g., 70
    finalScore?: number;
    lastEvaluatedBy?: string;
    lastEvaluatedAt?: string;
    employeeAcknowledgedAt?: string;
    employeeAcknowledgementComment?: string;
}

export interface EmployeeOnboardingItem {
    text: string;
    isCompleted: boolean;
    completedAt?: string;
}

export interface EmployeeOnboarding {
    id: string; // Same as employeeId (Firestore document ID)
    employeeId: string;
    templateName: string;
    status: 'In Progress' | 'Completed';
    items: EmployeeOnboardingItem[];
}

// New interfaces for website integration
export interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    company: string;
    service: string;
    budget: string;
    timeline: string;
    message: string;
}

// SMS Module Types
export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsMessage {
    id: string;
    batchId: string;
    phone: string;
    body: string;
    status: SmsStatus;
    createdAt: string;
    sentAt?: string;
    deliveredAt?: string;
    error?: string;
}

export interface SmsBatch {
    id: string;
    templateId?: string;
    messageBody: string; // The original template body
    scheduledFor?: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Scheduled';
    totalMessages: number;
    sentCount?: number;
    deliveredCount?: number;
    failedCount?: number;
    createdAt: string;
    createdByUserId: string;
    error?: string; // Error message if batch failed or is pending due to issues
}

export interface SmsSettings {
    provider: string; // e.g., 'SMSPoh', 'Twilio', 'Custom API'
    apiUrl?: string;
    senderId?: string; // or 'from' number
    apiKey?: string; // SMSPoh API Key
    apiSecret?: string; // SMSPoh API Secret (should be stored securely)
}

export interface SmsRecipient {
    phone_number: string;
    [key: string]: string; // Allows for arbitrary columns like 'name', 'invoice_no'
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number; // For percentage or fixed amount
  buyQuantity?: number; // For BOGO_UNITS
  getQuantity?: number; // For BOGO_UNITS
  buyDurationValue?: number; // For BOGO_DURATION
  getDurationValue?: number; // For BOGO_DURATION
  durationUnit?: 'Days' | 'Weeks' | 'Months'; // For BOGO_DURATION
  appliesTo: 'all_services' | 'specific_services' | 'specific_categories';
  applicableServiceIds?: string[];
  applicableCategoryIds?: string[];
  minPurchaseAmount?: number;
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  isActive: boolean;
}

// Maps, etc
export const MYANMAR_STATES = [ "Ayeyarwady", "Bago", "Chin", "Kachin", "Kayah", "Kayin", "Magway", "Mandalay", "Mon", "Rakhine", "Sagaing", "Shan", "Tanintharyi", "Yangon", "Naypyidaw" ];
export const MYANMAR_CITIES_BY_STATE: Record<string, string[]> = {
    Yangon: ["Yangon", "Thanlyin", "Hlegu"],
    Mandalay: ["Mandalay", "Pyin Oo Lwin", "Mogok"],
};

// --- Finance Types ---

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum JournalEntryStatus {
  DRAFT = 'Draft',
  POSTED = 'Posted',
  CANCELLED = 'Cancelled',
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'Straight Line',
  DECLINING_BALANCE = 'Declining Balance',
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  currency: string;
  isActive: boolean;
  allowManualPosting?: boolean;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  currency: string;
  description?: string;
}

export interface JournalEntry {
  id: string;
  reference: string;
  entryDate: string;
  period: string;
  createdByUserId: string;
  lines: JournalEntryLine[];
  status: JournalEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AccountsPayableInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface AccountsReceivableInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

export type AccountType = 'Bank Account' | 'Mobile Wallet' | 'Cash';

export interface CashAccount {
  id: string;
  name: string;
  accountType: AccountType;
  currency: string;
  balance: number; // Calculated as: (initialBalance + totalInflow) - totalOutflow
  initialBalance?: number; // Starting balance for the account
  institution?: string;
  accountNumber?: string;
  bankName?: string; // For bank accounts
  walletProvider?: string; // For mobile wallets (e.g., Wave Pay, KBZ Pay, etc.)
  phoneNumber?: string; // For mobile wallets
  isActive: boolean;
  showInPublic?: boolean; // Show on public payment page
  logoUrl?: string; // Logo image URL
  qrCodeUrl?: string; // QR code image URL
  createdAt: string;
  updatedAt: string;
  // Activity tracking
  lastActivityDate?: string;
  totalInflow?: number;
  totalOutflow?: number;
}

export interface CashTransaction {
  id: string;
  cashAccountId: string;
  transactionDate: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description?: string;
  reference?: string;
}

export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  cost: number;
  acquisitionDate: string;
  usefulLifeMonths: number;
  salvageValue?: number;
  depreciationMethod: DepreciationMethod;
  status: 'Active' | 'Disposed';
  bookValue: number;
  accumulatedDepreciation: number;
  depreciationStartDate: string;
}

export interface FixedAssetEvent {
  id: string;
  assetId: string;
  eventType: 'Acquisition' | 'Depreciation' | 'Disposal';
  eventDate: string;
  amount: number;
}

export interface LoanAgreement {
  id: string;
  lender: string;
  principal: number;
  currency: string;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  outstandingPrincipal: number;
  paymentFrequency: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  paymentDate: string;
  principalPaid: number;
  interestPaid: number;
}

export interface EquityEvent {
  id: string;
  eventDate: string;
  type: 'Issuance' | 'Dividend' | 'RetainedEarnings' | 'Adjustment';
  amount: number;
  currency: string;
  description?: string;
}

export interface FinancialReport {
  period: string;
  startDate: string;
  endDate: string;
  incomeStatement: {
    Revenue: number;
    Expenses: number;
  };
  balanceSheet: {
    Assets: number;
    Liabilities: number;
    Equity: number;
  };
  balanceBreakdown: Array<{
    name: string;
    value: number;
  }>;
  cashFlow: {
    Operations: number;
    Investing: number;
    Financing: number;
  };
  trialBalance: Array<{
    name: string;
    debit: number;
    credit: number;
  }>;
  budgetVsActual: Array<{
    accountName: string;
    budget: number;
    actual: number;
  }>;
  monthlyTrend: Array<{
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  incomeBreakdown: Array<{
    name: string;
    value: number;
  }>;
  expenseBreakdown: Array<{
    name: string;
    value: number;
  }>;
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  module: string;
  action: string;
  description?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

// Bad Debt & Allowance for Doubtful Debts
export enum BadDebtStatus {
  WRITTEN_OFF = 'Written Off',
  RECOVERED = 'Recovered',
  PARTIALLY_RECOVERED = 'Partially Recovered',
}

export interface BadDebt {
  id: string;
  clientId?: string;
  businessId?: string;
  invoiceId?: string;
  saleRecordId?: string;
  originalAmount: number;
  writtenOffAmount: number;
  usdAmount?: number;
  exchangeRate?: number;
  recoveredAmount: number;
  currency: string;
  reason: string;
  status: BadDebtStatus;
  writeOffDate: string;
  recoveryDate?: string;
  journalEntryId?: string;
  recoveryJournalEntryId?: string;
  createdByUserId: string;
  /** Optional: employee/user responsible for following up or recovering this bad debt */
  responsiblePersonUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllowanceForDoubtfulDebts {
  id: string;
  period: string; // YYYY-MM format
  provisionDate: string;
  totalReceivables: number;
  provisionPercentage: number;
  provisionAmount: number;
  previousBalance: number;
  adjustmentAmount: number;
  currentBalance: number;
  currency: string;
  notes?: string;
  journalEntryId?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  /** Optional: link provision to a specific client */
  clientId?: string;
  /** Optional: link provision to a specific business */
  businessId?: string;
}

export interface BadDebtAgingBracket {
  minDays: number;
  maxDays: number | null;
  label: string;
  provisionPercentage: number;
}

// POS System Interfaces
export interface POSProductCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface POSCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POSProductVariant {
  id: string;
  name: string; // e.g., "Size: Large", "Color: Red"
  sku?: string;
  priceMMK: number;
  stockQuantity: number;
  isActive: boolean;
  image?: string; // URL to variant image
}

export interface POSProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string; // Category name (for backward compatibility)
  categoryId?: string; // Category ID reference
  priceMMK: number;
  costMMK?: number; // Opening cost price
  stockQuantity: number;
  minStockQuantity?: number; // Minimum stock quantity for alerts
  supplierId?: string;
  supplierName?: string;
  variants?: POSProductVariant[];
  images?: string[]; // URLs to product images
  isActive: boolean;
  taxPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: InventoryTransactionType;
  quantity: number; // Positive for in, negative for out
  previousQuantity: number;
  newQuantity: number;
  costMMK?: number; // Cost per unit for this transaction (for restocking with different prices)
  referenceId?: string; // Order ID, Purchase ID, etc.
  referenceType?: string; // 'POSOrder', 'Purchase', etc.
  notes?: string;
  userId: string; // User who made the transaction
  createdAt: string;
}

export interface DeliveryTracking {
  orderId: string;
  status: DeliveryStatus;
  trackingNumber?: string;
  carrier?: string; // e.g., "DHL", "FedEx", "Local Courier"
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country: string;
    contactName?: string;
    contactPhone?: string;
  };
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface POSOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPriceMMK: number;
  discountMMK?: number;
  taxPercentage?: number;
  taxAmountMMK?: number;
  subtotalMMK: number;
}

export interface POSOrder {
  id: string;
  orderNumber: string; // Auto-generated order number
  customerId?: string; // POS customer ID
  customerName: string; // Cached customer name
  salesType: SalesType;
  status: POSOrderStatus;
  items: POSOrderItem[];
  subtotalMMK: number;
  discountMMK?: number;
  discountDescription?: string;
  taxPercentage?: number;
  taxAmountMMK: number;
  shippingCostMMK?: number;
  grandTotalMMK: number;
  amountPaidMMK: number;
  paymentMethod?: string;
  deliveryTracking?: DeliveryTracking;
  notes?: string;
  isPrinted?: boolean; // Whether order has been printed
  printedAt?: string; // Timestamp when order was printed
  printedBy?: string; // User ID who printed the order
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface POSRevenue {
  id: string;
  orderId: string;
  orderNumber: string;
  salesType: SalesType;
  customerId?: string; // POS customer ID
  customerName?: string; // Cached customer name
  amountMMK: number;
  date: string;
  createdAt: string;
}