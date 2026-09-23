import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { Lead, LeadStatus, Permission } from '../../types';
import { apiGetLeads } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Spinner from '../ui/Spinner';

const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: '#4f46e5',
  [LeadStatus.CONTACTED]: '#38bdf8',
  [LeadStatus.QUALIFIED]: '#22c55e',
  [LeadStatus.PROPOSAL_SENT]: '#f97316',
  [LeadStatus.CLOSED_WON]: '#14b8a6',
  [LeadStatus.CLOSED_LOST]: '#ef4444',
};

const LeadAnalyticsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const fetchedLeads = await apiGetLeads();
        setLeads(fetchedLeads);
      } catch (error) {
        console.error('Failed to load leads for analytics', error);
        addNotification('Unable to load lead analytics data.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [addNotification]);

  const statusData = useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      [LeadStatus.NEW]: 0,
      [LeadStatus.CONTACTED]: 0,
      [LeadStatus.QUALIFIED]: 0,
      [LeadStatus.PROPOSAL_SENT]: 0,
      [LeadStatus.CLOSED_WON]: 0,
      [LeadStatus.CLOSED_LOST]: 0,
    };
    leads.forEach((lead) => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [leads]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.leadSource || 'Unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leads]);

  const monthlyTrend = useMemo(() => {
    const buckets: Record<string, number> = {};
    leads.forEach((lead) => {
      const date = new Date(lead.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => (a.month > b.month ? 1 : -1))
      .slice(-12);
  }, [leads]);

  const winRate = useMemo(() => {
    if (leads.length === 0) return 0;
    const wins = leads.filter((lead) => lead.status === LeadStatus.CLOSED_WON).length;
    return Math.round((wins / leads.length) * 100);
  }, [leads]);

  const avgPerSource = useMemo(() => {
    if (sourceData.length === 0) return 0;
    const total = sourceData.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / sourceData.length);
  }, [sourceData]);

  if (!hasPermission(Permission.VIEW_LEAD_ANALYTICS)) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Permission Required</h2>
        <p className="text-text-secondary dark:text-slate-400 mt-2">
          You need the "View Lead Analytics" permission to access this dashboard.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Leads</p>
          <p className="text-3xl font-bold text-text-primary dark:text-slate-100">{leads.length}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Across all stages</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Win Rate</p>
          <p className="text-3xl font-bold text-status-success">{winRate}%</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Closed Won / Total</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Top Sources</p>
          <p className="text-3xl font-bold text-primary-action">{sourceData.length}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Distinct lead sources</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Avg Leads / Source</p>
          <p className="text-3xl font-bold text-text-primary dark:text-slate-100">{avgPerSource}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Top 10 sources</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">Monthly Lead Trend</h3>
            <span className="text-xs text-text-secondary dark:text-slate-500">Last 12 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">Stage Distribution</h3>
            <span className="text-xs text-text-secondary dark:text-slate-500">Real-time</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name as LeadStatus] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">Top Lead Sources</h3>
          <span className="text-xs text-text-secondary dark:text-slate-500">Top 10 sources</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={sourceData} margin={{ left: 0, right: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={70} stroke="#94a3b8" />
              <YAxis allowDecimals={false} stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LeadAnalyticsPage;
