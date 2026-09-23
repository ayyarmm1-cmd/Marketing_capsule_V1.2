import React, { useEffect, useMemo, useState } from 'react';
import { ActivityLogEntry, Permission, UserRole } from '../../types';
import { apiGetActivityLogs } from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { getDateInYangonTimezone, formatTimestampInYangon } from '../../utils/dateUtils';

const MAX_HISTORY_DAYS = 60;
const DEFAULT_RANGE_DAYS = 7;
const ITEMS_PER_PAGE = 50;

const KNOWN_MODULES = [
  'Sales', 'Clients', 'Businesses', 'Invoices', 'Payments', 'Quotations', 'Finance', 'HR', 'Leads', 'Services',
  'Tasks', 'Projects', 'Settings', 'Cash & Treasury', 'Fixed Assets', 'CreditNotes', 'Refunds', 'BalanceAdjustments',
  'KPI Management', 'POS Categories', 'POS Products', 'POS Customers', 'Notes', 'Facebook Ads', 'Migration',
  'Users', 'Notifications', 'Surveys',
];

const formatDateInput = (date: Date) => getDateInYangonTimezone(date);

const clampToHistoryWindow = (date: Date) => {
  const now = new Date();
  const earliest = new Date();
  earliest.setDate(earliest.getDate() - MAX_HISTORY_DAYS);
  if (date < earliest) return earliest;
  if (date > now) return now;
  return date;
};

const normalizeEndOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
};

const ActivityLogPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: formatDateInput(clampToHistoryWindow(new Date(Date.now() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000))),
    endDate: formatDateInput(new Date()),
    module: 'all',
    action: 'all',
    actorId: 'all',
    search: '',
  });

  const minDate = formatDateInput(clampToHistoryWindow(new Date(Date.now() - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000)));
  const maxDate = formatDateInput(new Date());

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const start = clampToHistoryWindow(new Date(filters.startDate));
      const end = clampToHistoryWindow(new Date(filters.endDate));
      const normalizedEnd = normalizeEndOfDay(end);

      if (start > normalizedEnd) {
        addNotification('Start date cannot be after end date.', 'warning');
        setIsLoading(false);
        return;
      }

      const response = await apiGetActivityLogs({
        startDate: start,
        endDate: normalizedEnd,
      });
      setLogs(response);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      addNotification('Unable to load activity logs. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, filters.startDate, filters.endDate]);

  const refreshData = () => setRefreshKey(prev => prev + 1);

  const handleDateChange = (key: 'startDate' | 'endDate', value: string) => {
    const parsedDate = clampToHistoryWindow(new Date(value));
    const isoValue = formatDateInput(parsedDate);
    setFilters(prev => ({
      ...prev,
      [key]: isoValue,
    }));
  };

  const setQuickRange = (days: number) => {
    const end = clampToHistoryWindow(new Date());
    const start = clampToHistoryWindow(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
    setFilters(prev => ({
      ...prev,
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    }));
    setRefreshKey(prev => prev + 1);
  };

  const moduleOptions = useMemo(() => {
    const fromLogs = new Set(logs.map(log => log.module).filter(Boolean));
    const merged = new Set([...KNOWN_MODULES, ...fromLogs]);
    return Array.from(merged).sort();
  }, [logs]);

  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action).filter(Boolean));
    return Array.from(actions).sort();
  }, [logs]);

  const actorOptions = useMemo(() => {
    const actors = new Map<string, string>();
    logs.forEach(log => {
      if (log.actorId && log.actorName) {
        actors.set(log.actorId, log.actorName);
      }
    });
    return Array.from(actors.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesModule = filters.module === 'all' || log.module === filters.module;
      const matchesAction = filters.action === 'all' || log.action === filters.action;
      const matchesActor = filters.actorId === 'all' || log.actorId === filters.actorId;
      const searchTerm = filters.search.trim().toLowerCase();
      const matchesSearch = !searchTerm
        || [log.actorName, log.action, log.module, log.description, log.targetId]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(searchTerm));
      return matchesModule && matchesAction && matchesActor && matchesSearch;
    });
  }, [logs, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const visibleLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.module, filters.action, filters.actorId, filters.search, filters.startDate, filters.endDate]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Pending';
    return formatTimestampInYangon(timestamp);
  };

  if (!user) return null;

  const isAdminOrOwner = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;
  
  if (!isAdminOrOwner && !hasPermission(Permission.VIEW_ACTIVITY_LOG)) {
    return (
      <div className="bg-container-bg dark:bg-slate-800 p-8 rounded-xl text-center text-text-secondary dark:text-slate-400">
        You do not have permission to view the activity log.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Activity Log</h1>
        <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
          Monitor in-app activity for the past 60 days with granular filters and live search.
          Times are shown in Yangon (Asia/Yangon) — always internet time, not device time.
        </p>
      </div>

      <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={filters.startDate}
              min={minDate}
              max={filters.endDate}
              onChange={e => handleDateChange('startDate', e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 px-3 py-2 text-sm text-text-primary dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={filters.endDate}
              min={filters.startDate}
              max={maxDate}
              onChange={e => handleDateChange('endDate', e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 px-3 py-2 text-sm text-text-primary dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Module</label>
            <select
              value={filters.module}
              onChange={e => setFilters(prev => ({ ...prev, module: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 px-3 py-2 text-sm text-text-primary dark:text-slate-200"
            >
              <option value="all">All Modules</option>
              {moduleOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={e => setFilters(prev => ({ ...prev, action: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 px-3 py-2 text-sm text-text-primary dark:text-slate-200"
            >
              <option value="all">All Actions</option>
              {actionOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">User</label>
            <select
              value={filters.actorId}
              onChange={e => setFilters(prev => ({ ...prev, actorId: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 px-3 py-2 text-sm text-text-primary dark:text-slate-200"
            >
              <option value="all">All Users</option>
              {actorOptions.map(actor => (
                <option key={actor.id} value={actor.id}>{actor.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search actor, action, module..."
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-container-bg dark:bg-slate-800 px-3 py-2 text-sm text-text-primary dark:text-slate-200"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-slate-400">
            Quick Ranges:
            <Button variant="secondary" size="sm" onClick={() => setQuickRange(7)}>7 days</Button>
            <Button variant="secondary" size="sm" onClick={() => setQuickRange(30)}>30 days</Button>
            <Button variant="secondary" size="sm" onClick={() => setQuickRange(60)}>60 days</Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <p className="text-sm text-text-secondary dark:text-slate-400">
              {filteredLogs.length > 0
                ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of ${filteredLogs.length} entries`
                : 'No entries'}
            </p>
            <Button onClick={refreshData} isLoading={isLoading} size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-container-bg dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary dark:text-slate-400">No activity found for the selected filters.</p>
          </div>
        ) : (
          <>
            {filteredLogs.length > ITEMS_PER_PAGE && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                <span className="text-sm text-text-secondary dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <nav className="flex items-center gap-1" aria-label="Pagination">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const pages: (number | 'ellipsis')[] = [];
                      const showPages = 5;
                      if (totalPages <= 9) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                        const end = Math.min(totalPages, start + showPages - 1);
                        if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);
                        if (start > 1) pages.push(1, 'ellipsis');
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (end < totalPages) pages.push('ellipsis', totalPages);
                      }
                      return pages.map((p, idx) =>
                        p === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? 'primary' : 'secondary'}
                            size="sm"
                            className="min-w-[2rem]"
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      );
                    })()}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </nav>
              </div>
            )}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10 shadow-sm text-left text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-text-primary dark:text-slate-200">
                {visibleLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-text-secondary dark:text-slate-400">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <div className="flex flex-col">
                        <span className="font-semibold">{log.actorName}</span>
                        <span className="text-xs text-text-secondary dark:text-slate-400">{log.actorId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{log.actorRole}</td>
                    <td className="px-4 py-3">{log.module}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="line-clamp-2 text-sm text-text-secondary dark:text-slate-300" title={log.description}>
                        {log.description || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary dark:text-slate-400">{log.targetId || '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary dark:text-slate-400">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;

