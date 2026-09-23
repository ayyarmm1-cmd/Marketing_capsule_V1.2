

import React, {useState, useEffect, Suspense} from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import ChangePasswordPage from './components/auth/ChangePasswordPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './components/dashboard/DashboardPage'; 
import LeadsPage from './components/leads/LeadsPage';
import LeadsOverviewPage from './components/leads/LeadsOverviewPage';
import LeadActivitiesPage from './components/leads/LeadActivitiesPage';
import LeadNotesPage from './components/leads/LeadNotesPage';
import LeadAnalyticsPage from './components/leads/LeadAnalyticsPage';
import LeadSettingsPage from './components/leads/LeadSettingsPage';
import LeadDetailPage from './components/leads/LeadDetailPage'; 
import ClientsPage from './components/clients/ClientsPage';
import { ClientDetailPage } from './components/clients/ClientDetailPage';
import ClientSettingsPage from './components/clients/ClientSettingsPage';
import ServicesPage from './components/services_mgt/ServicesPage';
import ServiceDetailPage from './components/services_mgt/ServiceDetailPage';
import SalesEntryPage from './components/sales_entry/SalesEntryPage'; 
import SaleDetailPage from './components/sales_entry/SaleDetailPage';
import InvoicesPage from './components/sales_entry/InvoicesPage';
const QuotationsPage = React.lazy(() => import('./components/sales_entry/QuotationsPage'));
// Updated Facebook Ads page import
import FacebookAdsPage from './components/facebook_ads/FacebookAdsPage';
import StaffManagementPage from './components/finance_hr/StaffManagementPage';
import PayrollPage from './components/finance_hr/PayrollPage';
import VisaCardManagementPage from './components/finance_hr/VisaCardManagementPage';
import VisaCardDetailPage from './components/finance_hr/VisaCardDetailPage';
import ExpenseTrackingPage from './components/finance_hr/ExpenseTrackingPage';
import AccountsPayablePage from './components/finance/AccountsPayablePage';
import AccountsReceivablePage from './components/finance/AccountsReceivablePage';
import ReceivablesAndBadDebtsPage from './components/finance/ReceivablesAndBadDebtsPage';
import CreditNotesPage from './components/finance/CreditNotesPage';
import BalanceAdjustmentsPage from './components/finance/BalanceAdjustmentsPage';
import BalanceAdjustmentDetailPage from './components/finance/detail_pages/BalanceAdjustmentDetailPage';
import PaymentsReceiptsPage from './components/finance/PaymentsReceiptsPage';
import CashManagementPage from './components/finance/CashManagementPage';
import CashAccountDetailPage from './components/finance/CashAccountDetailPage';
import FixedAssetsPage from './components/finance/FixedAssetsPage';
import CapitalManagementPage from './components/finance/CapitalManagementPage';
import FinancialAnalyticsPage from './components/finance/FinancialAnalyticsPage';
import BalanceSheetPage from './components/finance/BalanceSheetPage';
import OpeningBalancePage from './components/finance/OpeningBalancePage';
import InvoiceDetailPage from './components/finance/detail_pages/InvoiceDetailPage'; 
import QuotationDetailPage from './components/finance/detail_pages/QuotationDetailPage'; 

import SettingsPage from './components/settings/SettingsPage';
import ReportsPage from './components/reports/ReportsPage'; 
import MyActivityReport from './components/reports/MyActivityReport';
import LeadsReport from './components/reports/LeadsReport';
import SalesReport from './components/reports/SalesReport';
import TasksReport from './components/reports/TasksReport';
import ExpenseReport from './components/reports/ExpenseReport';
import EmployeePerformanceReport from './components/reports/EmployeePerformanceReport';
import CompanyFinancialReport from './components/reports/CompanyFinancialReport';
import ProfitLossReport from './components/reports/ProfitLossReport';
import BalanceSheetReport from './components/reports/BalanceSheetReport';
import PromotionsPage from './components/promotions/PromotionsPage'; // New Promotions Page

// New HR Module Imports
import MyLeavePage from './components/hr_module/MyLeavePage';
import LeaveManagementAdminPage from './components/hr_module/LeaveManagementAdminPage';
import HolidayCalendarPage from './components/hr_module/HolidayCalendarPage';
import MyProfilePage from './components/hr_module/MyProfilePage';
import EmployeeDetailPage from './components/hr_module/EmployeeDetailPage'; 
import MyPayrollPage from './components/hr_module/MyPayrollPage';
import AttendancePage from './components/hr_module/AttendancePage'; // New Attendance Page
import AttendanceRulesSettingsPage from './components/hr_module/AttendanceRulesSettingsPage';
import ActivityLogPage from './components/hr_module/ActivityLogPage';
import MyKpiPage from './components/hr_module/MyKpiPage'; // New KPI Page
import TeamKpiPage from './components/hr_module/TeamKpiPage'; // New KPI Page
import KpiManagementPage from './components/kpi/KpiManagementPage'; // New KPI Page
import HRManagementPage from './components/hr_module/HRManagementPage'; // HR Management Page

