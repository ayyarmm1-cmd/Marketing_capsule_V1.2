import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiGetAPInvoices,
  apiGetCashAccounts,
  apiGetEquityEvents,
  apiGetExpensesForPeriod,
  apiGetFixedAssets,
  apiGetInventoryTransactions,
  apiGetInvoices,
  apiGetLoanAgreements,
  apiGetPaymentsForPeriod,
  apiGetPOSProducts,
  apiGetRefunds,
} from '../../services/api';
import {
  AccountsPayableInvoice,
  CashAccount,
  EquityEvent,
  Expense,
  FixedAsset,
  InventoryTransaction,
  InventoryTransactionType,
  Invoice,
  InvoiceStatus,
  LoanAgreement,
  Payment,
  PaymentStatus,
  Permission,
  POSProduct,
  Refund,
  RefundStatus,
} from '../../types';
import Spinner from '../ui/Spinner';
import ReportSection from './ui/ReportSection';
import StatDisplayCard from './ui/StatDisplayCard';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';

type TrendView = 'monthly' | 'quarterly' | 'yearly';

interface PeriodRange {
  label: string;
  start: Date;
  end: Date;
}

interface EquityRollForward {
  openingCapital: number;
  additionalCapital: number;
  profitLoss: number;
  drawings: number;
  closingEquity: number;
}

interface BalanceSheetSnapshot {
  asOfDate: Date;
  nonCurrentAssets: {
    items: FixedAsset[];
    totalCost: number;
    totalAccumulatedDepreciation: number;
    totalNetBookValue: number;
  };
  currentAssets: {
    inventory: number;
    cash: number;
    accountsReceivable: number;
    allowanceForDoubtfulDebts: number;
    total: number;
  };
  liabilities: {
    current: number;
    nonCurrent: number;
    total: number;
  };
  equity: EquityRollForward;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}

const normalizeCategory = (value: string) => value.trim().toLowerCase();

const isBetween = (date: Date, start: Date, end: Date) => date >= start && date <= end;

