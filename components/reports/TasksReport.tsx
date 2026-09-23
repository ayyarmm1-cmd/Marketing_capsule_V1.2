
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiGetTasks } from '../../services/api';
import { Task, Permission, TaskStatus, TaskPriority } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { apiGetUsers } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { downloadCSV } from '../../utils/downloadUtils';

// Direct HEX color mapping for Recharts
const STATUS_HEX_COLORS: Record<TaskStatus, string> = {
    [TaskStatus.TO_DO]: '#9CA3AF', // Corresponds to Tailwind gray-400
    [TaskStatus.IN_PROGRESS]: '#3B82F6', // Corresponds to Tailwind blue-500
    [TaskStatus.COMPLETED]: '#10B981', // Corresponds to Tailwind green-500
};

const PRIORITY_HEX_COLORS: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: '#60A5FA', // Corresponds to Tailwind blue-400
    [TaskPriority.MEDIUM]: '#F59E0B', // Corresponds to Tailwind amber-500
    [TaskPriority.HIGH]: '#EF4444', // Corresponds to Tailwind red-500
};

const TasksReport: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { effectiveTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { start: initialStart, end: initialEnd } = { 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
    end: new Date() 
  };
  const [startDate, setStartDate] = useState(initialStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEnd.toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedTasks, fetchedUsers] = await Promise.all([
        apiGetTasks(),
        apiGetUsers()
      ]);
      if (hasPermission(Permission.VIEW_ALL_TASKS)) {
        setTasks(fetchedTasks);
      } else {
        setTasks(fetchedTasks.filter(task => 
          task.assigneeIds?.includes(user.id) || task.createdByUserId === user.id
        ));
      }
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch tasks data for report:", error);
    }
    setIsLoading(false);
  }, [user, hasPermission]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredTasks = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= start && taskDate <= end;
    });
  }, [tasks, startDate, endDate]);
  
  const totalTasks = filteredTasks.length;
  const openTasksCount = filteredTasks.filter(t => t.status === TaskStatus.TO_DO).length;
  const inProgressTasksCount = filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
  const completedTasksCount = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const overdueTasksCount = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED).length;

  const tasksByStatusData = Object.values(TaskStatus).map(status => ({
    name: status,
    value: filteredTasks.filter(t => t.status === status).length,
  })).filter(s => s.value > 0);

  const tasksByPriorityData = Object.values(TaskPriority).map(priority => ({
    name: priority,
    value: filteredTasks.filter(t => t.priority === priority).length,
  })).filter(p => p.value > 0);

  const statusChartColors = tasksByStatusData.map(entry => STATUS_HEX_COLORS[entry.name as TaskStatus] || '#8884d8');
  const priorityChartColors = tasksByPriorityData.map(entry => PRIORITY_HEX_COLORS[entry.name as TaskPriority] || '#8884d8');

  // Monthly completion trend
  const monthlyTasks = useMemo(() => {
    const monthly: Record<string, { month: string; created: number; completed: number }> = {};
    filteredTasks.forEach(task => {
      const date = new Date(task.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { month: monthKey, created: 0, completed: 0 };
      }
      monthly[monthKey].created += 1;
      if (task.status === TaskStatus.COMPLETED) {
        const completedDate = new Date(task.updatedAt);
        const completedMonth = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[completedMonth]) {
          monthly[completedMonth] = { month: completedMonth, created: 0, completed: 0 };
        }
        monthly[completedMonth].completed += 1;
      }
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTasks]);

  // Tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const assigneeStats: Record<string, { userId: string; total: number; completed: number; inProgress: number }> = {};
    filteredTasks.forEach(task => {
      task.assigneeIds?.forEach(userId => {
        if (!assigneeStats[userId]) {
          assigneeStats[userId] = { userId, total: 0, completed: 0, inProgress: 0 };
        }
        assigneeStats[userId].total += 1;
        if (task.status === TaskStatus.COMPLETED) assigneeStats[userId].completed += 1;
        if (task.status === TaskStatus.IN_PROGRESS) assigneeStats[userId].inProgress += 1;
      });
    });
    return Object.values(assigneeStats)
      .map(a => ({
        ...a,
        name: users.find(u => u.id === a.userId)?.name || 'Unknown',
        completionRate: a.total > 0 ? ((a.completed / a.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredTasks, users]);

  const handleDownload = () => {
    const summaryData = [
      { Metric: "Total Tasks", Value: totalTasks },
      { Metric: "Open Tasks (To Do)", Value: openTasksCount },
      { Metric: "In Progress Tasks", Value: inProgressTasksCount },
      { Metric: "Completed Tasks", Value: completedTasksCount },
      { Metric: "Overdue Tasks", Value: overdueTasksCount },
    ];
    const statusData = tasksByStatusData.map(s => ({ Status: s.name, Count: s.value }));
    const priorityData = tasksByPriorityData.map(p => ({ Priority: p.name, Count: p.value }));
    
    downloadCSV(summaryData, "tasks_report_summary.csv");
    downloadCSV(statusData, "tasks_by_status.csv");
    downloadCSV(priorityData, "tasks_by_priority.csv");
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  const handlePresetClick = (preset: string) => {
    const end = new Date();
    let start = new Date();
    end.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'this_month':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'last_3_months':
        start = new Date();
        start.setMonth(start.getMonth() - 3);
        start.setDate(1);
        break;
      case 'last_6_months':
        start = new Date();
        start.setMonth(start.getMonth() - 6);
        start.setDate(1);
        break;
      case 'this_year':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        break;
    }
    start.setHours(0, 0, 0, 0);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <ReportSection title="Tasks Report" description="Insights into task distribution, status, and priorities.">
      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-end gap-4 mb-2">
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
          <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0 flex-grow"/>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_month')}>This Month</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_3_months')}>Last 3 Months</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('last_6_months')}>Last 6 Months</Button>
          <Button variant="ghost" size="sm" onClick={() => handlePresetClick('this_year')}>This Year</Button>
        </div>
      </div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} variant="secondary" size="sm">Download CSVs</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatDisplayCard title="Total Tasks" value={totalTasks} />
        <StatDisplayCard title="To Do" value={openTasksCount} />
        <StatDisplayCard title="Completed Tasks" value={completedTasksCount} />
        <StatDisplayCard title="Overdue Tasks" value={overdueTasksCount} colorClass={overdueTasksCount > 0 ? "bg-status-danger text-white" : "bg-status-success text-white"} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Tasks by Status</h4>
          {tasksByStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={tasksByStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {tasksByStatusData.map((_entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={statusChartColors[index % statusChartColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-text-secondary dark:text-slate-400 text-center py-4">No task data for status chart.</p>}
        </div>

        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Tasks by Priority</h4>
          {tasksByPriorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={tasksByPriorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {tasksByPriorityData.map((_entry, index) => (
                    <Cell key={`cell-priority-${index}`} fill={priorityChartColors[index % priorityChartColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-text-secondary text-center py-4">No task data for priority chart.</p>}
        </div>
      </div>

      {/* Monthly Trend */}
      {monthlyTasks.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Monthly Task Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTasks}>
              <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
              <YAxis stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
              <Tooltip 
                contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
              />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} name="Tasks Created" />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Tasks Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tasks by Assignee Table */}
      {tasksByAssignee.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Tasks by Assignee (Top 10)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Assignee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total Tasks</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Completed</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">In Progress</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {tasksByAssignee.map((assignee, index) => (
                  <tr key={assignee.userId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">#{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{assignee.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-primary dark:text-slate-200">{assignee.total}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">{assignee.completed}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-blue-600 dark:text-blue-400">{assignee.inProgress}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-text-primary dark:text-slate-200">{assignee.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Tasks Table */}
      {overdueTasksCount > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Overdue Tasks</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Days Overdue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Assignee</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredTasks
                  .filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.COMPLETED)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .map((task) => {
                    const daysOverdue = Math.floor((new Date().getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-text-primary dark:text-slate-200">{task.title}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            task.priority === TaskPriority.MEDIUM ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                          {new Date(task.dueDate!).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">{daysOverdue} days</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                          {task.assigneeIds?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || 'Unassigned'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Tasks Table */}
      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Recent Tasks (Last 20)</h4>
        {filteredTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Assignee</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredTasks
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 20)
                  .map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-text-primary dark:text-slate-200">{task.title}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.priority === TaskPriority.HIGH ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          task.priority === TaskPriority.MEDIUM ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : 'No due date'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                        {task.assigneeIds?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-4">No tasks data available.</p>
        )}
      </div>
    </ReportSection>
  );
};

export default TasksReport;
