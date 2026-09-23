import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CompanyProfileSetting,
    SettingItem,
    Department,
    UserRole, Permission, SaleRecord,
    User,
    Employee,
} from '../../types';
import {
    apiGetCompanyProfile, apiUpdateCompanyProfile,
    apiGetDepartments,
    apiGetRolePermissions, apiUpdateRolePermissions, 
    apiGetDepartmentRolePermissions, apiUpdateDepartmentRolePermissions,
    apiDeleteDepartmentRolePermissions,
    apiGetUsers,
    apiGetUserById,
    apiUpdateUser,
    apiClearUserPermissionOverride,
    apiRecalculateBalancesForPairsWithTransactions,
    apiReallocateGeneralPaymentsAndRecalculateBalances,
} from '../../services/api';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import ManageGenericList from '../ui/ManageGenericList';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../../permissions.config';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';

type PermissionTile = {
  id: Permission;
  label: string;
  description?: string;
  tag?: 'view' | 'manage' | 'admin' | 'self';
};

interface PermissionGroup {
  id: string;
  title: string;
  description: string;
  accent: string;
  permissions: PermissionTile[];
}

const formatPermissionLabel = (permission: Permission) =>
  permission
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());

const buildPermissionTiles = (
  items: Permission[],
  overrides?: Partial<Omit<PermissionTile, 'id'>>
): PermissionTile[] =>
  items.map(id => ({
    id,
    label: overrides?.label ?? formatPermissionLabel(id),
    description: overrides?.description,
    tag: overrides?.tag,
  }));

const permissionTagStyles: Record<'view' | 'manage' | 'admin' | 'self', string> = {
  view: 'bg-blue-100 text-blue-800',
  manage: 'bg-green-100 text-green-800',
  admin: 'bg-purple-100 text-purple-800',
  self: 'bg-slate-100 text-slate-800',
};