const getDateStart = (value: string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateEnd = (value: string) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const BalanceSheetReport: React.FC = () => {
  const { effectiveTheme } = useTheme();
  const { hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [trendView, setTrendView] = useState<TrendView>('monthly');
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [snapshot, setSnapshot] = useState<BalanceSheetSnapshot | null>(null);
  const [priorSnapshot, setPriorSnapshot] = useState<BalanceSheetSnapshot | null>(null);
  const [trendData, setTrendData] = useState<Array<{ label: string; assets: number; liabilities: number; equity: number }>>([]);
  const [cashDistribution, setCashDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [expenseDistribution, setExpenseDistribution] = useState<Array<{ name: string; value: number }>>([]);

  const { start: initialStart, end: initialEnd } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start, end };
  }, []);

  const [startDate, setStartDate] = useState(initialStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEnd.toISOString().split('T')[0]);

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
    const start = getDateStart(startDate);
    const end = getDateEnd(endDate);

    const priorStart = new Date(start);
    priorStart.setFullYear(priorStart.getFullYear() - 1);
    const priorEnd = new Date(end);
    priorEnd.setFullYear(priorEnd.getFullYear() - 1);

    const earliestStart = new Date(start);
    earliestStart.setFullYear(earliestStart.getFullYear() - 1);

    try {
      const [
        payments,
        expenses,
        invoices,
        apInvoices,
        cashAccounts,
        refunds,
        loanAgreements,
        fixedAssets,
        equityEvents,
        inventoryTransactions,
        products,
      ] = await Promise.all([
        apiGetPaymentsForPeriod(earliestStart.toISOString(), end.toISOString()),
        apiGetExpensesForPeriod(earliestStart.toISOString(), end.toISOString()),
        apiGetInvoices(),
        apiGetAPInvoices(),
        apiGetCashAccounts(),
        apiGetRefunds(),
        apiGetLoanAgreements(),
        apiGetFixedAssets(),
        apiGetEquityEvents(),
        apiGetInventoryTransactions(),
        apiGetPOSProducts(),
      ]);

      const approvedPayments = payments.filter(payment => payment.status === PaymentStatus.APPROVED);
      const transactionsByProduct = inventoryTransactions.reduce((acc, txn) => {
        const list = acc.get(txn.productId) || [];
        list.push(txn);
        acc.set(txn.productId, list);
        return acc;
      }, new Map<string, InventoryTransaction[]>());

      const productMap = new Map(products.map(product => [product.id, product]));

      const getProductCost = (productId: string) => productMap.get(productId)?.costMMK || 0;

      const calculateInventoryValueAt = (asOfDate: Date): number => {
        let total = 0;
        products.forEach(product => {
          const txns = transactionsByProduct.get(product.id) || [];
          const deltaAfterDate = txns.reduce((sum, txn) => {
            const txnDate = new Date(txn.createdAt);
            return txnDate > asOfDate ? sum + txn.quantity : sum;
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

      const calculateOtherExpenses = (periodExpenses: Expense[]) => {
        const totals = { badDebt: 0, rent: 0, depreciation: 0 };
        periodExpenses.forEach(expense => {
          const category = normalizeCategory(expense.category);
          if (category.includes('bad debt')) totals.badDebt += expense.amountMMK;
          if (category.includes('rent')) totals.rent += expense.amountMMK;
          if (category.includes('depreciation')) totals.depreciation += expense.amountMMK;
        });
        return totals;
      };

      const buildProfitLoss = (periodStart: Date, periodEnd: Date) => {
        const periodPayments = approvedPayments.filter(payment => {
          const paymentDate = new Date(payment.paymentDate);
          return isBetween(paymentDate, periodStart, periodEnd);
        });
        const periodExpenses = expenses.filter(expense => {
          const expenseDate = new Date(expense.expenseDate);
          return isBetween(expenseDate, periodStart, periodEnd);
        });

        const tradingIncome = periodPayments.reduce((sum, payment) => sum + (payment.amountMMK || 0), 0);
        const openingInventory = calculateInventoryValueAt(periodStart);
        const closingInventory = calculateInventoryValueAt(periodEnd);
        const purchases = calculatePurchases(inventoryTransactions, periodStart, periodEnd);
        const cogs = openingInventory + purchases - closingInventory;
        const grossProfit = tradingIncome - cogs;
        const otherIncome = 0;
        const otherExpenses = calculateOtherExpenses(periodExpenses);
        const otherExpenseTotal = otherExpenses.badDebt + otherExpenses.rent + otherExpenses.depreciation;
        const netProfit = grossProfit + otherIncome - otherExpenseTotal;

        return { netProfit, otherExpenses };
      };

      const buildEquityRollForward = (periodStart: Date, periodEnd: Date): EquityRollForward => {
        const openingCapital = equityEvents.reduce((sum, event) => {
          const eventDate = new Date(event.eventDate);
          if (eventDate >= periodStart) return sum;
          const sign = event.type === 'Dividend' ? -1 : 1;
          return sum + sign * (event.amount || 0);
        }, 0);
        const additionalCapital = equityEvents.reduce((sum, event) => {
          const eventDate = new Date(event.eventDate);
          if (!isBetween(eventDate, periodStart, periodEnd)) return sum;
          return event.type === 'Issuance' ? sum + (event.amount || 0) : sum;
        }, 0);
        const drawings = equityEvents.reduce((sum, event) => {
          const eventDate = new Date(event.eventDate);
          if (!isBetween(eventDate, periodStart, periodEnd)) return sum;
          return event.type === 'Dividend' ? sum + (event.amount || 0) : sum;
        }, 0);

        const { netProfit } = buildProfitLoss(periodStart, periodEnd);
        const closingEquity = openingCapital + additionalCapital + netProfit - drawings;

        return {
          openingCapital,
          additionalCapital,
          profitLoss: netProfit,
          drawings,
          closingEquity,
        };
      };

      const buildBalanceSheet = (periodStart: Date, periodEnd: Date): BalanceSheetSnapshot => {
        const cashBalance = cashAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
        const inventoryValue = calculateInventoryValueAt(periodEnd);
        const accountsReceivable = invoices.reduce((sum, invoice) => {
          const invoiceDate = new Date(invoice.issueDate || invoice.createdAt);
          if (invoiceDate > periodEnd) return sum;
          if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(invoice.status)) return sum;
          const outstanding = Math.max((invoice.grandTotal || 0) - (invoice.amountPaid || 0), 0);
          return sum + outstanding;
        }, 0);
        const allowanceForDoubtfulDebts = expenses.reduce((sum, expense) => {
          const expenseDate = new Date(expense.expenseDate);
          if (!isBetween(expenseDate, periodStart, periodEnd)) return sum;
          const category = normalizeCategory(expense.category);
          return category.includes('bad debt') ? sum + (expense.amountMMK || 0) : sum;
        }, 0);

        const activeAssets = fixedAssets.filter(asset => asset.status !== 'Disposed');
        const nonCurrentAssets = {
          items: activeAssets,
          totalCost: activeAssets.reduce((sum, asset) => sum + (asset.cost || 0), 0),
          totalAccumulatedDepreciation: activeAssets.reduce((sum, asset) => sum + (asset.accumulatedDepreciation || 0), 0),
          totalNetBookValue: activeAssets.reduce((sum, asset) => sum + (asset.bookValue || 0), 0),
        };

        const currentAssetsTotal = cashBalance + inventoryValue + accountsReceivable - allowanceForDoubtfulDebts;

        const accountsPayable = apInvoices.reduce((sum, ap) => {
          const invoiceDate = new Date(ap.invoiceDate);
          if (invoiceDate > periodEnd) return sum;
          if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(ap.status)) return sum;
          return sum + (ap.amount || 0);
        }, 0);
        const refundsPending = refunds.reduce((sum, refund) => {
          const refundDate = new Date(refund.refundDate);
          if (refundDate > periodEnd) return sum;
          return refund.status === RefundStatus.PENDING ? sum + (refund.amountMMK || 0) : sum;
        }, 0);

        const currentLiabilityCutoff = new Date(periodEnd);
        currentLiabilityCutoff.setFullYear(currentLiabilityCutoff.getFullYear() + 1);
        const currentLoans = loanAgreements.reduce((sum, loan) => {
          const maturity = new Date(loan.maturityDate);
          if (maturity <= currentLiabilityCutoff) {
            return sum + (loan.outstandingPrincipal || 0);
          }
          return sum;
        }, 0);
        const nonCurrentLoans = loanAgreements.reduce((sum, loan) => {
          const maturity = new Date(loan.maturityDate);
          if (maturity > currentLiabilityCutoff) {
            return sum + (loan.outstandingPrincipal || 0);
          }
          return sum;
        }, 0);

        const liabilities = {
          current: accountsPayable + refundsPending + currentLoans,
          nonCurrent: nonCurrentLoans,
          total: accountsPayable + refundsPending + currentLoans + nonCurrentLoans,
        };

        const equity = buildEquityRollForward(periodStart, periodEnd);
        const totalAssets = currentAssetsTotal + nonCurrentAssets.totalNetBookValue;
        const totalLiabilitiesAndEquity = liabilities.total + equity.closingEquity;

        return {
          asOfDate: periodEnd,
          nonCurrentAssets,
          currentAssets: {
            inventory: inventoryValue,
            cash: cashBalance,
            accountsReceivable,
            allowanceForDoubtfulDebts,
            total: currentAssetsTotal,
          },
          liabilities,
          equity,
          totalAssets,
          totalLiabilitiesAndEquity,
        };
      };

      const currentSnapshot = buildBalanceSheet(start, end);
      setSnapshot(currentSnapshot);

      if (comparisonEnabled) {
        setPriorSnapshot(buildBalanceSheet(priorStart, priorEnd));
      } else {
        setPriorSnapshot(null);
      }

      const periods = buildPeriods(start, end, trendView);
      setTrendData(
        periods.map(period => {
          const trendSnapshot = buildBalanceSheet(period.start, period.end);
          return {
            label: period.label,
            assets: trendSnapshot.totalAssets,
            liabilities: trendSnapshot.liabilities.total,
            equity: trendSnapshot.equity.closingEquity,
          };
        })
      );

      const cashDistributionData = cashAccounts
        .filter(account => (account.balance || 0) !== 0)
        .map(account => {
          const label =
            account.accountType === 'Bank Account'
              ? account.bankName || account.name
              : account.accountType === 'Mobile Wallet'
                ? account.walletProvider || account.name
                : account.name;
          return { name: label, value: account.balance || 0 };
        });
      setCashDistribution(cashDistributionData);

      const badDebtTotal = expenses.reduce((sum, expense) => {
        const expenseDate = new Date(expense.expenseDate);
        if (!isBetween(expenseDate, start, end)) return sum;
        return normalizeCategory(expense.category).includes('bad debt') ? sum + (expense.amountMMK || 0) : sum;
      }, 0);
      const otherOperating = expenses.reduce((sum, expense) => {
        const expenseDate = new Date(expense.expenseDate);
        if (!isBetween(expenseDate, start, end)) return sum;
        return normalizeCategory(expense.category).includes('bad debt') ? sum : sum + (expense.amountMMK || 0);
      }, 0);
      setExpenseDistribution([
        { name: 'Bad Debt', value: badDebtTotal },
        { name: 'Other Operating', value: otherOperating },
      ].filter(item => item.value > 0));

    } catch (error) {
      console.error('Failed to load balance sheet data:', error);
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

  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];

  return (
    <ReportSection
      title="Statement of Financial Position (Balance Sheet)"
      description="Assets, liabilities, and equity with roll-forward logic and comparison views."
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

      {isLoading || !snapshot ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatDisplayCard title="Total Assets" value={`${snapshot.totalAssets.toLocaleString()} MMK`} isCurrency colorClass="bg-status-success text-white" />
            <StatDisplayCard title="Total Liabilities" value={`${snapshot.liabilities.total.toLocaleString()} MMK`} isCurrency colorClass="bg-status-danger text-white" />
            <StatDisplayCard title="Closing Equity" value={`${snapshot.equity.closingEquity.toLocaleString()} MMK`} isCurrency colorClass="bg-primary-action text-white" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Non-Current Assets (NCA)</h4>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between"><span>Total Cost</span><span className="font-mono">{snapshot.nonCurrentAssets.totalCost.toLocaleString()} MMK</span></p>
                <p className="flex justify-between"><span>Accumulated Depreciation</span><span className="font-mono">{snapshot.nonCurrentAssets.totalAccumulatedDepreciation.toLocaleString()} MMK</span></p>
                <p className="flex justify-between font-semibold text-primary-action"><span>Net Book Value (NBV)</span><span className="font-mono">{snapshot.nonCurrentAssets.totalNetBookValue.toLocaleString()} MMK</span></p>
              </div>
              {snapshot.nonCurrentAssets.items.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-secondary dark:text-slate-400">
                        <th className="py-2">Asset</th>
                        <th className="py-2 text-right">Cost</th>
                        <th className="py-2 text-right">Accum. Dep.</th>
                        <th className="py-2 text-right">NBV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {snapshot.nonCurrentAssets.items.map(asset => (
                        <tr key={asset.id}>
                          <td className="py-2 pr-4">
                            <div className="font-medium text-text-primary dark:text-slate-100">{asset.name}</div>
                            <div className="text-xs text-text-secondary dark:text-slate-400">{asset.assetCode}</div>
                          </td>
                          <td className="py-2 text-right">{asset.cost.toLocaleString()}</td>
                          <td className="py-2 text-right">{asset.accumulatedDepreciation.toLocaleString()}</td>
                          <td className="py-2 text-right font-semibold">{asset.bookValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Current Assets</h4>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between text-slate-600 dark:text-slate-300"><span>Inventory</span><span className="font-mono">{snapshot.currentAssets.inventory.toLocaleString()} MMK</span></p>
                <p className="flex justify-between text-slate-600 dark:text-slate-300"><span>Bank & Wallet Balances</span><span className="font-mono">{snapshot.currentAssets.cash.toLocaleString()} MMK</span></p>
                <p className="flex justify-between text-slate-600 dark:text-slate-300"><span>Accounts Receivable</span><span className="font-mono">{snapshot.currentAssets.accountsReceivable.toLocaleString()} MMK</span></p>
                <p className="flex justify-between text-red-700 dark:text-red-400"><span>(-) Allowance for Doubtful Debts</span><span className="font-mono">{snapshot.currentAssets.allowanceForDoubtfulDebts.toLocaleString()} MMK</span></p>
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                  <p className="flex justify-between font-semibold text-primary-action"><span>Total Current Assets</span><span className="font-mono">{snapshot.currentAssets.total.toLocaleString()} MMK</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Liabilities</h4>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between text-slate-600 dark:text-slate-300"><span>Current Liabilities</span><span className="font-mono">{snapshot.liabilities.current.toLocaleString()} MMK</span></p>
                <p className="flex justify-between text-slate-600 dark:text-slate-300"><span>Non-Current Liabilities</span><span className="font-mono">{snapshot.liabilities.nonCurrent.toLocaleString()} MMK</span></p>
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                  <p className="flex justify-between font-semibold text-status-danger"><span>Total Liabilities</span><span className="font-mono">{snapshot.liabilities.total.toLocaleString()} MMK</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Equity Roll-Forward</h4>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between"><span>Opening Capital</span><span className="font-mono">{snapshot.equity.openingCapital.toLocaleString()} MMK</span></p>
                <p className="flex justify-between"><span>Additional Capital</span><span className="font-mono">{snapshot.equity.additionalCapital.toLocaleString()} MMK</span></p>
                <p className="flex justify-between"><span>Profit / Loss</span><span className="font-mono">{snapshot.equity.profitLoss.toLocaleString()} MMK</span></p>
                <p className="flex justify-between text-red-700 dark:text-red-400"><span>(-) Drawings</span><span className="font-mono">{snapshot.equity.drawings.toLocaleString()} MMK</span></p>
                <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                  <p className="flex justify-between font-semibold text-primary-action"><span>Closing Equity</span><span className="font-mono">{snapshot.equity.closingEquity.toLocaleString()} MMK</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Assets vs Liabilities vs Equity Trend</h4>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={effectiveTheme === 'dark' ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="label" stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke={effectiveTheme === 'dark' ? '#94a3b8' : '#6b7280'} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                  <Legend />
                  <Line type="monotone" dataKey="assets" stroke="#10B981" strokeWidth={2} name="Assets" />
                  <Line type="monotone" dataKey="liabilities" stroke="#EF4444" strokeWidth={2} name="Liabilities" />
                  <Line type="monotone" dataKey="equity" stroke="#3B82F6" strokeWidth={2} name="Equity" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Bank & Wallet Distribution</h4>
                {cashDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={cashDistribution} dataKey="value" nameKey="name" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                        {cashDistribution.map((entry, index) => (
                          <Cell key={`bank-${entry.name}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-text-secondary">No cash account balances to display.</p>
                )}
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Expense Breakdown</h4>
                {expenseDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expenseDistribution} dataKey="value" nameKey="name" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                        {expenseDistribution.map((entry, index) => (
                          <Cell key={`expense-${entry.name}`} fill={chartColors[(index + 2) % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-text-secondary">No expense data for the selected period.</p>
                )}
              </div>
            </div>
          </div>

          {priorSnapshot && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">Current vs. Prior Year Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {[
                  { label: 'Total Assets', current: snapshot.totalAssets, prior: priorSnapshot.totalAssets },
                  { label: 'Total Liabilities', current: snapshot.liabilities.total, prior: priorSnapshot.liabilities.total },
                  { label: 'Closing Equity', current: snapshot.equity.closingEquity, prior: priorSnapshot.equity.closingEquity },
                ].map(row => {
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

export default BalanceSheetReport;



