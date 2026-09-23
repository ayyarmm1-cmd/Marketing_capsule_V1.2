import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiGetLeads, apiGetTasks, apiGetSalesRecords } from '../../services/api';
import { Lead, Task, SaleRecord, LeadStatus, TaskStatus } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import Button from '../ui/Button';
import { downloadCSV } from '../../utils/downloadUtils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const MyActivityReport: React.FC = () => {
  const { user } = useAuth();
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [mySales, setMySales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [leads, tasks, sales] = await Promise.all([
        apiGetLeads(),
        apiGetTasks(),
        apiGetSalesRecords(),
      ]);

      const userLeads = leads.filter(l => l.assignedTo === user.id);
      const userTasks = tasks.filter(t => t.assigneeIds?.includes(user.id));
      const userSales = sales.filter(s => s.inChargeUserId === user.id);

      setMyLeads(userLeads);
      setMyTasks(userTasks);
      setMySales(userSales);

    } catch (error) {
      console.error("Failed to fetch activity data:", error);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const myLeadsCount = useMemo(() => myLeads.length, [myLeads]);
  const myOpenLeadsCount = useMemo(
    () => myLeads.filter(l => l.status !== LeadStatus.CLOSED_WON && l.status !== LeadStatus.CLOSED_LOST).length,
    [myLeads]
  );
  const myTasksCount = useMemo(() => myTasks.length, [myTasks]);
  const myOpenTasksCount = useMemo(
    () => myTasks.filter(t => t.status !== TaskStatus.COMPLETED).length,
    [myTasks]
  );
  const mySalesCount = useMemo(() => mySales.length, [mySales]);
  const mySalesTotalAmount = useMemo(
    () => mySales.reduce((sum, sale) => sum + (sale.grandTotalMMK || 0), 0),
    [mySales]
  );

  const handleDownload = () => {
    if (!user) return;
    const dataToExport = [
      { Metric: "Leads Assigned to Me", Value: myLeadsCount },
      { Metric: "Open Leads (Mine)", Value: myOpenLeadsCount },
      { Metric: "Tasks Assigned to Me", Value: myTasksCount },
      { Metric: "Open Tasks (Mine)", Value: myOpenTasksCount },
      { Metric: "Sales Records (In Charge)", Value: mySalesCount },
      { Metric: "Total Sales Amount (Mine)", Value: `${mySalesTotalAmount.toLocaleString()} MMK` },
    ];
    downloadCSV(dataToExport, `my_activity_report_${user.name.replace(/\s+/g, '_')}.csv`);
  };

  const activityTrendData = useMemo(() => {
    const months: { label: string; leads: number; tasks: number; sales: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: key, leads: 0, tasks: 0, sales: 0 });
    }
    const monthMap = new Map(months.map(m => [m.label, m]));

    const increment = <T extends { createdAt: string }>(items: T[], key: 'leads' | 'tasks' | 'sales') => {
      items.forEach(item => {
        const date = new Date(item.createdAt);
        const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthMap.get(label);
        if (bucket) bucket[key] += 1;
      });
    };

    increment(myLeads, 'leads');
    increment(myTasks, 'tasks');
    increment(mySales, 'sales');

    return months;
  }, [myLeads, myTasks, mySales]);

  const leadStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    myLeads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [myLeads]);

  const taskStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    myTasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [myTasks]);

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <ReportSection title="My Activity Summary" description={`An overview of your key contributions and ongoing work, ${user?.name}.`}>
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} variant="secondary" size="sm">Download CSV</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatDisplayCard title="Leads Assigned to Me" value={myLeadsCount} />
        <StatDisplayCard title="Open Leads (Mine)" value={myOpenLeadsCount} />
        <StatDisplayCard title="Tasks Assigned to Me" value={myTasksCount} />
        <StatDisplayCard title="Open Tasks (Mine)" value={myOpenTasksCount} />
        <StatDisplayCard title="Sales Records (In Charge)" value={mySalesCount} />
        <StatDisplayCard title="Total Sales Amount (Mine)" value={`${mySalesTotalAmount.toLocaleString()} MMK`} isCurrency />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">My Monthly Activity Trend</h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={activityTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-slate-600" />
              <XAxis dataKey="label" stroke="#6B7280" className="dark:stroke-slate-400" />
              <YAxis allowDecimals={false} stroke="#6B7280" className="dark:stroke-slate-400" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #E5E7EB' }} className="dark:bg-slate-700 dark:border-slate-600" />
              <Legend wrapperStyle={{ color: '#374151' }} className="dark:text-slate-300" />
              <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Leads" />
              <Line type="monotone" dataKey="tasks" stroke="#F59E0B" strokeWidth={2} name="Tasks" />
              <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} name="Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg space-y-6 border border-slate-200 dark:border-slate-700">
          <div>
            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Lead Status Mix</h4>
            {leadStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={leadStatusData} dataKey="value" nameKey="name" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`} outerRadius={70}>
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`lead-cell-${entry.name}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} leads`} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #E5E7EB' }} className="dark:bg-slate-700 dark:border-slate-600" />
                  <Legend wrapperStyle={{ color: '#374151' }} className="dark:text-slate-300" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-text-secondary dark:text-slate-400">No lead data available.</p>
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Task Status Mix</h4>
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskStatusData} dataKey="value" nameKey="name" labelLine={false} outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`task-cell-${entry.name}`} fill={pieColors[(index + 2) % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} tasks`} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #E5E7EB' }} className="dark:bg-slate-700 dark:border-slate-600" />
                  <Legend wrapperStyle={{ color: '#374151' }} className="dark:text-slate-300" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-text-secondary dark:text-slate-400">No task data available.</p>
            )}
          </div>
        </div>
      </div>
    </ReportSection>
  );
};

export default MyActivityReport;