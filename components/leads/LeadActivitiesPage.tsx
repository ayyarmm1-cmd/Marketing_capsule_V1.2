import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lead, LeadActivity, LeadActivityType, Permission, User } from '../../types';
import { apiGetLeadActivityFeed, apiGetLeads, apiGetUsers } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { formatDateTimeForDisplay } from '../../utils/dateUtils';

interface ActivityFilters {
  leadId: string;
  type: string;
  startDate: string;
  endDate: string;
}

const defaultFilters: ActivityFilters = {
  leadId: '',
  type: '',
  startDate: '',
  endDate: '',
};

const LeadActivitiesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!hasPermission(Permission.VIEW_LEAD_ACTIVITIES)) return;
    try {
      const [leadList, userList, activityFeed] = await Promise.all([
        apiGetLeads(),
        apiGetUsers(),
        apiGetLeadActivityFeed({ limit: 250 }),
      ]);
      setLeads(leadList);
      setUsers(userList);
      setActivities(activityFeed);
    } catch (error) {
      console.error('Failed to load lead activities', error);
      addNotification('Could not load lead activities feed.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addNotification, hasPermission]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (filters.leadId && activity.leadId !== filters.leadId) return false;
      if (filters.type && activity.type !== filters.type) return false;
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (new Date(activity.timestamp) < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(activity.timestamp) > end) return false;
      }
      return true;
    });
  }, [activities, filters]);

  const recentCalls = useMemo(
    () =>
      filteredActivities.filter(
        (activity) =>
          activity.type === LeadActivityType.CALL &&
          Date.now() - new Date(activity.timestamp).getTime() < 1000 * 60 * 60 * 24 * 7
      ).length,
    [filteredActivities]
  );

  const recentMeetings = useMemo(
    () =>
      filteredActivities.filter(
        (activity) =>
          activity.type === LeadActivityType.MEETING &&
          Date.now() - new Date(activity.timestamp).getTime() < 1000 * 60 * 60 * 24 * 14
      ).length,
    [filteredActivities]
  );

  const getLeadName = (leadId: string) => leads.find((lead) => lead.id === leadId)?.name || leadId;
  const getUserName = (userId: string) => users.find((user) => user.id === userId)?.name || userId;

  if (!hasPermission(Permission.VIEW_LEAD_ACTIVITIES)) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Permission Required</h2>
        <p className="text-text-secondary dark:text-slate-400 mt-2">
          You need the "View Lead Activities" permission to see this feed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-400">Engagement Monitor</p>
          <h2 className="text-2xl font-bold text-text-primary dark:text-slate-100">Lead Activities</h2>
          <p className="text-text-secondary dark:text-slate-400">Keep an eye on calls, meetings, emails, and notes across the funnel.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setFilters(defaultFilters)}>
            Clear Filters
          </Button>
          <Button variant="primary" onClick={handleRefresh} isLoading={isRefreshing}>
            Refresh Feed
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Last 7 days</p>
          <p className="text-3xl font-bold text-status-success">{recentCalls}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Qualified Calls</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Last 14 days</p>
          <p className="text-3xl font-bold text-primary-action">{recentMeetings}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Meetings Logged</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Feed Size</p>
          <p className="text-3xl font-bold text-text-primary dark:text-slate-100">{filteredActivities.length}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Records Displayed</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-sm text-text-secondary dark:text-slate-400">Unique Leads</p>
          <p className="text-3xl font-bold text-text-primary dark:text-slate-100">{new Set(filteredActivities.map((a) => a.leadId)).size}</p>
          <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-500">Touched</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <Select
          label="Lead"
          value={filters.leadId}
          onChange={(e) => setFilters((prev) => ({ ...prev, leadId: e.target.value }))}
          options={[{ value: '', label: 'All Leads' }, ...leads.map((lead) => ({ value: lead.id, label: lead.name }))]}
          containerClassName="mb-0"
        />
        <Select
          label="Activity Type"
          value={filters.type}
          onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
          options={[{ value: '', label: 'All Types' }, ...Object.values(LeadActivityType).map((type) => ({ value: type, label: type }))]}
          containerClassName="mb-0"
        />
        <Input
          type="date"
          label="Start Date"
          value={filters.startDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
          containerClassName="mb-0"
        />
        <Input
          type="date"
          label="End Date"
          value={filters.endDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
          containerClassName="mb-0"
        />
      </div>

      <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 shadow overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-secondary dark:text-slate-400">No activities match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary dark:text-slate-400">Lead</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary dark:text-slate-400">Notes</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary dark:text-slate-400">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary dark:text-slate-400">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-primary-action">{activity.type}</td>
                    <td className="px-4 py-3">
                      <Link to={`/leads/${activity.leadId}`} className="text-primary-action hover:underline">
                        {getLeadName(activity.leadId)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary dark:text-slate-200 whitespace-pre-wrap">
                      {activity.notes}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-slate-400">{getUserName(activity.userId)}</td>
                    <td className="px-4 py-3 text-text-secondary dark:text-slate-400">
                      {formatDateTimeForDisplay(activity.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadActivitiesPage;
