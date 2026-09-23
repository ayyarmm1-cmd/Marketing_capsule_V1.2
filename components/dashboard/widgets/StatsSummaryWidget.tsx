
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiGetLeads, apiGetTasks } from '../../../services/api';
import { Lead, Task, Permission, LeadStatus, TaskStatus } from '../../../types';
import Spinner from '../../ui/Spinner';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  linkTo?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, linkTo }) => {
  const content = (
    <div className={`p-4 rounded-lg shadow-md flex items-center space-x-3 ${color} text-white transition-all hover:scale-105`}>
      <div className="p-2 bg-white bg-opacity-20 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
};

// Icons
const LeadsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const TasksIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;


const StatsSummaryWidget: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [leadsData, setLeadsData] = useState<{ total: number; new: number } | null>(null);
  const [tasksData, setTasksData] = useState<{ open: number; inProgress: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    let leadsSummary = null;
    if (hasPermission(Permission.VIEW_LEADS)) {
      try {
        const fetchedLeads = await apiGetLeads();
        let relevantLeads = fetchedLeads;
        if (!hasPermission(Permission.VIEW_ALL_LEADS)) {
          relevantLeads = fetchedLeads.filter(lead => lead.assignedTo === user.id);
        }
        leadsSummary = {
          total: relevantLeads.length,
          new: relevantLeads.filter(l => l.status === LeadStatus.NEW).length,
        };
      } catch (error) { console.error("Error fetching leads summary:", error); }
    }
    setLeadsData(leadsSummary);

    let tasksSummary = null;
    if (hasPermission(Permission.VIEW_TASKS)) {
      try {
        const fetchedTasks = await apiGetTasks();
        let relevantTasks = fetchedTasks;
        if (!hasPermission(Permission.VIEW_ALL_TASKS)) {
          relevantTasks = fetchedTasks.filter(task => task.assigneeIds?.includes(user.id));
        }
        tasksSummary = {
          open: relevantTasks.filter(t => t.status === TaskStatus.TO_DO).length,
          inProgress: relevantTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        };
      } catch (error) { console.error("Error fetching tasks summary:", error); }
    }
    setTasksData(tasksSummary);
    
    setIsLoading(false);
  }, [user, hasPermission]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <div className="bg-container-bg p-6 rounded-xl shadow-lg h-48 flex justify-center items-center"><Spinner /></div>;
  }

  return (
    <div className="bg-container-bg p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-text-primary mb-4">Key Statistics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {leadsData && (
          <>
            <StatCard title="Total Leads" value={leadsData.total} icon={<LeadsIcon />} color="bg-blue-500" linkTo="/leads" />
            <StatCard title="New Leads" value={leadsData.new} icon={<LeadsIcon />} color="bg-sky-500" linkTo="/leads" />
          </>
        )}
        {tasksData && (
          <>
            <StatCard title="Open Tasks" value={tasksData.open} icon={<TasksIcon />} color="bg-amber-500" linkTo="/tasks" />
            <StatCard title="Tasks In Progress" value={tasksData.inProgress} icon={<TasksIcon />} color="bg-indigo-500" linkTo="/tasks" />
          </>
        )}
        {hasPermission(Permission.VIEW_SALES_RECORDS) && (
          <StatCard title="Monthly Sales (MMK)" value="Coming Soon" icon={<SalesIcon />} color="bg-green-500" />
        )}
         {!leadsData && !tasksData && !hasPermission(Permission.VIEW_SALES_RECORDS) && (
             <p className="text-text-secondary col-span-full text-center py-4">No statistics to display based on your permissions.</p>
         )}
      </div>
    </div>
  );
};

export default StatsSummaryWidget;
