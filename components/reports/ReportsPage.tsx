
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';
import MyActivityReport from './MyActivityReport';
import LeadsReport from './LeadsReport';
import SalesReport from './SalesReport';
import TasksReport from './TasksReport';
import ExpenseReport from './ExpenseReport';
import EmployeePerformanceReport from './EmployeePerformanceReport';
import CompanyFinancialReport from './CompanyFinancialReport';
import ProfitLossReport from './ProfitLossReport';
import BalanceSheetReport from './BalanceSheetReport';
import Button from '../ui/Button'; 

const ReportCard: React.FC<{ title: string; description: string; onClick: () => void; icon?: React.ReactNode }> = ({ title, description, onClick, icon }) => (
    <div 
        className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer transform hover:scale-105 border border-slate-200 dark:border-slate-700"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        aria-label={`View ${title} report`}
    >
        <div className="flex items-center mb-3">
            {icon && <div className="mr-3 text-primary-action">{icon}</div>}
            <h3 className="text-xl font-semibold text-text-primary dark:text-slate-200">{title}</h3>
        </div>
        <p className="text-sm text-text-secondary dark:text-slate-400">{description}</p>
    </div>
);

// Icons for Report Cards
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
const LeadsReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>;
const SalesReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const TasksReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ExpenseReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;
const PerformanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>;
const FinancialReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6V9m18-3v3m-10.5-3H16.5m-3.75 0V3.75m0 0H10.5m2.25 0L12 2.25m-15 0a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25m-17.25 0h17.25" /></svg>;
const TrainingReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>;


const ReportsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  
  if (!hasPermission(Permission.VIEW_REPORTS)) {
      return (
          <div className="text-center p-8">
              <h2 className="text-2xl font-semibold text-status-danger mb-4">Access Denied</h2>
              <p className="text-text-secondary">You do not have permission to view reports.</p>
          </div>
      );
  }

  const availableReports = [
    { id: 'myActivity', title: 'My Activity Summary', description: 'View a summary of your personal leads, tasks, and sales activities.', component: <MyActivityReport />, permission: null, icon: <ActivityIcon /> },
    { id: 'leads', title: 'Leads Report', description: 'Analyze lead generation, status distribution, and conversion rates.', component: <LeadsReport />, permission: Permission.VIEW_LEADS, icon: <LeadsReportIcon /> },
    { id: 'sales', title: 'Sales Report', description: 'Track sales performance, revenue, and identify top-performing services or team members.', component: <SalesReport />, permission: Permission.VIEW_SALES_RECORDS, icon: <SalesReportIcon /> },
    { id: 'tasks', title: 'Tasks Report', description: 'Monitor task completion rates, overdue tasks, and workload distribution.', component: <TasksReport />, permission: Permission.VIEW_TASKS, icon: <TasksReportIcon /> },
    { id: 'expenses', title: 'Expense Report', description: 'View and analyze company expenses, filterable by category.', component: <ExpenseReport />, permission: Permission.MANAGE_EXPENSES, icon: <ExpenseReportIcon /> },
    { id: 'financial', title: 'Company Financial Report', description: '360° view of company financials including revenue, expenses, and profit.', component: <CompanyFinancialReport />, permission: Permission.VIEW_FINANCE_DASHBOARD, icon: <FinancialReportIcon /> },
    { id: 'profitLoss', title: 'Profit & Loss (P&L)', description: 'Income statement with trading income, COGS, and net profit breakdowns.', component: <ProfitLossReport />, permission: Permission.VIEW_FINANCIAL_REPORTS, icon: <FinancialReportIcon /> },
    { id: 'balanceSheet', title: 'Balance Sheet (SoFP)', description: 'Statement of financial position: assets, liabilities, and equity roll-forward.', component: <BalanceSheetReport />, permission: Permission.VIEW_FINANCIAL_REPORTS, icon: <FinancialReportIcon /> },
    { 
      id: 'employeePerformance', 
      title: 'Employee Performance', 
      description: 'Review performance metrics for individual employees.', 
      component: <EmployeePerformanceReport />, 
      permissionCheck: () => hasPermission(Permission.VIEW_REPORTS_PERFORMANCE),
      icon: <PerformanceIcon /> 
    },
  ].filter(report => report.permission === null || (report.permission && hasPermission(report.permission)) || (report.permissionCheck && report.permissionCheck()));

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const renderSelectedReport = () => {
    if (!selectedReport) return null;
    const report = availableReports.find(r => r.id === selectedReport);
    return report ? report.component : null;
  };

  return (
    <div className="space-y-8">
      {selectedReport ? (
        <div>
          <Button onClick={() => setSelectedReport(null)} variant="secondary" className="mb-6">
            &larr; Back to Report Selections
          </Button>
          {renderSelectedReport()}
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary">Reports Dashboard</h2>
            <p className="text-text-secondary mt-1">Select a report below to view detailed insights.</p>
          </div>
          {availableReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableReports.map(report => (
                <ReportCard 
                    key={report.id} 
                    title={report.title} 
                    description={report.description}
                    icon={report.icon}
                    onClick={() => handleSelectReport(report.id)} 
                />
                ))}
            </div>
          ) : (
            <p className="text-center text-text-secondary">No reports available for your role.</p>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
