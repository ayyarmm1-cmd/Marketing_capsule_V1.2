import React, { useEffect, useState, useCallback } from 'react';
import { apiGetFinancialReports } from '../../services/api';
import { FinancialReport } from '../../types';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import MockDataBanner from '../facebook_ads/MockDataBanner';
import { useNotification } from '../../hooks/useNotification';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const FinancialAnalyticsPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const analytics = await apiGetFinancialReports(period);
      setReport(analytics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification(`Failed to load financial report: ${errorMessage}`, 'error');
      console.error("Failed to load financial report:", error);
    }
    setIsLoading(false);
  }, [period, addNotification]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRefresh = () => {
    loadReport();
  };

  if (isLoading || !report) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const trendChartData = report.monthlyTrend ?? [];
  const incomePieData = report.incomeBreakdown ?? [];
  const expensePieData = report.expenseBreakdown ?? [];
  const balanceMixData = report.balanceBreakdown ?? [];
  const cashFlowData = Object.entries(report.cashFlow).map(([name, value]) => ({ name, value }));
  const budgetChartData = report.budgetVsActual.map(row => ({
    name: row.accountName,
    budget: row.budget,
    actual: row.actual,
  }));
  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];
  const formatRangeDate = (value: string) => new Date(value).toLocaleDateString('en-GB');
  const periodLabelRange = `${formatRangeDate(report.startDate)} – ${formatRangeDate(report.endDate)}`;
  const getTrialValue = (label: string, field: 'debit' | 'credit') => {
    const row = report.trialBalance.find(entry => entry.name.includes(label));
    if (!row) return 0;
    return row[field];
  };

  return (
    <div className="space-y-6">
      <MockDataBanner />
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Financial Planning & Analysis</h1>
          <p className="text-sm text-text-secondary">
            Connected to live finance modules — covering {periodLabelRange}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input label="Period (YYYY-MM)" value={period} onChange={e => setPeriod(e.target.value)} />
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-sm text-text-secondary">Revenue</h2>
          <p className="text-3xl font-bold text-primary-action">
            {report.incomeStatement.Revenue.toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary">Period {report.period}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-sm text-text-secondary">Expenses</h2>
          <p className="text-3xl font-bold text-status-danger">
            {report.incomeStatement.Expenses.toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary">Period {report.period}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-sm text-text-secondary">Net Profit</h2>
          <p className="text-3xl font-bold text-text-primary">
            {(report.incomeStatement.Revenue - report.incomeStatement.Expenses).toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary">Includes depreciation and finance charges</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Financial Performance Trend</h2>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} name="Net Profit" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-secondary">Add revenue or expense activity to see the trend.</p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Income Statement Mix</h2>
          {incomePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={incomePieData} dataKey="value" nameKey="name" labelLine={false} outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                  {incomePieData.map((entry, index) => (
                    <Cell key={`income-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-secondary">No income recorded for this period.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Expense Composition</h2>
          {expensePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expensePieData} dataKey="value" nameKey="name" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                  {expensePieData.map((entry, index) => (
                    <Cell key={`expense-${entry.name}`} fill={chartColors[(index + 3) % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-secondary">No expenses recorded for this range.</p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Cash Flow Summary</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(report.cashFlow).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-text-secondary">{label}</span>
                <span className={`font-semibold ${value >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                  {value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Balance Sheet Snapshot</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(report.balanceSheet).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-text-secondary">{label}</span>
                <span className="font-semibold">{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Liabilities & Equity Detail</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Accounts Payable</span>
              <span className="font-semibold">{getTrialValue('Accounts Payable', 'credit').toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Loans Payable</span>
              <span className="font-semibold">{getTrialValue('Loans Payable', 'credit').toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Owner Equity</span>
              <span className="font-semibold">{getTrialValue('Owner Equity', 'credit').toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Balance Sheet Allocation</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={balanceMixData} dataKey="value" nameKey="name" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                {balanceMixData.map((entry, index) => (
                  <Cell key={`balance-${entry.name}`} fill={chartColors[(index + 2) % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Cash Flow Channels</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {cashFlowData.map((entry, index) => (
                  <Cell key={`cash-${entry.name}`} fill={chartColors[(index + 1) % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <h2 className="text-lg font-semibold px-4 py-3 border-b dark:border-slate-700">Trial Balance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left">Account</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.trialBalance.map(row => (
                <tr key={row.name}>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right">{row.debit.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.credit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <h2 className="text-lg font-semibold px-4 py-3 border-b dark:border-slate-700">Budget vs Actual</h2>
        <div className="p-4 space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#9CA3AF" name="Budget" />
              <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left">Account</th>
                  <th className="px-4 py-2 text-right">Budget</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.budgetVsActual?.map(row => (
                  <tr key={row.accountName}>
                    <td className="px-4 py-2">{row.accountName}</td>
                    <td className="px-4 py-2 text-right">{row.budget.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.actual.toLocaleString()}</td>
                    <td className={`px-4 py-2 text-right ${row.actual - row.budget > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                      {(row.actual - row.budget).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalyticsPage;


