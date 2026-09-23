import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BalanceAdjustment, BalanceAdjustmentType, Business, Client, Permission, Service, User } from '../../types';
import {
  apiGetBalanceAdjustments,
  apiGetBalanceAdjustmentsForPeriod,
  apiGetClients,
  apiGetBusinesses,
  apiGetUsers,
  apiGetServices,
  apiDeleteBalanceAdjustment,
} from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useAuth } from '../../hooks/useAuth';
import RecordBalanceAdjustmentModal from './modals/RecordBalanceAdjustmentModal';
import { formatDateForDisplay, getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';

const BalanceAdjustmentsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const canManage = hasPermission(Permission.MANAGE_ACCOUNTS_PAYABLE);

  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAdjustmentIds, setSelectedAdjustmentIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | BalanceAdjustmentType>('all');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 90);
    return getDateInYangonTimezone(start);
  });
  const [endDate, setEndDate] = useState(() => getTodayInYangon());
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usePeriodFilter = startDate && endDate;
      const [fAdjustments, fClients, fBusinesses, fUsers, fServices] = await Promise.all([
        usePeriodFilter ? apiGetBalanceAdjustmentsForPeriod(startDate, endDate) : apiGetBalanceAdjustments(),
        apiGetClients(),
        apiGetBusinesses(),
        apiGetUsers(),
        apiGetServices(),
      ]);
      setAdjustments(fAdjustments);
      setClients(fClients);
      setBusinesses(fBusinesses);
      setUsers(fUsers);
      setServices(fServices);
      setSelectedAdjustmentIds(new Set());
    } catch (error) {
      console.error('Error loading balance adjustments:', error);
      addNotification('Failed to load balance adjustments.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(adj => {
      if (typeFilter !== 'all' && adj.type !== typeFilter) return false;
      const adjDate = new Date(adj.adjustmentDate);
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        const dateMatch = (!start || adjDate >= start) && (!end || adjDate <= end);
        if (!dateMatch) return false;
      }
      const term = searchTerm.toLowerCase();
      const clientName = clients.find(c => c.id === adj.clientId)?.name || '';
      const businessName = businesses.find(b => b.id === adj.businessId)?.name || '';
      const serviceName = services.find(s => s.id === adj.serviceId)?.name || '';
      const employeeName = users.find(u => u.id === adj.employeeId)?.name || '';
      return !term ||
        adj.id.toLowerCase().includes(term) ||
        clientName.toLowerCase().includes(term) ||
        businessName.toLowerCase().includes(term) ||
        serviceName.toLowerCase().includes(term) ||
        employeeName.toLowerCase().includes(term) ||
        (adj.reason || '').toLowerCase().includes(term);
    });
  }, [adjustments, typeFilter, startDate, endDate, searchTerm, clients, businesses, services, users]);

  const formatDate = (dateString: string) => formatDateForDisplay(dateString);
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown';
  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || clientId;
  const getBusinessName = (businessId: string) => businesses.find(b => b.id === businessId)?.name || businessId;
  const getServiceName = (serviceId?: string) =>
    services.find(s => s.id === serviceId)?.name || (serviceId || '-');
  const getEmployeeName = (employeeId?: string) =>
    users.find(u => u.id === employeeId)?.name || (employeeId || '-');

  const totalPages = Math.max(1, Math.ceil(filteredAdjustments.length / ITEMS_PER_PAGE));
  const paginatedAdjustments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdjustments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdjustments, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, searchTerm, startDate, endDate]);

  const kpis = useMemo(() => {
    const netImpact = filteredAdjustments.reduce((sum, adj) => {
      const sign = adj.type === BalanceAdjustmentType.INCREASE ? 1 : -1;
      return sum + (sign * adj.amountMMK);
    }, 0);
    const increaseTotal = filteredAdjustments
      .filter(adj => adj.type === BalanceAdjustmentType.INCREASE)
      .reduce((sum, adj) => sum + adj.amountMMK, 0);
    const decreaseTotal = filteredAdjustments
      .filter(adj => adj.type === BalanceAdjustmentType.DECREASE)
      .reduce((sum, adj) => sum + adj.amountMMK, 0);
    return { netImpact, count: filteredAdjustments.length, increaseTotal, decreaseTotal };
  }, [filteredAdjustments]);

  const handleDeleteSelected = async () => {
    if (!canManage) {
      addNotification('You do not have permission to delete balance adjustments.', 'error');
      return;
    }
    if (selectedAdjustmentIds.size === 0) return;
    const selected = adjustments.filter(adj => selectedAdjustmentIds.has(adj.id));
    const confirmed = await showConfirmation({
      title: 'Delete Balance Adjustments',
      message: `Are you sure you want to delete ${selected.length} adjustment(s)? This will reverse their balance effect.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    try {
      await Promise.all(selected.map(adj => apiDeleteBalanceAdjustment(adj.id)));
      addNotification('Balance adjustments deleted.', 'success');
      fetchData();
    } catch (error) {
      addNotification(`Failed to delete adjustments: ${(error as Error).message}`, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Balance Adjustments</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400">Adjust client/business balances (increase or decrease).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchData} isLoading={isLoading}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)} disabled={!user}>
            + New Adjustment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Adjustments</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{kpis.count}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Net Impact</p>
          <p className={`text-2xl font-bold ${kpis.netImpact >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
            {kpis.netImpact.toLocaleString()} MMK
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Increase / Decrease</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">
            +{kpis.increaseTotal.toLocaleString()} / −{kpis.decreaseTotal.toLocaleString()} MMK
          </p>
        </div>
      </div>

      <div className="p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Search"
            placeholder="ID, client, business, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="mb-0"
          />
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            containerClassName="mb-0"
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            containerClassName="mb-0"
          />
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | BalanceAdjustmentType)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: BalanceAdjustmentType.DECREASE, label: 'Decrease' },
              { value: BalanceAdjustmentType.INCREASE, label: 'Increase' },
            ]}
            containerClassName="mb-0"
          />
        </div>
      </div>

      {/* Pagination bar */}
      {filteredAdjustments.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAdjustments.length)} of {filteredAdjustments.length} adjustments
          </div>
          {filteredAdjustments.length > ITEMS_PER_PAGE && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
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
                    p === 'ellipsis' ? <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span> : (
                      <Button key={p} variant={currentPage === p ? 'primary' : 'secondary'} size="sm" className="min-w-[2rem]" onClick={() => setCurrentPage(p)}>{p}</Button>
                    )
                  );
                })()}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
            </nav>
          )}
        </div>
      )}

      <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            {selectedAdjustmentIds.size > 0 && (
              <span>{selectedAdjustmentIds.size} adjustment(s) selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDeleteSelected} disabled={!canManage || selectedAdjustmentIds.size === 0}>
              Delete Selected ({selectedAdjustmentIds.size})
            </Button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No balance adjustments found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={paginatedAdjustments.length > 0 && paginatedAdjustments.every(adj => selectedAdjustmentIds.has(adj.id))}
                    ref={(input) => {
                      if (input) input.indeterminate = paginatedAdjustments.some(adj => selectedAdjustmentIds.has(adj.id)) && !paginatedAdjustments.every(adj => selectedAdjustmentIds.has(adj.id));
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAdjustmentIds(prev => {
                          const next = new Set(prev);
                          paginatedAdjustments.forEach(adj => next.add(adj.id));
                          return next;
                        });
                      } else {
                        setSelectedAdjustmentIds(prev => {
                          const next = new Set(prev);
                          paginatedAdjustments.forEach(adj => next.delete(adj.id));
                          return next;
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business / Client</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {paginatedAdjustments.map(adj => (
                <tr key={adj.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAdjustmentIds.has(adj.id)}
                      onChange={(e) => {
                        const next = new Set(selectedAdjustmentIds);
                        if (e.target.checked) {
                          next.add(adj.id);
                        } else {
                          next.delete(adj.id);
                        }
                        setSelectedAdjustmentIds(next);
                      }}
                      className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{formatDate(adj.adjustmentDate)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary dark:text-slate-200">
                    <Link to={`/finance/balance-adjustments/${adj.id}`} className="text-primary-action hover:underline">
                      {adj.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${adj.type === BalanceAdjustmentType.INCREASE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {adj.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200">
                    <div className="font-medium">
                      <Link to={`/businesses/${adj.businessId}`} className="text-primary-action hover:underline">
                        {getBusinessName(adj.businessId)}
                      </Link>
                    </div>
                    <div className="text-xs text-text-secondary dark:text-slate-400">
                      <Link to={`/clients/${adj.clientId}`} className="text-primary-action hover:underline">
                        {getClientName(adj.clientId)}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-text-primary dark:text-slate-200">
                    {adj.amountMMK.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{getServiceName(adj.serviceId)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{getEmployeeName(adj.employeeId)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{adj.reason || '-'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{getUserName(adj.recordedByUserId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <RecordBalanceAdjustmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }}
          clients={clients}
          businesses={businesses}
          users={users}
          services={services}
        />
      )}
    </div>
  );
};

export default BalanceAdjustmentsPage;