const groupAccentStyles: Record<string, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-800' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-800' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
  fuchsia: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-800' },
  sky: { bg: 'bg-sky-100', text: 'text-sky-800' },
  lime: { bg: 'bg-lime-100', text: 'text-lime-800' },
  red: { bg: 'bg-red-100', text: 'text-red-800' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-800' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const permissionGroups: PermissionGroup[] = [
  {
    id: 'general',
    title: 'General & Settings',
    description: 'Company profile, departments, and global configuration.',
    accent: 'indigo',
    permissions: buildPermissionTiles(
      [
        Permission.MANAGE_SETTINGS,
        Permission.MANAGE_COMPANY_PROFILE,
        Permission.MANAGE_DEPARTMENTS,
        Permission.MANAGE_ROLES_PERMISSIONS,
        Permission.MANAGE_DATA_ARCHIVAL,
      ],
      { tag: 'admin' }
    ),
  },
  {
    id: 'leads',
    title: 'Leads & CRM',
    description: 'Lead capture, qualification, and conversion.',
    accent: 'purple',
    permissions: [
      ...buildPermissionTiles(
        [
          Permission.VIEW_LEADS,
          Permission.VIEW_ALL_LEADS,
          Permission.VIEW_CLIENTS_BUSINESSES,
          Permission.VIEW_ALL_CLIENTS_BUSINESSES,
        ],
        { tag: 'view' }
      ),
      ...buildPermissionTiles(
        [
          Permission.CREATE_LEAD,
          Permission.EDIT_LEAD,
          Permission.EDIT_ALL_LEADS,
          Permission.DELETE_LEAD,
          Permission.DELETE_ALL_LEADS,
          Permission.CONVERT_LEAD,
          Permission.CREATE_CLIENT,
          Permission.EDIT_CLIENT,
          Permission.DELETE_CLIENT,
          Permission.MERGE_CLIENTS,
          Permission.MERGE_BUSINESSES,
          Permission.CREATE_BUSINESS,
          Permission.EDIT_BUSINESS,
          Permission.DELETE_BUSINESS,
          Permission.IMPORT_CLIENTS_BUSINESSES,
        ],
        { tag: 'manage' }
      ),
    ],
  },
  {
    id: 'services',
    title: 'Services & Promotions',
    description: 'Service catalog and promotional campaigns.',
    accent: 'teal',
    permissions: buildPermissionTiles(
      [Permission.VIEW_SERVICES, Permission.MANAGE_SERVICES, Permission.MANAGE_PROMOTIONS],
      { tag: 'manage' }
    ),
  },
  {
    id: 'sales',
    title: 'Sales Operations',
    description: 'Sales records, invoices, and end-to-end deal tracking.',
    accent: 'blue',
    permissions: [
      ...buildPermissionTiles(
        [Permission.VIEW_SALES_RECORDS, Permission.VIEW_ALL_SALES_RECORDS],
        { tag: 'view' }
      ),
      ...buildPermissionTiles(
        [
          Permission.CREATE_SALE_RECORD,
          Permission.EDIT_SALE_RECORD,
          Permission.EDIT_ALL_SALE_RECORDS,
          Permission.CHECK_SALE_RECORD,
          Permission.DELETE_SALE_RECORD,
          Permission.DELETE_ALL_SALE_RECORDS,
        ],
        { tag: 'manage' }
      ),
    ],
  },
  {
    id: 'finance-core',
    title: 'Finance Core',
    description: 'Invoices, receipts, accounts payable/receivable.',
    accent: 'cyan',
    permissions: [
      ...buildPermissionTiles([Permission.VIEW_FINANCE_DASHBOARD, Permission.VIEW_CLIENTS_TO_PAY], {
        tag: 'view',
      }),
      ...buildPermissionTiles(
        [
          Permission.MANAGE_PAYMENTS_RECEIPTS,
          Permission.APPROVE_PAYMENT,
          Permission.MANAGE_QUOTATIONS,
          Permission.MANAGE_INVOICES,
          Permission.MANAGE_ACCOUNTS_PAYABLE,
          Permission.MANAGE_ACCOUNTS_RECEIVABLE,
        ],
        { tag: 'manage' }
      ),
      ...buildPermissionTiles([Permission.VIEW_GL], { tag: 'admin' }),
    ],
  },
  {
    id: 'finance-treasury',
    title: 'Cash & Treasury',
    description: 'Bank accounts, Visa cards, expenses, and treasury controls.',
    accent: 'emerald',
    permissions: buildPermissionTiles(
      [
        Permission.MANAGE_TREASURY,
        Permission.MANAGE_VISA_CARDS,
        Permission.MANAGE_EXPENSES,
        Permission.MANAGE_FIXED_ASSETS,
      ],
      { tag: 'manage' }
    ),
  },
  {
    id: 'finance-capital',
    title: 'Capital & Analytics',
    description: 'Loans, equity events, and financial reporting.',
    accent: 'amber',
    permissions: buildPermissionTiles(
      [Permission.MANAGE_CAPITAL, Permission.VIEW_FINANCIAL_REPORTS],
      { tag: 'admin' }
    ),
  },
  {
    id: 'hr-staff',
    title: 'HR – Staff & Payroll',
    description: 'Employee records, payroll, and internal visibility.',
    accent: 'rose',
    permissions: [
      ...buildPermissionTiles(
        [
          Permission.VIEW_STAFF_LIST,
          Permission.VIEW_STAFF_DETAILS,
          Permission.VIEW_STAFF_BIRTHDAYS,
          Permission.VIEW_PAYROLL_ADMIN,
        ],
        { tag: 'view' }
      ),
      ...buildPermissionTiles(
        [
          Permission.CREATE_STAFF,
          Permission.EDIT_STAFF,
          Permission.DELETE_STAFF,
          Permission.GENERATE_PAYROLL,
          Permission.EDIT_PAYSLIP,
          Permission.DELETE_PAYSLIP,
          Permission.MARK_PAYSLIP_PAID,
        ],
        { tag: 'manage' }
      ),
    ],
  },
  {
    id: 'hr-leave',
    title: 'HR – Leave & Holidays',
    description: 'Leave approvals, attendance, and holiday calendars.',
    accent: 'orange',
    permissions: buildPermissionTiles(
      [
        Permission.VIEW_LEAVE_ADMIN,
        Permission.APPROVE_LEAVE_REQUESTS,
        Permission.MANAGE_HOLIDAYS,
        Permission.MANAGE_ATTENDANCE,
      ],
      { tag: 'manage' }
    ),
  },
  {
    id: 'hr-recruitment',
    title: 'HR – Recruitment & Onboarding',
    description: 'Talent pipeline and onboarding journeys.',
    accent: 'fuchsia',
    permissions: buildPermissionTiles(
      [
        Permission.VIEW_RECRUITMENT,
        Permission.MANAGE_JOB_OPENINGS,
        Permission.MANAGE_CANDIDATES,
        Permission.MANAGE_ONBOARDING,
      ],
      { tag: 'manage' }
    ),
  },
  {
    id: 'hr-kpi',
    title: 'HR – KPI Management',
    description: 'KPI library, assignments, and evaluations.',
    accent: 'violet',
    permissions: buildPermissionTiles(
      [
        Permission.MANAGE_KPI_LIBRARY,
        Permission.ASSIGN_KPIS,
        Permission.RATE_TEAM_KPIS,
        Permission.VIEW_TEAM_KPIS,
        Permission.PERFORM_SELF_EVALUATION,
        Permission.VIEW_OWN_KPI_SHEET,
      ],
      { tag: 'manage' }
    ),
  },
  {
    id: 'tasks-projects',
    title: 'Tasks & Projects',
    description: 'Task boards, assignments, and project management.',
    accent: 'sky',
    permissions: [
      ...buildPermissionTiles(
        [Permission.VIEW_TASKS, Permission.VIEW_ALL_TASKS, Permission.VIEW_PROJECTS, Permission.VIEW_ALL_PROJECTS],
        { tag: 'view' }
      ),
      ...buildPermissionTiles(
        [
          Permission.CREATE_TASK,
          Permission.EDIT_TASK,
          Permission.EDIT_ALL_TASKS,
          Permission.DELETE_TASK,
          Permission.DELETE_ALL_TASKS,
          Permission.ASSIGN_TASK,
          Permission.CREATE_PROJECT,
          Permission.EDIT_PROJECT,
          Permission.DELETE_PROJECT,
          Permission.MANAGE_SURVEYS,
        ],
        { tag: 'manage' }
      ),
    ],
  },
  {
    id: 'sms',
    title: 'SMS & Communications',
    description: 'SMS campaigns, templates, and provider settings.',
    accent: 'red',
    permissions: buildPermissionTiles(
      [
        Permission.VIEW_SMS_MODULE,
        Permission.SEND_SMS,
        Permission.MANAGE_SMS_TEMPLATES,
        Permission.MANAGE_SMS_SETTINGS,
      ],
      { tag: 'manage' }
    ),
  },
  {
    id: 'pos',
    title: 'POS System',
    description: 'Point of Sale operations, products, inventory, and orders.',
    accent: 'green',
    permissions: [
      ...buildPermissionTiles(
        [Permission.VIEW_POS, Permission.VIEW_POS_REVENUE],
        { tag: 'view' }
      ),
      ...buildPermissionTiles(
        [
          Permission.MANAGE_POS_PRODUCTS,
          Permission.MANAGE_POS_INVENTORY,
          Permission.CREATE_POS_ORDER,
          Permission.MANAGE_POS_ORDERS,
          Permission.MANAGE_DELIVERY_TRACKING,
        ],
        { tag: 'manage' }
      ),
    ],
  },
  {
    id: 'reports',
    title: 'Reporting & Insights',
    description: 'Operational and performance reports across teams.',
    accent: 'slate',
    permissions: buildPermissionTiles(
      [Permission.VIEW_REPORTS, Permission.VIEW_REPORTS_PERFORMANCE],
      { tag: 'view' }
    ),
  },
  {
    id: 'self',
    title: 'Self-Service Access',
    description: 'Permissions that affect a user’s personal portal.',
    accent: 'gray',
    permissions: buildPermissionTiles(
      [
        Permission.VIEW_OWN_PROFILE,
        Permission.EDIT_OWN_PROFILE_LIMITED,
        Permission.VIEW_OWN_PAYSLIP,
        Permission.VIEW_OWN_LEAVE_REQUESTS,
        Permission.CREATE_LEAVE_REQUEST,
        Permission.VIEW_OWN_ONBOARDING,
        Permission.VIEW_OWN_KPI_SHEET,
      ],
      { tag: 'self' }
    ),
  },
];
import { useAuth } from '../../hooks/useAuth';
import Select from '../ui/Select'; 
import SearchableSelect from '../ui/SearchableSelect';
import { DEFAULT_TIMEZONE } from '../../constants';

// Icons for sub-menu
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
const DepartmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21v-4.5m0 4.5h16.5M3.75 16.5V7.5M3.75 7.5h16.5M3.75 7.5C3.75 5.843 5.093 4.5 6.75 4.5h10.5c1.657 0 3 1.343 3 3M3.75 7.5L12 12m0 0L20.25 7.5M12 12v9" /></svg>;
const RolesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.071M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" /></svg>;
const DataManagementIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>;
const TimezoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;


