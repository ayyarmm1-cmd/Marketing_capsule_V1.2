import { UserRole, Permission } from './types';

// FIX: Added and exported PERMISSION_DESCRIPTIONS to resolve import error in SettingsPage.tsx.
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
    // General Settings
    [Permission.MANAGE_SETTINGS]: 'Full access to all system settings, including lists, departments, and permissions.',
    [Permission.MANAGE_COMPANY_PROFILE]: 'Can edit company name, address, logo, and other profile details.',
    [Permission.MANAGE_SYSTEM_LISTS]: 'Can add, edit, and delete items in system-wide dropdown lists (e.g., Lead Sources, Expense Categories).',
    [Permission.MANAGE_DEPARTMENTS]: 'Can create, edit, and delete departments.',
    [Permission.MANAGE_ROLES_PERMISSIONS]: 'Can configure permissions for different user roles and departments.',
    [Permission.MANAGE_DATA_ARCHIVAL]: 'Can access and manage data archival and deletion features (Owner-level).',

    // Leads
    [Permission.VIEW_LEADS]: 'Can view leads assigned to them or created by them.',
    [Permission.VIEW_ALL_LEADS]: 'Can view all leads in the system, regardless of assignee.',
    [Permission.CREATE_LEAD]: 'Can create new leads.',
    [Permission.EDIT_LEAD]: 'Can edit leads assigned to them or created by them.',
    [Permission.EDIT_ALL_LEADS]: 'Can edit any lead in the system.',
    [Permission.DELETE_LEAD]: 'Can delete leads assigned to them or created by them.',
    [Permission.DELETE_ALL_LEADS]: 'Can delete any lead in the system.',
    [Permission.CONVERT_LEAD]: 'Can convert a qualified lead into a client and/or business.',
    [Permission.VIEW_LEAD_ACTIVITIES]: 'Can view the global feed of lead activities (calls, emails, notes).',
    [Permission.MANAGE_LEAD_NOTES]: 'Can edit the centralized notes field for any lead.',
    [Permission.VIEW_LEAD_ANALYTICS]: 'Can access the Lead Analytics dashboard.',
    [Permission.MANAGE_LEAD_SETTINGS]: 'Can configure lead assignment automation, reminders, and sources.',

    // Clients & Businesses
    [Permission.VIEW_CLIENTS_BUSINESSES]: 'Can view clients and businesses they are associated with.',
    [Permission.VIEW_ALL_CLIENTS_BUSINESSES]: 'Can view all clients and businesses in the system.',
    [Permission.CREATE_CLIENT]: 'Can create new client records.',
    [Permission.EDIT_CLIENT]: 'Can edit client records.',
    [Permission.DELETE_CLIENT]: 'Can delete client records.',
    [Permission.MERGE_CLIENTS]: 'Can merge duplicate clients and unmerge previously merged clients.',
    [Permission.MERGE_BUSINESSES]: 'Can merge duplicate businesses (same linked clients) and unmerge previously merged businesses.',
    [Permission.CREATE_BUSINESS]: 'Can create new business records.',
    [Permission.EDIT_BUSINESS]: 'Can edit business records.',
    [Permission.DELETE_BUSINESS]: 'Can delete business records.',
    [Permission.IMPORT_CLIENTS_BUSINESSES]: 'Can import clients and businesses from an Excel file.',

    // Services & Promotions
    [Permission.VIEW_SERVICES]: 'Can view the list of available services.',
    [Permission.MANAGE_SERVICES]: 'Can create, edit, and delete services.',
    [Permission.MANAGE_PROMOTIONS]: 'Can create, edit, and manage sales promotions.',

    // Sales
    [Permission.VIEW_SALES_RECORDS]: 'Can view sales records they are in charge of.',
    [Permission.VIEW_ALL_SALES_RECORDS]: 'Can view all sales records in the system.',
    [Permission.CREATE_SALE_RECORD]: 'Can create new sales records.',
    [Permission.EDIT_SALE_RECORD]: 'Can edit sales records they are in charge of.',
    [Permission.EDIT_ALL_SALE_RECORDS]: 'Can edit any sales record.',
    [Permission.CHECK_SALE_RECORD]: 'Can check (approve) draft sales records, changing their status from Draft to Checked.',
    [Permission.DELETE_SALE_RECORD]: 'Can delete sales records they are in charge of.',
    [Permission.DELETE_ALL_SALE_RECORDS]: 'Can delete any sales record.',

    // Finance
    [Permission.VIEW_FINANCE_DASHBOARD]: 'Can view the main finance dashboard with key metrics.',
    [Permission.MANAGE_PAYMENTS_RECEIPTS]: 'Can record, view, and manage client payments and receipts.',
    [Permission.APPROVE_PAYMENT]: 'Can approve or reject payment records. Only approved payments affect client/business balances and company financials.',
    [Permission.MANAGE_QUOTATIONS]: 'Can create, edit, and manage quotations.',
    [Permission.MANAGE_INVOICES]: 'Can create, edit, and manage invoices.',
    [Permission.VIEW_CLIENTS_TO_PAY]: 'Can view the list of clients with outstanding balances.',
    [Permission.MANAGE_VISA_CARDS]: 'Can manage company Visa cards and record reloads.',
    [Permission.MANAGE_TREASURY]: 'Can manage bank accounts, transfers, reconciliations, and treasury KPIs.',
    [Permission.MANAGE_CAPITAL]: 'Can manage loans, equity events, and other capital transactions.',
    [Permission.VIEW_FINANCIAL_REPORTS]: 'Can access Financial Analytics, KPI dashboards, and download finance reports.',
    [Permission.MANAGE_EXPENSES]: 'Can record, view, and manage company expenses.',

    // HR - Staff & Payroll
    [Permission.VIEW_STAFF_LIST]: 'Can view the list of all staff members.',
    [Permission.VIEW_STAFF_DETAILS]: 'Can view detailed profiles of staff members.',
    [Permission.CREATE_STAFF]: 'Can add new employees to the system.',
    [Permission.EDIT_STAFF]: 'Can edit employee profiles and details.',
    [Permission.DELETE_STAFF]: 'Can delete employee records.',
    [Permission.VIEW_STAFF_BIRTHDAYS]: 'Can view the upcoming staff birthdays widget on the dashboard.',
    [Permission.VIEW_OWN_PROFILE]: 'Can view their own profile.',
    [Permission.EDIT_OWN_PROFILE_LIMITED]: 'Can edit a limited set of their own profile information.',
    [Permission.VIEW_PAYROLL_ADMIN]: 'Full access to the payroll administration module.',
    [Permission.GENERATE_PAYROLL]: 'Can generate monthly payroll for employees.',
    [Permission.EDIT_PAYSLIP]: 'Can edit generated payslips.',
    [Permission.DELETE_PAYSLIP]: 'Can delete generated payslips.',
    [Permission.MARK_PAYSLIP_PAID]: 'Can mark payslips as paid.',
    [Permission.VIEW_OWN_PAYSLIP]: 'Can view their own payslips.',

    // HR - Leave & Holidays
    [Permission.VIEW_LEAVE_ADMIN]: 'Full access to the leave management module for all employees.',
    [Permission.APPROVE_LEAVE_REQUESTS]: 'Can approve or decline leave requests from other employees.',
    [Permission.VIEW_OWN_LEAVE_REQUESTS]: 'Can view their own leave request history.',
    [Permission.CREATE_LEAVE_REQUEST]: 'Can submit new leave requests for themselves.',
    [Permission.MANAGE_HOLIDAYS]: 'Can add, edit, and delete public holidays.',
    [Permission.MANAGE_ATTENDANCE]: 'Can import and manage employee attendance records.',

    // HR - Recruitment & Onboarding
    [Permission.VIEW_RECRUITMENT]: 'Can view job openings and the candidate pipeline.',
    [Permission.MANAGE_JOB_OPENINGS]: 'Can create, edit, and delete job openings.',
    [Permission.MANAGE_CANDIDATES]: 'Can manage candidates in the recruitment pipeline.',
    [Permission.MANAGE_ONBOARDING]: 'Can create onboarding templates and assign them to new employees.',
    [Permission.VIEW_OWN_ONBOARDING]: 'Can view and complete their own onboarding checklist.',

    // HR - KPI Management
    [Permission.MANAGE_KPI_LIBRARY]: 'Can create, edit, and manage the central library of KPIs.',
    [Permission.ASSIGN_KPIS]: 'Can assign KPIs from the library to employees.',
    [Permission.RATE_TEAM_KPIS]: 'Can rate team members\' performance on their assigned KPIs.',
    [Permission.PERFORM_SELF_EVALUATION]: 'Can perform self-evaluation on their own KPIs.',
    [Permission.VIEW_TEAM_KPIS]: 'Can view the KPI sheets of their team members.',
    [Permission.VIEW_OWN_KPI_SHEET]: 'Can view their own KPI sheet.',

    // Tasks
    [Permission.VIEW_TASKS]: 'Can view tasks assigned to them or created by them.',
    [Permission.VIEW_ALL_TASKS]: 'Can view all tasks in the system.',
    [Permission.CREATE_TASK]: 'Can create new tasks.',
    [Permission.EDIT_TASK]: 'Can edit tasks assigned to them or created by them.',
    [Permission.EDIT_ALL_TASKS]: 'Can edit any task.',
    [Permission.DELETE_TASK]: 'Can delete tasks assigned to them or created by them.',
    [Permission.DELETE_ALL_TASKS]: 'Can delete any task.',
    [Permission.ASSIGN_TASK]: 'Can assign tasks to other users.',

    // Projects
    [Permission.VIEW_PROJECTS]: 'Can view projects they are a member of.',
    [Permission.VIEW_ALL_PROJECTS]: 'Can view all projects in the system.',
    [Permission.CREATE_PROJECT]: 'Can create new projects.',
    [Permission.EDIT_PROJECT]: 'Can edit project details.',
    [Permission.DELETE_PROJECT]: 'Can delete projects.',
    [Permission.MANAGE_SURVEYS]: 'Can create, edit, and manage surveys.',



    // SMS Communication
    [Permission.VIEW_SMS_MODULE]: 'Access to the SMS communication module.',
    [Permission.SEND_SMS]: 'Can compose and send SMS messages.',
    [Permission.MANAGE_SMS_TEMPLATES]: 'Can create, edit, and delete SMS templates.',
    [Permission.MANAGE_SMS_SETTINGS]: 'Can configure SMS provider settings.',
    
    // Reports
    [Permission.VIEW_REPORTS]: 'Can access the main reports page.',
    [Permission.VIEW_REPORTS_PERFORMANCE]: 'Can view employee performance reports.',

    // POS System
    [Permission.VIEW_POS]: 'Access to the POS (Point of Sale) system module.',
    [Permission.MANAGE_POS_PRODUCTS]: 'Can create, edit, and delete POS products.',
    [Permission.MANAGE_POS_INVENTORY]: 'Can manage inventory transactions and stock levels.',
    [Permission.CREATE_POS_ORDER]: 'Can create new POS orders.',
    [Permission.MANAGE_POS_ORDERS]: 'Can view, edit, and manage all POS orders.',
    [Permission.MANAGE_DELIVERY_TRACKING]: 'Can update delivery status and tracking information for orders.',
    [Permission.VIEW_POS_REVENUE]: 'Can view POS revenue reports and analytics.',
};

