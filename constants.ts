import { LeadStatus, TaskStatus, EmployeeStatus, LeaveRequestStatus, QuotationStatus, InvoiceStatus, SaleStatus, ProjectStatus, FacebookCampaignStatus, CandidateStatus, SmsStatus } from './types';

export const APP_NAME = "Marketing Capsule ERP";
export const DEFAULT_CURRENCY = "MMK";
export const DEFAULT_TIMEZONE = "Asia/Yangon"; // UTC +6:30
export const DATE_FORMAT_DISPLAY = "DD/MM/YYYY";

// Note: Mock owner credentials have been removed. The initial Owner/Admin user
// should be created directly in the Firebase Authentication console.

export const LEAD_ID_PREFIX = "L_";
export const CLIENT_ID_PREFIX = "CL-";
export const BUSINESS_ID_PREFIX = "B-";
export const CLIENT_ID_INTERNAL = "C_INTERNAL";
export const BUSINESS_ID_INTERNAL = "B_INTERNAL";
export const SERVICE_ID_PREFIX = "S_";
/** Budget-based boosting services — same invoice/statement layout as Facebook Ads. */
export const FACEBOOK_BOOSTING_SERVICE_ID = "S_001";
export const TIKTOK_BOOSTING_SERVICE_ID = "S_002";
export const BOOSTING_SERVICE_IDS = [FACEBOOK_BOOSTING_SERVICE_ID, TIKTOK_BOOSTING_SERVICE_ID] as const;
export const INVOICE_ID_PREFIX = "INV-";
export const QUOTATION_ID_PREFIX = "QOT-";
export const EMPLOYEE_ID_PREFIX = "E_";
export const LEAVE_REQUEST_ID_PREFIX = "LR_";
export const HOLIDAY_ID_PREFIX = "HOL_";
export const TASK_ID_PREFIX = "TSK_";
export const TASK_LIST_ID_PREFIX = "TL_";
export const LEAD_ACTIVITY_ID_PREFIX = "LA_"; 
export const PAYMENT_ID_PREFIX = "PAY-";
export const REFUND_ID_PREFIX = "REF-"; 
export const CREDIT_NOTE_ID_PREFIX = "CN";
export const BALANCE_ADJUSTMENT_ID_PREFIX = "ADJ-";
export const PROJECT_ID_PREFIX = "PROJ_";
export const PROJECT_ID_MARKETING_CAPSULE = "PROJ_MARKETING_CAPSULE";
export const SALE_ID_PREFIX = "SA"; // New unified Sale ID prefix
export const EXPENSE_ID_PREFIX = "EXP_";
export const VENDOR_ID_PREFIX = "V";
export const PAYSLIP_ID_PREFIX = "PS";
export const ATTENDANCE_REPORT_ID_PREFIX = "ATT_REP_";
export const NOTE_ID_PREFIX = "NOTE_";
export const JOB_OPENING_ID_PREFIX = "JO_";
export const CANDIDATE_ID_PREFIX = "CAN_";
export const KPI_ID_PREFIX = "KPI_";
export const ONBOARDING_TEMPLATE_ID_PREFIX = "OBT_";
export const KPI_CATEGORY_ID_PREFIX = "KPICAT_";
export const PROMOTION_ID_PREFIX = "PROMO_";


// Settings ID Prefixes
export const PAYMENT_METHOD_SETTING_ID_PREFIX = "PM_";
export const EXP_CAT_PREFIX = "EC_";
export const LEAD_SRC_PREFIX = "LS_";
export const BIZ_TYPE_PREFIX = "BT_";
export const CAMP_OBJ_PREFIX = "CO_";
export const ADN_LOC_PREFIX = "ADNL_";
export const ASSET_CAT_PREFIX = "AC_";
export const FIXED_ASSET_ID_PREFIX = "FA_";
export const ASSET_EVENT_ID_PREFIX = "AE_";
export const DEPT_ID_PREFIX = "DPT_"; 
export const ROLE_PERM_ID_PREFIX = "RP_"; 

// Training Center ID Prefixes
export const QUIZ_ID_PREFIX = "QZ_";
export const QUIZ_SECTION_ID_PREFIX = "QSEC_";
export const QUIZ_ATTEMPT_ID_PREFIX = "QA_";
export const SURVEY_SUBMISSION_ID_PREFIX = "SSUB_";

// SMS Prefixes
export const SMS_MESSAGE_ID_PREFIX = "SMS_";
export const SMS_TEMPLATE_ID_PREFIX = "SMST_";
export const SMS_BATCH_ID_PREFIX = "SMSB_";

