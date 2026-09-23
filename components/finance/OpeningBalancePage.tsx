import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  apiGetAllOpeningBalanceRecords,
  apiGetClients,
  apiGetBusinesses,
} from '../../services/api';
import { ClientBusinessBalance, Client, Business } from '../../types';
import FinancePageHeader from './shared/FinancePageHeader';
import Spinner from '../ui/Spinner';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import { formatDateForDisplay } from '../../utils/dateUtils';

const KPICard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass?: string; isCurrency?: boolean }> = ({ title, value, icon, colorClass = 'bg-primary-action', isCurrency = false }) => (
  <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-xl shadow-md flex items-center space-x-4 border border-slate-200 dark:border-slate-700">
    <div className={`p-3 rounded-full ${colorClass} text-white`}>{icon}</div>
    <div>
      <p className="text-sm text-text-secondary dark:text-slate-400 font-medium">{title}</p>
      <p className="text-xl font-bold text-text-primary dark:text-slate-100">
        {isCurrency && typeof value === 'number' ? `${value.toLocaleString()} MMK` : value}
      </p>
    </div>
  </div>
);

const TotalOpeningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.875c-.372 0-.744.052-1.123.08C2.745 4.01 2.25 4.973 2.25 6.108v11.785c0 1.275 1.05 2.308 2.333 2.308H15a2.25 2.25 0 0 0 2.25-2.25Z" /></svg>;
const PaidIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18v-.008Zm-12 0h.008v.008H6v-.008Z" /></svg>;
const OutstandingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.21 12.75 11 12 11c-.75 0-1.536.21-2.098.707L9 12.25M9 19.5V12.75" /></svg>;
const CountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>;

const OpeningBalancePage: React.FC = () => {
  const [isSidebarCollapsed] = useCollapsibleSidebar('openingBalanceSidebarCollapsed');
  const [records, setRecords] = useState<ClientBusinessBalance[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recs, cl, biz] = await Promise.all([
        apiGetAllOpeningBalanceRecords(),
        apiGetClients(),
        apiGetBusinesses(),
      ]);
      setRecords(recs);
      setClients(cl);
      setBusinesses(biz);
    } catch (e) {
      console.error('Failed to load opening balances:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name ?? clientId;
  const getBusinessName = (businessId: string) => businesses.find(b => b.id === businessId)?.name ?? businessId;

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(r => {
      const clientName = (clients.find(c => c.id === r.clientId)?.name ?? r.clientId).toLowerCase();
      const businessName = (businesses.find(b => b.id === r.businessId)?.name ?? r.businessId).toLowerCase();
      return clientName.includes(term) || businessName.includes(term) || r.clientId.toLowerCase().includes(term) || r.businessId.toLowerCase().includes(term);
    });
  }, [records, searchTerm, clients, businesses]);

  const kpiStats = useMemo(() => {
    const totalOpeningBalance = filtered.reduce((sum, r) => sum + (r.openingBalance ?? 0), 0);
    const totalOpeningPaid = filtered.reduce((sum, r) => sum + (r.openingBalancePaid ?? 0), 0);
    const outstandingOpening = Math.max(totalOpeningBalance - totalOpeningPaid, 0);
    return {
      totalOpeningBalance,
      totalOpeningPaid,
      outstandingOpening,
      recordCount: filtered.length,
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-app-bg dark:bg-slate-900">
      <FinancePageHeader
        title="Opening Balance"
        description="All opening balances from Excel import and manual entry. Shown in Client and Business detail Opening Balance tabs."
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <main className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Opening Balance" value={kpiStats.totalOpeningBalance} icon={<TotalOpeningIcon />} colorClass="bg-blue-500" isCurrency />
          <KPICard title="Opening Paid" value={kpiStats.totalOpeningPaid} icon={<PaidIcon />} colorClass="bg-green-500" isCurrency />
          <KPICard title="Outstanding Opening" value={kpiStats.outstandingOpening} icon={<OutstandingIcon />} colorClass={kpiStats.outstandingOpening > 0 ? "bg-amber-500" : "bg-gray-500"} isCurrency />
          <KPICard title="Client-Business Pairs" value={kpiStats.recordCount} icon={<CountIcon />} colorClass="bg-slate-600" />
        </div>

        <div className="bg-container-bg dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by client or business name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-action focus:border-primary-action"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-text-secondary dark:text-slate-400">
              {records.length === 0
                ? 'No opening balance records. Add via Client/Business detail Opening Balance tab or import from Excel (Clients page > Import Opening Balance).'
                : 'No records match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Opening Balance (MMK)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Opening Paid (MMK)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Set Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filtered.map(rec => (
                    <tr key={rec.id ?? `${rec.clientId}_${rec.businessId}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200">
                        <Link to={`/clients/${rec.clientId}`} className="text-primary-action hover:underline">
                          {getClientName(rec.clientId)}
                        </Link>
                        <span className="text-xs text-text-secondary dark:text-slate-500 ml-1">({rec.clientId})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200">
                        <Link to={`/businesses/${rec.businessId}`} className="text-primary-action hover:underline">
                          {getBusinessName(rec.businessId)}
                        </Link>
                        <span className="text-xs text-text-secondary dark:text-slate-500 ml-1">({rec.businessId})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-text-primary dark:text-slate-200">
                        {(rec.openingBalance ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-text-secondary dark:text-slate-400">
                        {(rec.openingBalancePaid ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                        {rec.openingBalanceSetDate ? formatDateForDisplay(rec.openingBalanceSetDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={`/clients/${rec.clientId}`} className="text-primary-action hover:underline mr-3">Client</Link>
                        <Link to={`/businesses/${rec.businessId}`} className="text-primary-action hover:underline">Business</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OpeningBalancePage;