// SettingsPage Component
const SettingsPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { companyProfile: initialCompanyProfile, updateCompanyProfileContext, refreshUserPermissions } = useAuth();
  const { showConfirmation } = useConfirmation();
  
  const [activeSection, setActiveSection] = useState('companyProfile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('settingsSidebarCollapsed');

  // State for Company Profile section
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting>({
    appName: '', companyName: '', address: '', phone: '', email: '', inactivityTimeoutHours: 3
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false); // Local saving state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [letterheadFile, setLetterheadFile] = useState<File | null>(null);
  const [posLetterheadFile, setPosLetterheadFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
  const [posLetterheadPreview, setPosLetterheadPreview] = useState<string | null>(null);

  // State for Lists sections
  
  // State for Roles & Permissions
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [selectedScopeDepartmentId, setSelectedScopeDepartmentId] = useState<string>("GLOBAL");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STAFF);
  const [currentPermissionsToEdit, setCurrentPermissionsToEdit] = useState<Permission[]>([]);
  const [inheritedPermissions, setInheritedPermissions] = useState<Permission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isDepartmentOverrideActive, setIsDepartmentOverrideActive] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');

  // State for Employee Permissions
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeePermissionsToEdit, setEmployeePermissionsToEdit] = useState<Permission[]>([]);
  const [isEmployeeOverrideActive, setIsEmployeeOverrideActive] = useState(false);
  const [isLoadingEmployeePermissions, setIsLoadingEmployeePermissions] = useState(false);
  const [openEmployeeAccordion, setOpenEmployeeAccordion] = useState<string | null>(null);
  const [employeePermissionSearchTerm, setEmployeePermissionSearchTerm] = useState('');

  // State for Data Management
  const [isRecalculatingBalances, setIsRecalculatingBalances] = useState(false);
  const [recalculateProgress, setRecalculateProgress] = useState({ current: 0, total: 0, label: '' });
  const [isReallocatingGeneralPayments, setIsReallocatingGeneralPayments] = useState(false);
  const [reallocateProgress, setReallocateProgress] = useState({ current: 0, total: 0, label: '' });

  const getFilteredPermissionGroups = useCallback((term: string) => {
    const normalized = term.trim().toLowerCase();
    return permissionGroups
      .map(group => {
        const visiblePermissions =
          normalized.length === 0
            ? group.permissions
            : group.permissions.filter(tile => {
                const haystack = `${tile.label} ${tile.id}`.toLowerCase();
                return haystack.includes(normalized);
              });
        return { ...group, visiblePermissions };
      })
      .filter(group => group.visiblePermissions.length > 0 || normalized.length === 0);
  }, []);

  const filteredRolePermissionGroups = useMemo(
    () => getFilteredPermissionGroups(permissionSearchTerm),
    [permissionSearchTerm, getFilteredPermissionGroups]
  );

  const filteredEmployeePermissionGroups = useMemo(
    () => getFilteredPermissionGroups(employeePermissionSearchTerm),
    [employeePermissionSearchTerm, getFilteredPermissionGroups]
  );

  const totalPermissionCount = useMemo(
    () => permissionGroups.reduce((sum, group) => sum + group.permissions.length, 0),
    []
  );

  const explicitRoleSelections = useMemo(
    () => currentPermissionsToEdit.filter(perm => !inheritedPermissions.includes(perm)),
    [currentPermissionsToEdit, inheritedPermissions]
  );

  const permissionCategories: Record<string, Permission[]> = {
    "General & Settings": [Permission.MANAGE_SETTINGS, Permission.MANAGE_COMPANY_PROFILE, Permission.MANAGE_DEPARTMENTS, Permission.MANAGE_ROLES_PERMISSIONS, Permission.MANAGE_DATA_ARCHIVAL],
    "Leads": [Permission.VIEW_LEADS, Permission.VIEW_ALL_LEADS, Permission.CREATE_LEAD, Permission.EDIT_LEAD, Permission.EDIT_ALL_LEADS, Permission.DELETE_LEAD, Permission.DELETE_ALL_LEADS, Permission.CONVERT_LEAD],
    "Clients & Businesses": [Permission.VIEW_CLIENTS_BUSINESSES, Permission.VIEW_ALL_CLIENTS_BUSINESSES, Permission.CREATE_CLIENT, Permission.EDIT_CLIENT, Permission.DELETE_CLIENT, Permission.MERGE_CLIENTS, Permission.MERGE_BUSINESSES, Permission.CREATE_BUSINESS, Permission.EDIT_BUSINESS, Permission.DELETE_BUSINESS, Permission.IMPORT_CLIENTS_BUSINESSES],
    "Services": [Permission.VIEW_SERVICES, Permission.MANAGE_SERVICES],
    "Sales": [Permission.VIEW_SALES_RECORDS, Permission.VIEW_ALL_SALES_RECORDS, Permission.CREATE_SALE_RECORD, Permission.EDIT_SALE_RECORD, Permission.EDIT_ALL_SALE_RECORDS, Permission.CHECK_SALE_RECORD, Permission.DELETE_SALE_RECORD, Permission.DELETE_ALL_SALE_RECORDS, Permission.AUTO_APPROVE_SALES_CREDIT_NOTES],
    "Finance": [Permission.VIEW_FINANCE_DASHBOARD, Permission.MANAGE_PAYMENTS_RECEIPTS, Permission.APPROVE_PAYMENT, Permission.AUTO_APPROVE_SALES_CREDIT_NOTES, Permission.MANAGE_QUOTATIONS, Permission.MANAGE_INVOICES, Permission.VIEW_CLIENTS_TO_PAY, Permission.MANAGE_VISA_CARDS, Permission.MANAGE_EXPENSES],
    "HR - Staff & Payroll": [Permission.VIEW_STAFF_LIST, Permission.VIEW_STAFF_DETAILS, Permission.CREATE_STAFF, Permission.EDIT_STAFF, Permission.DELETE_STAFF, Permission.VIEW_STAFF_BIRTHDAYS, Permission.VIEW_PAYROLL_ADMIN, Permission.GENERATE_PAYROLL, Permission.EDIT_PAYSLIP, Permission.DELETE_PAYSLIP, Permission.MARK_PAYSLIP_PAID],
    "HR - Leave & Holidays": [Permission.VIEW_LEAVE_ADMIN, Permission.APPROVE_LEAVE_REQUESTS, Permission.MANAGE_HOLIDAYS, Permission.MANAGE_ATTENDANCE],
    "HR - Recruitment & Onboarding": [Permission.VIEW_RECRUITMENT, Permission.MANAGE_JOB_OPENINGS, Permission.MANAGE_CANDIDATES, Permission.MANAGE_ONBOARDING],
    "HR - KPI Management": [Permission.MANAGE_KPI_LIBRARY, Permission.ASSIGN_KPIS, Permission.RATE_TEAM_KPIS, Permission.VIEW_TEAM_KPIS],
    "Tasks & Projects": [Permission.VIEW_TASKS, Permission.VIEW_ALL_TASKS, Permission.CREATE_TASK, Permission.EDIT_TASK, Permission.EDIT_ALL_TASKS, Permission.DELETE_TASK, Permission.DELETE_ALL_TASKS, Permission.ASSIGN_TASK, Permission.VIEW_PROJECTS, Permission.VIEW_ALL_PROJECTS, Permission.CREATE_PROJECT, Permission.EDIT_PROJECT, Permission.DELETE_PROJECT, Permission.MANAGE_SURVEYS],
    "POS System": [Permission.VIEW_POS, Permission.MANAGE_POS_PRODUCTS, Permission.MANAGE_POS_INVENTORY, Permission.CREATE_POS_ORDER, Permission.MANAGE_POS_ORDERS, Permission.MANAGE_DELIVERY_TRACKING, Permission.VIEW_POS_REVENUE],
    "Reports": [Permission.VIEW_REPORTS, Permission.VIEW_REPORTS_PERFORMANCE],
    "User Self-Permissions": [Permission.VIEW_OWN_PROFILE, Permission.EDIT_OWN_PROFILE_LIMITED, Permission.VIEW_OWN_PAYSLIP, Permission.VIEW_OWN_LEAVE_REQUESTS, Permission.CREATE_LEAVE_REQUEST, Permission.VIEW_OWN_ONBOARDING, Permission.VIEW_OWN_KPI_SHEET],
  };

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    try {
        const profile = await apiGetCompanyProfile();
        const initialProfile = profile || { appName: '', companyName: '', address: '', phone: '', email: '' };
        setCompanyProfile(initialProfile);
        setLogoPreview(initialProfile.logoUrl || null);
        setLetterheadPreview(initialProfile.letterheadImageUrl || null);
        setPosLetterheadPreview(initialProfile.posLetterheadImageUrl || null);
    } catch (e) {
        addNotification("Failed to load company profile.", "error");
        console.error("Profile fetch error:", e);
    }

    try {
        const [depts, users] = await Promise.all([
            apiGetDepartments(),
            apiGetUsers(),
        ]);
        setAllDepartments(depts);
        setAllUsers(users);
    } catch(e) {
        addNotification("Failed to load some data.", "warning");
        console.error("Data fetch error:", e);
    }

    setIsLoading(false);
  }, [addNotification]);


  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      if (letterheadPreview && letterheadPreview.startsWith('blob:')) URL.revokeObjectURL(letterheadPreview);
      if (posLetterheadPreview && posLetterheadPreview.startsWith('blob:')) URL.revokeObjectURL(posLetterheadPreview);
    };
  }, [logoPreview, letterheadPreview, posLetterheadPreview]);

  // --- Company Profile Logic ---
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'inactivityTimeoutHours') {
      const numValue = value === '' ? 3 : parseFloat(value);
      setCompanyProfile(p => ({ ...p, [name]: numValue >= 0 ? numValue : 3 }));
    } else {
      setCompanyProfile(p => ({ ...p, [name]: value }));
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'posLetterhead') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} file is too large. Max 2MB.`, "error");
        e.target.value = '';
        return;
      }
      if (type === 'logo') {
        setLogoFile(file);
        if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        setLogoPreview(URL.createObjectURL(file));
      } else if (type === 'letterhead') {
        setLetterheadFile(file);
        if (letterheadPreview && letterheadPreview.startsWith('blob:')) URL.revokeObjectURL(letterheadPreview);
        setLetterheadPreview(URL.createObjectURL(file));
        setCompanyProfile(p => ({ ...p, letterheadFileName: file.name }));
      } else if (type === 'posLetterhead') {
        setPosLetterheadFile(file);
        if (posLetterheadPreview && posLetterheadPreview.startsWith('blob:')) URL.revokeObjectURL(posLetterheadPreview);
        setPosLetterheadPreview(URL.createObjectURL(file));
        setCompanyProfile(p => ({ ...p, posLetterheadFileName: file.name }));
      }
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);
      try {
        const parsedTimeout = Number(companyProfile.inactivityTimeoutHours);
        const normalizedProfile = {
          ...companyProfile,
          inactivityTimeoutHours: Number.isFinite(parsedTimeout) ? Math.max(parsedTimeout, 0) : 3,
        };
        const updatedProfile = await apiUpdateCompanyProfile(normalizedProfile, { logo: logoFile, letterhead: letterheadFile, posLetterhead: posLetterheadFile });
        setCompanyProfile(updatedProfile);
        updateCompanyProfileContext(updatedProfile);
        setLogoPreview(updatedProfile.logoUrl || null);
        setLetterheadPreview(updatedProfile.letterheadImageUrl || null);
        setPosLetterheadPreview(updatedProfile.posLetterheadImageUrl || null);
        setLogoFile(null);
        setLetterheadFile(null);
        setPosLetterheadFile(null);
        addNotification('Company profile updated successfully.', 'success');
      } catch (error) {
        addNotification(`Failed to update profile: ${(error as Error).message}`, 'error');
      }
      setIsSavingProfile(false);
  };


  // --- Roles & Permissions Logic ---
  const fetchPermissionsForScopeAndRole = useCallback(async () => {
      if (!selectedRole || selectedRole === UserRole.OWNER) {
          setCurrentPermissionsToEdit(Object.values(Permission));
          setIsDepartmentOverrideActive(false);
          return;
      }
      setIsLoadingPermissions(true);
      const globalPerms = await apiGetRolePermissions(selectedRole);
      setInheritedPermissions(globalPerms);

      if (selectedScopeDepartmentId === "GLOBAL") {
          setCurrentPermissionsToEdit(globalPerms);
          setIsDepartmentOverrideActive(false);
      } else {
          const deptSpecificPerms = await apiGetDepartmentRolePermissions(selectedScopeDepartmentId, selectedRole);
          if (deptSpecificPerms) {
              setCurrentPermissionsToEdit(deptSpecificPerms);
              setIsDepartmentOverrideActive(true);
          } else {
              setCurrentPermissionsToEdit(globalPerms);
              setIsDepartmentOverrideActive(false);
          }
      }
      setIsLoadingPermissions(false);
  }, [selectedRole, selectedScopeDepartmentId]);

  useEffect(() => {
    if (activeSection === 'rolesPermissions') {
        fetchPermissionsForScopeAndRole();
    }
  }, [activeSection, fetchPermissionsForScopeAndRole]);
  
  // --- Employee Specific Permissions Logic ---
  useEffect(() => {
    const fetchEmployeePermissions = async () => {
        if (!selectedEmployeeId) {
            setEmployeePermissionsToEdit([]);
            return;
        }
        setIsLoadingEmployeePermissions(true);
        try {
            const employee = await apiGetUserById(selectedEmployeeId) as Employee;
            if (!employee) throw new Error("Employee not found");
            
            if (employee.permissions && Array.isArray(employee.permissions)) {
                setEmployeePermissionsToEdit(employee.permissions);
                setIsEmployeeOverrideActive(true);
            } else {
                setIsEmployeeOverrideActive(false);
                let inheritedPerms: Permission[] = [];
                const { role, departmentId } = employee;

                if (role === UserRole.OWNER) {
                    inheritedPerms = Object.values(Permission);
                } else {
                    if (departmentId) {
                        const deptPerms = await apiGetDepartmentRolePermissions(departmentId, role);
                        if (deptPerms) inheritedPerms = deptPerms;
                    }
                    if (inheritedPerms.length === 0) {
                        const globalPerms = await apiGetRolePermissions(role);
                        if (globalPerms && globalPerms.length > 0) inheritedPerms = globalPerms;
                    }
                    if (inheritedPerms.length === 0) {
                        inheritedPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
                    }
                }
                setEmployeePermissionsToEdit(inheritedPerms);
            }

        } catch (error) {
            addNotification("Failed to load employee permissions.", "error");
        }
        setIsLoadingEmployeePermissions(false);
    };

    if (activeSection === 'rolesPermissions') {
        fetchEmployeePermissions();
    }
}, [selectedEmployeeId, addNotification, activeSection]);


  const handlePermissionToggle = (permission: Permission, isChecked: boolean) => {
    setCurrentPermissionsToEdit(prev => isChecked ? [...prev, permission] : prev.filter(p => p !== permission));
    if (selectedScopeDepartmentId !== 'GLOBAL' && !isDepartmentOverrideActive) setIsDepartmentOverrideActive(true);
  };
  
  const handleSelectAllCategory = (categoryPermissions: Permission[], isChecked: boolean) => {
      setCurrentPermissionsToEdit(prev => {
          const otherPermissions = prev.filter(p => !categoryPermissions.includes(p));
          return isChecked ? [...new Set([...otherPermissions, ...categoryPermissions])] : otherPermissions;
      });
      if (selectedScopeDepartmentId !== 'GLOBAL' && !isDepartmentOverrideActive) setIsDepartmentOverrideActive(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || selectedRole === UserRole.OWNER) return;
    setIsLoadingPermissions(true);
    try {
      if (selectedScopeDepartmentId === "GLOBAL") {
        await apiUpdateRolePermissions(selectedRole, currentPermissionsToEdit);
      } else {
        if (isDepartmentOverrideActive) {
          await apiUpdateDepartmentRolePermissions(selectedScopeDepartmentId, selectedRole, currentPermissionsToEdit);
        } else {
          addNotification("No override active. No changes saved.", "info"); return;
        }
      }
      addNotification("Permissions saved successfully.", "success");
      await refreshUserPermissions();
      await fetchPermissionsForScopeAndRole();
    } catch (error) {
      addNotification(`Failed to save permissions: ${(error as Error).message}`, 'error');
    }
    setIsLoadingPermissions(false);
  };
  
  const handleResetToGlobal = async () => {
    if (selectedScopeDepartmentId === "GLOBAL" || !isDepartmentOverrideActive) return;
    const confirmed = await showConfirmation({
      title: 'Remove Department Override',
      message: "Remove department-specific override? This department will revert to global role permissions.",
      confirmText: 'Remove',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
        setIsLoadingPermissions(true);
        try {
            await apiDeleteDepartmentRolePermissions(selectedScopeDepartmentId, selectedRole);
            addNotification("Department override removed.", "success");
            await refreshUserPermissions();
            await fetchPermissionsForScopeAndRole();
        } catch (error) {
            addNotification(`Failed to remove override: ${(error as Error).message}`, 'error');
        }
        setIsLoadingPermissions(false);
    }
  };

  const handleEmployeePermissionToggle = (permission: Permission, isChecked: boolean) => {
    setEmployeePermissionsToEdit(prev => isChecked ? [...prev, permission] : prev.filter(p => p !== permission));
    if (!isEmployeeOverrideActive) setIsEmployeeOverrideActive(true);
  };
  
  const handleEmployeeSelectAllCategory = (categoryPermissions: Permission[], isChecked: boolean) => {
      setEmployeePermissionsToEdit(prev => {
          const otherPermissions = prev.filter(p => !categoryPermissions.includes(p));
          return isChecked ? [...new Set([...otherPermissions, ...categoryPermissions])] : otherPermissions;
      });
      if (!isEmployeeOverrideActive) setIsEmployeeOverrideActive(true);
  };

  const handleSaveEmployeePermissions = async () => {
    if (!selectedEmployeeId) return;
    setIsLoadingEmployeePermissions(true);
    try {
        if (isEmployeeOverrideActive) {
            await apiUpdateUser({ id: selectedEmployeeId, permissions: employeePermissionsToEdit });
            addNotification("Employee permissions saved successfully.", "success");
        } else {
            addNotification("No override active. No changes saved.", "info");
        }
        await refreshUserPermissions();
        // Force re-fetch of permissions by toggling the ID
        const currentSelection = selectedEmployeeId;
        setSelectedEmployeeId('');
        setTimeout(() => setSelectedEmployeeId(currentSelection), 10);
    } catch (error) {
        addNotification(`Failed to save permissions: ${(error as Error).message}`, "error");
    }
    setIsLoadingEmployeePermissions(false);
  };

  const handleClearEmployeeOverride = async () => {
    if (!selectedEmployeeId) return;
    const confirmed = await showConfirmation({
      title: 'Clear Employee Override',
      message: "Are you sure you want to remove this employee's specific permissions? They will revert to their role-based permissions.",
      confirmText: 'Clear',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
        setIsLoadingEmployeePermissions(true);
        try {
            await apiClearUserPermissionOverride(selectedEmployeeId);
            addNotification("Employee permission override cleared.", "success");
            await refreshUserPermissions();
            const currentSelection = selectedEmployeeId;
            setSelectedEmployeeId('');
            setTimeout(() => setSelectedEmployeeId(currentSelection), 10);
        } catch(error) {
             addNotification(`Failed to clear override: ${(error as Error).message}`, "error");
        }
        setIsLoadingEmployeePermissions(false);
    }
  };
  
  // --- Data Management ---
  const handleRecalculateBalancesForPairsWithTransactions = async () => {
    const confirmed = await showConfirmation({
      title: 'Recalculate Balances (Pairs With Transactions)',
      message: "This will recalculate balances for all client-business pairs that have at least one transaction (sales, payments, credit notes, refunds, adjustments, bad debts), including negative (credit) values. Formula: Total Billed = (opening_bal + sum_sales + sum_adj_inc) - (sum_credit_notes + sum_adj_dec) - refunds; Outstanding = Total Billed - (sum_payments + sum_bad_debt). Client and business totals are synced from pair sums. Pairs with no transactions are left alone. Uses fast batch processing. Continue?",
      confirmText: 'Yes, Recalculate',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });
    if (!confirmed) return;
    setIsRecalculatingBalances(true);
    setRecalculateProgress({ current: 0, total: 0, label: 'Starting...' });
    try {
      const result = await apiRecalculateBalancesForPairsWithTransactions((current, total, label) => {
        setRecalculateProgress({ current, total, label });
      });
      if (result.pairsProcessed === 0 && result.errors === 0) {
        addNotification('No client-business pairs with transactions found. Nothing to recalculate.', 'info');
      } else if (result.errors === 0) {
        addNotification(`Successfully recalculated balances for ${result.pairsProcessed} pair(s). Client and business totals synced from pair sums.`, 'success');
      } else {
        addNotification(`Recalculated ${result.pairsProcessed} pair(s). ${result.errors} error(s) occurred. Check console for details.`, 'warning');
      }
    } catch (error) {
      addNotification(`Failed to recalculate balances: ${(error as Error).message}`, 'error');
    } finally {
      setIsRecalculatingBalances(false);
      setRecalculateProgress({ current: 0, total: 0, label: '' });
    }
  };

  const handleReallocateGeneralPaymentsAndBalances = async () => {
    const confirmed = await showConfirmation({
      title: 'Rebuild General Payment Allocations & Balances',
      message: 'This will clear and rebuild sale paid amounts from GENERAL payments for all client-business pairs and client-wide (all linked businesses) payments. Order: (1) unpaid opening balance first, (2) oldest unpaid sales next (skipping fully paid). Sale- and invoice-specific payments stay applied to their sales. Client-business pair balances and client/business balances will be recalculated. Continue?',
      confirmText: 'Yes, Rebuild',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    });
    if (!confirmed) return;
    setIsReallocatingGeneralPayments(true);
    setReallocateProgress({ current: 0, total: 0, label: 'Starting...' });
    try {
      const { generalResult, clientWideResult, balanceResult, syncResult } = await apiReallocateGeneralPaymentsAndRecalculateBalances(
        (current, total, label) => {
          setReallocateProgress({ current, total, label: label || '' });
        }
      );

      if (
        generalResult.pairsProcessed === 0 &&
        generalResult.paymentsUpdated === 0 &&
        generalResult.errors === 0 &&
        clientWideResult.clientsProcessed === 0 &&
        clientWideResult.paymentsUpdated === 0 &&
        clientWideResult.errors === 0
      ) {
        addNotification('No GENERAL or client-wide payments found. Nothing to reallocate.', 'info');
      } else if (generalResult.errors === 0 && clientWideResult.errors === 0 && balanceResult.errors === 0) {
        addNotification(
          `Rebuilt general payments for ${generalResult.pairsProcessed} pair(s) (${generalResult.paymentsUpdated} payment(s)); client-wide: ${clientWideResult.clientsProcessed} client(s) (${clientWideResult.paymentsUpdated} payment(s)). Recalculated balances for ${balanceResult.pairsProcessed} pair(s). Synced ${syncResult.clientsUpdated} client(s) and ${syncResult.businessesUpdated} business(es).`,
          'success'
        );
      } else {
        addNotification(
          `Completed rebuild with some issues. Pair general: ${generalResult.pairsProcessed} pair(s), ${generalResult.paymentsUpdated} payment(s), ${generalResult.errors} error(s). Client-wide: ${clientWideResult.clientsProcessed} client(s), ${clientWideResult.paymentsUpdated} payment(s), ${clientWideResult.errors} error(s). Balance: ${balanceResult.pairsProcessed} pair(s), ${balanceResult.errors} error(s). Check console for details.`,
          'warning'
        );
      }
    } catch (error) {
      addNotification(`Failed to rebuild general payment allocations and balances: ${(error as Error).message}`, 'error');
    } finally {
      setIsReallocatingGeneralPayments(false);
      setReallocateProgress({ current: 0, total: 0, label: '' });
    }
  };

  // --- RENDER FUNCTIONS ---
  const renderCompanyProfileSettings = () => (
    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-4">Company Profile</h3>
      <form onSubmit={handleProfileSubmit}>
        <Input label="App Name" name="appName" value={companyProfile.appName || ''} onChange={handleProfileChange} />
        <Input label="Company Name" name="companyName" value={companyProfile.companyName} onChange={handleProfileChange} />
        <Input label="Address" name="address" value={companyProfile.address} onChange={handleProfileChange} as="textarea" rows={3} />
        <Input label="Phone" name="phone" value={companyProfile.phone} onChange={handleProfileChange} />
        <Input label="Email" name="email" type="email" value={companyProfile.email} onChange={handleProfileChange} />
        <Input 
          label="Auto-Logout After Inactivity (Hours)" 
          name="inactivityTimeoutHours" 
          type="number" 
          value={companyProfile.inactivityTimeoutHours ?? 3} 
          onChange={handleProfileChange}
          min="0.5"
          max="24"
          step="0.5"
          containerClassName="mb-4"
        />
        <p className="text-xs text-text-secondary dark:text-slate-400 mb-4 -mt-2">
          Set the number of hours of inactivity before users are automatically logged out. Default is 3 hours. Set to 0 to disable auto-logout.
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Company Logo</label>
          <Input 
            type="file" 
            accept="image/png, image/jpeg, image/gif" 
            onChange={(e) => handleFileChange(e, 'logo')}
            className="block w-full text-sm text-text-secondary dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-slate-700 file:text-primary-action dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-slate-600"
          />
          {logoPreview && (
            <div className="mt-2">
              <p className="text-xs text-text-secondary dark:text-slate-400">Logo Preview:</p>
              <img src={logoPreview} alt="Logo Preview" className="max-h-20 border rounded mt-1 bg-gray-100 dark:bg-slate-700 p-1" />
            </div>
          )}
        </div>
        <Input label="Payment Instructions" name="paymentInstructions" value={companyProfile.paymentInstructions || ''} onChange={handleProfileChange} as="textarea" rows={2} />
        <Input label="Company Bank Details" name="companyBankDetails" value={companyProfile.companyBankDetails || ''} onChange={handleProfileChange} as="textarea" rows={2} />
        <div className="mt-4">
          <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Company Letterhead Image</label>
           <Input 
            type="file" 
            accept="image/png, image/jpeg, image/gif" 
            onChange={(e) => handleFileChange(e, 'letterhead')}
            className="block w-full text-sm text-text-secondary dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-slate-700 file:text-primary-action dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-slate-600"
          />
          {letterheadPreview && (
            <div className="mt-2">
              <p className="text-xs text-text-secondary dark:text-slate-400">Current Letterhead: {companyProfile.letterheadFileName || 'Preview below'}</p>
              <img src={letterheadPreview} alt="Letterhead Preview" className="max-h-40 border rounded mt-1 dark:border-slate-600" />
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">POS Letterhead Image (for POS orders only)</label>
           <Input 
            type="file" 
            accept="image/png, image/jpeg, image/gif" 
            onChange={(e) => handleFileChange(e, 'posLetterhead')}
            className="block w-full text-sm text-text-secondary dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-slate-700 file:text-primary-action dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-slate-600"
          />
          {posLetterheadPreview && (
            <div className="mt-2">
              <p className="text-xs text-text-secondary dark:text-slate-400">Current POS Letterhead: {companyProfile.posLetterheadFileName || 'Preview below'}</p>
              <img src={posLetterheadPreview} alt="POS Letterhead Preview" className="max-h-40 border rounded mt-1 dark:border-slate-600" />
            </div>
          )}
        </div>
        <Button type="submit" variant="primary" className="mt-4" isLoading={isSavingProfile}>Save Profile</Button>
      </form>
    </div>
  );

  const renderLocalizationSettings = () => (
    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-4">Localization Settings</h3>
        <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
            The application's global timezone is configured here. All dates and times displayed throughout the system are based on this setting to ensure consistency for all users.
        </p>
        <Input
            label="Application Timezone"
            value={DEFAULT_TIMEZONE}
            disabled
            containerClassName="max-w-md"
        />
    </div>
  );
  


  const renderDataManagement = () => (
      <div className="space-y-6">
          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border-2 border-primary-action/30 dark:border-primary-action/50">
              <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-2">Recalculate Balances (Pairs With Transactions)</h3>
              <p className="text-sm text-text-secondary dark:text-slate-400 mb-2">
                  Recalculates balances for all client-business pairs that have <strong>at least one transaction</strong> (sales, payments, credit notes, refunds, balance adjustments, bad debts), <strong>including negative (credit) values</strong>. Uses the formula:
              </p>
              <p className="text-sm text-text-secondary dark:text-slate-400 mb-2 font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  Total Billed = (opening_bal + sum_sales + sum_adj_inc) - (sum_credit_notes + sum_adj_dec) - refunds
                  <br />
                  Outstanding = Total Billed - (sum_payments + sum_bad_debt)
              </p>
              <p className="text-sm text-text-secondary dark:text-slate-400 mb-2">
                  Client and business totals are synced from pair sums. <strong>Pairs with no transactions are left alone.</strong>
              </p>
              {isRecalculatingBalances && recalculateProgress.total > 0 && (
                  <div className="mb-4">
                      <div className="flex justify-between text-sm text-text-secondary dark:text-slate-400 mb-2">
                          <span>Progress: {recalculateProgress.current} / {recalculateProgress.total}</span>
                          <span>{Math.round((recalculateProgress.current / recalculateProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                          <div
                              className="bg-primary-action h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${(recalculateProgress.current / recalculateProgress.total) * 100}%` }}
                          />
                      </div>
                  </div>
              )}
              <Button onClick={handleRecalculateBalancesForPairsWithTransactions} variant="primary" isLoading={isRecalculatingBalances} className="w-full">
                  {isRecalculatingBalances ? 'Recalculating...' : 'Recalculate Balances (Pairs With Transactions)'}
              </Button>
          </div>

          <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border-2 border-primary-action/30 dark:border-primary-action/50 mt-6">
              <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-2">Rebuild General Payment Allocations & Balances</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded px-3 py-2 mb-3">
                  <strong>Fixes incorrect allocations and sale paid amounts for GENERAL payments.</strong> Clears and rebuilds sale paid amounts from general payments per pair: unpaid opening balance first, then oldest unpaid sales (oldest to newest). Sale- and invoice-specific payments are kept as-is. Updates payment.saleAllocations, sale.amountPaid, pair balances, and client/business balances.
              </p>
              <p className="text-sm text-text-secondary dark:text-slate-400 mb-2">
                  Use this when general payments were wrongly applied to sales instead of opening balance, or when you want to fully refresh allocations and balances from payment history.
              </p>
              {isReallocatingGeneralPayments && reallocateProgress.total > 0 && (
                  <div className="mb-4">
                      <div className="flex justify-between text-sm text-text-secondary dark:text-slate-400 mb-2">
                          <span>{reallocateProgress.label || `Progress: ${reallocateProgress.current} / ${reallocateProgress.total}`}</span>
                          <span>{Math.round((reallocateProgress.current / reallocateProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                          <div
                              className="bg-primary-action h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${(reallocateProgress.current / reallocateProgress.total) * 100}%` }}
                          />
                      </div>
                  </div>
              )}
              <Button
                  onClick={handleReallocateGeneralPaymentsAndBalances}
                  variant="primary"
                  isLoading={isReallocatingGeneralPayments}
                  className="w-full"
              >
                  {isReallocatingGeneralPayments ? 'Rebuilding...' : 'Rebuild General Payment Allocations & Balances'}
              </Button>
          </div>
      </div>
  );

  const renderRolePermissions = () => (
    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-4">Role & Department Permissions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Select
          label="Select Scope / Department"
          value={selectedScopeDepartmentId}
          onChange={e => setSelectedScopeDepartmentId(e.target.value)}
          options={[{ value: 'GLOBAL', label: 'Global Role Settings' }, ...allDepartments.map(d => ({ value: d.id, label: d.name }))]}
        />
        <Select
          label="Select User Role"
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value as UserRole)}
          options={Object.values(UserRole).filter(r => r !== UserRole.OWNER).map(r => ({ value: r, label: r }))}
        />
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30 rounded-md mb-4 text-sm text-blue-800 dark:text-blue-200">
        {selectedScopeDepartmentId !== 'GLOBAL' && (
          <div className="flex justify-between items-center mb-2">
            <label className="flex items-center space-x-2 font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded text-primary-action focus:ring-primary-action bg-transparent border-blue-400"
                checked={isDepartmentOverrideActive}
                onChange={e => setIsDepartmentOverrideActive(e.target.checked)}
              />
              <span>Enable Department Override</span>
            </label>
            {isDepartmentOverrideActive && (
              <Button variant="danger" size="sm" onClick={handleResetToGlobal}>
                Reset to Global Settings
              </Button>
            )}
          </div>
        )}
        <p>
          {selectedScopeDepartmentId === 'GLOBAL'
            ? `Editing Global permissions for ${selectedRole}.`
            : isDepartmentOverrideActive
            ? `Editing specific permissions for ${selectedRole} in this department.`
            : `Inheriting Global permissions for ${selectedRole}. Toggle override to make changes.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
          <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-slate-400">Selected</p>
          <p className="text-2xl font-semibold text-primary-action">{selectedScopeDepartmentId === 'GLOBAL' ? currentPermissionsToEdit.length : explicitRoleSelections.length}/{totalPermissionCount}</p>
          <p className="text-xs text-text-secondary dark:text-slate-400">Active toggles {selectedScopeDepartmentId !== 'GLOBAL' && '(custom overrides)'}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
          <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-slate-400">Inherited</p>
          <p className="text-2xl font-semibold text-emerald-500">{inheritedPermissions.length}</p>
          <p className="text-xs text-text-secondary dark:text-slate-400">From global {selectedScopeDepartmentId === 'GLOBAL' ? 'role defaults' : 'role + global'}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
          <Input
            label="Search Permissions"
            value={permissionSearchTerm}
            onChange={e => setPermissionSearchTerm(e.target.value)}
            placeholder="Search permissions..."
            containerClassName="mb-0"
          />
        </div>
      </div>

      {permissionSearchTerm && (
        <div className="flex justify-between items-center text-xs text-text-secondary dark:text-slate-400 mb-4">
          <span>Showing results for “{permissionSearchTerm}”.</span>
          <button className="text-primary-action hover:underline" onClick={() => setPermissionSearchTerm('')}>
            Clear search
          </button>
        </div>
      )}

      {isLoadingPermissions ? (
        <Spinner />
      ) : filteredRolePermissionGroups.length === 0 ? (
        <div className="text-center py-10 text-text-secondary dark:text-slate-400">
          No permissions match “{permissionSearchTerm}”.
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {filteredRolePermissionGroups.map(group => {
            const visiblePermissions = (group as PermissionGroup & { visiblePermissions: PermissionTile[] }).visiblePermissions;
            const permissionIds = visiblePermissions.map(tile => tile.id);
            const isAllSelected = permissionIds.length > 0 && permissionIds.every(p => currentPermissionsToEdit.includes(p));
            const isOpen = openAccordion === group.id;
            const accentClasses = groupAccentStyles[group.accent] ?? groupAccentStyles.gray;
            return (
              <div key={group.id} className="p-4 border dark:border-slate-700 rounded-lg">
                <button
                  onClick={() => setOpenAccordion(isOpen ? null : group.id)}
                  className="w-full flex justify-between items-start text-left"
                >
                  <div>
                    <p className="text-sm tracking-wide uppercase text-slate-500">{group.title}</p>
                    <p className="text-xs text-text-secondary dark:text-slate-400">{group.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${accentClasses.bg} ${accentClasses.text}`}>
                    {visiblePermissions.filter(tile => currentPermissionsToEdit.includes(tile.id)).length}/{group.permissions.length}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t dark:border-slate-600">
                    <label className="flex items-center space-x-2 text-sm font-medium mb-3" title={`Select all permissions in ${group.title}`}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={e => handleSelectAllCategory(permissionIds, e.target.checked)}
                        disabled={permissionIds.length === 0 || (selectedScopeDepartmentId !== 'GLOBAL' && !isDepartmentOverrideActive)}
                        className="rounded text-primary-action focus:ring-primary-action"
                      />
                      <span>Select all in {group.title}</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                      {visiblePermissions.map(tile => {
                        const isInherited = inheritedPermissions.includes(tile.id);
                        const isChecked = currentPermissionsToEdit.includes(tile.id);
                        const tagStyle = tile.tag ? permissionTagStyles[tile.tag] : '';
                        return (
                          <div key={tile.id} className="flex items-start space-x-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 mt-0.5 text-primary-action rounded border-gray-300 dark:border-slate-500 dark:bg-slate-900 focus:ring-primary-action"
                              checked={isChecked}
                              onChange={e => handlePermissionToggle(tile.id, e.target.checked)}
                              disabled={selectedScopeDepartmentId !== 'GLOBAL' && !isDepartmentOverrideActive}
                            />
                            <div>
                              <p className={isInherited && !isDepartmentOverrideActive ? 'text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-200'}>
                                {tile.label}
                                {tile.tag && (
                                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tagStyle}`}>
                                    {tile.tag}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-text-secondary dark:text-slate-400">
                                {PERMISSION_DESCRIPTIONS[tile.id]}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedRole !== UserRole.OWNER && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSavePermissions}
            variant="primary"
            isLoading={isLoadingPermissions}
            disabled={selectedScopeDepartmentId !== 'GLOBAL' && !isDepartmentOverrideActive}
          >
            Save Permissions
          </Button>
        </div>
      )}

      {/* Employee Specific Permissions */}
      <div className="mt-8 pt-6 border-t dark:border-slate-700">
        <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-4">Employee Specific Permissions</h3>
        <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
          Set permission overrides for individual employees. These permissions will take precedence over any role or department settings.
        </p>
        <SearchableSelect
            label="Select Employee to Configure"
            options={allUsers.map(u => ({ value: u.id, label: `${u.name} (${(u as Employee).employeeId || u.email})` }))}
            value={selectedEmployeeId}
            onChange={value => setSelectedEmployeeId(String(value))}
            placeholder="-- Search for an employee --"
        />
        {selectedEmployeeId && (
          isLoadingEmployeePermissions ? <Spinner /> : (
            <>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/30 rounded-md my-4 text-sm text-blue-800 dark:text-blue-200">
                  <div className="flex justify-between items-center">
                      <p><strong>Status:</strong> {isEmployeeOverrideActive ? 'Custom permissions are active.' : 'Inheriting permissions from role/department.'}</p>
                      {isEmployeeOverrideActive && <Button variant="danger" size="sm" onClick={handleClearEmployeeOverride}>Clear Override</Button>}
                  </div>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Search Permissions"
                    value={employeePermissionSearchTerm}
                    onChange={e => setEmployeePermissionSearchTerm(e.target.value)}
                    placeholder="Search by keyword..."
                    containerClassName="mb-0"
                  />
                  {employeePermissionSearchTerm && (
                    <Button variant="ghost" className="md:self-end" onClick={() => setEmployeePermissionSearchTerm('')}>
                      Clear search
                    </Button>
                  )}
                </div>
                {filteredEmployeePermissionGroups.length === 0 ? (
                  <div className="text-center py-6 text-text-secondary dark:text-slate-400">
                    No permissions match “{employeePermissionSearchTerm}”.
                  </div>
                ) : (
                  filteredEmployeePermissionGroups.map(group => {
                    const visiblePermissions = (group as PermissionGroup & { visiblePermissions: PermissionTile[] }).visiblePermissions;
                    const permissionIds = visiblePermissions.map(tile => tile.id);
                    const isAllSelected = permissionIds.length > 0 && permissionIds.every(p => employeePermissionsToEdit.includes(p));
                    const isOpen = openEmployeeAccordion === group.id;
                    const accentClasses = groupAccentStyles[group.accent] ?? groupAccentStyles.gray;
                    return (
                      <div key={`emp-${group.id}`} className="p-3 border dark:border-slate-700 rounded-lg">
                        <button
                          onClick={() => setOpenEmployeeAccordion(isOpen ? null : group.id)}
                          className="w-full flex justify-between items-center text-left font-semibold text-text-primary dark:text-slate-200"
                        >
                          <span>{group.title}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${accentClasses.bg} ${accentClasses.text}`}>
                            {visiblePermissions.filter(tile => employeePermissionsToEdit.includes(tile.id)).length}/{group.permissions.length}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="mt-3 pt-3 border-t dark:border-slate-600">
                            <label className="flex items-center space-x-2 text-sm font-medium mb-2">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={e => handleEmployeeSelectAllCategory(permissionIds, e.target.checked)}
                                className="rounded text-primary-action"
                              />
                              <span>Select All</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                              {visiblePermissions.map(tile => {
                                const tagStyle = tile.tag ? permissionTagStyles[tile.tag] : '';
                                return (
                                  <label key={`emp-${tile.id}`} className="flex items-start space-x-2 text-sm" title={PERMISSION_DESCRIPTIONS[tile.id]}>
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 mt-0.5 rounded"
                                      checked={employeePermissionsToEdit.includes(tile.id)}
                                      onChange={e => handleEmployeePermissionToggle(tile.id, e.target.checked)}
                                    />
                                    <div>
                                      <span className="text-gray-700 dark:text-slate-300">
                                        {tile.label}
                                        {tile.tag && (
                                          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tagStyle}`}>
                                            {tile.tag}
                                          </span>
                                        )}
                                      </span>
                                      <p className="text-xs text-text-secondary dark:text-slate-400">
                                        {PERMISSION_DESCRIPTIONS[tile.id]}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveEmployeePermissions} variant="primary" isLoading={isLoadingEmployeePermissions}>Save Employee Permissions</Button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );

const renderActiveSection = () => {
    if (isLoading) return <div className="flex justify-center items-center min-h-[300px]"><Spinner size="lg"/></div>;
    
    switch (activeSection) {
      case 'companyProfile': return renderCompanyProfileSettings();
      case 'localization': return renderLocalizationSettings();
      case 'rolesPermissions': return renderRolePermissions();
      case 'dataManagement': return renderDataManagement();
      default: return <p>Select a section to manage settings.</p>;
    }
};

const menuItems = [
    { id: 'companyProfile', label: 'Company Profile', icon: <ProfileIcon /> },
    { id: 'localization', label: 'Localization', icon: <TimezoneIcon /> },
    { id: 'rolesPermissions', label: 'Roles & Permissions', icon: <RolesIcon /> },
    { id: 'dataManagement', label: 'Data Management', icon: <DataManagementIcon /> },
];

return (
    <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
        <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
            <div className="flex justify-between items-center mb-6">
                {!isSidebarCollapsed && <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Settings Menu</h2>}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
                    title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isSidebarCollapsed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" /></svg>
                    )}
                </button>
            </div>
            <nav className="space-y-2">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                            ${activeSection === item.id 
                                ? 'bg-primary-action text-white shadow-md' 
                                : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action dark:hover:text-slate-100'
                            }`}
                        title={isSidebarCollapsed ? item.label : ''}
                    >
                        <span className={`${isSidebarCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-white' : 'text-gray-500 dark:text-slate-400 group-hover:text-primary-action'}`}>{item.icon}</span>
                        {!isSidebarCollapsed && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>
        </aside>
        <main className="flex-1">
            {renderActiveSection()}
        </main>
    </div>
);
};

export default SettingsPage;