// POS System Prefixes
export const POS_PRODUCT_ID_PREFIX = "POS_PROD_";
export const POS_ORDER_ID_PREFIX = "POS_ORD_";
export const INVENTORY_TRANSACTION_ID_PREFIX = "INV_TXN_";
export const POS_REVENUE_ID_PREFIX = "POS_REV_";
export const POS_CUSTOMER_ID_PREFIX = "POS_CUST_";
export const POS_CATEGORY_ID_PREFIX = "POS_CAT_";


// Kanban Columns
export const CANDIDATE_STATUS_COLUMNS: CandidateStatus[] = [
  CandidateStatus.APPLIED,
  CandidateStatus.SCREENING,
  CandidateStatus.INTERVIEW,
  CandidateStatus.OFFERED,
  CandidateStatus.HIRED,
  CandidateStatus.REJECTED,
];


// Status Colors for UI consistency
// Using a function to avoid initialization order issues with enum values
function createStatusColors(): Record<string, string> {
    return {
        // --- Unique Lead Statuses ---
        [LeadStatus.NEW]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        [LeadStatus.CONTACTED]: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
        [LeadStatus.QUALIFIED]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        [LeadStatus.PROPOSAL_SENT]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        [LeadStatus.CLOSED_WON]: 'bg-green-500 text-white',
        [LeadStatus.CLOSED_LOST]: 'bg-red-500 text-white',
        
        // --- Unique Candidate Statuses ---
        [CandidateStatus.APPLIED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        [CandidateStatus.SCREENING]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        [CandidateStatus.INTERVIEW]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        [CandidateStatus.OFFERED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        [CandidateStatus.HIRED]: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        [CandidateStatus.REJECTED]: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        
        // --- Unique Task Statuses ---
        [TaskStatus.TO_DO]: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200',
        [TaskStatus.IN_PROGRESS]: 'bg-blue-500 text-white',
        [TaskStatus.COMPLETED]: 'bg-green-500 text-white',
        
        // --- Unique Employee Statuses ---
        [EmployeeStatus.ON_PROBATION]: 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/50 dark:text-yellow-300',
        [EmployeeStatus.ON_LEAVE]: 'bg-blue-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-300',
        [EmployeeStatus.RESIGNED]: 'bg-gray-400 text-white dark:bg-slate-500',
        [EmployeeStatus.TERMINATED]: 'bg-red-200 text-red-500 dark:bg-red-900/50 dark:text-red-300',
        [EmployeeStatus.ACTIVE]: 'bg-green-500 text-white',

        // --- Unique Leave Request Statuses ---
        [LeaveRequestStatus.PENDING]: 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/50 dark:text-yellow-300',
        [LeaveRequestStatus.APPROVED]: 'bg-green-100 text-green-500 dark:bg-green-900/50 dark:text-green-300',
        [LeaveRequestStatus.DECLINED]: 'bg-red-100 text-red-500 dark:bg-red-900/50 dark:text-red-300',
        [LeaveRequestStatus.CANCELLED]: 'bg-red-500 text-white',
        
        // --- Unique Quotation Statuses ---
        [QuotationStatus.ACCEPTED]: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        [QuotationStatus.CONVERTED_TO_INVOICE]: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
        [QuotationStatus.CONVERTED_TO_SALE]: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
        
        // --- Unique Invoice Statuses ---
        [InvoiceStatus.OVERDUE]: 'bg-red-500 text-white',
        [InvoiceStatus.PARTIALLY_PAID]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        [InvoiceStatus.PAID]: 'bg-green-500 text-white',

        // --- Unique Project Statuses ---
        [ProjectStatus.PLANNING]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        
        // --- Unique Facebook Campaign Statuses ---
        [FacebookCampaignStatus.OFF]: 'bg-gray-400 text-white dark:bg-slate-500',
        [FacebookCampaignStatus.DELETED]: 'bg-red-500 text-white',
        [FacebookCampaignStatus.NOT_DELIVERING]: 'bg-yellow-500 text-text-primary',
        [FacebookCampaignStatus.ACCOUNT_DISABLED]: 'bg-red-700 text-white',

        // --- SMS Statuses ---
        [SmsStatus.QUEUED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        [SmsStatus.SENT]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        [SmsStatus.DELIVERED]: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        [SmsStatus.FAILED]: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        [SmsStatus.SCHEDULED]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',

        // --- Consolidated Statuses (shared string values) ---
        'Draft': 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200',
        'Checked': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        'Pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        'Not Approved': 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    };
}

export const STATUS_COLORS: Record<string, string> = createStatusColors();


// Priority Colors for UI consistency
export const PRIORITY_COLORS: Record<string, string> = {
    'High': 'border-status-danger text-status-danger',
    'Medium': 'border-status-warning text-status-warning',
    'Low': 'border-status-info text-status-info',
};