// Task Management Imports
import TaskManagementPage from './components/tasks/TaskManagementPage';
import TaskDetailPage from './components/tasks/TaskDetailPage';
// Project Management Imports
import ProjectsPage from './components/projects/ProjectsPage';
import ProjectDetailPage from './components/projects/ProjectDetailPage';


// My Space Imports
import MyNotificationsPage from './components/notifications/MyNotificationsPage';

// SMS Communication Imports (New)
import SmsPage from './components/sms/SmsPage';

// POS System Imports
import POSPage from './components/pos/POSPage';

import { useAuth } from './hooks/useAuth';
import { UserRole } from './types';
import NotificationToaster from './components/ui/NotificationToaster'; 
import { apiSendNotification } from './services/api';
import AppLoader from './components/ui/AppLoader';
import UpdateBanner from './components/ui/UpdateBanner';
import MessengerChatButton from './components/ui/MessengerChatButton';
import PrivacyPolicyPage from './components/public/PrivacyPolicyPage';
import PaymentMethodsPage from './components/public/PaymentMethodsPage';
import TermsOfServicePage from './components/public/TermsOfServicePage';


const InvoiceRedirect: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <Navigate to={`/sales/invoices/${invoiceId}`} replace />;
};

const QuotationRedirect: React.FC = () => {
  const { quotationId } = useParams<{ quotationId: string }>();
  return <Navigate to={`/sales/quotations/${quotationId}`} replace />;
};

const ProtectedRoute: React.FC<{ roles?: UserRole[] }> = ({ roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-action"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; 
  }
  
  return <Outlet />;
};

