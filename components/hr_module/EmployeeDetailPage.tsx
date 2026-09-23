import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Employee, UserRole, EmployeeStatus, Payslip, Task, Lead, SaleRecord, LeaveRequest, LeadStatus, TaskStatus, Permission, EmployeeKpiSheet, BalanceAdjustment, BalanceAdjustmentType, Service, BadDebt, BadDebtStatus } from '../../types';
import { 
    apiGetEmployeeById, 
    apiUpdateEmployee, 
    apiDeleteEmployee, 
    apiGenerateSinglePayslip, 
    apiGetTasksForEmployee, 
    apiGetLeadsForEmployee, 
    apiGetSalesForEmployee, 
    apiGetPayslipsForEmployee, 
    apiGetLeaveRequestsForEmployee,
    apiGetEmployeeKpiSheets,
    apiGetClients,
    apiGetBusinesses,
    apiGetBalanceAdjustmentsForEmployee,
    apiGetServices,
    apiGetBadDebtsForResponsiblePerson
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { STATUS_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { AssignKpiModal } from '../kpi/AssignKpiModal'; // New import
import { formatDateTimeForDisplay } from '../../utils/dateUtils';

// --- TYPE DEFINITIONS & ICONS ---

interface UnifiedActivity {
  id: string;
  type: 'Lead' | 'Task' | 'Sale' | 'Leave';
  timestamp: Date;
  description: React.ReactNode;
  link: string;
  icon: React.ReactNode;
}

const LeadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const TaskIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const SaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const LeaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" /></svg>;
const KPICard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg text-center shadow">
        <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-primary-action">{value}</p>
    </div>
);

// --- HELPER COMPONENTS & MODALS ---

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; className?: string }> = ({ label, value, children, className }) => (
    <div className={`py-1 ${className}`}>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-40 inline-block">{label}: </span>
        {children ? children : <span className="text-sm text-slate-800 dark:text-slate-200">{value || 'N/A'}</span>}
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {children}
        </div>
    </section>
);


const GenerateSinglePayslipModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (month: string) => Promise<void>;
  employeeName: string;
}> = ({ isOpen, onClose, onSubmit, employeeName }) => {
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setIsLoading(true);
        await onSubmit(month);
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Generate Payslip for ${employeeName}`}>
            <div className="space-y-4">
                <Input type="month" label="Select Month to Generate For" value={month} onChange={(e) => setMonth(e.target.value)} />
                <div className="flex justify-end space-x-2 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>Generate</Button>
                </div>
            </div>
        </Modal>
    );
};


const EmployeeDetailPage: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const { user: loggedInUser, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const navigate = useNavigate();

    // Data states
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [kpiSheets, setKpiSheets] = useState<EmployeeKpiSheet[]>([]);
    const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustment[]>([]);
    const [badDebts, setBadDebts] = useState<BadDebt[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    
    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'tasks' | 'leads' | 'sales' | 'payroll' | 'leave' | 'kpis' | 'balanceAdjustments' | 'badDebts'>('overview');
    const [isGeneratePayslipModalOpen, setIsGeneratePayslipModalOpen] = useState(false);
    const [isAssignKpiModalOpen, setIsAssignKpiModalOpen] = useState(false);
    const [kpiPeriod, setKpiPeriod] = useState(new Date().toISOString().slice(0, 7));
    
    const isAdminOrOwner = loggedInUser?.role === UserRole.ADMIN || loggedInUser?.role === UserRole.OWNER;

    const fetchData = useCallback(async () => {
        if (!employeeId) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const [
                empData, empLeads, empTasks, empSales, empPayslips, empLeaves, empKpiSheets, allClients, allBusinesses, empBalanceAdjustments, allServices, empBadDebts
            ] = await Promise.all([
                apiGetEmployeeById(employeeId),
                apiGetLeadsForEmployee(employeeId),
                apiGetTasksForEmployee(employeeId),
                apiGetSalesForEmployee(employeeId),
                apiGetPayslipsForEmployee(employeeId),
                apiGetLeaveRequestsForEmployee(employeeId),
                apiGetEmployeeKpiSheets(employeeId),
                apiGetClients(),
                apiGetBusinesses(),
                apiGetBalanceAdjustmentsForEmployee(employeeId),
                apiGetServices(),
                apiGetBadDebtsForResponsiblePerson(employeeId)
            ]);
            
            setEmployee(empData);
            setPayslips(empPayslips);
            setLeaveRequests(empLeaves);
            setKpiSheets(empKpiSheets);
            setClients(allClients);
            setBusinesses(allBusinesses);
            setBalanceAdjustments(empBalanceAdjustments);
            setServices(allServices);
            setBadDebts(empBadDebts);
            setLeads(empLeads);
            setTasks(empTasks);
            setSales(empSales);

        } catch (error) {
            console.error("Failed to fetch employee 360 data:", error);
            addNotification("Failed to load employee details.", "error");
        }
        setIsLoading(false);
    }, [employeeId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const selectedKpiSheet = useMemo(() => {
        return kpiSheets.find(sheet => sheet.period === kpiPeriod) || null;
    }, [kpiSheets, kpiPeriod]);


    const unifiedActivities = useMemo((): UnifiedActivity[] => {
        if (!employee) return [];
        
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const leadActivities: UnifiedActivity[] = leads
            .filter(l => new Date(l.createdAt) >= sixtyDaysAgo)
            .map(l => ({
                id: `lead-${l.id}`, type: 'Lead', timestamp: new Date(l.createdAt),
                description: <><strong>{l.createdByUserId === employee.id ? 'Created' : 'Assigned'}</strong> lead: <em>{l.name}</em></>,
                link: `/leads/${l.id}`, icon: <LeadIcon />,
            }));
        
        const taskActivities: UnifiedActivity[] = tasks
            .filter(t => new Date(t.createdAt) >= sixtyDaysAgo)
            .map(t => ({
                id: `task-${t.id}`, type: 'Task', timestamp: new Date(t.createdAt),
                description: <><strong>{t.createdByUserId === employee.id ? 'Created' : 'Assigned'}</strong> task: <em>{t.title}</em></>,
                link: `/tasks/${t.id}`, icon: <TaskIcon />,
            }));

        const saleActivities: UnifiedActivity[] = sales
            .filter(s => new Date(s.createdAt) >= sixtyDaysAgo)
            .map(s => ({
                id: `sale-${s.id}`, type: 'Sale', timestamp: new Date(s.createdAt),
                description: <><strong>Recorded</strong> a new sale of <em>{s.grandTotalMMK.toLocaleString()} MMK</em></>,
                link: `/sales/${s.id}`, icon: <SaleIcon />,
            }));
        
        const leaveActivities: UnifiedActivity[] = leaveRequests
             .filter(l => new Date(l.requestedAt) >= sixtyDaysAgo)
             .map(l => ({
                id: `leave-${l.id}`, type: 'Leave', timestamp: new Date(l.requestedAt),
                description: <><strong>Requested</strong> <em>{l.leaveType}</em></>,
                link: `/hr/leave-admin`, icon: <LeaveIcon />,
            }));

        return [...leadActivities, ...taskActivities, ...saleActivities, ...leaveActivities]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            
    }, [employee, leads, tasks, sales, leaveRequests]);
    
    const handleGenerateSinglePayslip = async (month: string) => {
        if (!employee) return;
        try {
            const newPayslip = await apiGenerateSinglePayslip(employee, month);
            addNotification(`Payslip ${newPayslip.id} for ${month} generated successfully.`, "success");
            fetchData(); // This will refresh all data including payslips
        } catch (error) {
            addNotification(`Failed to generate payslip: ${(error as Error).message}`, "error");
        }
    };
    
    const handleDeleteEmployee = async () => {
        if (!employee || !loggedInUser) return;
        const confirmed = await showConfirmation({
          title: 'Delete Employee',
          message: `Are you sure you want to PERMANENTLY DELETE employee "${employee.name}"? This will remove their record from the ERP but their login will remain active until manually deleted from the authentication system. This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteEmployee(employee.id, loggedInUser.id);
                addNotification("Employee record deleted successfully.", "success");
                if (employee.hasLoginAccess) {
                    addNotification(`IMPORTANT: Manually delete '${employee.email}' from Firebase Authentication to fully revoke access.`, "warning", "Manual Action Required", 15000);
                }
                navigate('/hr/staff');
            } catch (error) {
                addNotification(`Failed to delete employee: ${(error as Error).message}`, "error");
            }
        }
    };

    const handleEnforcePasswordReset = async () => {
        if (!employee) return;
        const confirmed = await showConfirmation({
          title: 'Require Password Change',
          message: `Are you sure you want to require ${employee.name} to change their password on next login?`,
          confirmText: 'Require Change',
          cancelText: 'Cancel',
          confirmVariant: 'primary',
        });
        if (confirmed) {
            try {
                await apiUpdateEmployee({ id: employee.id, requiresPasswordChange: true });
                addNotification("Password reset has been enforced.", "success");
                setEmployee(prev => prev ? { ...prev, requiresPasswordChange: true } : null);
            } catch (error) {
                addNotification(`Failed to enforce password reset: ${(error as Error).message}`, "error");
            }
        }
    };
    
    const handleAssignKpiSuccess = () => {
        fetchData();
        setIsAssignKpiModalOpen(false);
    };

    const formatDate = (dateString?: string) => dateString ? formatDateTimeForDisplay(dateString) : 'N/A';
    
    if (isLoading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    if (!employee) return <div className="p-8 text-center text-xl text-red-600">Employee not found. <Link to="/hr/staff" className="text-primary-action hover:underline">Go back to list</Link></div>;

    // --- RENDER ---
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg flex flex-col sm:flex-row items-center gap-6 border border-slate-200 dark:border-slate-700">
                <img src={employee.facePhotoUrl || `https://ui-avatars.com/api/?name=${employee.name}&background=random`} alt={employee.name} className="w-28 h-28 rounded-full object-cover border-4 border-slate-200 dark:border-slate-600 shadow-md"/>
                <div className="flex-grow text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">{employee.name}</h1>
                    <p className="text-md text-primary-action font-medium">{employee.jobTitle}</p>
                    <p className="text-sm text-text-secondary dark:text-slate-400">{employee.department}</p>
                    <span className={`mt-2 px-3 py-1 text-xs font-semibold rounded-full inline-block ${STATUS_COLORS[employee.employeeStatus === EmployeeStatus.ACTIVE ? 'Active' : employee.employeeStatus] || 'bg-gray-200 text-gray-700'}`}>{employee.employeeStatus}</span>
                </div>
                <div className="flex flex-col sm:items-end gap-2 self-center sm:self-start no-print">
                    {hasPermission(Permission.EDIT_STAFF) && <Button onClick={() => alert("Navigate to edit page - TBD")} variant="primary" size="sm">Edit Profile</Button>}
                    {hasPermission(Permission.GENERATE_PAYROLL) && <Button onClick={() => setIsGeneratePayslipModalOpen(true)} variant="info" size="sm">Generate Payslip</Button>}
                    {hasPermission(Permission.EDIT_STAFF) && employee.hasLoginAccess && <Button onClick={handleEnforcePasswordReset} variant="warning" size="sm">Force Password Change</Button>}
                    {hasPermission(Permission.DELETE_STAFF) && employee.id !== loggedInUser?.id && <Button onClick={handleDeleteEmployee} variant="danger" size="sm">Delete Employee</Button>}
                    <Link to="/hr/staff" className="text-sm text-primary-action hover:underline">&larr; Back to Staff List</Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Open Tasks" value={tasks.filter(t => t.status !== TaskStatus.COMPLETED).length} />
                <KPICard title="Leads Won" value={leads.filter(l => l.status === LeadStatus.CLOSED_WON).length} />
                <KPICard title="Total Sales" value={`${sales.reduce((sum, s) => sum + s.grandTotalMMK, 0).toLocaleString()} MMK`} />
                <KPICard title="Leave Days Taken" value={leaveRequests.filter(l => l.status === 'Approved').length} />
            </div>

            {/* Tabs */}
            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {['overview', 'kpis', 'activity', 'tasks', 'leads', 'sales', 'balanceAdjustments', 'badDebts', 'payroll', 'leave'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary hover:text-gray-700'}`}>{tab === 'badDebts' ? 'Bad Debts' : tab}</button>
                        ))}
                    </nav>
                </div>
                <div className="mt-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <Section title="Employment Details">
                                <DetailItem label="Employee ID" value={employee.employeeId} />
                                <DetailItem label="Department" value={employee.department} />
                                <DetailItem label="Job Title" value={employee.jobTitle} />
                                <DetailItem label="Role" value={employee.role} />
                                {employee.role === UserRole.TEAM_LEADER && (
                                    <DetailItem label="Leading Teams" value={employee.teams?.join(', ')} className="md:col-span-2" />
                                )}
                                <DetailItem label="Joining Date" value={formatDate(employee.joiningDate)} />
                                <DetailItem label="Status">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[employee.employeeStatus === EmployeeStatus.ACTIVE ? 'Active' : employee.employeeStatus] || 'bg-gray-200'}`}>
                                        {employee.employeeStatus}
                                    </span>
                                </DetailItem>
                                <DetailItem label="Login Access">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${employee.hasLoginAccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {employee.hasLoginAccess ? 'Enabled' : 'Disabled'}
                                    </span>
                                </DetailItem>
                                {employee.hasLoginAccess && (
                                     <DetailItem label="Password Change" value={employee.requiresPasswordChange ? 'Required on Next Login' : 'Not Required'} />
                                )}
                            </Section>
                            
                            <Section title="Personal Information">
                                <DetailItem label="Full Name" value={employee.name} />
                                <DetailItem label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                                <DetailItem label="Gender" value={employee.gender} />
                                <DetailItem label="Marital Status" value={employee.maritalStatus} />
                                <DetailItem label="Nationality" value={employee.nationality} />
                                <DetailItem label="NRC Number" value={employee.nrcNumber} />
                            </Section>
                            
                            <Section title="Contact Information">
                                <DetailItem label="Login Email" value={employee.email} />
                                <DetailItem label="Personal Phone" value={employee.personalPhone} />
                                <DetailItem label="Address" value={employee.address} className="md:col-span-2" />
                            </Section>

                            <Section title="Financial Information">
                                <DetailItem label="Payment Type" value={employee.paymentType} />
                                <DetailItem label="Basic Pay" value={`${employee.basicPay.toLocaleString()} MMK`} />
                                <DetailItem label="Transportation Allowance" value={`${(employee.transportationAllowance || 0).toLocaleString()} MMK`} />
                                <DetailItem label="Bank Name" value={employee.bankName} />
                                <DetailItem label="Bank Account Number" value={employee.bankAccountNumber} />
                            </Section>
                            
                            <Section title="Leave Entitlement">
                                <DetailItem label="Annual Leave Days" value={`${employee.annualLeaveEntitlement || 0} days`} />
                                <DetailItem label="Casual Leave Days" value={`${employee.casualLeaveEntitlement || 0} days`} />
                            </Section>

                            <Section title="Emergency Contact">
                                <DetailItem label="Contact Name" value={employee.emergencyContactName} />
                                <DetailItem label="Contact Phone" value={employee.emergencyContactPhone} />
                            </Section>
                            
                            <section className="mb-8">
                                <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">Documents</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">NRC Front</h4>
                                        {employee.nrcFrontPhotoUrl ? (
                                            <a href={employee.nrcFrontPhotoUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={employee.nrcFrontPhotoUrl} alt="NRC Front" className="h-48 w-auto object-contain rounded-lg border p-1" />
                                            </a>
                                        ) : <p className="text-sm text-slate-400">Not uploaded.</p>}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">NRC Back</h4>
                                        {employee.nrcBackPhotoUrl ? (
                                            <a href={employee.nrcBackPhotoUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={employee.nrcBackPhotoUrl} alt="NRC Back" className="h-48 w-auto object-contain rounded-lg border p-1" />
                                            </a>
                                        ) : <p className="text-sm text-slate-400">Not uploaded.</p>}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                    {activeTab === 'kpis' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <Input type="month" label="Select Period" value={kpiPeriod} onChange={e => setKpiPeriod(e.target.value)} containerClassName="mb-0" />
                                {hasPermission(Permission.ASSIGN_KPIS) && (
                                    <Button size="sm" onClick={() => setIsAssignKpiModalOpen(true)}>
                                        {selectedKpiSheet ? 'Edit Assigned KPIs' : 'Create KPI Sheet'}
                                    </Button>
                                )}
                            </div>
                            {selectedKpiSheet ? (
                                <div className="space-y-3">
                                    <p className="text-right font-semibold">Final Score: {selectedKpiSheet.finalScore?.toFixed(2) || 'Not Rated'}/100</p>
                                    {selectedKpiSheet.assignedKpis.map(kpi => (
                                        <div key={kpi.kpiId} className="p-3 border rounded-md">
                                            <p className="font-semibold">{kpi.name} <span className="text-sm font-normal text-text-secondary">({kpi.weight}%)</span></p>
                                            <p className="text-xs">Target: {kpi.target} {kpi.measurementUnit}</p>
                                            <p className="text-xs">Progress: {kpi.currentValue || 'N/A'}</p>
                                            <p className="text-xs">Rating: {kpi.managerRating ? `${kpi.managerRating}/5` : 'N/A'}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-text-secondary py-8">No KPI sheet found for {kpiPeriod}.</p>
                            )}
                        </div>
                    )}
                    {activeTab === 'activity' && (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                           {unifiedActivities.map(activity => (
                               <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                   <div className="text-primary-action mt-1">{activity.icon}</div>
                                   <div className="flex-grow">
                                       <p className="text-sm text-text-primary dark:text-slate-200">{activity.description}</p>
                                       <p className="text-xs text-text-secondary dark:text-slate-400">{formatDateTimeForDisplay(activity.timestamp.toISOString())}</p>
                                   </div>
                                   <Link to={activity.link} className="text-xs text-primary-action hover:underline">View</Link>
                               </div>
                           ))}
                           {unifiedActivities.length === 0 && <p className="text-center text-text-secondary">No activities recorded in the last 60 days.</p>}
                        </div>
                    )}
                    {activeTab === 'tasks' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Due Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Priority</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {tasks.length > 0 ? (
                                        tasks.map(task => (
                                            <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                    <Link to={`/tasks/${task.id}`} className="text-primary-action hover:underline">
                                                        {task.title}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[task.status] || 'bg-gray-200 text-gray-700'}`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {formatDate(task.dueDate)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {task.priority || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                    <Link to={`/tasks/${task.id}`}>
                                                        <Button variant="ghost" size="sm">View</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                                                No tasks found for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'leads' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Source</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Created</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {leads.length > 0 ? (
                                        leads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                    <Link to={`/leads/${lead.id}`} className="text-primary-action hover:underline">
                                                        {lead.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[lead.status] || 'bg-gray-200 text-gray-700'}`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {lead.source || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {formatDate(lead.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                    <Link to={`/leads/${lead.id}`}>
                                                        <Button variant="ghost" size="sm">View</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                                                No leads found for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'sales' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Sale ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Client/Business</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Amount (MMK)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {sales.length > 0 ? (
                                        sales.map(sale => (
                                            <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                    <Link to={`/sales/${sale.id}`} className="text-primary-action hover:underline">
                                                        {sale.saleId}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {sale.clientId 
                                                        ? (clients.find(c => c.id === sale.clientId)?.name || sale.clientId)
                                                        : sale.businessId 
                                                        ? (businesses.find(b => b.id === sale.businessId)?.name || sale.businessId)
                                                        : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {sale.type}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right">
                                                    {sale.grandTotalMMK.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[sale.status] || 'bg-gray-200 text-gray-700'}`}>
                                                        {sale.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {formatDate(sale.saleDate)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                    <Link to={`/sales/${sale.id}`}>
                                                        <Button variant="ghost" size="sm">View</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                                                No sales records found for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'balanceAdjustments' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Adjustment ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Client/Business</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Service</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Amount (MMK)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {balanceAdjustments.length > 0 ? (
                                        balanceAdjustments.map(adjustment => {
                                            const serviceName = adjustment.serviceId
                                                ? (services.find(s => s.id === adjustment.serviceId)?.name || adjustment.serviceId)
                                                : 'N/A';
                                            const amount = adjustment.type === BalanceAdjustmentType.DECREASE
                                                ? -adjustment.amountMMK
                                                : adjustment.amountMMK;
                                            const amountClass = adjustment.type === BalanceAdjustmentType.DECREASE
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-green-600 dark:text-green-400';
                                            return (
                                                <tr key={adjustment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                        {formatDate(adjustment.adjustmentDate)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                        <Link to={`/finance/balance-adjustments/${adjustment.id}`} className="text-primary-action hover:underline">
                                                            {adjustment.id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                        {adjustment.clientId 
                                                            ? (clients.find(c => c.id === adjustment.clientId)?.name || adjustment.clientId)
                                                            : adjustment.businessId 
                                                            ? (businesses.find(b => b.id === adjustment.businessId)?.name || adjustment.businessId)
                                                            : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                            adjustment.type === BalanceAdjustmentType.DECREASE
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        }`}>
                                                            {adjustment.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                        {serviceName}
                                                    </td>
                                                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${amountClass}`}>
                                                        {amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                        {adjustment.reason || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                                                No balance adjustments found for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'badDebts' && (
                        <div className="overflow-x-auto">
                            <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">Bad debts where this employee is set as responsible person.</p>
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Bad Debt ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Client / Business</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Written Off</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Recovered</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Write-off Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {badDebts.length > 0 ? (
                                        badDebts.map(bd => {
                                            const client = clients.find(c => c.id === bd.clientId);
                                            const business = businesses.find(b => b.id === bd.businessId);
                                            const entityName = client?.name || business?.name || '—';
                                            return (
                                                <tr key={bd.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                        <Link to="/finance/bad-debts" className="text-primary-action hover:underline">
                                                            {bd.id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                        {entityName}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-red-600 dark:text-red-400">
                                                        {bd.writtenOffAmount.toLocaleString()} MMK
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600 dark:text-green-400">
                                                        {bd.recoveredAmount.toLocaleString()} MMK
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bd.status === BadDebtStatus.RECOVERED ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : bd.status === BadDebtStatus.PARTIALLY_RECOVERED ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                            {bd.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                        {formatDate(bd.writeOffDate)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                        <Link to="/finance/bad-debts">
                                                            <Button variant="ghost" size="sm">View in Bad Debts</Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                                                No bad debts assigned to this employee as responsible person.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'payroll' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Payslip ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Period</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Gross Pay</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Deductions</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Net Pay</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {payslips.length > 0 ? (
                                        payslips.map(payslip => (
                                            <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                    {payslip.id}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {payslip.period}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right">
                                                    {payslip.grossPay.toLocaleString()} MMK
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">
                                                    {payslip.totalDeductions.toLocaleString()} MMK
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-text-primary dark:text-slate-200 text-right">
                                                    {payslip.netPay.toLocaleString()} MMK
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payslip.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {payslip.isPaid ? 'Paid' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(`/hr/payroll?payslipId=${payslip.id}`, '_blank')}>
                                                        View
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                                                No payslips found for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'leave' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Leave Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Start Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">End Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Days</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Reason</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Requested</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {leaveRequests.length > 0 ? (
                                        leaveRequests.map(leave => (
                                            <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                                    {leave.leaveType}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {formatDate(leave.startDate)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {formatDate(leave.endDate)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {leave.numberOfDays}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                                    {leave.reason || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[leave.status] || 'bg-gray-200 text-gray-700'}`}>
                                                        {leave.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                                    {formatDate(leave.requestedAt)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                                                No leave requests found for this employee.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
             <GenerateSinglePayslipModal 
                isOpen={isGeneratePayslipModalOpen}
                onClose={() => setIsGeneratePayslipModalOpen(false)}
                onSubmit={handleGenerateSinglePayslip}
                employeeName={employee.name}
            />
            {employeeId && (
                <AssignKpiModal
                    isOpen={isAssignKpiModalOpen}
                    onClose={() => setIsAssignKpiModalOpen(false)}
                    onSuccess={handleAssignKpiSuccess}
                    employeeId={employeeId}
                    period={kpiPeriod}
                    existingSheet={selectedKpiSheet}
                />
            )}
        </div>
    );
};

export default EmployeeDetailPage;