// Default permissions for each role.
// FIX: Completed the Record to include all UserRole types, preventing a TypeScript error.
// FIX: Corrected the Admin role permissions list, which had a typo, by providing a comprehensive set of permissions.
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: Object.values(Permission), // Owner gets all permissions

  [UserRole.ADMIN]: Object.values(Permission).filter(p => p !== Permission.MANAGE_DATA_ARCHIVAL),

  [UserRole.TEAM_LEADER]: [
    // Self
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE_LIMITED,
    Permission.VIEW_OWN_PAYSLIP,
    Permission.VIEW_OWN_LEAVE_REQUESTS,
    Permission.CREATE_LEAVE_REQUEST,
    Permission.VIEW_OWN_ONBOARDING,
    Permission.PERFORM_SELF_EVALUATION,
    Permission.VIEW_OWN_KPI_SHEET,
    // Team
    Permission.VIEW_LEADS,
    Permission.VIEW_LEAD_ACTIVITIES,
    Permission.CREATE_LEAD,
    Permission.EDIT_LEAD,
    Permission.DELETE_LEAD,
    Permission.CONVERT_LEAD,
    Permission.MANAGE_LEAD_NOTES,
    Permission.VIEW_LEAD_ANALYTICS,
    Permission.VIEW_CLIENTS_BUSINESSES,
    Permission.CREATE_CLIENT,
    Permission.EDIT_CLIENT,
    Permission.CREATE_BUSINESS,
    Permission.EDIT_BUSINESS,
    Permission.VIEW_SALES_RECORDS,
    Permission.CREATE_SALE_RECORD,
    Permission.EDIT_SALE_RECORD,
    Permission.DELETE_SALE_RECORD,
    Permission.VIEW_TASKS,
    Permission.CREATE_TASK,
    Permission.EDIT_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    Permission.VIEW_PROJECTS,
    Permission.RATE_TEAM_KPIS,
    Permission.VIEW_TEAM_KPIS,
    Permission.VIEW_REPORTS,
    // POS System
    Permission.VIEW_POS,
    Permission.MANAGE_POS_PRODUCTS,
    Permission.MANAGE_POS_INVENTORY,
    Permission.CREATE_POS_ORDER,
    Permission.MANAGE_POS_ORDERS,
    Permission.MANAGE_DELIVERY_TRACKING,
    Permission.VIEW_POS_REVENUE,
  ],

  [UserRole.STAFF]: [
    // Self
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE_LIMITED,
    Permission.VIEW_OWN_PAYSLIP,
    Permission.VIEW_OWN_LEAVE_REQUESTS,
    Permission.CREATE_LEAVE_REQUEST,
    Permission.VIEW_OWN_ONBOARDING,
    Permission.PERFORM_SELF_EVALUATION,
    Permission.VIEW_OWN_KPI_SHEET,
    // Work
    Permission.VIEW_LEADS,
    Permission.VIEW_LEAD_ACTIVITIES,
    Permission.CREATE_LEAD,
    Permission.EDIT_LEAD,
    Permission.VIEW_CLIENTS_BUSINESSES,
    Permission.CREATE_CLIENT,
    Permission.EDIT_CLIENT,
    Permission.CREATE_BUSINESS,
    Permission.EDIT_BUSINESS,
    Permission.VIEW_SALES_RECORDS,
    Permission.CREATE_SALE_RECORD,
    Permission.EDIT_SALE_RECORD,
    Permission.VIEW_TASKS,
    Permission.CREATE_TASK,
    Permission.EDIT_TASK,
    Permission.VIEW_PROJECTS,
    // POS System
    Permission.VIEW_POS,
    Permission.CREATE_POS_ORDER,
    Permission.MANAGE_POS_ORDERS,
    Permission.MANAGE_DELIVERY_TRACKING,
  ],
};