const App: React.FC = () => {
  const { user, loading, companyProfile } = useAuth(); // Get companyProfile for the loader
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const location = useLocation();
  const APP_VERSION = "2.3.0"; // Current version of the deployed code

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen to custom event for same-tab updates
    window.addEventListener('sidebarCollapseChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebarCollapseChange', handleStorageChange);
    };
  }, []);
  
  // Check if current route is a public page (where chat button should be shown)
  const isPublicPage = ['/privacy-policy', '/payments', '/terms-of-service'].includes(location.pathname);

  // Example: Add a welcome notification with a link after user logs in
  useEffect(() => {
    if (user && !user.requiresPasswordChange) {
      const welcomeShown = sessionStorage.getItem('welcomeNotificationShown');
      if (!welcomeShown) {
        apiSendNotification(user.id, {
            message: `Check out your profile or dive into your tasks.`,
            type: 'info',
            title: `Welcome back, ${user.name}!`,
            link: '/profile'
        }).catch(err => console.error("Failed to send welcome notification:", err));
        
        sessionStorage.setItem('welcomeNotificationShown', 'true');
      }
    }
  }, [user]);
  
  // Effect for checking for new app version
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${new Date().getTime()}`);
        if (!response.ok) return;
        const serverVersionData = await response.json();
        if (serverVersionData.version && serverVersionData.version !== APP_VERSION) {
          console.log(`Update available. Server: ${serverVersionData.version}, Client: ${APP_VERSION}`);
          setIsUpdateAvailable(true);
          if (intervalId) clearInterval(intervalId); // Stop checking once an update is found
        }
      } catch (error) {
        console.warn("Could not check for app updates:", error);
      }
    };

    const timeoutId = setTimeout(checkVersion, 5000); // Check 5 seconds after app load
    const intervalId = setInterval(checkVersion, 15 * 60 * 1000); // And every 15 minutes

    return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
    };
  }, []);


  if (loading) { 
    return <AppLoader logoUrl={companyProfile?.logoUrl} />; // Use the new AppLoader
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/payments" element={<PaymentMethodsPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.requiresPasswordChange) {
    return (
      <Routes>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    );
  }

  return (
    <div className="relative min-h-screen bg-app-bg text-text-primary dark:bg-slate-900 dark:text-slate-100 lg:flex">
      {isUpdateAvailable && <UpdateBanner />}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden sidebar-transition" style={{
        marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 
          ? (sidebarCollapsed ? '4rem' : '16rem')
          : undefined
      } as React.CSSProperties}>
        <Header toggleSidebar={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-app-bg dark:bg-slate-900">
          <NotificationToaster />
          <Routes>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/change-password" element={<Navigate to="/dashboard" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/payments" element={<PaymentMethodsPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* My Space */}
              <Route path="profile" element={<MyProfilePage />} />
              <Route path="my-tasks" element={<TaskManagementPage />} />
              <Route path="my-notifications" element={<MyNotificationsPage />} />
              <Route path="my/leave" element={<MyLeavePage />} />
              <Route path="my-payroll" element={<MyPayrollPage />} />
              <Route path="my/kpi" element={<MyKpiPage />} />
              
              {/* Core Business */}
              <Route path="leads" element={<LeadsPage />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<LeadsOverviewPage />} />
                <Route path="activities" element={<LeadActivitiesPage />} />
                <Route path="notes" element={<LeadNotesPage />} />
                <Route path="analytics" element={<LeadAnalyticsPage />} />
                <Route path="settings" element={<LeadSettingsPage />} />
                <Route path=":leadId" element={<LeadDetailPage />} />
              </Route>
              <Route path="clients" element={<ClientsPage defaultTab="clients" />} />
              <Route path="clients/settings" element={<ClientSettingsPage />} />
              <Route path="clients/:clientId" element={<ClientDetailPage />} />
              <Route path="businesses" element={<ClientsPage defaultTab="businesses" />} />
              <Route path="businesses/:businessId" element={<ClientDetailPage isBusinessView />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="services/:serviceId" element={<ServiceDetailPage />} />
              <Route path="promotions" element={<PromotionsPage />} />
              <Route path="sales" element={<SalesEntryPage />} />
              <Route path="sales/:saleId" element={<SaleDetailPage />} />
              <Route path="sales/invoices" element={<InvoicesPage />} />
              <Route path="sales/invoices/:invoiceId" element={<InvoiceDetailPage />} />
              <Route path="sales/quotations" element={<Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="text-text-primary">Loading...</div></div>}><QuotationsPage /></Suspense>} />
              <Route path="sales/quotations/:quotationId" element={<QuotationDetailPage />} />
              <Route path="facebook-ads" element={<Navigate to="/facebook-ads/dashboard" replace />} />
              <Route path="facebook-ads/*" element={<FacebookAdsPage />} />


              {/* Project Management */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="tasks" element={<TaskManagementPage />} />
              <Route path="tasks/:taskId" element={<TaskDetailPage />} />

              {/* Finance */}
              <Route path="finance/documents" element={<AccountsReceivablePage />} />
              <Route path="finance/clients-to-pay" element={<AccountsReceivablePage />} />
              <Route path="finance/ap" element={<AccountsPayablePage />} />
              <Route path="finance/credit-notes" element={<CreditNotesPage />} />
              <Route path="finance/balance-adjustments" element={<BalanceAdjustmentsPage />} />
              <Route path="finance/balance-adjustments/:adjustmentId" element={<BalanceAdjustmentDetailPage />} />
              <Route path="finance/ar" element={<ReceivablesAndBadDebtsPage />} />
              <Route path="finance/opening-balance" element={<OpeningBalancePage />} />
              <Route path="finance/payments" element={<PaymentsReceiptsPage />} />
              <Route path="finance/cash" element={<CashManagementPage />} />
              <Route path="finance/cash/accounts/:accountId" element={<CashAccountDetailPage />} />
              <Route path="finance/fixed-assets" element={<FixedAssetsPage />} />
              <Route path="finance/capital" element={<CapitalManagementPage />} />
              <Route path="finance/analytics" element={<FinancialAnalyticsPage />} />
              <Route path="finance/bad-debts" element={<Navigate to="/finance/ar" replace />} />
              <Route path="finance/balance-sheet" element={<BalanceSheetPage />} />
              {/* Invoice routes moved to /sales/invoices */}
              <Route path="finance/invoices/:invoiceId" element={<InvoiceRedirect />} />
              {/* Quotation routes moved to /sales/quotations */}
              <Route path="finance/quotations/:quotationId" element={<QuotationRedirect />} />
              <Route path="finance/visa-cards" element={<VisaCardManagementPage />} />
              <Route path="finance/visa-cards/:cardId" element={<VisaCardDetailPage />} />
              <Route path="finance/expenses" element={<ExpenseTrackingPage />} />

              {/* HR */}
              <Route path="hr/staff" element={<StaffManagementPage />} />
              <Route path="hr/staff/:employeeId" element={<EmployeeDetailPage />} />
              <Route path="hr/payroll" element={<PayrollPage />} />
              <Route path="hr/leave-admin" element={<LeaveManagementAdminPage />} />
              <Route path="hr/holidays" element={<HolidayCalendarPage />} />
              <Route path="hr/activity-log" element={<ActivityLogPage />} />
              <Route path="hr/attendance" element={<AttendancePage />} />
              <Route path="hr/attendance-rules" element={<AttendanceRulesSettingsPage />} />
              <Route path="hr/kpi-management" element={<KpiManagementPage />} />
              <Route path="hr/team-kpis" element={<TeamKpiPage />} />
              <Route path="hr/departments" element={<HRManagementPage />} />

              {/* SMS Communication (New) */}
              <Route path="sms/*" element={<SmsPage />} />

              {/* POS System */}
              <Route path="pos/*" element={<POSPage />} />

              {/* System */}
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/my-activity" element={<MyActivityReport />} />
              <Route path="reports/leads" element={<LeadsReport />} />
              <Route path="reports/sales" element={<SalesReport />} />
              <Route path="reports/tasks" element={<TasksReport />} />
              <Route path="reports/expenses" element={<ExpenseReport />} />
              <Route path="reports/financial" element={<CompanyFinancialReport />} />
              <Route path="reports/profit-loss" element={<ProfitLossReport />} />
              <Route path="reports/balance-sheet" element={<BalanceSheetReport />} />
              <Route path="reports/employee-performance" element={<EmployeePerformanceReport />} />
              <Route path="settings" element={<SettingsPage />} />
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </main>
      </div>
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      {/* Only show chat button on public pages, not in ERP */}
      {isPublicPage && <MessengerChatButton />}
    </div>
  );
};

export default App;