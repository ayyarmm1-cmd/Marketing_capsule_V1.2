import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiGetExpensesForPeriod,
  apiGetInventoryTransactions,
  apiGetPaymentsForPeriod,
  apiGetPOSProducts,
} from '../../services/api';
import { Expense, InventoryTransaction, InventoryTransactionType, Payment, POSProduct, Permission } from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { getDateInYangonTimezone } from '../../utils/dateUtils';

type TrendView = 'monthly' | 'quarterly' | 'yearly';

interface ProfitLossSummary {
  tradingIncome: number;
  openingInventory: number;
  purchases: number;
  closingInventory: number;
  cogs: number;
  grossProfit: number;
  otherIncome: number;
  otherExpenses: {
    badDebt: number;
    rent: number;
    depreciation: number;
  };
  netProfit: number;
}

interface PeriodRange {
  label: string;
  start: Date;
  end: Date;
}

const normalizeCategory = (value: string) => value.trim().toLowerCase();

const isBetween = (date: Date, start: Date, end: Date) => date >= start && date <= end;

const ProfitLossReport: React.FC = () => {
  const { effectiveTheme } = useTheme();
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [trendView, setTrendView] = useState<TrendView>('monthly');
  const [comparisonEnabled, setComparisonEnabled] = useState(true);

  const { start: initialStart, end: initialEnd } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start, end };
  }, []);

  const [startDate, setStartDate] = useState(() => getDateInYangonTimezone(initialStart));
  const [endDate, setEndDate] = useState(() => getDateInYangonTimezone(initialEnd));

  const [currentSummary, setCurrentSummary] = useState<ProfitLossSummary>({
    tradingIncome: 0,
    openingInventory: 0,
    purchases: 0,
    closingInventory: 0,
    cogs: 0,
    grossProfit: 0,
    otherIncome: 0,
    otherExpenses: { badDebt: 0, rent: 0, depreciation: 0 },
    netProfit: 0,
  });
  const [priorSummary, setPriorSummary] = useState<ProfitLossSummary | null>(null);
  const [trendData, setTrendData] = useState<
    Array<{
      label: string;
      tradingIncome: number;
      grossProfit: number;
      netProfit: number;
    }>
  >([]);

  const buildPeriods = useCallback((start: Date, end: Date, view: TrendView): PeriodRange[] => {
    const periods: PeriodRange[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const moveCursor = () => {
      if (view === 'monthly') {
        cursor.setMonth(cursor.getMonth() + 1, 1);
      } else if (view === 'quarterly') {
        cursor.setMonth(cursor.getMonth() + 3, 1);
      } else {
        cursor.setFullYear(cursor.getFullYear() + 1, 0, 1);
      }
    };

    while (cursor <= end) {
      let periodStart = new Date(cursor);
      let periodEnd: Date;
      let label: string;

      if (view === 'monthly') {
        periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
        label = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
      } else if (view === 'quarterly') {
        const quarter = Math.floor(periodStart.getMonth() / 3) + 1;
        const quarterEndMonth = quarter * 3 - 1;
        periodStart = new Date(periodStart.getFullYear(), (quarter - 1) * 3, 1);
        periodEnd = new Date(periodStart.getFullYear(), quarterEndMonth + 1, 0, 23, 59, 59, 999);
        label = `${periodStart.getFullYear()} Q${quarter}`;
      } else {
        periodStart = new Date(periodStart.getFullYear(), 0, 1);
        periodEnd = new Date(periodStart.getFullYear(), 11, 31, 23, 59, 59, 999);
        label = `${periodStart.getFullYear()}`;
      }

      if (periodEnd < start) {
        moveCursor();
        continue;
      }
      if (periodStart > end) break;

      const clampedStart = periodStart < start ? start : periodStart;
      const clampedEnd = periodEnd > end ? end : periodEnd;
      periods.push({ label, start: clampedStart, end: clampedEnd });
      moveCursor();
    }

    return periods;
  }, []);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const priorStart = new Date(start);
    priorStart.setFullYear(priorStart.getFullYear() - 1);
    const priorEnd = new Date(end);
    priorEnd.setFullYear(priorEnd.getFullYear() - 1);

    try {
      const [
        currentPayments,
        currentExpenses,
        priorPayments,
        priorExpenses,
        inventoryTransactions,
        products,
      ] = await Promise.all([
        apiGetPaymentsForPeriod(start.toISOString(), end.toISOString()),
        apiGetExpensesForPeriod(start.toISOString(), end.toISOString()),
        apiGetPaymentsForPeriod(priorStart.toISOString(), priorEnd.toISOString()),
        apiGetExpensesForPeriod(priorStart.toISOString(), priorEnd.toISOString()),
        apiGetInventoryTransactions(),
        apiGetPOSProducts(),
      ]);

      const productMap = new Map(products.map(product => [product.id, product]));
      const transactionsByProduct = inventoryTransactions.reduce((acc, txn) => {
        const list = acc.get(txn.productId) || [];
        list.push(txn);
        acc.set(txn.productId, list);
        return acc;
      }, new Map<string, InventoryTransaction[]>());

      const getProductCost = (productId: string) => productMap.get(productId)?.costMMK || 0;

      const calculateInventoryValueAt = (date: Date): number => {
        let total = 0;
        products.forEach(product => {
          const txns = transactionsByProduct.get(product.id) || [];
          const deltaAfterDate = txns.reduce((sum, txn) => {
            const txnDate = new Date(txn.createdAt);
            return txnDate > date ? sum + txn.quantity : sum;
          }, 0);
          const stockAtDate = product.stockQuantity - deltaAfterDate;
          const cost = product.costMMK || 0;
          if (cost > 0 && stockAtDate > 0) {
            total += stockAtDate * cost;
          }
        });
        return total;
      };

      const calculatePurchases = (transactions: InventoryTransaction[], periodStart: Date, periodEnd: Date) => {
        return transactions.reduce((sum, txn) => {
          const txnDate = new Date(txn.createdAt);
          if (!isBetween(txnDate, periodStart, periodEnd)) return sum;
          const isPurchase =
            txn.type === InventoryTransactionType.PURCHASE ||
            (txn.type === InventoryTransactionType.ADJUSTMENT && txn.quantity > 0);
          if (!isPurchase) return sum;
          const cost = txn.costMMK ?? getProductCost(txn.productId);
          const quantity = Math.max(txn.quantity, 0);
          return sum + cost * quantity;
        }, 0);
      };

      const calculateOtherExpenses = (expenses: Expense[]) => {
        const totals = { badDebt: 0, rent: 0, depreciation: 0 };
        expenses.forEach(expense => {
          const category = normalizeCategory(expense.category);
          if (category.includes('bad debt')) totals.badDebt += expense.amountMMK;
          if (category.includes('rent')) totals.rent += expense.amountMMK;
          if (category.includes('depreciation')) totals.depreciation += expense.amountMMK;
        });
        return totals;
      };

      const buildSummary = (payments: Payment[], expenses: Expense[], periodStart: Date, periodEnd: Date): ProfitLossSummary => {
        const tradingIncome = payments.reduce((sum, payment) => sum + payment.amountMMK, 0);
        const otherIncome = 0;
        const otherExpenses = calculateOtherExpenses(expenses);
        const openingInventory = calculateInventoryValueAt(periodStart);
        const closingInventory = calculateInventoryValueAt(periodEnd);
        const purchases = calculatePurchases(inventoryTransactions, periodStart, periodEnd);
        const cogs = openingInventory + purchases - closingInventory;
        const grossProfit = tradingIncome - cogs;
        const otherExpenseTotal = otherExpenses.badDebt + otherExpenses.rent + otherExpenses.depreciation;
        const netProfit = grossProfit + otherIncome - otherExpenseTotal;

        return {
          tradingIncome,
          openingInventory,
          purchases,
          closingInventory,
          cogs,
          grossProfit,
          otherIncome,
          otherExpenses,
          netProfit,
        };
      };

      const summary = buildSummary(currentPayments, currentExpenses, start, end);
      setCurrentSummary(summary);

      if (comparisonEnabled) {
        setPriorSummary(buildSummary(priorPayments, priorExpenses, priorStart, priorEnd));
      } else {
        setPriorSummary(null);
      }

      const periods = buildPeriods(start, end, trendView);
      const trend = periods.map(period => {
        const periodPayments = currentPayments.filter(payment => {
          const paymentDate = new Date(payment.paymentDate);
          return isBetween(paymentDate, period.start, period.end);
        });
        const periodExpenses = currentExpenses.filter(expense => {
          const expenseDate = new Date(expense.expenseDate);
          return isBetween(expenseDate, period.start, period.end);
        });
        const periodSummary = buildSummary(periodPayments, periodExpenses, period.start, period.end);
        return {
          label: period.label,
          tradingIncome: periodSummary.tradingIncome,
          grossProfit: periodSummary.grossProfit,
          netProfit: periodSummary.netProfit,
        };
      });
      setTrendData(trend);
    } catch (error) {
      console.error("Failed to fetch P&L report data:", error);
    }
    setIsLoading(false);
  }, [buildPeriods, comparisonEnabled, endDate, startDate, trendView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (!hasPermission(Permission.VIEW_FINANCIAL_REPORTS)) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-semibold text-status-danger mb-4">Access Denied</h2>
        <p className="text-text-secondary">You do not have permission to view financial reports.</p>
      </div>
    );
  }

  const otherExpenseTotal =
    currentSummary.otherExpenses.badDebt +
    currentSummary.otherExpenses.rent +
    currentSummary.otherExpenses.depreciation;

  const comparisonRows = useMemo(() => {
    if (!priorSummary) return [];
    const priorOtherExpenseTotal =
      priorSummary.otherExpenses.badDebt +
      priorSummary.otherExpenses.rent +
      priorSummary.otherExpenses.depreciation;
    return [
      { label: 'Trading Income', current: currentSummary.tradingIncome, prior: priorSummary.tradingIncome },
      { label: 'Cost of Sales (COGS)', current: currentSummary.cogs, prior: priorSummary.cogs },
      { label: 'Gross Profit', current: currentSummary.grossProfit, prior: priorSummary.grossProfit },
      { label: 'Other Income', current: currentSummary.otherIncome, prior: priorSummary.otherIncome },
      { label: 'Other Expenses', current: otherExpenseTotal, prior: priorOtherExpenseTotal },
      { label: 'Net Profit', current: currentSummary.netProfit, prior: priorSummary.netProfit },
    ];
  }, [currentSummary, otherExpenseTotal, priorSummary]);

  return (
    <ReportSection
      title="Profit & Loss (P&L) Statement"
      description="Income statement based on trading income, COGS, and other expenses with current vs. prior year comparison."
    >
      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-end gap-4 mb-2">
          <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0 flex-grow" />
          <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0 flex-grow" />
          <Button onClick={fetchReportData} isLoading={isLoading}>Refresh</Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Select
            label="Trend View"
            value={trendView}
            onChange={e => setTrendView(e.target.value as TrendView)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            containerClassName="mb-0 min-w-[180px]"
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300 mt-6">
            <input
              type="checkbox"
              checked={comparisonEnabled}
              onChange={e => setComparisonEnabled(e.target.checked)}
              className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
            />
            Show Current vs. Prior Year Comparison
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatDisplayCard title="Trading Income" value={`${currentSummary.tradingIncome.toLocaleString()} MMK`} isCurrency colorClass="bg-status-success text-white" />
            <StatDisplayCard title="Cost of Sales (COGS)" value={`${currentSummary.cogs.toLocaleString()} MMK`} isCurrency colorClass="bg-status-danger text-white" />
            <StatDisplayCard title="Gross Profit" value={`${currentSummary.grossProfit.toLocaleString()} MMK`} isCurrency colorClass="bg-primary-action text-white" />
            <StatDisplayCard title="Net Profit" value={`${currentSummary.netProfit.toLocaleString()} MMK`} isCurrency colorClass={currentSummary.netProfit >= 0 ? "bg-emerald-600 text-white" : "bg-gray-700 text-white"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Income Statement Structure</h4>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between font-medium text-green-700 dark:text-green-400">
                  <span>(+) Trading Income (Sales/Services)</span>
                  <span className="font-mono">{currentSummary.tradingIncome.toLocaleString()} MMK</span>
                </p>
                <p className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Opening Inventory</span>
                  <span className="font-mono">{currentSummary.openingInventory.toLocaleString()} MMK</span>
                </p>
                <p className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Purchases</span>
                  <span className="font-mono">{currentSummary.purchases.toLocaleString()} MMK</span>
                </p>
                <p className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Closing Inventory</span>
                  <span className="font-mono">{currentSummary.closingInventory.toLocaleString()} MMK</span>
                </p>
                <p className="flex justify-between text-red-700 dark:text-red-400">
                  <span>(-) Cost of Sales (COGS)</span>
                  <span className="font-mono">{currentSummary.cogs.toLocaleString()} MMK</span>
                </p>
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                  <p className="flex justify-between font-semibold text-blue-700 dark:text-blue-300">
                    <span>Gross Profit</span>
                    <span className="font-mono">{currentSummary.grossProfit.toLocaleString()} MMK</span>
                  </p>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                  <p className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>(+) Other Income</span>
                    <span className="font-mono">{currentSummary.otherIncome.toLocaleString()} MMK</span>
                  </p>
                  <p className="flex justify-between text-red-700 dark:text-red-400">
                    <span>(-) Bad Debt</span>
                    <span className="font-mono">{currentSummary.otherExpenses.badDebt.toLocaleString()} MMK</span>
                  </p>
                  <p className="flex justify-between text-red-700 dark:text-red-400">
                    <span>(-) Rent</span>
                    <span className="font-mono">{currentSummary.otherExpenses.rent.toLocaleString()} MMK</span>
                  </p>
                  <p className="flex justify-between text-red-700 dark:text-red-400">
                    <span>(-) Depreciation</span>
                    <span className="font-mono">{currentSummary.otherExpenses.depreciation.toLocaleString()} MMK</span>
                  </p>
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                    <p className="flex justify-between font-bold text-lg">
                      <span>Net Profit</span>
                      <span className={`font-mono ${currentSummary.netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {currentSummary.netProfit >= 0 ? '+' : ''}{currentSummary.netProfit.toLocaleString()} MMK
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Trend: Amount vs Period</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="label" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                  <Legend />
                  <Line type="monotone" dataKey="tradingIncome" stroke="#10B981" strokeWidth={2} name="Trading Income" />
                  <Line type="monotone" dataKey="grossProfit" stroke="#6366F1" strokeWidth={2} name="Gross Profit" />
                  <Line type="monotone" dataKey="netProfit" stroke="#3B82F6" strokeWidth={2} name="Net Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {priorSummary && comparisonRows.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Current vs. Prior Year Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {comparisonRows.map(row => {
                  const delta = row.current - row.prior;
                  const deltaPercent = row.prior !== 0 ? (delta / Math.abs(row.prior)) * 100 : 0;
                  return (
                    <div key={row.label} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <p className="text-text-secondary dark:text-slate-400 mb-2">{row.label}</p>
                      <p className="font-semibold text-text-primary dark:text-slate-100">{row.current.toLocaleString()} MMK</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Prior: {row.prior.toLocaleString()} MMK</p>
                      <p className={`text-sm font-semibold ${delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {delta >= 0 ? '+' : ''}{delta.toLocaleString()} MMK ({delta >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </ReportSection>
  );
};

export default ProfitLossReport;



