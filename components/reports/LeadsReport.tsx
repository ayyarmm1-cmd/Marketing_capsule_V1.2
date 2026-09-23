import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiGetLeads } from '../../services/api';
import { Lead, Permission, LeadStatus } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, AreaChart, Area } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { apiGetUsers } from '../../services/api';
import { STATUS_COLORS } from '../../constants';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { downloadCSV } from '../../utils/downloadUtils';

const LeadsReport: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { effectiveTheme } = useTheme();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { start: initialStart, end: initialEnd } = { 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
    end: new Date() 
  };
  const [startDate, setStartDate] = useState(initialStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEnd.toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [fetchedLeads, fetchedUsers] = await Promise.all([
        apiGetLeads(),
        apiGetUsers()
      ]);
      if (hasPermission(Permission.VIEW_ALL_LEADS)) {
        setLeads(fetchedLeads);
      } else {
        setLeads(fetchedLeads.filter(lead => lead.assignedTo === user.id));
      }
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch leads data:", error);
    }
    setIsLoading(false);
  }, [user, hasPermission]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredLeads = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && leadDate <= end;
    });
  }, [leads, startDate, endDate]);
  
  const totalLeads = filteredLeads.length;
  const leadsByStatus = Object.values(LeadStatus).map(status => ({
    name: status,
    count: filteredLeads.filter(l => l.status === status).length,
  })).filter(s => s.count > 0);

  const wonLeads = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON).length;
  const lostLeads = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_LOST).length;
  const openLeads = totalLeads - wonLeads - lostLeads;
  const conversionRate = totalLeads > 0 && (totalLeads - lostLeads > 0) ? ((wonLeads / (totalLeads - lostLeads)) * 100).toFixed(1) : "0.0";

  // Conversion funnel data
  const conversionFunnel = useMemo(() => {
    const newLeads = filteredLeads.filter(l => l.status === LeadStatus.NEW).length;
    const contacted = filteredLeads.filter(l => l.status === LeadStatus.CONTACTED).length;
    const qualified = filteredLeads.filter(l => l.status === LeadStatus.QUALIFIED).length;
    const proposalSent = filteredLeads.filter(l => l.status === LeadStatus.PROPOSAL_SENT).length;
    return [
      { stage: 'New', count: newLeads, percentage: totalLeads > 0 ? ((newLeads / totalLeads) * 100).toFixed(1) : '0' },
      { stage: 'Contacted', count: contacted, percentage: totalLeads > 0 ? ((contacted / totalLeads) * 100).toFixed(1) : '0' },
      { stage: 'Qualified', count: qualified, percentage: totalLeads > 0 ? ((qualified / totalLeads) * 100).toFixed(1) : '0' },
      { stage: 'Proposal Sent', count: proposalSent, percentage: totalLeads > 0 ? ((proposalSent / totalLeads) * 100).toFixed(1) : '0' },
      { stage: 'Won', count: wonLeads, percentage: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0' },
    ];
  }, [filteredLeads, totalLeads, wonLeads]);

  // Monthly leads trend
  const monthlyLeads = useMemo(() => {
    const monthly: Record<string, { month: string; total: number; won: number; lost: number }> = {};
    filteredLeads.forEach(lead => {
      const date = new Date(lead.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { month: monthKey, total: 0, won: 0, lost: 0 };
      }
      monthly[monthKey].total += 1;
      if (lead.status === LeadStatus.CLOSED_WON) monthly[monthKey].won += 1;
      if (lead.status === LeadStatus.CLOSED_LOST) monthly[monthKey].lost += 1;
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredLeads]);

  // Top performers (by assigned leads)
  const topPerformers = useMemo(() => {
    const performerStats: Record<string, { userId: string; total: number; won: number; lost: number }> = {};
    filteredLeads.forEach(lead => {
      const userId = lead.assignedTo || 'Unassigned';
      if (!performerStats[userId]) {
        performerStats[userId] = { userId, total: 0, won: 0, lost: 0 };
      }
      performerStats[userId].total += 1;
      if (lead.status === LeadStatus.CLOSED_WON) performerStats[userId].won += 1;
      if (lead.status === LeadStatus.CLOSED_LOST) performerStats[userId].lost += 1;
    });
    return Object.values(performerStats)
      .map(p => ({
        ...p,
        name: users.find(u => u.id === p.userId)?.name || 'Unassigned',
        conversionRate: p.total > 0 ? ((p.won / (p.won + p.lost || 1)) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.won - a.won)
      .slice(0, 10);
  }, [filteredLeads, users]);

  const handleDownload = () => {
    const summaryData = [
      { Metric: "Total Leads", Value: totalLeads },
      { Metric: "Open Leads", Value: openLeads },
      { Metric: "Closed (Won)", Value: wonLeads },
      { Metric: "Closed (Lost)", Value: lostLeads },
      { Metric: "Conversion Rate (%)", Value: conversionRate },
    ];
    const statusData = leadsByStatus.map(s => ({ Status: s.name, Count: s.count }));
    
    // For a more detailed download, one might want to export all leads data too
    // const allLeadsData = leads.map(l => ({ ID: l.id, Name: l.name, Status: l.status, /* ... other fields */ }));
    
    downloadCSV(summaryData, "leads_report_summary.csv");
    downloadCSV(statusData, "leads_by_status.csv");
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
    <ReportSection title="Leads Report" description="Analysis of lead pipeline and performance.">
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
        <StatDisplayCard title="Total Leads" value={totalLeads} />
        <StatDisplayCard title="Open Leads" value={openLeads} />
        <StatDisplayCard title="Closed (Won)" value={wonLeads} />
        <StatDisplayCard title="Conversion Rate (%)" value={`${conversionRate}%`} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Leads by Status</h4>
        {leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsByStatus} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <YAxis allowDecimals={false} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
                <Bar dataKey="count" name="Number of Leads">
                 {leadsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                  ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        ) : (
            <p className="text-text-secondary dark:text-slate-400 text-center py-4">No lead data available.</p>
          )}
        </div>

        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Conversion Funnel</h4>
          {conversionFunnel.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                <XAxis type="number" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <YAxis dataKey="stage" type="category" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.percentage}%)`, 'Count']}
                  contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-secondary dark:text-slate-400 text-center py-4">No lead data available.</p>
          )}
        </div>
      </div>

      {/* Monthly Trend */}
      {monthlyLeads.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Monthly Leads Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyLeads}>
              <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
              <XAxis dataKey="month" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
              <YAxis stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
              <Tooltip 
                contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1e293b' : '#fff', border: `1px solid ${effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}
              />
              <Legend />
              <Area type="monotone" dataKey="total" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Total Leads" />
              <Area type="monotone" dataKey="won" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Won" />
              <Area type="monotone" dataKey="lost" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Lost" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performers Table */}
      {topPerformers.length > 0 && (
        <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Top 10 Performers</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Total Leads</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Won</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Lost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {topPerformers.map((performer, index) => (
                  <tr key={performer.userId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">#{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{performer.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-text-primary dark:text-slate-200">{performer.total}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">{performer.won}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">{performer.lost}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-text-primary dark:text-slate-200">{performer.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Leads Table */}
      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Recent Leads (Last 20)</h4>
        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Assigned To</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredLeads
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 20)
                  .map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                        {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{lead.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          lead.status === LeadStatus.CLOSED_WON ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          lead.status === LeadStatus.CLOSED_LOST ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                        {users.find(u => u.id === lead.assignedTo)?.name || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-4">No leads data available.</p>
        )}
      </div>
    </ReportSection>
  );
};

export default LeadsReport;