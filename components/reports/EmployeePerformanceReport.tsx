
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiGetUsers, apiGetLeads, apiGetSalesRecords, apiGetTasks, apiGetEmployeeKpiSheet } from '../../services/api';
import { User, Lead, SaleRecord, Task, LeadStatus, TaskStatus, EmployeeKpiSheet } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { downloadCSV } from '../../utils/downloadUtils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface PerformanceData {
  employee: User | null;
  // Leads
  leadsAssigned: number;
  leadsWon: number;
  leadsLost: number;
  conversionRate: number;
  // Sales
  salesCount: number;
  salesTotalValue: number;
  // Tasks
  tasksCompleted: number;
  tasksCompletedOnTime: number;
  overdueTasksCompleted: number;
  tasksInProgress: number;
}

const EmployeePerformanceReport: React.FC = () => {
  const { user: loggedInUser } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format

  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [kpiSheet, setKpiSheet] = useState<EmployeeKpiSheet | null>(null); // New state for KPI data
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [leadsInPeriod, setLeadsInPeriod] = useState<Lead[]>([]);
  const [salesInPeriod, setSalesInPeriod] = useState<SaleRecord[]>([]);
  const [tasksInPeriod, setTasksInPeriod] = useState<Task[]>([]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await apiGetUsers();
      setEmployees(fetchedUsers.filter(u => u.role !== 'Owner'));
      if (loggedInUser?.role !== 'Admin' && loggedInUser?.role !== 'Owner') {
        setSelectedEmployeeId(loggedInUser?.id || '');
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
    setIsLoading(false);
  }, [loggedInUser]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const fetchPerformanceData = useCallback(async (employeeId: string, monthStr: string) => {
    if (!employeeId) {
      setPerformanceData(null);
      setKpiSheet(null);
      return;
    }
    setIsLoadingReport(true);
    setPerformanceData(null);
    setKpiSheet(null);
    
    const year = parseInt(monthStr.split('-')[0]);
    const month = parseInt(monthStr.split('-')[1]);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    try {
      const selectedEmp = employees.find(e => e.id === employeeId) || null;
      const [allLeads, allSales, allTasks, kpiData] = await Promise.all([
        apiGetLeads(),
        apiGetSalesRecords(),
        apiGetTasks(),
        apiGetEmployeeKpiSheet(`${employeeId}_${monthStr}`), // Fetch KPI sheet
      ]);
      setKpiSheet(kpiData);
      setLeadsInPeriod(empLeadsInPeriod);
      setSalesInPeriod(empSalesInPeriod);
      setTasksInPeriod(empTasks);

      // Filter leads created in the period and assigned to the user
      const empLeadsInPeriod = allLeads.filter(l => 
          l.assignedTo === employeeId && 
          new Date(l.createdAt) >= startDate && new Date(l.createdAt) <= endDate
      );
      
      // Filter sales created in the period by the user
      const empSalesInPeriod = allSales.filter(s => 
          s.inChargeUserId === employeeId && 
          new Date(s.createdAt) >= startDate && new Date(s.createdAt) <= endDate
      );

      // Filter tasks assigned to the user
      const empTasks = allTasks.filter(t => t.assigneeIds?.includes(employeeId));

      // Calculate KPIs
      const leadsWon = empLeadsInPeriod.filter(l => l.status === LeadStatus.CLOSED_WON).length;
      const leadsLost = empLeadsInPeriod.filter(l => l.status === LeadStatus.CLOSED_LOST).length;
      const conversionRate = (leadsWon + leadsLost > 0) ? (leadsWon / (leadsWon + leadsLost)) * 100 : 0;

      const tasksCompletedInPeriod = empTasks.filter(t => 
          t.status === TaskStatus.COMPLETED &&
          new Date(t.updatedAt) >= startDate && new Date(t.updatedAt) <= endDate
      );

      const overdueTasksCompleted = tasksCompletedInPeriod.filter(t => 
          t.dueDate && new Date(t.updatedAt) > new Date(t.dueDate + 'T23:59:59')
      ).length;

      const tasksCompletedOnTime = tasksCompletedInPeriod.length - overdueTasksCompleted;
      const tasksInProgress = empTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;

      setPerformanceData({
        employee: selectedEmp,
        leadsAssigned: empLeadsInPeriod.length,
        leadsWon: leadsWon,
        leadsLost: leadsLost,
        conversionRate: conversionRate,
        salesCount: empSalesInPeriod.length,
        salesTotalValue: empSalesInPeriod.reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0),
        tasksCompleted: tasksCompletedInPeriod.length,
        tasksCompletedOnTime: tasksCompletedOnTime,
        overdueTasksCompleted: overdueTasksCompleted,
        tasksInProgress: tasksInProgress,
      });
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
      setPerformanceData(null);
      setKpiSheet(null);
    }
    setIsLoadingReport(false);
  }, [employees]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPerformanceData(selectedEmployeeId, selectedMonth);
    } else {
      setPerformanceData(null);
      setKpiSheet(null);
    }
  }, [selectedEmployeeId, selectedMonth, fetchPerformanceData]);

  const handleDownload = () => {
    if (!performanceData || !performanceData.employee) return;
    const dataToExport = [
      { Metric: 'Employee Name', Value: performanceData.employee.name },
      { Metric: 'Role', Value: performanceData.employee.role },
      { Metric: 'Period', Value: selectedMonth },
      { Metric: '--- Leads & Sales ---', Value: '' },
      { Metric: 'Leads Assigned', Value: performanceData.leadsAssigned },
      { Metric: 'Leads Won', Value: performanceData.leadsWon },
      { Metric: 'Leads Lost', Value: performanceData.leadsLost },
      { Metric: 'Conversion Rate (%)', Value: performanceData.conversionRate.toFixed(2) },
      { Metric: 'Sales Made', Value: performanceData.salesCount },
      { Metric: 'Total Sales Value (MMK)', Value: performanceData.salesTotalValue },
      { Metric: '--- Task Management ---', Value: '' },
      { Metric: 'Tasks Completed in Period', Value: performanceData.tasksCompleted },
      { Metric: 'Tasks Completed On Time', Value: performanceData.tasksCompletedOnTime },
      { Metric: 'Overdue Tasks Completed', Value: performanceData.overdueTasksCompleted },
      { Metric: 'Tasks Currently In Progress', Value: performanceData.tasksInProgress },
      { Metric: '--- Monthly KPI Summary ---', Value: '' },
      { Metric: 'Final KPI Score', Value: kpiSheet?.finalScore?.toFixed(2) ?? 'N/A' },
      { Metric: 'KPI Sheet Status', Value: kpiSheet?.status ?? 'N/A' },
      { Metric: 'Acknowledged by Employee', Value: kpiSheet?.employeeAcknowledgedAt ? 'Yes' : 'No' },
    ];
    downloadCSV(dataToExport, `performance_report_${performanceData.employee.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
  };
  
  const employeeOptions = employees.map(emp => ({ value: emp.id, label: `${emp.name} (${emp.role})` }));

  const weeklyTrendData = useMemo(() => {
    if (!selectedMonth) return [];
    const start = new Date(`${selectedMonth}-01T00:00:00`);
    if (Number.isNaN(start.getTime())) return [];
    const buckets = Array.from({ length: 5 }, (_, index) => ({
      label: `Week ${index + 1}`,
      leads: 0,
      sales: 0,
      tasks: 0,
    }));
    const weekIndex = (date: Date) => {
      const day = date.getDate();
      return Math.min(buckets.length - 1, Math.floor((day - 1) / 7));
    };
    leadsInPeriod.forEach(lead => {
      const idx = weekIndex(new Date(lead.createdAt));
      buckets[idx].leads += 1;
    });
    salesInPeriod.forEach(sale => {
      const idx = weekIndex(new Date(sale.createdAt));
      buckets[idx].sales += 1;
    });
    tasksInPeriod.forEach(task => {
      const idx = weekIndex(new Date(task.createdAt));
      buckets[idx].tasks += 1;
    });
    return buckets;
  }, [leadsInPeriod, salesInPeriod, tasksInPeriod, selectedMonth]);

  const leadStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    leadsInPeriod.forEach(lead => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leadsInPeriod]);

  const taskOutcomeData = useMemo(() => {
    if (!performanceData) return [];
    return [
      { name: 'On Time', value: performanceData.tasksCompletedOnTime },
      { name: 'Overdue Completions', value: performanceData.overdueTasksCompleted },
      { name: 'In Progress', value: performanceData.tasksInProgress },
    ].filter(entry => entry.value > 0);
  }, [performanceData]);

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <ReportSection title="Employee Performance Report" description="Review key performance indicators for individual team members for a specific month.">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Select Employee"
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
            options={[{ value: '', label: 'Select an Employee' }, ...employeeOptions]}
            containerClassName="mb-0"
            disabled={loggedInUser?.role !== 'Admin' && loggedInUser?.role !== 'Owner'}
          />
          <Input 
            label="Month" 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            containerClassName="mb-0"
          />
        </div>
         <div className="flex justify-end mt-4">
          <Button onClick={handleDownload} variant="secondary" size="sm" disabled={!performanceData || isLoadingReport}>
            Download CSV
          </Button>
        </div>
      </div>
      
      {isLoadingReport && <div className="flex justify-center items-center py-10"><Spinner /></div>}

      {!isLoadingReport && performanceData && performanceData.employee && (
        <div className="space-y-8">
          <section>
            <h5 className="text-lg font-semibold text-text-primary mb-3">Leads & Sales Performance</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatDisplayCard title="Leads Assigned (in period)" value={performanceData.leadsAssigned} />
              <StatDisplayCard title="Leads Won (in period)" value={performanceData.leadsWon} colorClass="bg-status-success text-white" />
              <StatDisplayCard title="Conversion Rate" value={`${performanceData.conversionRate.toFixed(1)}%`} />
              <StatDisplayCard title="Sales Value (in period)" value={`${performanceData.salesTotalValue.toLocaleString()} MMK`} isCurrency />
            </div>
          </section>

          <section>
            <h5 className="text-lg font-semibold text-text-primary mb-3">Task Management Performance</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatDisplayCard title="Tasks Completed (in period)" value={performanceData.tasksCompleted} />
              <StatDisplayCard title="Completed On Time" value={performanceData.tasksCompletedOnTime} colorClass="bg-status-success text-white"/>
              <StatDisplayCard title="Overdue Tasks Completed" value={performanceData.overdueTasksCompleted} colorClass={performanceData.overdueTasksCompleted > 0 ? "bg-status-danger text-white" : "bg-gray-500 text-white"}/>
              <StatDisplayCard title="Currently In Progress" value={performanceData.tasksInProgress} colorClass="bg-status-info text-white"/>
            </div>
          </section>

          <section>
             <h5 className="text-lg font-semibold text-text-primary mb-3">Monthly KPI Summary</h5>
             {kpiSheet ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatDisplayCard title="Final KPI Score" value={kpiSheet.finalScore?.toFixed(2) ?? 'Not Rated'} colorClass="bg-indigo-500 text-white" />
                  <StatDisplayCard title="KPI Sheet Status" value={kpiSheet.status} />
                  <StatDisplayCard title="Acknowledged by Employee" value={kpiSheet.employeeAcknowledgedAt ? 'Yes' : 'No'} colorClass={kpiSheet.employeeAcknowledgedAt ? 'bg-status-success text-white' : 'bg-status-warning text-white'} />
                </div>
             ) : (
                <p className="text-center text-text-secondary py-4">No KPI sheet found for this employee for the selected month.</p>
             )}
          </section>

          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h5 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Weekly Activity Trend</h5>
                {weeklyTrendData.some(bucket => bucket.leads || bucket.sales || bucket.tasks) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Leads" />
                      <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} name="Sales" />
                      <Line type="monotone" dataKey="tasks" stroke="#F59E0B" strokeWidth={2} name="Tasks Recorded" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-text-secondary dark:text-slate-400 py-8">No activity captured for the selected month.</p>
                )}
              </div>
              <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h5 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Lead Status Distribution</h5>
                {leadStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={leadStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                        {leadStatusData.map((entry, index) => (
                          <Cell key={`lead-perf-${entry.name}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} leads`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-text-secondary dark:text-slate-400 py-8">No leads captured for this period.</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h5 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Task Outcomes (Selected Month)</h5>
              {taskOutcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={taskOutcomeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {taskOutcomeData.map((entry, index) => (
                        <Cell key={`task-outcome-${entry.name}`} fill={pieColors[(index + 1) % pieColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-text-secondary">No task updates recorded.</p>
              )}
            </div>
          </section>
        </div>
      )}
      {!isLoadingReport && !selectedEmployeeId && (
        <p className="text-center text-text-secondary py-8">Please select an employee to view their performance report.</p>
      )}
    </ReportSection>
  );
};

export default EmployeePerformanceReport;
