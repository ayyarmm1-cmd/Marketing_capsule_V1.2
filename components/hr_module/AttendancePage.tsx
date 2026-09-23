import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AttendanceReport, EmployeeAttendanceStats, Employee } from '../../types';
import { apiGetAttendanceReportForMonth, apiGetEmployees } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImportAttendanceModal from './ImportAttendanceModal';
import AttendanceRulesSettingsPage from './AttendanceRulesSettingsPage';

const KPICard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-primary-action">{value}</p>
    </div>
);

const AttendancePage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'report' | 'settings'>('report');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [report, setReport] = useState<AttendanceReport | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [searchTerm, setSearchTerm] = useState('');

    const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
    
    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const monthId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            const [fetchedReport, fetchedEmployees] = await Promise.all([
                apiGetAttendanceReportForMonth(monthId),
                apiGetEmployees()
            ]);
            setReport(fetchedReport);
            setEmployees(fetchedEmployees);
        } catch (error) {
            console.error("Failed to fetch attendance report:", error);
            addNotification("Could not load attendance report for the selected month.", "warning");
            setReport(null); // Clear previous report on error
        }
        setIsLoading(false);
    }, [selectedYear, selectedMonth, addNotification]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleImportSuccess = () => {
        setIsImportModalOpen(false);
        addNotification("Attendance data imported successfully. Refreshing report...", "success");
        fetchReport();
    };

    const filteredEmployeeData = useMemo(() => {
        if (!report?.employeeData) return [];
        const data = Object.values(report.employeeData);
        if (!searchTerm) return data;

        const term = searchTerm.toLowerCase();
        return data.filter(emp => 
            emp.name.toLowerCase().includes(term) ||
            emp.employeeCode.toLowerCase().includes(term) ||
            emp.department.toLowerCase().includes(term)
        );
    }, [report, searchTerm]);
    
    const kpiData = useMemo(() => {
        if (!report?.employeeData) return { totalHours: 0, totalOvertime: 0, totalLateMinutes: 0, totalAbsenceDays: 0 };
        const data = Object.values(report.employeeData);
        return {
            totalHours: data.reduce((sum, emp) => sum + emp.realHours, 0),
            totalOvertime: data.reduce((sum, emp) => sum + emp.overtimeHours, 0),
            totalLateMinutes: data.reduce((sum, emp) => sum + emp.lateMinutes, 0),
            totalAbsenceDays: data.reduce((sum, emp) => sum + emp.absenceDays, 0),
        }
    }, [report]);

    const AttendanceReportContent = () => (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold text-text-primary">Attendance Report</h1>
                <Button onClick={() => setIsImportModalOpen(true)} variant="primary">Upload Attendance File</Button>
            </div>

            <div className="p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <Select label="Year" options={yearOptions} value={selectedYear.toString()} onChange={(e) => setSelectedYear(Number(e.target.value))} containerClassName="mb-0" />
                    <Select label="Month" options={monthOptions} value={selectedMonth.toString()} onChange={(e) => setSelectedMonth(Number(e.target.value))} containerClassName="mb-0" />
                    <Input label="Search by Name, ID, Department" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} containerClassName="mb-0 md:col-span-2" />
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total Work Hours" value={kpiData.totalHours.toFixed(2)} />
                <KPICard title="Total Overtime Hours" value={kpiData.totalOvertime.toFixed(2)} />
                <KPICard title="Total Late Minutes" value={kpiData.totalLateMinutes} />
                <KPICard title="Total Absence Days" value={kpiData.totalAbsenceDays} />
            </div>

            {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
                report && filteredEmployeeData.length > 0 ? (
                    <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium">ID</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium">Name</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium">Department</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Normal Hours</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Real Hours</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Late (Min)</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Early Leave (Min)</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Absence Days</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Overtime (Hr)</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium">Leave Days</th>
                                </tr>
                            </thead>
                            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {filteredEmployeeData.map(emp => (
                                    <tr key={emp.employeeCode}>
                                        <td className="px-3 py-2 text-sm">{emp.employeeCode}</td>
                                        <td className="px-3 py-2 text-sm font-medium">{emp.name}</td>
                                        <td className="px-3 py-2 text-sm">{emp.department}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.normalHours.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.realHours.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.lateMinutes}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.earlyLeaveMinutes}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.absenceDays}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.overtimeHours.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-sm text-right">{emp.leaveDays}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-center text-text-secondary py-10">{searchTerm ? "No employees match your search." : "No attendance data found for the selected month. Please upload the report."}</p>
            )}

            {isImportModalOpen && (
                <ImportAttendanceModal 
                    isOpen={isImportModalOpen} 
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={handleImportSuccess}
                    allEmployees={employees}
                />
            )}
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
            {/* Secondary Sidebar */}
            <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
                <div className="flex justify-between items-center mb-6">
                    {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Attendance</h2>}
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
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                            ${activeTab === 'report' 
                                ? 'bg-primary-action text-white shadow-md' 
                                : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                            }`}
                        title={isSidebarCollapsed ? 'Attendance Report' : ''}
                    >
                        {isSidebarCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        ) : (
                            'Attendance Report'
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                            ${activeTab === 'settings' 
                                ? 'bg-primary-action text-white shadow-md' 
                                : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                            }`}
                        title={isSidebarCollapsed ? 'Settings' : ''}
                    >
                        {isSidebarCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        ) : (
                            'Settings'
                        )}
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 ${isSidebarCollapsed ? 'lg:ml-0' : ''}`}>
                {activeTab === 'report' ? <AttendanceReportContent /> : <AttendanceRulesSettingsPage />}
            </main>
        </div>
    );
};

export default AttendancePage;
